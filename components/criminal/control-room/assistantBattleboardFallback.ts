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
    return "Your account on file: partial account; may deny the core allegation or give an alternative explanation; no comment on some technical matters; request for full CCTV/999 disclosure scope.";
  }
  if (/partial account.*denies|denies core allegation/i.test(t)) {
    return "Your account on file: partial account; denies core allegation or alternative explanation offered — check interview summary on file.";
  }
  return "Your account on file: check interview summary on file before the client meeting.";
}

type ClassifiedExhibit = { code: string; role: "proof" | "disclosure" };

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
    const role: ClassifiedExhibit["role"] =
      /mg6|email|chase|disclosure/.test(context) || /mg6-email/.test(code.toLowerCase())
        ? "disclosure"
        : "proof";
    found.set(code, { code, role });
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

/** Synthesised Crown pressure — no raw MG5 fragments or defence-account quotes. */
function buildCpsPressureLines(ctx: ControlRoomAssistantContext, derived: DerivedFileContext): string[] {
  const t = derived.fileText.toLowerCase();
  const allegation = derived.cleanAllegation;

  const crownElements: string[] = [];
  if (!isUnknownAllegation(allegation)) crownElements.push(allegation);
  if (/stop\s*search|bad character/i.test(t)) crownElements.push("stop-search context");
  if (/bad character|mg6.*character/i.test(t)) crownElements.push("MG6 bad-character/disclosure tension on file");
  if (/message|context|drug|pwits|possession|supply/i.test(t)) crownElements.push("messages/context supporting the drug narrative");
  if (/mg11|witness statement/i.test(t)) crownElements.push("draft or served MG11");
  if (/cctv|999|cad/.test(t)) crownElements.push("served partial CCTV, 999, and/or CAD material (scope to reconcile)");

  const lines: string[] = [];

  if (!isUnknownAllegation(allegation)) {
    lines.push(
      `Put ${allegation} to proof on the served material (check exact charge wording on the charge sheet).`,
    );
  } else {
    lines.push("Put the charged allegation to proof — check exact wording on the charge sheet.");
  }

  if (crownElements.length > 1) {
    lines.push(
      `CPS may rely on the ${crownElements.join(", ")} — conditional on what is actually served and proved at trial.`,
    );
  } else if (derived.primaryHook) {
    lines.push(`CPS narrative pressure on file may centre on: ${derived.primaryHook} — conditional.`);
  }

  for (const code of derived.proofExhibits) {
    lines.push(`Exhibit on file (Crown may reference if served): ${code}`);
  }

  if (derived.disclosureExhibits.length > 0) {
    lines.push(`Disclosure/chase only (not Crown proof): ${derived.disclosureExhibits.join(", ")}`);
  }

  const bb = ctx.battleboard;
  if (bb) {
    const anchors = uniqueLines(
      (bb.primary_route?.evidence_anchors ?? [])
        .concat(bb.routes.flatMap((r) => r.evidence_anchors))
        .filter((a) => !/ex-mg6|mg6-email|\(chase\)/i.test(a))
        .map((a) => `Material referenced on file: ${sanitizeSolicitorText(a)}`),
      3,
    );
    lines.push(...anchors);
    const summary = filterBattleboardLines([bb.solicitor_safe_summary], derived);
    if (summary[0] && summary[0].length < 200) lines.push(summary[0]);
  }

  if (derived.hasMg6Schedule) {
    lines.push("MG6(a) schedule on file — reconcile served vs outstanding before fixing hearing lines.");
  }

  return uniqueLines(lines, 8);
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

  const extraMissing = ctx.missingEvidence
    .map((m) => sanitizeSolicitorText(m))
    .filter((m) => {
      if (!m) return false;
      const ml = m.toLowerCase();
      return !items.some((i) => i.toLowerCase().includes(ml.slice(0, Math.min(18, ml.length))));
    })
    .slice(0, 2)
    .map((m) => `Please serve/confirm: ${m}`);

  const body = uniqueLines([...items, ...extraMissing], 10);

  if (!body.length) {
    return [
      "Dear Officer in Case,",
      "We act for the defendant. Please confirm MG6(a) served vs outstanding items and dates.",
      "Yours faithfully,",
    ].join("\n");
  }

  return [
    "Dear Officer in Case,",
    "We act for the defendant. Please serve/confirm:",
    ...body.map((c) => `• ${c}`),
    "Please confirm dates served and any material still outstanding before the next hearing.",
    "Conditional — solicitor review before send.",
    "Yours faithfully,",
  ].join("\n");
}

function buildEvidenceChaseList(ctx: ControlRoomAssistantContext, derived: DerivedFileContext): string[] {
  const priority = uniqueLines([
    ...derived.mg6Outstanding.map((m) => `MG6 — ${m}`),
    ...ctx.missingEvidence.map((m) => `Outstanding on file: ${m}`),
  ]);

  const secondary = filterGenericChaseLines(
    uniqueLines([
      ...(ctx.battleboard?.routes ?? [])
        .filter((r) => r.route_type === "disclosure" || r.route_type === "continuity")
        .flatMap((r) => r.next_moves),
      ...(ctx.battleboard?.primary_route?.next_moves ?? []),
      ...(ctx.battleboard?.urgent_next_moves ?? []),
    ]),
    derived.fileText,
  ).filter((line) => !priority.some((p) => p.toLowerCase().includes(line.slice(0, 20).toLowerCase())));

  return uniqueLines([...priority, ...secondary], 10);
}

function buildClientExplanation(ctx: ControlRoomAssistantContext, derived: DerivedFileContext): string[] {
  const primary = ctx.battleboard?.primary_route;
  const focus =
    primary?.route_type === "disclosure" || /disclosure|source material/i.test(primary?.title ?? "")
      ? "Disclosure/source-material pressure"
      : sanitizeSolicitorText(primary?.title ?? "Disclosure/source-material pressure");

  return uniqueLines(
    [
      `Stage on file: ${derived.displayStage}.`,
      !isUnknownAllegation(derived.cleanAllegation)
        ? `Allegation on file: ${derived.cleanAllegation}.`
        : "",
      derived.primaryHook ? `Main issue: ${derived.primaryHook}.` : "Main issue: disclosure and source-material pressure on file.",
      `Current focus: ${focus}.`,
      buildClientAccountSummary(derived.fileText),
      "Position remains provisional until solicitor records instructions.",
      "This is not legal advice — explain options calmly; solicitor to confirm before the client relies on any line.",
    ],
    8,
  );
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
  const prefix = "From file Battleboard (conditional — solicitor review required):\n\n";

  switch (prompt) {
    case "What would CPS argue?": {
      const lines = buildCpsPressureLines(ctx, derived);
      if (!lines.length) return null;
      return prefix + bulletBlock(lines);
    }

    case "What evidence should I chase?": {
      const chase = buildEvidenceChaseList(ctx, derived);
      if (!chase.length) return null;
      return prefix + bulletBlock(chase);
    }

    case "What would make us lose?": {
      const risks = uniqueLines([
        ...(bb?.global_collapse_risks ?? []),
        ...(primary?.collapse_risks ?? []),
        ...(bb?.routes ?? []).flatMap((r) => r.collapse_risks),
        ctx.positionNotice ? sanitizeSolicitorText(ctx.positionNotice) : "",
        derived.primaryHook
          ? `If ${derived.primaryHook} is not managed on instructions, the route may weaken — conditional.`
          : "",
      ]);
      if (!risks.length) return null;
      return prefix + bulletBlock(risks.slice(0, 6));
    }

    case "What can I safely say at hearing?": {
      const line = primary?.hearing_line?.trim();
      const safety = primary?.safety_note?.trim();
      if (!line && !safety) return null;
      const parts = uniqueLines([
        line ? `Provisional hearing line: ${sanitizeSolicitorText(line)}` : "",
        safety ? `Safety: ${sanitizeSolicitorText(safety)}` : "",
        "Do not overstate — conditional on served material, MG6 reconciliation, and client instructions.",
      ]);
      return prefix + parts.join("\n\n");
    }

    case "Explain this to client": {
      const parts = buildClientExplanation(ctx, derived);
      if (parts.length < 2) return null;
      return prefix + parts.join("\n\n");
    }

    case "Draft disclosure chase": {
      return prefix + buildDisclosureChaseLetter(ctx, derived);
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
  return parts.join("\n\n") + "\n\nSolicitor review required — not a prediction of outcome.";
}

export function isAssistantUpstreamFailure(status: number, rawError?: string): boolean {
  if (status === 429 || status === 504) return true;
  const e = (rawError ?? "").toLowerCase();
  return e.includes("timed out") || e.includes("rate limit") || /ran out of time/.test(e);
}
