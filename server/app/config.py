import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# 服务器配置
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "3001"))

# CORS 配置
CORS_ORIGIN = os.getenv("CORS_ORIGIN", "http://localhost:3000")

# 文件路径配置
BASE_DIR = Path(__file__).parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
OUTPUT_DIR = BASE_DIR / "outputs"
IMAGE_CACHE_DIR = BASE_DIR / "image_cache"  # 鸟类图片缓存目录

# 确保 PYTHON_PATH 是绝对路径（相对于 BASE_DIR）
_python_path_from_env = os.getenv("PYTHON_PATH", "python")
if not Path(_python_path_from_env).is_absolute():
    PYTHON_PATH = str(BASE_DIR / _python_path_from_env)
else:
    PYTHON_PATH = _python_path_from_env

ANALYSIS_TIMEOUT = int(os.getenv("ANALYSIS_TIMEOUT", "300"))  # 5分钟

# 确保目录存在
UPLOAD_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)
IMAGE_CACHE_DIR.mkdir(exist_ok=True)

# 文件清理配置
CLEANUP_ENABLED = os.getenv("CLEANUP_ENABLED", "true").lower() == "true"
CLEANUP_INTERVAL = int(os.getenv("CLEANUP_INTERVAL", "3600"))  # 1小时
CLEANUP_MAX_AGE = int(os.getenv("CLEANUP_MAX_AGE", "86400"))  # 24小时

# 支持的音频格式
ALLOWED_FORMATS = [
    "audio/wav",
    "audio/mpeg",
    "audio/flac",
    "audio/x-wav",
    "audio/mp3",
    "audio/x-flac",
    "audio/wave",
    "audio/webm",
    "audio/ogg",
]

# 文件大小限制 (50MB)
MAX_FILE_SIZE = 50 * 1024 * 1024
