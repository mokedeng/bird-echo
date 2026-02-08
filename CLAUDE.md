# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Bird Echo 是一个鸟类识别 Web 应用。用户录制或上传音频文件，由 BirdNET-Analyzer AI 模型分析并检测 bird species。

**架构**: 前端部署于 Vercel，后端部署于 Hugging Face Spaces (Docker)
**前端端口**: 3000 (Vite 开发服务器)
**后端端口**: 3001 (本地开发) / 7860 (Hugging Face)

---

## 部署信息 (Production)

- **前端域名**: `https://bird-echo.vercel.app` (或其他 Vercel 分配域名)
- **后端域名**: `https://<your-space-id>.hf.space` (受保护，请勿在公开文档暴露真实 URL)

**环境变量要求**:
- 真实的 API 地址必须配置在 Vercel 后台的 `VITE_API_BASE_URL` 变量中。
- 本地开发时，在 `app/.env` 中配置，该文件已被 `.gitignore` 排除，确保安全。

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
uv venv --python 3.11
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 3001
```

### 推送至 Hugging Face (魔法命令)
```bash
# 提取 server 目录快照并推送到 HF，避开二进制历史限制
git push hf $(git commit-tree $(git rev-parse HEAD:server) -m "Deploy API"):main --force
```

---

## 关键约束与安全

### 环境变量 (Sensitive)
- **VITE_API_BASE_URL**: 必须以 `VITE_` 开头。严禁硬编码在 `api.ts` 中。
- **Git 安全**: 严禁将包含真实后端地址的 `.env` 提交到 GitHub 仓库。

### 权限与预热
- **Docker 权限**: `birdnet_analyzer` 需 `chmod -R 777`。
- **自动预热**: 启动时使用 `wave` 模块生成静音音频预热，响应约 2s。

---

## 核心逻辑

### 前端 (App.tsx)
- **优先级**: 错误 > 加载 > 结果 > 首页。
- **API 通讯**: 使用 `api.ts` 中的 `normalizeUrl()` 处理相对路径。支持 60s 超时控制。

### 后端 (analyze.py)
- **音频**: 自动调用 `ffmpeg` 转换为 22050Hz 单声道 WAV。
- **图片**: 后端代理 Wikipedia 图片并本地 MD5 缓存。
- **User-Agent**: 必须使用标准格式以防 Wikimedia 返回 403。

---

## 常见陷阱

1. **二进制历史**: 推送 HF 报错时必须使用魔法命令重置 HEAD。
2. **CORS**: 后端已配置 `expose_headers=["*"]` 以支持 Vercel 跨域读取。
3. **Vercel Build**: 确保在 Vercel 仪表盘中配置了正确的 `VITE_API_BASE_URL`。
