export interface WatermelonDetectionResult {
  hasWatermelon: boolean;
  confidence: 'high' | 'medium' | 'low' | 'unknown';
  description: string;
}

/**
 * Send a base64-encoded camera snapshot to DeepSeek Vision API
 * via the backend to check whether a watermelon is present in the frame.
 *
 * Fail-open: any network or API error returns hasWatermelon=true
 * so the user is never blocked from taking a photo.
 */
export async function detectWatermelon(imageBase64: string): Promise<WatermelonDetectionResult> {
  if (!imageBase64) {
    return { hasWatermelon: true, confidence: 'unknown', description: '' };
  }

  try {
    const res = await fetch('/chigua-api/detect-watermelon', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-shared-secret': import.meta.env.VITE_SHARED_SECRET || '',
      },
      body: JSON.stringify({ imageBase64 }),
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      console.warn('[Detection] API returned', res.status);
      return { hasWatermelon: true, confidence: 'unknown', description: 'API 异常' };
    }

    const data = await res.json();
    return {
      hasWatermelon: data.hasWatermelon ?? true,
      confidence: data.confidence ?? 'unknown',
      description: data.description ?? '',
    };
  } catch (err) {
    console.warn('[Detection] Request failed:', err);
    return { hasWatermelon: true, confidence: 'unknown', description: '网络异常' };
  }
}
