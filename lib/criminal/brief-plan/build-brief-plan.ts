import { buildBundleTruthLedger } from "@/lib/criminal/bundle-truth-ledger";
import type { BundleOffenceFamily, NormalisedMaterialRow } from "@/lib/criminal/bundle-truth-types";
import { extractAllBundleContradictions } from "@/lib/criminal/merge-bundle-contradictions";
import { buildSourceTruthFingerprint } from "@/lib/criminal/source-truth-guardian/fingerprint";
import type {
  SourceTruthEvidenceCategory,
  SourceTruthFingerprint,
} from "@/lib/criminal/source-truth-guardian/types";
import { CRIMINAL_BRIEF_PLAYBOOKS } from "./playbooks";
import { familySupport, type ChaseGateFamily } from "@/lib/criminal/chase-source-gate";
import type {
  BriefPlanEvidenceItem,
  BuildCriminalBriefPlanInput,
  CriminalBriefPlan,
  CriminalBriefPlanProfile,
  MaterialEvidenceBucket,
} from "./types";

function playbookLineSourceBacked(label: string, bundleText: string): boolean {
  const t = label.toLowerCase();
  const b = bundleText;
  // Narrow CAD vs 999 vs control-room — CAD timing must not authorise 999 audio lines.
  if (/\b999\b|\bcall audio\b|\bemergency call\b/i.test(t)) {
    if (!/\b999\b|\bcall audio\b|\bemergency call\b/i.test(b)) return false;
  }
  if (/\bcontrol[-\s]?room\b/i.test(t)) {
    if (!/\bcontrol[-\s]?room\b|\bdispatch\b/i.test(b)) return false;
  }
  if (/\bmg11\b|witness\s+statements?\b/i.test(t)) {
    if (!/\bmg11\b|witness\s+statement|signed\s+(?:final\s+)?(?:mg11|statement)/i.test(b)) {
      return false;
    }
  }
  const checks: Array<{ re: RegExp; family: ChaseGateFamily }> = [
    { re: /\binterview\b|transcript|\broti\b/, family: "interview" },
    { re: /\bbwv\b|body[-\s]?worn/, family: "bwv" },
    { re: /\bcctv\b|footage|master\s+footage/, family: "cctv" },
    // CAD-only lines (not 999/control-room — those gated above).
    { re: /\bcad\b/, family: "cad_999" },
    { re: /\bmedical\b|hospital|fme|injury/, family: "medical" },
    { re: /\bphone\b|extraction|handset|subscriber|device\s+download/, family: "phone" },
    { re: /\bretraction\b|further\s+statement/, family: "retraction_statement" },
    // Do not treat bare "PACE" as custody support — that re-admits interview playbook lines.
    { re: /\bcustody\b|detention|safeguard|risk\s+assessment/, family: "custody" },
  ];
  const matched = checks.filter(({ re }) => re.test(t));
  if (!matched.length) {
    // Lines already narrowed above (999/MG11/control-room) with no other family → keep if those passed.
    if (/\b999\b|\bcall audio\b|\bemergency call\b|\bcontrol[-\s]?room\b|\bmg11\b|witness\s+statements?\b/i.test(t)) {
      return true;
    }
    return true;
  }
  // If the line names interview/transcript, require interview to be source-backed
  // even when another family (e.g. custody) is also named.
  if (/\binterview\b|transcript|\broti\b/.test(t) && familySupport("interview", bundleText) === "absent") {
    return false;
  }
  // Compound lines (e.g. "CCTV/BWV") must not survive on a single family match.
  return matched.every(({ family }) => familySupport(family, bundleText) !== "absent");
}

function filterPlaybookLines(lines: string[], bundleText: string): string[] {
  if (!bundleText.trim()) return lines;
  return lines.filter((line) => playbookLineSourceBacked(line, bundleText));
}

function compact(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function categoryForText(text: string): SourceTruthEvidenceCategory {
  if (/\b(?:bwv|body[-\s]?worn|body\s+worn)\b/i.test(text)) return "bwv";
  if (/\b(?:custody|detention|pace\s+clock|safeguard)\b/i.test(text)) return "custody";
  if (/\b(?:cctv|footage|video|camera)\b/i.test(text)) return "cctv";
  if (/\b(?:cad|999|dispatch|control\s*room)\b/i.test(text)) return "cad_999";
  if (/\b(?:interview|transcript|pace)\b/i.test(text)) return "interview";
  if (/\b(?:mg11|witness|complainant)\b/i.test(text)) return "mg11";
  if (/\b(?:phone|device|extraction|download|metadata|screenshots?|messages?|imei)\b/i.test(text)) return "extraction";
  if (/\b(?:drug|pwits|controlled\s+substance|lab|continuity\s+seal)\b/i.test(text)) return "drugs";
  if (/\b(?:medical|injury|hospital|fme|pathology|expert)\b/i.test(text)) return "medical";
  if (/\b(?:abe|achieving\s+best\s+evidence)\b/i.test(text)) return "abe";
  if (/\b(?:mg6|unused|disclosure\s+schedule)\b/i.test(text)) return "mg6";
  return "unknown";
}

function bucketMaterials(rows: NormalisedMaterialRow[]): MaterialEvidenceBucket {
  const served: NormalisedMaterialRow[] = [];
  const limited: NormalisedMaterialRow[] = [];
  const missing: NormalisedMaterialRow[] = [];
  for (const row of rows) {
    if (row.status === "served") served.push(row);
    else if (["partial", "draft", "unsigned", "referred_only", "unclear"].includes(row.status)) limited.push(row);
    else missing.push(row);
  }
  return { served, limited, missing };
}

function toEvidenceItem(row: NormalisedMaterialRow): BriefPlanEvidenceItem {
  return {
    category: categoryForText(`${row.label} ${row.detail ?? ""} ${row.displayLine}`),
    label: compact(row.displayLine || row.label),
    state: row.status,
    sourceRef: row.scheduleRef,
  };
}

function missingLabelToEvidenceItem(label: string): BriefPlanEvidenceItem {
  const clean = compact(label);
  return {
    category: categoryForText(clean),
    label: clean,
    state: "outstanding",
    sourceRef: null,
  };
}

function profileFromOffence(family: BundleOffenceFamily): CriminalBriefPlanProfile | null {
  switch (family) {
    case "pwits":
    case "possession":
      return "drugs_pwits";
    case "fraud":
      return "fraud_account";
    case "robbery":
      return "robbery_id";
    case "harassment":
      return "domestic_harassment";
    case "sexual":
      return "sexual_abe";
    case "driving":
    case "motoring":
      return "driving_motoring";
    case "murder":
    case "manslaughter":
    case "gbh_s18":
    case "gbh_s20_abh":
    case "public_order":
    case "provisional_violence":
      return "violence_assault";
    default:
      return null;
  }
}

function resolvePlanProfile(input: {
  fingerprint: SourceTruthFingerprint;
  offenceFamily: BundleOffenceFamily;
  allegation?: string | null;
}): CriminalBriefPlanProfile {
  const allegation = input.allegation ?? "";
  if (/\b(?:robbery|identification|id procedure)\b/i.test(allegation)) return "robbery_id";
  if (/\b(?:fraud|false representation|account|bank)\b/i.test(allegation)) return "fraud_account";
  if (/\b(?:pwits|intent to supply|controlled drug|possession of.*drug)\b/i.test(allegation)) return "drugs_pwits";
  if (/\b(?:driving|motor|vehicle|road traffic|drink)\b/i.test(allegation)) return "driving_motoring";
  if (/\b(?:sexual|rape|abe)\b/i.test(allegation)) return "sexual_abe";
  if (/\b(?:harassment|stalking|coercive|domestic)\b/i.test(allegation)) return "domestic_harassment";
  if (input.fingerprint.evidence.custody) return "custody_pace";
  if (input.fingerprint.evidence.bwv) return "bwv_police_contact";
  if (/\b(?:assault|gbh|abh|wound|battery|violence)\b/i.test(allegation)) return "violence_assault";

  const fromOffence = profileFromOffence(input.offenceFamily);
  if (fromOffence) return fromOffence;

  const evidence = input.fingerprint.evidence;
  if (evidence.extraction) return "digital_attribution";
  if (evidence.custody) return "custody_pace";
  if (evidence.bwv) return "bwv_police_contact";
  if (evidence.abe) return "sexual_abe";
  if (evidence.drugs) return "drugs_pwits";
  return "mixed_unclear";
}

function uniqueEvidence(items: BriefPlanEvidenceItem[], max: number): BriefPlanEvidenceItem[] {
  const seen = new Set<string>();
  const out: BriefPlanEvidenceItem[] = [];
  for (const item of items) {
    const key = `${item.category}:${item.label.toLowerCase()}`;
    if (!item.label || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= max) break;
  }
  return out;
}

function forbiddenTopicsFor(planProfile: CriminalBriefPlanProfile, fingerprint: SourceTruthFingerprint): string[] {
  const topics: string[] = [];
  const evidence = fingerprint.evidence;
  if (!evidence.bwv && planProfile !== "bwv_police_contact") topics.push("BWV");
  if (!evidence.custody && planProfile !== "custody_pace") topics.push("custody safeguards");
  if (!evidence.drugs && planProfile !== "drugs_pwits") topics.push("drugs continuity");
  if (!evidence.abe && planProfile !== "sexual_abe") topics.push("ABE");
  if (!evidence.extraction && planProfile !== "digital_attribution") topics.push("phone extraction/metadata");
  return topics;
}

function mainIssueFor(profile: CriminalBriefPlanProfile, contradictionCount: number): string {
  const base: Record<CriminalBriefPlanProfile, string> = {
    digital_attribution: "Attribution and completeness of digital source material.",
    bwv_police_contact: "Sequence, force and what any served BWV can safely show.",
    custody_pace: "Custody/PACE safeguards and interview fairness.",
    domestic_harassment: "Relationship context, attribution and course of conduct.",
    drugs_pwits: "Possession, knowledge, intent and continuity.",
    violence_assault: "Sequence, injury and causation on the served papers — self-defence/first contact only if instructions or source support them.",
    sexual_abe: "ABE/source review, consent issues and disclosure sensitivity.",
    driving_motoring: "Driver identity, procedure and device/source reliability.",
    fraud_account: "Account control, dishonesty, attribution and loss reconciliation.",
    robbery_id: "Identification, participation and timing.",
    mixed_unclear: "Source truth and safe provisional positioning.",
  };
  return contradictionCount > 0 ? `${base[profile]} Contradictions need action.` : base[profile];
}

export function buildCriminalBriefPlan(input: BuildCriminalBriefPlanInput): CriminalBriefPlan {
  const bundleText = input.bundleText ?? "";
  const ledger = input.ledger ?? (bundleText.trim() ? buildBundleTruthLedger({ bundleText }) : null);
  const fingerprint = input.fingerprint ?? buildSourceTruthFingerprint({ bundleText, ledger });
  const contradictions = input.contradictions ?? extractAllBundleContradictions(bundleText);
  const profile = resolvePlanProfile({
    fingerprint,
    offenceFamily: ledger?.offenceFamily.family ?? "unknown",
    allegation: input.allegation ?? ledger?.charge.wording,
  });
  const playbook = CRIMINAL_BRIEF_PLAYBOOKS[profile];
  const buckets = bucketMaterials(ledger?.materials ?? []);
  const backedMissing = filterPlaybookLines(playbook.missingMaterial, bundleText);
  const backedChaseTemplates = filterPlaybookLines(playbook.chaseTemplates, bundleText);
  const filteredChaseAngle = filterPlaybookLines([playbook.safeWording.chase], bundleText);
  const backedChaseAngle =
    filteredChaseAngle[0] ??
    (backedMissing.length
      ? `The defence asks the court to record that ${backedMissing.slice(0, 2).join(" and ")} remain outstanding.`
      : "The defence asks the court to record that outstanding source material remains outstanding.");

  const servedEvidence = uniqueEvidence(buckets.served.map(toEvidenceItem), 24);
  const limitedEvidence = uniqueEvidence(
    // Prefer referred_only / schedule lines so they are not truncated out of the ledger
    [
      ...buckets.limited.filter((r) => r.status === "referred_only"),
      ...buckets.limited.filter((r) => r.status !== "referred_only"),
    ].map(toEvidenceItem),
    24,
  );
  const missingEvidence = uniqueEvidence(
    [
      ...buckets.missing.map(toEvidenceItem),
      ...(input.missingMaterial ?? []).map(missingLabelToEvidenceItem),
      ...backedMissing.map(missingLabelToEvidenceItem),
    ],
    24,
  );

  const contradictionRequired = contradictions.length
    ? ["Convert served contradiction(s) into a court line, chase ask, and summary risk."]
    : [];

  return {
    version: "criminal-brief-plan-v1",
    profile,
    mainIssue: mainIssueFor(profile, contradictions.length),
    servedEvidence,
    limitedEvidence,
    missingEvidence,
    todayAngle: playbook.safeWording.today,
    summaryAngle: playbook.safeWording.summary,
    chaseAngle: backedChaseAngle,
    forbiddenTopics: [...new Set([...forbiddenTopicsFor(profile, fingerprint), ...playbook.doNotOverstate])],
    requiredOutputItems: {
      today: [
        playbook.safeWording.today,
        "Keep the position provisional and tied to the uploaded papers.",
        ...contradictionRequired,
      ],
      summary: [playbook.safeWording.summary, ...playbook.opportunities.slice(0, 2), ...contradictionRequired],
      chase: [backedChaseAngle, ...backedChaseTemplates.slice(0, 3)],
    },
    playbookId: playbook.id,
    fingerprint,
  };
}
