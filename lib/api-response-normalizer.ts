/**
 * Helper to normalize API responses from both old and new shapes
 * 
 * Old shape: { data: ... } OR direct object
 * New shape: { ok: boolean, data: any, banner?: {...}, diagnostics?: {...} }
 * 
 * Returns consistent shape: { ok: boolean, data: any, banner?: {...}, diagnostics?: {...} }
 */

export type NormalizedApiResponse<T = any> = {
  ok: boolean;
  data: T | null;
  banner?: {
    severity: "warning" | "error" | "info";
    title?: string;
    message: string;
  };
  diagnostics?: {
    docCount: number;
    rawCharsTotal: number;
    jsonCharsTotal: number;
    avgRawCharsPerDoc: number;
    suspectedScanned: boolean;
    reasonCodes: string[];
  };
};

/**
 * Normalize an API response to consistent shape
 * Handles both old and new response formats
 */
export function normalizeApiResponse<T = any>(
  response: any,
): NormalizedApiResponse<T> {
  // New shape: { ok: false, data: null, banner, diagnostics }
  if (typeof response === "object" && response !== null) {
    if ("ok" in response) {
      return {
        ok: response.ok,
        data: response.ok ? (response.data ?? response) : null,
        banner: response.banner,
        diagnostics: response.diagnostics,
      };
    }

    // Old shape: { data: ... } - wrap it
    if ("data" in response) {
      return {
        ok: true,
        data: response.data,
        banner: response.banner,
        diagnostics: response.diagnostics,
      };
    }

    // Old shape: direct object (e.g., { strategies: [...], ... })
    // Check if it looks like a gated response (has banner but no ok field)
    if ("banner" in response && !("ok" in response)) {
      return {
        ok: false,
        data: null,
        banner: response.banner,
        diagnostics: response.diagnostics,
      };
    }

    // Old shape: direct object with data - assume ok: true
    return {
      ok: true,
      data: response,
      banner: response.banner,
      diagnostics: response.diagnostics,
    };
  }

  // Fallback: assume ok if we got something
  return {
    ok: true,
    data: response,
  };
}

/**
 * Check if a normalized response is gated (cannot generate analysis)
 */
export function isGated(response: NormalizedApiResponse): boolean {
  return !response.ok || !!response.banner;
}
