import logging
import contextlib
from pathlib import Path
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from . import config
from .routes.analyze import router as analyze_router
from .utils.temp_cleaner import cleaner

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 创建 FastAPI 应用
app = FastAPI(
    title="Bird Echo API",
    description="Bird species detection API powered by BirdNET-Analyzer",
    version="1.0.0"
)

# 配置 CORS - 允许所有源以便调试
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# 注册路由
app.include_router(analyze_router, prefix="/api", tags=["analyze"])


# 启动事件
@app.on_event("startup")
async def startup_event():
    """应用启动时的初始化"""
    logger.info("Starting Bird Echo API server...")

    # 启动临时文件清理器
    cleaner.start()

    # 预加载 BirdNET 模型（预热，让首次用户请求也很快）
    logger.info("Preloading BirdNET model...")
    try:
        from .services.birdnet_service import birdnet_service
        
        # 预热音频路径
        test_audio = config.BASE_DIR / "preload.wav"
        
        # 如果文件不存在（比如在 Docker 容器中），动态生成一个 3 秒的静音文件
        if not test_audio.exists():
            import wave
            import struct
            logger.info("Generating dummy audio for model preload using wave module...")
            with wave.open(str(test_audio), 'wb') as f:
                f.setnchannels(1)
                f.setsampwidth(2)
                f.setframerate(22050)
                # 生成 3 秒静音数据
                silence = struct.pack('<h', 0) * (22050 * 3)
                f.writeframes(silence)
            
        if test_audio.exists():
            logger.info(f"Using audio file for model preload: {test_audio}")
            birdnet_service.analyze_audio(str(test_audio), "preload")
            logger.info("BirdNET model preloaded successfully")
            
            # 预热完可以删掉临时文件
            if test_audio.name == "preload.wav":
                test_audio.unlink()
    except Exception as e:
        logger.warning(f"Model preload failed (non-critical): {e}")
        logger.info("Server will continue, but first analysis request may be slower")

    logger.info(f"Server will run on http://{config.HOST}:{config.PORT}")
    logger.info(f"API docs available at http://{config.HOST}:{config.PORT}/docs")


# 关闭事件
@app.on_event("shutdown")
async def shutdown_event():
    """应用关闭时的清理"""
    logger.info("Shutting down Bird Echo API server...")
    cleaner.stop()


# 全局异常处理
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """全局异常处理器"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": str(exc)
        }
    )


# 根路径
@app.get("/")
async def root():
    """根路径"""
    return {
        "service": "Bird Echo API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/server/cuckoo.wav")
async def get_test_audio():
    """提供测试音频文件"""
    file_path = config.BASE_DIR / "cuckoo.wav"
    if not file_path.exists():
        return JSONResponse(
            status_code=404,
            content={"error": "Test audio file not found"}
        )
    return FileResponse(file_path, media_type="audio/wav")
