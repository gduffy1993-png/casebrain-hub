/** Summary-only line hygiene — keeps chase / PTPH / REQ codes out of sections 1–3. */

export function stripReqAndInternalCodes(text: string): string {
  return text
    .replace(/\bREQ-[A-Z0-9-]+\b/gi, "")
    .replace(/\bMG6C\/\d+\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function isSummaryLeakageLine(line: string): boolean {
  const t = line.trim();
  if (!t) return true;
  if (/^ask the court to record/i.test(t)) return true;
  if (/ask court to record/i.test(t)) return true;
  if (/appears outstanding|remains outstanding on the current papers/i.test(t)) return true;
  if (/^chase[:\s]/i.test(t)) return true;
  if (/chase or confirm status|papers mark this material as unclear/i.test(t)) return true;
  if (/^outstanding:\s/i.test(t)) return true;
  if (/^record position|^seek timetable|^avoid committing/i.test(t)) return true;
  if (/\bREQ-[A-Z0-9-]+\b/i.test(t)) return true;
  return false;
}

export function isOpportunityShapedLine(line: string): boolean {
  return /^opportunity to\b/i.test(line.trim());
}

export function isEvidenceAnchorLeakage(line: string): boolean {
  return /^evidence anchor:/i.test(line.trim()) || /\bthis extract is included for sequence\b/i.test(line);
}

export function isTheoryBoilerplateNoise(sentence: string): boolean {
  const t = sentence.trim();
  if (/^continuity and (full )?coverage are required before/i.test(t)) return true;
  if (/^continuity and reconciliation are required before/i.test(t)) return true;
  if (/cctv stills are limited to two dates/i.test(t)) return true;
  if (/^cctv served covers only two dates/i.test(t) && /charge window spans/i.test(t)) return false; // keep one CCTV contradiction sentence
  return false;
}

export function sanitizeSummaryLine(line: string): string | null {
  const cleaned = stripReqAndInternalCodes(line);
  if (!cleaned || cleaned.length < 12) return null;
  if (isSummaryLeakageLine(cleaned)) return null;
  if (isEvidenceAnchorLeakage(cleaned)) return null;
  return cleaned;
}

function normalizeForDedupe(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function similarityRatio(a: string, b: string): number {
  const wa = new Set(normalizeForDedupe(a).split(" ").filter((w) => w.length > 3));
  const wb = new Set(normalizeForDedupe(b).split(" ").filter((w) => w.length > 3));
  if (wa.size === 0 || wb.size === 0) return 0;
  let inter = 0;
  for (const w of wa) if (wb.has(w)) inter++;
  return inter / Math.max(wa.size, wb.size);
}

/** Drop near-duplicate summary lines (~90% token overlap). */
export function dedupeSimilarSummaryLines(lines: string[], max: number): string[] {
  const out: string[] = [];
  for (const raw of lines) {
    const line = sanitizeSummaryLine(raw);
    if (!line) continue;
    const dup = out.some((existing) => similarityRatio(existing, line) >= 0.9);
    if (dup) continue;
    out.push(line);
    if (out.length >= max) break;
  }
  return out;
}

export function dedupeTheorySentences(parts: (string | null | undefined)[]): string {
  const sentences: string[] = [];
  for (const part of parts) {
    if (!part?.trim()) continue;
    const chunks = part
      .split(/(?<=[.!?])\s+/)
      .map((s) => stripReqAndInternalCodes(s))
      .filter((s) => s.length > 8);
    for (const s of chunks) {
      if (isTheoryBoilerplateNoise(s)) continue;
      const dup = sentences.some((existing) => similarityRatio(existing, s) >= 0.72);
      if (dup) continue;
      sentences.push(s);
    }
  }
  return sentences.join(" ").trim();
}

export function firstSafeSentence(text: string): string {
  const sentence = text.split(/(?<=[.!?])\s+/)[0]?.trim() ?? text.trim();
  return stripReqAndInternalCodes(sentence);
}
