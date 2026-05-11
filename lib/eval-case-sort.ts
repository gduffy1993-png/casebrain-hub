/**
 * Stable sweep order: "Case 1", "Case 2", … then alphabetical, then UUID.
 */

export function sortCasesForEvalScan<T extends { id: string; title?: string | null }>(cases: T[]): T[] {
  return [...cases].sort((a, b) => {
    const ta = (a.title ?? "").trim();
    const tb = (b.title ?? "").trim();
    const ma = /^case\s*(\d+)/i.exec(ta);
    const mb = /^case\s*(\d+)/i.exec(tb);
    if (ma?.[1] && mb?.[1]) return Number(ma[1]) - Number(mb[1]);
    if (ma?.[1]) return -1;
    if (mb?.[1]) return 1;
    const c = ta.localeCompare(tb, undefined, { sensitivity: "base", numeric: true });
    return c !== 0 ? c : a.id.localeCompare(b.id);
  });
}
