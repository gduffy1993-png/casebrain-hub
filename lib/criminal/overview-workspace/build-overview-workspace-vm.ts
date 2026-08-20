/**
 * Presentation mapper: canonical evidence + LI → ranked Overview attention issues.
 * Does NOT mutate counts, chase, readiness, or LI generation.
 */

import type { FiveAnswersContradictionRow, FiveAnswersEvidenceRow } from "@/lib/criminal/five-answers/types";
import type {
  AdvisoryConsideration,
  LegalIntelligenceResult,
  NotEstablishedClaim,
} from "@/lib/criminal/legal-intelligence";
import { countAuthoritativeEvidenceRows } from "@/lib/criminal/overview-presentation";
import { humanizeEvidenceLabel, isUnusableEvidenceDisplayLabel } from "@/components/criminal/five-answers/evidence-display";
import {
  formatFindingProvenanceLine,
  pageProvenanceForSurface,
  type FindingProvenance,
} from "@/lib/criminal/finding-provenance";
import type { MatterConfidenceResult } from "@/lib/criminal/matter-confidence/matter-confidence-types";
import {
  isInternalLookingIssueTitle,
  projectNotEstablishedSummary,
  projectNotEstablishedTitle,
  projectSolicitorDisplayText,
  projectSourceLine,
} from "./display-projection";
import type {
  OverviewAttentionIssue,
  OverviewImpactTag,
  OverviewIssueStatus,
  OverviewWorkspaceVm,
} from "./types";

export const OVERVIEW_TOP_ISSUE_LIMIT = 7;

export type OverviewChaseItemInput = {
  id?: string;
  label: string;
  whyItMatters?: string | null;
  draftChaseWording?: string | null;
  courtLine?: string | null;
  source?: string | null;
  evidenceAnchor?: string | null;
  provenance?: FindingProvenance | null;
  urgency?: "high" | "medium" | "low" | null;
};

export type BuildOverviewWorkspaceVmInput = {
  caseId: string;
  clientLabel?: string | null;
  chargeLabel?: string | null;
  courtLabel?: string | null;
  hearingLabel?: string | null;
  stageLabel?: string | null;
  matterConfidence?: MatterConfidenceResult | null;
  evidenceRows: FiveAnswersEvidenceRow[];
  chaseItems: OverviewChaseItemInput[];
  contradictions?: FiveAnswersContradictionRow[] | null;
  legalIntelligence?: LegalIntelligenceResult | null;
  overviewConsiderations?: AdvisoryConsideration[] | null;
  safeCourtLine?: string | null;
  safeCourtLineCanCopy?: boolean;
  clientSummary?: string | null;
};

function statusLabel(status: OverviewIssueStatus): string {
  switch (status) {
    case "missing_outstanding":
      return "OUTSTANDING";
    case "incomplete":
      return "INCOMPLETE";
    case "not_safely_confirmed":
      return "NOT SAFELY CONFIRMED";
    case "contradiction":
      return "CONTRADICTION";
    case "check":
      return "CHECK";
    case "consider":
      return "CONSIDER";
  }
}

function impactFor(text: string, advisory = false): OverviewImpactTag[] {
  const t = text.toLowerCase();
  const tags: OverviewImpactTag[] = [];
  if (advisory && /self-?defence|first.?contact|defence position|instructions/i.test(t)) {
    tags.push("Defence consideration");
  }
  if (/cctv|identification|id parade|recognition|stills|bwv/i.test(t)) tags.push("Identification");
  if (/sequence|timeline|clip|master|continuity/i.test(t)) tags.push("Sequence");
  if (/mg6|disclosure|unused|schedule|phone|download|completeness|export/i.test(t)) {
    tags.push("Completeness");
  }
  if (/interview|credibility|reliability|mg11|witness/i.test(t)) tags.push("Reliability");
  if (/cad|999|timing|listing|pace|clock/i.test(t)) tags.push("Timing");
  if (/court|hearing|bail|ptph|plea/i.test(t)) tags.push("Court");
  if (/chase|outstanding|served|disclosure/i.test(t)) tags.push("Disclosure");
  if (/instruction|client|account/i.test(t)) tags.push("Instructions");
  if (!tags.length) tags.push(advisory ? "Defence consideration" : "Disclosure");
  return [...new Set(tags)].slice(0, 3);
}

function normalizeKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokensOverlap(a: string, b: string): boolean {
  const ta = new Set(normalizeKey(a).split(" ").filter((w) => w.length > 3));
  const tb = normalizeKey(b).split(" ").filter((w) => w.length > 3);
  if (!ta.size || !tb.length) return false;
  let hits = 0;
  for (const w of tb) if (ta.has(w)) hits += 1;
  return hits >= 2 || (hits >= 1 && tb.length <= 3);
}

function findMatchingChase(
  title: string,
  chaseItems: OverviewChaseItemInput[],
): OverviewChaseItemInput | null {
  const key = normalizeKey(title);
  for (const item of chaseItems) {
    const label = normalizeKey(item.label);
    if (!label) continue;
    if (label === key || label.includes(key) || key.includes(label) || tokensOverlap(title, item.label)) {
      return item;
    }
  }
  return null;
}

function sourceLinesFromChase(item: OverviewChaseItemInput | null): string[] {
  if (!item) return [];
  if (item.provenance) {
    const page = pageProvenanceForSurface(item.provenance);
    const line = projectSourceLine({
      documentTitle: item.provenance.sourceDocumentTitle,
      pageLabel: page.pageLabel,
      fallback: formatFindingProvenanceLine(item.provenance),
    });
    return [line];
  }
  if (item.evidenceAnchor?.trim()) {
    return [projectSolicitorDisplayText(item.evidenceAnchor)];
  }
  if (item.source?.trim()) {
    return [projectSolicitorDisplayText(item.source)];
  }
  return [];
}

function sourceLinesFromLi(refs: string[] | undefined): string[] {
  if (!refs?.length) return [];
  return refs
    .map((r) => projectSolicitorDisplayText(r))
    .filter(Boolean)
    .slice(0, 4);
}

function readinessFromConfidence(level: MatterConfidenceResult["level"] | undefined): {
  provisional: boolean;
  statusBadge: string;
  readinessBanner: string | null;
  readinessDetail: string;
  readinessCategory: OverviewWorkspaceVm["readinessCategory"];
} {
  switch (level) {
    case "safe":
      return {
        provisional: false,
        statusBadge: "Paper-backed",
        readinessBanner: null,
        readinessDetail: "Matter confidence is paper-backed on current papers — still solicitor review before reliance.",
        readinessCategory: "paper_backed",
      };
    case "blocked":
      return {
        provisional: true,
        statusBadge: "Blocked — review required",
        readinessBanner: "Not ready for final court position",
        readinessDetail: "Blocked on current papers — solicitor review required before fixing position.",
        readinessCategory: "blocked",
      };
    case "needs_review":
    case "provisional":
    default:
      return {
        provisional: true,
        statusBadge: "Provisional — check papers",
        readinessBanner: "Not ready for final court position",
        readinessDetail: "Provisional — solicitor review required before fixing position.",
        readinessCategory: "provisional",
      };
  }
}

function existenceToStatus(existence: FiveAnswersEvidenceRow["existence"]): OverviewIssueStatus | null {
  switch (existence) {
    case "missing":
    case "referred_only":
      return "missing_outstanding";
    case "incomplete":
      return "incomplete";
    case "not_safely_confirmed":
    case "unknown":
      return "not_safely_confirmed";
    default:
      return null;
  }
}

function scoreEvidence(existence: FiveAnswersEvidenceRow["existence"], urgency?: string | null): number {
  let base =
    existence === "missing"
      ? 100
      : existence === "referred_only"
        ? 95
        : existence === "incomplete"
          ? 80
          : existence === "not_safely_confirmed"
            ? 70
            : 40;
  if (urgency === "high") base += 8;
  if (urgency === "low") base -= 5;
  return base;
}

function safeText(value: string | null | undefined, fallback: string): string {
  const t = projectSolicitorDisplayText(value);
  return t || fallback;
}

function findRelatedConsideration(
  issueText: string,
  considerations: AdvisoryConsideration[],
): AdvisoryConsideration | null {
  for (const c of considerations) {
    if (tokensOverlap(issueText, `${c.what} ${c.why} ${c.canonicalTriggers.join(" ")}`)) {
      return c;
    }
  }
  return null;
}

/**
 * Pure presentation mapper. Ranking/filter must not change authoritative totals.
 */
export function buildOverviewWorkspaceVm(input: BuildOverviewWorkspaceVmInput): OverviewWorkspaceVm {
  const readiness = readinessFromConfidence(input.matterConfidence?.level);
  const evidenceCounts = countAuthoritativeEvidenceRows(input.evidenceRows);
  const chaseItems = input.chaseItems ?? [];
  const considerations = input.overviewConsiderations ?? input.legalIntelligence?.considerations ?? [];
  const notEstablished = input.legalIntelligence?.notEstablished ?? [];
  const contradictions = input.contradictions ?? [];

  const issues: OverviewAttentionIssue[] = [];
  const seenKeys = new Set<string>();

  const pushIssue = (issue: OverviewAttentionIssue) => {
    const key = normalizeKey(issue.title);
    if (!key || seenKeys.has(key)) return;
    if (isInternalLookingIssueTitle(issue.title)) return;
    if (isUnusableEvidenceDisplayLabel(issue.title)) return;
    seenKeys.add(key);
    issues.push(issue);
  };

  // 1) Authoritative evidence gaps (factual)
  for (const [i, row] of input.evidenceRows.entries()) {
    const status = existenceToStatus(row.existence);
    if (!status) continue;
    const title =
      humanizeEvidenceLabel(row.label, row.existence) ||
      projectSolicitorDisplayText(row.label);
    if (!title) continue;
    const chase = findMatchingChase(title, chaseItems);
    const related = findRelatedConsideration(title, considerations);
    const why =
      projectSolicitorDisplayText(row.note) ||
      (status === "missing_outstanding"
        ? "Not present as served material on the current papers."
        : status === "incomplete"
          ? "On file but incomplete — check the full source before reliance."
          : "Not safely confirmed on the current papers.");
    pushIssue({
      id: `ev-${i}-${keySlice(title)}`,
      title,
      summary: why,
      status,
      statusLabel: statusLabel(status),
      impact: impactFor(`${row.label} ${title}`),
      whySaysThis: why,
      sources: sourceLinesFromChase(chase).length
        ? sourceLinesFromChase(chase)
        : ["Canonical evidence state on current papers"],
      whyItMatters:
        projectSolicitorDisplayText(chase?.whyItMatters) ||
        projectSolicitorDisplayText(related?.why) ||
        "Material to disclosure completeness and what can safely be said.",
      consider: related ? projectSolicitorDisplayText(related.what) : null,
      recommendedAction:
        status === "missing_outstanding"
          ? chase?.draftChaseWording
            ? projectSolicitorDisplayText(chase.draftChaseWording)
            : `Confirm whether ${title} has been served before reliance.`
          : `Confirm ${title} on the papers before reliance.`,
      chaseCopy: chase?.draftChaseWording?.trim()
        ? projectSolicitorDisplayText(chase.draftChaseWording)
        : null,
      courtCopy: chase?.courtLine?.trim() ? projectSolicitorDisplayText(chase.courtLine) : null,
      kind: "evidence_gap",
      rankScore: scoreEvidence(row.existence, chase?.urgency),
    });
  }

  // 2) Chase items not already covered by evidence titles
  for (const [i, item] of chaseItems.entries()) {
    const title = projectSolicitorDisplayText(item.label);
    if (!title) continue;
    const key = normalizeKey(title);
    if (seenKeys.has(key)) continue;
    const related = findRelatedConsideration(title, considerations);
    const why =
      projectSolicitorDisplayText(item.whyItMatters) ||
      "Outstanding on the current chase list — solicitor review before reliance.";
    pushIssue({
      id: item.id?.trim() || `chase-${i}-${keySlice(title)}`,
      title,
      summary: why,
      status: "missing_outstanding",
      statusLabel: statusLabel("missing_outstanding"),
      impact: impactFor(title),
      whySaysThis: why,
      sources: sourceLinesFromChase(item).length
        ? sourceLinesFromChase(item)
        : ["Source-supported disclosure chase item"],
      whyItMatters: why,
      consider: related ? projectSolicitorDisplayText(related.what) : null,
      recommendedAction: item.draftChaseWording?.trim()
        ? projectSolicitorDisplayText(item.draftChaseWording)
        : `Chase Crown for ${title}.`,
      chaseCopy: item.draftChaseWording?.trim()
        ? projectSolicitorDisplayText(item.draftChaseWording)
        : null,
      courtCopy: item.courtLine?.trim() ? projectSolicitorDisplayText(item.courtLine) : null,
      kind: "evidence_gap",
      rankScore: 92 + (item.urgency === "high" ? 6 : item.urgency === "low" ? -4 : 0),
    });
  }

  // 3) Contradictions
  for (const [i, row] of contradictions.entries()) {
    const title = projectSolicitorDisplayText(row.label) || "Source contradiction";
    const summary = projectSolicitorDisplayText(row.summary) || "Papers raise a contradiction that needs checking.";
    pushIssue({
      id: `contra-${i}-${keySlice(title)}`,
      title,
      summary,
      status: "contradiction",
      statusLabel: statusLabel("contradiction"),
      impact: impactFor(`${title} ${summary}`),
      whySaysThis: summary,
      sources: ["Canonical contradiction surface on current papers"],
      whyItMatters: "Contradictions affect what can safely be said and may need disclosure chase or instructions.",
      consider: null,
      recommendedAction: "Check the source papers and keep the position provisional until resolved.",
      chaseCopy: null,
      courtCopy: null,
      kind: "contradiction",
      rankScore: 90,
    });
  }

  // 4) Not-established — negative-first, never as missing evidence
  for (const [i, claim] of notEstablished.entries()) {
    const title = projectNotEstablishedTitle(claim.label);
    const summary = projectNotEstablishedSummary(claim.label, claim.reason);
    const related =
      (claim.relatedConsiderationId
        ? considerations.find((c) => c.id === claim.relatedConsiderationId)
        : null) ?? findRelatedConsideration(`${claim.label} ${claim.reason}`, considerations);
    pushIssue({
      id: claim.id || `ne-${i}-${keySlice(title)}`,
      title,
      summary,
      status: "consider",
      statusLabel: "NOT ESTABLISHED",
      impact: impactFor(`${claim.label} ${claim.reason}`, true),
      whySaysThis: summary,
      sources: ["Legal intelligence — not established from current papers"],
      whyItMatters:
        projectSolicitorDisplayText(related?.why) ||
        "Avoid treating this as outstanding disclosure or as an established case position.",
      consider: related ? projectSolicitorDisplayText(related.what) : null,
      recommendedAction: "Keep wording provisional — do not chase or assert this as fact from current papers alone.",
      chaseCopy: null, // firewall: not-established never enables Chase
      courtCopy: null,
      kind: "not_established",
      rankScore: 42,
    });
  }

  // 5) Practitioner considerations not already linked
  for (const [i, c] of considerations.entries()) {
    const title = projectSolicitorDisplayText(c.what);
    if (!title) continue;
    // Soft dedupe against existing titles
    if ([...seenKeys].some((k) => tokensOverlap(k, title) || normalizeKey(title).includes(k))) {
      continue;
    }
    const generic = c.scope === "general_professional" || Boolean(c.offenceShapeOnly);
    pushIssue({
      id: c.id || `consider-${i}-${keySlice(title)}`,
      title: shortenConsiderTitle(title),
      summary: projectSolicitorDisplayText(c.why) || "Practitioner consideration — advisory only.",
      status: "consider",
      statusLabel: statusLabel("consider"),
      impact: impactFor(`${c.what} ${c.why}`, true),
      whySaysThis:
        projectSolicitorDisplayText(c.why) ||
        "Raised from legal intelligence on the current papers — advisory only.",
      sources: sourceLinesFromLi(c.provenance).length
        ? sourceLinesFromLi(c.provenance)
        : sourceLinesFromLi(c.canonicalTriggers).length
          ? sourceLinesFromLi(c.canonicalTriggers)
          : ["Practitioner consideration — not a factual evidence gap"],
      whyItMatters: projectSolicitorDisplayText(c.why) || "May affect case preparation; not a chase trigger alone.",
      consider: title,
      recommendedAction: c.mustConfirmBeforeFactualLanguage?.[0]
        ? projectSolicitorDisplayText(c.mustConfirmBeforeFactualLanguage[0])
        : "Confirm on papers before using factual, chase, or court language.",
      chaseCopy: null, // firewall: consideration alone never enables Chase
      courtCopy: null,
      kind: "consideration",
      rankScore: generic ? 22 : 35,
    });
  }

  issues.sort((a, b) => b.rankScore - a.rankScore || a.title.localeCompare(b.title));

  const clientUpdate = safeText(
    input.clientSummary,
    "Client update will appear once the papers are processed. Keep explanations provisional.",
  );
  const safeCourtLine = safeText(
    input.safeCourtLine,
    "Court line not safely available on current papers — solicitor review required.",
  );

  return {
    caseId: input.caseId,
    clientLabel: safeText(input.clientLabel, "Client name not safely identified"),
    chargeLabel: safeText(input.chargeLabel, "Charge not safely identified"),
    stageLabel: safeText(input.stageLabel, "Stage not safely identified"),
    courtLabel: safeText(input.courtLabel, "Court not safely identified"),
    hearingLabel: safeText(input.hearingLabel, "Hearing not safely identified"),
    provisional: readiness.provisional,
    statusBadge: readiness.statusBadge,
    readinessBanner: readiness.readinessBanner,
    readinessDetail: readiness.readinessDetail,
    readinessCategory: readiness.readinessCategory,
    counts: {
      missingOutstanding: evidenceCounts.missing + evidenceCounts.referred,
      incomplete: evidenceCounts.incomplete,
      activeChases: chaseItems.length,
      notSafelyConfirmed: evidenceCounts.notSafelyConfirmed,
      evidence: { ...evidenceCounts },
    },
    issues,
    safeCourtLine,
    safeCourtLineCanCopy: Boolean(input.safeCourtLineCanCopy && input.safeCourtLine?.trim()),
    clientUpdate,
    clientUpdateAvailable: Boolean(input.clientSummary?.trim()),
  };
}

function keySlice(title: string): string {
  return normalizeKey(title).slice(0, 48).replace(/\s+/g, "-");
}

function shortenConsiderTitle(what: string): string {
  const t = what.replace(/^consider\s+/i, "").trim();
  if (t.length <= 72) return t.charAt(0).toUpperCase() + t.slice(1);
  return `${t.slice(0, 69).trim()}…`;
}

export function overviewIssueStatusTone(status: OverviewIssueStatus): "rose" | "amber" | "slate" | "violet" | "orange" {
  switch (status) {
    case "missing_outstanding":
      return "rose";
    case "incomplete":
    case "check":
      return "amber";
    case "contradiction":
      return "orange";
    case "consider":
      return "violet";
    default:
      return "slate";
  }
}

/** Chase copy affordance — only when chaseCopy is set (source-supported chase item). */
export function canCopyChaseRequest(issue: OverviewAttentionIssue | null | undefined): boolean {
  return Boolean(issue?.chaseCopy?.trim());
}

/** Court wording affordance — only when court-safe wording already exists. */
export function canCopyCourtWording(issue: OverviewAttentionIssue | null | undefined): boolean {
  return Boolean(issue?.courtCopy?.trim());
}
