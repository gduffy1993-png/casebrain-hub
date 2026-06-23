import { buildBundleTruthLedger } from "@/lib/criminal/bundle-truth-ledger";
import type { BundleOffenceFamily, NormalisedMaterialRow } from "@/lib/criminal/bundle-truth-types";
import { extractAllBundleContradictions } from "@/lib/criminal/merge-bundle-contradictions";
import { buildSourceTruthFingerprint } from "@/lib/criminal/source-truth-guardian/fingerprint";
import type {
  SourceTruthEvidenceCategory,
  SourceTruthFingerprint,
} from "@/lib/criminal/source-truth-guardian/types";
import { CRIMINAL_BRIEF_PLAYBOOKS } from "./playbooks";
import type {
  BriefPlanEvidenceItem,
  BuildCriminalBriefPlanInput,
  CriminalBriefPlan,
  CriminalBriefPlanProfile,
  MaterialEvidenceBucket,
} from "./types";

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
    violence_assault: "Sequence, injury/causation and any self-defence/first-contact issue.",
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

  const servedEvidence = uniqueEvidence(buckets.served.map(toEvidenceItem), 8);
  const limitedEvidence = uniqueEvidence(buckets.limited.map(toEvidenceItem), 8);
  const missingEvidence = uniqueEvidence(
    [
      ...buckets.missing.map(toEvidenceItem),
      ...(input.missingMaterial ?? []).map(missingLabelToEvidenceItem),
      ...playbook.missingMaterial.map(missingLabelToEvidenceItem),
    ],
    10,
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
    chaseAngle: playbook.safeWording.chase,
    forbiddenTopics: [...new Set([...forbiddenTopicsFor(profile, fingerprint), ...playbook.doNotOverstate])],
    requiredOutputItems: {
      today: [
        playbook.safeWording.today,
        "Keep the position provisional and source-linked.",
        ...contradictionRequired,
      ],
      summary: [playbook.safeWording.summary, ...playbook.opportunities.slice(0, 2), ...contradictionRequired],
      chase: [playbook.safeWording.chase, ...playbook.chaseTemplates.slice(0, 3)],
    },
    playbookId: playbook.id,
    fingerprint,
  };
}
