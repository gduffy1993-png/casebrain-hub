export type PressureSignals = {
  hasTimelineIssue?: boolean;
  hasDisclosureGap?: boolean;
  hasWitnessConflict?: boolean;
  offenceType?: "violence" | "weapon" | "dishonesty" | "unknown";
  stageLabel?: string;
  stanceLabel?: string;
  primarySignal?: string;
  thinCase?: boolean;
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
  const rawPrimarySignal = signals.primarySignal?.trim() || "outstanding disclosure items";
  const primarySignal = rawPrimarySignal
    .replace(/^[\-*]\s*/, "")
    .replace(/\s*->.*$/i, "")
    .replace(/\s*\([^)]+\)\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120) || "outstanding disclosure items";

  const lane: "timeline" | "disclosure" | "witness" | "general" =
    signals.hasTimelineIssue ? "timeline" :
    signals.hasDisclosureGap ? "disclosure" :
    signals.hasWitnessConflict ? "witness" :
    "general";

  if (lane === "timeline") {
    cpsPressure.push(
      `Crown will try to cure chronology defects around ${primarySignal} by late continuity/timing reconciliation.`
    );
    judgeConstraints.push(
      "Court will require a clear view on whether chronology conflict is material to live offence elements."
    );
    defenceCounters.push(
      "Require dated continuity and timing metadata now, and record non-compliance for case-management directions."
    );
    hearingLines.push("Position: chronology remains contested and plea readiness is opposed until defects are cured.");
  }

  if (lane === "disclosure") {
    cpsPressure.push(
      `Crown will present disclosure as effectively complete unless ${primarySignal} is challenged with deadlines.`
    );
    judgeConstraints.push(
      "Court expects specific disclosure requests and a clear explanation of materiality before hearing."
    );
    defenceCounters.push(
      "Serve a dated disclosure schedule demand, require item-by-item status, and seek directions if deadlines are missed."
    );
    hearingLines.push(`Position: disclosure remains incomplete at ${stage}; defence is not ready for plea or settled merits.`);
  }

  if (lane === "witness") {
    cpsPressure.push(
      `Crown will rely on final witness wording and downplay inconsistencies linked to ${primarySignal}.`
    );
    judgeConstraints.push(
      "Court will tolerate minor variance only if defence cannot tie inconsistency to a core contested issue."
    );
    defenceCounters.push(
      "Anchor challenge to version-to-version wording and timing changes, and force the witness to adopt one account."
    );
    hearingLines.push("Position: witness reliability is actively contested and requires version-specific testing before plea posture shifts.");
  }

  if (signals.offenceType === "violence") {
    judgeConstraints.push("Court will test core act elements, attribution, and reliability beyond reasonable doubt.");
    hearingLines.push("Defence posture: put to proof on act mechanics, attribution, and reliability.");
  } else if (signals.offenceType === "weapon") {
    judgeConstraints.push("Court will scrutinise weapon allegation consistency across dispatch, witness, and schedule records.");
    hearingLines.push("Defence posture: weapon allegation reliability is contested and must be proven by consistent source records.");
  } else if (signals.offenceType === "dishonesty") {
    judgeConstraints.push("Court will focus on transaction/document trail coherence and inference of dishonesty.");
    hearingLines.push("Defence posture: challenge document-trail coherence and inference against the accused.");
  }

  if (lane === "general" || cpsPressure.length === 0) {
    cpsPressure.push("Crown will attempt to narrow disputed issues and frame the file as hearing-ready.");
  }
  if (judgeConstraints.length === 0) {
    judgeConstraints.push("Court will prioritise case management readiness and concrete issue definition.");
  }
  if (defenceCounters.length === 0) {
    defenceCounters.push("Issue a written contradiction schedule now and require Crown responses by deadline.");
  }
  if (hearingLines.length === 0) {
    hearingLines.push(
      `Defence posture remains ${stance}; maintain not-ready-for-plea position until live elements are supported on settled disclosure.`
    );
  }

  if (signals.thinCase) {
    hearingLines.unshift(`Thin bundle warning: maintain procedural pressure and avoid merits concessions until primary disclosure is served at ${stage}.`);
  }

  return { cpsPressure, judgeConstraints, defenceCounters, hearingLines };
}

