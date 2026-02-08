# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Bird Echo 是一个鸟类识别 Web 应用。用户录制或上传音频文件，由 BirdNET-Analyzer AI 模型分析并检测 bird species。

**架构**: 前端部署于 Vercel，后端部署于 Hugging Face Spaces (Docker)
**前端端口**: 3000 (Vite 开发服务器)
**后端端口**: 3001 (本地开发) / 7860 (Hugging Face)

---

## 开发命令

### 前端 (app/)
```bash
cd app
npm install           # 安装依赖
npm run dev          # 启动开发服务器 (端口 3000)
npm run build        # 生产构建
npx vercel           # 部署至 Vercel
```

### 后端 (server/)
```bash
cd server

# 环境配置 (仅需一次)
uv venv --python 3.11
source .venv/bin/activate

# 启动服务器
uvicorn app.main:app --reload --host 0.0.0.0 --port 3001

# 模型预埋
python setup_models.py
```

### 推送至 Hugging Face (魔法命令)
```bash
# 在根目录执行，仅推送 server 子目录快照，避开二进制历史限制
git push hf $(git commit-tree $(git rev-parse HEAD:server) -m "Deploy API"):main --force
```

---

## 关键约束

### 架构模式 (Cloud-Native)
- **前后端分离**: 前端通过 `VITE_API_BASE_URL` 环境变量动态请求后端 API。
- **路径归一化**: 必须使用 `api.ts` 中的 `normalizeUrl()` 处理后端返回的相对路径。
- **跨域 (CORS)**: 后端 `main.py` 已配置 `allow_origins=["*"]` 以支持 Vercel 和 移动端。

### 权限与预热
- **Docker 权限**: `birdnet_analyzer` 需要写入 `error_log.txt`。Dockerfile 中必须包含 `chmod -R 777` 对应目录。
- **自动预热**: `main.py` 启动时使用 `wave` 模块生成静音音频进行模型预热（响应速度从 19s 降至 ~2s）。

---

## 前端核心逻辑 (App.tsx)

**渲染优先级**:
1. 错误状态 (`error`) > 2. 加载状态 (`isAnalyzing`) > 3. 结果页 (`analysisResult`) > 4. 首页

**录音处理**:
- 使用 `useMediaRecorder` 自定义 Hook。
- 支持 60s 分析超时设置（适配 HF 免费算力）。
- 每次分析前必须 `setAnalysisResult(null)` 以防状态残留。

---

## 后端核心逻辑 (analyze.py)

**音频处理**:
- 自动检测并使用 `ffmpeg` 转换为 22050Hz 单声道 WAV。
- 采用双重清理策略：Session 即时清理 + 每小时定时清理。

**图片获取**:
- 通过后端代理访问 Wikipedia，带本地 MD5 哈希缓存。
- **必需 User-Agent**: `"BirdEcho/1.0 (https://github.com/smalldeng/bird-echo; birds@bird-echo.app)"`。

---

## 环境变量 (.env)

### `app/.env` (Vite 识别)
```bash
# 开发环境留空走代理，生产环境填入 Hugging Face 完整 API 地址
VITE_API_BASE_URL=https://your-space.hf.space/api
```

### `server/.env` (FastAPI 识别)
```bash
PORT=3001
CLEANUP_ENABLED=true
```

---

## 生产环境地址

- **前端**: https://bird-echo.vercel.app
- **后端**: https://smalldeng-bird-echo-api.hf.space

生产环境配置：
```bash
VITE_API_BASE_URL=https://smalldeng-bird-echo-api.hf.space/api
```

---

## 常见陷阱

1. **二进制历史**: 推送至 HF 前必须通过魔法命令切断包含 `.wav` 文件的 Git 历史。
2. **Hugging Face 配置**: `server/README.md` 必须包含 YAML 元数据才能识别 Docker SDK。
3. **CORS 预检**: 确保后端 `expose_headers=["*"]` 以支持复杂请求。
4. **Vite 变量**: 必须以 `VITE_` 开头，否则前端代码无法读取。