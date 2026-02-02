import React, { useState, useEffect, useRef } from 'react';
import { Icons } from '../components/Icons';
import { Waveform } from '../components/Waveform';

interface RecordingScreenProps {
  onClose: () => void;
  onFinish: (blob: Blob) => void;
}

export const RecordingScreen: React.FC<RecordingScreenProps> = ({ onClose, onFinish }) => {
  const [seconds, setSeconds] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  // Start recording on mount
  useEffect(() => {
    startRecording();
    return () => {
      stopMediaRecorder();
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
        onFinish(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);

      timerRef.current = window.setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please allow permissions.");
      onClose();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      stopMediaRecorder(); // clean up stream
    }
  };

  const stopMediaRecorder = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
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
          <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5">
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
            onClick={stopRecording}
            className="w-full max-w-xs h-16 bg-primary rounded-full flex items-center justify-center gap-3 shadow-xl shadow-primary/30 active:scale-95 transition-transform"
          >
            <Icons.Stop className="fill-dark stroke-dark" size={24} />
            <span className="font-bold uppercase tracking-widest text-dark">Stop Recording</span>
          </button>
          
          <button 
            onClick={onClose}
            className="text-sm font-bold text-dark/60 hover:text-dark transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};