# 使用官方 Python 3.11 精简版镜像作为基础
FROM python:3.11-slim

# 设置工作目录
WORKDIR /app

# 设置环境变量
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=7860

# 1. 安装系统依赖 (包含 ffmpeg 和 libsndfile)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
    git \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# 2. 复制依赖文件并安装
COPY app/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 修复 birdnet_analyzer 试图在 site-packages 写入 error_log.txt 的权限问题
RUN chmod -R 777 /usr/local/lib/python3.11/site-packages/birdnet_analyzer

# 3. 复制项目代码
COPY . .

# 4. 创建必要的目录并设置权限 (Hugging Face 默认使用 user 1000)
RUN mkdir -p uploads outputs image_cache && \
    chmod 777 uploads outputs image_cache

# 5. 预下载 BirdNET 模型
RUN python setup_models.py

# 6. 创建非 root 用户
RUN useradd -m -u 1000 user
USER user

# 7. 暴露端口
EXPOSE 7860

# 8. 启动命令
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port $PORT"]