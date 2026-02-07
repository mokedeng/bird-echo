# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Bird Echo 是一个鸟类识别 Web 应用。用户录制或上传音频文件，由 BirdNET-Analyzer AI 模型分析并检测鸟类物种。

**架构**: React 前端 + Python FastAPI 后端
**前端端口**: 3000 (Vite 开发服务器)
**后端端口**: 3001 (Uvicorn)

---

## 开发命令

### 前端 (app/)
```bash
cd app
npm install           # 安装依赖
npm run dev          # 启动开发服务器 (端口 3000)
npm run build        # 生产构建
npm run preview      # 预览生产构建
```

### 后端 (server/)
```bash
cd server

# 环境配置 (仅需一次)
uv venv --python 3.11
source .venv/bin/activate

# 仅 macOS - 先安装构建工具
brew install cmake llvm@20
export LLVM_DIR="/usr/local/opt/llvm@20/lib/cmake/llvm"

# 安装依赖
uv pip install birdnet_analyzer
uv pip install -r app/requirements.txt

# 安装 ffmpeg (音频转换必需)
# macOS: brew install ffmpeg
# Ubuntu: sudo apt-get install ffmpeg
# Windows: https://ffmpeg.org/download.html

# 重要: 模型配置
python setup_models.py

# 启动服务器
uvicorn app.main:app --reload --host 0.0.0.0 --port 3001
```

### 测试后端 API
```bash
# 健康检查
curl http://localhost:3001/api/health

# 分析音频
curl -X POST http://localhost:3001/api/analyze -F "audio=@docs/cuckoo.wav"
```

---

## 关键约束

### Python 版本
- **支持**: 3.9, 3.10, 3.11
- **不支持**: 3.12 (BirdNET-Analyzer 不兼容)

### BirdNET 模型配置
官方 `birdnet_analyzer` 包的模型下载链接已失效。必须运行 `setup_models.py`，该脚本会从 Zenodo 下载模型并创建所需的占位文件。

### 后端导入
所有包导入使用 **相对导入** (例如 `from ..models import Detection`，而不是 `from models import Detection`)。

### ffmpeg 依赖
**必需**: 后端使用 ffmpeg 进行音频格式转换。未安装时音频分析会失败或降级到直接处理。

---

## 架构

### 前端结构

**状态管理**: 所有状态集中在 `App.tsx` 中。不使用 Redux 或 Context API。
- `currentTab`: "home" | "library" | "profile"
- `showRecording`: boolean
- `analysisResult`: AnalysisData | null
- `audioBlob`: Blob | null - 保存录音用于结果页面回放
- `isAnalyzing`: boolean
- `error`: string | null

**导航**: 三个页面，由 `App.tsx` 条件渲染控制（无路由库，纯状态驱动）:
- `HomeScreen.tsx` - 主页，带录制按钮
- `RecordingScreen.tsx` - 音频录制界面，使用原生 MediaRecorder API
  - Cancel 按钮使用 `isCancellingRef` 防止触发 onFinish 回调
- `ResultsScreen.tsx` - 显示检测结果，支持音频回放，通过后端代理获取鸟类图片

**渲染优先级** (`App.tsx` 的 `renderContent()` 函数):
1. 错误状态 > 2. 加载状态 > 3. 结果页 > 4. 标签页导航

**自定义 Hooks**:
- `hooks/useMediaRecorder.ts` - 封装原生 MediaRecorder API，支持 WebM/MP4 格式

**API 层**: `services/api.ts` - 单文件包含所有后端通信和 TypeScript 接口定义。
  - 使用 `VITE_API_BASE_URL` 环境变量配置后端地址
  - 开发环境通过 Vite 代理访问 `/api`，回退到同源请求
  - 生产/移动端通过 `.env` 文件配置云端/隧道地址
  - **normalizeUrl()**: 将后端返回的相对路径转换为绝对路径（云端部署必需）

### 后端结构

**入口**: `app/main.py` - 注册路由、CORS、启动/关闭处理器
- 启动时预加载 BirdNET 模型（使用 `wave` 模块生成静音音频预热）
- 启动临时文件清理器守护线程
- CORS 配置为允许所有源（`allow_origins=["*"]`）

**路由处理器**: `app/routes/analyze.py`
- POST `/api/analyze` - 接收 multipart form data 音频文件，自动转换为 WAV
- GET `/api/health` - 健康检查
- GET `/api/bird-image` - 后端代理，从 Wikipedia 获取鸟类图片并缓存
- GET `/api/bird-image-file/{cache_key:path}` - 返回缓存的鸟类图片文件

**服务层**: `app/services/birdnet_service.py`
- 直接调用 `birdnet_analyzer.analyze()` Python API
- 模型在进程内缓存，后续调用只需 0.5-1 秒
- 返回从 CSV 解析的检测结果

**工具类**:
- `app/utils/csv_parser.py` - 解析 BirdNET `*results.csv` 文件
- `app/utils/temp_cleaner.py` - 守护线程，定期清理文件
- `app/utils/audio_converter.py` - ffmpeg 音频格式转换

### 数据流

**音频分析流程**:
1. 用户录制音频 → 原生 MediaRecorder 创建 Blob (WebM/MP4)
2. 前端发送到 `POST /api/analyze` (multipart/form-data)
3. 后端保存到 `uploads/{session_id}/`
4. **后端使用 ffmpeg 转换为 WAV** (22050Hz, mono, 16-bit PCM)
5. BirdNET-Analyzer 写入 `outputs/{session_id}/`
6. 解析 CSV，返回响应
7. 清理线程异步删除临时文件

**鸟类图片获取流程**:
1. 前端调用 `GET /api/bird-image?scientific_name={name}`
2. 后端检查本地缓存 (`image_cache/{md5_hash}.*`)
3. 缓存命中 → 返回 `/api/bird-image-file/{cache_key}{ext}`
4. 缓存未命中 → 从 Wikipedia API 获取图片 URL
5. 下载图片到本地缓存，MD5 哈希作为文件名
6. 返回后端代理 URL（前端通过 `normalizeUrl()` 转换为绝对路径）

### 类型同步

前端 TypeScript 类型 (`app/types.ts`) 和后端 Pydantic 模型 (`app/models.py`) 保持同步，应与 API 响应格式匹配:

```typescript
interface AnalysisData {
  fileName: string
  analysisTime: number
  detections: Detection[]
  summary: { totalDetections: number, speciesCount: number, audioDuration: string }
}
```

---

## 关键文件参考

| 文件 | 用途 |
|------|---------|
| `app/App.tsx` | 根组件，所有状态，路由逻辑，渲染优先级（错误>加载>结果>导航） |
| `app/hooks/useMediaRecorder.ts` | 自定义录音 Hook |
| `app/services/api.ts` | API 通信，类型定义，`normalizeUrl()`，使用 `VITE_API_BASE_URL` |
| `app/.env` | 前端环境变量配置，指定后端地址 |
| `app/.env.example` | 环境变量模板 |
| `app/screens/RecordingScreen.tsx` | 录音界面 |
| `app/screens/ResultsScreen.tsx` | 结果展示，通过后端代理获取鸟类图片 |
| `server/app/main.py` | FastAPI 应用入口，CORS 配置 |
| `server/app/routes/analyze.py` | 分析 API，音频转换 |
| `server/app/services/birdnet_service.py` | BirdNET 集成层，直接调用 Python API |
| `server/app/utils/audio_converter.py` | ffmpeg 音频转换 |
| `server/app/config.py` | 环境配置，包含 IMAGE_CACHE_DIR 等路径 |
| `server/Dockerfile` | Hugging Face Spaces 部署配置 |

---

## 环境变量

### 前端 `.env` (位于 `app/` 目录)

```bash
# API 基础路径
# 开发环境：留空使用 Vite 代理到 localhost:3001
# 移动端调试：填入 Cloudflare Tunnel 地址 (e.g., https://xxx.trycloudflare.com/api)
# 生产环境：填入 Hugging Face API 地址
VITE_API_BASE_URL=
```

**配置说明**：
- 变量名必须以 `VITE_` 开头，Vite 才能识别
- 留空时回退到 `/api`，通过 Vite 代理访问本地后端
- 填写完整 URL 时直接访问该地址（用于隧道/云端部署）

### 后端 `.env` (位于 `server/` 目录)
```
HOST=0.0.0.0
PORT=3001
CORS_ORIGIN=http://localhost:3000
PYTHON_PATH=python3
ANALYSIS_TIMEOUT=300
CLEANUP_ENABLED=true
CLEANUP_INTERVAL=3600
CLEANUP_MAX_AGE=86400
```

---

## 部署

### 云端部署 (Hugging Face Spaces)

后端可部署至 Hugging Face Spaces (Docker)，实现零成本高可用：

**推送命令**（仅推送 server 子目录）:
```bash
git push hf $(git commit-tree $(git rev-parse HEAD:server) -m "Deploy API"):main --force
```

**注意事项**:
- 使用 Docker SDK，免费版提供 2 vCPU + 16GB RAM
- 需要配置 HF remote: `git remote add hf https://<token>@huggingface.co/spaces/<user>/<space>`
- `Dockerfile` 中需要 `chmod -R 777` birdnet_analyzer 目录（权限问题）

详细指南: [docs/huggingface-deployment-guide.md](docs/huggingface-deployment-guide.md)

## 开发代理配置

前端开发服务器使用 Vite proxy 将 `/api` 请求代理到后端：
- 前端地址: `http://localhost:3000`
- 后端地址: `http://localhost:3001`
- 配置文件: `app/vite.config.ts`
- 代理规则: `/api` → `http://localhost:3001`

### 移动端调试（Cloudflare Tunnel 混合云方案）

**场景一：混合云调试（推荐）**
- 后端部署在 Hugging Face Spaces（云端）
- 前端在本地开发，通过 Cloudflare Tunnel 暴露给手机

```bash
# 只需启动前端隧道
npx cloudflared tunnel --url http://localhost:3000
```

配置 `app/.env` 中的 `VITE_API_BASE_URL` 指向 Hugging Face Space 地址。

**场景二：全本地联调**
- 前后端都在本地运行

```bash
# 终端 1: 后端隧道
npx cloudflared tunnel --url http://localhost:3001

# 终端 2: 前端隧道
npx cloudflared tunnel --url http://localhost:3000
```

配置 `app/.env` 中的 `VITE_API_BASE_URL` 指向后端隧道地址。

**注意事项**：
- 隧道地址每次启动都会变化，需要更新 `.env` 文件
- Vite 会自动热重载 `.env` 变化
- Cloudflare 免费版无流量限制

**HTTPS 说明**：
- 手机端必须通过 HTTPS 访问（iOS 麦克风权限要求）
- Cloudflare Tunnel 自动提供合法证书
- 本地开发使用纯 HTTP（localhost 被视为安全上下文）

### 局域网调试（备用方案）

手机和电脑在同一 Wi-Fi 时，可直接访问局域网 IP：
- 获取电脑 IP：`ipconfig getifaddr en0`（macOS）
- 访问地址：`http://192.168.x.x:3000`
- 注意：iOS 可能无法使用麦克风（需要 HTTPS）

---

## 使用的外部 API

- **BirdNET-Analyzer**: 本地 Python 包 (通过 `birdnet_analyzer.analyze()` 直接调用，非子进程)
- **Wikipedia REST API**: 后端代理调用，通过学名获取鸟类图片
  - 后端端点: `GET /api/bird-image?scientific_name={name}`
  - 缓存端点: `GET /api/bird-image-file/{cache_key}{ext}`
  - 图片缓存到本地 `image_cache/` 目录，使用 MD5 哈希作为缓存键
  - 前端不直接访问 Wikipedia，避免跨域和限流问题
- **Wikimedia Image Download**: 后端从 Wikimedia 下载图片到本地缓存
  - **必需设置正确的 User-Agent**: `"BirdEcho/1.0 (https://github.com/smalldeng/bird-echo; birds@bird-echo.app)"`
  - Wikimedia 要求标准 User-Agent 格式，否则返回 403
  - 必须跟随重定向 (`follow_redirects=True`)
- **ffmpeg**: 后端音频转换，WebM/MP4 → WAV

---

## 常见陷阱

1. **API 文件验证**: `/api/analyze` 端点同时验证 content-type 和文件扩展名 (为了 curl 兼容性)

2. **虚拟环境路径**: 运行 `setup_models.py` 时，模型会安装到当前激活的 venv 的 site-packages 中

3. **端口冲突**: 前端使用 3000，后端使用 3001 - 确保两个端口都可用

4. **ffmpeg 依赖**: 后端音频转换需要 ffmpeg。未安装时会返回错误（不会降级处理原格式）

5. **Wikimedia User-Agent**: Wikimedia Commons 要求设置符合格式的 User-Agent
   - 格式: `ApplicationName/version (Contact_info)`
   - 当前值: `BirdEcho/1.0 (https://github.com/smalldeng/bird-echo; birds@bird-echo.app)`
   - 不符合格式会返回 HTTP 403

6. **Image Cache**: 鸟类图片缓存在 `server/image_cache/` 目录，已添加到 `.gitignore`
   - 使用 MD5 哈希作为缓存键名
   - 文件名格式: `{md5_hash}.{ext}` (如 `8ac64591370c7c9d2034af97a481ab51.jpg`)

7. **环境变量配置**: `VITE_API_BASE_URL` 必须以 `VITE_` 开头，否则 Vite 无法识别
   - 开发环境留空时使用 Vite 代理
   - 移动端调试需填写完整的隧道地址（包含 `/api` 后缀）
   - 云端部署需填写 Hugging Face API 地址
   - 填写错误会导致 API 请求失败

8. **Cloudflare Tunnel 地址变更**: 每次重启隧道，地址都会变化
   - 需要同步更新 `app/.env` 中的 `VITE_API_BASE_URL`
   - Vite 会自动热重载，无需重启前端服务

9. **Hugging Face 二进制文件限制**: Git 历史中包含二进制文件会被拒绝
   - 解决方案：使用 `git commit-tree` + `--force` 强制推送当前快照
   - 命令：`git push hf $(git commit-tree $(git rev-parse HEAD:server) -m "message"):main --force`

10. **Docker 权限问题**: birdnet_analyzer 需要写入权限
    - 在 Dockerfile 中添加：`RUN chmod -R 777 /usr/local/lib/python3.11/site-packages/birdnet_analyzer`

---

## UI/UX 模式

### 置信度热力图
`ResultsScreen.tsx` 的时间轴使用置信度控制透明度，公式：
```typescript
opacity = Math.max(0.4, (confidence - 0.98) * 50)
```
- 0.98 → 0.4 opacity
- 0.99 → 0.9 opacity
- 1.00 → 1.0 opacity

### 时间格式处理
- BirdNET 输出多种格式（秒数、MM:SS、HH:MM:SS）
- CSV 解析器统一转换为 "MM:SS" 格式
- 前端 `parseTime()` 函数可解析两种格式用于时间轴渲染

### 双重清理策略
1. **即时清理**: 每次分析后，守护线程清理该 session 的文件 (`routes/analyze.py`)
2. **定期清理**: TempCleaner 守护进程每小时清理孤儿文件 (`utils/temp_cleaner.py`)

### 录音格式兼容性
`useMediaRecorder` Hook 动态检测浏览器支持的最佳格式：
- Chrome/Android: `audio/webm;codecs=opus`
- Firefox: `audio/webm` 或 `audio/ogg`
- Safari/iOS: `audio/mp4`
- 后端统一转换为 WAV 供 BirdNET-Analyzer 使用

### Wikipedia 图片尺寸优化
为提升首页加载速度，Wikipedia 图片使用小尺寸请求：
- `HomeScreen.tsx`: 请求 `width=100` 的缩略图（~2KB，而非 ~50KB）
- `ResultsScreen.tsx`: 请求 `width=440` 的标准尺寸
- 所有图片加载都有骨架屏和错误回退（🐦 emoji）
- **重要**: 图片通过后端代理获取，前端不直接访问 Wikipedia API

### 页面背景策略
- `HomeScreen.tsx`: CSS 渐变 `bg-gradient-to-br from-green-50 to-emerald-100`
- `RecordingScreen.tsx`: CSS 渐变 `bg-gradient-to-br from-green-100 via-green-50 to-emerald-100`
- 避免使用外部背景图片（Unsplash 等），防止加载延迟和颜色突变

### 音频回放
`ResultsScreen.tsx` 实现音频播放/暂停功能：
- 使用 HTML Audio API 播放录音 Blob
- 通过 `URL.createObjectURL()` 创建音频 URL
- 播放按钮显示 Play/Pause 图标切换
- 音频结束时自动重置播放状态

### URL 归一化
`api.ts` 中的 `normalizeUrl()` 函数处理云端部署的路径问题：
- 后端返回相对路径 `/api/bird-image-file/xxx.jpg`
- 前端拼接为 `https://<backend-url>/api/bird-image-file/xxx.jpg`
- 确保图片在不同域名下可正常加载
