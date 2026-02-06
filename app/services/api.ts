import { ApiResponse, WikiImageResult } from '../types';

// 使用相对路径，通过 Vite 代理访问后端
// 开发环境：Vite 会代理 /api 到 http://localhost:3001/api
// 生产环境：需要配置为实际的后端地址
const API_BASE_URL = '/api';

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
 * Fetches a bird image via backend proxy (all images go through backend)
 * 
 * 所有图片都通过后端代理获取（后端下载并缓存到本地文件）
 * 这样浏览器不直接访问 Wikimedia，避免 429 限流
 */
export const fetchBirdImage = async (scientificName: string): Promise<string | null> => {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/f9fe636e-a5b7-4f8a-8941-1d576d30a296',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.ts:42',message:'fetchBirdImage entry',data:{scientificName},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C'})}).catch(()=>{});
  // #endregion
  try {
    const encodedName = encodeURIComponent(scientificName);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f9fe636e-a5b7-4f8a-8941-1d576d30a296',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.ts:45',message:'encoded scientific name',data:{original:scientificName,encoded:encodedName},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    const response = await fetch(`${API_BASE_URL}/bird-image?scientific_name=${encodedName}`);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f9fe636e-a5b7-4f8a-8941-1d576d30a296',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.ts:46',message:'fetch response received',data:{ok:response.ok,status:response.status,statusText:response.statusText},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B'})}).catch(()=>{});
    // #endregion
    
    if (response.ok) {
      const data = await response.json();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f9fe636e-a5b7-4f8a-8941-1d576d30a296',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.ts:49',message:'response data parsed',data:{success:data.success,hasImageUrl:!!data.imageUrl,imageUrl:data.imageUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B'})}).catch(()=>{});
      // #endregion
      if (data.success && data.imageUrl) {
        console.log(`[Image] Found via backend proxy: ${scientificName}`);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/f9fe636e-a5b7-4f8a-8941-1d576d30a296',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.ts:51',message:'returning imageUrl',data:{imageUrl:data.imageUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        // 返回 /api/bird-image-file/xxx（本地缓存文件）或原始 URL
        return data.imageUrl;
      }
    }
  } catch (error) {
    console.warn(`[Image] Backend proxy failed for ${scientificName}:`, error);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f9fe636e-a5b7-4f8a-8941-1d576d30a296',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.ts:56',message:'fetchBirdImage error',data:{error:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B'})}).catch(()=>{});
    // #endregion
  }
  
  // 失败时返回 null，前端已有鸟类剪影占位图
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/f9fe636e-a5b7-4f8a-8941-1d576d30a296',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.ts:60',message:'returning null (failure)',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B'})}).catch(()=>{});
  // #endregion
  return null;
};