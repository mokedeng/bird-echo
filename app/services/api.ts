import { ApiResponse, WikiImageResult } from '../types';

const API_BASE_URL = 'http://localhost:3001/api';

/**
 * Uploads audio blob to the analysis server
 */
export const analyzeAudio = async (audioBlob: Blob): Promise<ApiResponse> => {
  const formData = new FormData();
  const fileExtension = audioBlob.type.includes('wav') ? 'wav' : 'webm';
  formData.append('audio', audioBlob, `recording.${fileExtension}`);

  try {
    const response = await fetch(`${API_BASE_URL}/analyze`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[API] Error response:', errorData);
      throw new Error(errorData.detail || errorData.error || `HTTP ${response.status}`);
    }

    const data: ApiResponse = await response.json();
    return data;
  } catch (error) {
    console.error('[API] Request failed:', error);
    throw error;
  }
};

/**
 * Fetches a bird image from Wikipedia
 */
export const fetchBirdImage = async (scientificName: string): Promise<string | null> => {
  try {
    const encodedTitle = encodeURIComponent(scientificName);
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodedTitle}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.warn('[Image] Wikipedia API response not OK:', response.status);
      return null;
    }

    const data = await response.json();

    if (data.thumbnail) {
      return data.thumbnail.source;
    }

    return null;
  } catch (error) {
    console.error('[Image] Failed to fetch Wiki image:', error);
    return null;
  }
};