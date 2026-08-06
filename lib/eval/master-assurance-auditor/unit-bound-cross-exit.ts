/**
 * Unit-bound cross-exit checks.
 *
 * Honest multi-unit wording such as "extract served, full record missing" is
 * NOT a contradiction. Each served/missing assertion must bind to its own unit.
 */

export type UnitBoundItem = {
  label: string;
  state: string;
};

export type UnitBoundHit = {
  code: "served_state_contradicted" | "missing_state_contradicted";
  subject: string;
  detail: string;
  excerpt: string;
};

const UNIT_SERVED_RE =
  /\b([A-Za-z][A-Za-z0-9/.\-]*(?:\s+[A-Za-z0-9/.\-]+){0,6}?)\s+(?:has been served|is served|already served|now served|is on file)\b/gi;
const UNIT_MISSING_RE =
  /\b([A-Za-z][A-Za-z0-9/.\-]*(?:\s+[A-Za-z0-9/.\-]+){0,6}?)\s+(?:is missing|remains outstanding|is outstanding|not served|has not been served|is absent)\b/gi;

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function labelMatchesSubject(itemLabel: string, subject: string): boolean {
  const a = norm(itemLabel);
  const b = norm(subject);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) {
    // Reject extract↔full / draft↔signed style siblings even if nested strings.
    if (/\bextract\b/.test(a) !== /\bextract\b/.test(b) && (/\bfull\b/.test(a) || /\bfull\b/.test(b))) {
      return false;
    }
    if (/\bdraft\b/.test(a) !== /\bdraft\b/.test(b)) return false;
    return true;
  }
  return false;
}

function collectSubjects(text: string, re: RegExp): string[] {
  const out: string[] = [];
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const sub = (m[1] ?? "").trim();
    if (sub.length >= 3) out.push(sub);
  }
  return out;
}

/**
 * Scan text for unit-bound served/missing contradictions against canonical items.
 */
export function scanUnitBoundCrossExit(
  text: string,
  items: UnitBoundItem[],
): UnitBoundHit[] {
  if (!text?.trim()) return [];
  const hits: UnitBoundHit[] = [];
  const servedSubjects = collectSubjects(text, UNIT_SERVED_RE);
  const missingSubjects = collectSubjects(text, UNIT_MISSING_RE);

  for (const item of items) {
    const state = item.state.toLowerCase();

    if (state === "missing" || state === "incomplete") {
      for (const sub of servedSubjects) {
        if (!labelMatchesSubject(item.label, sub)) continue;
        hits.push({
          code: "served_state_contradicted",
          subject: item.label,
          detail: `Unit-bound: "${sub}" asserted served but canonical "${item.label}" is ${state}`,
          excerpt: text.slice(0, 200),
        });
      }
    }

    if (state === "served") {
      for (const sub of missingSubjects) {
        if (!labelMatchesSubject(item.label, sub)) continue;
        hits.push({
          code: "missing_state_contradicted",
          subject: item.label,
          detail: `Unit-bound: "${sub}" asserted missing but canonical "${item.label}" is served`,
          excerpt: text.slice(0, 200),
        });
      }
    }
  }

  return hits;
}

/** True when text is the honest sibling pattern (served extract + missing full). */
export function isHonestSiblingServedMissingWording(text: string): boolean {
  return (
    (/\bextract\b[^.]{0,80}\bserved\b/i.test(text) &&
      /\bfull\b[^.]{0,80}\b(?:missing|outstanding|not served)\b/i.test(text)) ||
    (/\bserved\b[^.]{0,100}\bextract\b/i.test(text) &&
      /\b(?:full|complete)\b[^.]{0,80}\b(?:missing|outstanding)\b/i.test(text)) ||
    (/\bdraft\b[^.]{0,80}\bserved\b/i.test(text) &&
      /\b(?:final|signed)\b[^.]{0,80}\b(?:missing|outstanding)\b/i.test(text)) ||
    (/\b(?:screenshot|message|clip|still)s?\b[^.]{0,80}\bserved\b/i.test(text) &&
      /\b(?:full|download|master|transcript)\b[^.]{0,100}\b(?:missing|outstanding|not served)\b/i.test(
        text,
      ))
  );
}

/**
 * Keep a naive cross-exit served/missing hit only when unit-bound scan confirms
 * the same subject is asserted in the conflicting state.
 */
export function confirmUnitBoundContradiction(input: {
  text: string;
  subject: string;
  code: "served_state_contradicted" | "missing_state_contradicted";
  items: UnitBoundItem[];
}): boolean {
  if (isHonestSiblingServedMissingWording(input.text)) {
    const hits = scanUnitBoundCrossExit(input.text, input.items);
    return hits.some(
      (h) =>
        h.code === input.code &&
        (norm(h.subject) === norm(input.subject) ||
          labelMatchesSubject(h.subject, input.subject) ||
          labelMatchesSubject(input.subject, h.subject)),
    );
  }
  const hits = scanUnitBoundCrossExit(input.text, input.items);
  if (!hits.length) {
    // Fallback: subject itself must appear in the conflicting assertion clause.
    if (input.code === "served_state_contradicted") {
      return collectSubjects(input.text, UNIT_SERVED_RE).some((sub) =>
        labelMatchesSubject(input.subject, sub),
      );
    }
    return collectSubjects(input.text, UNIT_MISSING_RE).some((sub) =>
      labelMatchesSubject(input.subject, sub),
    );
  }
  return hits.some(
    (h) =>
      h.code === input.code &&
      (norm(h.subject) === norm(input.subject) ||
        labelMatchesSubject(h.subject, input.subject) ||
        labelMatchesSubject(input.subject, h.subject)),
  );
}
