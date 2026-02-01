import csv
import logging
from pathlib import Path
from typing import List
from ..models import Detection

logger = logging.getLogger(__name__)


def parse_results_csv(file_path: Path) -> List[Detection]:
    """
    解析 BirdNET 生成的 results.csv 文件

    Args:
        file_path: CSV 文件路径

    Returns:
        解析后的检测数据列表
    """
    detections = []

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            headers = next(reader, None)  # 跳过标题行

            for row in reader:
                if not row or len(row) < 5:
                    continue

                # BirdNET CSV 格式: StartTime, EndTime, Scientific Name, Common Name, Confidence, Label
                start_time = _format_time(row[0])
                end_time = _format_time(row[1])
                scientific_name = row[2]
                common_name = row[3]
                confidence = float(row[4])
                label = row[5] if len(row) > 5 else f"{common_name} ({scientific_name})"

                detections.append(Detection(
                    startTime=start_time,
                    endTime=end_time,
                    scientificName=scientific_name,
                    commonName=common_name,
                    confidence=confidence,
                    label=label
                ))

        logger.info(f"Parsed {len(detections)} detections from {file_path}")
        return detections

    except Exception as e:
        logger.error(f"Failed to parse CSV file {file_path}: {e}")
        raise


def _format_time(seconds: str) -> str:
    """
    将秒数转换为时间格式 (MM:SS)

    Args:
        seconds: 秒数字符串

    Returns:
        格式化后的时间字符串
    """
    try:
        secs = float(seconds)
        minutes = int(secs // 60)
        remaining_secs = int(secs % 60)
        return f"{minutes}:{remaining_secs:02d}"
    except (ValueError, TypeError):
        return "0:00"
