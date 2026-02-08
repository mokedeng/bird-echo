# Bird Echo

> 鸟类识别 Web 应用 - 录制或上传音频，AI 自动识别鸟类物种

Bird Echo 是一个端到端的鸟类识别解决方案。通过设备麦克风录制或上传音频文件，自动识别其中的鸟类叫声，并展示详细的检测结果和物种信息。

## 项目简介

- **前端** (React + TypeScript): 部署于 **Vercel**，提供现代化用户界面。
- **后端** (Python FastAPI): 部署于 **Hugging Face Spaces (Docker)**，高性能 AI 推理。
- **云原生架构**: 前后端分离，零成本、高可用、全球可访问。

## 界面展示

| 主页 | 录音中 | 分析结果 |
|:---:|:---:|:---:|
| ![主页](docs/screenshots/home.png) | ![录音中](docs/screenshots/recording.png) | ![分析结果](docs/screenshots/analysis.png) |

## 功能特性

- **实时录音** - 使用原生 MediaRecorder API，支持 WebM/MP4 格式
- **音频回放** - 结果页面可播放/暂停录音
- **AI 识别** - 基于 BirdNET-Analyzer 深度学习模型，经过云端预热优化
- **可视化结果** - 时间轴热力图展示检测结果
- **物种信息** - 后端代理从 Wikipedia 获取鸟类图片并本地缓存
- **生产就绪** - 支持环境变量配置，适配 Vercel 与 Hugging Face

## 快速开始

### 前置要求

- Python 3.9 ~ 3.11
- Node.js 18+
- ffmpeg (音频转换必需)

### 本地开发

1. **后端**: 
   ```bash
   cd server && python -m app.main
   ```
2. **前端**: 
   ```bash
   cd app && cp .env.example .env && npm run dev
   ```

详细调试说明请参考：[移动端预览与远程调试指南](docs/mobile-preview-guide.md)

### 云端部署 (零成本方案)

本项目已实现全自动化云端闭环：
- **后端**: 部署至 Hugging Face Spaces (Docker)。[部署指南](docs/huggingface-deployment-guide.md)
- **前端**: 部署至 Vercel。只需关联 GitHub 仓库并配置 `VITE_API_BASE_URL` 即可。
- **移动端**: 通过 **Capacitor** 打包为 iOS/Android 原生应用。

## 项目结构

```
bird-echo/
├── app/                     # React 前端 (部署于 Vercel)
│   ├── .env.example        # 环境变量模板
│   ├── services/api.ts     # 动态适配云端 API
│   └── ...
├── server/                 # FastAPI 后端 (部署于 Hugging Face)
│   ├── Dockerfile          # 容器化配置
│   └── ...
└── docs/                   # 项目文档与指南
```

## 数据流

**云原生交互模式**:
```
[ 用户 (Web/App) ] --(HTTPS)--> [ Vercel CDN ]
      |
      +--(音频数据)--> [ Hugging Face Space (Docker) ]
                         ↓
                   [ BirdNET 推理 ]
                         ↓
      <--(识别结果)------+
```

## 许可证

MIT License

## 致谢

- [BirdNET-Analyzer](https://github.com/birdnet-team/BirdNET-Analyzer) - 鸟类识别 AI 模型
- [Wikipedia REST API](https://en.wikipedia.org/api/rest_v1/) - 鸟类图片和描述数据（后端代理访问）
