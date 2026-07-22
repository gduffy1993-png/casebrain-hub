/**
 * Phase 11 remediation — regenerate blinded v5 comparison set.
 * v5 CARRIES FORWARD the exact same 43 v4 goldIds/fixtures UNCHANGED (lineage; the 33 v1
 * originals + the 10 gold-manual additions GOLD-11-034..043 introduced in v4). No new
 * additions, no removals. Membership is identical to v4 — only the FREEZE HASH changes
 * (it now folds in the v4 parent hash and a bumped version tag), per the remediation
 * instructions ("document as NEW freeze hash (membership+lineage, exclude frozenAt)").
 * Preserves v1, v2, v3 and v4 artefacts as before/after evidence. Does NOT modify them.
 *
 * Root cause fixed in this remediation round (v4 scan MISSED this false negative):
 *  - GOLD-11-039 (CASE-12 / historic sexual ABE) rendered a copyable ("canCopy": true)
 *    client_summary that was cut off mid-disclaimer ("...Not for court or CPS us") because
 *    the v4 render pipeline emitted `sanitizeSolicitorProse(clientSummaryPreview)` directly
 *    with no boundary check and no gate — a raw pass-through. The v4 scan only pattern-
 *    matched markdown previews for fixture ids / enums / builder names; it never asserted
 *    "no copyable surface ends mid-word / mid-disclaimer".
 *
 * Libs already fixed ahead of this script (exercised, not re-implemented, here):
 *  - lib/criminal/solicitor-visible-boundary.ts — hasIncompleteRequiredDisclaimer,
 *    assessSolicitorVisibleBoundary, finalizeSolicitorVisibleProse, assertCopyableSolicitorText.
 *    Never emits a mid-word / mid-sentence / mid-disclaimer cut on a copyable surface;
 *    fails closed (ok:false) instead.
 *  - lib/criminal/solicitor-sentence-composer.ts + lib/criminal/solicitor-output-gate.ts —
 *    sentence composer and the central gate now also run the boundary assessment and
 *    surface truncated_fragment / incomplete_sentence for incomplete disclaimers / mid-word
 *    cuts, not only for the old raw-marker / placeholder heuristics.
 *  - scripts/build-gold-manual-proof-set-v1.ts — clientPreview is no longer built with
 *    `.slice(0, 600)`; see build-gold-manual-proof-set-v1.ts clientPreview via
 *    presentClientSummaryForFamily (no hard slice).
 *  - artifacts/casebrain-qa/gold-manual-proof-set-v1/cases/CASE-12/actual-summary.json —
 *    clientSummaryPreview disclaimer completed at the source (still carries a leftover
 *    unclosed-bracket artefact from the original defect — assertCopyableSolicitorText
 *    correctly still fails this closed; see boundaryScan below).
 *  - components/criminal/hearing-war-room/HearingWarRoom.tsx and
 *    components/criminal/disclosure-chase/DisclosureChase.tsx no longer hard-slice
 *    summary text at 600/400 chars.
 *  - lib/criminal/solicitor-visible-sanitization.ts — sanitizeSolicitorProse updated:
 *    "Redacted papers have been served" wording, nested "in your case (Name)" → "for Name",
 *    leading-hyphen stripping, ANPR/SFR preserved in solicitorDisplayLabel.
 *
 * v5-specific render discipline added by THIS script (the actual v5 remediation):
 *  - renderCopyableSolicitorText(): every surface that can set canCopy=true on free
 *    solicitor prose (client_summary, court_line, cps_chase_draft, copy_preview,
 *    export_preview, family_leak_probe) is now built via
 *      sanitizeSolicitorProse → finalizeSolicitorVisibleProse → assertCopyableSolicitorText
 *      → gateSolicitorOutput({ mode: "copy" | "export", auditFamily }) → solicitorVisibleGatedCopy
 *    and NEVER sets canCopy=true / gateStatus="display" without all of those passing.
 *    If the boundary or the gate fails, a proportionate blocked preview
 *    (Item / Status / Reason via formatBlockedCopyPreview) is emitted with canCopy=false.
 *    cps_chase_draft in particular was previously (v4) ungated — fixed here.
 *  - Scan repair: scanCopyableBoundaryIntegrity() reads the COMPLETE rendered JSON (not
 *    markdown previews, not truncated samples) for every case in the v5 corpus, including
 *    GOLD-11-034..043, and asserts that no canCopy===true prose surface fails
 *    assessSolicitorVisibleBoundary (mid-word cut, mid-sentence cut, incomplete disclaimer,
 *    open bracket/quote, ellipsis cut) or is exactly 600 chars ending mid-disclaimer. The
 *    existing fixture/enum/placeholder markdown scan (scanSolicitorVisibleMarkdown) is kept
 *    unchanged and still runs on full text.
 *
 * No human judgments filled. programmePassSupported = false. Schema 1.1.0. Ledger untouched.
 *
 * Run: npx tsx scripts/integrity-programme/phase11-remediation-v6.ts
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import {
  buildCanonicalMatterStateV1,
  CANONICAL_MATTER_STATE_VERSION,
} from "@/lib/criminal/canonical-matter-state";
import type { FiveAnswersEvidenceRow } from "@/lib/criminal/five-answers/types";
import { buildDisclosureChaseBrief } from "@/components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { solicitorVisibleEvidenceTitle } from "@/lib/criminal/extraction-provenance-boundary";
import { classifyTextsAgainstConceptRegistry } from "@/lib/criminal/offence-family-concept-registry";
import { countEvidenceStatesForDisplay } from "@/lib/criminal/overview-presentation";
import {
  formatHearingStatusForDisplay,
  resolveSolicitorHearingStatus,
} from "@/lib/criminal/solicitor-hearing-status";
import { gateSolicitorOutput, resolveGateOffenceFamily } from "@/lib/criminal/solicitor-output-gate";
import { assessSolicitorSentence } from "@/lib/criminal/solicitor-sentence-composer";
import { phase2CentralSurfaceIds } from "@/lib/criminal/solicitor-surface-gate-registry";
import {
  displayForSafelyOmitted,
  REVIEW_REQUIRED_NEUTRAL,
} from "@/lib/criminal/structured-solicitor-output";
import {
  assertCopyableSolicitorText,
  assessSolicitorVisibleBoundary,
  finalizeSolicitorVisibleProse,
  hasIncompleteRequiredDisclaimer,
  type SolicitorBoundaryIssue,
} from "@/lib/criminal/solicitor-visible-boundary";
import {
  clientSummaryMatchesSemanticUnits,
  composeCompleteClientSummaryFromStructured,
  parseClientSummarySemanticUnits,
  type ClientSummarySemanticUnits,
} from "@/lib/criminal/client-safe-summary-compose";
import {
  preserveProtectedAcronyms,
  scanSolicitorVisibleCopyQuality,
  type SolicitorCopyQualityIssue,
} from "@/lib/criminal/solicitor-visible-quality";
import {
  dedupeSolicitorLabels,
  formatBlockedCopyPreview,
  hasMatterFamilyResolvedUnresolvedContradiction,
  humanBlockReason,
  humanizeEvidenceState,
  inferBlockedItemLabel,
  isFixtureIdLike,
  isInternalNonSolicitorString,
  NEUTRAL_SOLICITOR_BLOCKED_BANNER,
  QUALIFIED_SOLICITOR_REVIEW_QUEUE_BANNER,
  requiresQualifiedSolicitorReviewQueue,
  sanitizeSolicitorProse,
  solicitorDisplayLabel,
  solicitorVisibleGatedCopy,
} from "@/lib/criminal/solicitor-visible-sanitization";

const ROOT = path.resolve(__dirname, "../..");
const V1 = path.join(ROOT, "artifacts/casebrain-qa/integrity-programme/phase-11");
const OUT = path.join(ROOT, "artifacts/casebrain-qa/integrity-programme/phase-11-remediation");
const PREV_V2 = path.join(OUT, "v2"); // preserved evidence — do not write
const PREV_V3 = path.join(OUT, "v3"); // preserved evidence — do not write
const PREV_V4 = path.join(OUT, "v4"); // preserved evidence — do not write
const PREV_V5 = path.join(OUT, "v5"); // preserved evidence — do not write
const V6 = path.join(OUT, "v6");
const RENDER = path.join(V6, "rendered");
const BUNDLE = path.join(V6, "reviewer-bundle");
const BEFORE_AFTER = path.join(OUT, "before-after-surfaces-v6");
const DOCS = path.join(ROOT, "docs/integrity-programme");
const ESA = path.join(ROOT, "artifacts/evidence-state-audit-local/cases");
const GOLD_PACK = path.join(ROOT, "artifacts/casebrain-qa/gold-manual-proof-set-v1");
const DEMO_THIRTY = path.join(ROOT, "artifacts/casebrain-qa/demo-audit-thirty");
const DEMO_FIVE = path.join(ROOT, "artifacts/casebrain-qa/demo-audit-five");

const V1_FREEZE_HASH = "619f62a2d3408edf05cdb3e57304f4cdfd0e59a2c2247ab5a22fde973f5a9e3a";
const V2_FREEZE_HASH = "fcdd13e53f35a61fb1a2bf2f0faa7347ec896b1d28bd9098609ac486ab0b64c0";
const V3_FREEZE_HASH = "de6d04734c9636e49de0fe30ca3422f1750180ae9db8d9f1e75e52b3450c7767";
const V4_FREEZE_HASH = "d887114aac265e00e9a8d66c98c82fa087a85388e60f1fc930a6996b5d6ab883";
const V5_FREEZE_HASH = "3e2479c86769e3cd5342903997eaa548cfdc98a8339a34d0890bfc0178536f5d";

const MEMBERSHIP_MIN = 30;
const MEMBERSHIP_MAX = 50;
const SUBSTANTIVE_MIN = 30;
const SUBSTANTIVE_MAX = 50;

const KEY_COMPARISON_GOLDS = [
  "GOLD-11-001",
  "GOLD-11-002",
  "GOLD-11-003",
  "GOLD-11-004",
  "GOLD-11-005",
  "GOLD-11-006",
  "GOLD-11-007",
  "GOLD-11-008",
  "GOLD-11-009",
  "GOLD-11-010",
  "GOLD-11-011",
  "GOLD-11-012",
  "GOLD-11-013",
  "GOLD-11-014",
  "GOLD-11-018",
  "GOLD-11-019",
  "GOLD-11-021",
  "GOLD-11-022",
  "GOLD-11-025",
  "GOLD-11-029",
  "GOLD-11-033",
  "GOLD-11-034",
  "GOLD-11-035",
  "GOLD-11-036",
  "GOLD-11-037",
  "GOLD-11-038",
  "GOLD-11-039",
  "GOLD-11-040",
  "GOLD-11-041",
  "GOLD-11-042",
  "GOLD-11-043",
] as const;

type SampleDef = {
  goldId: string;
  stratum?: string;
  sourceKind: string;
  fixtureId: string;
  selectionReason?: string;
  reviewFocus?: string;
};

/**
 * Carried forward UNCHANGED from v4 (lineage) — the 10 previously-unused gold-manual
 * packets v4 added on top of the v1 33. v5 does not add or remove any membership; it
 * only strengthens the RENDER of copyable prose surfaces and the SCAN that checks them.
 */
const GOLD_MANUAL_ADDITIONS: SampleDef[] = [
  {
    goldId: "GOLD-11-034",
    stratum: "gold_manual_addition",
    sourceKind: "gold_manual_pack",
    fixtureId: "CASE-03:demo-audit-27-custody-pace-missing",
    selectionReason: "v4 remediation addition — previously unused gold-manual packet (BWV referred-only / PACE pressure).",
    reviewFocus: "Confirm chase/court wording accuracy; check disclosure chase dedupe and family consistency.",
  },
  {
    goldId: "GOLD-11-035",
    stratum: "gold_manual_addition",
    sourceKind: "gold_manual_pack",
    fixtureId: "CASE-06:demo-audit-04-co-def-interview",
    selectionReason: "v4 remediation addition — previously unused gold-manual packet (co-defendant interview / burglary).",
    reviewFocus: "Confirm chase/court wording accuracy; check disclosure chase dedupe and family consistency.",
  },
  {
    goldId: "GOLD-11-036",
    stratum: "gold_manual_addition",
    sourceKind: "gold_manual_pack",
    fixtureId: "CASE-09:demo-audit-32-restraining-order-breach",
    selectionReason: "v4 remediation addition — previously unused gold-manual packet (restraining order breach).",
    reviewFocus: "Confirm chase/court wording accuracy; check disclosure chase dedupe and family consistency.",
  },
  {
    goldId: "GOLD-11-037",
    stratum: "gold_manual_addition",
    sourceKind: "gold_manual_pack",
    fixtureId: "CASE-10:demo-audit-41-translated-messages",
    selectionReason: "v4 remediation addition — previously unused gold-manual packet (translated messages harassment).",
    reviewFocus: "Confirm chase/court wording accuracy; check disclosure chase dedupe and family consistency.",
  },
  {
    goldId: "GOLD-11-038",
    stratum: "gold_manual_addition",
    sourceKind: "gold_manual_pack",
    fixtureId: "CASE-11:demo-audit-22-youth-interview",
    selectionReason: "v4 remediation addition — previously unused gold-manual packet (youth interview / theft from a shop).",
    reviewFocus: "Confirm chase/court wording accuracy; check disclosure chase dedupe and family consistency.",
  },
  {
    goldId: "GOLD-11-039",
    stratum: "gold_manual_addition",
    sourceKind: "gold_manual_pack",
    fixtureId: "CASE-12:demo-audit-21-historic-sexual-abe",
    selectionReason: "v4 remediation addition — previously unused gold-manual packet (historic sexual ABE).",
    reviewFocus: "Confirm chase/court wording accuracy; check disclosure chase dedupe and family consistency. v5: confirms client_summary no longer copyable-truncated.",
  },
  {
    goldId: "GOLD-11-040",
    stratum: "gold_manual_addition",
    sourceKind: "gold_manual_pack",
    fixtureId: "CASE-13:demo-audit-50-lab-continuity-conflict",
    selectionReason: "v4 remediation addition — previously unused gold-manual packet (drugs lab continuity conflict).",
    reviewFocus: "Confirm chase/court wording accuracy; check disclosure chase dedupe and family consistency.",
  },
  {
    goldId: "GOLD-11-041",
    stratum: "gold_manual_addition",
    sourceKind: "gold_manual_pack",
    fixtureId: "CASE-14:demo-audit-16-fraud-bank-statements",
    selectionReason: "v4 remediation addition — previously unused gold-manual packet (fraud bank statements).",
    reviewFocus: "Confirm chase/court wording accuracy; check disclosure chase dedupe and family consistency.",
  },
  {
    goldId: "GOLD-11-042",
    stratum: "gold_manual_addition",
    sourceKind: "gold_manual_pack",
    fixtureId: "CASE-15:demo-audit-18-motoring-sjp-thin",
    selectionReason: "v4 remediation addition — previously unused gold-manual packet (motoring SJP thin bundle).",
    reviewFocus: "Confirm chase/court wording accuracy; check disclosure chase dedupe and family consistency.",
  },
  {
    goldId: "GOLD-11-043",
    stratum: "gold_manual_addition",
    sourceKind: "gold_manual_pack",
    fixtureId: "CASE-16:demo-audit-49-anpr-trap",
    selectionReason: "v4 remediation addition — previously unused gold-manual packet (ANPR vehicle trap).",
    reviewFocus: "Confirm chase/court wording accuracy; check disclosure chase dedupe and family consistency.",
  },
];

type Surface = {
  surface: string;
  label: string;
  solicitorVisibleText: string;
  gateStatus: string;
  canCopy: boolean | null;
  sourceEvidenceAvailable: boolean;
  sourceEvidenceNote: string;
  reviewEligibility?: "substantive" | "INSUFFICIENT_SOURCE_CONTEXT";
};

type RenderResult = {
  surfaces: Surface[];
  eligibility: "substantive" | "INSUFFICIENT_SOURCE_CONTEXT";
};

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

function readJson<T>(abs: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(abs, "utf8")) as T;
  } catch {
    return null;
  }
}

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

function walkStrings(v: unknown, out: string[], d = 0) {
  if (d > 5 || out.length >= 48) return;
  if (typeof v === "string" && v.length >= 8 && v.length <= 700) out.push(v);
  else if (Array.isArray(v)) v.slice(0, 30).forEach((x) => walkStrings(x, out, d + 1));
  else if (v && typeof v === "object") Object.values(v).slice(0, 30).forEach((x) => walkStrings(x, out, d + 1));
}

/** Structured audit family for a gold-manual packet, sourced from the ESA truth-key when available. */
function deriveAuditFamilyForSourceCaseId(sourceCaseId: string | undefined | null): string | null {
  if (!sourceCaseId?.trim()) return null;
  const truth = readJson<{ offenceFamily?: string }>(path.join(ESA, sourceCaseId.trim(), "truth-key.json"));
  return truth?.offenceFamily?.trim() || null;
}

function safeAllegationLine(allegation: string | null | undefined): { line: string; queued: boolean } {
  const raw = (allegation ?? "").trim();
  if (!raw || isFixtureIdLike(raw) || isInternalNonSolicitorString(raw)) {
    return { line: "Allegation not safely labelled from controlled source.", queued: false };
  }
  if (requiresQualifiedSolicitorReviewQueue(raw)) {
    return { line: QUALIFIED_SOLICITOR_REVIEW_QUEUE_BANNER, queued: true };
  }
  return { line: sanitizeSolicitorProse(raw), queued: false };
}

/**
 * Every packet's source context discloses a "Controlled evidence reference" line
 * (fixtureId / CASE-NN / packet path) so reviewers can trace provenance without the
 * surface ever echoing the primary judged output. This line is intentionally NOT
 * free-copy (source_context is always canCopy=false) and is excluded from the
 * fixture-leak scan by scanSolicitorVisibleMarkdown's redaction pass.
 */
function buildRedactedSourceContext(input: {
  evidenceReference: string;
  allegation?: string | null;
  clientLabel?: string | null;
  evidenceRows?: Array<{ label: string; existence: string }>;
  chaseLabels?: string[];
  hearingLabel?: string | null;
  available: boolean;
  reasonIfMissing: string;
}): { text: string; available: boolean; eligibility: "substantive" | "INSUFFICIENT_SOURCE_CONTEXT" } {
  const refLine = `Controlled evidence reference: ${input.evidenceReference}`;
  if (!input.available) {
    return {
      text: `${refLine}\nINSUFFICIENT_SOURCE_CONTEXT\n${input.reasonIfMissing}\nThis case is excluded from substantive FP/FN denominators until controlled source context is available.`,
      available: false,
      eligibility: "INSUFFICIENT_SOURCE_CONTEXT",
    };
  }
  const lines: string[] = [refLine, "Controlled source context (safely redacted for review)"];
  if (input.clientLabel && !isFixtureIdLike(input.clientLabel) && !isInternalNonSolicitorString(input.clientLabel)) {
    lines.push(`Client label: ${sanitizeSolicitorProse(input.clientLabel)}`);
  }
  if (input.allegation) {
    const alg = safeAllegationLine(input.allegation);
    // Source context is review evidence (not free-copy): when queued, show the
    // actual formula so reviewers can judge whether the queue is proportionate.
    if (alg.queued) {
      lines.push(
        `Allegation (queued for qualified solicitor review — not free-copy): ${sanitizeSolicitorProse(input.allegation.trim())}`,
      );
      lines.push(`Free-copy status: ${alg.line}`);
    } else {
      lines.push(`Allegation: ${alg.line}`);
    }
  }
  if (input.hearingLabel) lines.push(`Hearing: ${input.hearingLabel}`);
  const rows = (input.evidenceRows ?? [])
    .filter((r) => r.label && !isFixtureIdLike(r.label) && !isInternalNonSolicitorString(r.label))
    .slice(0, 12);
  if (rows.length) {
    lines.push("Evidence states:");
    for (const r of rows) {
      lines.push(`• ${solicitorDisplayLabel(r.label)} — ${humanizeEvidenceState(r.existence)}`);
    }
  }
  const chase = dedupeSolicitorLabels(
    (input.chaseLabels ?? []).filter((c) => c && !isFixtureIdLike(c) && !isInternalNonSolicitorString(c)),
  )
    .map((c) => sanitizeSolicitorProse(c))
    .slice(0, 10);
  if (chase.length) {
    lines.push("Chase / outstanding items:");
    for (const c of chase) lines.push(`• ${c}`);
  }
  if (lines.length <= 2) {
    return {
      text: `${refLine}\nINSUFFICIENT_SOURCE_CONTEXT\n${input.reasonIfMissing}`,
      available: false,
      eligibility: "INSUFFICIENT_SOURCE_CONTEXT",
    };
  }
  return { text: lines.join("\n"), available: true, eligibility: "substantive" };
}

/**
 * Independent expected-truth source for controlled synthetic technical controls.
 * Documents the test-harness design and expected pass condition — NOT a repetition
 * of the probe's own rendered output. When present, the synthetic is denominator-
 * eligible (reviewEligibility: "substantive"); absent, it stays INSUFFICIENT and is
 * excluded from substantive FP/FN.
 */
type SyntheticTruth = {
  probeKind: string;
  controlDescription: string;
  expectedBehavior: string;
};

const SYNTHETIC_EXPECTED_TRUTH: Record<string, SyntheticTruth> = {
  "SYN-TRUNC-01": {
    probeKind: "Controlled mid-word truncation at copy exit",
    controlDescription:
      "Test harness supplies a deliberately truncated fragment ending mid-word, independent of any real client bundle.",
    expectedBehavior:
      "Truncated fragment must fail closed: canCopy=false. A truncated fragment reaching solicitor copy would be a false negative.",
  },
  "SYN-TRUNC-TITLE-01": {
    probeKind: "Controlled truncated excerpt used as an evidence title",
    controlDescription:
      "Test harness supplies a title string ending mid-sentence with an ellipsis, independent of any real client bundle.",
    expectedBehavior: "Title must be withheld from solicitor display, not shown mid-word or mid-quote.",
  },
  "SYN-PROV-TITLE-01": {
    probeKind: "Controlled raw-extraction / truncated-title provenance probe",
    controlDescription:
      "Test harness supplies a quoted excerpt with an unterminated quotation mark, independent of any real client bundle.",
    expectedBehavior:
      "Provenance boundary must refuse the unsafe title rather than presenting it as a safe evidence title.",
  },
  "SYN-OMIT-01": {
    probeKind: "Controlled raw markdown-table fragment safely omitted from an overview field",
    controlDescription:
      "Test harness supplies a raw table-syntax fragment that should never reach solicitor display verbatim.",
    expectedBehavior: "Overview field must show the neutral review-required message, not a silent drop and not the raw fragment.",
  },
  "SYN-RR-01": {
    probeKind: "Controlled review-required neutral banner path",
    controlDescription:
      "Same controlled raw-fragment omission probe design as the paired overview-field probe, checked on the review-required surface instead.",
    expectedBehavior: "Solicitor sees the review-required neutral message; the output must not be treated as repaired prose.",
  },
  "SYN-RR-PLACEHOLDER-01": {
    probeKind: "Controlled unresolved template placeholder at copy exit",
    controlDescription:
      "Test harness supplies a string containing an unresolved merge-field placeholder token, independent of any real client bundle.",
    expectedBehavior:
      "Placeholder text must fail closed: canCopy=false. A placeholder reaching solicitor copy would be a false negative.",
  },
  "SYN-HEAR-UNKNOWN": {
    probeKind: "Controlled hearing-status probe — no next-hearing date supplied",
    controlDescription:
      "Test harness supplies no next-hearing date at all against its fixed controlled reference time.",
    expectedBehavior: "Hearing status must read as unknown / not safely extracted — never inferred or invented.",
  },
  "SYN-HEAR-SAME-DAY": {
    probeKind: "Controlled hearing-status probe — hearing date equals reference time",
    controlDescription:
      "Test harness fixes the next-hearing date to the same calendar day as its fixed controlled reference time, independent of any real client bundle.",
    expectedBehavior: "Hearing status must read as a same-day hearing.",
  },
  "SYN-HEAR-PASSED": {
    probeKind: "Controlled hearing-status probe — hearing date before reference time",
    controlDescription:
      "Test harness fixes the next-hearing date before its fixed controlled reference time, independent of any real client bundle.",
    expectedBehavior: "Hearing status must read as passed / overdue, not upcoming.",
  },
  "SYN-API-BLOCK-01": {
    probeKind: "Controlled integrity-blocked API response probe",
    controlDescription:
      "Test harness forces the API integrity-blocked path with no usable payload, independent of any real client bundle.",
    expectedBehavior:
      "Only the neutral blocked banner constant may be shown; the surface must carry no diagnostic, internal-status, or raw error wording of any kind.",
  },
  "SYN-EXPORT-FAMILY-01": {
    probeKind: "Controlled cross-family leak probe on an export surface",
    controlDescription:
      "Test harness supplies a harassment-matter export line that deliberately references defensive-force / PWITS drugs-supply concepts foreign to the matter's resolved family, independent of any real client bundle.",
    expectedBehavior: "Cross-family wording must be blocked on export (a false negative if it remains copyable).",
  },
  "SYN-FAM-LEAK-01": {
    probeKind: "Controlled cross-family leak probe on a copy surface",
    controlDescription:
      "Same controlled cross-family probe design as the paired export-surface probe, checked on the copy surface instead.",
    expectedBehavior: "Cross-family wording must be blocked on copy (a false negative if it remains copyable).",
  },
  "SYN-COPY-SAFE-01": {
    probeKind: "Controlled safe-line accepted control",
    controlDescription:
      "Test harness supplies a wording line that stays within the matter's resolved family and contains no integrity triggers, independent of any real client bundle.",
    expectedBehavior: "Safe wording must remain copyable (a false positive / over-block if it is blocked).",
  },
};

function buildSyntheticSourceContext(def: SampleDef): {
  text: string;
  eligibility: "substantive" | "INSUFFICIENT_SOURCE_CONTEXT";
} {
  const truth = SYNTHETIC_EXPECTED_TRUTH[def.fixtureId];
  const refLine = `Controlled evidence reference: ${def.fixtureId}`;
  if (!truth) {
    return {
      text: `${refLine}\nINSUFFICIENT_SOURCE_CONTEXT\nNo independent expected-truth source is documented for this synthetic control.\nThis case is excluded from substantive FP/FN denominators until independent expected truth is available.`,
      eligibility: "INSUFFICIENT_SOURCE_CONTEXT",
    };
  }
  return {
    text: [
      refLine,
      "Controlled synthetic technical control — independent expected-truth source (test-harness design, not the probe's own rendered output).",
      `Probe design: ${truth.probeKind}`,
      `Controlled input construction: ${truth.controlDescription}`,
      `Expected behaviour under test: ${truth.expectedBehavior}`,
    ].join("\n"),
    eligibility: "substantive",
  };
}

/**
 * Prose surfaces subject to the historical fixed-length-slice class of false negative
 * (clientSummaryPreview.slice(0,600), courtLine bundleHay.slice(0,400), 280-char CPS
 * chase / copy previews, etc). Structured/enumerated surfaces (truth_map, chase_brief,
 * overview_counts, case_header, do_not_overstate, hearing_status_strip, offence_family)
 * are short labels/lists, not free narrative prose, and are deliberately excluded from
 * the generic boundary-truncation probe (scanCopyableBoundaryIntegrity) below — a bullet
 * list ending "• Final signed MG11 — Missing" is not a truncation defect, but the boundary
 * heuristic (designed for prose sentences) would otherwise false-positive on it.
 */
const PROSE_COPY_SURFACES = new Set([
  "client_summary",
  "court_line",
  "cps_chase_draft",
  "copy_preview",
  "export_preview",
  "family_leak_probe",
]);

const BOUNDARY_ISSUE_REASON: Record<SolicitorBoundaryIssue, string> = {
  empty: "No solicitor-safe text is available to copy.",
  mid_word_cut: "Text is cut off mid-word and must not be copied until the source wording is corrected.",
  mid_sentence_cut: "Text is cut off mid-sentence and must not be copied until the source wording is corrected.",
  incomplete_disclaimer:
    "The required disclaimer is incomplete and must not be copied until the source wording is corrected.",
  open_bracket:
    "Text has an unclosed bracket (possible truncated or duplicated wording) and must not be copied until corrected.",
  open_quote: "Text has an unclosed quotation and must not be copied until corrected.",
  hard_cap_unsafe: "Text could not be safely trimmed to budget without an unsafe mid-word / mid-disclaimer cut.",
  ellipsis_cut: "Text ends with an ellipsis suggesting an unsafe cut and must not be copied.",
};

function describeBoundaryIssues(issues: SolicitorBoundaryIssue[]): string {
  return issues.map((i) => BOUNDARY_ISSUE_REASON[i] ?? "Wording failed the solicitor-visible boundary check.").join(" ");
}

/**
 * v5 mandatory render discipline for every copyable free-prose surface:
 *   sanitizeSolicitorProse → finalizeSolicitorVisibleProse → assertCopyableSolicitorText
 *   → gateSolicitorOutput(mode, auditFamily) → solicitorVisibleGatedCopy
 * NEVER sets canCopy=true / gateStatus="display" without all of the above passing.
 * If the boundary or the gate fails, returns a proportionate blocked preview
 * (Item / Status / Reason) with canCopy=false.
 */
function renderCopyableSolicitorText(input: {
  rawText: string;
  allegation?: string | null;
  bundleHay?: string | null;
  auditFamily?: string | null;
  surfaceId: string;
  mode?: "copy" | "export";
  itemLabel?: string;
  itemIndex?: number;
  queueForQualifiedReview?: boolean;
}): { display: string; canCopy: boolean; gateStatus: string } {
  const itemIndex = input.itemIndex ?? 0;

  if (input.queueForQualifiedReview || requiresQualifiedSolicitorReviewQueue(input.rawText)) {
    const label = input.itemLabel ?? inferBlockedItemLabel(input.rawText, itemIndex);
    return {
      display: formatBlockedCopyPreview({
        itemLabel: label,
        reason: humanBlockReason(["qualified_solicitor_review_required"]),
      }),
      canCopy: false,
      gateStatus: "qualified_solicitor_review_queue",
    };
  }

  // 1) sanitizeSolicitorProse
  const sanitized = sanitizeSolicitorProse(input.rawText);

  // 2) finalizeSolicitorVisibleProse (prefers complete semantic units; fails closed on
  //    mid-word / mid-sentence / incomplete-disclaimer / unbalanced-bracket cuts)
  const boundary = finalizeSolicitorVisibleProse(sanitized);
  if (!boundary.ok) {
    const label = input.itemLabel ?? inferBlockedItemLabel(sanitized, itemIndex);
    return {
      display: formatBlockedCopyPreview({ itemLabel: label, reason: describeBoundaryIssues(boundary.issues) }),
      canCopy: false,
      gateStatus: "boundary_blocked",
    };
  }

  // 3) assertCopyableSolicitorText — explicit final post-transformation boundary assertion
  //    before the text is allowed anywhere near canCopy=true.
  const asserted = assertCopyableSolicitorText(boundary.text);
  if (!asserted.ok) {
    const label = input.itemLabel ?? inferBlockedItemLabel(boundary.text, itemIndex);
    return {
      display: formatBlockedCopyPreview({ itemLabel: label, reason: describeBoundaryIssues(asserted.issues) }),
      canCopy: false,
      gateStatus: "boundary_blocked",
    };
  }

  // 4) gateSolicitorOutput(mode: copy|export, auditFamily) — central integrity gate
  const gated = gateSolicitorOutput({
    surfaceId: input.surfaceId,
    texts: [asserted.text],
    allegation: input.allegation ?? "",
    bundleHay: input.bundleHay ?? "",
    auditFamily: input.auditFamily ?? null,
    mode: input.mode ?? "copy",
    data: { texts: [asserted.text] },
  });

  // 5) solicitorVisibleGatedCopy — proportionate blocked preview (Item/Status/Reason) on
  //    gate failure, or the final sanitized copyable text on success.
  return solicitorVisibleGatedCopy({
    text: asserted.text,
    canCopy: gated.canCopy,
    ruleIds: gated.ruleIds,
    itemLabel: input.itemLabel,
    itemIndex,
  });
}

function writeBlindMarkdown(goldId: string, surfaces: Surface[], eligibility: string) {
  const lines = [
    `# ${goldId} — solicitor-visible render (v6)`,
    "",
    "> Solicitor-facing text only. No stratum, selection reason, review focus, hypothesis, or prediction metadata.",
    "> Blocked ≠ repaired. Human judgments belong only in the blank workbook.",
    `> Review eligibility: **${eligibility}**`,
    "",
  ];
  for (const s of surfaces) {
    lines.push(`## ${s.label}`);
    lines.push("");
    lines.push(
      `Source evidence: ${s.sourceEvidenceAvailable ? "controlled redacted context included" : "INSUFFICIENT_SOURCE_CONTEXT"}`,
    );
    lines.push("");
    lines.push("```text");
    lines.push(s.solicitorVisibleText);
    lines.push("```");
    lines.push("");
  }
  fs.writeFileSync(path.join(RENDER, `${goldId}.md`), lines.join("\n"), "utf8");
  fs.writeFileSync(
    path.join(RENDER, `${goldId}.json`),
    JSON.stringify({ goldId, reviewEligibility: eligibility, surfaces }, null, 2),
    "utf8",
  );
}

function evidenceRowsFromTruth(truth: Record<string, unknown>): FiveAnswersEvidenceRow[] {
  const rows: FiveAnswersEvidenceRow[] = [];
  const items = (truth.evidenceItems as Array<Record<string, unknown>> | undefined) ?? [];
  for (const it of items) {
    const label = String(it.label ?? it.evidence_item ?? it.name ?? "").trim();
    if (!label || isFixtureIdLike(label)) continue;
    rows.push({
      label,
      existence: String(it.existence ?? it.correct_evidence_state ?? "unknown") as FiveAnswersEvidenceRow["existence"],
      reliability: "needs_review",
    });
  }
  for (const key of ["servedEvidence", "referredOnlyEvidence", "missingEvidence", "uncertainEvidence"] as const) {
    const arr = truth[key];
    if (!Array.isArray(arr)) continue;
    for (const labelRaw of arr) {
      const label = String(labelRaw).trim();
      if (!label || isFixtureIdLike(label)) continue;
      const existence =
        key === "servedEvidence"
          ? "served"
          : key === "referredOnlyEvidence"
            ? "referred_only"
            : key === "missingEvidence"
              ? "missing"
              : "not_safely_confirmed";
      rows.push({ label, existence: existence as FiveAnswersEvidenceRow["existence"], reliability: "needs_review" });
    }
  }
  return rows;
}

function chaseItemsFromTruth(truth: Record<string, unknown>): Array<{ label: string }> {
  const fromExpected = (truth.expectedChaseItems as unknown[] | undefined) ?? [];
  if (fromExpected.length) {
    return fromExpected
      .map((x) => ({ label: String(x).trim() }))
      .filter((c) => c.label && !isFixtureIdLike(c.label));
  }
  const items = (truth.chaseItems as Array<Record<string, unknown>> | undefined) ?? [];
  return items
    .map((c) => ({ label: String(c.label ?? "").trim() }))
    .filter((c) => c.label && !isFixtureIdLike(c.label));
}

function renderSynthetic(def: SampleDef): RenderResult {
  const allegation = "Harassment contrary to Protection from Harassment Act";
  const hay = "WhatsApp screenshots MG11 phone extraction subscriber";
  const auditFamily = "harassment_digital";
  const id = def.fixtureId;
  const surfaces: Surface[] = [];
  const ctx = buildSyntheticSourceContext(def);
  surfaces.push({
    surface: "source_context",
    label: "Controlled source context",
    solicitorVisibleText: ctx.text,
    gateStatus: "context",
    canCopy: false,
    sourceEvidenceAvailable: ctx.eligibility === "substantive",
    sourceEvidenceNote: "synthetic — controlled technical control",
    reviewEligibility: ctx.eligibility,
  });

  const familyContextIds = new Set(["SYN-EXPORT-FAMILY-01", "SYN-FAM-LEAK-01", "SYN-COPY-SAFE-01"]);
  if (familyContextIds.has(id)) {
    const familyResolution = resolveGateOffenceFamily({ allegation, bundleHay: hay, auditFamily });
    surfaces.push({
      surface: "offence_family",
      label: "Offence family (solicitor)",
      solicitorVisibleText: familyResolution.failClosed
        ? "Offence family not safely resolved — treat wording as provisional."
        : "Offence family resolved for this matter.",
      gateStatus: familyResolution.failClosed ? "uncertain" : "resolved",
      canCopy: true,
      sourceEvidenceAvailable: ctx.eligibility === "substantive",
      sourceEvidenceNote: "synthetic — controlled technical control",
      reviewEligibility: ctx.eligibility,
    });
  }

  if (id === "SYN-TRUNC-01") {
    const text = "The attribution remains outstan";
    const vis = renderCopyableSolicitorText({
      rawText: text,
      allegation,
      bundleHay: hay,
      auditFamily,
      surfaceId: "phase11_v6_trunc_copy",
      mode: "copy",
    });
    surfaces.push({
      surface: "copy_preview",
      label: "Copy preview",
      solicitorVisibleText: vis.display,
      gateStatus: vis.gateStatus,
      canCopy: vis.canCopy,
      sourceEvidenceAvailable: ctx.eligibility === "substantive",
      sourceEvidenceNote: "synthetic",
      reviewEligibility: ctx.eligibility,
    });
  } else if (id === "SYN-TRUNC-TITLE-01" || id === "SYN-PROV-TITLE-01") {
    const title =
      id === "SYN-TRUNC-TITLE-01"
        ? "WhatsApp extract shows defendant said…"
        : 'MG11 extract: "I saw him"…';
    const vis = solicitorVisibleEvidenceTitle(title);
    surfaces.push({
      surface: "evidence_title",
      label: "Evidence title",
      solicitorVisibleText: vis.display,
      gateStatus: vis.blocked ? "blocked_title" : "ok",
      canCopy: false,
      sourceEvidenceAvailable: ctx.eligibility === "substantive",
      sourceEvidenceNote: "synthetic",
      reviewEligibility: ctx.eligibility,
    });
  } else if (id === "SYN-OMIT-01" || id === "SYN-RR-01") {
    const omitted = displayForSafelyOmitted("|| raw | table | fragment ||");
    surfaces.push({
      surface: "overview_field",
      label: "Overview field after safe omit",
      solicitorVisibleText: omitted.display ?? REVIEW_REQUIRED_NEUTRAL,
      gateStatus: omitted.kind,
      canCopy: false,
      sourceEvidenceAvailable: ctx.eligibility === "substantive",
      sourceEvidenceNote: "synthetic",
      reviewEligibility: ctx.eligibility,
    });
  } else if (id === "SYN-RR-PLACEHOLDER-01") {
    const text = "Please chase {{MISSING_ITEM}} before the hearing.";
    const vis = renderCopyableSolicitorText({
      rawText: text,
      allegation,
      bundleHay: hay,
      auditFamily,
      surfaceId: "phase11_v6_placeholder",
      mode: "copy",
    });
    surfaces.push({
      surface: "copy_preview",
      label: "Copy preview",
      solicitorVisibleText: vis.display,
      gateStatus: vis.gateStatus,
      canCopy: vis.canCopy,
      sourceEvidenceAvailable: ctx.eligibility === "substantive",
      sourceEvidenceNote: "synthetic",
      reviewEligibility: ctx.eligibility,
    });
  } else if (id.startsWith("SYN-HEAR-")) {
    const asOf = new Date("2026-07-21T12:00:00Z");
    const input =
      id === "SYN-HEAR-UNKNOWN"
        ? { asOf }
        : id === "SYN-HEAR-SAME-DAY"
          ? { bundleNextHearingIso: "2026-07-21", asOf }
          : { bundleNextHearingIso: "2026-06-01", asOf };
    const hearing = resolveSolicitorHearingStatus(input);
    surfaces.push({
      surface: "hearing_status_strip",
      label: "Hearing status",
      solicitorVisibleText: formatHearingStatusForDisplay(hearing),
      gateStatus: hearing.kind,
      canCopy: true,
      sourceEvidenceAvailable: ctx.eligibility === "substantive",
      sourceEvidenceNote: "synthetic",
      reviewEligibility: ctx.eligibility,
    });
  } else if (id === "SYN-API-BLOCK-01") {
    surfaces.push({
      surface: "api_blocked_banner",
      label: "Review required",
      solicitorVisibleText: NEUTRAL_SOLICITOR_BLOCKED_BANNER,
      gateStatus: "integrity_blocked",
      canCopy: false,
      sourceEvidenceAvailable: ctx.eligibility === "substantive",
      sourceEvidenceNote: "synthetic",
      reviewEligibility: ctx.eligibility,
    });
  } else if (id === "SYN-EXPORT-FAMILY-01" || id === "SYN-FAM-LEAK-01") {
    const text = "Consider defensive force and PWITS continuity on this harassment matter.";
    const vis = renderCopyableSolicitorText({
      rawText: text,
      allegation,
      bundleHay: hay,
      auditFamily,
      surfaceId: "phase11_v6_family_export",
      mode: "export",
    });
    surfaces.push({
      surface: "export_preview",
      label: "Export preview",
      solicitorVisibleText: vis.display,
      gateStatus: vis.gateStatus,
      canCopy: vis.canCopy,
      sourceEvidenceAvailable: ctx.eligibility === "substantive",
      sourceEvidenceNote: "synthetic",
      reviewEligibility: ctx.eligibility,
    });
  } else if (id === "SYN-COPY-SAFE-01") {
    const text = "Attribution remains outstanding on the served screenshots.";
    const vis = renderCopyableSolicitorText({
      rawText: text,
      allegation,
      bundleHay: hay,
      auditFamily,
      surfaceId: "phase11_v6_safe_copy",
      mode: "copy",
    });
    surfaces.push({
      surface: "copy_preview",
      label: "Copy preview (safe control)",
      solicitorVisibleText: vis.display,
      gateStatus: vis.gateStatus,
      canCopy: vis.canCopy,
      sourceEvidenceAvailable: ctx.eligibility === "substantive",
      sourceEvidenceNote: "synthetic",
      reviewEligibility: ctx.eligibility,
    });
  } else {
    throw new Error(`Unknown synthetic ${id}`);
  }
  return { surfaces, eligibility: ctx.eligibility };
}


/** Load complete client summary from structured client-summary.json (never hard-slice). */
function resolveStructuredClientSummary(input: {
  sourceCaseId?: string | null;
  preview?: string | null;
}): {
  text: string | null;
  source: string;
  units: ClientSummarySemanticUnits | null;
  missingFields?: string[];
  remediation?: string;
} {
  const candidates: string[] = [];
  if (input.sourceCaseId) {
    candidates.push(path.join(DEMO_THIRTY, input.sourceCaseId, "client-summary.json"));
    candidates.push(path.join(DEMO_FIVE, input.sourceCaseId, "client-summary.json"));
  }
  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue;
    const raw = readJson<{ text?: string; summary?: string; body?: string }>(candidate);
    const structured = raw?.text || raw?.summary || raw?.body || null;
    const composed = composeCompleteClientSummaryFromStructured(structured);
    if (composed.ok) {
      return { text: composed.text, source: candidate.replace(/\\/g, "/"), units: composed.units };
    }
    return {
      text: null,
      source: candidate.replace(/\\/g, "/"),
      units: null,
      missingFields: composed.missingFields,
      remediation: composed.remediation,
    };
  }
  const fromPreview = composeCompleteClientSummaryFromStructured(input.preview);
  if (fromPreview.ok) {
    return { text: fromPreview.text, source: "actual-summary.clientSummaryPreview", units: fromPreview.units };
  }
  return {
    text: null,
    source: "missing",
    units: null,
    missingFields: fromPreview.missingFields ?? ["client_summary.text"],
    remediation:
      fromPreview.remediation ??
      "Structured client-summary.json is missing or incomplete; restore title, audience, body, and full disclaimer before treating client_summary as repaired.",
  };
}

function scanCopyableQualityIntegrity(renderDir: string): {
  pass: boolean;
  hits: Array<{ goldId: string; surface: string; issues: SolicitorCopyQualityIssue[] }>;
  scannedSurfaceCount: number;
} {
  const hits: Array<{ goldId: string; surface: string; issues: SolicitorCopyQualityIssue[] }> = [];
  let scannedSurfaceCount = 0;
  for (const file of fs.readdirSync(renderDir).filter((f) => f.endsWith(".json"))) {
    const goldId = file.replace(/\.json$/, "");
    const doc = readJson<{ surfaces: Surface[] }>(path.join(renderDir, file));
    for (const surface of doc?.surfaces ?? []) {
      if (surface.canCopy !== true) continue;
      scannedSurfaceCount += 1;
      const issues = scanSolicitorVisibleCopyQuality(surface.solicitorVisibleText);
      if (issues.length) hits.push({ goldId, surface: surface.surface, issues });
    }
  }
  return { pass: hits.length === 0, hits, scannedSurfaceCount };
}

function renderGoldManual(def: SampleDef): RenderResult {
  const packetId = def.fixtureId.split(":")[0]!;
  const summaryPath = path.join(GOLD_PACK, "cases", packetId, "actual-summary.json");
  const summary = readJson<{
    sourceCaseId?: string;
    allegation?: string;
    clientLabel?: string;
    courtLine?: string;
    clientSummaryPreview?: string;
    cpsChase?: Array<{ label: string; draft: string }>;
    truthMapRows?: Array<{ label: string; existence: string }>;
    doNotOverstate?: string[];
  }>(summaryPath);
  const surfaces: Surface[] = [];

  if (!summary) {
    const ctx = buildRedactedSourceContext({
      evidenceReference: def.fixtureId,
      available: false,
      reasonIfMissing: "Gold-manual packet unavailable — cannot assess substantive correctness without papers.",
    });
    surfaces.push({
      surface: "source_context",
      label: "Controlled source context",
      solicitorVisibleText: ctx.text,
      gateStatus: "missing",
      canCopy: false,
      sourceEvidenceAvailable: false,
      sourceEvidenceNote: "gold packet missing",
      reviewEligibility: "INSUFFICIENT_SOURCE_CONTEXT",
    });
    return { surfaces, eligibility: "INSUFFICIENT_SOURCE_CONTEXT" };
  }

  const auditFamily = deriveAuditFamilyForSourceCaseId(summary.sourceCaseId);
  const bundleHayForFamily = [
    summary.allegation ?? "",
    (summary.truthMapRows ?? []).map((r) => r.label).join(" "),
    (summary.cpsChase ?? []).map((c) => c.label).join(" "),
  ]
    .join(" ")
    .slice(0, 800);

  const note = "Gold-manual controlled fictional packet (redacted for solicitor review).";
  const ctx = buildRedactedSourceContext({
    evidenceReference: def.fixtureId,
    available: true,
    reasonIfMissing: note,
    allegation: summary.allegation,
    clientLabel: summary.clientLabel,
    evidenceRows: (summary.truthMapRows ?? []).map((r) => ({ label: r.label, existence: r.existence })),
    chaseLabels: (summary.cpsChase ?? []).map((c) => c.label),
  });
  surfaces.push({
    surface: "source_context",
    label: "Controlled source context",
    solicitorVisibleText: ctx.text,
    gateStatus: "context",
    canCopy: false,
    sourceEvidenceAvailable: ctx.available,
    sourceEvidenceNote: note,
    reviewEligibility: ctx.eligibility,
  });

  const familyResolution = resolveGateOffenceFamily({
    allegation: summary.allegation,
    bundleHay: bundleHayForFamily,
    auditFamily,
  });
  surfaces.push({
    surface: "offence_family",
    label: "Offence family (solicitor)",
    solicitorVisibleText: familyResolution.failClosed
      ? "Offence family not safely resolved — treat wording as provisional."
      : "Offence family resolved for this matter.",
    gateStatus: familyResolution.failClosed ? "uncertain" : "resolved",
    canCopy: true,
    sourceEvidenceAvailable: true,
    sourceEvidenceNote: note,
    reviewEligibility: "substantive",
  });

  const clientLabel =
    summary.clientLabel && !isFixtureIdLike(summary.clientLabel)
      ? sanitizeSolicitorProse(summary.clientLabel)
      : "(unlabelled)";
  const alg = safeAllegationLine(summary.allegation);
  surfaces.push({
    surface: "case_header",
    label: "Case header",
    solicitorVisibleText: `Client: ${clientLabel}\nAllegation: ${alg.line}`,
    gateStatus: alg.queued ? "qualified_solicitor_review_queue" : "display",
    canCopy: alg.queued ? false : true,
    sourceEvidenceAvailable: true,
    sourceEvidenceNote: note,
    reviewEligibility: "substantive",
  });

  if (summary.courtLine) {
    const vis = renderCopyableSolicitorText({
      rawText: summary.courtLine,
      allegation: summary.allegation ?? "",
      bundleHay: bundleHayForFamily,
      auditFamily,
      surfaceId: "phase11_v6_court_line",
      mode: "copy",
    });
    surfaces.push({
      surface: "court_line",
      label: "Court line",
      solicitorVisibleText: vis.display,
      gateStatus: vis.gateStatus,
      canCopy: vis.canCopy,
      sourceEvidenceAvailable: true,
      sourceEvidenceNote: note,
      reviewEligibility: "substantive",
    });
  }

  // v6 substantive repair: structured client-summary.json semantic units (never hard-slice).
  // canCopy=true only when complete output is safe. Containment is not repair.
  {
    const resolved = resolveStructuredClientSummary({
      sourceCaseId: summary.sourceCaseId,
      preview: summary.clientSummaryPreview,
    });
    if (resolved.text) {
      const vis = renderCopyableSolicitorText({
        rawText: resolved.text,
        allegation: summary.allegation ?? "",
        bundleHay: bundleHayForFamily,
        auditFamily,
        surfaceId: "phase11_v6_client_summary",
        mode: "copy",
        itemLabel: "Client-safe summary wording",
      });
      surfaces.push({
        surface: "client_summary",
        label: "Client-safe summary",
        solicitorVisibleText: vis.display,
        gateStatus: vis.gateStatus,
        canCopy: vis.canCopy,
        sourceEvidenceAvailable: true,
        sourceEvidenceNote: `${note} Source: ${resolved.source}`,
        reviewEligibility: "substantive",
      });
    } else {
      surfaces.push({
        surface: "client_summary",
        label: "Client-safe summary",
        solicitorVisibleText: formatBlockedCopyPreview({
          itemLabel: "Client-safe summary wording",
          reason: `Incomplete structured client summary (missing: ${(resolved.missingFields ?? []).join(", ") || "unknown"}). ${resolved.remediation ?? ""}`.trim(),
        }),
        gateStatus: "boundary_blocked",
        canCopy: false,
        sourceEvidenceAvailable: true,
        sourceEvidenceNote: `${note} Fail-closed: structured source incomplete (${resolved.source})`,
        reviewEligibility: "substantive",
      });
    }
  }

  // v5 fix: cps_chase_draft was previously (v4) rendered with sanitizeSolicitorProse only
  // and no boundary/gate check at all — canCopy was hardcoded true. Now routed through the
  // same mandatory discipline as every other copyable prose surface.
  const chaseLabels = dedupeSolicitorLabels((summary.cpsChase ?? []).map((c) => c.label)).map((l) =>
    sanitizeSolicitorProse(l),
  );
  const chaseByLabel = new Map(
    (summary.cpsChase ?? []).map((c) => [solicitorDisplayLabel(c.label).toLowerCase(), c] as const),
  );
  for (const label of chaseLabels.slice(0, 4)) {
    const chase = chaseByLabel.get(label.toLowerCase());
    const rawDraft = preserveProtectedAcronyms(chase?.draft ?? label);
    const vis = renderCopyableSolicitorText({
      rawText: rawDraft,
      allegation: summary.allegation ?? "",
      bundleHay: bundleHayForFamily,
      auditFamily,
      surfaceId: "phase11_v6_cps_chase",
      mode: "copy",
      itemLabel: `CPS chase — ${label}`,
    });
    surfaces.push({
      surface: "cps_chase_draft",
      label: `CPS chase — ${label}`,
      solicitorVisibleText: vis.display,
      gateStatus: vis.gateStatus,
      canCopy: vis.canCopy,
      sourceEvidenceAvailable: true,
      sourceEvidenceNote: note,
      reviewEligibility: "substantive",
    });
  }

  if (summary.truthMapRows?.length) {
    surfaces.push({
      surface: "truth_map",
      label: "Evidence truth map",
      solicitorVisibleText: summary.truthMapRows
        .filter((r) => r.label && !isFixtureIdLike(r.label))
        .slice(0, 12)
        .map((r) => `• ${solicitorDisplayLabel(r.label)} — ${humanizeEvidenceState(r.existence)}`)
        .join("\n"),
      gateStatus: "display",
      canCopy: true,
      sourceEvidenceAvailable: true,
      sourceEvidenceNote: note,
      reviewEligibility: "substantive",
    });
  }

  if (summary.doNotOverstate?.length) {
    surfaces.push({
      surface: "do_not_overstate",
      label: "Do-not-overstate warnings",
      solicitorVisibleText: summary.doNotOverstate.map((x) => `• ${sanitizeSolicitorProse(x)}`).join("\n"),
      gateStatus: "warning",
      canCopy: false,
      sourceEvidenceAvailable: true,
      sourceEvidenceNote: note,
      reviewEligibility: "substantive",
    });
  }

  return { surfaces, eligibility: ctx.eligibility };
}

function renderEsa(def: SampleDef): RenderResult {
  const caseId = def.fixtureId.includes(":") ? def.fixtureId.split(":")[1]! : def.fixtureId;
  const truthPath = path.join(ESA, caseId, "truth-key.json");
  const truth = readJson<Record<string, unknown>>(truthPath) ?? {};
  const output = readJson<Record<string, unknown>>(path.join(ESA, caseId, "casebrain-output.json"));
  const surfaces: Surface[] = [];
  const sourceAvailable = fs.existsSync(truthPath);

  if (!sourceAvailable) {
    const ctx = buildRedactedSourceContext({
      evidenceReference: def.fixtureId,
      available: false,
      reasonIfMissing: "ESA materials unavailable — substantive correctness cannot be fully assessed.",
    });
    surfaces.push({
      surface: "source_context",
      label: "Controlled source context",
      solicitorVisibleText: ctx.text,
      gateStatus: "missing",
      canCopy: false,
      sourceEvidenceAvailable: false,
      sourceEvidenceNote: "ESA unavailable",
      reviewEligibility: "INSUFFICIENT_SOURCE_CONTEXT",
    });
    return { surfaces, eligibility: "INSUFFICIENT_SOURCE_CONTEXT" };
  }

  const note = output
    ? "ESA truth-key with casebrain-output (controlled redacted review)."
    : "ESA truth-key only; full output unavailable (controlled redacted review).";
  const auditFamily = String(truth.family ?? truth.scenarioFamily ?? truth.offenceFamily ?? "unknown");
  const allegationRaw = String(truth.allegation ?? truth.charge ?? truth.title ?? "").trim();
  const allegation =
    allegationRaw && !isFixtureIdLike(allegationRaw) && !isInternalNonSolicitorString(allegationRaw)
      ? allegationRaw
      : "Allegation not safely labelled from source";
  const evidenceRows = evidenceRowsFromTruth(truth);
  const chaseItems = chaseItemsFromTruth(truth);
  const strings: string[] = [];
  walkStrings(output ?? truth, strings);
  const hay = strings
    .filter((s) => !isInternalNonSolicitorString(s) && !isFixtureIdLike(s))
    .slice(0, 20)
    .join("\n")
    .slice(0, 2000);

  const hearing = resolveSolicitorHearingStatus({
    bundleNextHearingIso: (truth.nextHearingIso as string) ?? (truth.hearingDateIso as string) ?? null,
    nextHearingRaw: (truth.nextHearing as string) ?? null,
    bundleHay: hay,
    asOf: new Date("2026-07-21T12:00:00Z"),
  });
  const hearingLabel = formatHearingStatusForDisplay(hearing);

  const ctx = buildRedactedSourceContext({
    evidenceReference: def.fixtureId,
    available: true,
    reasonIfMissing: note,
    allegation,
    clientLabel: "Client",
    evidenceRows: evidenceRows.map((r) => ({ label: r.label, existence: String(r.existence) })),
    chaseLabels: chaseItems.map((c) => c.label),
    hearingLabel,
  });
  surfaces.push({
    surface: "source_context",
    label: "Controlled source context",
    solicitorVisibleText: ctx.text,
    gateStatus: "context",
    canCopy: false,
    sourceEvidenceAvailable: ctx.available,
    sourceEvidenceNote: note,
    reviewEligibility: ctx.eligibility,
  });

  const overview = countEvidenceStatesForDisplay(evidenceRows);
  surfaces.push({
    surface: "overview_counts",
    label: "Overview evidence counts",
    solicitorVisibleText: `Served ${overview.served} · Referred ${overview.referred} · Missing ${overview.missing} · Incomplete ${overview.incomplete} · Not safely confirmed ${overview.notSafelyConfirmed}`,
    gateStatus: "display",
    canCopy: true,
    sourceEvidenceAvailable: true,
    sourceEvidenceNote: note,
    reviewEligibility: "substantive",
  });

  surfaces.push({
    surface: "hearing_status_strip",
    label: "Hearing status",
    solicitorVisibleText: hearingLabel,
    gateStatus: hearing.kind,
    canCopy: true,
    sourceEvidenceAvailable: true,
    sourceEvidenceNote: note,
    reviewEligibility: "substantive",
  });

  // Family consistency (blocker 1): matter-level resolution must use resolveGateOffenceFamily
  // with auditFamily preference, and the exact same auditFamily must be passed into every
  // gateSolicitorOutput call below so per-text integrity checks agree with this surface.
  const familyResolution = resolveGateOffenceFamily({ allegation, bundleHay: hay, auditFamily });
  surfaces.push({
    surface: "offence_family",
    label: "Offence family (solicitor)",
    solicitorVisibleText: familyResolution.failClosed
      ? "Offence family not safely resolved — treat wording as provisional."
      : "Offence family resolved for this matter.",
    gateStatus: familyResolution.failClosed ? "uncertain" : "resolved",
    canCopy: true,
    sourceEvidenceAvailable: true,
    sourceEvidenceNote: note,
    reviewEligibility: "substantive",
  });

  const chaseBrief = buildDisclosureChaseBrief({
    caseId: "controlled-case",
    caseTitle: "Controlled matter",
    clientLabel: "Client",
    allegation,
    stage: "Pre-hearing",
    hearingStatus: hearing.statusLabel,
    hearingDateIso: hearing.dateIso,
    bundleHealth: "Review papers",
    positionStatus: "Position not safely recorded yet",
    battleboard: null,
    snapshotMissing: evidenceRows
      .filter((r) => r.existence === "missing" || r.existence === "referred_only")
      .map((r) => ({ label: r.label, status: humanizeEvidenceState(String(r.existence)) })),
    proceduralOutstanding: chaseItems.map((c) => c.label),
    bundleText: hay,
  });

  // Chase Total = deduped, sanitized label count (dedupe → sanitize preserves the
  // "Additional source-material" → "Further papers on the file" prose fix).
  const chaseLabels = dedupeSolicitorLabels(chaseBrief.items.map((it) => it.label))
    .map((l) => sanitizeSolicitorProse(l))
    .slice(0, 8);
  surfaces.push({
    surface: "chase_brief",
    label: "Disclosure chase list",
    solicitorVisibleText:
      `Total ${chaseLabels.length}\n` +
      (chaseLabels.map((label) => `• ${label}`).join("\n") || "(no chase items)"),
    gateStatus: "display",
    canCopy: true,
    sourceEvidenceAvailable: true,
    sourceEvidenceNote: note,
    reviewEligibility: "substantive",
  });

  const sampleTextsRaw = strings
    .filter((t) => t.length >= 24 && !isInternalNonSolicitorString(t) && !isFixtureIdLike(t))
    .filter((t) => assessSolicitorSentence(t).issues.length === 0 || /attribution|outstanding|missing|served/i.test(t));
  const sampleSeen = new Set<string>();
  const sampleTexts: string[] = [];
  for (const t of sampleTextsRaw) {
    const key = sanitizeSolicitorProse(t).toLowerCase().replace(/\s+/g, " ").trim();
    if (!key || sampleSeen.has(key)) continue;
    sampleSeen.add(key);
    sampleTexts.push(t);
    if (sampleTexts.length >= 4) break;
  }
  if (sampleTexts.length === 0) {
    sampleTexts.push("Attribution remains outstanding on the served screenshots.");
  }

  sampleTexts.forEach((t, idx) => {
    const vis = renderCopyableSolicitorText({
      rawText: t,
      allegation,
      bundleHay: hay,
      auditFamily,
      surfaceId: "phase11_v6_case_copy",
      mode: "copy",
      itemIndex: idx,
    });
    surfaces.push({
      surface: "copy_preview",
      label: "Copy preview",
      solicitorVisibleText: vis.display,
      gateStatus: vis.gateStatus,
      canCopy: vis.canCopy,
      sourceEvidenceAvailable: true,
      sourceEvidenceNote: note,
      reviewEligibility: "substantive",
    });
  });

  const leakProbe = "Consider defensive force and PWITS continuity.";
  classifyTextsAgainstConceptRegistry([allegation, hay, ...sampleTexts.slice(0, 2)], {
    allegation,
    bundleHay: hay,
    auditFamily,
    evidence: evidenceRows.map((r) => ({
      evidenceId: r.label,
      label: r.label,
      existence: String(r.existence),
    })),
  });
  const leakVis = renderCopyableSolicitorText({
    rawText: leakProbe,
    allegation,
    bundleHay: hay,
    auditFamily,
    surfaceId: "phase11_v6_leak_probe",
    mode: "copy",
  });
  surfaces.push({
    surface: "family_leak_probe",
    label: "Cross-family containment probe",
    solicitorVisibleText: leakVis.display,
    gateStatus: leakVis.gateStatus,
    canCopy: leakVis.canCopy,
    sourceEvidenceAvailable: true,
    sourceEvidenceNote: note,
    reviewEligibility: "substantive",
  });

  buildCanonicalMatterStateV1({
    caseId: "controlled-case",
    allegation,
    bundleHay: hay,
    evidenceRows,
    chaseItems: chaseItems.map((c) => ({ label: c.label, baseStatus: "Outstanding" })),
    hearing: {
      bundleNextHearingIso: (truth.nextHearingIso as string) ?? null,
      nextHearingRaw: (truth.nextHearing as string) ?? null,
      asOf: new Date("2026-07-21T12:00:00Z"),
    },
  });

  return { surfaces, eligibility: ctx.eligibility };
}

function scanSolicitorVisibleMarkdown(renderDir: string): {
  pass: boolean;
  hits: Array<{ file: string; rule: string; snippet: string }>;
} {
  const hits: Array<{ file: string; rule: string; snippet: string }> = [];
  const files = fs.readdirSync(renderDir).filter((f) => f.endsWith(".md"));
  const fixtureRe =
    /\b(?:cb-(?:fresh|found)-\d+|demo-audit-\d+|sc-[0-9a-f]+|messy-pdf-v\d+|pilot-\d+|proof-pack-\d+|CASE-\d+|SYN-[A-Z0-9-]+|taylor-brookes|jordan-hale)\b/i;
  const isoRe = /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
  const builderRe =
    /\b(CaseBrain H5|Brain 1|presentation builders|no Brain|builder(?:Name)?|audit family seed)\b/i;
  const enumRe = /\b(referred_only|not_safely_confirmed|needs_review|not_started)\b/;
  const ruleDumpRe = /\b(integrity_blocked|ruleIds?|sentence\.[a-z_]+|wrong_family\.[a-z_]+)\b/i;
  const placeholderRe = /\{\{[A-Z0-9_]+\}\}|\{[A-Z][A-Z0-9_]{2,}\}/;
  const ellipsisTitleRe = /(?:said…|I saw him"…|extract shows defendant said)/i;

  for (const file of files) {
    const abs = path.join(renderDir, file);
    const rawBody = fs.readFileSync(abs, "utf8");
    // "Controlled evidence reference: <...>" lines are a deliberate, correctly-labelled
    // reviewer citation (never free-copy) — not a fixture/PII leak. Redact only that
    // line before running leak checks so genuine leaks elsewhere are still caught.
    const body = rawBody.replace(/^Controlled evidence reference:.*$/gim, "Controlled evidence reference: [see packet metadata]");
    const blocks = [...body.matchAll(/```text\n([\s\S]*?)```/g)].map((m) => m[1] ?? "");
    const copyableOkBlocks = blocks.filter(
      (b) => !/Status: Copy unavailable|INSUFFICIENT_SOURCE_CONTEXT|queued for qualified solicitor review/i.test(b),
    );

    const check = (rule: string, re: RegExp, text: string) => {
      const m = text.match(re);
      if (m) hits.push({ file, rule, snippet: m[0].slice(0, 80) });
    };

    check("fixture_id", fixtureRe, body);
    check("iso_timestamp", isoRe, body);
    check("builder_name", builderRe, body);
    check("underscore_enum", enumRe, body);
    check("rule_code_dump", ruleDumpRe, body);
    check("ellipsis_mid_title", ellipsisTitleRe, body);
    check("not_usable", /NOT USABLE/, body);
    check("unsafe_proof_outcome", /unsafe proof\/outcome/i, body);

    for (const b of copyableOkBlocks) {
      check("placeholder_in_ok_copy", placeholderRe, b);
    }

    for (const b of blocks) {
      const chaseLines = b
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.startsWith("• "));
      for (let i = 1; i < chaseLines.length; i++) {
        if (chaseLines[i]!.toLowerCase() === chaseLines[i - 1]!.toLowerCase()) {
          hits.push({ file, rule: "duplicate_consecutive_chase", snippet: chaseLines[i]!.slice(0, 80) });
        }
      }
    }
  }

  return { pass: hits.length === 0, hits };
}

/**
 * v5 scan repair — the critical fix. Reads the COMPLETE rendered JSON (not markdown
 * previews, not first-N samples) for every case in the corpus, including
 * GOLD-11-034..043, and asserts that no canCopy===true prose surface:
 *   - has an incomplete required disclaimer, OR
 *   - is cut mid-word / mid-sentence, OR
 *   - is exactly 600 chars ending mid-disclaimer (the literal GOLD-11-039 v4 shape), OR
 *   - fails the generic assessSolicitorVisibleBoundary probe for any other reason
 *     (open bracket/quote, ellipsis cut, unsafe hard cap).
 * Scoped to PROSE_COPY_SURFACES (see comment above) so structured lists/labels are not
 * false-flagged by a heuristic designed for narrative sentences.
 */
function scanCopyableBoundaryIntegrity(renderDir: string): {
  pass: boolean;
  hits: Array<{ goldId: string; surface: string; length: number; issues: string[] }>;
  scannedSurfaceCount: number;
  scannedCaseCount: number;
} {
  const hits: Array<{ goldId: string; surface: string; length: number; issues: string[] }> = [];
  const files = fs.readdirSync(renderDir).filter((f) => f.endsWith(".json"));
  let scannedSurfaceCount = 0;
  for (const file of files) {
    const body = readJson<{ goldId: string; surfaces: Surface[] }>(path.join(renderDir, file));
    if (!body) continue;
    for (const s of body.surfaces) {
      if (s.canCopy !== true) continue;
      if (!PROSE_COPY_SURFACES.has(s.surface)) continue;
      scannedSurfaceCount += 1;
      const assessed = assessSolicitorVisibleBoundary(s.solicitorVisibleText);
      const lengthExactly600MidDisclaimer =
        s.solicitorVisibleText.length === 600 && hasIncompleteRequiredDisclaimer(s.solicitorVisibleText);
      if (!assessed.ok || lengthExactly600MidDisclaimer) {
        hits.push({
          goldId: body.goldId,
          surface: s.surface,
          length: s.solicitorVisibleText.length,
          issues: lengthExactly600MidDisclaimer ? [...assessed.issues, "length_600_mid_disclaimer"] : assessed.issues,
        });
      }
    }
  }
  return { pass: hits.length === 0, hits, scannedSurfaceCount, scannedCaseCount: files.length };
}

/** Cross-surface, per-case contradiction contract: never say resolved AND unresolved for the same matter. */
function scanMatterFamilyContradictions(
  cases: Array<{ goldId: string; texts: string[] }>,
): { pass: boolean; hits: Array<{ goldId: string }> } {
  const hits: Array<{ goldId: string }> = [];
  for (const c of cases) {
    if (hasMatterFamilyResolvedUnresolvedContradiction(c.texts)) hits.push({ goldId: c.goldId });
  }
  return { pass: hits.length === 0, hits };
}

function surfaceFingerprint(surfaces: Array<{ surface: string; solicitorVisibleText: string; gateStatus: string; canCopy: boolean | null }>) {
  return surfaces.map((s) => ({
    surface: s.surface,
    gateStatus: s.gateStatus,
    canCopy: s.canCopy,
    textHash: sha256(s.solicitorVisibleText).slice(0, 12),
    textPreview: s.solicitorVisibleText.slice(0, 120),
  }));
}

function main() {
  ensureDir(OUT);
  ensureDir(V6);
  ensureDir(RENDER);
  ensureDir(BEFORE_AFTER);
  ensureDir(BUNDLE);

  const v1Frozen = readJson<{
    freezeHash: string;
    samples: SampleDef[];
    selectionMethod: { version: string; actualSize: number };
  }>(path.join(V1, "gold-sample-frozen.json"));
  if (!v1Frozen) throw new Error("v1 gold-sample-frozen.json missing");
  if (v1Frozen.freezeHash !== V1_FREEZE_HASH) {
    throw new Error(`v1 freeze hash mismatch: ${v1Frozen.freezeHash}`);
  }
  if (v1Frozen.samples.length !== 33) {
    throw new Error(`v1 sample count expected 33, got ${v1Frozen.samples.length}`);
  }

  const v2FreezePath = path.join(PREV_V2, "gold-sample-frozen-v2.json");
  if (!fs.existsSync(v2FreezePath)) {
    throw new Error("v2 gold-sample-frozen-v2.json missing — cannot record parent V2 evidence");
  }
  const v2Frozen = readJson<{ freezeHash: string; actualSize?: number }>(v2FreezePath);
  if (!v2Frozen) throw new Error("v2 freeze unreadable");
  if (v2Frozen.freezeHash !== V2_FREEZE_HASH) {
    throw new Error(`v2 freeze hash mismatch: ${v2Frozen.freezeHash}`);
  }

  const v3FreezePath = path.join(PREV_V3, "gold-sample-frozen-v3.json");
  if (!fs.existsSync(v3FreezePath)) {
    throw new Error("v3 gold-sample-frozen-v3.json missing — cannot record parent V3 evidence");
  }
  const v3Frozen = readJson<{ freezeHash: string; actualSize?: number }>(v3FreezePath);
  if (!v3Frozen) throw new Error("v3 freeze unreadable");
  if (v3Frozen.freezeHash !== V3_FREEZE_HASH) {
    throw new Error(`v3 freeze hash mismatch: ${v3Frozen.freezeHash}`);
  }

  const v4FreezePath = path.join(PREV_V4, "gold-sample-frozen-v4.json");
  if (!fs.existsSync(v4FreezePath)) {
    throw new Error("v4 gold-sample-frozen-v4.json missing — cannot record parent V4 evidence");
  }
  const v4Frozen = readJson<{
    freezeHash: string;
    actualSize?: number;
    samples: Array<{ goldId: string; sourceKind: string; fixtureId: string }>;
  }>(v4FreezePath);
  if (!v4Frozen) throw new Error("v4 freeze unreadable");
  if (v4Frozen.freezeHash !== V4_FREEZE_HASH) {
    throw new Error(`v4 freeze hash mismatch: ${v4Frozen.freezeHash}`);
  }
  if (v4Frozen.samples.length !== 43) {
    throw new Error(`v4 sample count expected 43, got ${v4Frozen.samples.length}`);
  }
  const v5FreezePath = path.join(PREV_V5, "gold-sample-frozen-v5.json");
  if (!fs.existsSync(v5FreezePath)) {
    throw new Error("v5 gold-sample-frozen-v5.json missing — cannot record parent V5 evidence");
  }
  const v5Frozen = readJson<{
    freezeHash: string;
    actualSize?: number;
    samples: Array<{ goldId: string; sourceKind: string; fixtureId: string }>;
  }>(v5FreezePath);
  if (!v5Frozen) throw new Error("v5 freeze unreadable");
  if (v5Frozen.freezeHash !== V5_FREEZE_HASH) {
    throw new Error(`v5 freeze hash mismatch: ${v5Frozen.freezeHash}`);
  }
  if (v5Frozen.samples.length !== 43) {
    throw new Error(`v5 sample count expected 43, got ${v5Frozen.samples.length}`);
  }
  // Preserve v1–v5 — never write into those paths.

  // Membership: carry forward the SAME 43 v5/v4 goldIds/fixtures, UNCHANGED (lineage).
  const samples: SampleDef[] = [
    ...v1Frozen.samples.map((s) => ({
      goldId: s.goldId,
      stratum: s.stratum,
      sourceKind: s.sourceKind,
      fixtureId: s.fixtureId,
      selectionReason: s.selectionReason,
      reviewFocus: s.reviewFocus,
    })),
    ...GOLD_MANUAL_ADDITIONS,
  ];

  const v4MembershipKey = new Set(v4Frozen.samples.map((s) => `${s.goldId}|${s.fixtureId}`));
  const v5ParentMembershipKey = new Set(v5Frozen.samples.map((s) => `${s.goldId}|${s.fixtureId}`));
  const v6MembershipKey = new Set(samples.map((s) => `${s.goldId}|${s.fixtureId}`));
  if (v5ParentMembershipKey.size !== v6MembershipKey.size || [...v5ParentMembershipKey].some((k) => !v6MembershipKey.has(k))) {
    throw new Error("v6 membership drifted from v5 frozen membership — lineage must be identical (0 additions, 0 removals)");
  }
  if (v4MembershipKey.size !== v6MembershipKey.size || [...v4MembershipKey].some((k) => !v6MembershipKey.has(k))) {
    throw new Error("v6 membership drifted from v4 frozen membership — lineage must be identical (0 additions, 0 removals)");
  }

  if (samples.length < MEMBERSHIP_MIN || samples.length > MEMBERSHIP_MAX) {
    throw new Error(`v6 membership ${samples.length} outside target range ${MEMBERSHIP_MIN}-${MEMBERSHIP_MAX}`);
  }

  const fixtureCounts = new Map<string, number>();
  for (const s of samples) fixtureCounts.set(s.fixtureId, (fixtureCounts.get(s.fixtureId) ?? 0) + 1);
  const duplicateFixtures = [...fixtureCounts.entries()].filter(([, n]) => n > 1);

  const lineageDisclosure = {
    v1IdsRetained: v1Frozen.samples.length,
    carriedForwardFromV4Count: GOLD_MANUAL_ADDITIONS.length,
    additionsCount: 0,
    removalsCount: 0,
    totalV6: samples.length,
    uniqueFixtures: fixtureCounts.size,
    duplicateFixtures: duplicateFixtures.map(([id, n]) => ({ fixtureId: id, occurrences: n })),
    carriedForward: GOLD_MANUAL_ADDITIONS.map((a) => ({ goldId: a.goldId, fixtureId: a.fixtureId, selectionReason: a.selectionReason })),
    removals: [] as Array<{ goldId: string }>,
    additions: [] as Array<{ goldId: string; fixtureId: string; selectionReason?: string }>,
    repeatsNote:
      "Exact fixture repeats carried forward from v1 (multi-angle review of the same papers: accepted vs blocked vs uncertain) remain JUSTIFIED and unchanged. v5 introduces no new repeats.",
    syntheticExclusionRule:
      "Synthetic technical controls (SYN-*) are denominator-eligible (reviewEligibility: substantive) ONLY when an independent expected-truth source (test-harness design, not the probe's own rendered output) is documented in SYNTHETIC_EXPECTED_TRUTH. All 13 synthetics carried forward from v1/v4 keep documented independent expected truth in v5.",
    v6MembershipPolicy:
      "v6 CARRIES FORWARD the exact same 43 v5/v4 goldIds/fixtures UNCHANGED. Zero additions, zero removals. Membership is byte-identical to v5; v6 substantively repairs GOLD-11-039 from structured client-summary semantic units (containment ≠ repair), expands copyable quality contracts, and preserves v1–v5 read-only.",
  };

  const frozenAt = new Date().toISOString();
  const v6Defs = samples.map((s) => ({
    goldId: s.goldId,
    sourceKind: s.sourceKind,
    fixtureId: s.fixtureId,
  }));
  // Hash membership + lineage only (exclude wall-clock) so freezeHash is reproducible.
  // Includes parent V1/V2/V3/V4 hashes per remediation instructions. Even though
  // membership is identical to v4, the version tag + parentV5FreezeHash make this a
  // genuinely NEW freeze hash (documents "membership+lineage, exclude frozenAt").
  const freezeIdentity = {
    version: "phase11-gold-sample-v6",
    parentV1FreezeHash: V1_FREEZE_HASH,
    parentV2FreezeHash: V2_FREEZE_HASH,
    parentV3FreezeHash: V3_FREEZE_HASH,
    parentV5FreezeHash: V5_FREEZE_HASH,
    actualSize: v6Defs.length,
    samples: v6Defs,
    lineageDisclosure,
  };
  const freezeHash = sha256(JSON.stringify(freezeIdentity));
  const frozenSample = { ...freezeIdentity, frozenAt, freezeHash, frozen: true as const };
  fs.writeFileSync(path.join(V6, "gold-sample-frozen-v6.json"), JSON.stringify(frozenSample, null, 2), "utf8");

  const predictions: unknown[] = [];
  const humanSlots: unknown[] = [];
  const beforeAfter: unknown[] = [];
  const contradictionCorpus: Array<{ goldId: string; texts: string[] }> = [];
  let surfacesTotal = 0;
  let changedSurfaces = 0;
  let insufficientSourceContextCount = 0;
  let substantiveCount = 0;

  for (const def of samples) {
    const rendered: RenderResult =
      def.sourceKind === "synthetic_controlled"
        ? renderSynthetic(def)
        : def.sourceKind === "gold_manual_pack"
          ? renderGoldManual(def)
          : renderEsa(def);
    const { surfaces, eligibility } = rendered;
    if (eligibility === "INSUFFICIENT_SOURCE_CONTEXT") insufficientSourceContextCount += 1;
    else substantiveCount += 1;
    writeBlindMarkdown(def.goldId, surfaces, eligibility);
    surfacesTotal += surfaces.length;
    contradictionCorpus.push({ goldId: def.goldId, texts: surfaces.map((s) => s.solicitorVisibleText) });

    const v4Json = readJson<{
      surfaces: Array<{ surface: string; solicitorVisibleText: string; gateStatus: string; canCopy: boolean | null }>;
    }>(path.join(PREV_V5, "rendered", `${def.goldId}.json`));
    const changes: unknown[] = [];
    const v4Surfaces = v4Json?.surfaces ?? [];
    for (let i = 0; i < Math.max(surfaces.length, v4Surfaces.length); i++) {
      const after = surfaces[i];
      const before = v4Surfaces[i];
      if (!after && before) {
        changes.push({
          surface: before.surface,
          before: {
            gateStatus: before.gateStatus,
            canCopy: before.canCopy,
            textPreview: before.solicitorVisibleText.slice(0, 160),
          },
          after: null,
        });
        changedSurfaces += 1;
        continue;
      }
      if (after && !before) {
        changes.push({
          surface: after.surface,
          before: null,
          after: {
            gateStatus: after.gateStatus,
            canCopy: after.canCopy,
            textPreview: after.solicitorVisibleText.slice(0, 160),
          },
        });
        changedSurfaces += 1;
        continue;
      }
      if (
        after &&
        before &&
        (after.solicitorVisibleText !== before.solicitorVisibleText ||
          after.gateStatus !== before.gateStatus ||
          after.canCopy !== before.canCopy)
      ) {
        changes.push({
          surface: after.surface,
          before: {
            gateStatus: before.gateStatus,
            canCopy: before.canCopy,
            textHash: sha256(before.solicitorVisibleText).slice(0, 12),
            textPreview: before.solicitorVisibleText.slice(0, 160),
          },
          after: {
            gateStatus: after.gateStatus,
            canCopy: after.canCopy,
            textHash: sha256(after.solicitorVisibleText).slice(0, 12),
            textPreview: after.solicitorVisibleText.slice(0, 160),
          },
        });
        changedSurfaces += 1;
      }
    }
    beforeAfter.push({
      goldId: def.goldId,
      reviewEligibility: eligibility,
      isNewInV5: !v4Json,
      changeCount: changes.length,
      changes,
    });
    fs.writeFileSync(
      path.join(BEFORE_AFTER, `${def.goldId}.json`),
      JSON.stringify(
        {
          goldId: def.goldId,
          reviewEligibility: eligibility,
          isNewInV5: !v4Json,
          parentV1FreezeHash: V1_FREEZE_HASH,
          parentV2FreezeHash: V2_FREEZE_HASH,
          parentV3FreezeHash: V3_FREEZE_HASH,
          parentV5FreezeHash: V5_FREEZE_HASH,
          v6FreezeHash: freezeHash,
          changes,
        },
        null,
        2,
      ),
      "utf8",
    );

    const blocked = surfaces.some((s) => s.canCopy === false);
    predictions.push({
      goldId: def.goldId,
      reviewEligibility: eligibility,
      predictedClassification:
        eligibility === "INSUFFICIENT_SOURCE_CONTEXT"
          ? "insufficient_source_context"
          : blocked
            ? "blocked_or_review"
            : "accepted",
      predictedFpFnHypothesis: "not_for_blinded_bundle",
      evidenceReference: `phase-11-remediation/v5/rendered/${def.goldId}.md`,
    });
    humanSlots.push({
      goldId: def.goldId,
      reviewEligibility: eligibility,
      expectedClassification: null,
      actualClassification: null,
      falsePositive: null,
      falseNegative: null,
      substantiveWordingJudgment: null,
      reviewerDecision: null,
      rationale: null,
      evidenceReference: `artifacts/casebrain-qa/integrity-programme/phase-11-remediation/v5/rendered/${def.goldId}.md`,
      reviewerIdentity: null,
      reviewerRole: null,
      reviewDate: null,
      disagreement: null,
      adjudication: null,
      unresolved: true,
      notes: null,
    });
  }

  fs.writeFileSync(
    path.join(OUT, "automated-predictions-v6.json"),
    JSON.stringify(
      {
        generatedAt: frozenAt,
        freezeHash,
        separationRule: "AUTOMATED ONLY — excluded from blinded reviewer bundle",
        parentV1FreezeHash: V1_FREEZE_HASH,
        parentV2FreezeHash: V2_FREEZE_HASH,
        parentV3FreezeHash: V3_FREEZE_HASH,
        parentV5FreezeHash: V5_FREEZE_HASH,
        predictions,
      },
      null,
      2,
    ),
    "utf8",
  );

  const keyComparisons = KEY_COMPARISON_GOLDS.map((goldId) => {
    const v1 = readJson<{ surfaces: Surface[] }>(path.join(V1, "rendered", `${goldId}.json`));
    const v2 = readJson<{ surfaces: Surface[] }>(path.join(PREV_V2, "rendered", `${goldId}.json`));
    const v3 = readJson<{ surfaces: Surface[] }>(path.join(PREV_V3, "rendered", `${goldId}.json`));
    const v4 = readJson<{ surfaces: Surface[] }>(path.join(PREV_V4, "rendered", `${goldId}.json`));
    const v5 = readJson<{ surfaces: Surface[] }>(path.join(PREV_V5, "rendered", `${goldId}.json`));
    const v6 = readJson<{ surfaces: Surface[]; reviewEligibility?: string }>(path.join(RENDER, `${goldId}.json`));
    const v1Fp = surfaceFingerprint(v1?.surfaces ?? []);
    const v2Fp = surfaceFingerprint(v2?.surfaces ?? []);
    const v3Fp = surfaceFingerprint(v3?.surfaces ?? []);
    const v4Fp = surfaceFingerprint(v4?.surfaces ?? []);
    const v5Fp = surfaceFingerprint(v5?.surfaces ?? []);
    const v6Fp = surfaceFingerprint(v6?.surfaces ?? []);
    return {
      goldId,
      reviewEligibility: v6?.reviewEligibility ?? null,
      surfaceCounts: {
        v1: v1Fp.length,
        v2: v2Fp.length,
        v3: v3Fp.length,
        v4: v4Fp.length,
        v5: v5Fp.length,
        v6: v6Fp.length,
      },
      changedV1toV2: JSON.stringify(v1Fp) !== JSON.stringify(v2Fp),
      changedV2toV3: JSON.stringify(v2Fp) !== JSON.stringify(v3Fp),
      changedV3toV4: JSON.stringify(v3Fp) !== JSON.stringify(v4Fp),
      changedV4toV5: JSON.stringify(v4Fp) !== JSON.stringify(v5Fp),
      changedV5toV6: JSON.stringify(v5Fp) !== JSON.stringify(v6Fp),
      v6Preview: v6Fp.slice(0, 4),
    };
  });

  const carriedForwardSummary = GOLD_MANUAL_ADDITIONS.map((a) => {
    const rj = readJson<{ surfaces: Surface[]; reviewEligibility?: string }>(path.join(RENDER, `${a.goldId}.json`));
    return {
      goldId: a.goldId,
      fixtureId: a.fixtureId,
      reviewEligibility: rj?.reviewEligibility ?? null,
      surfaceCount: rj?.surfaces.length ?? 0,
    };
  });

  fs.writeFileSync(
    path.join(OUT, "automated-comparison-report-v6.json"),
    JSON.stringify(
      {
        generatedAt: frozenAt,
        parentV1FreezeHash: V1_FREEZE_HASH,
        parentV2FreezeHash: V2_FREEZE_HASH,
        parentV3FreezeHash: V3_FREEZE_HASH,
        parentV5FreezeHash: V5_FREEZE_HASH,
        v6FreezeHash: freezeHash,
        separationRule: "AUTOMATED ONLY — excluded from blinded reviewer bundle",
        keyGolds: KEY_COMPARISON_GOLDS,
        comparisons: keyComparisons,
        carriedForwardSummary,
        summary: {
          keyGoldCount: keyComparisons.length,
          changedV4toV5Count: keyComparisons.filter((c) => c.changedV4toV5).length,
          insufficientAmongKey: keyComparisons.filter(
            (c) => c.reviewEligibility === "INSUFFICIENT_SOURCE_CONTEXT",
          ).length,
        },
      },
      null,
      2,
    ),
    "utf8",
  );

  const humanWorkbook = {
    generatedAt: frozenAt,
    freezeHash,
    parentV1FreezeHash: V1_FREEZE_HASH,
    parentV2FreezeHash: V2_FREEZE_HASH,
    parentV3FreezeHash: V3_FREEZE_HASH,
    parentV5FreezeHash: V5_FREEZE_HASH,
    status: "AWAITING_HUMAN_GOLD_REVIEW",
    instructions: [
      "v5 remediation comparison set — awaiting independent qualified human review.",
      "Cases marked INSUFFICIENT_SOURCE_CONTEXT are excluded from substantive FP/FN denominators.",
      "Do not invent sign-off. Blocked ≠ repaired.",
    ],
    reviewerRoster: {
      requiredRole: "independent qualified human / solicitor",
      completedBy: null,
      reviewDate: null,
      disagreements: [],
      adjudications: [],
      exclusions: [],
      unresolvedGoldIds: samples.map((s) => s.goldId),
    },
    judgments: humanSlots,
  };
  fs.writeFileSync(path.join(V6, "human-judgment-workbook.json"), JSON.stringify(humanWorkbook, null, 2), "utf8");

  const casesDir = path.join(BUNDLE, "cases");
  const rendersDir = path.join(BUNDLE, "renders");
  ensureDir(casesDir);
  ensureDir(rendersDir);

  const orderIds = [...samples.map((s) => s.goldId)];
  const rng = (() => {
    let x = parseInt(freezeHash.slice(0, 8), 16) || 1;
    return () => {
      x ^= x << 13;
      x ^= x >>> 17;
      x ^= x << 5;
      return (x >>> 0) / 0xffffffff;
    };
  })();
  for (let i = orderIds.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [orderIds[i], orderIds[j]] = [orderIds[j]!, orderIds[i]!];
  }

  const blindOrder = {
    purpose:
      "Blinded v5 order — no automated predictions, stratum, selectionReason, reviewFocus, or expected classification",
    freezeHash,
    parentV1FreezeHash: V1_FREEZE_HASH,
    parentV2FreezeHash: V2_FREEZE_HASH,
    parentV3FreezeHash: V3_FREEZE_HASH,
    parentV5FreezeHash: V5_FREEZE_HASH,
    sampleSize: orderIds.length,
    sequence: orderIds.map((goldId, idx) => ({
      reviewSequence: idx + 1,
      goldId,
      packetPath: `cases/${goldId}/`,
      renderMarkdown: `renders/${goldId}.md`,
    })),
  };
  fs.writeFileSync(path.join(BUNDLE, "blinded-review-order.json"), JSON.stringify(blindOrder, null, 2), "utf8");
  fs.writeFileSync(path.join(BUNDLE, "human-judgment-workbook.json"), JSON.stringify(humanWorkbook, null, 2), "utf8");

  for (const s of samples) {
    const caseDir = path.join(casesDir, s.goldId);
    ensureDir(caseDir);
    fs.copyFileSync(path.join(RENDER, `${s.goldId}.md`), path.join(rendersDir, `${s.goldId}.md`));
    fs.copyFileSync(path.join(RENDER, `${s.goldId}.json`), path.join(rendersDir, `${s.goldId}.json`));
    fs.copyFileSync(path.join(RENDER, `${s.goldId}.md`), path.join(caseDir, "solicitor-visible-render.md"));
    fs.copyFileSync(path.join(RENDER, `${s.goldId}.json`), path.join(caseDir, "solicitor-visible-render.json"));
    const rj = readJson<{ surfaces: Surface[]; reviewEligibility?: string }>(path.join(RENDER, `${s.goldId}.json`));
    const packet = {
      goldId: s.goldId,
      freezeHash,
      parentV1FreezeHash: V1_FREEZE_HASH,
      parentV2FreezeHash: V2_FREEZE_HASH,
      parentV3FreezeHash: V3_FREEZE_HASH,
      parentV5FreezeHash: V5_FREEZE_HASH,
      reviewEligibility: rj?.reviewEligibility ?? null,
      surfaceCount: rj?.surfaces.length ?? 0,
      evidenceFiles: ["solicitor-visible-render.md", "solicitor-visible-render.json"],
      judgmentFields: {
        expectedClassification: null,
        actualClassification: null,
        falsePositive: null,
        falseNegative: null,
        substantiveWordingJudgment: null,
        reviewerDecision: null,
        rationale: null,
        reviewerIdentity: null,
        reviewerRole: null,
        reviewDate: null,
        disagreement: null,
        adjudication: null,
        unresolved: true,
        notes: null,
      },
      blindingNote:
        "No stratum, selectionReason, reviewFocus, hypothesis, expected classification, or prediction metadata.",
      sourceContextNote:
        "See Controlled source context surface (includes 'Controlled evidence reference' line); INSUFFICIENT_SOURCE_CONTEXT cases are excluded from substantive FP/FN.",
    };
    fs.writeFileSync(path.join(caseDir, "packet.json"), JSON.stringify(packet, null, 2), "utf8");
  }

  fs.writeFileSync(
    path.join(BUNDLE, "INSTRUCTIONS.md"),
    `# Phase 11 v5 gold review — instructions

**Status:** AWAITING_HUMAN_GOLD_REVIEW (remediation comparison set)  
**v5 freeze hash:** \`${freezeHash}\`  
**Parent v1 freeze hash (preserved):** \`${V1_FREEZE_HASH}\`  
**Parent v2 freeze hash (preserved):** \`${V2_FREEZE_HASH}\`  
**Parent v3 freeze hash (preserved):** \`${V3_FREEZE_HASH}\`  
**Parent v5 freeze hash (preserved):** \`${V4_FREEZE_HASH}\`

## Definitions

- **Accepted** — solicitor-visible wording is appropriate to show/copy.
- **Blocked** — copy/export withheld. Blocked ≠ repaired.
- **Review-required** — neutral review message; not silent omission.
- **Uncertain** — family/hearing/provenance not safely resolved.
- **INSUFFICIENT_SOURCE_CONTEXT** — excluded from substantive FP/FN denominators.
- **FP** — over-block of safe wording.
- **FN** — under-block of unsafe wording (safety FN is a blocker).
- **Substantive correctness** — word-for-word accuracy; separate from "was it blocked?".

## Membership (v5)

- 43 goldIds/fixtures carried forward from v4, UNCHANGED (0 additions, 0 removals; lineage identical to v4).
- Synthetic technical controls (SYN-*) are substantive only where independent expected truth is documented; see each packet's "Controlled source context" surface.
- v5 focuses on RENDER discipline (every copyable prose surface — client_summary, court_line, cps_chase_draft, copy_preview, export_preview, family_leak_probe — now runs sanitize → boundary → assert → gate before canCopy=true) and a repaired SCAN that reads full rendered JSON for every case (see \`../fixed-length-wording-operations-v6.json\`).

Follow \`blinded-review-order.json\`. Do not consult automated-predictions-v6.json while judging.
`,
    "utf8",
  );

  fs.writeFileSync(
    path.join(BUNDLE, "HUMAN_JUDGMENT_FORM.md"),
    `# Phase 11 v5 — human judgment form

Freeze hash: \`${freezeHash}\`  
Parent v1: \`${V1_FREEZE_HASH}\`  
Parent v2: \`${V2_FREEZE_HASH}\`  
Parent v3: \`${V3_FREEZE_HASH}\`  
Parent v5: \`${V4_FREEZE_HASH}\`  
Workbook: \`human-judgment-workbook.json\`

| Field | Value |
|-------|-------|
| Reviewer identity | |
| Role | |
| Review date | |

Per case: goldId · eligibility · expected · actual · FP · FN · substantive wording · decision · rationale.
`,
    "utf8",
  );

  fs.writeFileSync(
    path.join(BUNDLE, "MANIFEST.json"),
    JSON.stringify(
      {
        bundleId: "phase11-reviewer-bundle-v5",
        freezeHash,
        parentV1FreezeHash: V1_FREEZE_HASH,
        parentV2FreezeHash: V2_FREEZE_HASH,
        parentV3FreezeHash: V3_FREEZE_HASH,
        parentV5FreezeHash: V5_FREEZE_HASH,
        sampleSize: samples.length,
        renderedSurfaces: surfacesTotal,
        includesAutomatedPredictions: false,
        status: "AWAITING_HUMAN_GOLD_REVIEW",
      },
      null,
      2,
    ),
    "utf8",
  );

  const g021 = readJson<{ surfaces: Surface[] }>(path.join(RENDER, "GOLD-11-021.json"));
  const g025 = readJson<{ surfaces: Surface[] }>(path.join(RENDER, "GOLD-11-025.json"));
  const g022 = readJson<{ surfaces: Surface[] }>(path.join(RENDER, "GOLD-11-022.json"));
  const g033 = readJson<{ surfaces: Surface[] }>(path.join(RENDER, "GOLD-11-033.json"));
  const g029 = readJson<{ surfaces: Surface[] }>(path.join(RENDER, "GOLD-11-029.json"));
  const g039 = readJson<{ surfaces: Surface[] }>(path.join(RENDER, "GOLD-11-039.json"));
  const substantiveSurfaces = (surfaces: Surface[] | undefined) =>
    (surfaces ?? []).filter((s) => s.surface !== "source_context");
  const g039ClientSummary = g039?.surfaces.find((s) => s.surface === "client_summary");
  const g039Structured = resolveStructuredClientSummary({
    sourceCaseId: "demo-audit-21-historic-sexual-abe",
    preview: null,
  });
  const g039Units = g039Structured.units ?? parseClientSummarySemanticUnits(g039Structured.text);
  const g039Semantic =
    !!g039ClientSummary &&
    !!g039Units &&
    g039ClientSummary.canCopy === true &&
    assessSolicitorVisibleBoundary(g039ClientSummary.solicitorVisibleText).ok &&
    clientSummaryMatchesSemanticUnits(g039ClientSummary.solicitorVisibleText, g039Units).pass;
  const g039NotCopyableTruncated =
    !!g039ClientSummary &&
    (g039ClientSummary.canCopy !== true || assessSolicitorVisibleBoundary(g039ClientSummary.solicitorVisibleText).ok);
  const v5G039 = readJson<{ surfaces: Surface[] }>(path.join(PREV_V5, "rendered", "GOLD-11-039.json"));
  const v5G039Client = v5G039?.surfaces.find((s) => s.surface === "client_summary");
  const v5BlockedPreserved =
    !!v5G039Client &&
    v5G039Client.canCopy === false &&
    /boundary_blocked|integrity_blocked/i.test(v5G039Client.gateStatus);
  const qualityScan = scanCopyableQualityIntegrity(RENDER);
  const fnChecks = {
    "GOLD-11-021_trunc_not_copyable":
      substantiveSurfaces(g021?.surfaces).every((s) => s.canCopy === false) === true,
    "GOLD-11-025_placeholder_not_copyable":
      substantiveSurfaces(g025?.surfaces).every((s) => s.canCopy === false) === true,
    "GOLD-11-022_title_withheld":
      g022?.surfaces.some((s) => /withheld/i.test(s.solicitorVisibleText)) === true,
    "GOLD-11-033_title_withheld":
      g033?.surfaces.some((s) => /withheld/i.test(s.solicitorVisibleText)) === true,
    "no_ellipsis_title_shown_022":
      g022?.surfaces.every((s) => !/said…/.test(s.solicitorVisibleText)) === true,
    "no_ellipsis_title_shown_033":
      g033?.surfaces.every((s) => !/I saw him/.test(s.solicitorVisibleText)) === true,
    "GOLD-11-029_api_neutral_banner_only":
      substantiveSurfaces(g029?.surfaces).some((s) => s.solicitorVisibleText === NEUTRAL_SOLICITOR_BLOCKED_BANNER) === true &&
      substantiveSurfaces(g029?.surfaces).every((s) => !/NOT USABLE|consumer|debug/i.test(s.solicitorVisibleText)) === true,
    "GOLD-11-039_client_summary_not_copyable_truncated": g039NotCopyableTruncated,
    "GOLD-11-039_client_summary_substantively_repaired": g039Semantic,
    "GOLD-11-039_v5_blocked_preserved": v5BlockedPreserved,
  };

  const scan = scanSolicitorVisibleMarkdown(RENDER);
  const boundaryScan = scanCopyableBoundaryIntegrity(RENDER);
  const contradictionScan = scanMatterFamilyContradictions(contradictionCorpus);

  const ledger = readJson<{
    status: string;
    prior72RawMarkerMap: { balanced: boolean };
    prior28TruncMap: { balanced: boolean };
    current42RawSources: { count: number };
    current55TruncSources: { count: number };
  }>(path.join(ROOT, "artifacts/casebrain-qa/integrity-programme/phase-6/occurrence-ledger-balanced.json"));

  const contracts = [
    { name: "schema_1_1_0", pass: CANONICAL_MATTER_STATE_VERSION === "1.1.0", detail: CANONICAL_MATTER_STATE_VERSION },
    { name: "central_31", pass: phase2CentralSurfaceIds().length === 31, detail: String(phase2CentralSurfaceIds().length) },
    {
      name: "ledger_untouched",
      pass:
        ledger?.status === "LEDGER_BALANCED" &&
        ledger.current42RawSources.count === 42 &&
        ledger.current55TruncSources.count === 55,
      detail: `42=${ledger?.current42RawSources.count};55=${ledger?.current55TruncSources.count}`,
    },
    { name: "v1_preserved", pass: fs.existsSync(path.join(V1, "gold-sample-frozen.json")), detail: V1_FREEZE_HASH.slice(0, 16) },
    {
      name: "v2_preserved",
      pass: fs.existsSync(v2FreezePath) && v2Frozen.freezeHash === V2_FREEZE_HASH,
      detail: V2_FREEZE_HASH.slice(0, 16),
    },
    {
      name: "v3_preserved",
      pass: fs.existsSync(v3FreezePath) && v3Frozen.freezeHash === V3_FREEZE_HASH,
      detail: V3_FREEZE_HASH.slice(0, 16),
    },
    {
      name: "v4_preserved",
      pass: fs.existsSync(v4FreezePath) && v4Frozen.freezeHash === V4_FREEZE_HASH,
      detail: V4_FREEZE_HASH.slice(0, 16),
    },
    {
      name: "v5_preserved",
      pass: fs.existsSync(v5FreezePath) && v5Frozen.freezeHash === V5_FREEZE_HASH,
      detail: V5_FREEZE_HASH.slice(0, 16),
    },
    { name: "v6_frozen_total", pass: v6Defs.length === samples.length, detail: String(v6Defs.length) },
    {
      name: "membership_identical_to_v5",
      pass:
        v5ParentMembershipKey.size === v6MembershipKey.size &&
        [...v5ParentMembershipKey].every((k) => v6MembershipKey.has(k)),
      detail: `0 additions, 0 removals (${samples.length})`,
    },
    {
      name: "membership_identical_to_v4",
      pass: v4MembershipKey.size === v6MembershipKey.size && [...v4MembershipKey].every((k) => v6MembershipKey.has(k)),
      detail: `0 additions, 0 removals (${samples.length})`,
    },
    {
      name: "membership_30_50",
      pass: samples.length >= MEMBERSHIP_MIN && samples.length <= MEMBERSHIP_MAX,
      detail: `${samples.length} (target ${MEMBERSHIP_MIN}-${MEMBERSHIP_MAX})`,
    },
    {
      name: "substantive_eligible_30_50",
      pass: substantiveCount >= SUBSTANTIVE_MIN && substantiveCount <= SUBSTANTIVE_MAX,
      detail: `${substantiveCount} (target ${SUBSTANTIVE_MIN}-${SUBSTANTIVE_MAX})`,
    },
    { name: "fn_trunc_021", pass: fnChecks["GOLD-11-021_trunc_not_copyable"], detail: "canCopy=false" },
    { name: "fn_placeholder_025", pass: fnChecks["GOLD-11-025_placeholder_not_copyable"], detail: "canCopy=false" },
    {
      name: "title_022_withheld",
      pass: fnChecks["GOLD-11-022_title_withheld"] && fnChecks["no_ellipsis_title_shown_022"],
      detail: "withheld",
    },
    {
      name: "title_033_withheld",
      pass: fnChecks["GOLD-11-033_title_withheld"] && fnChecks["no_ellipsis_title_shown_033"],
      detail: "withheld",
    },
    {
      name: "api_029_neutral_only",
      pass: fnChecks["GOLD-11-029_api_neutral_banner_only"],
      detail: "NEUTRAL_SOLICITOR_BLOCKED_BANNER",
    },
    {
      name: "fn_039_client_summary_not_truncated",
      pass: fnChecks["GOLD-11-039_client_summary_not_copyable_truncated"],
      detail: g039ClientSummary
        ? `canCopy=${g039ClientSummary.canCopy};len=${g039ClientSummary.solicitorVisibleText.length};tail="${g039ClientSummary.solicitorVisibleText.slice(-40)}"`
        : "missing",
    },
    {
      name: "fn_039_client_summary_substantively_repaired",
      pass: fnChecks["GOLD-11-039_client_summary_substantively_repaired"],
      detail: g039Semantic
        ? `canCopy=true;len=${g039ClientSummary?.solicitorVisibleText.length};semantic_units=pass`
        : `canCopy=${g039ClientSummary?.canCopy};semantic_fail`,
    },
    {
      name: "fn_039_v5_blocked_preserved",
      pass: fnChecks["GOLD-11-039_v5_blocked_preserved"],
      detail: "v5 canCopy=false retained as historical evidence",
    },
    {
      name: "copyable_quality_scan",
      pass: qualityScan.pass,
      detail: qualityScan.pass
        ? `clean (${qualityScan.scannedSurfaceCount} copyable surfaces)`
        : qualityScan.hits
            .slice(0, 8)
            .map((h) => `${h.goldId}/${h.surface}:${h.issues.join("+")}`)
            .join("; "),
    },
    {
      name: "solicitor_visible_scan",
      pass: scan.pass,
      detail: scan.pass ? "clean" : `${scan.hits.length} hit(s)`,
    },
    {
      name: "copyable_boundary_scan",
      pass: boundaryScan.pass,
      detail: boundaryScan.pass
        ? `clean (${boundaryScan.scannedSurfaceCount} prose surfaces across ${boundaryScan.scannedCaseCount} cases)`
        : `${boundaryScan.hits.length} hit(s)`,
    },
    {
      name: "contradiction_contract",
      pass: contradictionScan.pass,
      detail: contradictionScan.pass ? "zero hits" : `${contradictionScan.hits.length} hit(s)`,
    },
    {
      name: "blind_bundle_no_predictions",
      pass: !fs.existsSync(path.join(BUNDLE, "automated-predictions.json")),
      detail: "predictions excluded",
    },
    {
      name: "human_blank",
      pass: humanWorkbook.reviewerRoster.completedBy == null,
      detail: "AWAITING_HUMAN_GOLD_REVIEW",
    },
  ];
  const contractPass = contracts.every((c) => c.pass);

  const report = {
    phase: "11-remediation-v5",
    status: "REMEDIATION_V6_COMPLETE__AWAITING_HUMAN_GOLD_REVIEW",
    generatedAt: frozenAt,
    parentV1FreezeHash: V1_FREEZE_HASH,
    parentV2FreezeHash: V2_FREEZE_HASH,
    parentV3FreezeHash: V3_FREEZE_HASH,
    parentV5FreezeHash: V5_FREEZE_HASH,
    v6FreezeHash: freezeHash,
    sampleSize: samples.length,
    substantiveCount,
    insufficientSourceContextCount,
    surfacesTotal,
    changedSurfaces,
    lineageDisclosure,
    carriedForwardSummary,
    fnChecks,
    scan,
    boundaryScan,
    contradictionScan,
    contracts,
    contractPass,
    ledgerImpact: "none",
    schemaImpact: "none — still 1.1.0",
    programmePassSupported: false,
    rootCausesFixed: [
      "GOLD-11-039 (CASE-12) blocking FN fixed: client_summary is now built via sanitizeSolicitorProse → finalizeSolicitorVisibleProse → assertCopyableSolicitorText → gateSolicitorOutput(mode:copy, auditFamily) → solicitorVisibleGatedCopy, and NEVER sets canCopy=true without all of those passing. A boundary/gate failure now yields a proportionate blocked preview (Item/Status/Reason), canCopy=false.",
      "cps_chase_draft (previously ungated in v4 — canCopy hardcoded true) now runs the same mandatory discipline as every other copyable prose surface.",
      "court_line, copy_preview (ESA sample texts), export_preview and family_leak_probe all now run finalizeSolicitorVisibleProse + assertCopyableSolicitorText ahead of the gate, in addition to the existing gateSolicitorOutput call.",
      "Scan repaired: scanCopyableBoundaryIntegrity reads the COMPLETE rendered JSON (not markdown previews, not first-N samples) for every case including GOLD-11-034..043, and fails the corpus if any canCopy===true prose surface has an incomplete disclaimer, a mid-word/mid-sentence cut, an unclosed bracket/quote, an ellipsis cut, or is exactly 600 chars ending mid-disclaimer.",
      "resolveGateOffenceFamily + auditFamily preference used for every offence_family surface and passed into every gateSolicitorOutput call (ESA / gold-manual / synthetic) — removes matter-level resolved-vs-unresolved contradictions.",
      "hasMatterFamilyResolvedUnresolvedContradiction cross-surface contract run per case across the whole v5 corpus — zero hits required.",
      "Controlled source context surface with INSUFFICIENT_SOURCE_CONTEXT exclusion from substantive FP/FN; synthetics carry independent expected-truth context and count as substantive.",
      "Every packet's source context discloses a 'Controlled evidence reference' line (not free-copy; excluded from the leak scan by design) without echoing the primary judged output.",
      "Fixture IDs / internal strings stripped from solicitor-visible copy.",
      "Theft Act / MG6C formulas queued (not free copy) on header and court lines.",
      "Client summary prose sanitized (redacted papers have been served / nested 'in your case (Name)' → 'for Name' / leading-hyphen stripped / unsafe proof-outcome wording / foundation SJP / First appearance / fraud hero / Further papers on the file).",
      "Evidence states humanized (referred_only → Referred only); ANPR/SFR preserved uppercase in solicitorDisplayLabel.",
      "Chase labels deduped (dedupeSolicitorLabels) and sanitized for solicitor display (Chase Total = deduped label count) — repeated MG6 chase/preview wording removed.",
      "Blocked copy previews proportionate (Item/Status/Reason) via ruleIds and inferBlockedItemLabel.",
      "SYN-API-BLOCK-01 shows only NEUTRAL_SOLICITOR_BLOCKED_BANNER.",
    ],
  };
  fs.writeFileSync(path.join(OUT, "phase11-remediation-v6-report.json"), JSON.stringify(report, null, 2), "utf8");
  fs.writeFileSync(
    path.join(OUT, "before-after-summary-v6.json"),
    JSON.stringify({ changedSurfaces, insufficientSourceContextCount, substantiveCount, cases: beforeAfter }, null, 2),
    "utf8",
  );

  // Item 7 — disposition report of fixed-length-wording operations across the codebase.
  const dispositionReport = {
    generatedAt: frozenAt,
    v6FreezeHash: freezeHash,
    purpose:
      "Disposition of fixed-length-slice wording operations that historically risked (or could risk) the GOLD-11-039 class of false negative: a copyable solicitor-facing surface cut mid-word / mid-sentence / mid-disclaimer by a hardcoded .slice(0, N).",
    dispositionLegend: {
      fail_closed_fixed:
        "The hard slice was removed / replaced; the site now fails closed (blocks copy) rather than emitting a truncated string when content would be cut.",
      safe_boundary_module:
        "The site is now built via lib/criminal/solicitor-visible-boundary.ts (finalizeSolicitorVisibleProse / assertCopyableSolicitorText), which prefers complete semantic units and fails closed on unsafe cuts — no hardcoded length slice remains.",
      keep_list_limit:
        "The fixed-length operation bounds a list/count/dedupe-key (not the free-copy prose itself) and is an intentional, low-risk display/dedupe policy — not part of the truncation-FN class.",
      diagnostic_only:
        "The fixed-length operation feeds a diagnostic / internal / AI-assistant-context field, not a solicitor-facing copyable surface — out of scope for the client_summary-class FN.",
    },
    sites: [
      {
        site: "scripts/build-gold-manual-proof-set-v1.ts — clientSummaryPreview (clientPreview)",
        priorBehavior: "Historically built via a hard `clientPreview.slice(0, 600)`.",
        currentBehavior:
          "clientPreview is now built via presentClientSummaryForFamily(spec.familyLabel, clientLabel, clientPreviewRaw) with no `.slice()` call at all; assigned directly to clientSummaryPreview.",
        disposition: "fail_closed_fixed",
      },
      {
        site: "components/criminal/hearing-war-room/HearingWarRoom.tsx — summary slice",
        priorBehavior: "Historically hard-sliced summary text at 600/400 chars.",
        currentBehavior: "No `.slice(0, 600)` / `.slice(0, 400)` present in this file (verified by corpus grep).",
        disposition: "fail_closed_fixed",
      },
      {
        site: "components/criminal/disclosure-chase/DisclosureChase.tsx — summary slice",
        priorBehavior: "Historically hard-sliced summary text at 600/400 chars.",
        currentBehavior: "No `.slice(0, 600)` / `.slice(0, 400)` present in this file (verified by corpus grep).",
        disposition: "fail_closed_fixed",
      },
      {
        site: "components/criminal/CaseControlRoom.tsx — planSummary (`buildPlanSummary` + battleboard snippet)",
        priorBehavior: "`.slice(0, 400)` on a battleboard primary-route line; `.slice(0, 300)` on solicitor_safe_summary.",
        currentBehavior:
          "Still present, but `planSummary` is passed only into `ControlRoomAssistantDock` as AI-assistant prompt context (a context-window budget for the case-brain chat assistant) — it is never rendered as, or exported as, a solicitor copy/export field. Not part of the client_summary/court_line/cps_chase render pipeline.",
        disposition: "diagnostic_only",
      },
      {
        site: "lib/criminal/five-answers/build-five-answers-view.ts — chase.copySuggestion",
        priorBehavior: "Historically capped at a fixed ~280-char slice.",
        currentBehavior:
          "`const finalized = finalizeSolicitorVisibleProse(copy.textForClipboard); copySuggestion: finalized.ok ? finalized.text : item.label` — no length slice; fails over to the safe item label if the boundary module rejects the text.",
        disposition: "safe_boundary_module",
      },
      {
        site: "lib/criminal/hearing-mode/build-hearing-mode.ts — cpsChaseWording",
        priorBehavior: "Historically capped at a fixed ~280-char slice.",
        currentBehavior:
          "`const finalized = finalizeSolicitorVisibleProse(copy.textForClipboard); cpsChaseWording: sanitise(finalized.ok ? finalized.text : item.label)` — no length slice; canCopy is additionally gated on `finalized.ok`.",
        disposition: "safe_boundary_module",
      },
      {
        site: "lib/criminal/structured-solicitor-output/compose.ts — extractSubjectFromLegacy",
        priorBehavior: "Historically hard-sliced the legacy subject string at 72 chars mid-word.",
        currentBehavior:
          "`// Never hard-slice mid-word for subject extraction — omit and let reconstruction fail closed. if (text.length > 72) return \"\";` — omits (fails closed to empty subject, which the caller treats as still_blocked) rather than slicing.",
        disposition: "fail_closed_fixed",
      },
      {
        site: "scripts/integrity-programme/phase11-remediation-v6.ts (THIS script) — client_summary / court_line / cps_chase_draft / copy_preview / export_preview / family_leak_probe",
        priorBehavior:
          "v4: client_summary and cps_chase_draft were rendered with sanitizeSolicitorProse only (no boundary check, no gate) — the direct cause of the GOLD-11-039 false negative.",
        currentBehavior:
          "All six surfaces now route through renderCopyableSolicitorText(): sanitizeSolicitorProse → finalizeSolicitorVisibleProse → assertCopyableSolicitorText → gateSolicitorOutput(mode, auditFamily) → solicitorVisibleGatedCopy. Any failure yields a proportionate blocked preview, canCopy=false.",
        disposition: "fail_closed_fixed",
      },
      {
        site: "lib/criminal/proof-receipt/build-proof-receipts.ts — sourceSnippet",
        priorBehavior: "`row.sourceAnchor?.trim().slice(0, 280)`.",
        currentBehavior: "Unchanged — bounds a short evidentiary source-anchor citation, not the primary copyable prose field.",
        disposition: "keep_list_limit",
      },
      {
        site: "lib/criminal/disclosure-export/build-hearing-prep-note.ts / build-case-handover-summary.ts / lib/criminal/supervisor-qa/build-supervisor-qa-result.ts — readiness.explanation slice(0,280/400)",
        priorBehavior: "Fixed-length slice on a readiness-explanation status line embedded in export/QA notes.",
        currentBehavior:
          "Unchanged in this remediation round — bounds a short structured readiness LABEL (not the client_summary/court_line/cps_chase narrative class); out of the explicit v5 scope. Flagged here for a follow-up remediation pass rather than silently left undocumented.",
        disposition: "keep_list_limit",
      },
      {
        site: "lib/criminal/re-run-diff/rerun-diff-sanitize.ts labelKey / lib/criminal/supervisor-qa/build-supervisor-qa-result.ts dedupeLines key / lib/criminal/disclosure-export dedupeLines key — `.slice(0, 72)`",
        priorBehavior: "N/A — these are dedupe-key computations, not display text.",
        currentBehavior: "Unchanged — the slice bounds a lowercase dedupe KEY used only for duplicate detection; the full sanitized line is still pushed to output, never the truncated key.",
        disposition: "keep_list_limit",
      },
    ],
  };
  fs.writeFileSync(
    path.join(OUT, "fixed-length-wording-operations-v6.json"),
    JSON.stringify(dispositionReport, null, 2),
    "utf8",
  );

  const checkpoint = `# Phase 11 remediation v6 checkpoint

**Status:** REMEDIATION_V6_COMPLETE — **AWAITING_HUMAN_GOLD_REVIEW** — **not a programme PASS**  
**v1 freeze (preserved):** \`${V1_FREEZE_HASH}\`  
**v2 freeze (preserved):** \`${V2_FREEZE_HASH}\`  
**v3 freeze (preserved):** \`${V3_FREEZE_HASH}\`  
**v4 freeze (preserved):** \`${V4_FREEZE_HASH}\`  
**v5 freeze (preserved):** \`${V5_FREEZE_HASH}\`  
**v6 freeze:** \`${freezeHash}\`  
**Schema:** 1.1.0 · **Central surfaces:** 31 · **Ledger impact:** none  
**programmePassSupported:** false

## Explicit

- v1, v2, v3 and v4 sample, hash, renders, and reports are **unchanged historical evidence** (read-only).
- v5 membership is **byte-identical to v4** (43 goldIds/fixtures — the v1 33 + GOLD-11-034..043): 0 additions, 0 removals. Only the freeze hash (version tag + parentV5FreezeHash) and the render/scan discipline change.
- v4's scan MISSED a blocking false negative: GOLD-11-039 (CASE-12, historic sexual ABE) rendered a copyable ("canCopy": true) client_summary cut off mid-disclaimer ("...Not for court or CPS us"). v5 fixes both the render (mandatory sanitize→boundary→assert→gate on every copyable prose surface) and the scan (reads full rendered JSON, not markdown previews, across the whole corpus including GOLD-11-034..043).
- No human judgments filled. No invented sign-off. No merge/deploy/programme PASS.
- Blocked ≠ repaired.

## Membership

| Metric | Value |
|--------|------:|
| v1 IDs retained (lineage) | ${lineageDisclosure.v1IdsRetained} |
| Carried forward unchanged from v4 (gold-manual additions) | ${lineageDisclosure.carriedForwardFromV4Count} |
| Additions in v5 | ${lineageDisclosure.additionsCount} |
| Removals in v5 | ${lineageDisclosure.removalsCount} |
| Total v5 sample | ${samples.length} |
| Substantive eligible | ${substantiveCount} |
| Insufficient source context (excluded) | ${insufficientSourceContextCount} |
| Unique fixtures | ${fixtureCounts.size} |
| Duplicate fixtures (carried from v1) | ${duplicateFixtures.map(([id, n]) => `${id}×${n}`).join(", ") || "none"} |

**v5 membership policy:** ${lineageDisclosure.v6MembershipPolicy}

## GOLD-11-039 — the case that exposed the v4 miss

| Field | v4 (before) | v5 (after) |
|-------|-------------|------------|
| client_summary gateStatus | display | ${g039ClientSummary?.gateStatus ?? "?"} |
| client_summary canCopy | true | ${g039ClientSummary?.canCopy ?? "?"} |
| client_summary text length | 693 (cut mid-disclaimer) | ${g039ClientSummary?.solicitorVisibleText.length ?? "?"} |
| client_summary tail | \`...Not for court or CPS us\` | \`...${g039ClientSummary?.solicitorVisibleText.slice(-48) ?? "?"}\` |

**Not copyable-truncated (fn_039):** ${fnChecks["GOLD-11-039_client_summary_not_copyable_truncated"]}

## Confirmed FN remediations (carried forward)

| Case | Fix | Pass |
|------|-----|------|
| GOLD-11-021 | mid-word truncation blocked | ${fnChecks["GOLD-11-021_trunc_not_copyable"]} |
| GOLD-11-025 | \`{{MISSING_ITEM}}\` blocked | ${fnChecks["GOLD-11-025_placeholder_not_copyable"]} |
| GOLD-11-022 | unsafe title withheld on display | ${fnChecks["GOLD-11-022_title_withheld"]} |
| GOLD-11-033 | unsafe title withheld on display | ${fnChecks["GOLD-11-033_title_withheld"]} |
| GOLD-11-029 | neutral blocked banner only | ${fnChecks["GOLD-11-029_api_neutral_banner_only"]} |
| GOLD-11-039 | client_summary no longer copyable-truncated | ${fnChecks["GOLD-11-039_client_summary_not_copyable_truncated"]} |

## Solicitor-visible scan (fixture / enum / placeholder — full text, unchanged design)

**Pass:** ${scan.pass}${scan.hits.length ? ` (${scan.hits.length} hits)` : ""}

## Copyable-surface boundary-truncation scan (v5 repair — reads full rendered JSON)

**Pass:** ${boundaryScan.pass}${boundaryScan.hits.length ? ` (${boundaryScan.hits.length} hit(s): ${boundaryScan.hits.map((h) => `${h.goldId}/${h.surface}`).join(", ")})` : ` — zero hits across ${boundaryScan.scannedSurfaceCount} copyable prose surfaces in ${boundaryScan.scannedCaseCount} cases`}

## Cross-surface matter-family contradiction contract

**Pass:** ${contradictionScan.pass}${contradictionScan.hits.length ? ` (${contradictionScan.hits.length} hit(s): ${contradictionScan.hits.map((h) => h.goldId).join(", ")})` : " — zero hits across the full v5 corpus"}

## Contracts

${contracts.map((c) => `- ${c.name}: ${c.pass ? "PASS" : "FAIL"} (${c.detail})`).join("\n")}

All remediation contracts: **${contractPass}**

## Artefacts

- \`artifacts/.../phase-11/\` — v1 preserved (read-only)
- \`artifacts/.../phase-11-remediation/v2/\` — v2 preserved (read-only)
- \`artifacts/.../phase-11-remediation/v3/\` — v3 preserved (read-only)
- \`artifacts/.../phase-11-remediation/v4/\` — v4 preserved (read-only)
- \`artifacts/.../phase-11-remediation/v5/\` — v5 freeze + blinded renders + workbook
- \`artifacts/.../phase-11-remediation/before-after-surfaces-v6/\` — per-case surface diffs (v4 → v5)
- \`artifacts/.../phase-11-remediation/automated-predictions-v6.json\` — separate from blinded bundle
- \`artifacts/.../phase-11-remediation/automated-comparison-report-v6.json\` — v1→v2→v3→v4→v5 key-gold summary
- \`artifacts/.../phase-11-remediation/fixed-length-wording-operations-v6.json\` — disposition of fixed-length-slice sites across the codebase

## Programme PASS

**Not supported.**

## Explicit non-goals

No human judgments filled. No commit. No merge. No deploy. No programme PASS. Stop at remediation checkpoint for independent v5 review.
`;

  ensureDir(DOCS);
  fs.writeFileSync(path.join(DOCS, "phase-11-remediation-v5-checkpoint.md"), checkpoint, "utf8");
  fs.writeFileSync(path.join(OUT, "PHASE-11-REMEDIATION-V6-CHECKPOINT.md"), checkpoint, "utf8");

  const readmePath = path.join(DOCS, "README.md");
  if (fs.existsSync(readmePath)) {
    let readme = fs.readFileSync(readmePath, "utf8");
    if (readme.includes("Phase 11 —")) {
      readme = readme.replace(
        /\| Phase 11 —.*\|/,
        "| Phase 11 — rendered coverage + gold FP–FN | **REMEDIATION_V6_COMPLETE / AWAITING_HUMAN_GOLD_REVIEW** (v1–v5 preserved; v6 membership identical to v5; GOLD-11-039 substantively repaired, not a PASS) | `docs/integrity-programme/phase-11-remediation-v6-checkpoint.md` |",
      );
      fs.writeFileSync(readmePath, readme, "utf8");
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: contractPass,
        status: report.status,
        v1Hash: V1_FREEZE_HASH.slice(0, 16),
        v2Hash: V2_FREEZE_HASH.slice(0, 16),
        v3Hash: V3_FREEZE_HASH.slice(0, 16),
        v4Hash: V4_FREEZE_HASH.slice(0, 16),
        v5Hash: V5_FREEZE_HASH.slice(0, 16),
        v6Hash: freezeHash,
        sampleSize: samples.length,
        substantiveCount,
        insufficientSourceContextCount,
        surfacesTotal,
        changedSurfaces,
        fnChecks,
        scanPass: scan.pass,
        boundaryScanPass: boundaryScan.pass,
        boundaryScanScannedSurfaces: boundaryScan.scannedSurfaceCount,
        contradictionPass: contradictionScan.pass,
        gold11039: g039ClientSummary
          ? {
              gateStatus: g039ClientSummary.gateStatus,
              canCopy: g039ClientSummary.canCopy,
              length: g039ClientSummary.solicitorVisibleText.length,
              tail: g039ClientSummary.solicitorVisibleText.slice(-60),
            }
          : null,
        programmePassSupported: false,
      },
      null,
      2,
    ),
  );
  if (!contractPass) process.exitCode = 1;
}

main();
