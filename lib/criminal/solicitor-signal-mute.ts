/**
 * Solicitor-signal mute — drop low-value clutter that crowds Overview/Chase
 * when real disclosure gaps already exist. Presentation-only; no invent gate.
 */

export function isGenericSolicitorClutterLabel(label: string): boolean {
  const t = (label || "").replace(/\s+/g, " ").trim();
  if (!t) return false;
  return (
    /^exhibit mapping\s*\/\s*provenance$/i.test(t) ||
    /^digital disclosure schedule item$/i.test(t) ||
    /mg6c?\s*clarification|mg6\s*\/\s*unused|unused schedule clarification/i.test(t) ||
    /^(?:additional|other)\s+source[- ]material(?:\s+issues?)?(?:\s*\(\d+\s*on file\))?$/i.test(t) ||
    /^outstanding source material on disclosure schedule$/i.test(t)
  );
}

/**
 * Drop generic exhibit/MG6/schedule clutter when substantive chase rows exist.
 * If everything is clutter, keep one last-resort row so the board is not empty.
 */
export function demoteSolicitorClutter<T>(
  items: T[],
  getLabel: (item: T) => string,
): T[] {
  if (items.length <= 1) return items;
  const substantive = items.filter((i) => !isGenericSolicitorClutterLabel(getLabel(i)));
  if (substantive.length > 0) return substantive;
  return items.slice(0, 1);
}

/** Collapse duplicate attention titles (e.g. two digital schedule rows). */
export function dedupeSolicitorAttentionByTitle<T extends { title: string }>(items: T[]): T[] {
  const out: T[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const key = item.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}
