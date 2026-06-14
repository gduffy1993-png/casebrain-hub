/**
 * MG6/MG6C normalisation and material status classification for Bundle Truth Ledger.
 */

import type {
  MaterialStatus,
  NormalisedMaterialRow,
  SourceAnchor,
  TruthConfidence,
} from "./bundle-truth-types";

function compact(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Repair OCR-glued MG6 status tails: `not servedMay` → `not served — May`. */
export function repairGluedMg6StatusText(line: string): string {
  let s = line.replace(/\r\n/g, " ");
  s = s.replace(/\b(MG6C?\/\d{3,4})([A-Za-z])/gi, "$1 — $2");
  s = s.replace(/\b(not\s+served)\s+([A-Z][A-Za-z]*)/gi, "$1 — $2");
  s = s.replace(/\b(not\s+served)([A-Z][A-Za-z]*)/gi, "$1 — $2");
  s = s.replace(/\b(absent)\s+([A-Z][A-Za-z]*)/gi, "$1 — $2");
  s = s.replace(/\b(absent)([A-Z][A-Za-z]*)/gi, "$1 — $2");
  s = s.replace(/\b(outstanding)([A-Z][A-Za-z]*)/gi, "$1 — $2");
  s = s.replace(/\b(unsigned)([A-Z][A-Za-z]*)/gi, "$1 — $2");
  s = s.replace(/\b(draft)([A-Z][A-Za-z]*)/gi, "$1 — $2");
  s = s.replace(/\bCourtHearing(\d{1,2})/gi, "Court hearing $1");
  s = s.replace(/\bnotice of CourtHearing/gi, "notice of court hearing");
  s = s.replace(
    /\bCourtHearing(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})/gi,
    "Court hearing $1",
  );
  return compact(s);
}

const INDEX_NOISE_RE =
  /\b(?:cover\s*sheet|case\s*admin\s*email|appendix|appendices|old\s*page|page\s*ref\s*wrong|duplicate|corrected\s*later|fiction(?:al)?|test-data)\b/i;

const EXCLUDED_LINE_RE =
  /\b(?:email\s+chain\s+excerpt|live\s+issues\s+identified|crown\s+route\s+relies\s+on|no\s+conclusion\s+is\s+drawn\s+from\s+the\s+charge\s+wording|key\s+case\s+facts\s+should\s+come\s+from\s+charge|this\s+front\s+note\s+is\s+not\s+complete|front\s+note|key\s+disputed\s+issues|cover\s+sheet|case\s+admin\s+emails?|appendices?|old\s+page|page\s+ref\s+wrong|duplicate|footer)\b/i;

const MG6_HEAD_RE =
  /\b(?:mg6\s+disclosure\s+schedule|mg6\s+corrected|mg6\s+continuation|mg6\s+disclosure|mg6c|disclosure\s+schedule|unused\s+material\s+schedule)\b/i;

const ITEM_RE =
  /\b(?:cctv|bwv|999(?:\s+audio)?|cad(?:\s+log)?|scene\s+photos?|forensic|witness|medical|interview|transcript|mg11|statement|footage|recording|export\s+log|continuity)\b/i;

const DRAFT_STATUS_RE =
  /\b(?:summary\s+only|extract\s+served\s+only|extract\s+only|partial|screenshots?\s*\/\s*summary|screenshots?\b|only\s+screenshots|later\s+note\s+suggests|draft\s+note|draft\s+only|\bdraft\b|unclear|served\s*\?\s*unclear|requires?\s+oic\s+check|sensitive\s+schedule\s+exists)\b/i;

const OUTSTANDING_STATUS_RE =
  /\b(?:not\s+yet\s+served|not\s+served|not\s+fully\s+served|not\s+complete|not\s+on\s+file|not\s+attached|defence\s+request\s+outstanding|continuity\s+pending|continuity\s+outstanding|pending|await(?:ing|ed)?|to\s+follow|missing\s+source|full\s+master\s+not\s+on\s+file|full\s+recording\s+outstanding|\babsent\b|outstanding|check\s+full\s+(?:mg\s*11|bwv|first)|behind\s+this\s+extract\s+is\s+not)\b/i;

const UNSIGNED_RE = /\b(?:unsigned|not\s+signed|awaiting\s+signature|draft\s+witness\s+statement)\b/i;

const POSITIVE_SERVED_RE =
  /\b(?:served|provided|disclosed|supplied|final\s+served|full\s+served|footage\s+provided|log\s+disclosed|statement\s+supplied)\b/i;

const NEVER_IN_SERVED_RE =
  /\b(?:not\s+served|not\s+yet\s+served|not\s+fully\s+served|not\s+complete|not\s+on\s+file|not\s+safely\s+separated|await(?:ing|ed)?|outstanding|defence\s+request\s+outstanding|continuity\s+pending|pending|to\s+follow|missing\s+source|summary\s+only|extract\s+served\s+only|extract\s+only|partial|screenshots?\s*\/\s*summary|screenshots?\b|only\s+screenshots|later\s+note\s+suggests|behind\s+this\s+extract|source\s+material\s+behind|check\s+full\s+(?:mg\s*11|bwv|first)|unclear|\bdraft\b|draft\s+only|draft\s+note|served\s*\?\s*unclear|requires?\s+oic\s+check|sensitive\s+schedule\s+exists|\babsent\b|\bunsigned\b)\b/i;

function isLikelyMaterialLine(line: string): boolean {
  if (EXCLUDED_LINE_RE.test(line) || INDEX_NOISE_RE.test(line)) return false;
  const U = line.toUpperCase();
  return (
    /\bMG6(?:[A-Z])?\b/.test(U) ||
    MG6_HEAD_RE.test(line) ||
    ITEM_RE.test(line) ||
    OUTSTANDING_STATUS_RE.test(line) ||
    DRAFT_STATUS_RE.test(line) ||
    POSITIVE_SERVED_RE.test(line)
  );
}

function hasNegativeOrLimitingSignal(line: string): boolean {
  if (NEVER_IN_SERVED_RE.test(line)) return true;
  if (DRAFT_STATUS_RE.test(line)) return true;
  if (OUTSTANDING_STATUS_RE.test(line)) return true;
  if (/\bnot\b/i.test(line) && POSITIVE_SERVED_RE.test(line)) return true;
  return false;
}

function isCleanPositiveServedLine(line: string): boolean {
  if (!ITEM_RE.test(line)) return false;
  if (hasNegativeOrLimitingSignal(line)) return false;
  if (!POSITIVE_SERVED_RE.test(line)) return false;
  return true;
}

export function classifyMaterialStatus(line: string): MaterialStatus | null {
  const l = compact(line);
  if (!l || l.length < 8) return null;
  if (UNSIGNED_RE.test(l)) return "unsigned";
  if (DRAFT_STATUS_RE.test(l)) return "draft";
  if (OUTSTANDING_STATUS_RE.test(l)) return "outstanding";
  if (/\babsent\b/i.test(l)) return "absent";
  if (/\bpartial\b/i.test(l)) return "partial";
  if (isCleanPositiveServedLine(l)) return "served";
  if (ITEM_RE.test(l) && !hasNegativeOrLimitingSignal(l)) return "unclear";
  return null;
}

function parseScheduleRef(line: string): string | null {
  const m =
    line.match(/\b(MG6C?\/\d{3,4})\b/i) ??
    line.match(/\b(MG6[A-Z]?[-\s]?\d{2,4})\b/i);
  if (!m?.[1]) return null;
  return compact(m[1]).replace(/\s+/g, "").toUpperCase();
}

function splitMaterialLabelDetail(line: string): { label: string; detail: string | null } {
  const c = repairGluedMg6StatusText(line.replace(/^[-*•]\s*/, ""));
  const dashParts = c.split(/\s*[—–\-]\s+/);
  if (dashParts.length >= 3) {
    return {
      label: `${dashParts[0]!} — ${dashParts[1]!}`,
      detail: dashParts.slice(2).join(" — ") || null,
    };
  }
  if (dashParts.length === 2) {
    return { label: dashParts[0]!, detail: dashParts[1]! };
  }
  return { label: c, detail: null };
}

function normaliseDedupeKey(line: string, scheduleRef: string | null): string {
  const base = (scheduleRef ?? line)
    .toUpperCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s/]/g, "")
    .slice(0, 120);
  const kind = ITEM_RE.exec(line)?.[0]?.toLowerCase() ?? "material";
  return `${base}|${kind}`;
}

function rowConfidence(status: MaterialStatus, line: string): TruthConfidence {
  if (status === "unclear" || INDEX_NOISE_RE.test(line)) return "low";
  if (status === "partial" || status === "draft" || status === "unsigned") return "medium";
  return "high";
}

function collectMaterialLines(bundleText: string): string[] {
  const head = bundleText.slice(0, 250_000).replace(/\r\n/g, "\n");
  const lines: string[] = [];
  const seen = new Set<string>();

  const add = (raw: string) => {
    const c = repairGluedMg6StatusText(raw);
    if (c.length < 10 || c.length > 320) return;
    if (!isLikelyMaterialLine(c)) return;
    const status = classifyMaterialStatus(c);
    if (!status) return;
    const key = normaliseDedupeKey(c, parseScheduleRef(c));
    if (seen.has(key)) return;
    seen.add(key);
    lines.push(c);
  };

  let inSchedule = false;
  for (const raw of head.split(/\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (MG6_HEAD_RE.test(line) || /\bMG6C?\b/i.test(line)) inSchedule = true;
    if (inSchedule || ITEM_RE.test(line)) add(line);
  }

  return lines;
}

export function normaliseBundleMaterials(bundleText: string): NormalisedMaterialRow[] {
  const rows: NormalisedMaterialRow[] = [];
  const seen = new Set<string>();

  for (const line of collectMaterialLines(bundleText)) {
    const status = classifyMaterialStatus(line);
    if (!status) continue;

    const scheduleRef = parseScheduleRef(line);
    const { label, detail } = splitMaterialLabelDetail(line);
    const id = normaliseDedupeKey(line, scheduleRef);
    if (seen.has(id)) continue;
    seen.add(id);

    const anchor: SourceAnchor = {
      documentPriority: "mg6",
      sectionLabel: scheduleRef ?? "MG6/MG6C",
      excerpt: line.slice(0, 220),
    };

    const displayLine = (() => {
      if (scheduleRef && new RegExp(`^${scheduleRef.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(label)) {
        return detail ? `${label} — ${detail}` : label;
      }
      return [scheduleRef, label, detail].filter(Boolean).join(" — ");
    })();

    rows.push({
      id,
      scheduleRef,
      label,
      detail,
      status,
      displayLine,
      sourceAnchor: anchor,
      confidence: rowConfidence(status, line),
    });
  }

  return rows;
}

export function buildForbiddenClaimsForMaterials(
  materials: NormalisedMaterialRow[],
): Array<{ id: string; phrase: string; reason: string; relatedMaterialIds: string[] }> {
  const out: Array<{ id: string; phrase: string; reason: string; relatedMaterialIds: string[] }> =
    [];

  const add = (id: string, phrase: string, reason: string, ids: string[]) => {
    out.push({ id, phrase, reason, relatedMaterialIds: ids });
  };

  const notFullyServed = (s: MaterialStatus) =>
    s === "absent" ||
    s === "outstanding" ||
    s === "draft" ||
    s === "unsigned" ||
    s === "partial" ||
    s === "unclear";

  const cctvRows = materials.filter(
    (m) => /\bcctv|footage|video\b/i.test(`${m.label} ${m.detail ?? ""}`) && notFullyServed(m.status),
  );
  if (cctvRows.length) {
    add("forbid-cctv-confirms", "CCTV confirms", "CCTV is not fully served on papers", cctvRows.map((r) => r.id));
    add("forbid-cctv-proves", "CCTV proves", "CCTV is not fully served on papers", cctvRows.map((r) => r.id));
    add(
      "forbid-full-cctv-confirms",
      "Full CCTV confirms",
      "CCTV is not fully served on papers",
      cctvRows.map((r) => r.id),
    );
  }

  const medicalRows = materials.filter(
    (m) => /\bmedical|hospital|injury|fme\b/i.test(`${m.label} ${m.detail ?? ""}`) && notFullyServed(m.status),
  );
  if (medicalRows.length) {
    add("forbid-medical-final", "final medical report", "Medical material is absent, draft, or outstanding", medicalRows.map((r) => r.id));
    add("forbid-medical-proves", "medical report proves", "Medical material is absent, draft, or outstanding", medicalRows.map((r) => r.id));
    add("forbid-medical-consistent", "medical is consistent", "Medical material is absent, draft, or outstanding", medicalRows.map((r) => r.id));
  }

  const interviewRows = materials.filter(
    (m) => /\binterview|transcript|pace\b/i.test(`${m.label} ${m.detail ?? ""}`) && notFullyServed(m.status),
  );
  if (interviewRows.length) {
    add("forbid-interview-confirms", "interview confirms", "Interview material is not fully served", interviewRows.map((r) => r.id));
  }

  const witnessRows = materials.filter(
    (m) =>
      /\bmg11|witness\s+statement|complainant\s+statement\b/i.test(`${m.label} ${m.detail ?? ""}`) &&
      (m.status === "draft" || m.status === "unsigned" || m.status === "partial"),
  );
  if (witnessRows.length) {
    add("forbid-witness-final", "witness statement is final", "Witness statement is draft or unsigned on papers", witnessRows.map((r) => r.id));
    add("forbid-witness-served", "MG11 is consistent and served", "Witness statement is draft or unsigned on papers", witnessRows.map((r) => r.id));
    add("forbid-mg11-served", "MG11 served", "Witness statement is draft or unsigned on papers", witnessRows.map((r) => r.id));
    add(
      "forbid-injury-consistent",
      "Complainant injury account is consistent across MG11 and medical material",
      "Medical or witness material is not fully served on papers",
      [...witnessRows, ...medicalRows].map((r) => r.id),
    );
  }

  const bwvRows = materials.filter(
    (m) => /\bbwv|body[-\s]?worn\b/i.test(`${m.label} ${m.detail ?? ""}`) && notFullyServed(m.status),
  );
  if (bwvRows.length) {
    add("forbid-bwv-confirms", "BWV confirms", "Body-worn video is not fully served on papers", bwvRows.map((r) => r.id));
  }

  const cadRows = materials.filter(
    (m) => /\bcad\b|\b999\b|dispatch|control\s*room/i.test(`${m.label} ${m.detail ?? ""} ${m.displayLine}`),
  );
  const cadServed = cadRows.filter((m) => m.status === "served");
  if (cadRows.length === 0 || cadServed.length === 0) {
    add(
      "forbid-cad-supports",
      "CAD/999 timing supports",
      "CAD/999 material is not safely on file as served",
      cadRows.map((r) => r.id),
    );
  }

  if (witnessRows.length) {
    add("forbid-mg11-consistent", "MG11 is consistent", "Witness statement is draft or unsigned on papers", witnessRows.map((r) => r.id));
  }

  return out;
}

export function estimateOcrConfidence(bundleText: string): TruthConfidence {
  const sample = bundleText.slice(0, 40_000);
  if (!sample.trim()) return "low";
  let penalty = 0;
  if (/\w{24,}/.test(sample)) penalty += 1;
  if ((sample.match(/\?\?\?|�|\[\?\]/g) ?? []).length > 3) penalty += 2;
  if ((sample.match(/\b[A-Z]{5,}[a-z]{3,}\b/g) ?? []).length > 5) penalty += 1;
  if (penalty >= 3) return "low";
  if (penalty >= 1) return "medium";
  return "high";
}
