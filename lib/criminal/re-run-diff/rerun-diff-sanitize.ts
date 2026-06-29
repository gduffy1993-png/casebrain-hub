const FORBIDDEN_RE =
  /\b(C:\\|\/Users\/|\/home\/|artifacts\/|\.env|api[_-]?key|sk-[a-z0-9]{8,})\b/i;

export function sanitizeRerunDiffLine(text: string): string | null {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed || trimmed.length > 280) return null;
  if (FORBIDDEN_RE.test(trimmed)) return null;
  return trimmed;
}

export function labelKey(label: string): string {
  return label.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 72);
}

export function dedupeLines(lines: string[], cap = 12): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const s = sanitizeRerunDiffLine(line);
    if (!s) continue;
    const key = s.toLowerCase().slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= cap) break;
  }
  return out;
}
