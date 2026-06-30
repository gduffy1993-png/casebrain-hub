import type { ChaseGateFamily } from "@/lib/criminal/chase-source-gate";
import {
  familiesInText,
  familyDisplayName,
  familySupport,
  type FamilySupport,
} from "@/lib/criminal/chase-source-gate";
import { resolveSuppressionFamily, type ExtendedSuppressionFamily } from "./suppression-families";
import type { RewriteChangeType, SuppressedProofStatus } from "./proof-ledger-types";

export type GateSurfaceContext = {
  surface: string;
  field?: string;
};

export type RecordedSuppression = {
  candidateText: string;
  sourceFamily: ExtendedSuppressionFamily;
  surface: string;
  reasonSuppressed: string;
  searchedTerms: string[];
  matchedTerms: string[];
  supportingSourceFound: boolean;
  proofStatus: SuppressedProofStatus;
  unknownReason?: string;
};

export type RecordedRewrite = {
  originalCandidate: string;
  finalOutput: string;
  changeType: RewriteChangeType;
  reason: string;
  surface: string;
};

let activeSession: ProofLedgerSession | null = null;
let activeContext: GateSurfaceContext = { surface: "unknown" };

export function withProofLedgerSession<T>(session: ProofLedgerSession, fn: () => T): T {
  const prev = activeSession;
  activeSession = session;
  try {
    return fn();
  } finally {
    activeSession = prev;
  }
}

export function getActiveProofLedgerSession(): ProofLedgerSession | null {
  return activeSession;
}

export function setGateSurfaceContext(ctx: GateSurfaceContext): void {
  activeContext = ctx;
}

export function getGateSurfaceContext(): GateSurfaceContext {
  return activeContext;
}

function dedupeKey(text: string): string {
  return text.trim().toLowerCase().slice(0, 200);
}

function classifyFamilies(text: string, sourceText: string): {
  family: ChaseGateFamily | "compound" | "unknown";
  searchedTerms: string[];
  matchedTerms: string[];
  support: FamilySupport | "overclaim" | "trap_pattern";
} {
  const fams = familiesInText(text);
  const searchedTerms = fams.map((f) => familyDisplayName(f));
  const matchedTerms: string[] = [];
  let worst: FamilySupport = "mentioned";
  for (const f of fams) {
    const s = familySupport(f, sourceText);
    matchedTerms.push(`${familyDisplayName(f)}:${s}`);
    if (s === "absent" || (s === "negated" && worst === "mentioned")) worst = s;
    if (s === "negated") worst = "negated";
  }
  if (!fams.length) {
    return { family: "unknown", searchedTerms: [], matchedTerms: [], support: "overclaim" };
  }
  const family = fams.length > 1 ? "compound" : fams[0];
  return { family, searchedTerms, matchedTerms, support: worst };
}

function isKnownTrapOrOverclaim(candidateText: string, reasonOverride?: string): boolean {
  if (reasonOverride && /trap|overclaim|unsafe/i.test(reasonOverride)) return true;
  const t = candidateText.trim();
  if (/^cctv stills prove id$/i.test(t) || /^stills are full cctv$/i.test(t)) return true;
  if (/^encro proves supply$/i.test(t) || /\bencro proves\b/i.test(t)) return true;
  if (/\bcctv stills prove\b/i.test(t) || /\bstills are full cctv\b/i.test(t)) return true;
  return false;
}

function suppressionProofStatus(
  support: FamilySupport | "overclaim" | "trap_pattern",
  supportingSourceFound: boolean,
  matchedTerms: string[],
  candidateText: string,
  reasonOverride?: string,
): SuppressedProofStatus {
  if (isKnownTrapOrOverclaim(candidateText, reasonOverride)) return "correctly_suppressed_overclaim";
  if (support === "overclaim" || support === "trap_pattern") return "correctly_suppressed_overclaim";
  if (support === "negated") return "correctly_suppressed_no_source";
  if (support === "absent") return "correctly_suppressed_no_source";
  if (matchedTerms.some((m) => m.endsWith(":absent") || m.endsWith(":negated"))) {
    return "correctly_suppressed_no_source";
  }
  if (supportingSourceFound) return "needs_review_possible_false_suppression";
  return "correctly_suppressed_no_source";
}

export function buildSuppressionRecord(
  candidateText: string,
  sourceText: string,
  surface: string,
  reasonOverride?: string,
): RecordedSuppression {
  const { family, searchedTerms, matchedTerms, support } = classifyFamilies(candidateText, sourceText);
  const supportingSourceFound = matchedTerms.some((m) => m.endsWith(":mentioned"));
  const proofStatus = suppressionProofStatus(support, supportingSourceFound, matchedTerms, candidateText, reasonOverride);
  let reasonSuppressed = reasonOverride ?? "Output line dropped — material family not supported in bundle.";
  if (isKnownTrapOrOverclaim(candidateText, reasonOverride)) {
    reasonSuppressed = "Known unsafe trap or overclaim — bundle mention does not support the asserted proof level.";
  } else if (matchedTerms.some((m) => m.endsWith(":absent"))) {
    const absentFamilies = matchedTerms
      .filter((m) => m.endsWith(":absent"))
      .map((m) => m.split(":")[0])
      .join(", ");
    reasonSuppressed = `Compound/template line dropped — bundle does not mention ${absentFamilies}.`;
  } else if (support === "absent") {
    reasonSuppressed = `Bundle does not mention ${searchedTerms.join(", ") || "this material family"}.`;
  } else if (support === "negated") {
    reasonSuppressed = `Bundle explicitly negates ${searchedTerms.join(", ") || "this material"}.`;
  } else if (support === "overclaim") {
    reasonSuppressed = "Overclaim or unsafe wording removed — source does not support the claim.";
  } else if (support === "trap_pattern") {
    reasonSuppressed = "Known unsafe trap pattern — line not emitted.";
  }
  const resolved = resolveSuppressionFamily(candidateText, surface, family);
  return {
    candidateText,
    sourceFamily: resolved.family,
    surface,
    reasonSuppressed,
    searchedTerms,
    matchedTerms,
    supportingSourceFound,
    proofStatus,
    unknownReason: resolved.unknownReason,
  };
}

export function buildRewriteRecord(
  originalCandidate: string,
  finalOutput: string,
  sourceText: string,
  surface: string,
): RecordedRewrite {
  let changeType: RewriteChangeType = "other";
  let reason = "Wording adjusted before display.";
  if (/confirm in writing that none exists/i.test(finalOutput)) {
    changeType = "confirm_none";
    reason = "Bundle negates material — replaced chase with confirm-none wording.";
  } else if (/not safely confirmed|outstanding|referred to but not safely served/i.test(finalOutput)) {
    changeType = "overclaim_softened";
    reason = "Overclaim softened to match bundle support level.";
  } else if (/provisional|conditional on/i.test(finalOutput)) {
    changeType = "provisional_wording";
    reason = "Position marked provisional pending served material.";
  } else if (/handle|encro|attribution/i.test(originalCandidate)) {
    changeType = "attribution_guard";
    reason = "Attribution wording guarded — handle/subscriber not equated to defendant without source.";
  }
  if (originalCandidate !== finalOutput && /mg6|unused schedule/i.test(originalCandidate)) {
    changeType = "mg6_label";
    reason = "MG6 / schedule label humanised for solicitor use.";
  }
  void sourceText;
  return { originalCandidate, finalOutput, changeType, reason, surface };
}

export class ProofLedgerSession {
  private suppressions = new Map<string, RecordedSuppression>();
  private rewrites = new Map<string, RecordedRewrite>();

  recordSuppression(record: RecordedSuppression): void {
    const key = `${record.surface}::${dedupeKey(record.candidateText)}`;
    if (!this.suppressions.has(key)) this.suppressions.set(key, record);
  }

  recordRewrite(record: RecordedRewrite): void {
    if (record.originalCandidate.trim() === record.finalOutput.trim()) return;
    const key = `${record.surface}::${dedupeKey(record.originalCandidate)}`;
    if (!this.rewrites.has(key)) this.rewrites.set(key, record);
  }

  recordSuppressedLine(candidateText: string, sourceText: string, reasonOverride?: string): void {
    const ctx = getGateSurfaceContext();
    this.recordSuppression(buildSuppressionRecord(candidateText, sourceText, ctx.surface, reasonOverride));
  }

  recordRewrittenLine(originalCandidate: string, finalOutput: string, sourceText: string): void {
    const ctx = getGateSurfaceContext();
    this.recordRewrite(buildRewriteRecord(originalCandidate, finalOutput, sourceText, ctx.surface));
  }

  getSuppressions(): RecordedSuppression[] {
    return [...this.suppressions.values()];
  }

  getRewrites(): RecordedRewrite[] {
    return [...this.rewrites.values()];
  }
}
