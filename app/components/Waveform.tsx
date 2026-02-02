import React from 'react';

export const Waveform: React.FC = () => {
  // Generate random heights for the initial state, then animate them
  const bars = Array.from({ length: 20 }).map((_, i) => ({
    delay: Math.random() * 0.5,
    duration: 0.8 + Math.random() * 0.5,
  }));

  return (
    <div className="flex items-center justify-center gap-1.5 h-32 w-full max-w-xs mx-auto">
      {bars.map((bar, i) => (
        <div
          key={i}
          className="w-2 bg-primary rounded-full animate-wave"
          style={{
            height: '20%',
            animationDelay: `${bar.delay}s`,
            animationDuration: `${bar.duration}s`,
          }}
        />
      ))}
    </div>
  );
};