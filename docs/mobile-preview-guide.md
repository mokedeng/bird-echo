# 移动端预览与远程调试指南 (Cloudflare Tunnel 方案)

本指南介绍如何利用 Cloudflare Tunnel 建立隧道系统，实现将本地开发的 Bird Echo 项目映射到公网，供 iPhone 浏览器预览及远程好友试用。

## 1. 核心架构图 (混合云开发模式)

```text
[ 手机端 (iPhone/朋友) ] <---- (A) 加载界面 ----> [ Cloudflare 隧道 ] <----> [ 本地前端 (:3000) ]
         |
         | (B) 发送录音分析请求
         v
[ Hugging Face Spaces ] <--- (C) AI 推理 (BirdNET) --- [ Docker 容器 ]
         |
         +---- (D) 返回识别结果 ----> [ 手机端显示 ]
```

---

## 2. 准备工作

确保以下服务处于就绪状态：
- **后端 (云端/可选)**：Hugging Face Space 状态为 `Running`。
- **前端 (本地)**：在 `app` 目录运行 `npm run dev` (监听端口: 3000)。
- **配置**：`app/.env` 中的 `VITE_API_BASE_URL` 指向对应的后端地址。

---

## 3. 运行命令 (根据场景选择)

### 场景一：混合云调试 (推荐)
**后端已部署至 Hugging Face，本地只开发前端界面。**

1. **启动前端隧道**：
   ```bash
   npx cloudflared tunnel --url http://localhost:3000
   ```
2. **配置地址**：将 `app/.env` 中的 `VITE_API_BASE_URL` 设置为你的 Hugging Face Space 地址。

### 场景二：全本地联调 (前后端都在电脑运行)
**需要在本地修改后端 Python 代码时使用。**

1. **启动后端隧道** (Terminal 1)：
   ```bash
   npx cloudflared tunnel --url http://localhost:3001
   ```
2. **启动前端隧道** (Terminal 2)：
   ```bash
   npx cloudflared tunnel --url http://localhost:3000
   ```
3. **配置地址**：将 `app/.env` 中的 `VITE_API_BASE_URL` 设置为后端隧道生成的随机域名。

---

## 4. 环境变量配置 (动态同步)

为了确保代码的安全性和灵活性，我们采用 `.env` 模式管理地址：

1. **创建本地配置**：首次使用请复制模板文件 `cp app/.env.example app/.env`。
2. **填入 API 地址**：根据上述场景，填入对应的公网链接。
3. **生效机制**：Vite 会自动监测 `.env` 的变化并触发热重载，无需重启前端服务。

---

## 5. 关于 HTTPS 的说明

- **手机端**：必须通过 `https://xxx.trycloudflare.com` 访问。Cloudflare 自动处理了 TLS 终结，因此手机端能正常获取麦克风录音权限。
- **本地端**：电脑浏览器访问 `http://localhost:3000` 即可（localhost 被浏览器视为安全上下文）。
- **已移除 mkcert**：项目已移除本地 `mkcert` 插件。现在本地运行在纯 HTTP 模式下，这与生产环境（Docker 容器内部）的逻辑保持完全一致，架构更清爽。

---

## 6. 原理解析

- **解耦请求**：通过环境变量读取配置，实现了代码逻辑与部署环境的解耦。这不仅方便了本地隧道调试，也完美契合未来在 Hugging Face 上的云原生部署。
- **HTTPS 兼容性**：利用 Cloudflare 的合法证书解决了 iOS 对麦克风权限的强制要求。