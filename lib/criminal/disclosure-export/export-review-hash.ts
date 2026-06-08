/** SHA-256 hex digest of export draft text — hash only, never store body. Browser-safe (Web Crypto). */

function normalizeExportHashInput(input: string): string {
  return String(input ?? "").replace(/\r\n/g, "\n").trim();
}

export async function buildExportReviewHash(input: string): Promise<string | null> {
  const normalized = normalizeExportHashInput(input);
  if (!normalized) return null;

  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return null;

  try {
    const data = new TextEncoder().encode(normalized);
    const digest = await subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return null;
  }
}

/** Alias kept for existing panel callers. */
export async function computeExportHash(text: string): Promise<string | null> {
  return buildExportReviewHash(text);
}
