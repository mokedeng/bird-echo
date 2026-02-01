import logging
import uuid
import shutil
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from datetime import datetime
from .. import config
from ..models import AnalysisResponse, Detection, Summary, AnalysisData, HealthResponse
from ..services.birdnet_service import birdnet_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_audio(audio: UploadFile = File(...)):
    """
    分析音频文件并返回鸟类识别结果

    Args:
        audio: 上传的音频文件

    Returns:
        包含检测结果的响应
    """
    session_id = str(uuid.uuid4())

    try:
        # 1. 验证文件类型（检查 content-type 或文件扩展名）
        file_ext = Path(audio.filename).suffix.lower() if audio.filename else ""
        content_type = audio.content_type or ""

        # 允许的扩展名
        allowed_exts = {".wav", ".mp3", ".flac", ".wave"}

        # 验证：content-type 在允许列表中 或 扩展名在允许列表中
        if content_type not in config.ALLOWED_FORMATS and file_ext not in allowed_exts:
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "INVALID_FILE_FORMAT",
                    "message": f"Unsupported audio format. Supported: {', '.join(config.ALLOWED_FORMATS)}"
                }
            )

        # 2. 保存上传的文件
        logger.info(f"[{session_id}] Processing file: {audio.filename}")
        file_path = config.UPLOAD_DIR / f"{session_id}_{audio.filename}"

        with open(file_path, "wb") as f:
            shutil.copyfileobj(audio.file, f)

        file_size = file_path.stat().st_size
        logger.info(f"[{session_id}] File saved: {file_path} ({file_size} bytes)")

        # 3. 调用 BirdNET 分析
        result = birdnet_service.analyze_audio(str(file_path), session_id)

        # 4. 构建响应
        detections = result["detections"]
        species_set = set(d["scientificName"] for d in detections)
        audio_duration = detections[-1]["endTime"] if detections else "0:00"

        response_data = AnalysisData(
            fileName=audio.filename,
            analysisTime=round(result["analysis_time"], 2),
            detections=detections,
            summary=Summary(
                totalDetections=len(detections),
                speciesCount=len(species_set),
                audioDuration=audio_duration
            )
        )

        # 5. 异步清理临时文件
        _cleanup_session(session_id, file_path)

        return AnalysisResponse(success=True, data=response_data)

    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"[{session_id}] Analysis failed: {e}")
        # 确保清理
        _cleanup_session(session_id, file_path if 'file_path' in locals() else None)

        raise HTTPException(
            status_code=500,
            detail={
                "code": "ANALYSIS_FAILED",
                "message": str(e)
            }
        )


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """健康检查接口"""
    return HealthResponse(
        status="ok",
        timestamp=datetime.now().isoformat(),
        service="bird-echo-backend"
    )


def _cleanup_session(session_id: str, file_path: Path = None):
    """清理会话相关的临时文件"""
    import threading

    def cleanup():
        try:
            if file_path and file_path.exists():
                file_path.unlink()

            output_dir = config.OUTPUT_DIR / session_id
            if output_dir.exists():
                shutil.rmtree(output_dir)

            logger.info(f"[{session_id}] Cleaned up session files")

        except Exception as e:
            logger.warning(f"[{session_id}] Cleanup failed: {e}")

    # 在后台线程中执行清理
    thread = threading.Thread(target=cleanup, daemon=True)
    thread.start()
