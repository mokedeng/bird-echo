import threading
import time
import logging
from pathlib import Path
from datetime import datetime, timedelta
from .. import config

logger = logging.getLogger(__name__)


class TempCleaner:
    """临时文件清理器"""

    def __init__(self):
        self.running = False
        self.thread = None

    def start(self):
        """启动清理器"""
        if not config.CLEANUP_ENABLED:
            logger.info("Temp cleaner is disabled")
            return

        if self.running:
            logger.warning("Temp cleaner is already running")
            return

        self.running = True
        self.thread = threading.Thread(target=self._cleanup_loop, daemon=True)
        self.thread.start()
        logger.info(f"Temp cleaner started (interval: {config.CLEANUP_INTERVAL}s)")

    def stop(self):
        """停止清理器"""
        self.running = False
        if self.thread:
            self.thread.join(timeout=5)
        logger.info("Temp cleaner stopped")

    def _cleanup_loop(self):
        """清理循环"""
        while self.running:
            try:
                self.cleanup()
            except Exception as e:
                logger.error(f"Cleanup error: {e}")

            # 等待下一次清理
            for _ in range(config.CLEANUP_INTERVAL):
                if not self.running:
                    break
                time.sleep(1)

    def cleanup(self):
        """执行清理"""
        now = time.time()
        max_age_seconds = config.CLEANUP_MAX_AGE

        for directory in [config.UPLOAD_DIR, config.OUTPUT_DIR]:
            try:
                self._clean_directory(directory, now, max_age_seconds)
            except Exception as e:
                logger.error(f"Failed to clean {directory}: {e}")

    def _clean_directory(self, directory: Path, now: float, max_age: float):
        """清理指定目录中的旧文件"""
        if not directory.exists():
            return

        for item in directory.iterdir():
            if item.is_dir():
                # 检查目录的修改时间
                mtime = item.stat().st_mtime
                age = now - mtime

                if age > max_age:
                    try:
                        import shutil
                        shutil.rmtree(item)
                        logger.info(f"Removed old directory: {item}")
                    except Exception as e:
                        logger.warning(f"Failed to remove {item}: {e}")


# 全局清理器实例
cleaner = TempCleaner()
