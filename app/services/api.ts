import { ApiResponse } from '../types';

/**
 * API 基础路径
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * 处理返回的 URL
 */
const normalizeUrl = (url: string): string => {
  if (url.startsWith('http')) return url;
  const base = API_BASE_URL.endsWith('/api') 
    ? API_BASE_URL.substring(0, API_BASE_URL.length - 4) 
    : API_BASE_URL;
  return `${base}${url}`;
};

/**
 * 带超时的 fetch
 */
const fetchWithTimeout = async (resource: string, options: any = {}, timeout = 60000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

/**
 * Uploads audio blob to the analysis server
 */
export const analyzeAudio = async (audioBlob: Blob): Promise<ApiResponse> => {
  const formData = new FormData();
  const fileExtension = audioBlob.type.includes('wav') ? 'wav' : 'webm';
  formData.append('audio', audioBlob, `recording.${fileExtension}`);

  try {
    // 增加 60 秒超时，以适配 Hugging Face 的慢速推理
    const response = await fetchWithTimeout(`${API_BASE_URL}/analyze`, {
      method: 'POST',
      mode: 'cors',
      body: formData,
    }, 60000);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || errorData.error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('分析请求超时（60秒），服务器可能正在全力处理，请稍后在首页查看结果。');
    }
    throw error;
  }
};

/**
 * Fetches a bird image via backend proxy
 */
export const fetchBirdImage = async (scientificName: string): Promise<string | null> => {
  try {
    const encodedName = encodeURIComponent(scientificName);
    const response = await fetchWithTimeout(`${API_BASE_URL}/bird-image?scientific_name=${encodedName}`, {
      mode: 'cors'
    }, 15000);
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.imageUrl) {
        return normalizeUrl(data.imageUrl);
      }
    }
  } catch (error) {
    console.warn(`[Image] Backend proxy failed for ${scientificName}:`, error);
  }
  return null;
};