/**
 * Safe fetch helper for consistent error handling across panels
 *
 * Handles:
 * - Non-200 responses
 * - JSON parse errors
 * - Network errors
 *
 * For internal /api/ calls, defaults to cache: "no-store" and credentials: "include"
 * so strategy and documents endpoints are never cached client-side (callers can override).
 *
 * Returns normalized shape: { ok, status, data, error }
 * DEV-only console logging when fallback is used
 */

type SafeFetchResult<T = any> = {
  ok: boolean;
  status: number | null;
  data: T | null;
  error: string | null;
};

function isInternalApiUrl(url: string): boolean {
  if (typeof url !== "string") return false;
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return url.startsWith("/api/") || (base && url.startsWith(`${base}/api/`));
}

export async function safeFetch<T = any>(
  url: string,
  options?: RequestInit
): Promise<SafeFetchResult<T>> {
  try {
    const isInternalApi = isInternalApiUrl(url);
    const merged: RequestInit = {
      ...options,
      ...(isInternalApi
        ? {
            cache: options?.cache ?? "no-store",
            credentials: options?.credentials ?? "include",
          }
        : {}),
    };

    const response = await fetch(url, merged);
    const status = response.status;
    
    if (!response.ok) {
      // Try to parse error message from response
      let errorMessage = `HTTP ${status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData?.error || errorData?.message || errorMessage;
      } catch {
        // If JSON parse fails, use status text
        errorMessage = response.statusText || errorMessage;
      }
      
      if (process.env.NODE_ENV !== "production") {
        console.error(`[safeFetch] Non-200 response: ${url} → ${status}`, errorMessage);
      }
      
      return {
        ok: false,
        status,
        data: null,
        error: errorMessage,
      };
    }
    
    // Parse JSON response
    try {
      const data = await response.json();
      return {
        ok: true,
        status,
        data,
        error: null,
      };
    } catch (parseError) {
      const errorMessage = parseError instanceof Error ? parseError.message : "JSON parse error";
      
      if (process.env.NODE_ENV !== "production") {
        console.error(`[safeFetch] JSON parse error: ${url} → ${status}`, errorMessage);
      }
      
      return {
        ok: false,
        status,
        data: null,
        error: `Failed to parse response: ${errorMessage}`,
      };
    }
  } catch (networkError) {
    const errorMessage = networkError instanceof Error ? networkError.message : "Network error";
    
    if (process.env.NODE_ENV !== "production") {
      console.error(`[safeFetch] Network error: ${url}`, errorMessage);
    }
    
    return {
      ok: false,
      status: null,
      data: null,
      error: errorMessage,
    };
  }
}

