/**
 * Surface load contract — Hearing War Room / Disclosure Chase must resolve to
 * useful content or an explicit actionable error; never indefinite loading.
 */

export type SurfaceLoadPhase = "idle" | "loading" | "ready" | "error";

export type SurfaceLoadState<T> = {
  phase: SurfaceLoadPhase;
  data: T | null;
  error: string | null;
  /** ISO timestamp when loading began (for timeout diagnostics). */
  startedAt: string | null;
};

export const SURFACE_LOAD_DEFAULT_TIMEOUT_MS = 25_000;

export function initialSurfaceLoadState<T>(): SurfaceLoadState<T> {
  return { phase: "idle", data: null, error: null, startedAt: null };
}

export function beginSurfaceLoad<T>(prev?: SurfaceLoadState<T> | null): SurfaceLoadState<T> {
  return {
    phase: "loading",
    data: prev?.data ?? null,
    error: null,
    startedAt: new Date().toISOString(),
  };
}

export function resolveSurfaceLoadSuccess<T>(data: T): SurfaceLoadState<T> {
  return { phase: "ready", data, error: null, startedAt: null };
}

export function resolveSurfaceLoadError<T>(
  error: string,
  prev?: SurfaceLoadState<T> | null,
): SurfaceLoadState<T> {
  return {
    phase: "error",
    data: prev?.data ?? null,
    error: error.trim() || "Failed to load — retry or check the case documents.",
    startedAt: null,
  };
}

/**
 * Fetch JSON with an AbortSignal timeout. On failure returns an actionable error string.
 */
export async function fetchJsonWithSurfaceContract<T>(
  url: string,
  options?: {
    timeoutMs?: number;
    credentials?: RequestCredentials;
    cache?: RequestCache;
    mapOk?: (json: unknown) => T | null;
    emptyError?: string;
    networkError?: string;
  },
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const timeoutMs = options?.timeoutMs ?? SURFACE_LOAD_DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      credentials: options?.credentials ?? "include",
      cache: options?.cache ?? "no-store",
      signal: controller.signal,
    });
    let json: unknown = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }
    if (!res.ok) {
      const msg =
        (json && typeof json === "object" && "error" in json && typeof (json as any).error === "string"
          ? (json as any).error
          : null) ||
        `Request failed (${res.status}). Refresh or re-open the case.`;
      return { ok: false, error: msg };
    }
    const mapped = options?.mapOk ? options.mapOk(json) : ((json as T) ?? null);
    if (mapped == null) {
      return {
        ok: false,
        error:
          options?.emptyError ??
          "No usable response for this surface. Check documents are uploaded and analysis can run.",
      };
    }
    return { ok: true, data: mapped };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return {
      ok: false,
      error: aborted
        ? `Timed out after ${Math.round(timeoutMs / 1000)}s — check network or retry. The surface will not stay loading.`
        : options?.networkError ??
          (err instanceof Error ? err.message : "Network error — retry loading this surface."),
    };
  } finally {
    clearTimeout(timer);
  }
}

/** UI helper: only show spinner while phase === loading. */
export function isSurfaceLoading(state: SurfaceLoadState<unknown>): boolean {
  return state.phase === "loading";
}

export function surfaceLoadErrorMessage(state: SurfaceLoadState<unknown>): string | null {
  return state.phase === "error" ? state.error : null;
}
