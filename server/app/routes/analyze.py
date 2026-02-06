import logging
import uuid
import shutil
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from fastapi.responses import JSONResponse
from datetime import datetime
import httpx
from .. import config
from ..models import AnalysisResponse, Detection, Summary, AnalysisData, HealthResponse
from ..services.birdnet_service import birdnet_service
from ..utils.audio_converter import convert_to_wav

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
        allowed_exts = {".wav", ".mp3", ".flac", ".wave", ".webm", ".ogg"}

        # 验证：content-type 在允许列表中 或 扩展名在允许列表中
        if content_type not in config.ALLOWED_FORMATS and file_ext not in allowed_exts:
            raise HTTPException(
                status_code=400,
                detail=f"不支持的音频格式。支持的格式: {', '.join(config.ALLOWED_FORMATS)}"
            )

        # 2. 保存上传的文件
        logger.info(f"[{session_id}] Processing file: {audio.filename}")
        file_path = config.UPLOAD_DIR / f"{session_id}_{audio.filename}"

        with open(file_path, "wb") as f:
            shutil.copyfileobj(audio.file, f)

        file_size = file_path.stat().st_size
        logger.info(f"[{session_id}] File saved: {file_path} ({file_size} bytes)")

        # 3. 检查是否需要转换格式
        # BirdNET-Analyzer 原生支持的格式，无需转换
        BIRDNET_SUPPORTED = {".wav", ".wave", ".mp3", ".flac", ".ogg", ".opus"}
        
        analysis_file = file_path
        if file_ext not in BIRDNET_SUPPORTED:
            # 只有 WebM 等不支持的格式才需要转换
            logger.info(f"[{session_id}] Converting {file_ext} to WAV format (not natively supported)")
            wav_path = config.UPLOAD_DIR / f"{session_id}_converted.wav"
            try:
                analysis_file = convert_to_wav(file_path, wav_path)
                logger.info(f"[{session_id}] Conversion complete: {wav_path}")
            except RuntimeError as e:
                # ffmpeg 不可用时的降级处理：尝试直接分析原文件
                logger.warning(f"[{session_id}] Conversion failed, trying original file: {e}")
                analysis_file = file_path
        else:
            logger.info(f"[{session_id}] File format {file_ext} is natively supported, skipping conversion")

        # 4. 调用 BirdNET 分析
        logger.info(f"[{session_id}] Starting analysis with file: {analysis_file}")
        result = birdnet_service.analyze_audio(str(analysis_file), session_id)

        # 4. 构建响应
        detections = result["detections"]
        species_set = set(d["scientificName"] for d in detections)
        audio_duration = detections[-1]["endTime"] if detections else "0:00"

        # 记录检测到的时间范围
        if detections:
            logger.info(f"[{session_id}] Detection time range: {detections[0]['startTime']} - {detections[-1]['endTime']}")
            logger.info(f"[{session_id}] Total detections: {len(detections)}, Species: {len(species_set)}")

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
        _cleanup_session(session_id, file_path, analysis_file)

        return AnalysisResponse(success=True, data=response_data)

    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"[{session_id}] Analysis failed: {e}")
        # 确保清理
        if 'analysis_file' in locals():
            _cleanup_session(session_id, file_path, analysis_file)
        elif 'file_path' in locals():
            _cleanup_session(session_id, file_path)

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """健康检查接口"""
    return HealthResponse(
        status="ok",
        timestamp=datetime.now().isoformat(),
        service="bird-echo-backend"
    )


@router.get("/bird-image")
async def get_bird_image(scientific_name: str = Query(..., description="鸟类的学名")):
    """
    从 Wikipedia API 获取鸟类图片（带磁盘缓存）
    
    策略：
    1. 检查本地缓存文件
    2. 缓存未命中时，从 Wikipedia API 获取
    3. 下载图片并保存到缓存目录
    4. 返回图片 URL（通过后端代理访问）
    
    Args:
        scientific_name: 鸟类的学名（科学名称）
    
    Returns:
        包含图片 URL 的响应，如果未找到则返回 null
    """
    # #region agent log
    import json
    log_path = Path(__file__).parent.parent.parent.parent / ".cursor" / "debug.log"
    try:
        with open(log_path, 'a', encoding='utf-8') as f:
            f.write(json.dumps({"timestamp": __import__('time').time() * 1000, "location": "analyze.py:133", "message": "get_bird_image entry", "data": {"scientific_name": scientific_name}, "sessionId": "debug-session", "runId": "run1", "hypothesisId": "A,B,C"}) + "\n")
    except: pass
    # #endregion
    try:
        from urllib.parse import quote, unquote, urlparse
        import hashlib
        
        # 先解码（前端可能已经编码了），然后处理空格
        decoded_name = unquote(scientific_name)
        # #region agent log
        try:
            with open(log_path, 'a', encoding='utf-8') as f:
                f.write(json.dumps({"timestamp": __import__('time').time() * 1000, "location": "analyze.py:156", "message": "decoded scientific name", "data": {"original": scientific_name, "decoded": decoded_name}, "sessionId": "debug-session", "runId": "run1", "hypothesisId": "C"}) + "\n")
        except: pass
        # #endregion
        
        # 生成缓存文件名（使用学名的哈希值）
        cache_key = hashlib.md5(decoded_name.encode()).hexdigest()
        cache_file = config.IMAGE_CACHE_DIR / f"{cache_key}.json"
        
        # 1. 检查本地缓存
        # 查找匹配的缓存图片文件
        cache_image_files = list(config.IMAGE_CACHE_DIR.glob(f"{cache_key}.*"))
        cache_image_file = None
        if cache_image_files:
            # 过滤掉 .json 元数据文件
            cache_image_file = next((f for f in cache_image_files if f.suffix != ".json"), None)

        if cache_image_file and cache_image_file.exists():
            logger.info(f"Cache hit for: {scientific_name}")
            # 返回后端代理的图片 URL（包含文件扩展名）
            ext = cache_image_file.suffix
            return JSONResponse(content={
                "success": True,
                "imageUrl": f"/api/bird-image-file/{cache_key}{ext}"
            })
        
        # 2. 缓存未命中，从 Wikipedia API 获取
        logger.info(f"Cache miss, fetching from Wikipedia: {scientific_name}")
        wiki_title = decoded_name.replace(' ', '_')
        wiki_url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{wiki_title}"
        # #region agent log
        try:
            with open(log_path, 'a', encoding='utf-8') as f:
                f.write(json.dumps({"timestamp": __import__('time').time() * 1000, "location": "analyze.py:181", "message": "Wikipedia API request", "data": {"wiki_title": wiki_title, "wiki_url": wiki_url}, "sessionId": "debug-session", "runId": "run1", "hypothesisId": "A,B"}) + "\n")
        except: pass
        # #endregion
        
        # Wikipedia/Wikimedia 要求设置标准 User-Agent
        # 格式: ApplicationName/version (Contact_info)
        headers = {
            "User-Agent": "BirdEcho/1.0 (https://github.com/smalldeng/bird-echo; birds@bird-echo.app)"
        }
        async with httpx.AsyncClient(timeout=10.0, headers=headers) as client:
            response = await client.get(wiki_url)
            # #region agent log
            try:
                with open(log_path, 'a', encoding='utf-8') as f:
                    f.write(json.dumps({"timestamp": __import__('time').time() * 1000, "location": "analyze.py:185", "message": "Wikipedia API response", "data": {"status_code": response.status_code, "has_content": bool(response.content)}, "sessionId": "debug-session", "runId": "run1", "hypothesisId": "A,B"}) + "\n")
            except: pass
            # #endregion
            
            if response.status_code == 200:
                data = response.json()
                # #region agent log
                try:
                    with open(log_path, 'a', encoding='utf-8') as f:
                        f.write(json.dumps({"timestamp": __import__('time').time() * 1000, "location": "analyze.py:188", "message": "Wikipedia API data parsed", "data": {"has_thumbnail": "thumbnail" in data, "thumbnail_type": type(data.get("thumbnail")).__name__ if "thumbnail" in data else None, "thumbnail_keys": list(data.get("thumbnail").keys()) if isinstance(data.get("thumbnail"), dict) else None}, "sessionId": "debug-session", "runId": "run1", "hypothesisId": "A"}) + "\n")
                except: pass
                # #endregion
                
                if data.get("thumbnail") and isinstance(data["thumbnail"], dict):
                    image_url = data["thumbnail"].get("source")
                    # #region agent log
                    try:
                        with open(log_path, 'a', encoding='utf-8') as f:
                            f.write(json.dumps({"timestamp": __import__('time').time() * 1000, "location": "analyze.py:191", "message": "thumbnail source extracted", "data": {"image_url": image_url, "has_source": bool(image_url)}, "sessionId": "debug-session", "runId": "run1", "hypothesisId": "A"}) + "\n")
                    except: pass
                    # #endregion
                    if image_url:
                        # 3. 下载图片并保存到缓存
                        try:
                            # 确保图片 URL 是 HTTPS
                            if image_url.startswith("http://"):
                                image_url = image_url.replace("http://", "https://", 1)
                            
                            # 下载图片（Wikimedia URL 会重定向，需要跟随重定向）
                            img_response = await client.get(image_url, timeout=10.0, follow_redirects=True)
                            # #region agent log
                            try:
                                with open(log_path, 'a', encoding='utf-8') as f:
                                    f.write(json.dumps({"timestamp": __import__('time').time() * 1000, "location": "analyze.py:199", "message": "image download response", "data": {"status_code": img_response.status_code, "content_length": len(img_response.content) if img_response.content else 0}, "sessionId": "debug-session", "runId": "run1", "hypothesisId": "E"}) + "\n")
                            except: pass
                            # #endregion
                            if img_response.status_code == 200:
                                # 根据 URL 确定文件扩展名
                                parsed_url = urlparse(image_url)
                                ext = Path(parsed_url.path).suffix or ".jpg"
                                cache_image_file = config.IMAGE_CACHE_DIR / f"{cache_key}{ext}"
                                
                                # 保存图片文件
                                with open(cache_image_file, 'wb') as f:
                                    f.write(img_response.content)
                                
                                # 保存元数据
                                import json
                                with open(cache_file, 'w', encoding='utf-8') as f:
                                    json.dump({
                                        "scientificName": decoded_name,
                                        "imageUrl": image_url,
                                        "cachedAt": datetime.now().isoformat()
                                    }, f)
                                
                                logger.info(f"Cached image for: {scientific_name} -> {cache_image_file}")
                                
                                # 返回后端代理的图片 URL
                                return JSONResponse(content={
                                    "success": True,
                                    "imageUrl": f"/api/bird-image-file/{cache_key}{ext}"
                                })
                        except Exception as e:
                            logger.error(f"Failed to cache image: {e}", exc_info=True)
                            # 缓存失败，返回原始 URL
                            return JSONResponse(content={
                                "success": True,
                                "imageUrl": image_url
                            })
            
            # 如果 Wikipedia 没有图片，返回 null
            # #region agent log
            try:
                with open(log_path, 'a', encoding='utf-8') as f:
                    f.write(json.dumps({"timestamp": __import__('time').time() * 1000, "location": "analyze.py:235", "message": "returning success=false (no image)", "data": {"status_code": response.status_code if 'response' in locals() else None, "has_thumbnail": "thumbnail" in (data if 'data' in locals() else {})}, "sessionId": "debug-session", "runId": "run1", "hypothesisId": "A,B"}) + "\n")
            except: pass
            # #endregion
            return JSONResponse(content={
                "success": False,
                "imageUrl": None
            })
            
    except httpx.TimeoutException:
        logger.error(f"Timeout fetching image for: {scientific_name}")
        return JSONResponse(
            status_code=504,
            content={"success": False, "error": "Request timeout"}
        )
    except Exception as e:
        logger.error(f"Error fetching bird image for {scientific_name}: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )


@router.get("/bird-image-file/{cache_key:path}")
async def get_cached_bird_image(cache_key: str):
    """
    返回缓存的鸟类图片文件

    Args:
        cache_key: 缓存键（学名的 MD5 哈希值，可能包含文件扩展名）

    Returns:
        图片文件响应
    """
    from fastapi.responses import FileResponse

    # 如果 cache_key 包含扩展名，直接使用；否则查找所有匹配的文件
    if '.' in cache_key:
        # 直接使用传入的文件名（包含扩展名）
        cache_file = config.IMAGE_CACHE_DIR / cache_key
    else:
        # 查找匹配的缓存文件
        cache_files = list(config.IMAGE_CACHE_DIR.glob(f"{cache_key}.*"))
        if cache_files:
            cache_file = cache_files[0]
        else:
            cache_file = None

    if cache_file and cache_file.exists():
        # 根据文件扩展名确定媒体类型
        ext = cache_file.suffix.lower()
        media_types = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".webp": "image/webp",
            ".svg": "image/svg+xml"
        }
        media_type = media_types.get(ext, "image/jpeg")
        
        return FileResponse(
            cache_file,
            media_type=media_type,
            headers={"Cache-Control": "public, max-age=31536000"}  # 缓存 1 年
        )
    
    return JSONResponse(
        status_code=404,
        content={"error": "Image not found in cache"}
    )


def _cleanup_session(session_id: str, file_path: Path = None, analysis_file: Path = None):
    """清理会话相关的临时文件"""
    import threading

    def cleanup():
        try:
            # 删除上传的原始文件
            if file_path and file_path.exists():
                file_path.unlink()

            # 删除转换后的 WAV 文件（如果与原文件不同）
            if analysis_file and analysis_file != file_path and analysis_file.exists():
                analysis_file.unlink()

            output_dir = config.OUTPUT_DIR / session_id
            if output_dir.exists():
                shutil.rmtree(output_dir)

            logger.info(f"[{session_id}] Cleaned up session files")

        except Exception as e:
            logger.warning(f"[{session_id}] Cleanup failed: {e}")

    # 在后台线程中执行清理
    thread = threading.Thread(target=cleanup, daemon=True)
    thread.start()
