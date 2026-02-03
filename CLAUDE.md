# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 提供在此代码库中工作的指导。

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
curl -X POST http://localhost:3001/api/analyze -F "audio=@server/cuckoo.wav"
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

---

## 架构

### 前端结构

**状态管理**: 所有状态集中在 `App.tsx` 中。不使用 Redux 或 Context API。
- `currentTab`: "home" | "library" | "profile"
- `showRecording`: boolean
- `analysisResult`: AnalysisData | null
- `isAnalyzing`: boolean
- `error`: string | null

**导航**: 三个页面，由 `App.tsx` 条件渲染控制（无路由库，纯状态驱动）:
- `HomeScreen.tsx` - 主页，带录制按钮
- `RecordingScreen.tsx` - 音频录制界面，使用 `react-ts-audio-recorder` 库直接录制 WAV 格式
- `ResultsScreen.tsx` - 显示检测结果，客户端从 Wikipedia 获取鸟类图片

**渲染优先级** (`App.tsx` 的 `renderContent()` 函数):
1. 错误状态 > 2. 加载状态 > 3. 结果页 > 4. 标签页导航

**API 层**: `services/api.ts` - 单文件包含所有后端通信和 TypeScript 接口定义。

### 后端结构

**入口**: `app/main.py` - 注册路由、CORS、启动/关闭处理器

**路由处理器**: `app/routes/analyze.py`
- POST `/api/analyze` - 接收 multipart form data 音频文件
- GET `/api/health` - 健康检查

**服务层**: `app/services/birdnet_service.py`
- 通过子进程调用 BirdNET-Analyzer: `python -m birdnet_analyzer.analyze`
- 返回从 CSV 解析的检测结果

**工具类**:
- `app/utils/csv_parser.py` - 解析 BirdNET `*results.csv` 文件
- `app/utils/temp_cleaner.py` - 守护线程，定期清理文件

### 数据流

1. 用户录制音频 → MediaRecorder 创建 Blob
2. 前端发送到 `POST /api/analyze` (multipart/form-data)
3. 后端保存到 `uploads/{session_id}/`
4. BirdNET-Analyzer 子进程写入 `outputs/{session_id}/`
5. 解析 CSV，返回响应
6. 清理线程异步删除临时文件

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
| `app/App.tsx` | 根组件，所有状态，路由逻辑 |
| `app/services/api.ts` | API 通信，类型定义 |
| `app/screens/ResultsScreen.tsx` | 结果展示，Wikipedia 图片 |
| `server/app/main.py` | FastAPI 应用入口 |
| `server/app/services/birdnet_service.py` | BirdNET 集成层 |
| `server/app/config.py` | 环境配置 |

---

## 环境变量

后端 `.env` (位于 `server/` 目录):
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

## 使用的外部 API

- **BirdNET-Analyzer**: 本地 Python 子进程 (非 HTTP API)
- **Wikipedia REST API**: `ResultsScreen.tsx` 客户端调用，通过学名获取鸟类图片
  - URL 模式: `https://en.wikipedia.org/api/rest_v1/page/summary/{scientificName}`
  - 返回 `thumbnail.source` 作为图片 URL
  - 优雅降级：无图片不影响结果显示

---

## 前端依赖

### react-ts-audio-recorder
音频录制库，支持直接录制 WAV 格式（与 BirdNET-Analyzer 兼容）。
- **安装**: `npm install react-ts-audio-recorder`
- **使用**: `RecordingScreen.tsx` 中使用 `MultiRecorder` 类
- **格式**: WAV (无压缩 PCM，采样率默认 48000Hz)

---

## 常见陷阱

1. **API 文件验证**: `/api/analyze` 端点同时验证 content-type 和文件扩展名 (为了 curl 兼容性)

2. **虚拟环境路径**: 运行 `setup_models.py` 时，模型会安装到当前激活的 venv 的 site-packages 中

3. **端口冲突**: 前端使用 3000，后端使用 3001 - 确保两个端口都可用

4. **音频格式**: BirdNET-Analyzer 对 WAV 格式支持最好。前端使用 `react-ts-audio-recorder` 直接录制 WAV 格式，避免 WebM/Opus 格式兼容性问题

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
