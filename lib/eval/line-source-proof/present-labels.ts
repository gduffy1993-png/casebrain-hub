/**
 * Proof-report presentation only — clearer human labels when bundle source allows.
 * Does not mutate product UI or chase core labels.
 */

const VAGUE_MG6_RE = /\bmg6\s*\/\s*unused schedule clarification\b/i;

const SERVED_LABEL_RE = /\bserved on bundle\b|served\b.*\b(?:on bundle|in bundle)\b/i;

export function isServedMaterialLabel(label: string): boolean {
  return (
    /\bserved\b/i.test(label) &&
    !/\boutstanding\b|not on bundle|not attached|referred only|extract only|summary only/i.test(label)
  );
}

export function isChaseWordingLine(outputLine: string, lineCategory?: string): boolean {
  if (lineCategory === "chase_request" || lineCategory === "missing_material") return true;
  return /\bplease provide\b|\bchase\b|\boutstanding\b|\bconfirm in writing\b/i.test(outputLine);
}

/** MG6C rows from bundle text. */
export function mg6cRowsFromBundle(bundleText: string): string[] {
  const mg6 = bundleText.match(/MG6C[\s\S]*?(?=\n===|\n#{1,3}\s|$)/i)?.[0] ?? "";
  return mg6
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^MG6C\//i.test(l));
}

function humaniseMg6RowText(row: string): string {
  return labelFromMg6Snippet(row) ?? row.replace(/^MG6C\/\w+\s*[—–-]\s*/i, "").trim();
}

/** Prefer outstanding/referred rows for chase wording — never a served-only label. */
export function pickOutstandingMg6Label(bundleText: string, outputLine?: string): string | null {
  const rows = mg6cRowsFromBundle(bundleText);
  const outstanding = rows.filter((r) =>
    /outstanding|not attached|referred|extract only|summary only|not served/i.test(r),
  );
  if (!outstanding.length) return null;

  const hay = (outputLine ?? "").toLowerCase();
  const topicPairs: Array<{ lineRe: RegExp; rowRe: RegExp }> = [
    { lineRe: /handle|mapping|shadow|encro/i, rowRe: /\/han|handle mapping|\/enc/i },
    { lineRe: /platform|extraction/i, rowRe: /\/pla|platform extraction/i },
    { lineRe: /continuity/i, rowRe: /\/con|continuity/i },
    { lineRe: /co-?def|segregation/i, rowRe: /\/co-|co-defendant/i },
    { lineRe: /cctv|stills|footage|master/i, rowRe: /\/cct|\/mas|cctv|stills/i },
    { lineRe: /\babe\b/i, rowRe: /\/abe|\babe\b/i },
    { lineRe: /\bbwv\b|body.worn/i, rowRe: /\/bwv|body.worn/i },
    { lineRe: /custody|pace/i, rowRe: /custody|pace|\/011/i },
    { lineRe: /phone|subscriber|extraction/i, rowRe: /\/001|\/003|phone|subscriber/i },
  ];

  for (const { lineRe, rowRe } of topicPairs) {
    if (!lineRe.test(hay)) continue;
    const row = outstanding.find((r) => rowRe.test(r));
    if (row) return humaniseMg6RowText(row);
  }

  return humaniseMg6RowText(outstanding[0]);
}

export function labelFromMg6Snippet(snippet: string | null): string | null {
  if (!snippet) return null;
  const s = snippet.toLowerCase();
  if (/mg6c\/001.*phone extraction|summary only.*source download outstanding/i.test(s)) {
    return "Phone extraction summary only — full source download outstanding";
  }
  if (/mg6c\/002.*screenshot.*served/i.test(s)) {
    return "Screenshot pack served";
  }
  if (/mg6c\/003.*subscriber.*outstanding/i.test(s)) {
    return "Subscriber data outstanding";
  }
  if (/mg6c\/enc.*encro message extracts.*served/i.test(s)) {
    return "Encro message extracts served on bundle";
  }
  if (/mg6c\/pla.*platform extraction.*(?:referred|export not served)/i.test(s)) {
    return "Platform extraction referred only — full export not served";
  }
  if (/mg6c\/han.*handle mapping.*outstanding/i.test(s)) {
    return "Handle mapping certificate outstanding";
  }
  if (/mg6c\/co-.*co-defendant segregation.*outstanding/i.test(s)) {
    return "Co-defendant segregation map outstanding";
  }
  if (/mg6c\/cct.*cctv still.*served/i.test(s)) {
    return "CCTV still images served — master footage not on bundle";
  }
  if (/mg6c\/mas.*master cctv.*referred/i.test(s)) {
    return "Master CCTV timeline referred only — export not served";
  }
  if (/mg6c\/mas.*master footage.*outstanding/i.test(s)) {
    return "Master CCTV footage outstanding";
  }
  if (/mg6c\/abe.*abe.*outstanding/i.test(s)) {
    return "ABE room recording index outstanding — not on bundle";
  }
  if (/mg6c\/abe.*abe transcript fragment.*served/i.test(s)) {
    return "ABE transcript fragment only — full recording not served";
  }
  if (/mg6c\/abe.*abe recording.*referred/i.test(s)) {
    return "ABE recording referred only — not served";
  }
  if (/mg6c\/mes.*message content screenshots.*served/i.test(s)) {
    return "Message content screenshots served";
  }
  if (/mg6c\/pla.*platform export.*referred/i.test(s)) {
    return "Platform export referred only — attribution not served";
  }
  if (/mg6c\/sub.*subscriber proof.*outstanding/i.test(s)) {
    return "Subscriber proof outstanding";
  }
  if (/mg6c\/nrm.*nrm referral.*outstanding/i.test(s)) {
    return "NRM referral outcome letter outstanding";
  }
  if (/mg6c\/010.*bwv.*referred.*not attached/i.test(s)) {
    return "BWV referred to but not attached";
  }
  if (/mg6c\/011.*custody record.*extract only/i.test(s)) {
    return "Custody record extract only";
  }
  if (/mg6c\/con.*continuity.*outstanding/i.test(s)) {
    return "Continuity material outstanding";
  }
  return null;
}

export function labelFromMg11Snippet(snippet: string | null, bundleText?: string): string | null {
  if (!snippet) {
    if (bundleText && /mg11.*first account outstanding|not served — first account/i.test(bundleText)) {
      return "First account / complainant MG11 not served";
    }
    return null;
  }
  const s = snippet.toLowerCase();
  if (/attribution disputed|cannot say who operated/i.test(s)) {
    return "Attribution disputed — complainant cannot identify phone operator";
  }
  if (/first account outstanding|not served — first account/i.test(s)) {
    return "First account / complainant MG11 not served";
  }
  if (/historic context noted/i.test(s)) {
    return "Historic context noted — do not treat summary as served statement";
  }
  return null;
}

export function resolveHumanEvidenceLabel(input: {
  evidenceItem: string | null;
  outputLine: string;
  sourceSnippet: string | null;
  bundleText?: string;
  lineCategory?: string;
}): string | null {
  const isChase = isChaseWordingLine(input.outputLine, input.lineCategory);
  const hay = `${input.evidenceItem ?? ""} ${input.outputLine}`;

  if (VAGUE_MG6_RE.test(hay) && input.bundleText) {
    if (isChase) {
      return pickOutstandingMg6Label(input.bundleText, input.outputLine);
    }
  }

  let fromSnippet = labelFromMg6Snippet(input.sourceSnippet) ?? labelFromMg11Snippet(input.sourceSnippet, input.bundleText);
  if (fromSnippet && isChase && isServedMaterialLabel(fromSnippet) && input.bundleText) {
    const chaseLabel = pickOutstandingMg6Label(input.bundleText, input.outputLine);
    if (chaseLabel) fromSnippet = chaseLabel;
  }
  if (fromSnippet) return fromSnippet;

  if (VAGUE_MG6_RE.test(hay) && input.sourceSnippet) {
    fromSnippet = labelFromMg6Snippet(input.sourceSnippet);
    if (fromSnippet && isChase && isServedMaterialLabel(fromSnippet) && input.bundleText) {
      return pickOutstandingMg6Label(input.bundleText, input.outputLine);
    }
    return fromSnippet;
  }

  if (/handle mapping|shadow-\d+/i.test(hay) && /mapping certificate.*not served|outstanding/i.test(input.sourceSnippet ?? "")) {
    return "Handle mapping certificate outstanding — handle ≠ defendant on papers";
  }

  return null;
}

export function applyHumanOutputPreview(
  outputLine: string,
  humanEvidenceLabel: string | null,
  opts?: { isChase?: boolean },
): string {
  if (!humanEvidenceLabel) return outputLine;
  const isChase = opts?.isChase ?? isChaseWordingLine(outputLine);
  let label = humanEvidenceLabel;
  if (isChase && isServedMaterialLabel(label)) {
    return outputLine;
  }
  let line = outputLine;
  if (VAGUE_MG6_RE.test(line)) {
    line = line.replace(VAGUE_MG6_RE, label);
  }
  if (/^MG6 \/ unused schedule clarification\b/i.test(line.trim())) {
    return label;
  }
  if (isChase && /\bplease provide\b/i.test(line) && SERVED_LABEL_RE.test(label)) {
    return line;
  }
  return line;
}
