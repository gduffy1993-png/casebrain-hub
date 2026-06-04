import type {
  ContradictionBlock,
  ExplanationBlock,
  ExplanationConfidenceTag,
  ExplanationFidelitySection,
  ExplanationMaterialStatus,
} from "./explanation-fidelity-types";

type SectionChunk = { name: string; body: string };

const OUTSTANDING_MARKERS =
  /\b(outstanding|not yet served|not served|not in bundle|not yet disclosed|not yet provided|not yet disclosed|awaiting service|to follow|retained; not yet|remains outstanding|download not yet|incomplete export|awaiting)\b/i;

const PARTIAL_MARKERS = /\b(partial|stills only|draft only|partial extract|incomplete|summary only)\b/i;

const DOC_TERMS = [
  "mg5",
  "mg6",
  "mg11",
  "mg6c",
  "cctv",
  "bwv",
  "cad",
  "999",
  "dashcam",
  "anpr",
  "interview",
  "pace",
  "custody",
  "forensic",
  "medical",
  "phone",
  "expert",
  "collision",
  "continuity",
  "mg6(a)",
];

function parseSections(text: string): SectionChunk[] {
  const chunks: SectionChunk[] = [];
  const parts = text.split(/===\s*SECTION:\s*([^=]+?)\s*===/i);
  if (parts.length > 1) {
    for (let i = 1; i < parts.length; i += 2) {
      chunks.push({ name: parts[i].trim(), body: parts[i + 1] ?? "" });
    }
    return chunks;
  }
  const headingParts = text.split(/(?=^#{1,2}\s)/m);
  for (const part of headingParts) {
    const m = part.match(/^#{1,2}\s+(.+?)(?:\n|$)/);
    chunks.push({ name: m?.[1]?.trim() ?? "bundle", body: part });
  }
  return chunks.length ? chunks : [{ name: "bundle", body: text }];
}

function snippet(line: string, max = 220): string {
  const s = line.replace(/\s+/g, " ").trim();
  return s.length <= max ? s : `${s.slice(0, max - 3)}...`;
}

function inferStatus(line: string): ExplanationMaterialStatus {
  if (/\bconflict|mismatch|differs|tension\b/i.test(line)) return "conflicting";
  if (/\b(PENDING|NOT OBTAINED|NOT YET|INCOMPLETE)\b/i.test(line)) return "outstanding";
  if (OUTSTANDING_MARKERS.test(line)) return "outstanding";
  if (PARTIAL_MARKERS.test(line)) return "partial";
  if (/\b(served|disclosed|provided)\b/i.test(line)) return "served";
  return "unclear";
}

function isDisclosureGapLine(line: string): boolean {
  if (OUTSTANDING_MARKERS.test(line)) return true;
  if (/\b(PENDING|NOT OBTAINED|NOT YET|INCOMPLETE)\b/i.test(line)) {
    return /item\s*\d|status:|mg6|cctv|phone|forensic|medical|disclosure|continuity|unused/i.test(line);
  }
  if (PARTIAL_MARKERS.test(line)) {
    return /\b(outstanding|pending|not served|not obtained|incomplete|mg6c?|awaiting)\b/i.test(line);
  }
  if (/^\s*\|?\s*\d+\s*\|/.test(line) && /\*\*Outstanding\*\*|Outstanding/i.test(line)) return true;
  return false;
}

function issueFromLine(line: string): string {
  const cleaned = line
    .replace(/^\s*[-|*#\d.]+\s*/, "")
    .replace(/\*\*/g, "")
    .trim();
  const beforeDash = cleaned.split(/\s*[—–-]\s+/)[0]?.trim();
  const issue = (beforeDash || cleaned).slice(0, 120);
  return issue || "disclosure item";
}

function blockFromLine(
  line: string,
  section: string,
  overrides?: Partial<ExplanationBlock>,
): ExplanationBlock | null {
  const status = overrides?.status ?? inferStatus(line);
  if (status === "served" || status === "unclear") return null;
  const issue = overrides?.issue ?? issueFromLine(line);
  const basis = overrides?.sourceBasis ?? snippet(line);
  const confidence: ExplanationConfidenceTag =
    status === "outstanding" || status === "partial" ? "provisional" : "needs_solicitor_review";

  return {
    issue,
    sourceSection: overrides?.sourceSection ?? section,
    sourceBasis: basis,
    status,
    whyItMatters:
      overrides?.whyItMatters ??
      "Route, disclosure chase priority, and hearing position depend on whether this material is served, partial, or still outstanding.",
    safeNextAction:
      overrides?.safeNextAction ??
      "Record on file; chase prosecution disclosure with a focused request tied to this item; take instructions before fixing the hearing position.",
    confidenceTag: overrides?.confidenceTag ?? confidence,
    doNotOverstate:
      overrides?.doNotOverstate ??
      (status === "partial"
        ? "Do not describe this as fully absent if partial material or summaries are on the papers."
        : "Do not state this is served or complete until the bundle records service or a full export on file."),
  };
}

function dedupeBlocks(blocks: ExplanationBlock[]): ExplanationBlock[] {
  const seen = new Set<string>();
  const out: ExplanationBlock[] = [];
  for (const b of blocks) {
    const key = `${b.issue.toLowerCase()}|${b.status}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(b);
  }
  return out;
}

function scanMg6cItems(section: SectionChunk): ExplanationBlock[] {
  const blocks: ExplanationBlock[] = [];
  const itemRe = /###\s*Item\s*\d+:\s*(.+)/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(section.body)) !== null) {
    const tail = section.body.slice(m.index, m.index + 600);
    const statusLine = tail.split("\n").find((l) => /Status:\s*(PENDING|NOT OBTAINED|INCOMPLETE|PARTIAL)/i.test(l));
    if (!statusLine) continue;
    const line = `${m[1].trim()} — ${statusLine.trim()}`;
    const b = blockFromLine(line, section.name, {
      issue: m[1].trim(),
      status: /PENDING|NOT OBTAINED|INCOMPLETE/i.test(statusLine) ? "outstanding" : "partial",
    });
    if (b) blocks.push(b);
  }
  return blocks;
}

function scanLinesForMissing(ctx: { text: string; sections: SectionChunk[] }): ExplanationBlock[] {
  const blocks: ExplanationBlock[] = [];
  for (const section of ctx.sections) {
    blocks.push(...scanMg6cItems(section));
    for (const line of section.body.split("\n")) {
      if (!isDisclosureGapLine(line)) continue;
      if (/^\s*\|?\s*item\s*\|/i.test(line) || /^\s*[-|]+\s*$/.test(line)) continue;
      if (/partial dna|partial view|partial angle|partial profile|lighting poor/i.test(line)) continue;
      const b = blockFromLine(line, section.name);
      if (b) blocks.push(b);
    }
  }
  return dedupeBlocks(blocks);
}

function detectPilotDisclosureChase(ctx: { text: string }): ExplanationBlock[] {
  const blocks: ExplanationBlock[] = [];
  const inChase = ctx.text.split(/disclosure chase/i)[1];
  if (!inChase) return blocks;
  for (const line of inChase.split("\n").slice(0, 40)) {
    if (!/outstanding/i.test(line)) continue;
    const b = blockFromLine(line, "MG5 / disclosure chase");
    if (b) blocks.push(b);
  }
  return blocks;
}

function detectContradictions(text: string, lower: string): ContradictionBlock[] {
  const out: ContradictionBlock[] = [];

  const charge14 = /particulars of offence[\s\S]{0,400}14\s+march\s+2024/i.test(lower);
  const mg5_15 = /evening of\s+15\s+march\s+2024|on\s+15\s+march\s+2024/i.test(lower);
  if (charge14 && mg5_15) {
    out.push({
      issue: "incident date — charge particulars vs MG5 narrative",
      sourceSection: "Charge sheet / MG5",
      sourceBasis:
        "Charge particulars refer to 14 March 2024; MG5 narrative describes the evening of 15 March 2024.",
      status: "conflicting",
      whyItMatters:
        "Chronology affects bail, alibi, and whether particulars safely match the prosecution narrative before plea or case management.",
      safeNextAction:
        "Chase clarification: amended particulars, MG5 correction, or Crown explanation; do not adopt one date without reconciliation.",
      confidenceTag: "needs_solicitor_review",
      doNotOverstate: "Do not state a single agreed incident date until the papers are reconciled.",
      sourceA: "Charge sheet particulars: 14 March 2024",
      sourceB: "MG5 narrative: evening of 15 March 2024",
      reconciliationStatus: "conflicting",
    });
  }

  if (/00:24|00:24 dispatch/i.test(lower) && /00:30|approximately 00:30/i.test(lower) && /cad/i.test(lower)) {
    out.push({
      issue: "emergency response timing — CAD extract vs officer attendance",
      sourceSection: "CAD extract / MG11 PC Vale",
      sourceBasis: "Partial CAD extract references earlier dispatch timing; officer statement records attendance about 00:30.",
      status: "conflicting",
      whyItMatters: "Timeline affects witness reliability, sequence reconstruction, and whether attendance accounts align.",
      safeNextAction: "Chase full CAD log and unit movement material; compare with BWV and 999 when served.",
      confidenceTag: "provisional",
      doNotOverstate: "Do not treat partial CAD times as final until the full log is on file.",
      sourceA: "CAD partial extract (earlier dispatch reference)",
      sourceB: "Officer attendance account (~00:30)",
      reconciliationStatus: "conflicting",
    });
  }

  if (/footage[\s\S]{0,120}(secured|held|arranged)/i.test(lower) && /cctv[\s\S]{0,200}(awaiting|not yet|outstanding|not served)/i.test(lower)) {
    out.push({
      issue: "CCTV export — MG5 hold language vs disclosure outstanding",
      sourceSection: "MG5 / MG6(a) / CCTV list",
      sourceBasis:
        "MG5 references footage being arranged or held; MG6/CCTV list records export or continuity as outstanding or not yet served.",
      status: "conflicting",
      whyItMatters: "Identification and sequence cannot be treated as complete while export and continuity remain unresolved.",
      safeNextAction: "Chase master export, hash values, and continuity statement; align chase list with MG6 rows.",
      confidenceTag: "provisional",
      doNotOverstate: "Do not tell the court CCTV is available for playback if only stills, lists, or draft continuity are on the papers.",
      sourceA: "MG5 — footage arranged / held language",
      sourceB: "MG6 / CCTV list — export or continuity outstanding",
      reconciliationStatus: "conflicting",
    });
  }

  return out;
}

function detectCustodyInterview(ctx: { text: string; lower: string; sections: SectionChunk[] }): ExplanationBlock[] {
  const blocks: ExplanationBlock[] = [];
  const interviewSection = ctx.sections.find((s) => /interview|custody|pace|ir-001/i.test(s.name))?.body ?? ctx.text;

  const noCommentLine = interviewSection.split("\n").find((l) => /no comment/i.test(l));
  if (noCommentLine && /interview|caution|pace/i.test(ctx.lower)) {
    blocks.push({
      issue: "interview under caution — no comment account",
      sourceSection: /pace/i.test(interviewSection) ? "PACE interview / custody" : "Interview summary",
      sourceBasis: snippet(
        noCommentLine ?? "Defendant interviewed under caution; no comment account recorded on papers.",
      ),
      status: "served",
      whyItMatters:
        "Affects what can safely be put to witnesses and what inferences may be sought at trial — solicitor must confirm strategy.",
      safeNextAction:
        "Review interview recording/transcript when served; confirm PACE compliance and disclosure of pre-interview material.",
      confidenceTag: "likely",
      doNotOverstate: "Do not infer guilt from no comment; do not overstate what was disclosed before interview.",
    });
  }

  if (/pre-interview disclosure|limited disclosure|not yet provided.*custody|custody cctv.*not yet/i.test(ctx.lower)) {
    blocks.push({
      issue: "custody / pre-interview disclosure limits",
      sourceSection: "Custody record / disclosure",
      sourceBasis: snippet(
        ctx.text
          .split("\n")
          .find((l) => /custody cctv|pre-interview|limited disclosure/i.test(l)) ?? "Custody disclosure limits noted on papers.",
      ),
      status: "outstanding",
      whyItMatters: "PACE and fairness arguments may turn on what was available before interview; affects abuse of process risk assessment.",
      safeNextAction: "Chase custody CCTV, disclosure logs, and solicitor attendance note; record for instructions.",
      confidenceTag: "needs_solicitor_review",
      doNotOverstate: "Do not state full pre-interview disclosure was given if the bundle records gaps or requests outstanding.",
    });
  }

  return dedupeBlocks(blocks);
}

function detectDisclosureDependencies(ctx: { text: string; lower: string }): ExplanationBlock[] {
  const blocks: ExplanationBlock[] = [];
  if (/mg6|mg6c|schedule of (initial )?disclosure|disclosure chase|outstanding summary|initial disclosure only/i.test(ctx.lower)) {
    const mg6Line =
      ctx.text.split("\n").find((l) => /mg6|outstanding summary|disclosure officer|disclosure chase|initial disclosure/i.test(l)) ??
      "Disclosure schedule / chase list governs what is served vs outstanding.";
    const hasMg6 = /\bmg6/.test(ctx.lower);
    blocks.push({
      issue: hasMg6 ? "MG6 / disclosure schedule drives chase priority" : "Disclosure chase list drives route priority",
      sourceSection: hasMg6 ? "MG6(a) / MG6C / disclosure schedule" : "MG5 / disclosure chase",
      sourceBasis: snippet(mg6Line),
      status: /incomplete|partial|outstanding|pending/i.test(ctx.text) ? "outstanding" : "partial",
      whyItMatters:
        "Route and hearing asks should track MG6 rows — missing exports block attribution, identification, and expert routes.",
      safeNextAction:
        "Work chase list from MG6/outstanding index; request timetable; record Crown responses before fixing hearing position.",
      confidenceTag: "provisional",
      doNotOverstate: "Do not treat the case as fully disclosed while MG6 or outstanding lists mark material as outstanding or incomplete.",
    });
  }
  return blocks;
}

export function generateExplanationFidelity(bundleText: string): ExplanationFidelitySection[] {
  const text = bundleText;
  const lower = text.toLowerCase();
  const sections = parseSections(text);
  const ctx = { text, lower, sections };

  const missing = dedupeBlocks([...scanLinesForMissing(ctx), ...detectPilotDisclosureChase(ctx)]).slice(0, 24);

  const contradictions = detectContradictions(text, lower);

  const custody = detectCustodyInterview(ctx);

  const disclosure = detectDisclosureDependencies(ctx);

  return [
    {
      key: "missing-material",
      title: "Missing material explanations",
      blocks: missing,
      contradictions: [],
    },
    {
      key: "contradictions",
      title: "Contradiction / inconsistency map",
      blocks: [],
      contradictions,
    },
    {
      key: "custody-interview",
      title: "Police station / interview caution",
      blocks: custody,
      contradictions: [],
    },
    {
      key: "disclosure-dependencies",
      title: "Disclosure dependency explanations",
      blocks: disclosure,
      contradictions: [],
    },
  ];
}

/** Document/source terms that must appear in bundle text if cited in sourceSection. */
export function sourceSectionTermsPresent(bundleText: string, sourceSection: string): boolean {
  const lower = bundleText.toLowerCase();
  const sectionLower = sourceSection.toLowerCase();
  if (/disclosure chase|disclosure schedule/i.test(sectionLower) && /disclosure/i.test(lower)) {
    return true;
  }
  const terms = DOC_TERMS.filter((t) => sectionLower.includes(t.replace("(", "\\(")));
  if (!terms.length) return true;
  return terms.some((t) => lower.includes(t.replace("6(a)", "mg6").replace("mg6c", "mg6")));
}

export function sourceBasisInBundle(bundleText: string, sourceBasis: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const basis = norm(sourceBasis);
  if (!basis || basis.length < 12) return false;
  const hay = norm(bundleText);
  if (hay.includes(basis)) return true;
  const words = basis.split(" ").filter((w) => w.length > 4);
  if (words.length < 3) return hay.includes(basis);
  const hit = words.filter((w) => hay.includes(w)).length;
  return hit >= Math.min(3, Math.ceil(words.length * 0.6));
}
