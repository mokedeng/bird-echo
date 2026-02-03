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

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[config.CORS_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
