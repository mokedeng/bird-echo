import React, { useState } from 'react';
import { HomeScreen } from './screens/HomeScreen';
import { RecordingScreen } from './screens/RecordingScreen';
import { ResultsScreen } from './screens/ResultsScreen';
import { NavBar } from './components/NavBar';
import { analyzeAudio } from './services/api';
import { AnalysisData } from './types';

// Helper to extract error message from various types
const getErrorMessage = (error: unknown): string => {
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && error !== null) {
    // Handle dict type error
    const obj = error as Record<string, unknown>;
    if (typeof obj.detail === 'string') return obj.detail;
    if (typeof obj.message === 'string') return obj.message;
    return JSON.stringify(error);
  }
  return 'Unknown error';
};

const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState('home');
  const [showRecording, setShowRecording] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle saving the bird
  const handleSave = () => {
    setAnalysisResult(null);
    setShowRecording(false);
    setError(null);
  };

  // Handle recording finish
  const handleRecordingFinish = async (audioBlob: Blob) => {
    setIsAnalyzing(true);
    setShowRecording(false);
    setError(null);

    try {
      const response = await analyzeAudio(audioBlob);
      if (response.success) {
        setAnalysisResult(response.data);
      } else {
        throw new Error(getErrorMessage(response.error) || "分析失败");
      }
    } catch (err) {
      console.error("Analysis failed:", err);
      setError(err instanceof Error ? err.message : "网络错误，请确保后端服务已启动");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Main Render Logic
  const renderContent = () => {
    // Priority 1: Show Error
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-[#f6f8f6] px-6 text-center">
          <div className="w-16 h-16 mb-6 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[#111813] mb-2">分析失败</h2>
          <p className="text-gray-500 text-sm mb-6">{error}</p>
          <button
            onClick={() => {
              setError(null);
            }}
            className="px-6 py-2 bg-[#2bee5b] text-white rounded-full font-medium"
          >
            返回首页
          </button>
        </div>
      );
    }

    // Priority 2: Show Loading
    if (isAnalyzing) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-[#f6f8f6] px-6 text-center">
          <div className="relative w-20 h-20 mb-8">
            <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-[#2bee5b] border-t-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center shadow-sm">
               <div className="w-3 h-3 bg-[#2bee5b] rounded-full animate-pulse"></div>
            </div>
          </div>
          <h2 className="text-xl font-bold text-[#111813] mb-2">Analyzing Audio</h2>
          <p className="text-gray-500 text-sm">Identifying species from your recording...</p>
        </div>
      );
    }

    // Priority 3: Show Results if data exists
    if (analysisResult) {
      return (
        <ResultsScreen 
          data={analysisResult} 
          onBack={() => {
            setAnalysisResult(null);
            setIsAnalyzing(false);
          }}
          onSave={handleSave}
        />
      );
    }

    // Priority 3: Main Tabs
    if (currentTab === 'home') {
      return <HomeScreen onRecordStart={() => setShowRecording(true)} />;
    }

    return (
      <div className="flex items-center justify-center h-screen bg-[#f6f8f6] text-gray-400">
        Work in progress: {currentTab}
      </div>
    );
  };

  return (
    <div className="h-screen w-full relative bg-[#f6f8f6]">
      {renderContent()}
      
      {/* Conditional Recording Overlay */}
      {showRecording && !isAnalyzing && (
        <RecordingScreen 
          onClose={() => setShowRecording(false)} 
          onFinish={handleRecordingFinish} 
        />
      )}

      {/* Navigation (Only show if not in result or recording/analyzing flow) */}
      {!analysisResult && !isAnalyzing && !showRecording && !error && (
        <NavBar activeTab={currentTab} onTabChange={setCurrentTab} />
      )}
    </div>
  );
};

export default App;