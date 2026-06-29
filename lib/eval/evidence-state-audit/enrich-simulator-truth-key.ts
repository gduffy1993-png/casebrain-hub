import { convertSimulatorV2ToItemList } from "./truth-key-parse";
import type { EvidenceStateTruthKey, SimulatorV2TruthKey, TruthEvidenceState, TruthKeyEvidenceItem } from "./types";

type ItemOverride = {
  /** Substring match on evidence_item (case-insensitive). */
  match: string;
  correct_evidence_state: TruthEvidenceState;
  evidence_type?: string;
  defendant_relevance?: string;
  chase_needed?: boolean;
  safe_to_rely_on?: boolean;
  must_not_say?: string[];
};

type CaseCuration = {
  extraItems?: TruthKeyEvidenceItem[];
  overrides?: ItemOverride[];
};

/** Per-case trap curation — synthetic simulator material only. */
const CASE_CURATIONS: Record<string, CaseCuration> = {
  "sim-038": {
    overrides: [
      {
        match: "co-defendant chat",
        correct_evidence_state: "other_defendant_only",
        evidence_type: "encro_chat",
        defendant_relevance: "co_defendant_only",
        chase_needed: false,
        safe_to_rely_on: false,
        must_not_say: ["co-defendant messages show Rafiq", "bleed co-defendant chat to client"],
      },
      {
        match: "whether the handle",
        correct_evidence_state: "inferred_only",
        evidence_type: "inference_from_summary",
        chase_needed: true,
        safe_to_rely_on: false,
      },
      {
        match: "MG5 summary",
        correct_evidence_state: "served",
        evidence_type: "mg5",
      },
    ],
  },
  "sim-039": {
    overrides: [
      {
        match: "cropped message screenshots",
        correct_evidence_state: "incomplete",
        evidence_type: "digital_screenshot",
        chase_needed: true,
        safe_to_rely_on: false,
        must_not_say: ["screenshots are the full record", "complete chat shows"],
      },
      {
        match: "whether screenshots",
        correct_evidence_state: "not_safely_confirmed",
        chase_needed: true,
        safe_to_rely_on: false,
      },
    ],
  },
  "sim-041": {
    overrides: [
      {
        match: "whether exploitation",
        correct_evidence_state: "not_safely_confirmed",
        chase_needed: true,
        safe_to_rely_on: false,
      },
      {
        match: "NRM referral outcome",
        correct_evidence_state: "missing",
        evidence_type: "safeguarding",
        chase_needed: true,
      },
    ],
  },
  "sim-044": {
    overrides: [
      {
        match: "whether Imran",
        correct_evidence_state: "inferred_only",
        evidence_type: "inference_from_summary",
        chase_needed: true,
        must_not_say: ["presence proves participation", "joined the attack"],
      },
      {
        match: "body-worn video",
        correct_evidence_state: "referred_only",
        evidence_type: "bwv",
        chase_needed: true,
        must_not_say: ["BWV shows Imran assaulting"],
      },
    ],
  },
  "sim-045": {
    overrides: [
      {
        match: "short BWV clip",
        correct_evidence_state: "incomplete",
        evidence_type: "bwv",
        chase_needed: true,
        safe_to_rely_on: false,
        must_not_say: ["BWV confirms group attack"],
      },
      {
        match: "whether Leah",
        correct_evidence_state: "inferred_only",
        chase_needed: true,
        must_not_say: ["joint enterprise is proved", "intended serious injury"],
      },
      {
        match: "co-defendant interview",
        correct_evidence_state: "other_defendant_only",
        defendant_relevance: "co_defendant_only",
        evidence_type: "interview",
        chase_needed: false,
      },
    ],
  },
  "sim-050": {
    overrides: [
      {
        match: "complainant screenshots",
        correct_evidence_state: "incomplete",
        evidence_type: "digital_screenshot",
        chase_needed: true,
        must_not_say: ["screenshots prove harassment", "full download served"],
      },
      {
        match: "whether messages",
        correct_evidence_state: "not_safely_confirmed",
        chase_needed: true,
      },
    ],
  },
  "sim-055": {
    overrides: [
      {
        match: "BWV export",
        correct_evidence_state: "missing",
        evidence_type: "bwv",
        chase_needed: true,
        must_not_say: ["BWV shows assault"],
      },
      {
        match: "sequence before arrest",
        correct_evidence_state: "not_safely_confirmed",
        chase_needed: true,
      },
    ],
  },
  "sim-058": {
    overrides: [
      {
        match: "whether possession",
        correct_evidence_state: "inferred_only",
        must_not_say: ["tools prove intent", "was going equipped"],
      },
      {
        match: "tool photographs",
        correct_evidence_state: "referred_only",
        evidence_type: "photographs",
        chase_needed: true,
      },
    ],
  },
  "sim-061": {
    overrides: [
      {
        match: "whether refusal",
        correct_evidence_state: "not_safely_confirmed",
        chase_needed: true,
        must_not_say: ["refused", "warning was properly given"],
      },
    ],
  },
  "sim-042": {
    overrides: [
      {
        match: "co-defendant interview summary",
        correct_evidence_state: "other_defendant_only",
        defendant_relevance: "co_defendant_only",
        evidence_type: "interview",
        chase_needed: false,
      },
      {
        match: "which exhibits relate",
        correct_evidence_state: "not_safely_confirmed",
        chase_needed: true,
      },
    ],
  },
  "sim-048": {
    overrides: [
      {
        match: "ABE interview",
        correct_evidence_state: "referred_only",
        evidence_type: "abe",
        chase_needed: true,
        must_not_say: ["ABE proves allegation"],
      },
      {
        match: "whether delay",
        correct_evidence_state: "not_safely_confirmed",
        chase_needed: true,
      },
    ],
  },
  "sim-049": {
    overrides: [
      {
        match: "whether third-party",
        correct_evidence_state: "not_safely_confirmed",
        chase_needed: true,
      },
      {
        match: "ABE transcript",
        correct_evidence_state: "missing",
        chase_needed: true,
      },
    ],
  },
  "sim-054": {
    overrides: [
      {
        match: "whether Sasha",
        correct_evidence_state: "inferred_only",
        must_not_say: ["Sasha used violence", "CCTV shows Sasha"],
      },
      {
        match: "body-worn",
        correct_evidence_state: "referred_only",
        evidence_type: "bwv",
        chase_needed: true,
      },
    ],
  },
  "sim-059": {
    overrides: [
      {
        match: "whether procedure",
        correct_evidence_state: "not_safely_confirmed",
        chase_needed: true,
        must_not_say: ["procedure complied", "reading proves offence"],
      },
      {
        match: "custody/PACE",
        correct_evidence_state: "missing",
        evidence_type: "custody_pace",
        chase_needed: true,
      },
    ],
  },
  "sim-062": {
    overrides: [
      {
        match: "whether Meera was the driver",
        correct_evidence_state: "inferred_only",
        must_not_say: ["Meera drove uninsured", "keeper record proves driver"],
      },
      {
        match: "police stop BWV",
        correct_evidence_state: "referred_only",
        evidence_type: "bwv",
        chase_needed: true,
      },
    ],
  },
  "sim-063": {
    overrides: [
      {
        match: "knowledge, dishonesty",
        correct_evidence_state: "inferred_only",
        must_not_say: ["acted dishonestly", "overpayment is proved"],
      },
      {
        match: "interview summary",
        correct_evidence_state: "incomplete",
        evidence_type: "interview",
        chase_needed: true,
      },
    ],
  },
  "sim-066": {
    overrides: [
      {
        match: "intent to pervert",
        correct_evidence_state: "inferred_only",
        chase_needed: true,
      },
      {
        match: "email exhibit summary",
        correct_evidence_state: "incomplete",
        evidence_type: "digital",
        chase_needed: true,
      },
    ],
  },
  "sim-067": {
    overrides: [
      {
        match: "public place, possession",
        correct_evidence_state: "not_safely_confirmed",
        chase_needed: true,
        must_not_say: ["unlawfully possessed", "no reasonable excuse"],
      },
    ],
  },
  "sim-069": {
    overrides: [
      {
        match: "selected screenshots",
        correct_evidence_state: "incomplete",
        evidence_type: "digital_screenshot",
        chase_needed: true,
        must_not_say: ["screenshots prove coercion", "course of conduct proved"],
      },
      {
        match: "pattern, attribution",
        correct_evidence_state: "not_safely_confirmed",
        chase_needed: true,
      },
    ],
  },
  "sim-040": {
    overrides: [
      {
        match: "whether identification",
        correct_evidence_state: "inferred_only",
        chase_needed: true,
      },
    ],
  },
  "sim-043": {
    overrides: [
      {
        match: "whether the defendant",
        correct_evidence_state: "not_safely_confirmed",
        chase_needed: true,
      },
    ],
  },
  "sim-046": {
    overrides: [
      {
        match: "CCTV stills",
        correct_evidence_state: "incomplete",
        evidence_type: "cctv",
        chase_needed: true,
        must_not_say: ["CCTV identifies"],
      },
    ],
  },
  "sim-047": {
    overrides: [
      {
        match: "CCTV still",
        correct_evidence_state: "incomplete",
        evidence_type: "cctv",
        chase_needed: true,
      },
    ],
  },
  "sim-051": {
    overrides: [
      {
        match: "whether the stop",
        correct_evidence_state: "not_safely_confirmed",
        chase_needed: true,
      },
    ],
  },
  "sim-052": {
    overrides: [
      {
        match: "co-defendant",
        correct_evidence_state: "other_defendant_only",
        defendant_relevance: "co_defendant_only",
      },
    ],
  },
  "sim-053": {
    overrides: [
      {
        match: "cellsite",
        correct_evidence_state: "referred_only",
        chase_needed: true,
      },
    ],
  },
  "sim-056": {
    overrides: [
      {
        match: "whether continuity",
        correct_evidence_state: "not_safely_confirmed",
        chase_needed: true,
      },
    ],
  },
  "sim-057": {
    overrides: [
      {
        match: "ABE",
        correct_evidence_state: "referred_only",
        chase_needed: true,
      },
    ],
  },
  "sim-060": {
    overrides: [
      {
        match: "whether forensic",
        correct_evidence_state: "inferred_only",
        chase_needed: true,
      },
    ],
  },
  "sim-076": {
    overrides: [
      {
        match: "partial EncroChat screenshots",
        correct_evidence_state: "incomplete",
        evidence_type: "encro",
        chase_needed: true,
      },
      {
        match: "rotated scan pages",
        correct_evidence_state: "incomplete",
        chase_needed: true,
      },
      {
        match: "shared thread",
        correct_evidence_state: "not_safely_confirmed",
        chase_needed: true,
      },
      {
        match: "co-defendant chat",
        correct_evidence_state: "other_defendant_only",
        defendant_relevance: "co_defendant_only",
        chase_needed: false,
      },
    ],
  },
};

function simIdRange(from: number, to: number): string[] {
  return Array.from({ length: to - from + 1 }, (_, i) => `sim-${String(from + i).padStart(3, "0")}`);
}

function applyOverrides(items: TruthKeyEvidenceItem[], overrides: ItemOverride[] | undefined): TruthKeyEvidenceItem[] {
  if (!overrides?.length) return items;
  return items.map((item) => {
    const hit = overrides.find((o) => item.evidence_item.toLowerCase().includes(o.match.toLowerCase()));
    if (!hit) return item;
    return {
      ...item,
      correct_evidence_state: hit.correct_evidence_state,
      evidence_type: hit.evidence_type ?? item.evidence_type,
      defendant_relevance: hit.defendant_relevance ?? item.defendant_relevance,
      chase_needed: hit.chase_needed ?? item.chase_needed,
      safe_to_rely_on: hit.safe_to_rely_on ?? item.safe_to_rely_on,
      must_not_say: hit.must_not_say ?? item.must_not_say,
    };
  });
}

function inferEvidenceType(label: string, state: TruthEvidenceState): string | undefined {
  const l = label.toLowerCase();
  if (l.includes("bwv") || l.includes("body-worn")) return "bwv";
  if (l.includes("cctv")) return "cctv";
  if (l.includes("mg11") || l.includes("statement")) return "witness_statement";
  if (l.includes("mg5")) return "mg5";
  if (l.includes("phone") || l.includes("screenshot") || l.includes("download")) return "digital";
  if (l.includes("custody") || l.includes("pace")) return "custody_pace";
  if (l.includes("interview")) return "interview";
  if (l.includes("encro") || l.includes("handle")) return "encro";
  if (state === "inferred_only" || state === "not_safely_confirmed") return "inference_boundary";
  return undefined;
}

function enrichItems(items: TruthKeyEvidenceItem[]): TruthKeyEvidenceItem[] {
  return items.map((item) => ({
    ...item,
    evidence_type: item.evidence_type ?? inferEvidenceType(item.evidence_item, item.correct_evidence_state),
    chase_needed: item.chase_needed ?? item.correct_evidence_state !== "served",
    safe_to_rely_on: item.safe_to_rely_on ?? item.correct_evidence_state === "served",
    defendant_relevance:
      item.defendant_relevance ??
      (item.correct_evidence_state === "other_defendant_only" ? "co_defendant_only" : "primary_defendant"),
  }));
}

export function enrichSimulatorTruthKey(raw: SimulatorV2TruthKey): EvidenceStateTruthKey {
  const base = convertSimulatorV2ToItemList(raw);
  const curation = CASE_CURATIONS[raw.caseId] ?? {};

  let items = enrichItems(applyOverrides(base.evidenceItems, curation.overrides));
  if (curation.extraItems?.length) {
    items = [...items, ...curation.extraItems];
  }

  const mustNotSayGlobal = [...(raw.mustNotSayExpected ?? []), ...(raw.mustNotSay ?? [])].filter(Boolean);

  return {
    caseId: raw.caseId,
    title: raw.title,
    offenceFamily: raw.offenceFamily,
    offenceWording: raw.offenceWording,
    profile: raw.profile,
    bundleStatus: raw.bundleStatus ?? "synthetic_simulator",
    evidenceItems: items,
    expectedChaseItems: raw.expectedChaseItems,
    expectedSendability: raw.expectedSendability ?? "needs_solicitor_review",
    mustNotSayGlobal: [...new Set(mustNotSayGlobal)],
    blockingFailPatterns: raw.blockingFailPatterns ?? [],
  };
}

export const AUDIT_SIMULATOR_CASE_IDS = [
  // batch 1
  "sim-038",
  "sim-039",
  "sim-041",
  "sim-044",
  "sim-045",
  "sim-050",
  "sim-055",
  "sim-058",
  "sim-061",
  // batch 2 → 20 cases (+ proof-pack-01)
  "sim-042",
  "sim-048",
  "sim-049",
  "sim-054",
  "sim-059",
  "sim-062",
  "sim-063",
  "sim-066",
  "sim-067",
  "sim-069",
  // batch 3 → 30 cases
  "sim-040",
  "sim-043",
  "sim-046",
  "sim-047",
  "sim-051",
  "sim-052",
  "sim-053",
  "sim-056",
  "sim-057",
  "sim-060",
  // batch 4–6 → 60 cases (simulator v3)
  ...simIdRange(76, 105),
] as const;
