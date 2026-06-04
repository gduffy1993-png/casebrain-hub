import { extractBundleCaseMetadata } from "@/lib/criminal/extract-bundle-case-metadata";
import { generateExplanationFidelity } from "./explanation-fidelity-generate";
import type { ExplanationBlock, ContradictionBlock } from "./explanation-fidelity-types";
import type {
  ProofMapCaseResult,
  ProofMapLink,
  ProofMapLinkType,
  ProofMapOffenceLens,
  ProofMapProofPoint,
} from "./proof-map-types";
import { FORBIDDEN_PROOF_MAP_PHRASES } from "./proof-map-types";

function detectLens(charge: string, bundleText: string): ProofMapOffenceLens {
  const c = charge.toLowerCase();
  const t = bundleText.toLowerCase();
  if (/dangerous driving|careless driving|road traffic|motoring|s\.?\s*2\s+rta/i.test(c + t)) {
    return "motoring";
  }
  if (/pervert.*course of justice|common law.*procedural/i.test(c)) return "generic_provisional";
  if (/section\s*20|section\s*18|gbh|wounding|oapa/i.test(c)) return "violence_gbh";
  if (/fraud|false representation/i.test(c)) return "fraud";
  if (/pwits|intent to supply|class a/i.test(c)) return "pwits";
  if (/robbery|s\.?\s*8/i.test(c)) return "robbery_id";
  if (/generic provisional|human review/i.test(t)) return "generic_provisional";
  return "unknown";
}

function motoringProofPoints(charge: string, metaBasis: string): ProofMapProofPoint[] {
  return [
    {
      id: "pp-driving-standard",
      label: "Driving standard (dangerous / careless)",
      crownMustProve:
        "Crown must prove the defendant drove in a manner falling far below (dangerous) or below (careless) the standard of a competent driver — **provisional elements sketch only**.",
      confidenceTag: "provisional",
      humanReviewRequired: false,
      sourceSection: "Charge sheet / MG5",
      sourceBasis: metaBasis || charge,
      doNotOverstate: "Do not state driving standard is proved; thin bundle — chase CCTV, expert, CAD/999.",
    },
    {
      id: "pp-driver-identification",
      label: "Identification of driver",
      crownMustProve:
        "Crown must prove the defendant was the driver — on papers ANPR/officer observations may be partial only.",
      confidenceTag: "provisional",
      humanReviewRequired: false,
      sourceSection: "MG5 / officer material",
      sourceBasis: "Bundle references driver identification and partial ANPR — verify on served papers.",
      doNotOverstate: "Do not treat partial ANPR or summary notebook as final driver proof.",
    },
    {
      id: "pp-collision-causation",
      label: "Collision sequence / causation",
      crownMustProve:
        "Crown must link manner of driving to the collision — expert/CCTV/CAD may be required; not final on thin papers.",
      confidenceTag: "provisional",
      humanReviewRequired: false,
      sourceSection: "MG5",
      sourceBasis: "MG5 describes collision attendance; expert and full CCTV/CAD outstanding on bundle index.",
      doNotOverstate: "Do not state causation is finally proved without served expert/collision material.",
    },
    {
      id: "pp-disclosure-fair-trial",
      label: "Disclosure completeness for motoring route",
      crownMustProve: "N/A — defence disclosure chase; fair trial depends on served dashcam, expert, CAD/999.",
      confidenceTag: "provisional",
      humanReviewRequired: false,
      sourceSection: "Bundle index / MG5 disclosure",
      sourceBasis: "Initial disclosure only; dashcam, expert, full CAD/999 marked outstanding on papers.",
      doNotOverstate: "Do not fix hearing position as if full motoring disclosure is on file.",
    },
  ];
}

function genericProvisionalProofPoints(charge: string, metaBasis: string): ProofMapProofPoint[] {
  return [
    {
      id: "pp-act-tending",
      label: "Act tending to pervert / impede justice",
      crownMustProve:
        "Crown must prove an act tending and intended to pervert the course of justice — sketch only; verify elements with solicitor.",
      confidenceTag: "provisional",
      humanReviewRequired: true,
      sourceSection: "Charge sheet / MG5",
      sourceBasis: metaBasis || charge,
      doNotOverstate: "Do not map to fraud/PWITS/violence families on background text alone.",
    },
    {
      id: "pp-intention-knowledge",
      label: "Intention / knowledge",
      crownMustProve:
        "Crown must prove intention or knowledge element — provisional until served messages/interview on file.",
      confidenceTag: "needs_solicitor_review",
      humanReviewRequired: true,
      sourceSection: "MG5",
      sourceBasis: "MG5 alleges witness contact; phone/message export not served on current papers.",
      doNotOverstate: "Do not state intent is proved from MG11 summary alone.",
    },
    {
      id: "pp-witness-messaging",
      label: "Witness / messaging evidence",
      crownMustProve: "Crown relies on witness approach and call/message context — partial MG11 on papers.",
      confidenceTag: "provisional",
      humanReviewRequired: true,
      sourceSection: "MG11 / MG6",
      sourceBasis: "MG11 DC Patel and partial MG6 — full phone download outstanding.",
      doNotOverstate: "Do not treat message content as served until download on file.",
    },
    {
      id: "pp-disclosure-fair-trial",
      label: "Disclosure completeness",
      crownMustProve: "N/A — chase phone download, interview, unused material before fixing route.",
      confidenceTag: "provisional",
      humanReviewRequired: true,
      sourceSection: "MG6 / outstanding list",
      sourceBasis: "Outstanding: phone/message download, interview, unused schedule draft.",
      doNotOverstate: "Do not concede evidential strength while core exports are outstanding.",
    },
  ];
}

function violenceProofPoints(charge: string, metaBasis: string): ProofMapProofPoint[] {
  return [
    {
      id: "pp-unlawful-force",
      label: "Unlawful force / injury",
      crownMustProve: "Crown must prove unlawful force and qualifying injury — elements sketch only.",
      confidenceTag: "provisional",
      humanReviewRequired: false,
      sourceSection: "Charge / MG5",
      sourceBasis: metaBasis || charge,
      doNotOverstate: "Do not state injury mechanism or intent as final without medical/expert on file.",
    },
    {
      id: "pp-identification",
      label: "Identification / attribution",
      crownMustProve: "Crown must prove the defendant as perpetrator — CCTV/witness quality may be limited.",
      confidenceTag: "provisional",
      humanReviewRequired: false,
      sourceSection: "MG5 / witness / CCTV schedule",
      sourceBasis: "Bundle references witness and CCTV material — verify served quality on papers.",
      doNotOverstate: "Do not treat partial CCTV or weak ID as conclusive.",
    },
    {
      id: "pp-disclosure-fair-trial",
      label: "Disclosure completeness",
      crownMustProve: "N/A — medical, CCTV continuity, unused material may affect route.",
      confidenceTag: "provisional",
      humanReviewRequired: false,
      sourceSection: "MG6 / disclosure",
      sourceBasis: "Check MG6/outstanding rows on bundle for violence route dependencies.",
      doNotOverstate: "Do not fix trial route before disclosure gaps are chased.",
    },
  ];
}

function unknownProofPoints(charge: string): ProofMapProofPoint[] {
  return [
    {
      id: "pp-charge-elements",
      label: "Charge elements (generic)",
      crownMustProve: "Crown must prove charge elements — **needs solicitor review** for offence family mapping.",
      confidenceTag: "needs_solicitor_review",
      humanReviewRequired: true,
      sourceSection: "Charge sheet",
      sourceBasis: charge || "Charge wording on bundle",
      doNotOverstate: "Do not apply offence-specific routes until charge family is confirmed.",
    },
    {
      id: "pp-disclosure-fair-trial",
      label: "Disclosure completeness",
      crownMustProve: "N/A — map missing material from Phase 3.5 explanation blocks.",
      confidenceTag: "provisional",
      humanReviewRequired: true,
      sourceSection: "Bundle",
      sourceBasis: "See explanation-fidelity missing material and MG6 rows.",
      doNotOverstate: "Generic provisional map only — human review required.",
    },
  ];
}

function proofPointsForLens(lens: ProofMapOffenceLens, charge: string, metaBasis: string): ProofMapProofPoint[] {
  switch (lens) {
    case "motoring":
      return motoringProofPoints(charge, metaBasis);
    case "generic_provisional":
      return genericProvisionalProofPoints(charge, metaBasis);
    case "violence_gbh":
      return violenceProofPoints(charge, metaBasis);
    default:
      return unknownProofPoints(charge);
  }
}

function mapIssueToProofPoints(issue: string, lens: ProofMapOffenceLens): string[] {
  const i = issue.toLowerCase();
  if (lens === "motoring") {
    if (/dashcam|cctv|anpr|collision|expert|cad|999|notebook/.test(i)) {
      return ["pp-driving-standard", "pp-collision-causation", "pp-disclosure-fair-trial"];
    }
    return ["pp-disclosure-fair-trial"];
  }
  if (lens === "generic_provisional") {
    if (/phone|message|interview|mg11|unused|mg6/.test(i)) {
      return ["pp-witness-messaging", "pp-intention-knowledge", "pp-disclosure-fair-trial"];
    }
    return ["pp-disclosure-fair-trial"];
  }
  if (lens === "violence_gbh") {
    if (/cctv|medical|bwv|999|cad|interview|forensic/.test(i)) {
      return ["pp-identification", "pp-unlawful-force", "pp-disclosure-fair-trial"];
    }
    return ["pp-disclosure-fair-trial"];
  }
  return ["pp-charge-elements", "pp-disclosure-fair-trial"];
}

function linkTypeForBlock(block: ExplanationBlock): ProofMapLinkType {
  if (block.status === "outstanding" || block.status === "partial") return "missing";
  if (block.status === "conflicting") return "contradiction";
  if (block.status === "served") return "supports";
  return "weakens";
}

function linksFromExplanationBlock(
  block: ExplanationBlock,
  lens: ProofMapOffenceLens,
  linkTypeOverride?: ProofMapLinkType,
): ProofMapLink[] {
  const proofPointIds = mapIssueToProofPoints(block.issue, lens);
  const linkType = linkTypeOverride ?? linkTypeForBlock(block);
  return proofPointIds.map((proofPointId) => ({
    proofPointId,
    linkType,
    label: block.issue,
    sourceSection: block.sourceSection,
    sourceBasis: block.sourceBasis,
    status: block.status,
    routeImpact:
      linkType === "missing" || linkType === "weakens"
        ? `Outstanding or partial material limits how firmly Crown can rely on linked proof point — ${block.whyItMatters}`
        : undefined,
    crownRisk:
      linkType === "missing" ? "Crown case may be incomplete on served papers for this proof point." : undefined,
    defenceRisk:
      linkType === "missing"
        ? "Defence route assessment remains provisional until material is served or chased."
        : undefined,
    routeChangeIf: block.status === "outstanding" ? `If ${block.issue} is served and supports Crown, route assessment may change — solicitor to review.` : undefined,
    disclosureChase: block.safeNextAction,
    safeHearingAction:
      linkType === "missing" || linkType === "disclosure_chase"
        ? `Record disclosure chase for ${block.issue}; request timetable on file.`
        : undefined,
    doNotOverstate: block.doNotOverstate,
    confidenceTag: block.confidenceTag,
    linkedExplanationIssue: block.issue,
  }));
}

function linksFromContradiction(block: ContradictionBlock, lens: ProofMapOffenceLens): ProofMapLink[] {
  const proofPointIds =
    lens === "motoring"
      ? ["pp-collision-causation", "pp-driver-identification"]
      : lens === "generic_provisional"
        ? ["pp-witness-messaging", "pp-intention-knowledge"]
        : ["pp-identification", "pp-unlawful-force"];

  return proofPointIds.map((proofPointId) => ({
    proofPointId,
    linkType: "contradiction" as const,
    label: block.issue,
    sourceSection: block.sourceSection,
    sourceBasis: block.sourceBasis,
    status: "conflicting" as const,
    routeImpact: block.whyItMatters,
    defenceRisk: "Contradiction unresolved — attribution/reliability not safe to finalise.",
    routeChangeIf: "If sources are reconciled on file, reassess linked proof points.",
    disclosureChase: block.safeNextAction,
    safeHearingAction: "Ask court to record outstanding reconciliation; do not concede disputed fact.",
    doNotOverstate: block.doNotOverstate,
    confidenceTag: block.confidenceTag,
    linkedExplanationIssue: block.issue,
  }));
}

function lintProofMapText(text: string): string[] {
  const lower = text.toLowerCase();
  return FORBIDDEN_PROOF_MAP_PHRASES.filter((p) => lower.includes(p));
}

export function generateProofMap(
  bundleId: string,
  label: string,
  bundleText: string,
): Omit<ProofMapCaseResult, "overall" | "skipped" | "skipReason" | "scaffoldNote"> {
  const meta = extractBundleCaseMetadata(bundleText);
  const charge = meta.offenceWording ?? meta.offenceDisplay ?? "Charge unclear on papers";
  const metaBasis = [meta.offenceWording, meta.defendantName].filter(Boolean).join(" — ");
  const lens = detectLens(charge, bundleText);
  const explanation = generateExplanationFidelity(bundleText);
  const proofPoints = proofPointsForLens(lens, charge, metaBasis);

  const humanReviewReasons: string[] = [];
  if (lens === "unknown") humanReviewReasons.push("Offence lens unmapped — generic proof map only.");
  if (proofPoints.some((p) => p.humanReviewRequired)) {
    humanReviewReasons.push("One or more proof points flagged for human review.");
  }
  if (lens === "generic_provisional") {
    humanReviewReasons.push("Generic provisional offence — verify family mapping with solicitor.");
  }

  const links: ProofMapLink[] = [];
  const missingSection = explanation.find((s) => s.key === "missing-material");
  const contraSection = explanation.find((s) => s.key === "contradictions");
  const disclosureSection = explanation.find((s) => s.key === "disclosure-dependencies");

  for (const block of missingSection?.blocks ?? []) {
    links.push(...linksFromExplanationBlock(block, lens, "missing"));
  }
  for (const block of contraSection?.contradictions ?? []) {
    links.push(...linksFromContradiction(block, lens));
  }
  for (const block of disclosureSection?.blocks ?? []) {
    links.push(...linksFromExplanationBlock(block, lens, "disclosure_chase"));
  }

  for (const block of missingSection?.blocks ?? []) {
    if (block.status === "partial") {
      links.push(...linksFromExplanationBlock(block, lens, "weakens"));
    }
  }

  const seen = new Set<string>();
  const dedupedLinks = links.filter((l) => {
    const key = `${l.proofPointId}|${l.linkType}|${l.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const allText = [
    ...proofPoints.map((p) => p.crownMustProve + p.doNotOverstate),
    ...dedupedLinks.map((l) => l.routeImpact + l.doNotOverstate),
  ].join(" ");
  const forbidden = lintProofMapText(allText);
  if (forbidden.length) {
    humanReviewReasons.push(`Forbidden phrasing detected in map output: ${forbidden.join(", ")}`);
  }

  return {
    bundleId,
    label,
    charge,
    stage: meta.stage ?? null,
    offenceLens: lens,
    humanReviewRequired: humanReviewReasons.length > 0,
    humanReviewReasons,
    proofPoints,
    links: dedupedLinks,
    bundleTextChars: bundleText.length,
  };
}

export function lintProofMapResult(map: Pick<ProofMapCaseResult, "proofPoints" | "links">): string[] {
  const errs: string[] = [];
  for (const p of map.proofPoints) {
    errs.push(...lintProofMapText(p.crownMustProve + p.doNotOverstate).map((e) => `proofPoint ${p.id}: ${e}`));
    if (!p.doNotOverstate?.trim()) errs.push(`proofPoint ${p.id}: missing doNotOverstate`);
  }
  for (const l of map.links) {
    errs.push(...lintProofMapText(JSON.stringify(l)).map((e) => `link ${l.proofPointId}/${l.label}: ${e}`));
    if (!l.doNotOverstate?.trim()) errs.push(`link ${l.proofPointId}: missing doNotOverstate`);
  }
  return errs;
}

