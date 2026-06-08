import type { ReasoningV2ViewModel } from "@/lib/criminal/reasoning-v2/reasoning-v2-types";
import { sanitizeClientStressLine } from "./client-stress-sanitize";
import {
  buildClientInstructionChecklist,
  buildDoNotConcedeGuards,
  slice2ContextFromReasoning,
} from "./build-client-stress-slice2";
import type {
  ClientAccountOption,
  ClientStressInput,
  ClientStressOutcome,
  ClientStressResult,
} from "./client-stress-types";
import { CLIENT_ACCOUNT_OPTIONS } from "./client-stress-types";

function dedupe(lines: string[], cap = 8): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const s = sanitizeClientStressLine(line);
    if (!s) continue;
    const key = s.toLowerCase().slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= cap) break;
  }
  return out;
}

function labelForOption(value: ClientAccountOption): string {
  return CLIENT_ACCOUNT_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

function itemsMatching(
  items: Array<{ label: string; sourceBasis?: string }>,
  patterns: RegExp[],
): string[] {
  return items
    .filter((i) => matchesAny(`${i.label} ${i.sourceBasis ?? ""}`, patterns))
    .map((i) =>
      sanitizeClientStressLine(
        `${i.label} — ${i.sourceBasis || "on served papers"} (source section on file)`,
      ),
    );
}

function offenceFamily(charge: string): "motoring" | "pwits" | "violence" | "robbery" | "fraud" | "generic" {
  const c = charge.toLowerCase();
  if (/dangerous driving|careless|motoring|rta/i.test(c)) return "motoring";
  if (/pwits|intent to supply|class a|possession with intent/i.test(c)) return "pwits";
  if (/section\s*18|section\s*20|gbh|wounding|violence/i.test(c)) return "violence";
  if (/robbery|burglary.*person/i.test(c)) return "robbery";
  if (/fraud|dishonesty|false representation/i.test(c)) return "fraud";
  return "generic";
}

function buildAccountSummary(input: ClientStressInput): string {
  const labels = input.selectedOptions
    .filter((o) => o !== "other_short_note")
    .map(labelForOption);
  const parts = [
    "Structured client account (provisional — not verified against full papers):",
    labels.length ? labels.join("; ") : "No structured option selected",
  ];
  if (input.selectedOptions.includes("other_short_note") && input.otherNote) {
    parts.push(`Other note (sanitized): ${input.otherNote}`);
  }
  if (input.selectedOptions.includes("no_comment_limited_instructions")) {
    parts.push("Limited instructions — assessment remains conditional.");
  }
  return sanitizeClientStressLine(parts.join(" "));
}

function genericQuestions(options: ClientAccountOption[], family: ReturnType<typeof offenceFamily>): string[] {
  const q: string[] = [];
  if (options.includes("no_comment_limited_instructions")) {
    q.push("What instructions can the client safely give on the account before the next hearing step?");
  }
  if (options.includes("denies_presence") || options.includes("mistaken_identity")) {
    q.push("Instructions on presence, location, timeline, and identification (CCTV stills vs master/export if relevant).");
  }
  if (options.includes("denies_participation") || options.includes("accepts_presence_disputes_role")) {
    q.push("Instructions on role, participation, and attribution — do not merge with Crown narrative on papers.");
  }
  if (options.includes("denies_possession") || options.includes("accepts_possession_disputes_supply")) {
    q.push("Instructions on possession, knowledge, packaging, and personal use vs supply — chase phone/lab if outstanding.");
  }
  if (options.includes("denies_intent")) {
    q.push("Instructions on intent/knowledge elements — provisional until served messages, lab, or attribution material.");
  }
  if (options.includes("self_defence")) {
    q.push("Instructions on threat, force used, retreat, injuries, sequence, and witnesses — compare to served CCTV/CAD/medical.");
  }
  if (options.includes("accident_no_dangerous_standard") || family === "motoring") {
    q.push("Instructions on driving standard, causation, and collision sequence — chase CCTV master, expert, CAD/999 if relevant.");
  }
  if (family === "motoring" && options.includes("denies_presence")) {
    q.push("Instructions on driver identity — ANPR/officer observations may be partial only on current papers.");
  }
  return q;
}

function stressForOptions(
  reasoning: ReasoningV2ViewModel,
  input: ClientStressInput,
): ClientStressResult {
  const opts = input.selectedOptions;
  const family = offenceFamily(reasoning.charge);
  const helping = reasoning.evidenceHelpingDefence;
  const hurting = reasoning.evidenceHurtingDefence;
  const missing = reasoning.missingMaterial;
  const contradictions = reasoning.contradictions;

  const supports: string[] = [];
  const undermines: string[] = [];
  const missingLines: string[] = [];
  const conflicts: string[] = [];
  const questions: string[] = [];

  const idPatterns = [/identif/i, /cctv/i, /visual/i, /witness/i, /turnbull/i, /participation/i, /attribution/i];
  const driverPatterns = [/driver/i, /anpr/i, /vehicle/i, /motor/i, /cctv/i];
  const pwitsPatterns = [/phone/i, /sim/i, /lab/i, /packag/i, /supply/i, /intent/i, /message/i, /cash/i];
  const violencePatterns = [/injur/i, /gbh/i, /medical/i, /cctv/i, /bwv/i, /cad/i, /999/i, /witness/i, /self[- ]?defen/i];
  const motoringPatterns = [/driv/i, /standard/i, /collision/i, /cctv/i, /expert/i, /cad/i];

  for (const m of missing) {
    missingLines.push(
      sanitizeClientStressLine(`${m.label} — outstanding or partial on served papers (${m.sourceSection}).`),
    );
  }

  for (const c of contradictions) {
    conflicts.push(
      sanitizeClientStressLine(
        `${c.label} — unresolved on papers; do not treat as agreed fact (${c.sourceSection}).`,
      ),
    );
  }

  if (opts.includes("denies_presence") || opts.includes("mistaken_identity")) {
    supports.push(
      ...itemsMatching(helping, [...idPatterns, /missing/i, /partial/i, /outstanding/i]),
      ...reasoning.proofPointsUnderPressure
        .filter((p) => matchesAny(p.label, idPatterns))
        .map((p) =>
          sanitizeClientStressLine(
            `${p.label} — pressure on identification/participation remains on papers (${p.pressureCount} pressure link(s)).`,
          ),
        ),
    );
    undermines.push(
      ...itemsMatching(hurting, idPatterns),
      ...itemsMatching(helping, [/served/i, /supports crown/i, /identification/i]),
    );
    if (family === "motoring") {
      supports.push(
        sanitizeClientStressLine(
          "Driver identity remains unresolved on served papers if CCTV master/export or attribution material is outstanding — do not state the client was not driving.",
        ),
      );
      missingLines.push(
        ...itemsMatching(missing, driverPatterns),
        ...reasoning.disclosureChasePriorities
          .filter((d) => matchesAny(d.label, driverPatterns))
          .map((d) => sanitizeClientStressLine(`Chase: ${d.label}${d.chaseNote ? ` — ${d.chaseNote}` : ""}.`)),
      );
    }
  }

  if (opts.includes("denies_participation") || opts.includes("accepts_presence_disputes_role")) {
    supports.push(...itemsMatching(helping, idPatterns));
    undermines.push(...itemsMatching(hurting, [/participation/i, /role/i, /cctv/i]));
    if (opts.includes("accepts_presence_disputes_role")) {
      supports.push(
        sanitizeClientStressLine(
          "Role/participation dispute may align with attribution pressure on papers — route remains conditional.",
        ),
      );
    }
  }

  if (opts.includes("denies_possession") || opts.includes("denies_intent")) {
    supports.push(...itemsMatching(helping, pwitsPatterns));
    undermines.push(...itemsMatching(hurting, pwitsPatterns));
    missingLines.push(...itemsMatching(missing, pwitsPatterns));
  }

  if (opts.includes("accepts_possession_disputes_supply")) {
    supports.push(
      sanitizeClientStressLine(
        "Supply vs personal-use dispute is provisional — compare quantity, packaging, messages, phone attribution, cash, and lab continuity on papers.",
      ),
      ...itemsMatching(helping, [/personal/i, /user/i, /knowledge/i]),
    );
    undermines.push(...itemsMatching(hurting, [/supply/i, /deal/i, /intent/i, /commercial/i]));
    missingLines.push(...itemsMatching(missing, [/phone/i, /lab/i, /download/i, /extraction/i]));
    if (missing.some((m) => matchesAny(m.label, [/phone/i, /lab/i]))) {
      supports.push(
        sanitizeClientStressLine(
          "Supply element remains provisional while phone/lab/source material is outstanding on served papers.",
        ),
      );
    }
  }

  if (opts.includes("self_defence")) {
    const selfDefHelp = helping.filter((h) =>
      matchesAny(`${h.label} ${h.sourceBasis}`, [/self[- ]?defen/i, /first aggression/i, /complainant/i]),
    );
    if (selfDefHelp.length) {
      supports.push(
        ...selfDefHelp.map((h) =>
          sanitizeClientStressLine(
            `${h.label} — only if supported on served papers; do not merge accounts (${h.sourceSection}).`,
          ),
        ),
      );
    } else {
      supports.push(
        sanitizeClientStressLine(
          "Complainant-first-aggression or threat support is not established on current served papers — provisional only.",
        ),
      );
    }
    undermines.push(
      ...itemsMatching(hurting, violencePatterns),
      ...reasoning.collapseRisks
        .filter((r) => matchesAny(r, [/proportion/i, /injur/i, /force/i, /retreat/i]))
        .map(sanitizeClientStressLine),
    );
    missingLines.push(...itemsMatching(missing, violencePatterns));
  }

  if (opts.includes("accident_no_dangerous_standard") || (family === "motoring" && opts.includes("denies_presence"))) {
    supports.push(...itemsMatching(helping, motoringPatterns));
    undermines.push(...itemsMatching(hurting, motoringPatterns));
    missingLines.push(...itemsMatching(missing, [/cctv/i, /expert/i, /cad/i, /999/i]));
  }

  if (opts.includes("no_comment_limited_instructions")) {
    supports.push(
      sanitizeClientStressLine(
        "Limited instructions — account cannot be safely assessed against the proof map until solicitor takes further instructions.",
      ),
    );
    missingLines.push(
      sanitizeClientStressLine(
        "Further client instructions required before aligning account to served material.",
      ),
    );
  }

  if (!supports.length && reasoning.whyRouteIsLive) {
    supports.push(
      sanitizeClientStressLine(
        `Primary route on papers (${reasoning.primaryRoute}) — conditional support only; compare account to proof points, not client assertion alone.`,
      ),
    );
  }

  if (!undermines.length && hurting.length) {
    undermines.push(
      ...hurting.slice(0, 3).map((h) =>
        sanitizeClientStressLine(`${h.label} — may undermine account on served papers (${h.sourceSection}).`),
      ),
    );
  }

  questions.push(...genericQuestions(opts, family));
  for (const d of reasoning.disclosureChasePriorities.slice(0, 4)) {
    if (d.safeAction) questions.push(sanitizeClientStressLine(`Chase / record: ${d.safeAction}`));
  }

  const whatWouldChangeRoute = dedupe(
    [...reasoning.routeChangeTriggers, ...reasoning.collapseRisks],
    6,
  );

  const whatNotToOverstate = dedupe(
    [
      reasoning.doNotOverstateWarning,
      reasoning.warRoom.doNotOverstate,
      "Do not state the client account is proved or disproved — compare to served papers only.",
      opts.includes("denies_presence") && family === "motoring"
        ? "Do not tell the court the client was not driving without full driver-ID and CCTV master/export on file."
        : "",
      opts.includes("self_defence")
        ? "Do not assert self-defence is established unless sequence/threat/force is source-backed."
        : "",
    ].filter(Boolean),
    5,
  );

  const solicitorReviewReasons = [...reasoning.humanReviewReasons];
  if (missing.length >= 3) {
    solicitorReviewReasons.push("Outstanding material on papers — account vs proof map comparison provisional.");
  }
  if (conflicts.length) {
    solicitorReviewReasons.push("Unresolved source conflicts — solicitor review before fixing position.");
  }
  if (opts.includes("no_comment_limited_instructions")) {
    solicitorReviewReasons.push("Limited client instructions — solicitor review required.");
  }

  const solicitorReviewRequired =
    reasoning.humanReviewRequired ||
    reasoning.warRoom.solicitorReviewRequired ||
    solicitorReviewReasons.length > 0 ||
    missing.length >= 2;

  const slice2Ctx = slice2ContextFromReasoning(reasoning, opts);
  const clientInstructionChecklist = buildClientInstructionChecklist(slice2Ctx);
  const doNotConcedeGuards = buildDoNotConcedeGuards(slice2Ctx);
  const checklistQuestions = clientInstructionChecklist.map((c) => c.questionText);

  return {
    available: true,
    accountSummary: buildAccountSummary(input),
    supportsAccount: dedupe(supports, 8),
    underminesAccount: dedupe(undermines, 8),
    missingBeforeAssessment: dedupe(missingLines, 8),
    sourceConflicts: dedupe(conflicts, 6),
    clientInstructionQuestions: dedupe([...questions, ...checklistQuestions], 12),
    clientInstructionChecklist,
    doNotConcedeGuards,
    whatWouldChangeRoute,
    whatNotToOverstate,
    solicitorReviewRequired,
    solicitorReviewReasons: dedupe(solicitorReviewReasons, 6),
  };
}

export function buildClientStressResult(
  reasoning: ReasoningV2ViewModel | null | undefined,
  input: ClientStressInput,
): ClientStressOutcome {
  if (!reasoning) {
    return { available: false, reason: "no_reasoning" };
  }
  if (!input.selectedOptions.length) {
    return { available: false, reason: "no_account_selected" };
  }

  const otherNote =
    input.selectedOptions.includes("other_short_note") && input.otherNote
      ? input.otherNote
      : null;

  return stressForOptions(reasoning, {
    selectedOptions: input.selectedOptions,
    otherNote,
  });
}
