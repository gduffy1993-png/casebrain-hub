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
    .replace(/\s+(may|might|could|unless|if)\b.*$/i, "")
    .replace(/\s+(is|are)\s+challenged\b.*$/i, "")
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
      `Chronology pressure: Crown will try to regularise ${primarySignal} with late continuity/timing fixes.`
    );
    judgeConstraints.push(
      "Chronology test: court will ask whether the timing conflict is material to live offence elements."
    );
    defenceCounters.push(
      "Continuity demand: require dated timing metadata now; record non-compliance and seek case-management directions."
    );
    hearingLines.push("Hearing stance: chronology remains contested; oppose plea-readiness until defects are cured.");
  }

  if (lane === "disclosure") {
    cpsPressure.push(
      `Disclosure pressure: Crown will frame disclosure as complete unless ${primarySignal} is challenged on deadline.`
    );
    judgeConstraints.push(
      "Disclosure test: court expects specific requests and clear materiality before hearing."
    );
    defenceCounters.push(
      "Disclosure demand: serve a dated item-by-item schedule; if deadlines slip, seek directions immediately."
    );
    hearingLines.push(`Hearing stance: disclosure remains incomplete at ${stage}; not ready for plea or settled merits.`);
  }

  if (lane === "witness") {
    cpsPressure.push(
      `Witness pressure: Crown will rely on final wording and downplay inconsistency around ${primarySignal}.`
    );
    judgeConstraints.push(
      "Witness test: court tolerates minor variance unless defence ties it to a core contested issue."
    );
    defenceCounters.push(
      "Witness challenge: pin version-to-version wording/timing changes and force adoption of one account."
    );
    hearingLines.push("Hearing stance: witness reliability is contested and requires version-specific testing before plea posture shifts.");
  }

  if (signals.offenceType === "violence") {
    judgeConstraints.push("Violence framing: court will test act elements, attribution, and reliability to criminal standard.");
    hearingLines.push("Defence posture: put to proof on act mechanics, attribution, and reliability.");
  } else if (signals.offenceType === "weapon") {
    judgeConstraints.push("Weapon framing: court will scrutinise consistency across dispatch, witness, and schedule records.");
    hearingLines.push("Defence posture: weapon allegation reliability is contested and must be proven by consistent records.");
  } else if (signals.offenceType === "dishonesty") {
    judgeConstraints.push("Dishonesty framing: court will focus on trail coherence and inference of dishonesty.");
    hearingLines.push("Defence posture: challenge trail coherence and inference against the accused.");
  }

  if (lane === "general" || cpsPressure.length === 0) {
    cpsPressure.push("General pressure: Crown will narrow disputed issues and frame the file as hearing-ready.");
  }
  if (judgeConstraints.length === 0) {
    judgeConstraints.push("Court will prioritise case management readiness and concrete issue definition.");
  }
  if (defenceCounters.length === 0) {
    defenceCounters.push("Counter-step: issue a written contradiction schedule now and require Crown responses by deadline.");
  }
  if (hearingLines.length === 0) {
    hearingLines.push(
      `Hearing stance: defence remains ${stance}; maintain not-ready-for-plea until live elements are supported on settled disclosure.`
    );
  }

  if (signals.thinCase) {
    hearingLines.unshift(`Thin-bundle warning: keep procedural pressure; avoid merits concessions until primary disclosure is served at ${stage}.`);
  }

  return { cpsPressure, judgeConstraints, defenceCounters, hearingLines };
}

