/**
 * Criminal Pack — Violent Offences Beast Mode (UK)
 *
 * Single integration point used by move sequencing:
 * - soft, deterministic offence candidate detection
 * - offence-aware expected evidence selection
 * - deterministic strategic panels (charge stability, judge irritation, PACE/CPIA integrity, optics, etc.)
 *
 * Guardrails:
 * - Decision support only; not legal advice
 * - Never suggests deception, obstruction, evidence tampering, or misleading courts
 * - Always surfaces uncertainty and bundle completeness
 */

import type { EvidenceMap } from "@/lib/strategic/evidence-maps/types";
import type { MoveSequenceInput, CriminalBeastMode } from "@/lib/strategic/move-sequencing/types";
import { detectViolentChargeCandidates } from "./detectChargeCandidates";
import { selectViolentEvidenceProfiles } from "./evidenceMapsViolent";
import { getViolentChargeById } from "./violentCharges";

function normalizeText(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function safeStringify(x: unknown): string {
  try {
    if (!x) return "";
    return typeof x === "string" ? x : JSON.stringify(x);
  } catch {
    return "";
  }
}

function buildCorpus(input: MoveSequenceInput): string {
  const parts: string[] = [];
  for (const d of input.documents) {
    parts.push(d.name ?? "");
    parts.push(d.created_at ?? "");
    parts.push(safeStringify(d.extracted_json));
  }
  for (const t of input.timeline ?? []) {
    parts.push(t.description ?? "");
    parts.push(t.date ?? "");
  }
  return normalizeText(parts.join("\n"));
}

function hasPatterns(corpus: string, patterns: string[]): boolean {
  const p = patterns.map((x) => normalizeText(x)).filter(Boolean);
  if (p.length === 0) return false;
  return p.some((needle) => corpus.includes(needle));
}

function detectSignalBooleans(corpus: string) {
  const includesAny = (terms: string[]) => terms.some((t) => corpus.includes(normalizeText(t)));

  const weaponRecovered = includesAny(["weapon recovered", "knife recovered", "seized", "weapon seized", "found the knife", "exhibit recovered"]);
  const admissions = includesAny(["admitted", "confessed", "i did it", "in interview", "partial admission"]);
  const injurySeverity = includesAny(["icu", "life-threatening", "surgery", "operation", "fracture", "gbh", "serious injury"]);
  const repetition = includesAny(["repeated blows", "multiple blows", "several punches", "kicked repeatedly", "repeatedly"]);
  const targeting = includesAny(["neck", "throat", "head", "chest", "vital", "targeted", "aimed"]);
  const cctvMention = includesAny(["cctv", "footage", "camera"]);
  const cctvClarity = cctvMention && includesAny(["clear", "hd", "high definition", "good quality"]);
  const has999 = includesAny(["999", "call recording", "999 audio"]);
  const hasBwv = includesAny(["bwv", "body worn", "bodycam"]);
  const hasFirstAccount = includesAny(["first account", "initial account", "mg11", "statement"]);
  const amended = includesAny(["amended statement", "supplementary statement", "addendum"]);
  const firstAccountConsistency = has999 && hasBwv && hasFirstAccount && !amended;

  return {
    weaponRecovered,
    admissions,
    injurySeverity,
    repetition,
    targeting,
    CCTVClarity: cctvClarity,
    firstAccountConsistency,
  };
}

function bandFromScore(score: number): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  if (score >= 0.9) return "CRITICAL";
  if (score >= 0.75) return "HIGH";
  if (score >= 0.55) return "MEDIUM";
  return "LOW";
}

function bandFromCompleteness(completenessPercent: number, missingCriticalCount: number): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  if (missingCriticalCount > 0) return "CRITICAL";
  if (completenessPercent >= 80) return "HIGH";
  if (completenessPercent >= 55) return "MEDIUM";
  return "LOW";
}

function computeChargeStability(params: {
  corpus: string;
  candidates: Array<{ chargeId: string; confidence: number; why: string[] }>;
}) {
  const { corpus, candidates } = params;
  const signals = detectSignalBooleans(corpus);

  let best = { chargeId: "unknown", label: "Insufficient bundle to assess", score: 0, why: [] as string[] };

  for (const c of candidates) {
    const meta = getViolentChargeById(c.chargeId as any);
    if (!meta) continue;
    const relevance = meta.chargeStabilityInputs;
    const keys = Object.keys(relevance) as Array<keyof typeof relevance>;
    const relevantKeys = keys.filter((k) => relevance[k]);
    const supported = relevantKeys.filter((k) => signals[k]);
    const base = relevantKeys.length === 0 ? 0 : supported.length / relevantKeys.length;
    const combined = base * 0.6 + c.confidence * 0.4;

    if (combined > best.score) {
      best = {
        chargeId: c.chargeId,
        label: meta.label,
        score: combined,
        why: [
          `Candidate confidence: ${Math.round(c.confidence * 100)}% (soft classification).`,
          supported.length > 0
            ? `Bundle supports ${supported.length}/${relevantKeys.length} stability signals (${supported.slice(0, 3).join(", ")}).`
            : `Key stability signals not yet evidenced (missing: ${relevantKeys.slice(0, 3).join(", ")}).`,
        ],
      };
    }
  }

  return {
    mostLikelyChargeToSurvive: best.label,
    stabilityBand: bandFromScore(best.score),
    why: best.why.length > 0 ? best.why : ["Insufficient signals to assess charge stability from the current bundle."],
    guardrail: "Not a prediction. Depends on the full served prosecution case, counsel’s view, and judicial case management decisions.",
  };
}

function computeProceduralIntegrity(corpus: string) {
  const checklist = [
    {
      item: "Custody record (PACE) incl. reviews + legal advice log",
      status: hasPatterns(corpus, ["custody record", "custody review", "legal advice"]) ? "PRESENT" : "MISSING",
      whyItMatters: "PACE compliance and contemporaneous custody documentation can affect fairness and admissibility arguments.",
    },
    {
      item: "Interview recording(s) + transcript / log (PACE)",
      status: hasPatterns(corpus, ["interview recording", "audio interview", "video interview", "transcript"]) ? "PRESENT" : "MISSING",
      whyItMatters: "Recording integrity and access to transcript/log is essential for accuracy and admissibility analysis.",
    },
    {
      item: "Disclosure schedules (MG6A/MG6C) + disclosure management documents",
      status: hasPatterns(corpus, ["mg6", "mg6a", "mg6c", "disclosure schedule", "unused material"]) ? "PRESENT" : "MISSING",
      whyItMatters: "Without schedules, disclosure is unmanaged and the bench becomes impatient quickly.",
    },
    {
      item: "CCTV continuity / exhibit logs (where CCTV is in issue)",
      status: hasPatterns(corpus, ["continuity", "exhibit", "chain of custody"]) ? "PRESENT" : "UNCLEAR",
      whyItMatters: "Continuity gaps create disputes over editing/time windows and can derail PTR/trial prep.",
    },
  ] as const;

  const missing = checklist.filter((c) => c.status === "MISSING").length;
  const complianceRisk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" =
    missing >= 3 ? "CRITICAL" : missing === 2 ? "HIGH" : missing === 1 ? "MEDIUM" : "LOW";

  return {
    complianceRisk,
    checklist: checklist.map((c) => ({ ...c, status: c.status as "PRESENT" | "MISSING" | "UNCLEAR" })),
    courtroomMeaning:
      "Procedural integrity issues typically drive disclosure directions, adjournments, and (in appropriate cases) admissibility/fairness arguments. Use professional judgment and counsel’s advice.",
  };
}

function computeJudgeIrritation(params: { corpus: string; proceduralRisk: string; missingCritical: string[] }) {
  const { corpus, proceduralRisk, missingCritical } = params;
  const triggers: string[] = [];
  if (missingCritical.length > 0) triggers.push(`Critical disclosure gaps: ${missingCritical.slice(0, 3).join("; ")}`);
  if (proceduralRisk === "HIGH" || proceduralRisk === "CRITICAL") triggers.push("PACE/CPIA bundle suggests live compliance risk (missing core records).");
  if (corpus.includes("chase") || corpus.includes("reminder")) triggers.push("Chase/reminder language suggests disclosure drift (bench patience risk).");

  const irritationRisk: "LOW" | "MEDIUM" | "HIGH" =
    proceduralRisk === "CRITICAL" || missingCritical.length >= 2 ? "HIGH" : proceduralRisk === "HIGH" || missingCritical.length === 1 ? "MEDIUM" : "LOW";

  const solicitorActions = [
    "Keep a clean disclosure chase trail (dates, who contacted, what asked for).",
    "Ask for a disclosure timetable and confirmation of what exists, in what format, and the served time window.",
    "If still late/partial, seek case management directions / disclosure order (neutral, court-safe).",
  ];

  return {
    irritationRisk,
    triggers: triggers.length > 0 ? triggers : ["No strong bench-irritation triggers detected from the current bundle."],
    solicitorActions,
  };
}

function computeTrialOptics(params: { corpus: string }) {
  const { corpus } = params;
  const signals = detectSignalBooleans(corpus);
  const idWeak = hasPatterns(corpus, ["poor lighting", "dark", "intoxicated", "drunk", "chaos", "crowd"]);

  const howItLooksToJury =
    signals.injurySeverity
      ? "Serious injury increases emotional pull. Defence value often shifts to identification, continuity, and first-account consistency."
      : "Lower injury severity reduces emotional pull; credibility, self-defence plausibility, and consistency dominate.";

  const credibilityPinchPoints: string[] = [];
  if (idWeak) credibilityPinchPoints.push("Identification conditions: lighting/alcohol/chaos indicators suggest higher misidentification risk.");
  if (!signals.CCTVClarity) credibilityPinchPoints.push("CCTV clarity not evidenced in bundle (risk of clip-only reliance).");
  if (!signals.firstAccountConsistency) credibilityPinchPoints.push("First-account trail not clean (999/BWV/first statement alignment unclear).");

  const opticsRisks: string[] = [];
  if (signals.injurySeverity) opticsRisks.push("Jury may lean prosecution on seriousness unless doubt anchors (ID/continuity/first account) are strong.");
  if (signals.weaponRecovered) opticsRisks.push("Weapon recovery can be compelling; continuity and forensics become the legitimate pressure points.");
  if (credibilityPinchPoints.length === 0) opticsRisks.push("No obvious optics red flags detected from current bundle signals.");

  return { howItLooksToJury, credibilityPinchPoints, opticsRisks };
}

function computeAdvanced(params: {
  corpus: string;
  proceduralRisk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  missingCritical: string[];
  completenessBand: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}) {
  const { corpus, proceduralRisk, missingCritical, completenessBand } = params;
  const signals = detectSignalBooleans(corpus);

  const retroHits = ["supplementary statement", "amended statement", "addendum", "created on", "typed up", "late entry"].filter((p) =>
    corpus.includes(normalizeText(p))
  );
  const retrospectiveDocumentationRisk = {
    band: retroHits.length >= 2 ? ("HIGH" as const) : retroHits.length === 1 ? ("MEDIUM" as const) : ("LOW" as const),
    why: retroHits.length
      ? retroHits.slice(0, 3).map((h) => `Matched: "${h}"`)
      : ["No clear late-created / retrospective-record indicators detected in the extracted bundle."],
  };

  const firstAccountSignals = {
    has999: hasPatterns(corpus, ["999", "call recording", "999 audio"]),
    hasBwv: hasPatterns(corpus, ["bwv", "body worn", "bodycam"]),
    hasStatement: hasPatterns(corpus, ["mg11", "statement", "first account", "initial account"]),
    amended: hasPatterns(corpus, ["amended statement", "supplementary statement", "addendum"]),
  };
  const firstAccountConsistency = {
    band: firstAccountSignals.amended
      ? ("HIGH" as const)
      : firstAccountSignals.has999 && firstAccountSignals.hasBwv && firstAccountSignals.hasStatement
        ? ("LOW" as const)
        : ("MEDIUM" as const),
    why: [
      firstAccountSignals.has999 ? "999 audio/call reference present" : "999 audio not evidenced yet",
      firstAccountSignals.hasBwv ? "BWV reference present" : "BWV not evidenced yet",
      firstAccountSignals.hasStatement ? "Statement/first account reference present" : "Statement/first account not evidenced yet",
      firstAccountSignals.amended ? "Amended/supplementary account language detected (consistency risk)" : "No amended/supplementary account language detected",
    ],
  };

  const disclosureBurdenShiftIndicator = {
    band:
      missingCritical.length > 0 || proceduralRisk === "HIGH" || proceduralRisk === "CRITICAL" ? ("HIGH" as const) : completenessBand === "LOW" ? ("MEDIUM" as const) : ("LOW" as const),
    why:
      missingCritical.length > 0
        ? ["Missing primary material (CCTV/BWV/999/MG6) increases the burden on the prosecution to explain what exists, what doesn’t, and why."]
        : ["No strong burden-shift indicators detected beyond routine disclosure management."],
  };

  const hasSelfDefence = hasPatterns(corpus, ["self defence", "self-defence", "defence of another", "reasonable force"]);
  const idWeak = hasPatterns(corpus, ["poor lighting", "dark", "intoxicated", "drunk", "chaos", "crowd"]);
  const altScoreRaw =
    50 +
    (hasSelfDefence ? 15 : 0) +
    (idWeak ? 15 : 0) +
    (!signals.CCTVClarity ? 10 : 0) -
    (signals.admissions ? 20 : 0) -
    (signals.weaponRecovered ? 10 : 0);
  const altScore = Math.max(0, Math.min(100, altScoreRaw));
  const alternativeNarrativeViability = {
    score: altScore,
    band: altScore >= 70 ? ("HIGH" as const) : altScore >= 50 ? ("MEDIUM" as const) : ("LOW" as const),
    why: [
      hasSelfDefence ? "Self-defence language present in bundle" : "No clear self-defence language detected",
      idWeak ? "Witness stress / identification conditions flagged (lighting/alcohol/chaos)" : "No strong witness-stress signals detected",
      signals.CCTVClarity ? "CCTV clarity suggested" : "CCTV clarity not evidenced (or absent)",
      signals.admissions ? "Admission/admission-language present (reduces alternative narrative viability)" : "No admission-language detected",
    ],
  };

  const witnessStressHits = ["poor lighting", "dark", "crowd", "chaos", "intoxicated", "drunk", "seconds", "blurred", "panic"].filter((p) =>
    corpus.includes(normalizeText(p))
  );
  const witnessStressContext = {
    band: witnessStressHits.length >= 3 ? ("HIGH" as const) : witnessStressHits.length >= 1 ? ("MEDIUM" as const) : ("LOW" as const),
    why: witnessStressHits.length ? witnessStressHits.slice(0, 4).map((h) => `Context signal: "${h}"`) : ["No obvious witness-stress context signals detected in extracted text."],
  };

  const expertPrematurityGate = (() => {
    const missingMedical = missingCritical.some((l) => l.toLowerCase().includes("medical") || l.toLowerCase().includes("clinical"));
    const missingPrimaryMedia = missingCritical.some((l) => l.toLowerCase().includes("cctv") || l.toLowerCase().includes("bwv") || l.toLowerCase().includes("999"));
    if (missingMedical || missingPrimaryMedia) {
      return {
        allowExpert: false,
        reason: "Hold expert spend until primary disclosure is pinned down (medical + primary media first). This avoids wasted cost and premature commitment.",
      };
    }
    return {
      allowExpert: true,
      reason: "No obvious expert-prematurity blockers detected from current bundle signals. Still apply cost discipline and counsel review.",
    };
  })();

  const judicialRemedyRadar = (() => {
    const likely: string[] = [];
    const why: string[] = [];
    if (missingCritical.length > 0) {
      likely.push("Disclosure directions / disclosure order");
      why.push("Critical primary material is not evidenced; court often expects a timetable and clarity on existence/format.");
    }
    if (proceduralRisk === "HIGH" || proceduralRisk === "CRITICAL") {
      likely.push("Adjournment risk / trial readiness gating");
      why.push("PACE/CPIA bundle gaps commonly drive adjournments or directions to cure procedural defects.");
      likely.push("Admissibility / fairness arguments (case-specific)");
      why.push("Where integrity gaps are material, the court may need to consider fairness/admissibility — counsel-led decision.");
    }
    if (likely.length === 0) {
      likely.push("Routine case management directions only");
      why.push("No strong remedy triggers detected beyond normal disclosure management.");
    }
    return {
      likelyRemedies: Array.from(new Set(likely)),
      why,
      disclaimer: "Not advice. Remedies are case-specific and depend on the served evidence, court directions, and counsel’s view.",
    };
  })();

  const silenceValueMetric = {
    band: completenessBand === "CRITICAL" || proceduralRisk === "CRITICAL" ? ("HIGH" as const) : completenessBand === "LOW" ? ("MEDIUM" as const) : ("LOW" as const),
    rationale:
      completenessBand === "CRITICAL" || proceduralRisk === "CRITICAL"
        ? "High value in maintaining position discipline until disclosure/continuity is resolved — avoid locking into a narrative before the CPS bundle is stable."
        : "Lower value: bundle appears more stable; limited commitments are safer (still keep room for late disclosure).",
  };

  const caseDegradationOverTime = (() => {
    // Light heuristic: if bundle references "months ago"/"last year" AND key items missing → higher risk.
    const older = hasPatterns(corpus, ["months ago", "last year", "in 2023", "in 2022"]);
    const band = older && (missingCritical.length > 0 || completenessBand === "LOW") ? ("HIGH" as const) : older ? ("MEDIUM" as const) : ("LOW" as const);
    const rationale =
      older
        ? "Time-lapse language present; memory decay and evidence loss become more likely. Prioritise preservation (native media, retention logs) early."
        : "No strong time-degradation indicators detected from extracted text.";
    return { band, rationale };
  })();

  const ifIWereTheJudgeSummary =
    missingCritical.length > 0 || proceduralRisk === "HIGH" || proceduralRisk === "CRITICAL"
      ? `If I were the judge, I would want a clear CPIA timetable and confirmation of what primary material exists (and in what form), plus a clean explanation for any missing retention/continuity gaps. This case does not look ‘trial-ready’ until the disclosure picture is stabilised.`
      : `If I were the judge, I would expect the parties to be able to confirm the core disclosure position, continuity for key exhibits, and a workable PTR/trial timetable. On current signals, this looks more manageable, subject to late disclosure risk.`;

  return {
    retrospectiveDocumentationRisk,
    firstAccountConsistency,
    disclosureBurdenShiftIndicator,
    alternativeNarrativeViability,
    witnessStressContext,
    expertPrematurityGate,
    judicialRemedyRadar,
    silenceValueMetric,
    caseDegradationOverTime,
    ifIWereTheJudgeSummary,
  };
}

function computePositionDiscipline(params: { completenessBand: string; proceduralRisk: string }) {
  const { completenessBand, proceduralRisk } = params;
  if (proceduralRisk === "HIGH" || proceduralRisk === "CRITICAL" || completenessBand === "LOW" || completenessBand === "CRITICAL") {
    return {
      flag: "DISCLOSURE_FIRST" as const,
      rationale: "Prioritise CPIA timetable, MG6 schedules, and primary media integrity before locking a detailed narrative position.",
    };
  }
  if (completenessBand === "HIGH") {
    return {
      flag: "SAFE_TO_COMMIT_PARTIALLY" as const,
      rationale: "Bundle looks materially complete. Commit to limited, testable positions while retaining space for late disclosure.",
    };
  }
  return {
    flag: "HOLD_POSITION" as const,
    rationale: "Some material gaps remain. Keep position disciplined and disclosure-led until missing items resolve.",
  };
}

function computeOutcomeRanges(params: {
  topChargeId: string | null;
  corpus: string;
  irritationRisk: "LOW" | "MEDIUM" | "HIGH";
  completenessBand: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  missingCritical: string[];
}) {
  const { topChargeId, corpus, irritationRisk, completenessBand, missingCritical } = params;
  const signals = detectSignalBooleans(corpus);

  let chargeDowngradeLikelihood: "LOW" | "MEDIUM" | "HIGH" = "MEDIUM";
  if (topChargeId === "gbh_s18_intent" && !signals.targeting && !signals.repetition) chargeDowngradeLikelihood = "HIGH";
  if (topChargeId === "gbh_s18_intent" && (signals.targeting || signals.repetition) && signals.injurySeverity) chargeDowngradeLikelihood = "LOW";

  const disclosureAdjournmentRisk: "LOW" | "MEDIUM" | "HIGH" =
    irritationRisk === "HIGH" || completenessBand === "CRITICAL" ? "HIGH" : irritationRisk === "MEDIUM" || completenessBand === "LOW" ? "MEDIUM" : "LOW";

  const trialReadinessGate =
    missingCritical.length > 0
      ? `Not trial-ready until: ${missingCritical.slice(0, 3).join("; ")}.`
      : completenessBand === "MEDIUM"
        ? "Trial-ready only once disclosure timetable and primary media integrity are confirmed."
        : "No obvious readiness blockers detected from the current bundle (subject to served disclosure and counsel review).";

  return {
    chargeDowngradeLikelihood,
    disclosureAdjournmentRisk,
    trialReadinessGate,
    disclaimer: "Ranges are conditional and for decision support only. Use professional judgment and counsel’s advice.",
  };
}

export function buildCriminalViolentBeastMode(params: {
  input: MoveSequenceInput;
  evidenceMap: EvidenceMap;
}): {
  detection: ReturnType<typeof detectViolentChargeCandidates>;
  selectedEvidenceMap: EvidenceMap;
  beastMode: CriminalBeastMode;
} {
  const { input, evidenceMap } = params;

  const detection = detectViolentChargeCandidates({
    documents: input.documents,
    timeline: input.timeline,
  });

  const selectedProfiles = selectViolentEvidenceProfiles({
    candidates: detection.candidates,
    contextTags: detection.contextTags,
  });

  // Convert offence-aware evidence items into EvidenceMap expectedEvidence (priority-aware)
  const offenceExpectedEvidence = selectedProfiles.expectedEvidence.map((item) => ({
    id: `violent_${item.id}`,
    label: item.label,
    whenExpected: "Disclosure phase / case management (pre-PTR and trial prep)",
    ifMissingMeans: `${item.whyItMatters} Common failure modes: ${item.typicalFailureModes.slice(0, 3).join("; ")}.`,
    probeQuestion: `Request: ${item.label}. ${item.disclosureHook}`,
    detectPatterns: item.detectPatterns,
    priority: item.priority,
    whoUsuallyHoldsIt: item.whoUsuallyHoldsIt,
    disclosureHook: item.disclosureHook,
    typicalFailureModes: item.typicalFailureModes,
  }));

  const merged = new Map<string, any>();
  for (const e of evidenceMap.expectedEvidence ?? []) merged.set(e.id, e);
  for (const e of offenceExpectedEvidence) merged.set(e.id, e);
  const selectedEvidenceMap: EvidenceMap = { ...evidenceMap, expectedEvidence: Array.from(merged.values()) };

  const corpus = buildCorpus(input);

  // Bundle completeness (offence-expected evidence only)
  const expectedCount = selectedProfiles.expectedEvidence.length;
  const missing = selectedProfiles.expectedEvidence.filter((e) => !hasPatterns(corpus, e.detectPatterns));
  const missingCritical = missing.filter((m) => m.priority === "CRITICAL").map((m) => m.label);
  const missingCount = missing.length;
  const completenessPercent = expectedCount === 0 ? 0 : Math.round(((expectedCount - missingCount) / expectedCount) * 100);
  const completenessBand = bandFromCompleteness(completenessPercent, missingCritical.length);

  const proceduralIntegrity = computeProceduralIntegrity(corpus);
  const judgeIrritationMeter = computeJudgeIrritation({ corpus, proceduralRisk: proceduralIntegrity.complianceRisk, missingCritical });
  const chargeStabilityIndex = computeChargeStability({
    corpus,
    candidates: detection.candidates.map((c) => ({ chargeId: c.chargeId, confidence: c.confidence, why: c.why })),
  });
  const trialOptics = computeTrialOptics({ corpus });
  const positionDiscipline = computePositionDiscipline({ completenessBand, proceduralRisk: proceduralIntegrity.complianceRisk });
  const outcomeRanges = computeOutcomeRanges({
    topChargeId: detection.candidates[0]?.chargeId ?? null,
    corpus,
    irritationRisk: judgeIrritationMeter.irritationRisk,
    completenessBand,
    missingCritical,
  });

  const top = detection.candidates[0];
  const candidateText = top ? `${top.label} (${Math.round(top.confidence * 100)}%)` : "No clear violent-offence candidate from current bundle";
  const confidenceAndCompletenessLine = `Confidence & bundle completeness: ${candidateText}. Completeness ${completenessPercent}% (${completenessBand}). Decision support only; apply professional judgment and counsel’s view.`;

  const beastMode: CriminalBeastMode = {
    confidenceAndCompletenessLine,
    detectedCharges: detection.candidates.map((c) => ({ chargeId: c.chargeId, confidence: c.confidence, why: c.why })),
    offenceEvidenceProfiles: selectedProfiles.profiles,
    bundleCompleteness: {
      completenessPercent,
      band: completenessBand,
      expectedCount,
      missingCount,
      missingCritical,
      summaryLine:
        missingCritical.length > 0
          ? `Critical missing items: ${missingCritical.slice(0, 3).join("; ")}`
          : `Missing ${missingCount}/${expectedCount} offence-expected items (based on detected profile).`,
    },
    chargeStabilityIndex,
    judgeIrritationMeter,
    proceduralIntegrity,
    trialOptics,
    positionDiscipline,
    outcomeRanges,
    advanced: computeAdvanced({
      corpus,
      proceduralRisk: proceduralIntegrity.complianceRisk,
      missingCritical,
      completenessBand,
    }),
  };

  return { detection, selectedEvidenceMap, beastMode };
}


