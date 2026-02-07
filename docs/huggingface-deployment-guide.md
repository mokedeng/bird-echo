# Bird Echo 后端部署至 Hugging Face 实战指南

本指南记录了将基于 BirdNET-Analyzer 的 Python 后端部署至 Hugging Face Spaces (Docker) 的全过程，重点总结了在高性能、高可用架构下遇到的坑点及解决方案。

---

## 1. 准备工作

1. **注册与创建**：在 Hugging Face 注册账号，新建一个 Space。
   - **SDK 选择**：必须选择 **Docker**。
   - **硬件选择**：免费版 (2 vCPU, 16GB RAM) 足够运行 BirdNET。
2. **获取 Token**：在 Settings -> Access Tokens 中创建一个具有 `Write` 权限的 Token。
3. **配置远程仓库**：
   ```bash
   git remote add hf https://smalldeng:<YOUR_TOKEN>@huggingface.co/spaces/smalldeng/bird-echo-api
   ```

---

## 2. 核心坑点复盘与解决方案

### 坑点 A：Git 二进制文件拒绝 (Binary File Rejection)
- **现象**：推送时报错 `Your push was rejected because it contains binary files`，指向 `.wav` 文件。
- **原因**：HF 默认禁止在 Git 历史中存储大型二进制文件。即使在最新提交中删除了文件，Git 历史记录依然会携带它。
- **解决方案**：使用“魔法命令”强制推送当前快照，彻底抹除历史记录：
  ```bash
  git push hf $(git commit-tree $(git rev-parse HEAD:server) -m "Deploy clean API"):main --force
  ```

### 坑点 B：Docker 目录权限错误 (Permission Denied)
- **现象**：分析时报错 `[Errno 13] Permission denied: .../birdnet_analyzer/error_log.txt`。
- **原因**：Hugging Face 以非 root 用户运行。`birdnet-analyzer` 尝试在其安装目录（系统路径）下写日志。
- **解决方案**：在 `Dockerfile` 中显式放开插件目录权限：
  ```dockerfile
  RUN pip install -r requirements.txt
  RUN chmod -R 777 /usr/local/lib/python3.11/site-packages/birdnet_analyzer
  ```

### 坑点 C：模型启动预热失败
- **现象**：首次分析耗时超过 19 秒。
- **原因**：模型未预热。原计划用 `ffmpeg` 生成测试音频，但在 Docker 精简镜像中因缺少滤镜支持而失败。
- **解决方案**：改用 Python 原生 `wave` 模块生成 3 秒静音 WAV 文件进行预热。
- **成果**：预热成功后，分析耗时从 19s 降至 **1.8s** 左右。

---

## 3. 云原生适配逻辑

### 前端：图片地址归一化 (Normalization)
- **挑战**：后端返回相对路径 `/api/bird-image-file/...`，前端部署在不同域名下会导致 404。
- **方案**：在 `api.ts` 中增加转换函数，强制将相对路径拼接为公网绝对路径。

### 后端：跨域配置 (CORS)
- **挑战**：手机端与隧道调试时常触发预检请求失败。
- **方案**：在 `main.py` 中放宽 CORS 限制，并显式暴露所有 Header：
  ```python
  app.add_middleware(
      CORSMiddleware,
      allow_origins=["*"],
      expose_headers=["*"],
      ...
  )
  ```

---

## 4. 维护与更新流程

每次修改 `server/` 代码后，推荐的发布命令：

1. **同步至本地 Git**:
   ```bash
   git add . && git commit -m "your update"
   ```
2. **同步至 GitHub**:
   ```bash
   git push origin main
   ```
3. **同步至 Hugging Face (核心命令)**:
   ```bash
   git push hf $(git commit-tree $(git rev-parse HEAD:server) -m "release v1.x"):main --force
   ```

---

## 5. 零成本闭环总结
通过 **Hugging Face (后端 Docker)** + **Vercel (前端 Web)** + **Capacitor (移动端壳)**，我们成功实现了一个无需支付任何服务器费用的、具备生产级性能的 AI 产品闭环。
