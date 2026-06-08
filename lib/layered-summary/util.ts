export function stableHash(input: string): string {
  // FNV-1a 32-bit, hex output. Deterministic and TS-target-safe (no Node crypto).
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  // Convert to unsigned and hex
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function normalizeText(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

export function splitIntoSentences(text: string): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];
  return cleaned
    .split(/[.!?]\s+/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function uniq<T>(items: T[]): T[] {
  const out: T[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const key = typeof item === "string" ? item : JSON.stringify(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}


