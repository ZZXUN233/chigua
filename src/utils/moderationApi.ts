import { useState, useEffect, useRef } from 'react';

export interface ModerationResult {
  flagged: boolean;
  categories: string[];
  suggestion: string | null;
  loading: boolean;
  error: boolean;
}

/**
 * Direct (non-debounced) call to the backend moderation endpoint.
 * Used for form submission where we want an immediate check.
 */
export async function checkContent(text: string): Promise<ModerationResult> {
  if (!text.trim()) {
    return { flagged: false, categories: [], suggestion: null, loading: false, error: false };
  }

  try {
    const res = await fetch('/chigua-api/moderate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-shared-secret': import.meta.env.VITE_SHARED_SECRET || '',
      },
      body: JSON.stringify({ text: text.trim() }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      console.warn('[Moderation] API returned', res.status);
      return { flagged: false, categories: [], suggestion: null, loading: false, error: true };
    }

    const data = await res.json();
    return {
      flagged: data.flagged ?? false,
      categories: Array.isArray(data.categories) ? data.categories : [],
      suggestion: data.suggestion ?? null,
      loading: false,
      error: false,
    };
  } catch (err) {
    console.warn('[Moderation] Request failed:', err);
    // Fail open — if the API is unreachable, allow posting
    return { flagged: false, categories: [], suggestion: null, loading: false, error: true };
  }
}

/**
 * Debounced React hook for real-time content moderation preview.
 * Returns loading=true while waiting for the debounced API response.
 */
export function useModeration(text: string, debounceMs: number = 600): ModerationResult {
  const [result, setResult] = useState<ModerationResult>({
    flagged: false,
    categories: [],
    suggestion: null,
    loading: false,
    error: false,
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!text.trim()) {
      setResult({ flagged: false, categories: [], suggestion: null, loading: false, error: false });
      return;
    }

    // Set loading state immediately
    setResult(prev => ({ ...prev, loading: true, error: false }));

    // Debounce
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const res = await checkContent(text);
      setResult(res);
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [text, debounceMs]);

  return result;
}
