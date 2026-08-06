/**
 * Phase 11 — rendered coverage + frozen gold sample for human FP–FN review.
 *
 * Freezes a stratified 30–50 gold set BEFORE any human judgments are recorded.
 * Renders solicitor-visible text (not internal-only JSON).
 * Writes automated predictions SEPARATELY from human judgment slots.
 *
 * Does NOT fabricate independent solicitor/human sign-off.
 * Checkpoint status is AWAITING_HUMAN_GOLD_REVIEW until a qualified human
 * completes the workbook and an authorized adjudication records programme readiness.
 *
 * Run: npx tsx scripts/integrity-programme/phase11-rendered-gold-review.ts
 * Ledger: no re-count / mutation of Phase-6 72/28 or 42/55 units.
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
import {
  assertSafeEvidenceTitle,
  isTruncatedExcerptUsedAsTitle,
} from "@/lib/criminal/extraction-provenance-boundary";
import {
  canUseSolicitorApiResponse,
  solicitorUiStateFromApiBody,
} from "@/lib/criminal/integrity-blocked-consumer";
import {
  classifyTextsAgainstConceptRegistry,
  mapAuditScenarioFamilyToSolicitor,
} from "@/lib/criminal/offence-family-concept-registry";
import { countEvidenceStatesForDisplay } from "@/lib/criminal/overview-presentation";
import {
  formatHearingStatusForDisplay,
  resolveSolicitorHearingStatus,
} from "@/lib/criminal/solicitor-hearing-status";
import { resolveSolicitorOffenceFamily } from "@/lib/criminal/solicitor-offence-family";
import {
  gateSolicitorOutput,
  integrityBlockedApiBody,
} from "@/lib/criminal/solicitor-output-gate";
import { assessSolicitorSentence } from "@/lib/criminal/solicitor-sentence-composer";
import { phase2CentralSurfaceIds } from "@/lib/criminal/solicitor-surface-gate-registry";
import { validateSolicitorSurface } from "@/lib/criminal/shared-solicitor-validator";
import {
  displayForSafelyOmitted,
  REVIEW_REQUIRED_NEUTRAL,
} from "@/lib/criminal/structured-solicitor-output";

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "artifacts/casebrain-qa/integrity-programme/phase-11");
const DOCS = path.join(ROOT, "docs/integrity-programme");
const RENDER_DIR = path.join(OUT, "rendered");
const ESA = path.join(ROOT, "artifacts/evidence-state-audit-local/cases");
const GOLD_PACK = path.join(ROOT, "artifacts/casebrain-qa/gold-manual-proof-set-v1");
const PHASE9_PACK = path.join(
  ROOT,
  "artifacts/casebrain-qa/integrity-programme/phase-9/human-fp-fn-corpus-pack.json",
);

type Stratum =
  | "accepted_clean"
  | "blocked_containment"
  | "review_required"
  | "uncertain_family"
  | "offence_family"
  | "provenance"
  | "omission_truncation"
  | "hearing_time"
  | "copy_export_api"
  | "composed_prose";

type SourceKind = "materialised_esa" | "gold_manual_pack" | "synthetic_controlled" | "phase9_pack_seed";

type Classification =
  | "accepted"
  | "blocked"
  | "review_required"
  | "uncertain"
  | "unsafe_if_copyable"
  | "not_applicable";

type SampleDef = {
  goldId: string;
  stratum: Stratum;
  sourceKind: SourceKind;
  fixtureId: string;
  selectionReason: string;
  reviewFocus: string;
};

type RenderedSurface = {
  surface: string;
  label: string;
  solicitorVisibleText: string;
  gateStatus: string;
  canCopy: boolean | null;
};

type AutomatedPrediction = {
  goldId: string;
  predictedClassification: Classification;
  predictedGateStatus: string;
  predictedCanCopy: boolean | null;
  predictedFpFnHypothesis: "possible_fp_overblock" | "possible_fn_leak" | "neither" | "uncertain";
  predictedSubstantiveWording: "not_assessed_by_automation" | "blocked_not_repaired";
  rationale: string;
  evidenceReference: string;
};

type HumanJudgmentSlot = {
  goldId: string;
  expectedClassification: Classification | null;
  actualClassification: Classification | null;
  falsePositive: boolean | null;
  falseNegative: boolean | null;
  substantiveWordingJudgment: "acceptable" | "needs_edit" | "unsafe" | "blocked_not_repaired" | null;
  reviewerDecision: "pass" | "fail" | "needs_discussion" | "excluded" | null;
  rationale: string | null;
  evidenceReference: string;
  reviewerIdentity: string | null;
  reviewerRole: string | null;
  reviewDate: string | null;
  disagreement: string | null;
  adjudication: string | null;
  unresolved: boolean;
  notes: string | null;
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

function shortHash(s: string): string {
  return sha256(s).slice(0, 16);
}

function walkStrings(v: unknown, out: string[], d = 0) {
  if (d > 5 || out.length >= 48) return;
  if (typeof v === "string" && v.length >= 8 && v.length <= 700) out.push(v);
  else if (Array.isArray(v)) v.slice(0, 30).forEach((x) => walkStrings(x, out, d + 1));
  else if (v && typeof v === "object") Object.values(v).slice(0, 30).forEach((x) => walkStrings(x, out, d + 1));
}

function evidenceRowsFromTruth(truth: Record<string, unknown>): FiveAnswersEvidenceRow[] {
  const rows: FiveAnswersEvidenceRow[] = [];
  const items = (truth.evidenceItems as Array<Record<string, unknown>> | undefined) ?? [];
  for (const it of items) {
    const label = String(it.label ?? it.evidence_item ?? it.name ?? "").trim();
    if (!label) continue;
    const existence = String(it.existence ?? it.correct_evidence_state ?? "unknown");
    rows.push({
      label,
      existence: existence as FiveAnswersEvidenceRow["existence"],
      reliability: "needs_review",
    });
  }
  for (const key of ["servedEvidence", "referredOnlyEvidence", "missingEvidence", "uncertainEvidence"] as const) {
    const arr = truth[key];
    if (!Array.isArray(arr)) continue;
    for (const labelRaw of arr) {
      const label = String(labelRaw).trim();
      if (!label) continue;
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
    return fromExpected.map((x) => ({ label: String(x).trim() })).filter((c) => c.label);
  }
  const items = (truth.chaseItems as Array<Record<string, unknown>> | undefined) ?? [];
  return items
    .map((c) => ({ label: String(c.label ?? "").trim() }))
    .filter((c) => c.label);
}

function mapAuditToSolicitor(auditFamily: string) {
  return (
    mapAuditScenarioFamilyToSolicitor(auditFamily) ??
    resolveSolicitorOffenceFamily({ allegation: auditFamily.replace(/-/g, " "), bundleHay: auditFamily }).family
  );
}

function freezeSampleDefs(): SampleDef[] {
  const phase9 = readJson<{ samples: Array<{ stratum: string; fixtureId: string; family: string }> }>(PHASE9_PACK);
  const p9 = phase9?.samples ?? [];
  const byStratum = (s: string) => p9.filter((x) => x.stratum === s);

  const defs: SampleDef[] = [];
  let n = 1;
  const add = (partial: Omit<SampleDef, "goldId">) => {
    defs.push({ goldId: `GOLD-11-${String(n).padStart(3, "0")}`, ...partial });
    n += 1;
  };

  // Accepted / clean
  for (const s of byStratum("clean_pass").slice(0, 5)) {
    add({
      stratum: "accepted_clean",
      sourceKind: "phase9_pack_seed",
      fixtureId: s.fixtureId,
      selectionReason: "Phase 9 clean_pass stratum — accepted containment candidate",
      reviewFocus: "Confirm solicitor-visible wording remains acceptable and not over-blocked.",
    });
  }

  // Blocked / possible over-block
  for (const s of byStratum("possible_fp_overblock").slice(0, 5)) {
    add({
      stratum: "blocked_containment",
      sourceKind: "phase9_pack_seed",
      fixtureId: s.fixtureId,
      selectionReason: "Phase 9 possible_fp_overblock — containment blocks present",
      reviewFocus: "Is fail-closed over-blocking safe solicitor wording? (FP). Blocked ≠ repaired.",
    });
  }

  // Uncertain family
  for (const s of byStratum("uncertain_family").slice(0, 4)) {
    add({
      stratum: "uncertain_family",
      sourceKind: "phase9_pack_seed",
      fixtureId: s.fixtureId,
      selectionReason: "Phase 9 uncertain_family stratum",
      reviewFocus: "Is uncertain / fail-closed presentation correct for the solicitor?",
    });
  }

  // Offence-family + provenance + composed from gold manual pack (solicitor-facing summaries exist)
  const goldCases: Array<{ id: string; fixture: string; stratum: Stratum; reason: string; focus: string }> = [
    {
      id: "CASE-01",
      fixture: "demo-audit-01-phone-harassment",
      stratum: "offence_family",
      reason: "Gold pack harassment family with attribution gaps",
      focus: "Family-correct wording; no overstated attribution.",
    },
    {
      id: "CASE-05",
      fixture: "demo-audit-05-encro-attribution",
      stratum: "provenance",
      reason: "Gold pack attribution / provenance pressure",
      focus: "Provenance and attribution must not overstate.",
    },
    {
      id: "CASE-08",
      fixture: "demo-audit-69-charge-mg5-hearing",
      stratum: "hearing_time",
      reason: "Gold pack charge/MG5/hearing surface",
      focus: "Hearing/date presentation accuracy.",
    },
    {
      id: "CASE-04",
      fixture: "demo-audit-02-cctv-stills",
      stratum: "composed_prose",
      reason: "Gold pack CCTV stills composed court/client lines",
      focus: "Composed prose acceptability word-for-word.",
    },
    {
      id: "CASE-07",
      fixture: "demo-audit-44-bad-redaction",
      stratum: "provenance",
      reason: "Gold pack bad-redaction provenance risk",
      focus: "Provenance / redaction-safe display.",
    },
    {
      id: "CASE-02",
      fixture: "demo-audit-03-bwv-custody",
      stratum: "composed_prose",
      reason: "Gold pack BWV/custody composed surfaces",
      focus: "Client/court composed lines word-for-word.",
    },
  ];
  for (const g of goldCases) {
    add({
      stratum: g.stratum,
      sourceKind: "gold_manual_pack",
      fixtureId: `${g.id}:${g.fixture}`,
      selectionReason: g.reason,
      reviewFocus: g.focus,
    });
  }

  // Controlled synthetic strata — exact solicitor-visible gate/render behaviours
  const synthetics: Array<Omit<SampleDef, "goldId">> = [
    {
      stratum: "omission_truncation",
      sourceKind: "synthetic_controlled",
      fixtureId: "SYN-TRUNC-01",
      selectionReason: "Controlled truncated fragment at copy exit",
      reviewFocus: "Truncation must block copy; blocked ≠ repaired wording.",
    },
    {
      stratum: "omission_truncation",
      sourceKind: "synthetic_controlled",
      fixtureId: "SYN-TRUNC-TITLE-01",
      selectionReason: "Truncated excerpt used as evidence title",
      reviewFocus: "Unsafe title must not be presented as safe evidence title.",
    },
    {
      stratum: "omission_truncation",
      sourceKind: "synthetic_controlled",
      fixtureId: "SYN-OMIT-01",
      selectionReason: "Safely omitted legacy → review-required display",
      reviewFocus: "Omission must show review-required neutral, not silent drop.",
    },
    {
      stratum: "review_required",
      sourceKind: "synthetic_controlled",
      fixtureId: "SYN-RR-01",
      selectionReason: "Review-required neutral banner path",
      reviewFocus: "Solicitor sees review-required; not treated as repaired prose.",
    },
    {
      stratum: "review_required",
      sourceKind: "synthetic_controlled",
      fixtureId: "SYN-RR-PLACEHOLDER-01",
      selectionReason: "Unresolved placeholder blocked at copy",
      reviewFocus: "Placeholder must not be copyable.",
    },
    {
      stratum: "hearing_time",
      sourceKind: "synthetic_controlled",
      fixtureId: "SYN-HEAR-UNKNOWN",
      selectionReason: "Unknown hearing date display",
      reviewFocus: "Hearing unknown wording exactness.",
    },
    {
      stratum: "hearing_time",
      sourceKind: "synthetic_controlled",
      fixtureId: "SYN-HEAR-SAME-DAY",
      selectionReason: "Same-day hearing display",
      reviewFocus: "Same-day hearing label exactness.",
    },
    {
      stratum: "hearing_time",
      sourceKind: "synthetic_controlled",
      fixtureId: "SYN-HEAR-PASSED",
      selectionReason: "Passed hearing display",
      reviewFocus: "Passed hearing label exactness.",
    },
    {
      stratum: "copy_export_api",
      sourceKind: "synthetic_controlled",
      fixtureId: "SYN-API-BLOCK-01",
      selectionReason: "Integrity-blocked API body must not be usable content",
      reviewFocus: "API/UI banner and canCopy=false; blocked ≠ repaired.",
    },
    {
      stratum: "copy_export_api",
      sourceKind: "synthetic_controlled",
      fixtureId: "SYN-EXPORT-FAMILY-01",
      selectionReason: "Wrong-family leak blocked on export/copy",
      reviewFocus: "Export/copy gate blocks wrong-family material.",
    },
    {
      stratum: "copy_export_api",
      sourceKind: "synthetic_controlled",
      fixtureId: "SYN-COPY-SAFE-01",
      selectionReason: "Safe line should remain copyable (accepted control)",
      reviewFocus: "Safe wording remains available — check FP over-block.",
    },
    {
      stratum: "offence_family",
      sourceKind: "synthetic_controlled",
      fixtureId: "SYN-FAM-LEAK-01",
      selectionReason: "Harassment matter + defence-force/PWITS leak probe",
      reviewFocus: "Wrong-family material must not remain copyable (FN if it does).",
    },
    {
      stratum: "provenance",
      sourceKind: "synthetic_controlled",
      fixtureId: "SYN-PROV-TITLE-01",
      selectionReason: "Raw extraction / truncated title provenance boundary",
      reviewFocus: "Provenance boundary must refuse unsafe titles.",
    },
  ];
  for (const s of synthetics) add(s);

  if (defs.length < 30 || defs.length > 50) {
    throw new Error(`Gold sample size out of range: ${defs.length} (need 30–50)`);
  }
  return defs;
}

function renderSynthetic(def: SampleDef): { surfaces: RenderedSurface[]; prediction: AutomatedPrediction } {
  const allegation = "Harassment contrary to Protection from Harassment Act";
  const hay = "WhatsApp screenshots MG11 phone extraction subscriber";
  const surfaces: RenderedSurface[] = [];
  let predicted: Classification = "blocked";
  let gateStatus = "integrity_blocked";
  let canCopy: boolean | null = false;
  let fpFn: AutomatedPrediction["predictedFpFnHypothesis"] = "neither";
  let rationale = "";

  const id = def.fixtureId;
  if (id === "SYN-TRUNC-01") {
    const text = "The attribution remains outstan";
    const gated = gateSolicitorOutput({
      surfaceId: "phase11_gold_trunc_copy",
      texts: [text],
      allegation,
      bundleHay: hay,
      mode: "copy",
      data: { texts: [text] },
    });
    surfaces.push({
      surface: "copy_preview",
      label: "Copy preview (solicitor clipboard path)",
      solicitorVisibleText:
        gated.status === "integrity_blocked"
          ? `COPY UNAVAILABLE — ${gated.banner ?? "integrity blocked"}\n(Source fragment was truncated and must not be pasted.)`
          : text,
      gateStatus: gated.status,
      canCopy: gated.canCopy,
    });
    predicted = gated.canCopy ? "unsafe_if_copyable" : "blocked";
    gateStatus = gated.status;
    canCopy = gated.canCopy;
    fpFn = gated.canCopy ? "possible_fn_leak" : "neither";
    rationale = `truncation gate status=${gated.status}; canCopy=${gated.canCopy}`;
  } else if (id === "SYN-TRUNC-TITLE-01") {
    const title = "WhatsApp extract shows defendant said…";
    const trunc = isTruncatedExcerptUsedAsTitle(title);
    const safe = assertSafeEvidenceTitle(title);
    surfaces.push({
      surface: "evidence_title",
      label: "Evidence title (Papers / truth map)",
      solicitorVisibleText: safe.ok && safe.safeTitle
        ? safe.safeTitle
        : "TITLE WITHHELD — truncated/incomplete excerpt cannot be used as an evidence title. Solicitor review required.",
      gateStatus: trunc || !safe.ok ? "blocked_title" : "ok",
      canCopy: false,
    });
    predicted = trunc || !safe.ok ? "blocked" : "accepted";
    gateStatus = trunc || !safe.ok ? "blocked_title" : "ok";
    canCopy = false;
    fpFn = trunc || !safe.ok ? "neither" : "possible_fn_leak";
    rationale = `truncatedTitle=${trunc}; safeOk=${safe.ok}`;
  } else if (id === "SYN-OMIT-01" || id === "SYN-RR-01") {
    const legacy = "|| raw | table | fragment ||";
    const omitted = displayForSafelyOmitted(legacy);
    surfaces.push({
      surface: "overview_field",
      label: "Overview field after safe omit",
      solicitorVisibleText: omitted.display ?? REVIEW_REQUIRED_NEUTRAL,
      gateStatus: omitted.kind,
      canCopy: false,
    });
    surfaces.push({
      surface: "review_required_banner",
      label: "Review-required neutral",
      solicitorVisibleText: REVIEW_REQUIRED_NEUTRAL,
      gateStatus: "review_required",
      canCopy: false,
    });
    predicted = "review_required";
    gateStatus = omitted.kind;
    canCopy = false;
    fpFn = "neither";
    rationale = `omit kind=${omitted.kind}; silentLossPrevented=${omitted.silentLossPrevented}`;
  } else if (id === "SYN-RR-PLACEHOLDER-01") {
    const text = "Please chase {{MISSING_ITEM}} before the hearing.";
    const gated = gateSolicitorOutput({
      surfaceId: "phase11_gold_placeholder_copy",
      texts: [text],
      allegation,
      bundleHay: hay,
      mode: "copy",
      data: { texts: [text] },
    });
    surfaces.push({
      surface: "copy_preview",
      label: "Copy preview",
      solicitorVisibleText:
        gated.status === "integrity_blocked"
          ? `COPY UNAVAILABLE — unresolved placeholder blocked.\nBanner: ${gated.banner ?? "(none)"}`
          : text,
      gateStatus: gated.status,
      canCopy: gated.canCopy,
    });
    predicted = gated.canCopy ? "unsafe_if_copyable" : "blocked";
    gateStatus = gated.status;
    canCopy = gated.canCopy;
    fpFn = gated.canCopy ? "possible_fn_leak" : "neither";
    rationale = `placeholder gate=${gated.status}`;
  } else if (id.startsWith("SYN-HEAR-")) {
    const asOf = new Date("2026-07-21T12:00:00Z");
    const input =
      id === "SYN-HEAR-UNKNOWN"
        ? { asOf }
        : id === "SYN-HEAR-SAME-DAY"
          ? { bundleNextHearingIso: "2026-07-21", asOf }
          : { bundleNextHearingIso: "2026-06-01", asOf };
    const hearing = resolveSolicitorHearingStatus(input);
    const visible = formatHearingStatusForDisplay(hearing);
    surfaces.push({
      surface: "hearing_status_strip",
      label: "Hearing status (Overview / Court Today strip)",
      solicitorVisibleText: visible,
      gateStatus: hearing.kind,
      canCopy: true,
    });
    predicted = hearing.kind === "unknown" ? "uncertain" : "accepted";
    gateStatus = hearing.kind;
    canCopy = true;
    fpFn = "neither";
    rationale = `hearing.kind=${hearing.kind}; label=${visible}`;
  } else if (id === "SYN-API-BLOCK-01") {
    const body = integrityBlockedApiBody("phase11_gold_api", ["sentence.truncated_fragment"]);
    const ui = solicitorUiStateFromApiBody(body);
    surfaces.push({
      surface: "api_consumer_ui",
      label: "API consumer UI state",
      solicitorVisibleText: ui.banner ?? "(no banner)",
      gateStatus: "integrity_blocked",
      canCopy: ui.canCopy,
    });
    surfaces.push({
      surface: "api_usable_check",
      label: "canUseSolicitorApiResponse",
      solicitorVisibleText: canUseSolicitorApiResponse(body)
        ? "USABLE (unexpected)"
        : "NOT USABLE — integrity_blocked payload rejected by consumer",
      gateStatus: "consumer_reject",
      canCopy: false,
    });
    predicted = "blocked";
    gateStatus = "integrity_blocked";
    canCopy = false;
    fpFn = "neither";
    rationale = `usable=${canUseSolicitorApiResponse(body)}; ui.canCopy=${ui.canCopy}`;
  } else if (id === "SYN-EXPORT-FAMILY-01" || id === "SYN-FAM-LEAK-01") {
    const text = "Consider defensive force and PWITS continuity on this harassment matter.";
    const gated = gateSolicitorOutput({
      surfaceId: "phase11_gold_family_export",
      texts: [text],
      allegation,
      bundleHay: hay,
      auditFamily: "harassment_digital",
      mode: "export",
      data: { texts: [text] },
    });
    surfaces.push({
      surface: "export_preview",
      label: "Export preview",
      solicitorVisibleText:
        gated.status === "integrity_blocked" || !gated.canCopy
          ? `EXPORT BLOCKED — ${gated.banner ?? "integrity check failed"}\n(Wrong-family / unsupported material must not leave the system.)`
          : text,
      gateStatus: gated.status,
      canCopy: gated.canCopy,
    });
    predicted = gated.canCopy ? "unsafe_if_copyable" : "blocked";
    gateStatus = gated.status;
    canCopy = gated.canCopy;
    fpFn = gated.canCopy ? "possible_fn_leak" : "neither";
    rationale = `family export gate=${gated.status}; canCopy=${gated.canCopy}`;
  } else if (id === "SYN-COPY-SAFE-01") {
    const text = "Attribution remains outstanding on the served screenshots.";
    const gated = gateSolicitorOutput({
      surfaceId: "phase11_gold_safe_copy",
      texts: [text],
      allegation,
      bundleHay: hay,
      auditFamily: "harassment_digital",
      mode: "copy",
      data: { texts: [text] },
    });
    surfaces.push({
      surface: "copy_preview",
      label: "Copy preview (safe control)",
      solicitorVisibleText: gated.canCopy
        ? text
        : `COPY UNAVAILABLE — ${gated.banner ?? "blocked"}\n(If blocked, human must judge possible FP over-block.)`,
      gateStatus: gated.status,
      canCopy: gated.canCopy,
    });
    predicted = gated.canCopy ? "accepted" : "blocked";
    gateStatus = gated.status;
    canCopy = gated.canCopy;
    fpFn = gated.canCopy ? "neither" : "possible_fp_overblock";
    rationale = `safe line gate=${gated.status}; canCopy=${gated.canCopy}`;
  } else if (id === "SYN-PROV-TITLE-01") {
    const title = "MG11 extract: \"I saw him\"…";
    const trunc = isTruncatedExcerptUsedAsTitle(title);
    const safe = assertSafeEvidenceTitle(title);
    surfaces.push({
      surface: "evidence_title",
      label: "Evidence title",
      solicitorVisibleText: safe.ok && safe.safeTitle
        ? safe.safeTitle
        : "TITLE WITHHELD — incomplete quotation / provenance unsafe for title use.",
      gateStatus: trunc || !safe.ok ? "blocked_title" : "ok",
      canCopy: false,
    });
    predicted = trunc || !safe.ok ? "blocked" : "accepted";
    gateStatus = trunc || !safe.ok ? "blocked_title" : "ok";
    canCopy = false;
    fpFn = "neither";
    rationale = `prov title trunc=${trunc}; safeOk=${safe.ok}`;
  } else {
    throw new Error(`Unknown synthetic id ${id}`);
  }

  const evidenceReference = `artifacts/casebrain-qa/integrity-programme/phase-11/rendered/${def.goldId}.md`;
  return {
    surfaces,
    prediction: {
      goldId: def.goldId,
      predictedClassification: predicted,
      predictedGateStatus: gateStatus,
      predictedCanCopy: canCopy,
      predictedFpFnHypothesis: fpFn,
      predictedSubstantiveWording: predicted === "blocked" || predicted === "review_required" ? "blocked_not_repaired" : "not_assessed_by_automation",
      rationale,
      evidenceReference,
    },
  };
}

function renderGoldManual(def: SampleDef): { surfaces: RenderedSurface[]; prediction: AutomatedPrediction } {
  const goldId = def.fixtureId.split(":")[0]!;
  const summaryPath = path.join(GOLD_PACK, "cases", goldId, "actual-summary.json");
  const summary = readJson<{
    allegation?: string;
    clientLabel?: string;
    courtLine?: string;
    clientSummaryPreview?: string;
    cpsChase?: Array<{ label: string; draft: string }>;
    truthMapRows?: Array<{ label: string; existence: string }>;
    doNotOverstate?: string[];
  }>(summaryPath);

  const surfaces: RenderedSurface[] = [];
  if (!summary) {
    surfaces.push({
      surface: "missing_packet",
      label: "Gold packet",
      solicitorVisibleText: `Gold packet missing at ${summaryPath}`,
      gateStatus: "missing",
      canCopy: false,
    });
    return {
      surfaces,
      prediction: {
        goldId: def.goldId,
        predictedClassification: "uncertain",
        predictedGateStatus: "missing_packet",
        predictedCanCopy: false,
        predictedFpFnHypothesis: "uncertain",
        predictedSubstantiveWording: "not_assessed_by_automation",
        rationale: "actual-summary.json missing",
        evidenceReference: `artifacts/casebrain-qa/integrity-programme/phase-11/rendered/${def.goldId}.md`,
      },
    };
  }

  surfaces.push({
    surface: "case_header",
    label: "Case header (solicitor view)",
    solicitorVisibleText: `Client: ${summary.clientLabel ?? "(unlabelled)"}\nAllegation: ${summary.allegation ?? "(none)"}`,
    gateStatus: "display",
    canCopy: true,
  });

  if (summary.courtLine) {
    const gated = gateSolicitorOutput({
      surfaceId: "phase11_gold_court_line",
      texts: [summary.courtLine],
      allegation: summary.allegation ?? "",
      bundleHay: JSON.stringify(summary.truthMapRows ?? []).slice(0, 400),
      mode: "copy",
      data: { texts: [summary.courtLine] },
    });
    surfaces.push({
      surface: "court_line",
      label: "Court line (copy preview)",
      solicitorVisibleText: gated.canCopy
        ? summary.courtLine
        : `COPY UNAVAILABLE — ${gated.banner ?? "integrity blocked"}\nUnderlying court line was gated (blocked ≠ repaired):\n${summary.courtLine}`,
      gateStatus: gated.status,
      canCopy: gated.canCopy,
    });
  }

  if (summary.clientSummaryPreview) {
    surfaces.push({
      surface: "client_summary",
      label: "Client-safe summary preview",
      solicitorVisibleText: summary.clientSummaryPreview,
      gateStatus: "display",
      canCopy: true,
    });
  }

  for (const chase of (summary.cpsChase ?? []).slice(0, 4)) {
    surfaces.push({
      surface: "cps_chase_draft",
      label: `CPS chase — ${chase.label}`,
      solicitorVisibleText: chase.draft,
      gateStatus: "display",
      canCopy: true,
    });
  }

  if (summary.truthMapRows?.length) {
    const lines = summary.truthMapRows
      .slice(0, 12)
      .map((r) => `• ${r.label} — ${r.existence}`)
      .join("\n");
    surfaces.push({
      surface: "truth_map",
      label: "Evidence truth map (Overview)",
      solicitorVisibleText: lines,
      gateStatus: "display",
      canCopy: true,
    });
  }

  if (summary.doNotOverstate?.length) {
    surfaces.push({
      surface: "do_not_overstate",
      label: "Do-not-overstate warnings",
      solicitorVisibleText: summary.doNotOverstate.map((x) => `• ${x}`).join("\n"),
      gateStatus: "warning",
      canCopy: false,
    });
  }

  const anyBlocked = surfaces.some((s) => s.canCopy === false && s.gateStatus.includes("integrity"));
  return {
    surfaces,
    prediction: {
      goldId: def.goldId,
      predictedClassification: anyBlocked ? "blocked" : "accepted",
      predictedGateStatus: anyBlocked ? "mixed_blocked" : "display_ok",
      predictedCanCopy: !anyBlocked,
      predictedFpFnHypothesis: "uncertain",
      predictedSubstantiveWording: "not_assessed_by_automation",
      rationale: "Gold-manual actual-summary rendered for word-for-word human review; automation does not certify wording.",
      evidenceReference: `artifacts/casebrain-qa/integrity-programme/phase-11/rendered/${def.goldId}.md`,
    },
  };
}

function renderEsaOrPhase9(def: SampleDef): { surfaces: RenderedSurface[]; prediction: AutomatedPrediction } {
  const caseId = def.fixtureId.includes(":") ? def.fixtureId.split(":")[1]! : def.fixtureId;
  const truth = readJson<Record<string, unknown>>(path.join(ESA, caseId, "truth-key.json")) ?? {};
  const output = readJson<Record<string, unknown>>(path.join(ESA, caseId, "casebrain-output.json"));
  const surfaces: RenderedSurface[] = [];

  const auditFamily = String(truth.family ?? truth.scenarioFamily ?? truth.offenceFamily ?? "unknown");
  const family = mapAuditToSolicitor(auditFamily);
  const allegation = String(truth.allegation ?? truth.charge ?? truth.title ?? caseId);
  const evidenceRows = evidenceRowsFromTruth(truth);
  const chaseItems = chaseItemsFromTruth(truth);
  const strings: string[] = [];
  walkStrings(output ?? truth, strings);
  const hay = strings.slice(0, 20).join("\n").slice(0, 2000);

  const hearing = resolveSolicitorHearingStatus({
    bundleNextHearingIso: (truth.nextHearingIso as string) ?? (truth.hearingDateIso as string) ?? null,
    nextHearingRaw: (truth.nextHearing as string) ?? null,
    bundleHay: hay,
    asOf: new Date("2026-07-21T12:00:00Z"),
  });

  const canonical = buildCanonicalMatterStateV1({
    caseId,
    allegation,
    bundleHay: hay,
    evidenceRows,
    chaseItems: chaseItems.map((c) => ({ label: c.label, baseStatus: "Outstanding" })),
    hearing: {
      bundleNextHearingIso: (truth.nextHearingIso as string) ?? (truth.hearingDateIso as string) ?? null,
      nextHearingRaw: (truth.nextHearing as string) ?? null,
      asOf: new Date("2026-07-21T12:00:00Z"),
    },
  });

  const overview = countEvidenceStatesForDisplay(evidenceRows);
  surfaces.push({
    surface: "overview_counts",
    label: "Overview evidence counts",
    solicitorVisibleText: `Served ${overview.served} · Referred ${overview.referred} · Missing ${overview.missing} · Incomplete ${overview.incomplete} · Not safely confirmed ${overview.notSafelyConfirmed}`,
    gateStatus: "display",
    canCopy: true,
  });

  surfaces.push({
    surface: "hearing_status_strip",
    label: "Hearing status",
    solicitorVisibleText: formatHearingStatusForDisplay(hearing),
    gateStatus: hearing.kind,
    canCopy: true,
  });

  surfaces.push({
    surface: "offence_family",
    label: "Offence-family resolution",
    solicitorVisibleText: `Resolved family: ${family}\nAudit family seed: ${auditFamily}`,
    gateStatus: family === "unknown" ? "uncertain" : "resolved",
    canCopy: true,
  });

  const chaseBrief = buildDisclosureChaseBrief({
    caseId,
    caseTitle: String(truth.title ?? caseId),
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
      .map((r) => ({ label: r.label, status: String(r.existence) })),
    proceduralOutstanding: chaseItems.map((c) => c.label),
    bundleText: hay,
  });

  const chaseLines = chaseBrief.items.slice(0, 8).map((it) => `• ${it.label}`).join("\n") || "(no chase items)";
  surfaces.push({
    surface: "chase_brief",
    label: "Disclosure chase brief (solicitor list)",
    solicitorVisibleText: `Total ${chaseBrief.counters.total}\n${chaseLines}`,
    gateStatus: "display",
    canCopy: true,
  });

  let containmentBlocks = 0;
  let copyableUnsafe = 0;
  const sampleTexts = strings.filter((t) => t.length >= 24).slice(0, 6);
  if (sampleTexts.length === 0) sampleTexts.push("Attribution remains outstanding on the served screenshots.");

  for (const t of sampleTexts) {
    const sentence = assessSolicitorSentence(t);
    const gated = gateSolicitorOutput({
      surfaceId: "phase11_gold_case_copy",
      texts: [t],
      allegation,
      bundleHay: hay,
      auditFamily,
      mode: "copy",
      data: { texts: [t] },
    });
    if (gated.status === "integrity_blocked" || !gated.canCopy) containmentBlocks += 1;
    const risky =
      sentence.issues.includes("truncated_fragment") ||
      sentence.issues.includes("raw_extraction_marker") ||
      sentence.issues.includes("unresolved_placeholder");
    if (risky && gated.canCopy) copyableUnsafe += 1;
    surfaces.push({
      surface: "copy_preview",
      label: "Copy preview (sample line)",
      solicitorVisibleText: gated.canCopy
        ? t
        : `COPY UNAVAILABLE — ${gated.banner ?? "integrity blocked"}\nBlocked source (not repaired):\n${t.slice(0, 280)}${t.length > 280 ? "…" : ""}`,
      gateStatus: gated.status,
      canCopy: gated.canCopy,
    });
  }

  const leakProbe = "Consider defensive force and PWITS continuity.";
  const classif = classifyTextsAgainstConceptRegistry(
    [allegation, hay, ...sampleTexts.slice(0, 3)],
    {
      allegation,
      bundleHay: hay,
      auditFamily,
      evidence: evidenceRows.map((r) => ({
        evidenceId: r.label,
        label: r.label,
        existence: String(r.existence),
      })),
    },
  );
  const leakGate = gateSolicitorOutput({
    surfaceId: "phase11_gold_leak_probe",
    texts: [leakProbe],
    allegation,
    bundleHay: hay,
    auditFamily,
    mode: "copy",
    data: { texts: [leakProbe] },
  });
  surfaces.push({
    surface: "family_leak_probe",
    label: "Cross-family leak probe (copy)",
    solicitorVisibleText: leakGate.canCopy
      ? leakProbe
      : `COPY UNAVAILABLE — family containment blocked probe.\nBanner: ${leakGate.banner ?? "(none)"}`,
    gateStatus: leakGate.status,
    canCopy: leakGate.canCopy,
  });

  const centralSample = sampleTexts[0]!;
  const v = validateSolicitorSurface({
    surfaceId: phase2CentralSurfaceIds()[0]!,
    texts: [centralSample],
    allegation,
    bundleHay: hay,
    auditFamily,
    mode: "view",
    data: { texts: [centralSample] },
    canonicalFingerprint: canonical.fingerprint,
    expectedCanonicalFingerprint: canonical.fingerprint,
  });
  surfaces.push({
    surface: "central_surface_sample",
    label: `Central surface sample (${phase2CentralSurfaceIds()[0]})`,
    solicitorVisibleText:
      v.status === "ok"
        ? centralSample
        : `SURFACE NOT COPYABLE — status=${v.status}; rules=${(v.ruleIds ?? []).join(",") || "(none)"}`,
    gateStatus: v.status,
    canCopy: v.status === "ok",
  });

  let predicted: Classification = "accepted";
  let fpFn: AutomatedPrediction["predictedFpFnHypothesis"] = "neither";
  if (copyableUnsafe > 0 || leakGate.canCopy) {
    predicted = "unsafe_if_copyable";
    fpFn = "possible_fn_leak";
  } else if (family === "unknown") {
    predicted = "uncertain";
    fpFn = def.stratum === "blocked_containment" ? "possible_fp_overblock" : "uncertain";
  } else if (containmentBlocks >= 2 || def.stratum === "blocked_containment") {
    predicted = "blocked";
    fpFn = "possible_fp_overblock";
  }

  return {
    surfaces,
    prediction: {
      goldId: def.goldId,
      predictedClassification: predicted,
      predictedGateStatus: `containmentBlocks=${containmentBlocks};copyableUnsafe=${copyableUnsafe};family=${family};classifUnsupported=${classif.unsupportedBlocked.length}`,
      predictedCanCopy: copyableUnsafe === 0 && leakGate.canCopy === false ? true : false,
      predictedFpFnHypothesis: fpFn,
      predictedSubstantiveWording:
        predicted === "blocked" ? "blocked_not_repaired" : "not_assessed_by_automation",
      rationale: `ESA/phase9 render for ${caseId}; outputPresent=${Boolean(output)}; schema=${canonical.schemaVersion}`,
      evidenceReference: `artifacts/casebrain-qa/integrity-programme/phase-11/rendered/${def.goldId}.md`,
    },
  };
}

function writeRenderMarkdown(def: SampleDef, surfaces: RenderedSurface[]) {
  const lines = [
    `# ${def.goldId} — solicitor-visible render`,
    "",
    `**Stratum:** ${def.stratum}`,
    `**Fixture:** ${def.fixtureId}`,
    `**Source kind:** ${def.sourceKind}`,
    `**Selection reason:** ${def.selectionReason}`,
    `**Review focus:** ${def.reviewFocus}`,
    "",
    "> This file shows text a solicitor would see (or an explicit COPY/EXPORT UNAVAILABLE banner).",
    "> Blocked output is containment — **not** substantive repair.",
    "> Human judgments belong in `human-judgment-workbook.json` only.",
    "",
  ];
  for (const s of surfaces) {
    lines.push(`## ${s.label}`);
    lines.push("");
    lines.push(`- Surface id: \`${s.surface}\``);
    lines.push(`- Gate status: \`${s.gateStatus}\``);
    lines.push(`- canCopy: \`${s.canCopy}\``);
    lines.push("");
    lines.push("```text");
    lines.push(s.solicitorVisibleText);
    lines.push("```");
    lines.push("");
  }
  fs.writeFileSync(path.join(RENDER_DIR, `${def.goldId}.md`), lines.join("\n"), "utf8");
  fs.writeFileSync(
    path.join(RENDER_DIR, `${def.goldId}.json`),
    JSON.stringify({ goldId: def.goldId, def, surfaces }, null, 2),
    "utf8",
  );
}

function main() {
  ensureDir(OUT);
  ensureDir(RENDER_DIR);
  ensureDir(DOCS);

  const frozenAt = new Date().toISOString();
  const sampleDefs = freezeSampleDefs();
  const selectionMethod = {
    version: "phase11-gold-sample-v1",
    frozenAt,
    targetSize: "30–50",
    actualSize: sampleDefs.length,
    method: [
      "Seed from Phase 9 human-fp-fn-corpus-pack strata (clean_pass, possible_fp_overblock, uncertain_family).",
      "Add gold-manual-proof-set-v1 CASE packets with solicitor-facing actual-summary renders.",
      "Add controlled synthetic renders for omission/truncation, review-required, hearing/time, copy/export/API, offence-family leak, provenance.",
      "Freeze sample definition (ids+strata+reasons) with content hash BEFORE writing human judgment slots.",
      "Automated predictions written to a separate artefact; human workbook starts empty (null judgments).",
    ],
    strataTargets: [
      "accepted_clean",
      "blocked_containment",
      "review_required",
      "uncertain_family",
      "offence_family",
      "provenance",
      "omission_truncation",
      "hearing_time",
      "copy_export_api",
      "composed_prose",
    ],
  };

  const freezePayload = {
    selectionMethod,
    samples: sampleDefs,
  };
  const freezeHash = sha256(JSON.stringify(freezePayload));
  const frozenSample = {
    ...freezePayload,
    freezeHash,
    frozen: true as const,
    disclaimer:
      "Sample frozen prior to human judgments. Do not alter membership without a new freeze version.",
  };
  fs.writeFileSync(path.join(OUT, "gold-sample-frozen.json"), JSON.stringify(frozenSample, null, 2), "utf8");

  const predictions: AutomatedPrediction[] = [];
  const humanSlots: HumanJudgmentSlot[] = [];
  const coverageRows: Array<{
    goldId: string;
    stratum: string;
    surfacesRendered: number;
    renderPath: string;
  }> = [];

  for (const def of sampleDefs) {
    const rendered =
      def.sourceKind === "synthetic_controlled"
        ? renderSynthetic(def)
        : def.sourceKind === "gold_manual_pack"
          ? renderGoldManual(def)
          : renderEsaOrPhase9(def);
    writeRenderMarkdown(def, rendered.surfaces);
    predictions.push(rendered.prediction);
    humanSlots.push({
      goldId: def.goldId,
      expectedClassification: null,
      actualClassification: null,
      falsePositive: null,
      falseNegative: null,
      substantiveWordingJudgment: null,
      reviewerDecision: null,
      rationale: null,
      evidenceReference: rendered.prediction.evidenceReference,
      reviewerIdentity: null,
      reviewerRole: null,
      reviewDate: null,
      disagreement: null,
      adjudication: null,
      unresolved: true,
      notes: null,
    });
    coverageRows.push({
      goldId: def.goldId,
      stratum: def.stratum,
      surfacesRendered: rendered.surfaces.length,
      renderPath: `rendered/${def.goldId}.md`,
    });
  }

  fs.writeFileSync(path.join(OUT, "automated-predictions.json"), JSON.stringify({
    generatedAt: frozenAt,
    freezeHash,
    separationRule: "AUTOMATED ONLY — must not be treated as human/solicitor sign-off",
    predictions,
  }, null, 2), "utf8");

  const humanWorkbook = {
    generatedAt: frozenAt,
    freezeHash,
    status: "AWAITING_HUMAN_GOLD_REVIEW" as const,
    instructions: [
      "Qualified human / solicitor reviewer only — Cursor, another AI, or the developer alone must not complete sign-off fields as independent review.",
      "For each goldId, open the rendered/*.md evidence and record expectedClassification, actualClassification, FP/FN flags, substantive wording judgment, decision, rationale.",
      "Blocked output must not be marked as repaired or substantively correct solely because it was blocked.",
      "Record reviewerIdentity, reviewerRole, reviewDate. Record disagreements, adjudication, exclusions, unresolved.",
      "Any safety-relevant false negative remains a Phase 11 / programme blocker until repaired and independently re-reviewed.",
    ],
    reviewerRoster: {
      requiredRole: "independent qualified human / solicitor (or designated gold reviewer)",
      completedBy: null,
      reviewDate: null,
      disagreements: [],
      adjudications: [],
      exclusions: [],
      unresolvedGoldIds: humanSlots.map((h) => h.goldId),
    },
    judgments: humanSlots,
  };
  fs.writeFileSync(path.join(OUT, "human-judgment-workbook.json"), JSON.stringify(humanWorkbook, null, 2), "utf8");

  const stratumCounts: Record<string, number> = {};
  for (const s of sampleDefs) stratumCounts[s.stratum] = (stratumCounts[s.stratum] ?? 0) + 1;

  const humanReviewed = humanSlots.filter((h) => h.reviewerDecision != null).length;
  const fpCount = humanSlots.filter((h) => h.falsePositive === true).length;
  const fnCount = humanSlots.filter((h) => h.falseNegative === true).length;
  const safetyFn = humanSlots.filter((h) => h.falseNegative === true).length; // human-only; currently 0 reviewed

  const renderedCoverage = {
    generatedAt: frozenAt,
    freezeHash,
    mode: "solicitor_visible_text_render",
    note: [
      "Renders exact solicitor-visible text / banners for the frozen gold sample via production builders and gates.",
      "Full Playwright ≥100 stratified browser walkthrough is NOT claimed complete in this checkpoint;",
      "browser walkthrough remains a residual Phase 11 / programme item if required by the authoritative brief beyond gold renders.",
    ],
    goldSampleSize: sampleDefs.length,
    casesRendered: coverageRows.length,
    totalSurfacesRendered: coverageRows.reduce((a, r) => a + r.surfacesRendered, 0),
    rows: coverageRows,
  };
  fs.writeFileSync(path.join(OUT, "rendered-coverage-report.json"), JSON.stringify(renderedCoverage, null, 2), "utf8");

  const ledger = readJson<{
    status: string;
    prior72RawMarkerMap: { balanced: boolean };
    prior28TruncMap: { balanced: boolean };
    current42RawSources: { count: number };
    current55TruncSources: { count: number };
  }>(path.join(ROOT, "artifacts/casebrain-qa/integrity-programme/phase-6/occurrence-ledger-balanced.json"));

  const contracts = [
    {
      name: "schema_1_1_0_preserved",
      pass: CANONICAL_MATTER_STATE_VERSION === "1.1.0",
      detail: CANONICAL_MATTER_STATE_VERSION,
    },
    {
      name: "central_surfaces_31",
      pass: phase2CentralSurfaceIds().length === 31,
      detail: `central=${phase2CentralSurfaceIds().length}`,
    },
    {
      name: "phase6_ledger_untouched",
      pass:
        ledger?.status === "LEDGER_BALANCED" &&
        ledger.prior72RawMarkerMap.balanced === true &&
        ledger.prior28TruncMap.balanced === true &&
        ledger.current42RawSources.count === 42 &&
        ledger.current55TruncSources.count === 55,
      detail: `status=${ledger?.status};42=${ledger?.current42RawSources.count};55=${ledger?.current55TruncSources.count}`,
    },
    {
      name: "gold_sample_frozen_30_50",
      pass: sampleDefs.length >= 30 && sampleDefs.length <= 50 && Boolean(freezeHash),
      detail: `n=${sampleDefs.length};hash=${freezeHash.slice(0, 12)}`,
    },
    {
      name: "all_strata_represented",
      pass: selectionMethod.strataTargets.every((s) => (stratumCounts[s] ?? 0) > 0),
      detail: JSON.stringify(stratumCounts),
    },
    {
      name: "renders_exist_for_every_sample",
      pass: sampleDefs.every((d) => fs.existsSync(path.join(RENDER_DIR, `${d.goldId}.md`))),
      detail: `rendered=${coverageRows.length}`,
    },
    {
      name: "automated_predictions_separated",
      pass: fs.existsSync(path.join(OUT, "automated-predictions.json")),
      detail: "automated-predictions.json present; human workbook separate",
    },
    {
      name: "human_workbook_awaiting_signoff",
      pass:
        humanWorkbook.status === "AWAITING_HUMAN_GOLD_REVIEW" &&
        humanReviewed === 0 &&
        humanWorkbook.reviewerRoster.completedBy == null,
      detail: `humanReviewed=${humanReviewed};status=${humanWorkbook.status}`,
    },
    {
      name: "no_fabricated_human_signoff",
      pass: humanSlots.every(
        (h) =>
          h.reviewerIdentity == null &&
          h.reviewerDecision == null &&
          h.expectedClassification == null &&
          h.actualClassification == null,
      ),
      detail: "all human judgment fields null",
    },
    {
      name: "blocked_not_equated_to_repaired_in_automation",
      pass: predictions.every(
        (p) =>
          p.predictedSubstantiveWording === "not_assessed_by_automation" ||
          p.predictedSubstantiveWording === "blocked_not_repaired",
      ),
      detail: "automation never claims blocked==repaired",
    },
  ];

  const contractPass = contracts.every((c) => c.pass);

  const fpFnReport = {
    status: "AWAITING_HUMAN_GOLD_REVIEW",
    denominators: {
      frozenSampleSize: sampleDefs.length,
      humanReviewedCount: humanReviewed,
      humanUnresolvedCount: sampleDefs.length - humanReviewed,
    },
    humanCounts: {
      falsePositives: fpCount,
      falseNegatives: fnCount,
      safetyRelevantFalseNegatives: safetyFn,
    },
    humanRates: {
      fpRate: humanReviewed === 0 ? null : fpCount / humanReviewed,
      fnRate: humanReviewed === 0 ? null : fnCount / humanReviewed,
      note: "Rates undefined until qualified human review completes (denominator = humanReviewedCount).",
    },
    automatedHypothesesOnly: {
      note: "Not human FP/FN. Do not treat as sign-off.",
      possible_fp_overblock: predictions.filter((p) => p.predictedFpFnHypothesis === "possible_fp_overblock").length,
      possible_fn_leak: predictions.filter((p) => p.predictedFpFnHypothesis === "possible_fn_leak").length,
      neither: predictions.filter((p) => p.predictedFpFnHypothesis === "neither").length,
      uncertain: predictions.filter((p) => p.predictedFpFnHypothesis === "uncertain").length,
    },
    confidenceLimitations: [
      "No qualified human/solicitor gold judgments recorded in this checkpoint.",
      "Automated predictions are hypotheses for reviewer assistance only.",
      "Blocked ≠ repaired remains in force.",
      "Full ≥100 browser walkthrough not claimed here.",
    ],
    programmePassSupported: false,
    blocker: "AWAITING_HUMAN_GOLD_REVIEW — safety-relevant FN cannot be cleared without independent review",
  };
  fs.writeFileSync(path.join(OUT, "fp-fn-report.json"), JSON.stringify(fpFnReport, null, 2), "utf8");

  const report = {
    programme: "criminal-defence-integrity-corpus",
    phase: 11,
    generatedAt: frozenAt,
    status: "AWAITING_HUMAN_GOLD_REVIEW",
    disclaimer:
      "Phase 11 freeze + solicitor-visible renders + empty human workbook. Not corpus PASS. Not programme PASS. No fabricated human sign-off. Blocked ≠ repaired.",
    canonicalSchemaVersion: CANONICAL_MATTER_STATE_VERSION,
    freezeHash,
    sampleSize: sampleDefs.length,
    stratumCounts,
    contracts,
    contractPass,
    renderedCoverage: {
      casesRendered: renderedCoverage.casesRendered,
      totalSurfacesRendered: renderedCoverage.totalSurfacesRendered,
    },
    fpFnReport,
    ledgerImpact: {
      impact: "none",
      phase6Status: ledger?.status ?? null,
      prior72_28_unit: "copyable_exportable_rule_firing_occurrence",
      current42_55_unit: "per_string_copyable_hit",
      doNotMix: true,
      preserved: {
        prior72RawBalanced: ledger?.prior72RawMarkerMap.balanced ?? null,
        prior28TruncBalanced: ledger?.prior28TruncMap.balanced ?? null,
        current42Raw: ledger?.current42RawSources.count ?? null,
        current55Trunc: ledger?.current55TruncSources.count ?? null,
      },
    },
    remainingRisks: [
      "Qualified human gold review not yet performed — FP/FN rates unavailable",
      "Any safety-relevant FN found later blocks programme PASS until repaired + independently re-reviewed",
      "≥100 stratified browser walkthrough not claimed complete",
      "Scale lane still lacks full on-disk solicitor models for all 3000 identities (Phase 9 residual)",
      "Registered PRE-TS-* / PRE-VITEST-COPY remediation items remain",
    ],
    programmePassSupported: false,
  };
  fs.writeFileSync(path.join(OUT, "phase11-rendered-gold-report.json"), JSON.stringify(report, null, 2), "utf8");

  const checkpoint = `# Phase 11 checkpoint — rendered coverage & gold human FP–FN review

**Status:** **AWAITING_HUMAN_GOLD_REVIEW** — freeze + solicitor-visible renders complete — **not a corpus PASS** — **not a programme PASS**  
**Canonical schema:** 1.1.0  
**Branch:** programme/criminal-defence-integrity-corpus  
**PR:** #65 (do not merge / do not deploy)  
**Freeze hash:** \`${freezeHash}\`

## Explicit wording

- Sample membership was **frozen and versioned before** any human judgments.
- Automated predictions are **separate** from human judgments and are **not** solicitor sign-off.
- Cursor / AI / developer alone **must not** impersonate independent qualified human review.
- **Blocked ≠ repaired** — containment is not substantive wording correctness.
- Programme PASS is **not supported** until qualified human gold review completes and any safety-relevant FN is cleared under independent re-review + separate authorization.

## Frozen sample

| Metric | Value |
|--------|------:|
| Sample size | ${sampleDefs.length} |
| Size band | 30–50 |
| Freeze version | phase11-gold-sample-v1 |
| Freeze hash | \`${freezeHash.slice(0, 24)}…\` |

### Selection method

${selectionMethod.method.map((m) => `- ${m}`).join("\n")}

### Stratum counts

| Stratum | n |
|---------|--:|
${Object.entries(stratumCounts)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([k, v]) => `| ${k} | ${v} |`)
  .join("\n")}

## Rendered evidence

| Metric | Value |
|--------|------:|
| Cases rendered | ${renderedCoverage.casesRendered} |
| Surfaces rendered | ${renderedCoverage.totalSurfacesRendered} |
| Render dir | \`artifacts/.../phase-11/rendered/\` |
| Browser ≥100 walkthrough claimed | **no** |

## Human-review completion status

| Item | Status |
|------|--------|
| Workbook | \`human-judgment-workbook.json\` |
| Human judgments recorded | **0 / ${sampleDefs.length}** |
| Reviewer identity / role / date | **null** (awaiting) |
| Disagreements / adjudications / exclusions | none recorded |
| Unresolved | all ${sampleDefs.length} gold ids |
| Sign-off | **AWAITING_HUMAN_GOLD_REVIEW** |

## FP / FN results

| Metric | Value | Denominator |
|--------|------:|-------------|
| Human FP count | ${fpCount} | humanReviewed=${humanReviewed} |
| Human FN count | ${fnCount} | humanReviewed=${humanReviewed} |
| Human FP rate | n/a (no human reviews) | — |
| Human FN rate | n/a (no human reviews) | — |
| Safety-relevant FN | ${safetyFn} (none human-confirmed; gate open until review) | — |

Automated hypotheses only (not sign-off): FP-overblock=${fpFnReport.automatedHypothesesOnly.possible_fp_overblock}; FN-leak=${fpFnReport.automatedHypothesesOnly.possible_fn_leak}; neither=${fpFnReport.automatedHypothesesOnly.neither}; uncertain=${fpFnReport.automatedHypothesesOnly.uncertain}.

### Confidence limitations

${fpFnReport.confidenceLimitations.map((c) => `- ${c}`).join("\n")}

## Contracts

| Check | Result |
|-------|--------|
${contracts.map((c) => `| ${c.name} | ${c.pass ? "PASS" : "FAIL"} — ${c.detail} |`).join("\n")}

All Phase 11 freeze/render contracts pass: **${contractPass}**  
Human gold review complete: **false**  
Programme PASS supported: **false**

## Ledger impact

| Metric | Value |
|--------|-------|
| Phase 6 status | ${ledger?.status ?? "missing"} |
| 72/28 balanced | ${ledger?.prior72RawMarkerMap.balanced}/${ledger?.prior28TruncMap.balanced} (rule-firing units) |
| 42/55 counts | ${ledger?.current42RawSources.count}/${ledger?.current55TruncSources.count} (per-string units) |
| Phase 11 impact | **none** |

## Remaining risks

${report.remainingRisks.map((r) => `- ${r}`).join("\n")}

## Programme PASS

**Not supported.** Requires completed independent gold review, FP/FN disposition (especially safety-relevant FN), and separate review/authorization. Do not merge or deploy on this checkpoint alone.

## Explicit non-goals

No merge. No deploy. No fabricated human sign-off. No programme PASS. Stop here for human gold review.

Artefacts:
- \`artifacts/casebrain-qa/integrity-programme/phase-11/gold-sample-frozen.json\`
- \`artifacts/casebrain-qa/integrity-programme/phase-11/rendered/\`
- \`artifacts/casebrain-qa/integrity-programme/phase-11/automated-predictions.json\`
- \`artifacts/casebrain-qa/integrity-programme/phase-11/human-judgment-workbook.json\`
- \`artifacts/casebrain-qa/integrity-programme/phase-11/fp-fn-report.json\`
- \`artifacts/casebrain-qa/integrity-programme/phase-11/phase11-rendered-gold-report.json\`
`;

  fs.writeFileSync(path.join(DOCS, "phase-11-checkpoint.md"), checkpoint, "utf8");
  fs.writeFileSync(path.join(OUT, "PHASE-11-CHECKPOINT.md"), checkpoint, "utf8");

  console.log(
    JSON.stringify(
      {
        ok: contractPass,
        status: "AWAITING_HUMAN_GOLD_REVIEW",
        sampleSize: sampleDefs.length,
        freezeHash: freezeHash.slice(0, 16),
        humanReviewed,
        programmePassSupported: false,
        ledgerImpact: "none",
        out: OUT,
      },
      null,
      2,
    ),
  );

  if (!contractPass) process.exitCode = 1;
}

main();
