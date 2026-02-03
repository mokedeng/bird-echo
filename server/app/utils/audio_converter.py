import logging
import subprocess
from pathlib import Path
from .. import config

logger = logging.getLogger(__name__)


def convert_to_wav(input_file: Path, output_file: Path) -> Path:
    """
    使用 ffmpeg 将音频文件转换为 WAV 格式

    转换参数:
    - 采样率: 22050 Hz (与 BirdNET 训练数据一致)
    - 声道: mono (单声道)
    - 编码: PCM 16-bit
    - 静音修剪: 移除开头和结尾的静音 (解决 MediaRecorder 填充问题)

    Args:
        input_file: 输入音频文件路径
        output_file: 输出 WAV 文件路径

    Returns:
        转换后的 WAV 文件路径

    Raises:
        RuntimeError: 如果 ffmpeg 不可用或转换失败
    """
    # 检查 ffmpeg 是否可用
    try:
        subprocess.run(
            ["ffmpeg", "-version"],
            capture_output=True,
            check=True,
        )
    except (subprocess.CalledProcessError, FileNotFoundError):
        raise RuntimeError(
            "ffmpeg is not installed. Please install ffmpeg:\n"
            "  macOS: brew install ffmpeg\n"
            "  Ubuntu: sudo apt-get install ffmpeg\n"
            "  Windows: https://ffmpeg.org/download.html"
        )

    # 获取输入文件大小
    input_size = input_file.stat().st_size
    logger.info(f"Input file: {input_file.name}, size: {input_size} bytes")

    # 确保输出目录存在
    output_file.parent.mkdir(parents=True, exist_ok=True)

    # 构建 ffmpeg 命令
    # 使用 silenceremove 过滤器移除开头和结尾的静音
    # - period=1: 检测窗口为 1 秒
    # - duration=0.5: 将连续 0.5 秒以上的静音视为静音段
    # - start_periods=1: 开头至少有 1 个非静音段才开始
    # - start_silence=1: 移除开头的静音
    # - start_duration=0.5: 开头至少有 0.5 秒静音才修剪
    # - stop_silence=1: 移除结尾的静音
    # - stop_duration=0.5: 结尾至少有 0.5 秒静音才修剪
    # - stop_threshold=-60dB: 低于 -60dB 视为静音
    cmd = [
        "ffmpeg",
        "-y",  # 覆盖输出文件
        "-i", str(input_file),  # 输入文件
        "-af", "silenceremove=start_periods=1:start_duration=0.5:start_silence=1:stop_periods=1:stop_duration=0.5:stop_silence=1:stop_threshold=-60dB",
        "-ar", "22050",  # 采样率 22050 Hz
        "-ac", "1",  # 单声道
        "-sample_fmt", "s16",  # PCM 16-bit
        str(output_file),
    ]

    logger.info(f"Converting {input_file.name} to WAV with silence removal")

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True,
        )
        logger.info(f"ffmpeg stdout: {result.stdout}")
        if result.stderr:
            logger.debug(f"ffmpeg stderr: {result.stderr}")

    except subprocess.CalledProcessError as e:
        logger.error(f"ffmpeg failed: {e.stderr}")
        raise RuntimeError(f"Audio conversion failed: {e.stderr}")

    logger.info(f"Conversion complete: {output_file} ({output_file.stat().st_size} bytes)")

    return output_file
