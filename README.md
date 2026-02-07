# Bird Echo

> 鸟类识别 Web 应用 - 录制或上传音频，AI 自动识别鸟类物种

Bird Echo 是一个端到端的鸟类识别解决方案。通过设备麦克风录制或上传音频文件，自动识别其中的鸟类叫声，并展示详细的检测结果和物种信息。

## 项目简介

- **前端** (React + TypeScript): 现代化用户界面，支持实时录音和结果可视化。
- **后端** (Python FastAPI): 高性能 API 服务，调用 BirdNET-Analyzer 进行音频分析。
- **云原生架构**: 支持 Docker 容器化部署，适配 Hugging Face Spaces，实现零成本高可用。

## 界面展示

| 主页 | 录音中 | 分析结果 |
|:---:|:---:|:---:|
| ![主页](docs/screenshots/home.png) | ![录音中](docs/screenshots/recording.png) | ![分析结果](docs/screenshots/analysis.png) |

## 功能特性

- **实时录音** - 使用原生 MediaRecorder API，支持 WebM/MP4 格式
- **音频回放** - 结果页面可播放/暂停录音
- **AI 识别** - 基于 BirdNET-Analyzer 深度学习模型
- **可视化结果** - 时间轴热力图展示检测结果
- **物种信息** - 后端代理从 Wikipedia 获取鸟类图片并本地缓存
- **音频转换** - 后端使用 ffmpeg 自动转换格式
- **云端适配** - 完美支持混合云调试与生产部署

## 快速开始

### 前置要求

- Python 3.9 ~ 3.11
- Node.js 18+
- ffmpeg (音频转换必需)

### 后端安装 (本地)

```bash
cd server
uv venv --python 3.11
source .venv/bin/activate
uv pip install birdnet_analyzer
uv pip install -r app/requirements.txt
python setup_models.py
uvicorn app.main:app --reload --host 0.0.0.0 --port 3001
```

### 前端安装 (本地)

```bash
cd app
cp .env.example .env  # 复制并配置 API 地址
npm install
npm run dev
```

#### 移动端预览与远程调试

由于 iOS 强制要求 HTTPS 环境才能唤起麦克风，项目目前统一使用 **Cloudflare Tunnel** 方案：

1.  **启动隧道**: 运行 `npx cloudflared tunnel --url http://localhost:3000`。
2.  **配置环境**: 在 `app/.env` 中填入你的后端地址 (本地隧道或 Hugging Face 地址)。
3.  **开始预览**: 在手机上访问隧道生成的 `https://...` 链接。

详细步骤请参考：[移动端预览与远程调试指南](docs/mobile-preview-guide.md)

### 云端部署

本项目支持零成本生产部署：
- **后端**: 部署至 **Hugging Face Spaces (Docker)**。
- **前端**: 部署至 **Vercel/Netlify** 或通过 **Capacitor** 打包为原生 App。

详细步骤与踩坑复盘请参考：[Hugging Face 部署实战指南](docs/huggingface-deployment-guide.md)

## 项目结构

```
bird-echo/
├── app/                     # React 前端
│   ├── .env.example        # 环境变量模板
│   ├── vite-env.d.ts       # 环境变量类型定义
│   ├── services/           # API 层 (支持动态地址归一化)
│   ├── screens/            # 页面组件
│   └── components/         # UI 组件
│
├── server/                 # FastAPI 后端
│   ├── Dockerfile          # 生产环境容器配置
│   ├── setup_models.py     # 模型下载脚本
│   └── app/
│       ├── main.py         # 包含自动模型预热逻辑
│       └── routes/         # 路由处理器
│
└── docs/                   # 项目文档
    ├── mobile-preview-guide.md    # 调试指南
    └── huggingface-deployment-guide.md  # 部署指南
```

## 数据流 (云原生版)

**音频分析流程**:
```
用户手机端 (HTTPS) → 发送音频至 Hugging Face 云端 (API)
     ↓
后端容器 (Docker) → 调用本地 ffmpeg 转换
     ↓
BirdNET-Analyzer (已预热) → 秒级推理
     ↓
解析结果 → 返回绝对路径的图片地址
```

## 常见问题

### 为什么手机端必须用 HTTPS？
iOS 处于安全考虑，仅在 HTTPS 环境下才将 `navigator.mediaDevices` 暴露给浏览器。使用 Cloudflare 隧道会自动提供合法的证书，解决此问题。

### 如何提高分析速度？
确保后端启动日志中显示 `BirdNET model preloaded successfully`。本项目已实现通过原生 `wave` 模块自动生成预热音频，确保模型在容器启动时即加载完毕。

## 许可证

MIT License

## 致谢

- [BirdNET-Analyzer](https://github.com/birdnet-team/BirdNET-Analyzer) - 鸟类识别 AI 模型
- [Wikipedia REST API](https://en.wikipedia.org/api/rest_v1/) - 鸟类图片和描述数据（后端代理访问）