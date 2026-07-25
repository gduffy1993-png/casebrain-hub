/**
 * Affirmative PACE / no-breach gate.
 * Never emit CHECKED_NO_BREACHES, "PACE OK", or "no breach" when
 * custody/interview clocks conflict or provenance is incomplete.
 */

import {
  detectCustodyInterviewClockFromText,
  type CanonicalFinding,
} from "@/lib/criminal/canonical-finding-model";
import { isProvenanceSufficient, type FindingProvenance } from "@/lib/criminal/finding-provenance";

export type PaceAffirmativeStatus = "UNKNOWN" | "CHECKED_NO_BREACHES" | "BREACH_FLAGGED";

export type PaceGateInput = {
  custodyRecord?: "present" | "missing" | "unclear" | null;
  interviewRecording?: "present" | "missing" | "unclear" | null;
  legalAdviceLog?: "present" | "missing" | "unclear" | null;
  breachesDetected?: string[] | null;
  /** Free-text for clock conflict detection. */
  bundleText?: string | null;
  clockConflict?: boolean | null;
  provenance?: FindingProvenance | null;
  /** Existing canonical findings that may include custody_interview_clock. */
  findings?: CanonicalFinding[] | null;
  criticalMaterialMissing?: boolean | null;
};

export type PaceGateResult = {
  paceStatus: PaceAffirmativeStatus;
  allowAffirmativeOk: boolean;
  statusMessage: string;
  blockReasons: string[];
};

/**
 * Single shared gate for pace route, key-facts, and procedural checklist builders.
 */
export function gatePaceAffirmativeStatus(input: PaceGateInput): PaceGateResult {
  const breaches = (input.breachesDetected ?? []).filter(Boolean);
  const blockReasons: string[] = [];

  const clockFromFindings = (input.findings ?? []).some(
    (f) => f.kind === "custody_interview_clock" && f.custodyInterviewClock?.conflict,
  );
  const clockFromText = input.bundleText
    ? detectCustodyInterviewClockFromText(input.bundleText).conflict
    : false;
  const clockConflict = Boolean(input.clockConflict) || clockFromFindings || clockFromText;
  if (clockConflict) {
    blockReasons.push("Custody / interview timestamps conflict");
  }

  if (input.provenance && !isProvenanceSufficient(input.provenance)) {
    blockReasons.push("Exact PACE provenance incomplete");
  }
  if (!input.provenance) {
    blockReasons.push("PACE provenance not supplied");
  }

  const unclear =
    input.custodyRecord === "unclear" ||
    input.interviewRecording === "unclear" ||
    input.legalAdviceLog === "unclear" ||
    input.custodyRecord == null ||
    input.interviewRecording == null ||
    input.legalAdviceLog == null;
  if (unclear) {
    blockReasons.push("Custody, interview or legal-advice state unclear");
  }

  const missing =
    input.criticalMaterialMissing === true ||
    input.custodyRecord === "missing" ||
    input.interviewRecording === "missing" ||
    input.legalAdviceLog === "missing";
  if (missing) {
    blockReasons.push("Critical PACE material missing");
  }

  if (breaches.length > 0) {
    return {
      paceStatus: "BREACH_FLAGGED",
      allowAffirmativeOk: false,
      statusMessage: "PACE breaches detected",
      blockReasons: [...blockReasons, ...breaches],
    };
  }

  if (blockReasons.length > 0) {
    return {
      paceStatus: "UNKNOWN",
      allowAffirmativeOk: false,
      statusMessage: `PACE status: UNKNOWN — ${blockReasons.join("; ")}. Do not treat as PACE OK or no breach.`,
      blockReasons,
    };
  }

  // All critical present, no breaches, no clock conflict, provenance sufficient.
  return {
    paceStatus: "CHECKED_NO_BREACHES",
    allowAffirmativeOk: true,
    statusMessage: "No PACE breaches detected (in provided material)",
    blockReasons: [],
  };
}

/** Forbidden affirmative copy when gate blocks. */
export function forbiddenPaceAffirmativeCopy(text: string): boolean {
  return /\bPACE\s+compliance:\s*OK\b|\bCHECKED_NO_BREACHES\b|\bno\s+PACE\s+breaches\b|\bno\s+breach(?:es)?\b/i.test(
    text,
  );
}

/**
 * Sanitize solicitor-visible PACE lines — strip affirmative OK / no-breach when gated off.
 */
export function sanitizePaceAffirmativeLine(
  line: string,
  gate: PaceGateResult,
): string | null {
  if (gate.allowAffirmativeOk) return line;
  if (forbiddenPaceAffirmativeCopy(line)) {
    return gate.statusMessage;
  }
  return line;
}
