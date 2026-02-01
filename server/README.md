# Bird Echo - 鸟类识别 API

基于 BirdNET-Analyzer 的鸟类识别后端服务，使用 FastAPI 构建。

## 功能特性

- 🎵 支持多种音频格式 (WAV, MP3, FLAC)
- 🐦 基于 BirdNET-Analyzer 深度学习模型进行鸟类识别
- 🚀 FastAPI 高性能异步框架
- 📝 自动生成 API 文档 (Swagger UI)
- 🔒 CORS 跨域支持
- 🧹 自动清理临时文件

## 技术栈

- **Python 3.9 ~ 3.11**
- **FastAPI** - 现代化的 Web 框架
- **Uvicorn** - ASGI 服务器
- **BirdNET-Analyzer** - 鸟类识别 AI 模型

## 目录结构

```
server/
├── app/
│   ├── main.py                   # FastAPI 应用入口
│   ├── config.py                 # 配置文件
│   ├── models.py                 # Pydantic 数据模型
│   ├── routes/
│   │   └── analyze.py            # 分析路由
│   ├── services/
│   │   └── birdnet_service.py    # BirdNET 调用服务
│   ├── utils/
│   │   ├── csv_parser.py         # CSV 解析工具
│   │   └── temp_cleaner.py       # 临时文件清理
│   └── requirements.txt          # Python 依赖
├── uploads/                      # 临时上传目录
├── outputs/                      # CLI 输出目录
├── logs/                         # 日志目录
├── .env                          # 环境变量
├── .gitignore                    # Git 忽略文件
├── setup_models.py               # 模型自动配置脚本
└── README.md                     # 项目说明
```

## 快速开始

### 1. 前置要求

-   **Python 3.9 ~ 3.11**（不支持 Python 3.12）
-   **Git** 用于克隆代码库
-   **Homebrew** (macOS) 或对应系统的包管理器

### 2. 获取代码并进入目录

```bash
git clone https://github.com/your-username/bird-echo.git
cd server
```

### 3. 环境设置与依赖安装

#### macOS 用户

1.  **安装构建工具**:
    ```bash
    brew install cmake llvm@20
    ```

2.  **创建虚拟环境并激活**:
    ```bash
    uv venv --python 3.11
    source .venv/bin/activate
    ```

3.  **安装 Python 依赖**:
    ```bash
    export LLVM_DIR="/usr/local/opt/llvm@20/lib/cmake/llvm"
    uv pip install birdnet_analyzer
    uv pip install -r app/requirements.txt
    ```

#### Linux / Windows 用户

1.  **安装构建工具**:
    ```bash
    # Linux (Ubuntu/Debian)
    sudo apt-get update && sudo apt-get install cmake
    ```

2.  **创建虚拟环境并激活**:
    ```bash
    uv venv --python 3.11
    source .venv/bin/activate
    ```

3.  **安装 Python 依赖**:
    ```bash
    uv pip install birdnet_analyzer
    uv pip install -r app/requirements.txt
    ```

### 4. 模型文件配置 (必需)

由于 `birdnet_analyzer` 库内置的模型下载链接失效，请运行项目提供的脚本自动配置模型文件：

```bash
# 确保你已激活虚拟环境
source .venv/bin/activate

# 运行模型配置脚本
python setup_models.py
```

该脚本会自动从 Zenodo 下载 BirdNET V2.4 TFLite 模型，并将其正确安装到虚拟环境目录中，同时创建必要的占位文件以通过库的检查。

### 5. 配置环境变量

复制 `.env.example` 或手动创建 `.env`：
```bash
HOST=0.0.0.0
PORT=3001
CORS_ORIGIN=http://localhost:3000
PYTHON_PATH=python3
ANALYSIS_TIMEOUT=300
CLEANUP_ENABLED=true
CLEANUP_INTERVAL=3600
CLEANUP_MAX_AGE=86400
```

### 6. 启动服务器

```bash
source .venv/bin/activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 3001
```

服务器启动后访问：
- API 服务: http://localhost:3001
- API 文档: http://localhost:3001/docs

## API 接口

### POST /api/analyze

上传音频文件并返回鸟类识别结果。

**请求：**
```bash
curl -X POST http://localhost:3001/api/analyze \
  -F "audio=@/path/to/audio.wav"
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "fileName": "audio.wav",
    "analysisTime": 2.45,
    "detections": [
      {
        "startTime": "0:00",
        "endTime": "0:03",
        "scientificName": "Cuculus canorus",
        "commonName": "Common Cuckoo",
        "confidence": 0.99,
        "label": "Common Cuckoo (Cuculus canorus)"
      }
    ],
    "summary": {
      "totalDetections": 1,
      "speciesCount": 1,
      "audioDuration": "0:03"
    }
  }
}
```

## 许可证

MIT License

```