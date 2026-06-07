import { createHash } from "node:crypto";

/** SHA-256 hex digest of export draft text — hash only, never store body. */
export function computeExportHashSync(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export async function computeExportHash(text: string): Promise<string | null> {
  if (!text) return null;
  if (typeof window !== "undefined" && window.crypto?.subtle) {
    try {
      const enc = new TextEncoder().encode(text);
      const digest = await window.crypto.subtle.digest("SHA-256", enc);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    } catch {
      /* fall through */
    }
  }
  if (typeof process !== "undefined") {
    return computeExportHashSync(text);
  }
  return null;
}
