import React, { useEffect, useState, useRef } from 'react';
import { MultiRecorder } from 'react-ts-audio-recorder';
import { Icons } from '../components/Icons';
import { Waveform } from '../components/Waveform';

interface RecordingScreenProps {
  onClose: () => void;
  onFinish: (blob: Blob) => void;
}

export const RecordingScreen: React.FC<RecordingScreenProps> = ({ onClose, onFinish }) => {
  const [seconds, setSeconds] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const recorderRef = useRef<MultiRecorder | null>(null);
  const timerRef = useRef<number | null>(null);

  // 初始化录音器并开始录音
  useEffect(() => {
    const initRecorder = async () => {
      try {
        console.log('[Recording] Initializing WAV recorder');

        // WAV 格式需要 workletURL（用于 PCM 编码）
        // 使用与 cuckoo.wav 相同的参数以获得一致的检测结果
        const recorder = new MultiRecorder({
          format: 'wav',
          workletURL: '/pcm-worklet.js', // 从 public 目录加载
          sampleRate: 22050, // 匹配原始文件采样率
        });

        await recorder.init();
        recorderRef.current = recorder;

        console.log('[Recording] Starting recording');
        await recorder.startRecording();
        setIsRecording(true);
        console.log('[Recording] Recording started successfully');

        // 启动计时器
        timerRef.current = window.setInterval(() => {
          setSeconds((s) => s + 1);
        }, 1000);

      } catch (err) {
        console.error('[Recording] Error:', err);
        alert('无法访问麦克风，请允许麦克风权限。');
        onClose();
      }
    };

    initRecorder();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (recorderRef.current) {
        recorderRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 处理停止录音
  const handleStopRecording = async () => {
    if (recorderRef.current && isRecording) {
      console.log('[Recording] Stopping recording');

      try {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        setIsRecording(false);
        const blob = await recorderRef.current.stopRecording();
        console.log('[Recording] WAV blob created:', blob.type, blob.size, 'bytes', 'duration:', (blob as any).duration || 'unknown');

        // 先发送 blob，稍后再清理 recorder
        onFinish(blob);

        // 延迟清理，确保 blob 处理完成
        setTimeout(() => {
          if (recorderRef.current) {
            recorderRef.current.close();
            recorderRef.current = null;
          }
        }, 100);
      } catch (err) {
        console.error('[Recording] Stop error:', err);
      }
    }
  };

  // 清理
  const handleClose = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (recorderRef.current) {
      recorderRef.current.close();
    }
    onClose();
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return {
      mins: mins.toString().padStart(2, '0'),
      secs: secs.toString().padStart(2, '0')
    };
  };

  const time = formatTime(seconds);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-surface overflow-hidden">
      {/* Blurred Background */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-30 blur-2xl scale-110"
        style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2560&auto=format&fit=crop")' }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pt-8">
          <button onClick={handleClose} className="p-2 rounded-full hover:bg-black/5">
            <Icons.Close className="text-dark" size={28} />
          </button>

          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Live Recording</span>
            </div>
            <h2 className="text-xl font-bold">Listening...</h2>
          </div>

          <div className="w-10" /> {/* Spacer */}
        </div>

        {/* Timer */}
        <div className="flex justify-center items-center gap-4 mt-8 mb-12">
          <div className="flex flex-col items-center gap-2">
            <div className="w-20 h-20 bg-white/60 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-lg border border-white/40">
              <span className="text-3xl font-bold text-dark">{time.mins}</span>
            </div>
            <span className="text-xs font-bold uppercase text-dark/50">Minutes</span>
          </div>
          <span className="text-2xl font-bold text-dark mb-6">:</span>
          <div className="flex flex-col items-center gap-2">
            <div className="w-20 h-20 bg-white/60 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-lg border border-white/40">
              <span className="text-3xl font-bold text-dark">{time.secs}</span>
            </div>
            <span className="text-xs font-bold uppercase text-dark/50">Seconds</span>
          </div>
        </div>

        {/* Visualization */}
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <Waveform />
          <p className="mt-8 text-center text-dark/60 text-sm max-w-[260px] leading-relaxed">
            Keep the phone steady and pointed towards the sound for best results.
          </p>
        </div>

        {/* Footer Controls */}
        <div className="px-6 pb-12 pt-4 flex flex-col items-center gap-6">
          <button
            onClick={handleStopRecording}
            className="w-full max-w-xs h-16 bg-primary rounded-full flex items-center justify-center gap-3 shadow-xl shadow-primary/30 active:scale-95 transition-transform"
          >
            <Icons.Stop className="fill-dark stroke-dark" size={24} />
            <span className="font-bold uppercase tracking-widest text-dark">Stop Recording</span>
          </button>

          <button
            onClick={handleClose}
            className="text-sm font-bold text-dark/60 hover:text-dark transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
