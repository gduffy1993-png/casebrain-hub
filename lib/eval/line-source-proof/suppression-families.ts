/**
 * Extended suppression families for proof-ledger reporting.
 * Reclassifies gate "unknown" suppressions using surface + wording patterns.
 */
import type { ChaseGateFamily } from "@/lib/criminal/chase-source-gate";

export type ExtendedSuppressionFamily =
  | ChaseGateFamily
  | "compound"
  | "generic_strategy"
  | "custody_pace"
  | "court_note"
  | "cps_chase"
  | "client_summary"
  | "export_wording"
  | "template_safety_guard"
  | "charge_allegation"
  | "abe_first_account"
  | "unknown_unclassified";

const DISPLAY: Record<ExtendedSuppressionFamily, string> = {
  cctv: "CCTV / footage",
  bwv: "BWV",
  cad_999: "CAD / 999",
  medical: "Medical / expert",
  interview: "Interview / transcript",
  mg6_unused: "MG6 / unused schedule",
  phone: "Phone / download",
  forensic: "Forensic",
  bank_financial: "Bank / financial",
  encro_handle: "Encro / handle",
  compound: "Compound (multi-family)",
  generic_strategy: "Generic strategy line",
  custody_pace: "Custody / PACE",
  court_note: "Court note",
  cps_chase: "CPS chase",
  client_summary: "Client summary",
  export_wording: "Export / war-room wording",
  template_safety_guard: "Template safety guard",
  charge_allegation: "Charge / allegation",
  abe_first_account: "ABE / first account",
  unknown_unclassified: "Unclassified (see note)",
};

export function suppressionFamilyDisplayName(family: ExtendedSuppressionFamily): string {
  return DISPLAY[family] ?? family;
}

export function resolveSuppressionFamily(
  candidateText: string,
  surface: string,
  gateFamily: ChaseGateFamily | "compound" | "unknown",
): { family: ExtendedSuppressionFamily; unknownReason?: string } {
  if (gateFamily === "compound") return { family: "compound" };
  if (gateFamily !== "unknown") return { family: gateFamily };

  const t = candidateText.toLowerCase();
  const s = surface.toLowerCase();

  if (/court_note|ask_court|safe_court/.test(s)) return { family: "court_note" };
  if (/do_not_overstate|safety|warnings|must_not/.test(s)) return { family: "template_safety_guard" };
  if (/client/.test(s)) return { family: "client_summary" };
  if (/export_pack|export_/.test(s)) return { family: "export_wording" };
  if (/disclosure_chase\.cps|disclosure_chase\.draft|cps_chase|chase\.label/.test(s) && !/why_it_matters/.test(s)) {
    return { family: "cps_chase" };
  }
  if (/why_it_matters|disclosure_chase\.summary/.test(s)) return { family: "cps_chase" };
  if (/war_room/.test(s)) {
    if (/instructions|position|strategic|hearing|provisional|participation|presence/.test(t)) {
      return { family: "generic_strategy" };
    }
    return { family: "export_wording" };
  }

  if (/\babe\b|first account|achieving best evidence/i.test(t)) return { family: "abe_first_account" };
  if (/\bcustody\b|\bpace\b|detention|custody record/i.test(t)) return { family: "custody_pace" };
  if (/\bcctv\b|master footage|stills|camera footage/i.test(t)) return { family: "cctv" };
  if (/\bbwv\b|body.worn/i.test(t)) return { family: "bwv" };
  if (/\bcad\b|\b999\b|call log|emergency call/i.test(t)) return { family: "cad_999" };
  if (/\bphone\b|subscriber|extraction|download|ufed|screenshot|handset/i.test(t)) return { family: "phone" };
  if (/forensic|\bdna\b|fingerprint|\bswab\b/i.test(t)) return { family: "forensic" };
  if (/medical|hospital|gp record|pathology|injury report/i.test(t)) return { family: "medical" };
  if (/\binterview\b|transcript/i.test(t)) return { family: "interview" };
  if (/\bmg6\b|unused schedule|disclosure schedule/i.test(t)) return { family: "mg6_unused" };
  if (/\bencro\b|handle mapping|shadow-/i.test(t)) return { family: "encro_handle" };
  if (/bank|fraud|account|transaction|poca/i.test(t)) return { family: "bank_financial" };
  if (/possession of|contrary to section|statement of offence|indecent images/i.test(t)) {
    return { family: "charge_allegation" };
  }
  if (
    /strategic|hearing position|participation|presence only|take instructions|defence position|do not fix facts|sequence/i.test(
      t,
    )
  ) {
    return { family: "generic_strategy" };
  }
  if (/please provide|chase|outstanding|obtain|secure/i.test(t)) return { family: "cps_chase" };

  return {
    family: "unknown_unclassified",
    unknownReason:
      "No material-family keyword or export surface matched — likely generic scaffolding dropped by the presentation gate.",
  };
}

export function truncateAtWord(text: string, maxLen: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLen) return trimmed;
  const cut = trimmed.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace > maxLen * 0.55) return `${cut.slice(0, lastSpace)}…`;
  return `${cut}…`;
}
