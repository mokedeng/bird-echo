export interface BirdDetection {
  startTime: string;
  endTime: string;
  scientificName: string;
  commonName: string;
  confidence: number;
  label: string;
}

export interface AnalysisSummary {
  totalDetections: number;
  speciesCount: number;
  audioDuration: string;
}

export interface AnalysisData {
  fileName: string;
  analysisTime: number;
  detections: BirdDetection[];
  summary: AnalysisSummary;
}

export interface ApiResponse {
  success: boolean;
  data: AnalysisData;
  error: string | null;
}

export interface WikiImageResult {
  source: string;
  width: number;
  height: number;
}