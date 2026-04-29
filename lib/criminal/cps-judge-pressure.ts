export type PressureSignals = {
  hasTimelineIssue?: boolean;
  hasDisclosureGap?: boolean;
  hasWitnessConflict?: boolean;
};

export type PressureOutput = {
  cpsPressure: string[];
  judgeConstraints: string[];
  defenceCounters: string[];
};

export function buildPressureLayer(signals: PressureSignals): PressureOutput {
  const cpsPressure: string[] = [];
  const judgeConstraints: string[] = [];
  const defenceCounters: string[] = [];

  if (signals.hasTimelineIssue) {
    cpsPressure.push(
      "Crown will try to regularise chronology via continuity statements, timing reconciliation, or technical clarification."
    );
    judgeConstraints.push(
      "Court will focus on whether chronology contradictions are material to offence elements."
    );
    defenceCounters.push(
      "Pin timeline conflicts in correspondence now and insist on dated continuity/metadata disclosure."
    );
  }

  if (signals.hasDisclosureGap) {
    cpsPressure.push(
      "Crown may present disclosure as effectively complete unless gaps are challenged with deadlines."
    );
    judgeConstraints.push(
      "Court expects active and specific disclosure engagement before hearing."
    );
    defenceCounters.push(
      "Serve a disclosure audit trail request with deadlines and preserve non-compliance points for case management."
    );
  }

  if (signals.hasWitnessConflict) {
    cpsPressure.push(
      "Crown will rely on final witness wording and minimise draft-to-final inconsistencies."
    );
    judgeConstraints.push(
      "Minor inconsistencies are tolerated unless tied to a core contested issue."
    );
    defenceCounters.push(
      "Anchor cross-examination to version-to-version wording changes and timing differences."
    );
  }

  if (cpsPressure.length === 0) {
    cpsPressure.push("Crown will attempt to tidy presentation and narrow disputed issues before hearing.");
  }
  if (judgeConstraints.length === 0) {
    judgeConstraints.push("Court will prioritise case management readiness and concrete issue definition.");
  }
  if (defenceCounters.length === 0) {
    defenceCounters.push("Document contradictions early and tie each challenge to a specific evidential record.");
  }

  return { cpsPressure, judgeConstraints, defenceCounters };
}

