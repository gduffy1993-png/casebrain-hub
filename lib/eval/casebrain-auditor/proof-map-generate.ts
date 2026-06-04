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

function snippet(line: string, max = 220): string {
  const s = line.replace(/\s+/g, " ").trim();
  return s.length <= max ? s : `${s.slice(0, max - 3)}...`;
}

function findBasisSnippet(bundleText: string, patterns: RegExp[], fallback: string): string {
  for (const line of bundleText.split("\n")) {
    if (patterns.some((p) => p.test(line))) return snippet(line);
  }
  return fallback;
}

function isS18OrIntentCharge(charge: string): boolean {
  return /section\s*18|wounding with intent|intent to cause|really serious harm/i.test(charge);
}

function bundleMentionsSelfDefence(bundleText: string): boolean {
  return /\b(self[- ]?defence|self defense|accident|justification|lawful excuse|complainant moved first|first aggression)\b/i.test(
    bundleText,
  );
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

function violenceProofPoints(charge: string, metaBasis: string, bundleText: string): ProofMapProofPoint[] {
  const injuryBasis = findBasisSnippet(
    bundleText,
    [/grievous bodily harm|gbh|laceration|fracture|injury|wound/i],
    metaBasis || charge,
  );
  const idBasis = findBasisSnippet(
    bundleText,
    [/witness|identification|cctv|mg11|eye-witness|hood/i],
    "Witness and CCTV material referenced on bundle — verify quality on served papers.",
  );
  const disclosureBasis = findBasisSnippet(
    bundleText,
    [/outstanding|mg6|not yet served|not yet disclosed|incomplete/i],
    "MG6 / outstanding disclosure rows govern violence route dependencies.",
  );

  const points: ProofMapProofPoint[] = [
    {
      id: "pp-unlawful-assault",
      label: "Unlawful assault / force",
      crownMustProve:
        "Crown must prove the defendant applied unlawful force — elements sketch only; verify particulars against MG5.",
      confidenceTag: "provisional",
      humanReviewRequired: false,
      sourceSection: "Charge sheet / MG5",
      sourceBasis: metaBasis || charge,
      doNotOverstate: "Do not treat force as finally proved without reconciled witness/CCTV/medical material.",
    },
    {
      id: "pp-serious-injury",
      label: "Serious injury / GBH threshold",
      crownMustProve:
        "Crown must prove qualifying injury (e.g. GBH/wounding threshold) — provisional until served medical/expert material.",
      confidenceTag: "provisional",
      humanReviewRequired: false,
      sourceSection: "Charge / medical references",
      sourceBasis: injuryBasis,
      doNotOverstate: "Do not state injury grade or mechanism as final without served medical/expert reports.",
    },
    {
      id: "pp-causation",
      label: "Causation / mechanism",
      crownMustProve:
        "Crown must link act to injury (e.g. blow, fall, kerb) — timing and sequence may be disputed on papers.",
      confidenceTag: "provisional",
      humanReviewRequired: false,
      sourceSection: "MG5 / witness / medical",
      sourceBasis: findBasisSnippet(
        bundleText,
        [/causation|kerb|fall|mechanism|sequence|one punch/i],
        "MG5 narrative describes incident sequence — verify against medical and CCTV when served.",
      ),
      doNotOverstate: "Do not state causation is finally proved while expert/medical/CCTV gaps remain.",
    },
    {
      id: "pp-identification-attribution",
      label: "Identification / attribution",
      crownMustProve: "Crown must prove the defendant as perpetrator — ID may depend on CCTV/witness quality.",
      confidenceTag: "provisional",
      humanReviewRequired: false,
      sourceSection: "MG5 / MG11 / CCTV",
      sourceBasis: idBasis,
      doNotOverstate: "Do not treat partial CCTV, weak lighting, or friend witness alone as conclusive ID.",
    },
    {
      id: "pp-witness-reliability",
      label: "Witness reliability / timing",
      crownMustProve: "N/A — assess witness accounts and timing consistency on served papers.",
      confidenceTag: "provisional",
      humanReviewRequired: false,
      sourceSection: "MG11 / CAD / index",
      sourceBasis: findBasisSnippet(
        bundleText,
        [/witness|mg11|timing|estimate|corrected|cad/i],
        "Witness statements and timing references on bundle — check for conflicts.",
      ),
      doNotOverstate: "Do not merge conflicting witness/CAD/index timings into one account.",
    },
    {
      id: "pp-cctv-bwv-999-cad",
      label: "CCTV / BWV / 999 / CAD",
      crownMustProve: "N/A — continuity and full logs may be required for sequence and ID routes.",
      confidenceTag: "provisional",
      humanReviewRequired: false,
      sourceSection: "CCTV list / CAD / 999",
      sourceBasis: findBasisSnippet(
        bundleText,
        [/cctv|bwv|999|cad|footage|audio|dispatch/i],
        "Bundle references CCTV/BWV/999/CAD — verify served vs outstanding on MG6.",
      ),
      doNotOverstate: "Do not say full footage or audio is available if only partial extracts or lists are served.",
    },
    {
      id: "pp-medical-expert",
      label: "Medical / expert evidence",
      crownMustProve: "Crown may rely on medical/expert evidence for injury and mechanism — often outstanding on initial papers.",
      confidenceTag: "provisional",
      humanReviewRequired: false,
      sourceSection: "Medical / forensic schedule",
      sourceBasis: findBasisSnippet(
        bundleText,
        [/medical|hospital|forensic|expert|report/i],
        "Medical/forensic references on bundle — chase if marked outstanding.",
      ),
      doNotOverstate: "Do not state injury mechanism or expert opinion as final until reports are served.",
    },
    {
      id: "pp-interview-custody",
      label: "Interview / custody / PACE",
      crownMustProve: "N/A — interview account and custody/PACE compliance may affect route assessment.",
      confidenceTag: "provisional",
      humanReviewRequired: false,
      sourceSection: "Interview / custody record",
      sourceBasis: findBasisSnippet(
        bundleText,
        [/interview|no comment|pace|custody|caution/i],
        "Interview/custody material referenced on bundle.",
      ),
      doNotOverstate: "Do not infer guilt from no comment; do not overstate pre-interview disclosure.",
    },
    {
      id: "pp-disclosure-fair-trial",
      label: "Disclosure completeness",
      crownMustProve: "N/A — chase CCTV continuity, medical, 999/CAD/BWV, unused material before fixing route.",
      confidenceTag: "provisional",
      humanReviewRequired: false,
      sourceSection: "MG6 / disclosure",
      sourceBasis: disclosureBasis,
      doNotOverstate: "Do not fix trial/hearing position before outstanding violence disclosure is chased.",
    },
  ];

  if (isS18OrIntentCharge(charge)) {
    points.splice(2, 0, {
      id: "pp-intent-really-serious-harm",
      label: "Intent / really serious harm (s18)",
      crownMustProve:
        "Crown must prove intent to cause really serious harm for s18 — charge reduction to s20 may be live; sketch only.",
      confidenceTag: "needs_solicitor_review",
      humanReviewRequired: true,
      sourceSection: "Charge sheet / MG5",
      sourceBasis: metaBasis || charge,
      doNotOverstate: "Do not state intent is proved; do not advise charge reduction outcome — solicitor to review.",
    });
  }

  if (bundleMentionsSelfDefence(bundleText)) {
    points.push({
      id: "pp-self-defence-provisional",
      label: "Self-defence / lawful excuse (provisional)",
      crownMustProve: "N/A — defence route only if source supports live issue; not established on thin papers.",
      confidenceTag: "provisional",
      humanReviewRequired: true,
      sourceSection: "Witness / MG5",
      sourceBasis: findBasisSnippet(
        bundleText,
        [/self[- ]?defence|accident|justification|moved first|first aggression/i],
        "Bundle may raise self-defence or justification — verify source basis.",
      ),
      doNotOverstate:
        "Do not say self-defence is established; say it is a live provisional issue pending full CCTV/medical/interview material.",
    });
  }

  return points;
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

function proofPointsForLens(
  lens: ProofMapOffenceLens,
  charge: string,
  metaBasis: string,
  bundleText: string,
): ProofMapProofPoint[] {
  switch (lens) {
    case "motoring":
      return motoringProofPoints(charge, metaBasis);
    case "generic_provisional":
      return genericProvisionalProofPoints(charge, metaBasis);
    case "violence_gbh":
      return violenceProofPoints(charge, metaBasis, bundleText);
    default:
      return unknownProofPoints(charge);
  }
}

function violenceProofPointIdsForIssue(issue: string): string[] {
  const i = issue.toLowerCase();
  const ids = new Set<string>(["pp-disclosure-fair-trial"]);

  if (/cctv|bwv|footage|export|continuity/.test(i)) {
    ids.add("pp-cctv-bwv-999-cad");
    ids.add("pp-identification-attribution");
  }
  if (/999|cad|dispatch|timing|incident date/.test(i)) {
    ids.add("pp-cctv-bwv-999-cad");
    ids.add("pp-witness-reliability");
    ids.add("pp-causation");
  }
  if (/medical|hospital|forensic|expert|injury/.test(i)) {
    ids.add("pp-medical-expert");
    ids.add("pp-serious-injury");
    ids.add("pp-causation");
  }
  if (/interview|custody|pace|caution|no comment/.test(i)) {
    ids.add("pp-interview-custody");
  }
  if (/phone|mg6|mg6c|pending|incomplete|unused/.test(i)) {
    ids.add("pp-disclosure-fair-trial");
    ids.add("pp-identification-attribution");
  }
  if (/witness|mg11|identification|attribution/.test(i)) {
    ids.add("pp-witness-reliability");
    ids.add("pp-identification-attribution");
    ids.add("pp-unlawful-assault");
  }
  if (/self[- ]?defence|justification|accident/.test(i)) {
    ids.add("pp-self-defence-provisional");
    ids.add("pp-unlawful-assault");
  }
  if (/intent|s18|really serious/.test(i)) {
    ids.add("pp-intent-really-serious-harm");
  }

  if (ids.size === 1) {
    ids.add("pp-unlawful-assault");
    ids.add("pp-causation");
  }
  return [...ids];
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
    return violenceProofPointIdsForIssue(issue);
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
        : [
            "pp-causation",
            "pp-witness-reliability",
            "pp-identification-attribution",
            "pp-unlawful-assault",
            "pp-cctv-bwv-999-cad",
          ];

  const base = proofPointIds.map((proofPointId) => ({
    proofPointId,
    linkType: "contradiction" as const,
    label: block.issue,
    sourceSection: block.sourceSection,
    sourceBasis: block.sourceBasis,
    status: "conflicting" as const,
    routeImpact: block.whyItMatters,
    crownRisk: "Unresolved contradiction may weaken proof point reliance on served papers.",
    defenceRisk: "Contradiction unresolved — attribution/reliability not safe to finalise; route remains provisional.",
    routeChangeIf: "If sources are reconciled on file, reassess linked proof points and routes.",
    disclosureChase: block.safeNextAction,
    safeHearingAction: "Ask court to record outstanding reconciliation; do not concede disputed fact.",
    doNotOverstate: block.doNotOverstate,
    confidenceTag: block.confidenceTag,
    linkedExplanationIssue: block.issue,
  }));

  if (lens === "violence_gbh") {
    const riskLinks = proofPointIds.slice(0, 2).map((proofPointId) => ({
      ...base[0],
      proofPointId,
      linkType: "risk" as ProofMapLinkType,
      label: `${block.issue} — route risk`,
      routeImpact: `Route to attack this proof point remains provisional: ${block.whyItMatters}`,
    }));
    return [...base, ...riskLinks];
  }

  return base;
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
  const proofPoints = proofPointsForLens(lens, charge, metaBasis, bundleText);

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
  const custodySection = explanation.find((s) => s.key === "custody-interview");

  for (const block of missingSection?.blocks ?? []) {
    links.push(...linksFromExplanationBlock(block, lens, "missing"));
  }
  for (const block of contraSection?.contradictions ?? []) {
    links.push(...linksFromContradiction(block, lens));
  }
  for (const block of disclosureSection?.blocks ?? []) {
    links.push(...linksFromExplanationBlock(block, lens, "disclosure_chase"));
  }

  for (const block of custodySection?.blocks ?? []) {
    const linkType =
      block.status === "served" ? ("supports" as const) : ("missing" as const);
    links.push(...linksFromExplanationBlock(block, lens, linkType));
    if (lens === "violence_gbh" && block.status === "served") {
      links.push(
        ...mapIssueToProofPoints(block.issue, lens).map((proofPointId) => ({
          ...linksFromExplanationBlock(block, lens, "route_impact" as ProofMapLinkType)[0],
          proofPointId,
          linkType: "route_impact" as const,
          label: `${block.issue} — interview/custody route note`,
          routeImpact: block.whyItMatters,
          safeHearingAction: block.safeNextAction,
        })),
      );
    }
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

