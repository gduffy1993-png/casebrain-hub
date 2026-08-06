/**
 * Collect string values from a JSON-like payload for integrity gating (depth-limited).
 * Does not log values — callers pass the array into gateSolicitorOutput only.
 */
export function collectWordingStrings(value: unknown, max = 40, depth = 0): string[] {
  const out: string[] = [];
  const walk = (v: unknown, d: number) => {
    if (out.length >= max || d > 5) return;
    if (typeof v === "string") {
      const t = v.trim();
      if (t.length >= 8 && t.length <= 8000) out.push(t);
      return;
    }
    if (Array.isArray(v)) {
      for (const x of v.slice(0, 30)) walk(x, d + 1);
      return;
    }
    if (v && typeof v === "object") {
      for (const x of Object.values(v as Record<string, unknown>).slice(0, 40)) walk(x, d + 1);
    }
  };
  walk(value, depth);
  return out;
}
