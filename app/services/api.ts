import { ApiResponse, WikiImageResult } from '../types';

const API_BASE_URL = 'http://localhost:3001/api';

/**
 * Uploads audio blob to the analysis server
 */
export const analyzeAudio = async (audioBlob: Blob): Promise<ApiResponse> => {
  const formData = new FormData();
  // Ensure the file has a name ending in .wav
  formData.append('audio', audioBlob, 'recording.wav');

  try {
    const response = await fetch(`${API_BASE_URL}/analyze`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }

    const data: ApiResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Analysis failed:', error);
    throw error;
  }
};

/**
 * Fetches a bird image from Wikipedia
 */
export const fetchBirdImage = async (scientificName: string): Promise<string | null> => {
  try {
    // Wikipedia API requires encoded titles
    const encodedTitle = encodeURIComponent(scientificName);
    const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodedTitle}&prop=pageimages&format=json&pithumbsize=600&origin=*`;

    const response = await fetch(url);
    const data = await response.json();

    const pages = data.query?.pages;
    if (!pages) return null;

    const pageId = Object.keys(pages)[0];
    if (pageId === '-1') return null; // Not found

    const page = pages[pageId];
    if (page.thumbnail) {
      return (page.thumbnail as WikiImageResult).source;
    }

    return null;
  } catch (error) {
    console.warn('Failed to fetch Wiki image:', error);
    return null;
  }
};