import type { BattleboardOutput } from "@/lib/criminal/strategy-battleboard";

export const SUGGESTED_PROMPTS = [
  "What would CPS argue?",
  "What evidence should I chase?",
  "What would make us lose?",
  "What can I safely say at hearing?",
  "Explain this to client",
  "Draft disclosure chase",
] as const;

export type SuggestedPrompt = (typeof SUGGESTED_PROMPTS)[number];

export type BundleHeaderContext = {
  stage?: string | null;
  primaryEvalHook?: string | null;
  shortTitle?: string | null;
};

export type BundleSnippetsContext = {
  mg5?: string | null;
  mg6?: string | null;
  exhibits?: string | null;
};

export type ControlRoomAssistantContext = {
  battleboard: BattleboardOutput | null;
  allegation: string;
  stage: string;
  positionNotice?: string | null;
  missingEvidence: string[];
  bundleHeader?: BundleHeaderContext | null;
  bundleSnippets?: BundleSnippetsContext | null;
  fileTextHints?: string;
  primaryRouteTitle?: string | null;
};

export const BATTLEBOARD_FALLBACK_TIMEOUT_HEADER =
  "The assistant timed out. Here is the file-based Battleboard fallback:";

const FALLBACK_INTRO = "File-based view — conditional, solicitor review required.";

const GENERIC_CHASE_PATTERNS = [
  /\bbwv\b/i,
  /\bbody\s*worn\b/i,
  /\bcustody\s*record\b/i,
  /\bcustody\s*cctv\b/i,
];

const THIN_BUNDLE_NO_MG6_RE =
  /thin bundle.*(?:no published )?disclosure schedule|no published disclosure schedule/i;

const CANONICAL_MG6_CHASE = [
  { test: /^mg5/i, label: "MG5 final after reconciliation" },
  { test: /^mg11/i, label: "Signed MG11 copy if draft" },
  { test: /cctv|footage/i, label: "CCTV continuity statement / engineer note" },
  { test: /999/, label: "Full 999 master audio" },
  { test: /cad|dispatch/i, label: "Fuller CAD narrative attachment" },
  { test: /forensic|medical|lab|gp/i, label: "Lab report / GP records" },
  { test: /continuity|chain/i, label: "Corrected continuity statement" },
] as const;

/** Strip eval/test/fiction markers from solicitor-facing text. */
export function sanitizeSolicitorText(text: string): string {
  return text
    .replace(/\s*\(fiction\)/gi, "")
    .replace(/\bfiction\s*:/gi, "")
    .replace(/\bfictional\b/gi, "")
    .replace(/\bfor test data only\b/gi, "")
    .replace(/\btest data\b/gi, "")
    .replace(/\btraining data\b/gi, "")
    .replace(/\|\s*Messiness:\s*[^.|]+/gi, "")
    .replace(/\bMessiness:\s*\S+/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function cleanStageLabel(stage: string): string {
  let s = sanitizeSolicitorText(stage);
  const beforePipe = s.split("|")[0]?.trim();
  if (beforePipe) s = beforePipe;
  return s || "Stage not confirmed on file — check bundle header.";
}

function cleanAllegationLabel(allegation: string): string {
  return sanitizeSolicitorText(allegation);
}

function isUnknownAllegation(label: string): boolean {
  const l = label.trim().toLowerCase();
  return (
    !l ||
    l.startsWith("unknown") ||
    l.includes("add charge sheet") ||
    l.startsWith("offence wording not safely extracted")
  );
}

/** Drop eval fragments, defence-account quotes in CPS context, and cut-off sentences. */
function isUnusableQuotedSourceLine(line: string): boolean {
  const l = sanitizeSolicitorText(line);
  if (!l || l.length < 12) return true;
  if (/\(fiction\)|fiction:|fictional|test data|training data|messiness/i.test(line)) return true;
  if (/\bthe defence account\b/i.test(l)) return true;
  if (/\ballegation\s*\(/i.test(l) && /fiction/i.test(line)) return true;
  if (/\bcrown say events unfolded in a way\b/i.test(l)) return true;
  if (/\bevents unfolded in a way\s*$/i.test(l)) return true;
  if (/\bpush vs punch\b/i.test(l) && l.length < 140) return true;
  if (/\bdenies core allegation or\b/i.test(l) && l.length < 100) return true;
  if (l.length > 45 && !/[.!?]"?$/.test(l) && /\b(the|a|an|crown|allegation|defence|events)\b/i.test(l)) {
    return true;
  }
  return false;
}

function uniqueLines(items: string[], max = 12): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const s = sanitizeSolicitorText(raw ?? "");
    if (!s || seen.has(s) || isUnusableQuotedSourceLine(s)) continue;
    seen.add(s);
    out.push(s);
    if (out.length >= max) break;
  }
  return out;
}

function bulletBlock(lines: string[]): string {
  if (!lines.length) return "";
  return lines.map((l) => `• ${l}`).join("\n");
}

function allFileText(ctx: ControlRoomAssistantContext): string {
  return [
    ctx.bundleSnippets?.mg5,
    ctx.bundleSnippets?.mg6,
    ctx.bundleSnippets?.exhibits,
    ctx.fileTextHints,
    ctx.missingEvidence.join("\n"),
    collectAnchorText(ctx.battleboard),
  ]
    .filter(Boolean)
    .join("\n");
}

function collectAnchorText(bb: BattleboardOutput | null): string {
  if (!bb) return "";
  return bb.routes.flatMap((r) => r.evidence_anchors).join("\n");
}

function fileMentionsGenericCustody(fileText: string, kind: "bwv" | "custody_record" | "custody_cctv"): boolean {
  const t = fileText.toLowerCase();
  if (kind === "bwv") return /\bbwv\b|body\s*worn/.test(t);
  if (kind === "custody_record") return /custody record/.test(t);
  return /custody cctv/.test(t);
}

export function filterGenericChaseLines(lines: string[], fileText: string): string[] {
  return lines
    .map((line) => sanitizeSolicitorText(line))
    .filter((line) => {
      if (!line) return false;
      const l = line.toLowerCase();
      if (/\bbwv\b|body\s*worn/.test(l) && !fileMentionsGenericCustody(fileText, "bwv")) return false;
      if (/custody record/.test(l) && !fileMentionsGenericCustody(fileText, "custody_record")) return false;
      if (/custody cctv/.test(l) && !fileMentionsGenericCustody(fileText, "custody_cctv")) return false;
      return !isUnusableQuotedSourceLine(line);
    });
}

export function parseMg6OutstandingLines(mg6Text: string | null | undefined): string[] {
  if (!mg6Text?.trim()) return [];
  const out: string[] = [];
  for (const line of mg6Text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || /^[-=|]+$/.test(trimmed)) continue;
    if (/^category\s*\|/i.test(trimmed)) continue;
    if (!trimmed.includes("|")) continue;

    const parts = trimmed.split("|").map((p) => p.trim()).filter(Boolean);
    if (parts.length < 2) continue;

    const category = sanitizeSolicitorText(parts[0]);
    const served = parts[1] ?? "";
    const awaiting = parts[2] ?? parts[1] ?? "";
    const note = parts[3] ?? "";
    const combined = `${awaiting} ${note} ${served}`.toLowerCase();

    const isOutstanding =
      /await|outstanding|not yet|to be provided|unsigned|pending|master|fuller|signed copy|corrected|lab report|gp record|engineer note|reconciliation/i.test(
        combined,
      ) && !/^yes\s*\(served\)\s*$/i.test(awaiting.trim());

    if (isOutstanding) {
      const detail = sanitizeSolicitorText(awaiting || note || served);
      out.push(`${category}: ${detail}`);
    }
  }

  return uniqueLines(out, 14);
}

function buildClientAccountSummary(fileText: string): string {
  const t = fileText.toLowerCase();
  if (/no comment.*technical|no comment on certain technical/i.test(t)) {
    return "Partial account on file; may deny the core allegation or give an alternative explanation; no comment on some technical matters; request for full CCTV/999 disclosure scope.";
  }
  if (/partial account.*denies|denies core allegation/i.test(t)) {
    return "Partial account on file; denies the core allegation or an alternative explanation — check the interview summary before the meeting.";
  }
  return "Check the interview summary on file before the client meeting.";
}

type ClassifiedExhibit = { code: string; role: "proof" | "disclosure" };

function classifyExhibitRole(code: string, context: string): ClassifiedExhibit["role"] {
  const c = code.toUpperCase();
  if (/EX-MG6-EMAIL|MG6-EMAIL/i.test(c)) return "disclosure";
  if (/\(chase\)/i.test(context) && /EX-MG6|MG6-EMAIL/i.test(c)) return "disclosure";
  if (/^EX-CAD-|^EX-CCTV-|^EX-999-/i.test(c)) return "proof";
  if (/^EX-MG6/i.test(c) && /chase|email/i.test(c)) return "disclosure";
  return "proof";
}

export function classifyExhibitsFromFile(
  exhibitsText: string | null | undefined,
  anchorText: string,
): ClassifiedExhibit[] {
  const blob = `${exhibitsText ?? ""}\n${anchorText}`;
  const found = new Map<string, ClassifiedExhibit>();
  for (const m of blob.matchAll(/\b(EX-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*)\b/gi)) {
    const code = m[1].toUpperCase();
    const idx = m.index ?? 0;
    const context = blob.slice(Math.max(0, idx - 20), idx + code.length + 40).toLowerCase();
    found.set(code, { code, role: classifyExhibitRole(code, context) });
  }
  return [...found.values()];
}

type DerivedFileContext = {
  fileText: string;
  mg6Outstanding: string[];
  hasMg6Schedule: boolean;
  proofExhibits: string[];
  disclosureExhibits: string[];
  displayStage: string;
  cleanAllegation: string;
  primaryHook: string | null;
};

function buildDerived(ctx: ControlRoomAssistantContext): DerivedFileContext {
  const fileText = allFileText(ctx);
  const mg6Outstanding = parseMg6OutstandingLines(ctx.bundleSnippets?.mg6);
  const hasMg6Schedule =
    Boolean(ctx.bundleSnippets?.mg6?.trim()) ||
    /mg6\s*\(a\)|schedule of initial disclosure/i.test(fileText);
  const classified = classifyExhibitsFromFile(ctx.bundleSnippets?.exhibits, collectAnchorText(ctx.battleboard));
  const rawStage = ctx.bundleHeader?.stage?.trim() || ctx.stage?.trim() || "";
  const rawHook = ctx.bundleHeader?.primaryEvalHook?.trim() || ctx.primaryRouteTitle?.trim() || null;

  return {
    fileText,
    mg6Outstanding,
    hasMg6Schedule,
    proofExhibits: classified.filter((e) => e.role === "proof").map((e) => e.code),
    disclosureExhibits: classified.filter((e) => e.role === "disclosure").map((e) => e.code),
    displayStage: cleanStageLabel(rawStage),
    cleanAllegation: cleanAllegationLabel(ctx.allegation),
    primaryHook: rawHook ? sanitizeSolicitorText(rawHook) : null,
  };
}

function filterBattleboardLines(lines: string[], derived: DerivedFileContext): string[] {
  return lines
    .map((l) => sanitizeSolicitorText(l))
    .filter((l) => {
      if (!l || isUnusableQuotedSourceLine(l)) return false;
      if (derived.hasMg6Schedule && THIN_BUNDLE_NO_MG6_RE.test(l)) return false;
      if (/ex-mg6-email/i.test(l) && !/disclosure|chase/.test(l)) return false;
      return true;
    });
}

/** Concise prosecution-route summary — no raw MG5 fragments or defence-account quotes. */
function buildCpsAnswer(ctx: ControlRoomAssistantContext, derived: DerivedFileContext): string {
  const t = derived.fileText.toLowerCase();
  const allegationPhrase = isUnknownAllegation(derived.cleanAllegation)
    ? "the charged allegation"
    : `the ${derived.cleanAllegation}`;

  const basis: string[] = [];
  if (/stop\s*search|bad character/i.test(t)) basis.push("stop-search context");
  if (/message|context|drug|pwits|possession|supply/i.test(t)) {
    basis.push("messages or context if served");
  }
  if (/mg11|witness statement/i.test(t)) basis.push("MG11 evidence");
  const media: string[] = [];
  if (/cctv/.test(t)) media.push("CCTV");
  if (/999/.test(t)) media.push("999");
  if (/cad/.test(t)) media.push("CAD");
  if (media.length) basis.push(`${media.join(", ")} material where present`);

  const basisText =
    basis.length > 0 ? basis.join(", ") : derived.primaryHook ?? "the served source material on file";

  let answer = `CPS may put ${allegationPhrase} allegation on the basis of ${basisText}.`;

  const exhibitNote = buildServedExhibitsNote(derived);
  if (exhibitNote) answer += ` ${exhibitNote}`;

  const disclosurePressure =
    derived.hasMg6Schedule || derived.mg6Outstanding.length > 0
      ? "The defence pressure point is disclosure: MG6 still shows source material outstanding, so the route should not be fixed until those items are served and checked."
      : "Defence pressure may turn on what is actually served — reconcile the file before fixing the route.";

  return `${answer}\n\n${disclosurePressure}`;
}

function buildServedExhibitsNote(derived: DerivedFileContext): string {
  const proof = derived.proofExhibits;
  const disclosure = derived.disclosureExhibits;
  if (!proof.length && !disclosure.length) return "";

  const hasCad = proof.some((c) => /^EX-CAD-/i.test(c));
  const cadNeedsReconciliation =
    hasCad &&
    (derived.mg6Outstanding.some((m) => /cad|dispatch/i.test(m.toLowerCase())) ||
      /fuller cad|cad.*narrative/i.test(derived.fileText.toLowerCase()));

  let note = "";
  if (proof.length) {
    note = `Crown may also reference served/source exhibits such as ${proof.join(", ")} if proved`;
    if (cadNeedsReconciliation) {
      note += ", noting the CAD material may still need fuller narrative reconciliation";
    }
    note += ".";
  }
  if (disclosure.length) {
    note += ` Disclosure/chase material only: ${disclosure.join(", ")}.`;
  }
  return note;
}

function buildOrderedMg6ChaseItems(derived: DerivedFileContext): string[] {
  const items: string[] = [];
  const mg6Blob = derived.mg6Outstanding.map((m) => m.toLowerCase()).join("\n");

  for (const { test, label } of CANONICAL_MG6_CHASE) {
    if (derived.mg6Outstanding.some((m) => test.test(m.toLowerCase())) || test.test(mg6Blob)) {
      items.push(label);
    }
  }

  return uniqueLines(items, CANONICAL_MG6_CHASE.length);
}

function buildDisclosureChaseLetter(ctx: ControlRoomAssistantContext, derived: DerivedFileContext): string {
  const items = buildOrderedMg6ChaseItems(derived);

  if (!items.length) {
    return [
      "Dear Officer in the Case,",
      "",
      "We act for the defendant.",
      "",
      "Please confirm MG6(a) served vs outstanding items and expected service dates.",
      "",
      "Solicitor review required before sending.",
      "",
      "Yours faithfully,",
    ].join("\n");
  }

  return [
    "Dear Officer in the Case,",
    "",
    "We act for the defendant.",
    "",
    "Please confirm service of the following outstanding material:",
    "",
    ...items.map((c) => `• ${c}`),
    "",
    "Please confirm what has been served, what remains outstanding, and the expected service dates before the next hearing.",
    "",
    "Solicitor review required before sending.",
    "",
    "Yours faithfully,",
  ].join("\n");
}

function buildEvidenceChaseAnswer(ctx: ControlRoomAssistantContext, derived: DerivedFileContext): string {
  const mg6Items = buildOrderedMg6ChaseItems(derived);
  const fromParsed =
    mg6Items.length > 0
      ? mg6Items
      : derived.mg6Outstanding.map((m) => sanitizeSolicitorText(m.replace(/^[^:]+:\s*/, "").trim() || m));

  if (!fromParsed.length) {
    const missingOnly = uniqueLines(
      ctx.missingEvidence.map((m) => sanitizeSolicitorText(m)).filter(Boolean),
      6,
    );
    if (!missingOnly.length) return "";
    return `Priority disclosure/source material to chase:\n\n${bulletBlock(missingOnly)}`;
  }

  const extras = uniqueLines(
    ctx.missingEvidence
      .map((m) => sanitizeSolicitorText(m))
      .filter((m) => {
        if (!m) return false;
        const ml = m.toLowerCase();
        return !fromParsed.some((i) => i.toLowerCase().includes(ml.slice(0, Math.min(14, ml.length))));
      }),
    2,
  );

  let body = `Priority disclosure/source material to chase:\n\n${bulletBlock(fromParsed)}`;
  if (extras.length) body += `\n\n${bulletBlock(extras)}`;
  return body;
}

type RouteRiskBucket = {
  id: string;
  label: string;
  fileSupports: (fileText: string) => boolean;
  matchesBattleboard: (risk: string) => boolean;
};

/** Priority-ordered route risks — one label per semantic bucket. */
const ROUTE_RISK_BUCKETS: RouteRiskBucket[] = [
  {
    id: "cctv_timing",
    label: "full CCTV supports the Crown timing",
    fileSupports: (t) => /\bcctv|footage|video\b/.test(t),
    matchesBattleboard: (r) => /\bcctv|footage|video|digital source|master file\b/i.test(r),
  },
  {
    id: "mg11",
    label: "MG11 evidence is consistent and served",
    fileSupports: (t) => /\bmg11|witness statement\b/.test(t),
    matchesBattleboard: (r) => /\bmg11|witness statement\b/i.test(r),
  },
  {
    id: "cad999",
    label: "CAD/999 timing supports the Crown sequence",
    fileSupports: (t) => /\b999|cad|dispatch\b/.test(t),
    matchesBattleboard: (r) => /\b999|cad|dispatch\b/i.test(r),
  },
  {
    id: "account_conflict",
    label: "the client account conflicts with served source material",
    fileSupports: (t) => /\bdenies|conflict|partial account|account\b/.test(t),
    matchesBattleboard: (r) => /\baccount|conflict|client account\b/i.test(r) && !/\badmission\b/i.test(r),
  },
  {
    id: "interview_admission",
    label: "interview admissions narrow the available route",
    fileSupports: (t) => /\badmission|no comment on\b/.test(t),
    matchesBattleboard: (r) => /\badmission|interview\b/i.test(r),
  },
  {
    id: "expert",
    label: "expert or source material comes back against the defence",
    fileSupports: (t) => /\bexpert|forensic|lab|gp|medical\b/.test(t),
    matchesBattleboard: (r) => /\bexpert|forensic|lab|gp|medical\b/i.test(r),
  },
  {
    id: "continuity",
    label: "continuity/provenance is later proved on served material",
    fileSupports: (t) => /\bcontinuity|provenance|chain of\b/.test(t),
    matchesBattleboard: (r) => /\bcontinuity|provenance\b/i.test(r),
  },
];

function routeRiskSemanticKey(text: string): string {
  const l = text.toLowerCase();
  for (const bucket of ROUTE_RISK_BUCKETS) {
    if (bucket.matchesBattleboard(l)) return bucket.id;
  }
  if (/continuity|provenance/.test(l)) return "continuity";
  if (/cctv|footage|digital source/.test(l)) return "cctv_timing";
  if (/mg11|witness/.test(l)) return "mg11";
  if (/999|cad/.test(l)) return "cad999";
  if (/account|conflict/.test(l)) return "account_conflict";
  if (/admission|interview/.test(l)) return "interview_admission";
  if (/expert|forensic|lab/.test(l)) return "expert";
  return l.slice(0, 40);
}

function collectBattleboardCollapseRisks(ctx: ControlRoomAssistantContext): string[] {
  const bb = ctx.battleboard;
  const primary = bb?.primary_route;
  return [
    ...(bb?.global_collapse_risks ?? []),
    ...(primary?.collapse_risks ?? []),
    ...(bb?.routes ?? []).flatMap((r) => r.collapse_risks),
    ctx.positionNotice ? sanitizeSolicitorText(ctx.positionNotice) : "",
  ]
    .map((r) => sanitizeSolicitorText(r))
    .filter((r) => r && !isUnusableQuotedSourceLine(r));
}

function buildRouteWeakensAnswer(ctx: ControlRoomAssistantContext, derived: DerivedFileContext): string {
  const file = derived.fileText.toLowerCase();
  const boardRisks = collectBattleboardCollapseRisks(ctx);
  const boardBucketIds = new Set<string>();
  for (const risk of boardRisks) {
    for (const bucket of ROUTE_RISK_BUCKETS) {
      if (bucket.matchesBattleboard(risk)) boardBucketIds.add(bucket.id);
    }
  }

  const bullets: string[] = [];
  const usedKeys = new Set<string>();

  for (const bucket of ROUTE_RISK_BUCKETS) {
    if (bullets.length >= 5) break;
    if (!bucket.fileSupports(file) && !boardBucketIds.has(bucket.id)) continue;
    bullets.push(bucket.label);
    usedKeys.add(bucket.id);
  }

  for (const risk of boardRisks) {
    if (bullets.length >= 5) break;
    const key = routeRiskSemanticKey(risk);
    if (usedKeys.has(key)) continue;
    if (risk.length > 160) continue;
    bullets.push(risk);
    usedKeys.add(key);
  }

  if (!bullets.length) return "";
  return `This route weakens or collapses if:\n\n${bulletBlock(bullets)}`;
}

function buildClientExplanation(ctx: ControlRoomAssistantContext, derived: DerivedFileContext): string {
  const primary = ctx.battleboard?.primary_route;
  const focus =
    primary?.route_type === "disclosure" || /disclosure|source material/i.test(primary?.title ?? "")
      ? "Disclosure/source-material pressure"
      : sanitizeSolicitorText(primary?.title ?? "Disclosure/source-material pressure");

  const parts = [
    `Stage on file: ${derived.displayStage}`,
    !isUnknownAllegation(derived.cleanAllegation)
      ? `Allegation on file: ${derived.cleanAllegation}`
      : "",
    derived.primaryHook
      ? `Main issue: ${derived.primaryHook}`
      : "Main issue: disclosure and source-material pressure on file",
    `Current focus: ${focus}`,
    `Account on file: ${buildClientAccountSummary(derived.fileText)}`,
    "What happens next: your solicitor should record instructions, chase outstanding disclosure, and confirm the hearing line before you rely on it.",
    "Your solicitor must confirm this before you rely on it.",
  ].filter(Boolean);

  return parts.join("\n\n");
}

export function hasBattleboardFallbackData(ctx: ControlRoomAssistantContext): boolean {
  const bb = ctx.battleboard;
  if (bb) {
    if (
      bb.routes.length > 0 ||
      bb.global_collapse_risks.length > 0 ||
      bb.urgent_next_moves.length > 0 ||
      Boolean(bb.solicitor_safe_summary?.trim())
    ) {
      return true;
    }
  }
  if (parseMg6OutstandingLines(ctx.bundleSnippets?.mg6).length > 0) return true;
  if (ctx.missingEvidence.length > 0) return true;
  return false;
}

export function isSuggestedPrompt(text: string): text is SuggestedPrompt {
  return (SUGGESTED_PROMPTS as readonly string[]).includes(text);
}

export function tryLocalSuggestedAnswer(
  prompt: SuggestedPrompt,
  ctx: ControlRoomAssistantContext,
): string | null {
  if (!hasBattleboardFallbackData(ctx)) return null;

  const derived = buildDerived(ctx);
  const bb = ctx.battleboard;
  const primary = bb?.primary_route;
  switch (prompt) {
    case "What would CPS argue?": {
      const body = buildCpsAnswer(ctx, derived);
      if (!body.trim()) return null;
      return `${FALLBACK_INTRO}\n\n${body}`;
    }

    case "What evidence should I chase?": {
      const body = buildEvidenceChaseAnswer(ctx, derived);
      if (!body.trim()) return null;
      return `${FALLBACK_INTRO}\n\n${body}`;
    }

    case "What would make us lose?": {
      const body = buildRouteWeakensAnswer(ctx, derived);
      if (!body.trim()) return null;
      return `${FALLBACK_INTRO}\n\n${body}`;
    }

    case "What can I safely say at hearing?": {
      const line = primary?.hearing_line?.trim();
      if (!line) return null;
      const safety = primary?.safety_note?.trim();
      const parts = [
        `Safe provisional line: ${sanitizeSolicitorText(line)}`,
        "Do not overstate. This is disclosure pressure only, conditional on served material, MG6 reconciliation, and client instructions.",
        safety ? sanitizeSolicitorText(safety) : "",
      ].filter(Boolean);
      return `${FALLBACK_INTRO}\n\n${parts.join("\n\n")}`;
    }

    case "Explain this to client": {
      const body = buildClientExplanation(ctx, derived);
      if (!body.trim()) return null;
      return `${FALLBACK_INTRO}\n\n${body}`;
    }

    case "Draft disclosure chase": {
      return `${FALLBACK_INTRO}\n\n${buildDisclosureChaseLetter(ctx, derived)}`;
    }

    default:
      return null;
  }
}

export function buildBattleboardTimeoutFallback(ctx: ControlRoomAssistantContext): string | null {
  if (!hasBattleboardFallbackData(ctx)) return null;

  const derived = buildDerived(ctx);
  const bb = ctx.battleboard;
  const primary = bb?.primary_route;
  const parts = uniqueLines([
    primary?.title ? `Best route (provisional): ${sanitizeSolicitorText(primary.title)}` : "",
    derived.mg6Outstanding[0] ? `Priority chase: ${derived.mg6Outstanding[0]}` : "",
    ...(bb?.global_collapse_risks ?? []).slice(0, 1).map((r) => `Main collapse risk: ${sanitizeSolicitorText(r)}`),
    ...(primary?.collapse_risks ?? []).slice(0, 1).map((r) => `Route collapse risk: ${sanitizeSolicitorText(r)}`),
    ...(bb?.urgent_next_moves ?? [])
      .filter((m) => filterGenericChaseLines([m], derived.fileText).length > 0)
      .slice(0, 1)
      .map((m) => `Next move: ${sanitizeSolicitorText(m)}`),
    primary?.hearing_line
      ? `Safe hearing line (conditional): ${sanitizeSolicitorText(primary.hearing_line)}`
      : "",
  ]);

  if (!parts.length) return null;
  return `${FALLBACK_INTRO}\n\n${parts.join("\n\n")}`;
}

export function isAssistantUpstreamFailure(status: number, rawError?: string): boolean {
  if (status === 429 || status === 504) return true;
  const e = (rawError ?? "").toLowerCase();
  return e.includes("timed out") || e.includes("rate limit") || /ran out of time/.test(e);
}
