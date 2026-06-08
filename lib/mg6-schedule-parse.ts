/**
 * MG6 disclosure schedule rows — pipe tables (Northshire-style) and flattened
 * "CategoryServed…Outstanding" lines common when PDF text drops table borders.
 */

export type Mg6ScheduleRow = {
  category: string;
  served: string;
  outstanding: string;
};

function compactCell(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function normalizeMg6PipeLine(line: string): Mg6ScheduleRow | null {
  const l = line.trim();
  if (!l || !l.includes("|")) return null;
  if (/^-{3,}/.test(l)) return null;
  const cols = l.split("|").map((c) => compactCell(c));
  if (cols.length < 3) return null;
  const category = cols[0]!;
  const served = cols[1]!;
  const outstanding = cols.slice(2).join(" | ");
  if (!category || /^(document|category)$/i.test(category)) return null;
  if (/served \(initial\)/i.test(served) || /awaiting\s*\/\s*retained\s*\/\s*note/i.test(outstanding)) return null;
  if (/^example .*tension/i.test(category)) return null;
  if (/^mg6\(a\)\s*[-—]/i.test(category)) return null;
  return { category, served, outstanding };
}

/** Flattened PDF row: `MG5 case summaryServed - final…None apparent` or `999 callNot referencedNone - …`. */
function normalizeMg6FlattenedLine(line: string): Mg6ScheduleRow | null {
  const l = line.trim();
  if (!l) return null;
  const compactHeader = l.replace(/\s+/g, "");
  if (/^category.*served.*outstanding.*note/i.test(compactHeader)) return null;
  if (/^fieldvalue$/i.test(l)) return null;

  const nr = l.match(/^(.+?)Not referenced\s*(.+)$/i);
  if (nr?.[1] && nr[2] != null) {
    const category = compactCell(nr[1]!);
    if (!category || /^category$/i.test(category)) return null;
    return { category, served: "Not referenced", outstanding: compactCell(nr[2]!) };
  }

  const sv = l.match(/^(.+?)Served\s*(.+)$/i);
  if (!sv?.[1] || sv[2] == null) return null;
  const category = compactCell(sv[1]!);
  if (!category || /^category$/i.test(category)) return null;
  const rest = sv[2]!.trim();

  const split =
    rest.match(/^(.*?)(\bNone apparent\b[\s\S]*)$/i) ||
    rest.match(/^(.*?)(\bNone\s*-\s*[\s\S]+)$/i) ||
    rest.match(/^(.*?)(\bContinuity\b[\s\S]*)$/i) ||
    rest.match(/^(.*?)(\bNot referenced\b[\s\S]*)$/i);

  if (split?.[1] != null && split[2] != null) {
    return { category, served: compactCell(split[1]!), outstanding: compactCell(split[2]!) };
  }
  return { category, served: compactCell(rest), outstanding: "" };
}

/**
 * @param scope — text inside MG6 section, or wider bundle fallback
 * @param scopeIsMg6Section — when true and pipe parse is empty, run flattened-row heuristics (PDF-safe)
 */
export function extractMg6ScheduleRowsFromScope(scope: string, scopeIsMg6Section: boolean): Mg6ScheduleRow[] {
  const rows: Mg6ScheduleRow[] = [];
  const seen = new Set<string>();

  const push = (r: Mg6ScheduleRow) => {
    if (!r.category || (!r.served.trim() && !r.outstanding.trim())) return;
    const dedupeKey = `${r.category.toLowerCase()}|${r.served.toLowerCase()}|${r.outstanding.toLowerCase()}`;
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    rows.push(r);
  };

  for (const raw of scope.split(/\r?\n/)) {
    const pipe = normalizeMg6PipeLine(raw);
    if (pipe) push(pipe);
  }

  if (rows.length === 0 && scopeIsMg6Section) {
    for (const raw of scope.split(/\r?\n/)) {
      const flat = normalizeMg6FlattenedLine(raw);
      if (flat) push(flat);
    }
  }

  return rows;
}
