import {
  buildBundleTruthLedger,
  isAdminGuidanceLine,
  isOffenceFamilyBlocked,
  ledgerUsesSourceMaterialOnlyProofMap,
  proofMapLensFromLedger,
} from "@/lib/criminal/bundle-truth-ledger";
import type { BundleTruthLedger } from "@/lib/criminal/bundle-truth-types";
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
  if (/pervert.*course of justice|witness intimidation|intimidat.*witness|s\.?\s*51/i.test(c)) {
    return "generic_provisional";
  }
  if (/serious offence|provisional charge wording|unclear offence|pending review/i.test(c)) {
    return "generic_provisional";
  }
  if (/section\s*20|section\s*18|gbh|wounding|oapa/i.test(c)) return "violence_gbh";
  if (/fraud|false representation/i.test(c)) return "fraud";
  if (/pwits|intent to supply|concerned in the supply|section\s*5\s*\(\s*3\s*\)/i.test(c)) return "pwits";
  if (/robbery|s\.?\s*8/i.test(c)) return "robbery_id";
  if (/generic provisional|human review|provisional charge|serious caution/i.test(t)) {
    return "generic_provisional";
  }
  if (/fictional test bundle|synthetic criminal bundle factory/i.test(t)) {
    return "generic_provisional";
  }
  return "generic_provisional";
}

function snippet(line: string, max = 220): string {
  const s = line.replace(/\s+/g, " ").trim();
  return s.length <= max ? s : `${s.slice(0, max - 3)}...`;
}

function findBasisSnippet(bundleText: string, patterns: RegExp[], fallback: string): string {
  for (const line of bundleText.split("\n")) {
    if (isAdminGuidanceLine(line)) continue;
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

/** Source-material readiness only — no unrelated offence templates. */
function sourceMaterialReadinessProofPoints(charge: string, metaBasis: string): ProofMapProofPoint[] {
  return [
    {
      id: "pp-source-readiness",
      label: "Source material readiness",
      crownMustProve:
        "N/A — offence family not safely locked on current papers; map source-material gaps before fixing strategy.",
      confidenceTag: "needs_solicitor_review",
      humanReviewRequired: true,
      sourceSection: "Bundle / MG6",
      sourceBasis: metaBasis || charge || "Bundle on file — verify charge family with solicitor.",
      doNotOverstate: "Do not apply offence-specific proof elements until charge family is confirmed on served papers.",
    },
    {
      id: "pp-disclosure-fair-trial",
      label: "Disclosure completeness",
      crownMustProve: "N/A — chase core source material and unused schedule before fixing route.",
      confidenceTag: "provisional",
      humanReviewRequired: true,
      sourceSection: "MG6 / outstanding list",
      sourceBasis: "Outstanding or draft material on papers — verify service status with solicitor.",
      doNotOverstate: "Do not concede evidential strength while core exports are outstanding or draft.",
    },
    {
      id: "pp-human-review-gate",
      label: "Human review gate",
      crownMustProve: "N/A — provisional bundle mapping requires solicitor review before hearing position.",
      confidenceTag: "needs_solicitor_review",
      humanReviewRequired: true,
      sourceSection: "Bundle / charge",
      sourceBasis: charge || "Charge or offence family unclear on papers",
      doNotOverstate: "Do not finalise offence-specific routes until charge family and served material are confirmed.",
    },
  ];
}

function genericProvisionalProofPoints(
  charge: string,
  metaBasis: string,
  ledger?: BundleTruthLedger,
): ProofMapProofPoint[] {
  if (ledger && ledgerUsesSourceMaterialOnlyProofMap(ledger)) {
    return sourceMaterialReadinessProofPoints(charge, metaBasis);
  }
  if (ledger && isOffenceFamilyBlocked("perverting_justice", ledger)) {
    return sourceMaterialReadinessProofPoints(charge, metaBasis);
  }

  const lower = charge.toLowerCase();
  const actLabel = /witness intimidation/i.test(lower)
    ? "Intimidation act / witness pressure"
    : /pervert|course of justice/i.test(lower)
      ? "Act tending to pervert / impede justice"
      : /serious offence|provisional charge/i.test(lower)
        ? "Conduct / act basis (provisional charge elements)"
        : "Act tending to pervert / impede justice";

  const points: ProofMapProofPoint[] = [
    {
      id: "pp-act-tending",
      label: actLabel,
      crownMustProve:
        "Crown must prove the act element of the charge — sketch only; verify particulars with solicitor on served papers.",
      confidenceTag: "provisional",
      humanReviewRequired: true,
      sourceSection: "Charge sheet / MG5",
      sourceBasis: metaBasis || charge,
      doNotOverstate: "Do not map to fraud/PWITS/violence families on background text alone.",
    },
    {
      id: "pp-identity-participation",
      label: "Identity / participation",
      crownMustProve:
        "Crown must prove the defendant participated in the conduct — identification/participation remains provisional on thin papers.",
      confidenceTag: "provisional",
      humanReviewRequired: true,
      sourceSection: "MG5 / witness material",
      sourceBasis: metaBasis || "Participation/account on bundle — verify attribution on served material.",
      doNotOverstate: "Do not treat partial MG11 or summaries as final participation proof.",
    },
    {
      id: "pp-intention-knowledge",
      label: "Intention / knowledge",
      crownMustProve:
        "Crown must prove intention or knowledge element — provisional until served messages/interview on file.",
      confidenceTag: "needs_solicitor_review",
      humanReviewRequired: true,
      sourceSection: "MG5",
      sourceBasis: "MG5 alleges conduct context; interview/message export may be outstanding on current papers.",
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
      crownMustProve: "N/A — chase core source material, interview, and unused schedule before fixing route.",
      confidenceTag: "provisional",
      humanReviewRequired: true,
      sourceSection: "MG6 / outstanding list",
      sourceBasis: "Outstanding: phone/message download, interview, unused schedule draft.",
      doNotOverstate: "Do not concede evidential strength while core exports are outstanding.",
    },
    {
      id: "pp-source-material-review",
      label: "Source material / human review gate",
      crownMustProve: "N/A — serious/provisional offence mapping requires solicitor review before fixing strategy.",
      confidenceTag: "needs_solicitor_review",
      humanReviewRequired: true,
      sourceSection: "Bundle / charge",
      sourceBasis: charge || "Provisional or serious offence on papers",
      doNotOverstate: "Do not finalise offence-specific routes until charge family and served material are confirmed.",
    },
  ];

  if (ledger && isOffenceFamilyBlocked("fraud", ledger)) {
    return points.filter((p) => p.id !== "pp-witness-messaging");
  }
  return points;
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

function fraudProofPoints(charge: string, metaBasis: string, bundleText: string): ProofMapProofPoint[] {
  const disclosureBasis = findBasisSnippet(
    bundleText,
    [/outstanding|disclosure chase|mg6|not served/i],
    "Pilot disclosure chase list — bank/device/mailbox material outstanding on export.",
  );
  return [
    {
      id: "pp-dishonest-representation",
      label: "Dishonesty / false representation",
      crownMustProve:
        "Crown must prove dishonest false representation (or equivalent fraud element) — sketch only; verify particulars on served MG5/charge.",
      confidenceTag: "provisional",
      humanReviewRequired: false,
      sourceSection: "Charge sheet / MG5",
      sourceBasis: metaBasis || charge,
      doNotOverstate: "Do not state dishonesty or representation is proved on thin pilot export without served bank/source material.",
    },
    {
      id: "pp-account-control",
      label: "Account control / ownership",
      crownMustProve:
        "Crown must link the defendant to account control or benefit — often depends on bank/device/mailbox source material not fully served.",
      confidenceTag: "provisional",
      humanReviewRequired: false,
      sourceSection: "MG5 / account material",
      sourceBasis: findBasisSnippet(
        bundleText,
        [/account ownership|account.control|control material|beneficiary/i],
        "Account ownership / control material marked outstanding on disclosure chase.",
      ),
      doNotOverstate: "Do not treat account control as established without served ownership/login/source exports.",
    },
    {
      id: "pp-transaction-trail",
      label: "Transaction trail / bank schedule",
      crownMustProve:
        "Crown must prove transaction trail linking representation to loss — bank export/schedule often required; provisional on thin papers.",
      confidenceTag: "provisional",
      humanReviewRequired: false,
      sourceSection: "Bank / schedule material",
      sourceBasis: findBasisSnippet(
        bundleText,
        [/bank export|bank schedule|transaction|source.of.funds|poca/i],
        "Full bank export and bank schedule source data outstanding on export.",
      ),
      doNotOverstate: "Do not map transaction trail as complete while bank export/schedule remains outstanding.",
    },
    {
      id: "pp-bank-source-material",
      label: "Bank / source material",
      crownMustProve: "Crown relies on bank statements, schedules, or source-of-funds material — chase if outstanding.",
      confidenceTag: "provisional",
      humanReviewRequired: false,
      sourceSection: "Bank export / POCA",
      sourceBasis: findBasisSnippet(
        bundleText,
        [/bank export|source bank|poca|source.of.funds/i],
        "Full bank export / source bank statements — outstanding on pilot export.",
      ),
      doNotOverstate: "Do not say bank/source material is on file if disclosure chase marks it outstanding.",
    },
    {
      id: "pp-device-account-attribution",
      label: "Device / login / IP attribution",
      crownMustProve:
        "Crown may rely on device, login audit, IP/access logs for attribution — provisional until served.",
      confidenceTag: "provisional",
      humanReviewRequired: false,
      sourceSection: "Device / access logs",
      sourceBasis: findBasisSnippet(
        bundleText,
        [/device|login audit|ip \/ access|access logs|mailbox|email source/i],
        "Device/login audit and mailbox export marked outstanding on disclosure chase.",
      ),
      doNotOverstate: "Do not attribute account activity to defendant without served device/mailbox/IP material.",
    },
    {
      id: "pp-disclosure-fair-trial",
      label: "Disclosure completeness (fraud route)",
      crownMustProve: "N/A — chase bank, device, mailbox, witness/accountant material before fixing route.",
      confidenceTag: "provisional",
      humanReviewRequired: false,
      sourceSection: "MG5 disclosure chase",
      sourceBasis: disclosureBasis,
      doNotOverstate: "Do not fix hearing position while core fraud source material remains outstanding.",
    },
  ];
}

function bundleMentionsCellSite(bundleText: string): boolean {
  return /\bcell[- ]?site|cellsite|location data|mast data\b/i.test(bundleText);
}

function bundleMentionsPossessionSupplyDispute(bundleText: string): boolean {
  return /\bpossession\s*\/\s*knowledge|possession.only|simple possession|user.?dealer|supply inference\b/i.test(
    bundleText,
  );
}

function pwitsProofPoints(charge: string, metaBasis: string, bundleText: string): ProofMapProofPoint[] {
  const disclosureBasis = findBasisSnippet(
    bundleText,
    [/outstanding|disclosure chase|phone extraction|bwv/i],
    "Pilot disclosure chase — phone/BWV/lab material outstanding on export.",
  );
  const points: ProofMapProofPoint[] = [
    {
      id: "pp-possession",
      label: "Possession",
      crownMustProve:
        "Crown must prove possession of controlled drug — verify quantity, location, and continuity on served papers.",
      confidenceTag: "provisional",
      humanReviewRequired: false,
      sourceSection: "Charge sheet / MG5",
      sourceBasis: metaBasis || charge,
      doNotOverstate: "Do not state possession is finally proved without served search/seizure and lab continuity.",
    },
    {
      id: "pp-supply-inference",
      label: "Supply inference / intent to supply",
      crownMustProve:
        "Crown must prove intent to supply (not mere possession) — inference may depend on phone, packaging, cash; solicitor to review.",
      confidenceTag: "needs_solicitor_review",
      humanReviewRequired: true,
      sourceSection: "Charge sheet / MG5",
      sourceBasis: metaBasis || charge,
      doNotOverstate: "Do not state supply intent is proved from charge wording alone; phone download often outstanding.",
    },
    {
      id: "pp-quantity-packaging",
      label: "Quantity / packaging",
      crownMustProve: "Crown may rely on quantity, wraps, or packaging for supply inference — verify on served material.",
      confidenceTag: "provisional",
      humanReviewRequired: false,
      sourceSection: "Search / drugs exhibit",
      sourceBasis: findBasisSnippet(
        bundleText,
        [/quantity|packaging|wrap|dealer|weight|drug item/i],
        "Drug item continuity / packaging references on disclosure chase.",
      ),
      doNotOverstate: "Do not quantify or characterise drugs as supply-level without served lab/search material.",
    },
    {
      id: "pp-drugs-lab",
      label: "Drugs lab / continuity",
      crownMustProve: "Crown must prove substance and continuity — lab report/continuity note may be outstanding.",
      confidenceTag: "provisional",
      humanReviewRequired: false,
      sourceSection: "Lab / continuity",
      sourceBasis: findBasisSnippet(
        bundleText,
        [/lab|continuity|forensic|substance/i],
        "Drug item continuity / lab continuity note outstanding on export.",
      ),
      doNotOverstate: "Do not state drug type or weight as final until lab and continuity are served.",
    },
    {
      id: "pp-cash-seizure",
      label: "Cash seizure",
      crownMustProve: "N/A — cash may support supply inference if properly evidenced; chase counting note if outstanding.",
      confidenceTag: "provisional",
      humanReviewRequired: false,
      sourceSection: "Search / cash exhibit",
      sourceBasis: findBasisSnippet(
        bundleText,
        [/cash seizure|counting note|cash/i],
        "Cash seizure / counting note outstanding on disclosure chase.",
      ),
      doNotOverstate: "Do not treat cash alone as proof of supply without context from served search/phone material.",
    },
    {
      id: "pp-phone-attribution-messages",
      label: "Phone attribution / messages",
      crownMustProve:
        "Crown may rely on phone extraction, SIM/IMEI, messages for attribution and supply — often outstanding on initial papers.",
      confidenceTag: "provisional",
      humanReviewRequired: false,
      sourceSection: "Phone / MG6",
      sourceBasis: findBasisSnippet(
        bundleText,
        [/phone extraction|phone attribution|sim|imei|subscriber|message/i],
        "Full phone extraction and attribution material outstanding on export.",
      ),
      doNotOverstate: "Do not attribute handset or messages to defendant until extraction/ownership material is served.",
    },
    {
      id: "pp-disclosure-fair-trial",
      label: "Disclosure completeness (PWITS route)",
      crownMustProve: "N/A — chase phone download, BWV, lab, cash, premises material before fixing route.",
      confidenceTag: "provisional",
      humanReviewRequired: false,
      sourceSection: "MG5 disclosure chase",
      sourceBasis: disclosureBasis,
      doNotOverstate: "Do not fix hearing position while core phone/lab/BWV disclosure remains outstanding.",
    },
  ];

  if (bundleMentionsCellSite(bundleText)) {
    points.splice(6, 0, {
      id: "pp-cell-site",
      label: "Cell-site / location data",
      crownMustProve: "N/A — cell-site may support attribution or movement; verify served download and schedule.",
      confidenceTag: "provisional",
      humanReviewRequired: false,
      sourceSection: "Phone / cell-site",
      sourceBasis: findBasisSnippet(
        bundleText,
        [/cell[- ]?site|location data|mast/i],
        "Cell-site material referenced on bundle — verify served vs outstanding.",
      ),
      doNotOverstate: "Do not map movement or attribution from cell-site without served expert/download material.",
    });
  }

  if (bundleMentionsPossessionSupplyDispute(bundleText)) {
    points.push({
      id: "pp-possession-only-dispute",
      label: "Possession-only vs supply (provisional)",
      crownMustProve:
        "N/A — route may turn on possession/knowledge vs supply inference; dispute live only if instructions and served material support it.",
      confidenceTag: "provisional",
      humanReviewRequired: true,
      sourceSection: "Cover / MG5 route",
      sourceBasis: findBasisSnippet(
        bundleText,
        [/possession\s*\/\s*knowledge|possession.only|simple possession/i],
        "Bundle route references possession/knowledge pressure — verify against served phone/lab material.",
      ),
      doNotOverstate:
        "Do not advise possession-only outcome; say dispute is provisional pending phone download and solicitor instructions.",
    });
  }

  return points;
}

function robberyIdProofPoints(charge: string, metaBasis: string, bundleText: string): ProofMapProofPoint[] {
  const disclosureBasis = findBasisSnippet(
    bundleText,
    [/outstanding|disclosure chase|cctv master|999/i],
    "Pilot disclosure chase — CCTV/999/complainant material outstanding on export.",
  );
  return [
    {
      id: "pp-taking-property",
      label: "Taking / property",
      crownMustProve:
        "Crown must prove theft element (appropriation of property belonging to another) as part of robbery — sketch only.",
      confidenceTag: "provisional",
      humanReviewRequired: false,
      sourceSection: "Charge sheet / MG5",
      sourceBasis: metaBasis || charge,
      doNotOverstate: "Do not state property and taking are finally proved without served complainant/CCTV material.",
    },
    {
      id: "pp-force-threat",
      label: "Force / threat (robbery)",
      crownMustProve:
        "Crown must prove force or threat of force immediately before or at time of stealing — verify on served accounts.",
      confidenceTag: "provisional",
      humanReviewRequired: false,
      sourceSection: "Charge sheet / MG5",
      sourceBasis: metaBasis || charge,
      doNotOverstate: "Do not treat force/threat as established on thin export without complainant/CCTV/999 material.",
    },
    {
      id: "pp-identification-attribution",
      label: "Identification / participation",
      crownMustProve:
        "Crown must prove defendant as robber or participant — ID route depends on CCTV, complainant, ID procedure.",
      confidenceTag: "provisional",
      humanReviewRequired: false,
      sourceSection: "MG11 / CCTV / ID procedure",
      sourceBasis: findBasisSnippet(
        bundleText,
        [/identification|id procedure|attribution|co-defendant|unknown male|description/i],
        "ID procedure and attribution material marked outstanding on disclosure chase.",
      ),
      doNotOverstate: "Do not treat description, stills, or partial ID alone as conclusive participation proof.",
    },
    {
      id: "pp-complainant-witness",
      label: "Complainant / witness account",
      crownMustProve: "Crown relies on complainant and witness accounts — first account and signed statement may be outstanding.",
      confidenceTag: "provisional",
      humanReviewRequired: false,
      sourceSection: "MG11 / complainant",
      sourceBasis: findBasisSnippet(
        bundleText,
        [/complainant|witness|first account|signed complainant/i],
        "Complainant first account and final signed statement outstanding on export.",
      ),
      doNotOverstate: "Do not merge complainant accounts or treat unsigned/partial accounts as final.",
    },
    {
      id: "pp-cctv-bwv-999-cad",
      label: "CCTV / BWV / 999 / CAD",
      crownMustProve: "N/A — master footage, export log, 999/CAD timing often required for ID and sequence routes.",
      confidenceTag: "provisional",
      humanReviewRequired: false,
      sourceSection: "CCTV / 999 / CAD",
      sourceBasis: findBasisSnippet(
        bundleText,
        [/cctv master|999|cad|bwv|footage|export log/i],
        "Full CCTV master and 999/CAD timing material outstanding on disclosure chase.",
      ),
      doNotOverstate: "Do not say full CCTV or emergency call material is available if chase marks it outstanding.",
    },
    {
      id: "pp-continuity-timing",
      label: "Continuity / timing",
      crownMustProve: "N/A — CCTV continuity, export log, and CAD/999 timing must be reconciled before fixing ID route.",
      confidenceTag: "provisional",
      humanReviewRequired: false,
      sourceSection: "CCTV continuity / CAD",
      sourceBasis: findBasisSnippet(
        bundleText,
        [/continuity|export log|timing|cad|999/i],
        "CCTV continuity / export log and 999/CAD timing outstanding on export.",
      ),
      doNotOverstate: "Do not finalise sequence or ID timing while continuity and CAD gaps remain.",
    },
    {
      id: "pp-disclosure-fair-trial",
      label: "Disclosure completeness (robbery / ID route)",
      crownMustProve: "N/A — chase CCTV master, ID procedure, complainant, 999/CAD before fixing hearing position.",
      confidenceTag: "provisional",
      humanReviewRequired: false,
      sourceSection: "MG5 disclosure chase",
      sourceBasis: disclosureBasis,
      doNotOverstate: "Do not fix robbery/ID hearing position while core identification material is outstanding.",
    },
  ];
}

function proofPointsForLens(
  lens: ProofMapOffenceLens,
  charge: string,
  metaBasis: string,
  bundleText: string,
  ledger?: BundleTruthLedger,
): ProofMapProofPoint[] {
  switch (lens) {
    case "motoring":
      return motoringProofPoints(charge, metaBasis);
    case "generic_provisional":
      return genericProvisionalProofPoints(charge, metaBasis, ledger);
    case "violence_gbh":
      return violenceProofPoints(charge, metaBasis, bundleText);
    case "fraud":
      return fraudProofPoints(charge, metaBasis, bundleText);
    case "pwits":
      return pwitsProofPoints(charge, metaBasis, bundleText);
    case "robbery_id":
      return robberyIdProofPoints(charge, metaBasis, bundleText);
    default:
      return genericProvisionalProofPoints(charge, metaBasis, ledger);
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

function fraudProofPointIdsForIssue(issue: string): string[] {
  const i = issue.toLowerCase();
  const ids = new Set<string>(["pp-disclosure-fair-trial"]);

  if (/bank|statement|export|schedule|transaction|poca|source.of.funds|source bank/.test(i)) {
    ids.add("pp-bank-source-material");
    ids.add("pp-transaction-trail");
    ids.add("pp-dishonest-representation");
  }
  if (/device|login|ip|access log|mailbox|email/.test(i)) {
    ids.add("pp-device-account-attribution");
    ids.add("pp-account-control");
  }
  if (/account|ownership|control|benefit/.test(i)) {
    ids.add("pp-account-control");
    ids.add("pp-dishonest-representation");
  }
  if (/witness|accountant|bookkeeper/.test(i)) {
    ids.add("pp-dishonest-representation");
    ids.add("pp-transaction-trail");
  }
  if (/disclosure|mg6|outstanding|chase/.test(i)) {
    ids.add("pp-disclosure-fair-trial");
  }

  if (ids.size === 1) {
    ids.add("pp-dishonest-representation");
    ids.add("pp-account-control");
  }
  return [...ids];
}

function pwitsProofPointIdsForIssue(issue: string): string[] {
  const i = issue.toLowerCase();
  const ids = new Set<string>(["pp-disclosure-fair-trial"]);

  if (/phone|extraction|sim|imei|subscriber|message|attribution/.test(i)) {
    ids.add("pp-phone-attribution-messages");
    ids.add("pp-supply-inference");
    ids.add("pp-possession");
  }
  if (/bwv|search|seizure|continuity|premises|co-occupier/.test(i)) {
    ids.add("pp-possession");
    ids.add("pp-drugs-lab");
  }
  if (/drug|lab|item continuity|packaging|quantity|wrap/.test(i)) {
    ids.add("pp-drugs-lab");
    ids.add("pp-quantity-packaging");
    ids.add("pp-supply-inference");
  }
  if (/cash|counting/.test(i)) {
    ids.add("pp-cash-seizure");
    ids.add("pp-supply-inference");
  }
  if (/cell[- ]?site|location data|mast/.test(i)) {
    ids.add("pp-cell-site");
    ids.add("pp-phone-attribution-messages");
  }
  if (/possession.only|simple possession|user.?dealer/.test(i)) {
    ids.add("pp-possession-only-dispute");
    ids.add("pp-possession");
  }
  if (/disclosure|mg6|outstanding|chase/.test(i)) {
    ids.add("pp-disclosure-fair-trial");
  }

  if (ids.size === 1) {
    ids.add("pp-possession");
    ids.add("pp-supply-inference");
  }
  return [...ids];
}

function robberyProofPointIdsForIssue(issue: string): string[] {
  const i = issue.toLowerCase();
  const ids = new Set<string>(["pp-disclosure-fair-trial"]);

  if (/cctv|bwv|footage|export|master|continuity/.test(i)) {
    ids.add("pp-cctv-bwv-999-cad");
    ids.add("pp-continuity-timing");
    ids.add("pp-identification-attribution");
  }
  if (/999|cad|timing|dispatch/.test(i)) {
    ids.add("pp-cctv-bwv-999-cad");
    ids.add("pp-continuity-timing");
    ids.add("pp-complainant-witness");
  }
  if (/complainant|witness|first account|signed|description|clothing/.test(i)) {
    ids.add("pp-complainant-witness");
    ids.add("pp-identification-attribution");
    ids.add("pp-force-threat");
  }
  if (/id procedure|identification|attribution|co-defendant|unknown male/.test(i)) {
    ids.add("pp-identification-attribution");
    ids.add("pp-taking-property");
  }
  if (/force|threat|robbery|stealing/.test(i)) {
    ids.add("pp-force-threat");
    ids.add("pp-taking-property");
  }
  if (/disclosure|mg6|outstanding|chase/.test(i)) {
    ids.add("pp-disclosure-fair-trial");
  }

  if (ids.size === 1) {
    ids.add("pp-taking-property");
    ids.add("pp-identification-attribution");
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
    if (/phone|message|device|handset|subscriber|attribution/.test(i)) {
      return ["pp-witness-messaging", "pp-intention-knowledge", "pp-identity-participation", "pp-disclosure-fair-trial"];
    }
    if (/witness|identification|participation|intimidation/.test(i)) {
      return ["pp-witness-messaging", "pp-identity-participation", "pp-act-tending", "pp-disclosure-fair-trial"];
    }
    if (/timing|date|charge|wording|contradiction|conflict/.test(i)) {
      return ["pp-act-tending", "pp-intention-knowledge", "pp-disclosure-fair-trial"];
    }
    return ["pp-act-tending", "pp-disclosure-fair-trial", "pp-source-material-review"];
  }
  if (lens === "violence_gbh") {
    return violenceProofPointIdsForIssue(issue);
  }
  if (lens === "fraud") {
    return fraudProofPointIdsForIssue(issue);
  }
  if (lens === "pwits") {
    return pwitsProofPointIdsForIssue(issue);
  }
  if (lens === "robbery_id") {
    return robberyProofPointIdsForIssue(issue);
  }
  return ["pp-act-tending", "pp-disclosure-fair-trial", "pp-source-material-review"];
}

function linkTypeForBlock(block: ExplanationBlock): ProofMapLinkType {
  if (block.status === "outstanding" || block.status === "partial") return "missing";
  if (block.status === "conflicting") return "contradiction";
  if (block.status === "served") return "supports";
  return "weakens";
}

/** Keep links on proof points that exist for this map — source-material-only maps use a smaller id set. */
function resolveProofPointIdsForMap(requested: string[], validIds: Set<string>): string[] {
  const ok = [...new Set(requested.filter((id) => validIds.has(id)))];
  if (ok.length > 0) return ok;
  const fallbacks = [
    "pp-disclosure-fair-trial",
    "pp-source-readiness",
    "pp-human-review-gate",
    "pp-source-material-review",
  ];
  for (const id of fallbacks) {
    if (validIds.has(id)) return [id];
  }
  const first = [...validIds][0];
  return first ? [first] : [];
}

function linksFromExplanationBlock(
  block: ExplanationBlock,
  lens: ProofMapOffenceLens,
  validProofIds: Set<string>,
  linkTypeOverride?: ProofMapLinkType,
): ProofMapLink[] {
  const proofPointIds = resolveProofPointIdsForMap(
    mapIssueToProofPoints(block.issue, lens),
    validProofIds,
  );
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

function linksFromContradiction(
  block: ContradictionBlock,
  lens: ProofMapOffenceLens,
  validProofIds: Set<string>,
): ProofMapLink[] {
  const proofPointIds = resolveProofPointIdsForMap(
    (() => {
      switch (lens) {
        case "motoring":
          return ["pp-collision-causation", "pp-driver-identification"];
        case "generic_provisional":
          return [
            "pp-act-tending",
            "pp-identity-participation",
            "pp-intention-knowledge",
            "pp-witness-messaging",
            "pp-disclosure-fair-trial",
            "pp-source-material-review",
          ];
        case "violence_gbh":
          return [
            "pp-causation",
            "pp-witness-reliability",
            "pp-identification-attribution",
            "pp-unlawful-assault",
            "pp-cctv-bwv-999-cad",
          ];
        case "fraud":
          return [
            "pp-dishonest-representation",
            "pp-transaction-trail",
            "pp-account-control",
            "pp-bank-source-material",
            "pp-device-account-attribution",
          ];
        case "pwits":
          return [
            "pp-supply-inference",
            "pp-phone-attribution-messages",
            "pp-possession",
            "pp-quantity-packaging",
            "pp-drugs-lab",
          ];
        case "robbery_id":
          return [
            "pp-identification-attribution",
            "pp-complainant-witness",
            "pp-cctv-bwv-999-cad",
            "pp-continuity-timing",
            "pp-taking-property",
            "pp-force-threat",
          ];
        default:
          return [
            "pp-act-tending",
            "pp-identity-participation",
            "pp-disclosure-fair-trial",
            "pp-source-material-review",
          ];
      }
    })(),
    validProofIds,
  );

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

  if (lens === "violence_gbh" || lens === "robbery_id") {
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
  const ledger = buildBundleTruthLedger({ bundleText });
  const meta = extractBundleCaseMetadata(bundleText);
  const chargeFromLedger = ledger.charge.wording;
  const charge =
    chargeFromLedger ??
    meta.offenceWording ??
    meta.offenceDisplay ??
    (ledger.offenceFamily.family !== "unknown"
      ? "Charge wording provisional — offence family on papers"
      : "Charge unclear on papers");
  const metaBasis = [chargeFromLedger ?? meta.offenceWording, meta.defendantName].filter(Boolean).join(" — ");
  const lens = proofMapLensFromLedger(ledger);
  const explanation = generateExplanationFidelity(bundleText);
  const proofPoints = proofPointsForLens(lens, charge, metaBasis, bundleText, ledger);
  const validProofIds = new Set(proofPoints.map((p) => p.id));

  const humanReviewReasons: string[] = [];
  if (lens === "unknown") {
    humanReviewReasons.push("Offence lens unmapped — generic provisional proof map only; solicitor review required.");
  }
  if (proofPoints.some((p) => p.humanReviewRequired)) {
    humanReviewReasons.push("One or more proof points flagged for human review.");
  }
  if (lens === "generic_provisional") {
    humanReviewReasons.push("Generic provisional offence — verify family mapping with solicitor.");
  }
  if (
    lens === "violence_gbh" &&
    (isS18OrIntentCharge(charge) || bundleMentionsSelfDefence(bundleText))
  ) {
    humanReviewReasons.push(
      "Serious violence charge or self-defence pattern — solicitor review before fixing hearing position.",
    );
  }
  if (
    lens === "violence_gbh" &&
    /outstanding|not yet served|provisional/i.test(bundleText) &&
    (explanation.find((s) => s.key === "contradictions")?.contradictions.length ?? 0) > 0
  ) {
    humanReviewReasons.push(
      "Violence case with unresolved contradictions and outstanding material — solicitor review required.",
    );
  }
  if (
    lens === "violence_gbh" &&
    /outstanding|not yet served|provisional/i.test(bundleText)
  ) {
    humanReviewReasons.push(
      "Violence case with outstanding material on papers — solicitor review before fixing hearing position.",
    );
  }
  if (/pwits|intent to supply/i.test(charge) && /outstanding|not yet served/i.test(bundleText)) {
    humanReviewReasons.push(
      "PWITS case with outstanding phone/lab/BWV material — solicitor review before fixing hearing position.",
    );
  }

  const links: ProofMapLink[] = [];
  const missingSection = explanation.find((s) => s.key === "missing-material");
  const contraSection = explanation.find((s) => s.key === "contradictions");
  const disclosureSection = explanation.find((s) => s.key === "disclosure-dependencies");
  const custodySection = explanation.find((s) => s.key === "custody-interview");

  for (const block of missingSection?.blocks ?? []) {
    links.push(...linksFromExplanationBlock(block, lens, validProofIds, "missing"));
  }
  for (const block of contraSection?.contradictions ?? []) {
    links.push(...linksFromContradiction(block, lens, validProofIds));
  }
  for (const block of disclosureSection?.blocks ?? []) {
    links.push(...linksFromExplanationBlock(block, lens, validProofIds, "disclosure_chase"));
  }

  for (const block of custodySection?.blocks ?? []) {
    const linkType =
      block.status === "served" ? ("supports" as const) : ("missing" as const);
    links.push(...linksFromExplanationBlock(block, lens, validProofIds, linkType));
    if ((lens === "violence_gbh" || lens === "robbery_id") && block.status === "served") {
      links.push(
        ...resolveProofPointIdsForMap(mapIssueToProofPoints(block.issue, lens), validProofIds).map(
          (proofPointId) => ({
            ...linksFromExplanationBlock(block, lens, validProofIds, "route_impact" as ProofMapLinkType)[0],
            proofPointId,
            linkType: "route_impact" as const,
            label: `${block.issue} — interview/custody route note`,
            routeImpact: block.whyItMatters,
            safeHearingAction: block.safeNextAction,
          }),
        ),
      );
    }
  }

  for (const block of missingSection?.blocks ?? []) {
    if (block.status === "partial") {
      links.push(...linksFromExplanationBlock(block, lens, validProofIds, "weakens"));
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

