import type { FiveAnswersEvidenceRow } from "@/lib/criminal/five-answers/types";
import type { FamilyProofCard, FamilyProofCardId, ProofSafeAction } from "./types";

type FamilySpec = {
  id: FamilyProofCardId;
  title: string;
  trigger: RegExp;
  bundleTrigger?: RegExp;
  safeSummary: string;
  defaultAction: ProofSafeAction;
  blockedExamples: string[];
  rowMatch?: RegExp;
};

const FAMILY_SPECS: FamilySpec[] = [
  {
    id: "phone_attribution",
    title: "Phone attribution gap",
    trigger: /phone|subscriber|handset|extraction|ufed|screenshot|whatsapp|sms/i,
    bundleTrigger: /phone|subscriber|handset|extraction|ufed|screenshot/i,
    rowMatch: /phone|subscriber|attribution|extraction|screenshot/i,
    safeSummary:
      "Schedule or papers reference handset or subscriber material — review before stating who operated the line or sent messages.",
    defaultAction: "chase",
    blockedExamples: ["Proves defendant sent the messages.", "Phone confirms guilt."],
  },
  {
    id: "cctv_stills_vs_master",
    title: "CCTV — stills vs master",
    trigger: /cctv|stills|footage|master|camera/i,
    bundleTrigger: /cctv|stills|camera|footage/i,
    rowMatch: /cctv|stills|master|footage/i,
    safeSummary:
      "Stills or clips may be served without master recording or continuity — review before treating stills as full identification proof.",
    defaultAction: "chase",
    blockedExamples: ["CCTV proves identification beyond reasonable doubt.", "Full footage confirms timeline"],
  },
  {
    id: "bwv_referred_only",
    title: "BWV referred only",
    trigger: /bwv|body[-\s]?worn|bodycam/i,
    bundleTrigger: /bwv|body[-\s]?worn|bodycam/i,
    rowMatch: /bwv|body[-\s]?worn/i,
    safeSummary:
      "Body-worn video is listed or referred on schedule but full export may not be on the bundle — review before describing footage content.",
    defaultAction: "chase",
    blockedExamples: ["Officer camera shows defendant committing offence.", "BWV confirms account"],
  },
  {
    id: "co_defendant_only",
    title: "Co-defendant material",
    trigger: /co-?defendant|other defendant|wrong defendant|not attributable to this defendant/i,
    rowMatch: /co-?defendant|other defendant|target defendant/i,
    safeSummary:
      "Some material relates to another defendant — segregate from this client's proof before court or client-facing use.",
    defaultAction: "do-not-use",
    blockedExamples: [
      "Co-defendant implicates your client — joint enterprise proven.",
      "Use co-defendant interview in client summary.",
    ],
  },
  {
    id: "youth_safeguards",
    title: "Youth safeguards",
    trigger: /youth|yjs|appropriate adult|under 18|vulnerability assessment/i,
    bundleTrigger: /youth|yjs|appropriate adult|under 18/i,
    rowMatch: /youth|yjs|appropriate adult|vulnerability/i,
    safeSummary:
      "Youth or safeguard material may be partial — confirm appropriate adult, recording, and YJS papers before stating interview admissibility.",
    defaultAction: "check",
    blockedExamples: ["Interview admissible — no youth issues.", "Safeguards confirmed"],
  },
  {
    id: "medical_report_missing",
    title: "Medical report missing",
    trigger: /medical|injury|gbh|fme|triage|hospital/i,
    bundleTrigger: /medical|injury|mg21|hospital|triage/i,
    rowMatch: /medical|injury|triage|hospital/i,
    safeSummary:
      "Injury or medical evidence alleged but full medical report may not be served — review before stating injury mechanism from non-medical sources alone.",
    defaultAction: "chase",
    blockedExamples: ["Medical evidence confirms injury severity as charged.", "Expert supports prosecution account"],
  },
  {
    id: "encro_handle",
    title: "Encro handle attribution",
    trigger: /encro|handle mapping|platform extraction|shadow-/i,
    bundleTrigger: /encro|handle|platform/i,
    rowMatch: /encro|handle|platform/i,
    safeSummary:
      "Encrypted comms or handle material present — mapping to this defendant may not be served; review before stating role or identity on the account.",
    defaultAction: "check",
    blockedExamples: ["Handle proves defendant is user.", "Encro messages prove conspiracy"],
  },
  {
    id: "motoring_calibration",
    title: "Motoring device / calibration",
    trigger: /breath|intoxilyser|calibration|speed|device certificate|specimen/i,
    bundleTrigger: /breath|intoxilyser|calibration|device|specimen/i,
    rowMatch: /breath|calibration|intoxilyser|device/i,
    safeSummary:
      "Device-based motoring allegation — calibration certificate or full device record may be outstanding on current papers.",
    defaultAction: "check",
    blockedExamples: ["Reading is conclusive.", "Device properly calibrated"],
  },
  {
    id: "bail_restraining_order",
    title: "Bail / restraining order proof",
    trigger: /bail|restraining order|non-molestation|dvpo|breach of bail/i,
    bundleTrigger: /bail|restraining|non-mol|dvpo|order/i,
    rowMatch: /bail|restraining|order|non-mol/i,
    safeSummary:
      "Order or bail condition material may be extract-only — confirm served order text and proof of service before quoting conditions.",
    defaultAction: "check",
    blockedExamples: ["Defendant clearly breached valid order", "Conditions as stated in charge"],
  },
  {
    id: "expert_evidence_missing",
    title: "Expert evidence missing",
    trigger: /expert|forensic|dna|fingerprint|cell site|pathology|sfr|lab report/i,
    bundleTrigger: /expert|forensic|dna|fingerprint|cell site|sfr|lab/i,
    rowMatch: /expert|forensic|dna|fingerprint|cell site|lab|sfr/i,
    safeSummary:
      "Expert or forensic report referred on schedule but may not be attached — review before treating expert conclusions as served.",
    defaultAction: "chase",
    blockedExamples: ["Expert supports prosecution.", "Forensic evidence confirms"],
  },
];

function rowsMatch(rows: FiveAnswersEvidenceRow[], re: RegExp): string[] {
  return rows
    .filter((r) => re.test(`${r.label} ${r.note ?? ""}`))
    .map((r) => r.label)
    .slice(0, 4);
}

function hasGapState(rows: FiveAnswersEvidenceRow[], re: RegExp): boolean {
  return rows.some(
    (r) =>
      re.test(`${r.label} ${r.note ?? ""}`) &&
      ["missing", "referred_only", "not_safely_confirmed", "unknown"].includes(r.existence),
  );
}

export function buildFamilyProofCards(
  rows: FiveAnswersEvidenceRow[],
  bundleHay: string,
  allegation: string,
): FamilyProofCard[] {
  const hay = `${bundleHay} ${allegation}`.toLowerCase();
  const cards: FamilyProofCard[] = [];
  const seen = new Set<FamilyProofCardId>();

  for (const spec of FAMILY_SPECS) {
    if (seen.has(spec.id)) continue;
    const bundleOk = spec.bundleTrigger ? spec.bundleTrigger.test(hay) : spec.trigger.test(hay);
    const rowLabels = spec.rowMatch ? rowsMatch(rows, spec.rowMatch) : [];
    const rowOk = rowLabels.length > 0;
    if (!bundleOk && !rowOk) continue;
    if (rowOk && !hasGapState(rows, spec.rowMatch ?? spec.trigger)) {
      const allServed = rows
        .filter((r) => (spec.rowMatch ?? spec.trigger).test(`${r.label} ${r.note ?? ""}`))
        .every((r) => r.existence === "served");
      if (allServed) continue;
    }

    seen.add(spec.id);
    cards.push({
      id: spec.id,
      title: spec.title,
      whyShown: bundleOk
        ? "Bundle or charge shape references this material family."
        : "Truth map rows flag material in this family.",
      safeSummary: spec.safeSummary,
      defaultAction: spec.defaultAction,
      linkedLabels: rowLabels.length ? rowLabels : rowsMatch(rows, spec.trigger).slice(0, 3),
      blockedExamples: spec.blockedExamples,
    });
  }

  return cards.slice(0, 6);
}
