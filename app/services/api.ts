import { ApiResponse } from '../types';

/**
 * API 基础路径
 * 开发环境：从 .env 读取
 * 生产环境：从系统环境变量读取
 * 默认回退到 /api（同源访问）
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * 处理返回的 URL，确保相对路径被正确转换为绝对路径
 */
const normalizeUrl = (url: string): string => {
  if (url.startsWith('http')) return url;
  // 移除末尾的 /api 并拼接
  const base = API_BASE_URL.endsWith('/api') 
    ? API_BASE_URL.substring(0, API_BASE_URL.length - 4) 
    : API_BASE_URL;
  return `${base}${url}`;
};

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
      mode: 'cors', // 显式跨域
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
 * Fetches a bird image via backend proxy
 */
export const fetchBirdImage = async (scientificName: string): Promise<string | null> => {
  try {
    const encodedName = encodeURIComponent(scientificName);
    const response = await fetch(`${API_BASE_URL}/bird-image?scientific_name=${encodedName}`, {
      mode: 'cors'
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.imageUrl) {
        // 关键修复：拼接绝对路径
        return normalizeUrl(data.imageUrl);
      }
    }
  } catch (error) {
    console.warn(`[Image] Backend proxy failed for ${scientificName}:`, error);
  }
  
  return null;
};
