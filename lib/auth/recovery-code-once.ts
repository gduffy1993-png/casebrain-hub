import { LRUCache } from "lru-cache";

/**
 * In-process guard against double-consuming the same auth `code`.
 * Does not store token/code plaintext beyond a short-lived hash key for reuse detection.
 * Serverless instances are isolated — this still catches refresh/back-button double hits
 * on the same instance.
 */
const consumed = new LRUCache<string, true>({
  max: 2000,
  ttl: 15 * 60_000,
});

function fingerprint(code: string): string {
  // Non-cryptographic fingerprint for reuse detection only — never log the raw code.
  let hash = 0;
  for (let i = 0; i < code.length; i += 1) {
    hash = (hash * 31 + code.charCodeAt(i)) | 0;
  }
  return `c:${code.length}:${hash}`;
}

export function wasRecoveryCodeConsumed(code: string): boolean {
  return consumed.has(fingerprint(code));
}

export function markRecoveryCodeConsumed(code: string): void {
  consumed.set(fingerprint(code), true);
}

/** Test-only reset. */
export function __resetConsumedRecoveryCodesForTests(): void {
  consumed.clear();
}
