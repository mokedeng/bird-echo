import logging
import time
from pathlib import Path
from typing import List
from birdnet_analyzer import analyze as birdnet_analyze
from .. import config
from ..models import Detection
from ..utils.csv_parser import parse_results_csv

logger = logging.getLogger(__name__)


class BirdNetService:
    """BirdNET 分析服务"""

    def analyze_audio(self, input_path: str, session_id: str) -> dict:
        """
        调用 BirdNET-Analyzer 分析音频文件

        Args:
            input_path: 输入音频文件路径
            session_id: 会话ID用于创建独立的输出目录

        Returns:
            包含检测结果和分析时间的字典
        """
        output_dir = config.OUTPUT_DIR / session_id
        output_dir.mkdir(parents=True, exist_ok=True)

        logger.info(f"Starting BirdNET analysis for: {input_path}")
        start_time = time.time()

        try:
            # 直接调用 BirdNET Python API（模型在进程内缓存，后续调用只需 0.5-1 秒）
            logger.info(f"Calling BirdNET Python API directly (output: {output_dir})")
            
            birdnet_analyze(
                input_path,
                output=str(output_dir),
                rtype="csv"
            )

            # 列出输出目录中的所有文件
            output_files = list(output_dir.glob("*"))
            logger.info(f"Output directory contents: {[str(f.name) for f in output_files]}")

            # 查找并解析 results.csv
            results_file = self._find_results_file(output_dir)
            detections = parse_results_csv(results_file)

            analysis_time = time.time() - start_time
            logger.info(f"Analysis completed in {analysis_time:.2f}s, found {len(detections)} detections")

            return {
                "detections": [d.model_dump() for d in detections],
                "analysis_time": analysis_time,
                "session_id": session_id
            }

        except Exception as e:
            logger.error(f"BirdNET analysis error: {e}")
            raise Exception(f"Analysis failed: {str(e)}")

    def _find_results_file(self, output_dir: Path) -> Path:
        """
        查找 results.csv 文件

        Args:
            output_dir: 输出目录路径

        Returns:
            results.csv 文件路径

        Raises:
            FileNotFoundError: 如果找不到 results.csv
        """
        # BirdNET 输出文件名格式: {输入文件名}.csv
        # 例如: recording.wav.csv
        csv_files = list(output_dir.glob("*.csv"))

        if not csv_files:
            raise FileNotFoundError(f"No CSV files found in output directory: {output_dir}")

        logger.info(f"Found CSV files: {[f.name for f in csv_files]}")
        return csv_files[0]


# 全局服务实例
birdnet_service = BirdNetService()
