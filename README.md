# Bird Echo

鸟类识别 Web 应用 - 基于 BirdNET-Analyzer AI 模型的音频分析与鸟类识别服务。

## 项目简介

Bird Echo 是一个端到端的鸟类识别解决方案，可以通过上传音频文件自动识别其中的鸟类叫声。项目包含：

- **前端** (React): 用户界面，支持音频上传和识别结果展示
- **后端** (Python FastAPI): RESTful API 服务，调用 BirdNET-Analyzer 进行音频分析

## 功能特性

- 🎵 支持多种音频格式 (WAV, MP3, FLAC)
- 🐦 基于 BirdNET-Analyzer 深度学习模型进行鸟类识别
- 🚀 FastAPI 高性能异步后端
- 📝 自动生成 API 文档 (Swagger UI)
- 🔒 CORS 跨域支持
- 🧹 自动清理临时文件

## 技术栈

### 后端
- **Python 3.9 ~ 3.11**
- **FastAPI** - 现代化的 Web 框架
- **Uvicorn** - ASGI 服务器
- **BirdNET-Analyzer** - 鸟类识别 AI 模型

### 前端
- React
- 音频文件上传组件
- 识别结果展示

## 项目结构

```
bird-echo/
├── app/              # 前端应用
└── server/          # 后端服务
    ├── app/
    │   ├── main.py
    │   ├── config.py
    │   ├── models.py
    │   ├── routes/
    │   ├── services/
    │   └── utils/
    ├── uploads/
    ├── outputs/
    └── logs/
```

## 快速开始

### 前置要求

- Python 3.9 ~ 3.11
- Node.js (如果需要运行前端)
- pip 或 uv (Python 包管理器)

### 后端安装

```bash
cd server

# 安装依赖
pip install -r app/requirements.txt

# 配置模型（需要先下载 BirdNET 模型）
python setup_models.py

# 启动服务器
uvicorn app.main:app --reload --host 0.0.0.0 --port 3001
```

服务启动后访问：
- API 服务: http://localhost:3001
- API 文档: http://localhost:3001/docs

### 前端安装

```bash
cd app
npm install
npm start
```

## API 接口

### POST /api/analyze

上传音频文件并返回鸟类识别结果。

**请求**:
```
Content-Type: multipart/form-data
audio: <音频文件>
```

**响应**:
```json
{
  "success": true,
  "data": {
    "fileName": "cuckoo.wav",
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

## 致谢

- [BirdNET-Analyzer](https://github.com/birdnet-team/BirdNET-Analyzer) - 鸟类识别 AI 模型
