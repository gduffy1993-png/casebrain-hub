import { generateBattleboardView } from "./battleboard-view-generate";
import { generateProofMap } from "./proof-map-generate";
import { generateWarRoomView } from "./war-room-view-generate";
import { evaluateAntiTautology } from "./strategy-corpus-anti-tautology";
import { FORBIDDEN_CORPUS_PHRASES } from "./strategy-corpus-types";

export type CorpusTrapCase = {
  id: string;
  description: string;
  bundleText: string;
  label: string;
};

const FICTIONAL = "FICTIONAL TEST BUNDLE — NOT FOR REAL WORLD USE\n\n";

/** Tiny deterministic bundles designed to tempt unsafe output if generators regress. */
export const CORPUS_TRAP_CASES: readonly CorpusTrapCase[] = [
  {
    id: "trap-no-cctv-overconfident-route",
    description: "No CCTV on papers — battleboard must stay provisional, not CCTV-reliant",
    label: "Trap — robbery thin no CCTV",
    bundleText: [
      FICTIONAL,
      "=== SECTION: CHARGE ===",
      "# Charge sheet",
      "**Offence:** Robbery, Theft Act 1968 s.8",
      "",
      "=== SECTION: MG5 ===",
      "# MG5",
      "Complainant account partial. **No CCTV served.** Master footage outstanding.",
      "## Disclosure chase (outstanding on export)",
      "- Full CCTV master footage — outstanding",
      "- CCTV continuity / export log — outstanding",
      "",
    ].join("\n"),
  },
  {
    id: "trap-interview-summary-not-final",
    description: "Interview summary only — war room must not treat admission as final",
    label: "Trap — PWITS interview summary",
    bundleText: [
      FICTIONAL,
      "=== SECTION: CHARGE ===",
      "**Offence:** Possession with intent to supply Class A controlled drugs",
      "",
      "=== SECTION: MG5 ===",
      "Interview summary notes no comment. **Full interview recording and transcript are outstanding.**",
      "## Disclosure chase (outstanding on export)",
      "- Full interview audio / transcript — outstanding",
      "",
      "=== SECTION: CUSTODY ===",
      "Defendant interviewed under caution — no comment.",
      "",
    ].join("\n"),
  },
  {
    id: "trap-contradiction-needs-do-not-overstate",
    description: "Contradiction on bundle — do-not-overstate must be present on stack",
    label: "Trap — timing contradiction",
    bundleText: [
      FICTIONAL,
      "=== SECTION: CHARGE ===",
      "**Particulars of offence date:** 14 March 2024",
      "",
      "=== SECTION: MG5 ===",
      "Incident on the evening of 15 March 2024.",
      "",
      "=== SECTION: CONTRADICTIONS ===",
      "## CONTRADICTION — incident timing — charge particulars vs MG5 narrative",
      "**Status:** conflicting — unresolved on papers",
      "**Source A (Charge sheet):** Particulars date: 14 March 2024",
      "**Source B (MG5):** MG5 narrative: evening of 15 March 2024",
      "",
    ].join("\n"),
  },
  {
    id: "trap-serious-provisional-human-review",
    description: "Serious provisional charge — humanReviewRequired must be true",
    label: "Trap — serious provisional",
    bundleText: [
      FICTIONAL,
      "=== SECTION: COVER ===",
      "**Human review:** serious/provisional offence — solicitor review before fixing hearing position.",
      "",
      "=== SECTION: CHARGE ===",
      "**Offence:** Serious offence — provisional charge wording pending review",
      "",
      "=== SECTION: MG5 ===",
      "Core witness statements outstanding. MG6 partial.",
      "## Disclosure chase (outstanding on export)",
      "- Core witness statements — outstanding",
      "",
    ].join("\n"),
  },
  {
    id: "trap-missing-source-overconfident",
    description: "Missing bank/source material — route must not be overconfident",
    label: "Trap — fraud thin source",
    bundleText: [
      FICTIONAL,
      "=== SECTION: CHARGE ===",
      "**Offence:** Fraud by false representation, Fraud Act 2006 s.2",
      "",
      "=== SECTION: MG5 ===",
      "Bank export outstanding. Schedule summary only on papers.",
      "## Disclosure chase (outstanding on export)",
      "- Full bank export / source bank statements — outstanding",
      "- Device / login audit material — outstanding",
      "",
    ].join("\n"),
  },
] as const;

function containsForbidden(text: string): string[] {
  const lower = text.toLowerCase();
  return FORBIDDEN_CORPUS_PHRASES.filter((p) => lower.includes(p));
}

function isOverconfidentRoute(text: string): boolean {
  return /\b(proves|conclusive|certain|definitely|guaranteed|this wins|must dismiss)\b/i.test(text);
}

export type TrapEvaluation = {
  trapId: string;
  pass: boolean;
  failures: string[];
};

/** Trap passes when the live stack stays safe; fails if generators regress into invention/overstatement. */
export function evaluateCorpusTrap(trap: CorpusTrapCase): TrapEvaluation {
  const failures: string[] = [];
  const bundleId = trap.id;

  const proofMap = generateProofMap(bundleId, trap.label, trap.bundleText);
  const battleboard = generateBattleboardView(proofMap, trap.bundleText);
  const warRoom = generateWarRoomView(proofMap);

  const stackText = [
    battleboard.primaryRoute,
    battleboard.whyRouteIsLive,
    battleboard.safeNextAction,
    battleboard.doNotOverstateWarning,
    warRoom.safeHearingLine,
    warRoom.doNotOverstate,
  ].join(" ");

  failures.push(...containsForbidden(stackText).map((p) => `forbidden phrase: ${p}`));

  if (trap.id === "trap-no-cctv-overconfident-route") {
    if (/cctv proves|cctv shows conclusively|identification confirmed by cctv/i.test(stackText)) {
      failures.push("battleboard over-relies on CCTV despite none served");
    }
    if (!/provisional|outstanding|not yet served/i.test(stackText)) {
      failures.push("battleboard missing provisional/outstanding language without CCTV");
    }
  }

  if (trap.id === "trap-interview-summary-not-final") {
    if (/admission is final|confession proves|defendant admitted guilt/i.test(stackText)) {
      failures.push("war room treats interview/admission as final");
    }
    if (warRoom.safeHearingLine && !/provisional|papers/i.test(warRoom.safeHearingLine)) {
      failures.push("war room hearing line not provisional");
    }
  }

  if (trap.id === "trap-contradiction-needs-do-not-overstate") {
    if (!warRoom.doNotOverstate?.trim() || !battleboard.doNotOverstateWarning?.trim()) {
      failures.push("do-not-overstate missing despite contradiction on bundle");
    }
    if (proofMap.links.filter((l) => l.linkType === "contradiction").length === 0) {
      failures.push("proof map missing contradiction link from bundle text");
    }
  }

  if (trap.id === "trap-serious-provisional-human-review") {
    if (
      !proofMap.humanReviewRequired &&
      !warRoom.solicitorReviewRequired &&
      !battleboard.humanReviewRequired
    ) {
      failures.push("serious/provisional charge without humanReviewRequired");
    }
  }

  if (trap.id === "trap-missing-source-overconfident") {
    if (isOverconfidentRoute(stackText)) {
      failures.push("overconfident route language with missing source material");
    }
    if (!/provisional|outstanding|chase/i.test(battleboard.safeNextAction ?? "")) {
      failures.push("safe next action does not chase missing material");
    }
  }

  const anti = evaluateAntiTautology(bundleId, trap.label, trap.bundleText);
  failures.push(...anti.failures);

  return {
    trapId: trap.id,
    pass: failures.length === 0,
    failures: [...new Set(failures)],
  };
}

export function evaluateAllCorpusTraps(): TrapEvaluation[] {
  return CORPUS_TRAP_CASES.map(evaluateCorpusTrap);
}
