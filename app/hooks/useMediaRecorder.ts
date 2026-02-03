import { useState, useRef, useCallback } from 'react';

interface UseMediaRecorderOptions {
  onDataAvailable?: (blob: Blob) => void;
  onStop?: (blob: Blob) => void;
  onError?: (error: Error) => void;
}

interface UseMediaRecorderReturn {
  isRecording: boolean;
  recordingTime: number;
  audioBlob: Blob | null;
  mimeType: string;
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

/**
 * 自定义录音 Hook - 使用原生 MediaRecorder API
 *
 * 特性：
 * - 动态检测最佳 MimeType (WebM/Opus → MP4)
 * - 跨平台兼容 (Chrome/Safari/Firefox)
 * - 自动处理麦克风权限
 * - 无时长限制
 */
export const useMediaRecorder = (options: UseMediaRecorderOptions = {}): UseMediaRecorderReturn => {
  const { onDataAvailable, onStop, onError } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [mimeType, setMimeType] = useState<string>('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  /**
   * 检测并返回最佳支持的 MimeType
   * 优先级: audio/webm;codecs=opus > audio/webm > audio/mp4 > audio/ogg
   */
  const getBestMimeType = useCallback((): string => {
    const mimeTypes = [
      'audio/webm;codecs=opus', // Chrome/Android 最佳选择
      'audio/webm',             // Firefox
      'audio/mp4',              // Safari (iOS 14.5+)
      'audio/ogg',              // Firefox 备选
    ];

    for (const type of mimeTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    // 如果都不支持，返回默认（浏览器会自动选择）
    console.warn('[useMediaRecorder] No preferred MIME type supported, using default');
    return '';
  }, []);

  /**
   * 开始录音
   */
  const start = useCallback(async () => {
    try {
      // 1. 请求麦克风权限
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // 2. 获取最佳 MimeType
      const selectedMimeType = getBestMimeType();
      setMimeType(selectedMimeType || 'audio/webm');

      // 3. 创建 MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType || undefined,
      });

      mediaRecorderRef.current = mediaRecorder;
      streamRef.current = stream;
      chunksRef.current = [];

      // 4. 设置数据收集回调
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          onDataAvailable?.(event.data);
        }
      };

      // 5. 设置录音结束回调
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: selectedMimeType || 'audio/webm',
        });
        setAudioBlob(blob);
        setIsRecording(false);
        onStop?.(blob);
      };

      // 6. 开始录音（不使用 timeslice，让浏览器自动优化）
      mediaRecorder.start();
      setIsRecording(true);

      // 7. 启动计时器
      startTimeRef.current = Date.now();
      timerRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setRecordingTime(elapsed);
      }, 1000);

    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('[useMediaRecorder] Error:', error);
      onError?.(error);
      throw error;
    }
  }, [getBestMimeType, onDataAvailable, onStop, onError]);

  /**
   * 停止录音
   */
  const stop = useCallback(async () => {
    if (mediaRecorderRef.current && isRecording) {
      // 先停止所有音频轨道，防止继续缓冲
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      // 停止 MediaRecorder (会触发 onstop 回调)
      mediaRecorderRef.current.stop();

      // 清理计时器
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording, recordingTime]);

  return {
    isRecording,
    recordingTime,
    audioBlob,
    mimeType,
    start,
    stop,
  };
};
