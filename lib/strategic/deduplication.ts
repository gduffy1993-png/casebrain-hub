/**
 * Deduplication helpers for strategic intelligence outputs
 */

/**
 * Deduplicate string array by normalizing (trim, lower, collapse whitespace)
 */
export function dedupeStrings(arr: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  
  for (const item of arr) {
    const normalized = (item ?? "").trim().toLowerCase().replace(/\s+/g, " ");
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      result.push(item);
    }
  }
  
  return result;
}

/**
 * Deduplicate items by a stable key function
 */
export function dedupeByKey<T>(
  items: T[],
  keyFn: (item: T) => string
): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  
  for (const item of items) {
    const key = keyFn(item);
    const normalized = (key ?? "").trim().toLowerCase().replace(/\s+/g, " ");
    if (!seen.has(normalized)) {
      seen.add(normalized);
      result.push(item);
    }
  }
  
  return result;
}

/**
 * Deduplicate missing evidence items by label
 */
export function dedupeMissingEvidence<T extends { label?: string; id?: string }>(
  items: T[]
): T[] {
  return dedupeByKey(items, (item) => {
    // Use label as primary key, fallback to id
    return item.label ?? item.id ?? "";
  });
}

/**
 * Deduplicate procedural integrity checklist items
 */
export function dedupeProceduralIntegrity<T extends { item?: string }>(
  items: T[]
): T[] {
  return dedupeByKey(items, (item) => {
    return item.item ?? "";
  });
}

