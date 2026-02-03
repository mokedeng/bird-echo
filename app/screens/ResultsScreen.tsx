import React, { useEffect, useState, useMemo } from 'react';
import { AnalysisData } from '../types';
import { Icons } from '../components/Icons';
import { fetchBirdImage } from '../services/api';

interface ResultsScreenProps {
  data: AnalysisData;
  onBack: () => void;
  onSave: () => void;
}

// Helper to parse "MM:SS" or seconds to total seconds number
const parseTime = (timeStr: string | number): number => {
  if (typeof timeStr === 'number') return timeStr;
  const parts = timeStr.split(':');
  if (parts.length === 2) {
    return parseInt(parts[0]) * 60 + parseFloat(parts[1]);
  }
  const parsed = parseFloat(timeStr);
  console.log('[parseTime] Parsed time:', timeStr, '->', parsed);
  if (isNaN(parsed)) {
    console.error('[parseTime] NaN result for:', timeStr);
    return 0;
  }
  return parsed;
};

export const ResultsScreen: React.FC<ResultsScreenProps> = ({ data, onBack, onSave }) => {
  const [isSaved, setIsSaved] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [topMatchImage, setTopMatchImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);

  // Debug log for received data
  console.log('[ResultsScreen] Received data:', data);
  console.log('[ResultsScreen] Detections:', data.detections);
  console.log('[ResultsScreen] Detection count:', data.detections.length);
  console.log('[ResultsScreen] Summary:', data.summary);

  // Find the detection with highest confidence
  const topMatch = useMemo(() => {
    console.log('[ResultsScreen] Calculating topMatch...');
    if (!data.detections.length) {
      console.log('[ResultsScreen] No detections, returning null');
      return null;
    }
    const result = data.detections.reduce((prev, current) =>
      (prev.confidence > current.confidence) ? prev : current
    );
    console.log('[ResultsScreen] Top match:', result);
    return result;
  }, [data]);

  const distinctCalls = data.detections.length;
  const totalDurationSecs = parseTime(data.summary.audioDuration);

  console.log('[ResultsScreen] Distinct calls:', distinctCalls);
  console.log('[ResultsScreen] Total duration secs:', totalDurationSecs);

  // Generate waveform bars that align with detections
  // Bars have higher amplitude where there is a detection
  const waveformBars = useMemo(() => {
    const barCount = 60;
    // Prevent division by zero
    const duration = totalDurationSecs > 0 ? totalDurationSecs : 1;
    return Array.from({ length: barCount }).map((_, i) => {
      const time = (i / barCount) * duration;
      // Check if this time slice falls within any detection
      const isDetected = data.detections.some(d => {
         const start = parseTime(d.startTime);
         const end = parseTime(d.endTime);
         return time >= start && time <= end;
      });

      // High amplitude for detections, low for silence
      if (isDetected) {
         return 0.5 + Math.random() * 0.5; // 0.5 - 1.0 height
      } else {
         return 0.1 + Math.random() * 0.15; // 0.1 - 0.25 height
      }
    });
  }, [data, totalDurationSecs]);

  // Fetch bird image from Wikipedia
  useEffect(() => {
    if (topMatch) {
      setImageLoading(true);
      fetchBirdImage(topMatch.scientificName).then(url => {
        if (url) {
          setTopMatchImage(url);
          console.log('[Results] Image loaded:', url);
        } else {
          console.log('[Results] No image found for:', topMatch.scientificName);
        }
        setImageLoading(false);
      }).catch(err => {
        console.error('[Results] Failed to fetch image:', err);
        setImageLoading(false);
      });
    }
  }, [topMatch]);

  const handleSaveClick = () => {
    setIsSaved(true);
    setTimeout(() => {
      onSave();
    }, 1500); 
  };

  if (!topMatch) return null;

  const confidencePct = (topMatch.confidence * 100).toFixed(1);

  return (
    <div className="flex flex-col h-full bg-[#f6f8f6] text-[#111813] font-sans">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="flex items-center p-4 justify-between w-full">
          <button 
            onClick={onBack}
            className="flex items-center justify-center size-10 rounded-full hover:bg-gray-100 transition-colors"
          >
            <Icons.ChevronLeft size={24} />
          </button>
          <h2 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-2">
            Final Bird Analysis Results
          </h2>
          <button className="flex items-center justify-center size-10 rounded-full hover:bg-gray-100 transition-colors">
            <Icons.More size={24} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full pb-32 px-4 overflow-y-auto no-scrollbar">
        <div className="py-4">
          {/* Audio File Card */}
          <div className="bg-white rounded-xl p-4 flex items-center justify-between border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-[#2bee5b]/10 flex items-center justify-center">
                <Icons.FileAudio className="text-[#2bee5b]" size={24} />
              </div>
              <div>
                <p className="text-base font-bold leading-none">{data.fileName}</p>
                <p className="text-xs opacity-60 mt-1">Duration: {data.summary.audioDuration}</p>
              </div>
            </div>
            <button className="size-10 rounded-full bg-[#2bee5b] flex items-center justify-center text-[#102215] shadow-lg shadow-[#2bee5b]/20">
              <Icons.Play size={20} fill="currentColor" className="ml-0.5" />
            </button>
          </div>
        </div>

        {/* Timeline */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider opacity-60">Detection Timeline</h3>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-[#2bee5b]/20 text-[#248a3e] rounded-full">
              {distinctCalls} Calls Detected
            </span>
          </div>
          
          <div className="relative w-full h-16 bg-gray-200 rounded-xl overflow-hidden flex items-center justify-between px-1">
             {/* 1. Underlying Waveform (The "Signal") */}
             {waveformBars.map((height, i) => (
               <div 
                  key={i} 
                  className="w-1 bg-gray-300 rounded-full"
                  style={{ height: `${height * 100}%` }}
               />
             ))}
            
            {/* 2. Detection Overlays (The "Analysis") */}
            {data.detections.map((d, i) => {
                 const start = parseTime(d.startTime);
                 const end = parseTime(d.endTime);
                 // Prevent division by zero
                 const duration = totalDurationSecs > 0 ? totalDurationSecs : 1;
                 const left = (start / duration) * 100;
                 const width = ((end - start) / duration) * 100;

                 // Confidence Heatmap Logic:
                 // Extreme contrast for 98-100% range.
                 // 0.98 -> 0.4 opacity
                 // 0.99 -> 0.9 opacity
                 // 1.00 -> 1.0 opacity
                 const opacity = Math.max(0.4, (d.confidence - 0.98) * 50);
                 const isSelected = selectedIndex === i;

                 return (
                   <button 
                    key={i}
                    onClick={() => setSelectedIndex(i)}
                    className={`absolute top-0 bottom-0 z-10 rounded-sm flex items-center justify-center gap-[1px] overflow-hidden transition-transform active:scale-95 ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-[#2bee5b]' : ''}`}
                    style={{ 
                      left: `${left}%`, 
                      // Subtract 4px to create a physical gap between segments
                      width: `calc(${width}% - 4px)`,
                      // Apply opacity to the background color for the heatmap effect
                      backgroundColor: `rgba(43, 238, 91, ${opacity})`
                    }}
                   >
                     {/* Embedded Waveform Texture */}
                     {Array.from({ length: 8 }).map((_, idx) => (
                       <div 
                         key={idx}
                         className="w-[2px] bg-black/10 rounded-full"
                         style={{ 
                           height: `${20 + Math.random() * 60}%` 
                         }}
                       />
                     ))}
                   </button>
                 );
             })}
          </div>

          <div className="relative h-4 mt-1.5 px-1">
            {/* Dynamic Ticks based on detections */}
            {data.detections.map((d, i) => {
              const start = parseTime(d.startTime);
              // Prevent division by zero
              const duration = totalDurationSecs > 0 ? totalDurationSecs : 1;
              const left = (start / duration) * 100;
              return (
                <span
                  key={i}
                  className="absolute text-[10px] opacity-40 font-medium whitespace-nowrap"
                  style={{ left: `${left}%`, transform: 'translateX(-50%)' }}
                >
                  {d.startTime}
                </span>
              );
            })}
            {/* End time tick */}
            <span 
              className="absolute text-[10px] opacity-40 font-medium whitespace-nowrap"
              style={{ left: '100%', transform: 'translateX(-50%)' }}
            >
              {data.summary.audioDuration}
            </span>
          </div>
        </div>

        {/* Top Match */}
        <div className="mb-6">
          <h2 className="text-[22px] font-bold leading-tight tracking-tight mb-4">Top Match</h2>
          <div className="flex flex-col items-stretch justify-start rounded-2xl shadow-xl bg-white overflow-hidden border border-gray-100">
            {/* Image */}
            <div className="w-full bg-center bg-no-repeat aspect-[4/3] bg-cover relative bg-gray-100 flex items-center justify-center overflow-hidden">
              {topMatchImage ? (
                <img
                  src={topMatchImage}
                  alt={topMatch.commonName}
                  className="w-full h-full object-cover"
                />
              ) : imageLoading ? (
                <div className="text-center">
                  <div className="animate-spin size-8 border-3 border-gray-300 border-t-[#2bee5b] rounded-full mx-auto mb-2"></div>
                  <p className="text-sm text-gray-400">Loading...</p>
                </div>
              ) : (
                <div className="text-center">
                  <Icons.Image size={48} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm text-gray-400">No image available</p>
                  <p className="text-xs text-gray-300">{topMatch.scientificName}</p>
                </div>
              )}
              <div className="absolute top-4 left-4 bg-[#2bee5b] text-[#102215] text-[10px] font-black uppercase tracking-[0.15em] px-3 py-1.5 rounded-full flex items-center gap-1 shadow-lg">
                <Icons.BadgeCheck size={14} fill="black" className="text-[#2bee5b]" />
                <span className="ml-1">High Confidence</span>
              </div>
            </div>

            <div className="flex w-full flex-col items-stretch justify-center gap-5 p-6">
              <div className="flex justify-between items-start">
                <div>
                  {/* Split name by space to force multi-line rendering for the poster/magazine look */}
                  <h3 className="text-4xl font-extrabold text-[#111813] leading-[0.95] tracking-tight mb-2">
                    {topMatch.commonName.split(' ').map((word, i) => (
                      <span key={i} className="block">{word}</span>
                    ))}
                  </h3>
                  <p className="text-[#61896b] text-lg italic">{topMatch.scientificName}</p>
                </div>
                <div className="text-right">
                  <p className="text-[#2bee5b] text-3xl font-black leading-none" style={{ textShadow: '0 0 1px rgba(0,0,0,0.1)' }}>{confidencePct}%</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-40 mt-1">Confidence</p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="rounded-full bg-gray-100 h-4 overflow-hidden p-0.5">
                  <div 
                    className="h-full rounded-full bg-[#2bee5b] shadow-[0_0_12px_rgba(43,238,91,0.5)]" 
                    style={{ width: `${confidencePct}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <Icons.Info size={20} className="text-[#2bee5b] shrink-0" fill="currentColor" stroke="none" />
                <p className="text-sm opacity-80 leading-snug">
                  AI detected {distinctCalls} distinct vocalizations matching this species. Duplicate results have been aggregated for clarity.
                </p>
              </div>

              <button 
                onClick={handleSaveClick}
                disabled={isSaved}
                className="w-full flex items-center justify-center gap-3 h-14 bg-[#2bee5b] hover:bg-[#22c54b] text-[#102215] rounded-xl font-extrabold text-lg shadow-xl shadow-[#2bee5b]/30 active:scale-[0.98] transition-all"
              >
                {!isSaved ? (
                  <>
                    <Icons.Library size={24} />
                    <span>Save to Life List</span>
                  </>
                ) : (
                  <span>Saved!</span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Breakdown */}
        <div className="mb-8">
          <h3 className="text-sm font-bold uppercase tracking-wider opacity-60 mb-3">Analysis Breakdown</h3>
          <div className="space-y-3">
            {data.detections.map((detection, idx) => {
              const isSelected = selectedIndex === idx;
              return (
                <div 
                  key={idx} 
                  onClick={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-[#2bee5b]/10 border-[#2bee5b] shadow-sm scale-[1.02]' 
                      : 'bg-white border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold px-2 py-1 rounded-md transition-colors ${
                      isSelected ? 'bg-[#2bee5b]/20 text-[#102215]' : 'bg-gray-100 opacity-70'
                    }`}>
                      {detection.startTime} - {detection.endTime}
                    </span>
                    <span className="text-sm font-semibold">{detection.commonName}</span>
                  </div>
                  <span className={`text-xs font-bold ${
                    isSelected ? 'text-[#102215]' : 'text-[#22c54b]'
                  }`}>
                    {(detection.confidence * 100).toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Saved Toast */}
      {isSaved && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none px-6">
          <div className="bg-[#111813]/90 backdrop-blur-xl text-white px-8 py-5 rounded-3xl shadow-2xl flex flex-col items-center gap-3 pointer-events-auto border border-white/20 animate-in fade-in zoom-in duration-300">
            <Icons.CheckCircle size={40} className="text-[#2bee5b]" fill="currentColor" stroke="black" />
            <span className="font-bold text-lg tracking-tight">Saved to Life List!</span>
          </div>
        </div>
      )}
    </div>
  );
};