import React, { useState } from 'react';
import { HomeScreen } from './screens/HomeScreen';
import { RecordingScreen } from './screens/RecordingScreen';
import { ResultsScreen } from './screens/ResultsScreen';
import { NavBar } from './components/NavBar';
import { analyzeAudio } from './services/api';
import { AnalysisData } from './types';

// Mock data from the prompt for fallback
const MOCK_DATA: AnalysisData = {
  fileName: "cuckoo.wav",
  analysisTime: 14.35,
  detections: [
    {
      startTime: "0:00",
      endTime: "0:03",
      scientificName: "Cuculus canorus",
      commonName: "Common Cuckoo",
      confidence: 0.997,
      label: ""
    },
    {
      startTime: "0:03",
      endTime: "0:06",
      scientificName: "Cuculus canorus",
      commonName: "Common Cuckoo",
      confidence: 0.9895,
      label: ""
    },
    {
      startTime: "0:06",
      endTime: "0:09",
      scientificName: "Cuculus canorus",
      commonName: "Common Cuckoo",
      confidence: 0.9944,
      label: ""
    },
    {
      startTime: "0:09",
      endTime: "0:12",
      scientificName: "Cuculus canorus",
      commonName: "Common Cuckoo",
      confidence: 0.9869,
      label: ""
    },
    {
      startTime: "0:12",
      endTime: "0:14",
      scientificName: "Cuculus canorus",
      commonName: "Common Cuckoo",
      confidence: 0.9988,
      label: ""
    }
  ],
  summary: {
    totalDetections: 5,
    speciesCount: 1,
    audioDuration: "0:14"
  }
};

const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState('home');
  const [showRecording, setShowRecording] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Handle saving the bird
  const handleSave = () => {
    setAnalysisResult(null);
    setShowRecording(false);
  };

  // Handle recording finish
  const handleRecordingFinish = async (audioBlob: Blob) => {
    setIsAnalyzing(true);
    setShowRecording(false);

    try {
      // Attempt to call the real API
      const response = await analyzeAudio(audioBlob);
      if (response.success) {
        setAnalysisResult(response.data);
      } else {
        throw new Error(response.error || "Unknown error");
      }
    } catch (error) {
      console.warn("API Connection failed, using Mock Data for preview:", error);
      // FALLBACK: If API fails (e.g. no local backend), use mock data to show the UI
      // Simulate network delay
      setTimeout(() => {
        setAnalysisResult(MOCK_DATA);
        setIsAnalyzing(false);
      }, 1500);
      return; // Return early so we don't double set isAnalyzing
    }
    
    setIsAnalyzing(false);
  };

  // Main Render Logic
  const renderContent = () => {
    // Priority 1: Show Loading
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

    // Priority 2: Show Results if data exists
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
      {!analysisResult && !isAnalyzing && !showRecording && (
        <NavBar activeTab={currentTab} onTabChange={setCurrentTab} />
      )}
    </div>
  );
};

export default App;