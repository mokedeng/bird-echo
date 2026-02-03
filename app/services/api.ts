import { ApiResponse, WikiImageResult } from '../types';

const API_BASE_URL = 'http://localhost:3001/api';

/**
 * Uploads audio blob to the analysis server
 */
export const analyzeAudio = async (audioBlob: Blob): Promise<ApiResponse> => {
  const formData = new FormData();
  // Use correct file extension based on blob type
  const fileExtension = audioBlob.type.includes('wav') ? 'wav' : 'webm';
  formData.append('audio', audioBlob, `recording.${fileExtension}`);

  // Debug: log audio blob details
  console.log('[API] Audio blob size:', audioBlob.size, 'bytes');
  console.log('[API] Audio blob type:', audioBlob.type);
  console.log('[API] Using file extension:', fileExtension);

  try {
    console.log('[API] Sending request to:', `${API_BASE_URL}/analyze`);
    const response = await fetch(`${API_BASE_URL}/analyze`, {
      method: 'POST',
      body: formData,
    });

    console.log('[API] Response status:', response.status);

    // Handle HTTP errors from FastAPI
    if (!response.ok) {
      const errorData = await response.json();
      console.error('[API] Error response:', errorData);
      // FastAPI HTTPException returns { detail: "error message" }
      throw new Error(errorData.detail || errorData.error || `HTTP ${response.status}`);
    }

    const data: ApiResponse = await response.json();
    console.log('[API] Success response:', data);
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
    console.log('[Image] Fetching image for:', scientificName);

    // Use Wikipedia REST API for page summary with thumbnail
    const encodedTitle = encodeURIComponent(scientificName);
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodedTitle}`;

    console.log('[Image] Fetching URL:', url);

    const response = await fetch(url);

    if (!response.ok) {
      console.warn('[Image] Wikipedia API response not OK:', response.status);
      return null;
    }

    const data = await response.json();
    console.log('[Image] Wikipedia response:', data);

    if (data.thumbnail) {
      const imageUrl = data.thumbnail.source;
      console.log('[Image] Found image URL:', imageUrl);
      return imageUrl;
    }

    console.warn('[Image] No thumbnail in response');
    return null;
  } catch (error) {
    console.error('[Image] Failed to fetch Wiki image:', error);
    return null;
  }
};