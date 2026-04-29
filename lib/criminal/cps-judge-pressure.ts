export type PressureSignals = {
  hasTimelineIssue?: boolean;
  hasDisclosureGap?: boolean;
  hasWitnessConflict?: boolean;
  offenceType?: "violence" | "weapon" | "dishonesty" | "unknown";
  stageLabel?: string;
  stanceLabel?: string;
};

export type PressureOutput = {
  cpsPressure: string[];
  judgeConstraints: string[];
  defenceCounters: string[];
  hearingLines: string[];
};

export function buildPressureLayer(signals: PressureSignals): PressureOutput {
  const cpsPressure: string[] = [];
  const judgeConstraints: string[] = [];
  const defenceCounters: string[] = [];
  const hearingLines: string[] = [];

  const stage = signals.stageLabel?.trim() || "current stage";
  const stance = signals.stanceLabel?.trim() || "put to proof";

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
    hearingLines.push("Material chronology contradictions remain unresolved and go to reliability.");
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
    hearingLines.push(`Disclosure is incomplete at ${stage} and the case is not ready for a settled merits position.`);
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
    hearingLines.push("Witness-account variation is material and requires version-specific testing.");
  }

  if (signals.offenceType === "violence") {
    judgeConstraints.push("Court will test core act elements, attribution, and reliability beyond reasonable doubt.");
    hearingLines.push("The defence position is put to proof on core act elements and attribution.");
  } else if (signals.offenceType === "weapon") {
    judgeConstraints.push("Court will scrutinise weapon allegation consistency across dispatch, witness, and schedule records.");
    hearingLines.push("Weapon allegation reliability is contested and must be proven with consistent source records.");
  } else if (signals.offenceType === "dishonesty") {
    judgeConstraints.push("Court will focus on transaction/document trail coherence and inference of dishonesty.");
    hearingLines.push("The defence challenges document-trail coherence and inference against the accused.");
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
  if (hearingLines.length === 0) {
    hearingLines.push(
      `Defence posture remains ${stance} and requires the Crown to prove each live element on settled disclosure.`
    );
  }

  return { cpsPressure, judgeConstraints, defenceCounters, hearingLines };
}

