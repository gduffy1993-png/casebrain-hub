/** Deterministic PRNG (mulberry32) — same seed always yields same sequence. */
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickOne<T>(rng: () => number, items: readonly T[]): T {
  if (!items.length) throw new Error("pickOne: empty items");
  return items[Math.floor(rng() * items.length)]!;
}

export function pickMany<T>(rng: () => number, items: readonly T[], count: number): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export function pickInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

export function hashSeed(base: number, salt: string): number {
  let h = base >>> 0;
  for (let i = 0; i < salt.length; i++) {
    h = Math.imul(31, h) + salt.charCodeAt(i);
    h >>>= 0;
  }
  return h >>> 0;
}
