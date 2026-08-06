/**
 * Scale-3000 solicitor-visible materialisation lane.
 *
 * Materialises complete solicitor-facing wording for all 3000 approved messy-pdf
 * v9 scale identities. Writes only under
 * artifacts/casebrain-qa/integrity-programme/scale3000-solicitor-materialisation/run-vN/
 * (never Phase 11). Lane stays separate from the 530 ESA materialised denominator.
 * run-v1 is immutable evidence; this script writes run-v2 (or --out-run=).
 *
 *   npx tsx scripts/integrity-programme/scale3000-solicitor-materialisation.ts
 *   npx tsx scripts/integrity-programme/scale3000-solicitor-materialisation.ts --limit=20
 *   npx tsx scripts/integrity-programme/scale3000-solicitor-materialisation.ts --resume
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { buildDisclosureChaseBrief } from "@/components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { CANONICAL_MATTER_STATE_VERSION } from "@/lib/criminal/canonical-matter-state";
import {
  composeCompleteClientSummaryFromStructured,
  wrapClientSummaryBody,
} from "@/lib/criminal/client-safe-summary-compose";
import { solicitorVisibleEvidenceTitle } from "@/lib/criminal/extraction-provenance-boundary";
import type { FiveAnswersEvidenceRow } from "@/lib/criminal/five-answers/types";
import { buildSolicitorVisibleEvidenceView, parseOverviewCountsLine, parseTruthMapCanonicalStates, countOverviewCategoriesFromDisplayItems, assertCountsEqual } from "@/lib/criminal/solicitor-visible-evidence-view";
import { assessOffenceLabelWording } from "@/lib/criminal/offence-label-registry";
import {
  buildSolicitorChargeModel,
  containsSolicitorForbiddenInternalLanguage,
  isDetachedDisputedChargeCopy,
} from "@/lib/criminal/solicitor-charge-model";
import {
  assessChaseLabelFamilyCompatibility,
  assessFamilyEvidenceCompatibility,
  assessProvenanceCoherence,
  buildFamilyCompatibilityProtectedMetadata,
  classifyMatterFamily,
  containsDrinkDriveDeviceWording,
  describeFamilyCompatibilityForSolicitor,
  partitionEvidenceForSolicitorDisplay,
  scanSolicitorVisibleInternalLanguageBoundary,
  solicitorVisibleTextContainsFamilyIssueCodes,
  solicitorVisibleTextContainsInternalSystemLanguage,
  violatesDrinkDriveCopyInvariant,
  type FamilyBlockAudience,
  type FamilyCompatibilityIssue,
  type FamilyCompatibilityProtectedMetadata,
} from "@/lib/criminal/solicitor-family-provenance";
import { containsAbsoluteProofWording } from "@/lib/criminal/absolute-proof-wording";
import { sanitizeYouthVenueProse } from "@/lib/criminal/solicitor-youth-venue";
import {
  formatCompatibleChaseBrief,
  formatCompatibleEvidenceCounts,
  formatCompatibleTruthMap,
  formatQuarantineReviewSection,
} from "@/lib/criminal/solicitor-partial-view-disclosure";
import {
  formatHearingStatusForDisplay,
  resolveSolicitorHearingStatus,
} from "@/lib/criminal/solicitor-hearing-status";
import { gateSolicitorOutput, resolveGateOffenceFamily } from "@/lib/criminal/solicitor-output-gate";
import { phase2CentralSurfaceIds } from "@/lib/criminal/solicitor-surface-gate-registry";
import {
  assessSolicitorVisibleBoundaryForSurface,
  requireAllSurfacesHaveProfiles,
  resolveSolicitorBoundaryProfile,
} from "@/lib/criminal/solicitor-visible-boundary-profiles";
import {
  normaliseSolicitorTemplate,
  renderCopyableSolicitorText,
  sha256Hex,
  SOLICITOR_MATERIALISE_PIPELINE_VERSION,
  SOLICITOR_MATERIALISE_SCHEMA_VERSION,
} from "@/lib/criminal/solicitor-visible-materialise";
import {
  preserveProtectedAcronyms,
  scanSolicitorVisibleCopyQuality,
} from "@/lib/criminal/solicitor-visible-quality";
import {
  dedupeSolicitorLabels,
  formatBlockedCopyPreview,
  humanizeEvidenceState,
  isFixtureIdLike,
  isInternalNonSolicitorString,
  sanitizeSolicitorProse,
  solicitorDisplayLabel,
} from "@/lib/criminal/solicitor-visible-sanitization";
import { DEMO_AUDIT_V9_FORTY_CASES } from "@/lib/eval/demo-audit-packs/v9-forty-case-catalog";

const ROOT = path.resolve(__dirname, "../..");
const SUMMARY_PATH = path.join(
  ROOT,
  "artifacts/casebrain-qa/messy-pdf-proof-v9-scale3000/MESSY-PDF-PROOF-SUMMARY.json",
);
const MATERIALISATION_ROOT = path.join(
  ROOT,
  "artifacts/casebrain-qa/integrity-programme/scale3000-solicitor-materialisation",
);
const RUN_V1 = path.join(MATERIALISATION_ROOT, "run-v1");
const DEFAULT_RUN = "run-v9";
const ESA = path.join(ROOT, "artifacts/evidence-state-audit-local/cases");
const DEMO_THIRTY = path.join(ROOT, "artifacts/casebrain-qa/demo-audit-thirty");
const DEMO_FIVE = path.join(ROOT, "artifacts/casebrain-qa/demo-audit-five");
const N_SCALE = 3000;
const N_MATERIALISED_530 = 530;
const BATCH_SIZE = 50;
const V9_SOURCE_RE = /^demo-audit-(3[1-9]|[4-6]\d|70)(?:-|$)/;
const SCHEMA_VERSION = SOLICITOR_MATERIALISE_SCHEMA_VERSION || CANONICAL_MATTER_STATE_VERSION;
const PIPELINE_VERSION = SOLICITOR_MATERIALISE_PIPELINE_VERSION;

type ScaleIdentity = {
  caseId: string;
  family: string;
  trap: string;
  layout: string;
  sourceCaseId: string;
  scenario: string;
};

type SurfaceRecord = {
  caseId: string;
  sourceCaseId: string;
  lane: "scale3000";
  surfaceId: string;
  label: string;
  text: string;
  textHash: string;
  gateStatus: string;
  canCopy: boolean;
  canExport: boolean;
  apiUsable: boolean;
  blockedNotRepaired: boolean;
  sourceEvidenceRef: string;
  offenceFamilyState: string;
  matterFingerprint: string;
  schemaVersion: string;
  pipelineVersion: string;
  auditFamily: string;
  trap: string;
  layout: string;
  /** Machine/audit only — never copyable/sendable solicitor prose. */
  protectedAudit?: FamilyCompatibilityProtectedMetadata | null;
};

type Finding = {
  findingId: string;
  code: string;
  severity: "info" | "warn" | "error";
  caseId: string;
  surfaceId: string;
  textHash: string;
  detail: string;
  evidenceRef: string;
};

type EvidenceRow = { label: string; existence: string };

type BuiltSurface = {
  surfaceId: string;
  label: string;
  text: string;
  gateStatus: string;
  canCopy: boolean;
  canExport: boolean;
  apiUsable: boolean;
  blockedNotRepaired: boolean;
  protectedAudit?: FamilyCompatibilityProtectedMetadata | null;
};

type ResolvedPack = {
  sourceCaseId: string;
  kind: "esa" | "demo_pack" | "v9_catalog";
  sourceEvidenceRef: string;
  allegation: string;
  clientLabel: string;
  auditFamily: string;
  hay: string;
  evidenceRows: EvidenceRow[];
  chaseLabels: string[];
  courtLine: string | null;
  clientSummaryText: string | null;
  doNotOverstate: string[];
  hearingIso: string | null;
  hearingRaw: string | null;
  defencePlanSafe: string | null;
};

type BuiltTemplate = {
  pack: ResolvedPack;
  offenceFamilyState: string;
  surfaces: BuiltSurface[];
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
function writeJson(abs: string, data: unknown) {
  ensureDir(path.dirname(abs));
  fs.writeFileSync(abs, JSON.stringify(data, null, 2) + "\n", "utf8");
}
function appendJsonl(abs: string, rows: unknown[]) {
  if (!rows.length) return;
  ensureDir(path.dirname(abs));
  fs.appendFileSync(abs, rows.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf8");
}
function fileHash(abs: string): string | null {
  return fs.existsSync(abs) ? createHash("sha256").update(fs.readFileSync(abs)).digest("hex") : null;
}
function parseArgs(argv: string[]) {
  let limit: number | null = null;
  let resume = false;
  let outRun = DEFAULT_RUN;
  for (const a of argv) {
    if (a === "--resume") resume = true;
    const m = a.match(/^--limit=(\d+)$/);
    if (m) limit = Number(m[1]);
    const r = a.match(/^--out-run=(run-v\d+)$/);
    if (r) outRun = r[1]!;
  }
  if (outRun === "run-v1") {
    throw new Error("Refusing to write run-v1 — immutable evidence lane.");
  }
  const IMMUTABLE_PRIOR_RUNS = new Set([
    "run-v1",
    "run-v2",
    "run-v3",
    "run-v4",
    "run-v5",
    "run-v6",
    "run-v7",
    "run-v8",
  ]);
  if (IMMUTABLE_PRIOR_RUNS.has(outRun)) {
    throw new Error(`Refusing to overwrite immutable prior run ${outRun}. Use --out-run=run-v9 (or later).`);
  }
  return { limit, resume, outRun };
}
function safeAllegation(raw: string | null | undefined): string {
  const t = (raw ?? "").trim();
  if (!t || isFixtureIdLike(t) || isInternalNonSolicitorString(t)) {
    return "Allegation not safely labelled from source";
  }
  return sanitizeSolicitorProse(t);
}
function safeClient(raw: string | null | undefined): string {
  const t = (raw ?? "").trim();
  if (!t || isFixtureIdLike(t) || isInternalNonSolicitorString(t)) return "Client";
  return sanitizeSolicitorProse(t);
}

function evidenceRowsFromTruth(truth: Record<string, unknown>): EvidenceRow[] {
  const rows: EvidenceRow[] = [];
  for (const it of (truth.evidenceItems as Array<Record<string, unknown>> | undefined) ?? []) {
    const label = String(it.label ?? it.evidence_item ?? it.name ?? "").trim();
    if (!label || isFixtureIdLike(label)) continue;
    rows.push({ label, existence: String(it.existence ?? it.correct_evidence_state ?? "unknown") });
  }
  for (const key of ["servedEvidence", "referredOnlyEvidence", "missingEvidence", "uncertainEvidence"] as const) {
    if (!Array.isArray(truth[key])) continue;
    for (const labelRaw of truth[key] as unknown[]) {
      const label = String(labelRaw).trim();
      if (!label || isFixtureIdLike(label)) continue;
      rows.push({
        label,
        existence:
          key === "servedEvidence"
            ? "served"
            : key === "referredOnlyEvidence"
              ? "referred_only"
              : key === "missingEvidence"
                ? "missing"
                : "not_safely_confirmed",
      });
    }
  }
  return rows;
}

function chaseFromTruth(truth: Record<string, unknown>): string[] {
  const expected = (truth.expectedChaseItems as unknown[] | undefined) ?? [];
  if (expected.length) {
    return expected.map((x) => String(x).trim()).filter((c) => c && !isFixtureIdLike(c));
  }
  return ((truth.chaseItems as Array<Record<string, unknown>> | undefined) ?? [])
    .map((c) => String(c.label ?? "").trim())
    .filter((c) => c && !isFixtureIdLike(c));
}

function resolveClientSummaryText(dirs: string[], fallbackBody?: string | null): string | null {
  for (const dir of dirs) {
    const candidate = path.join(dir, "client-summary.json");
    if (!fs.existsSync(candidate)) continue;
    const raw = readJson<{ text?: string; summary?: string; body?: string }>(candidate);
    const structured = raw?.text || raw?.summary || raw?.body || null;
    const composed = composeCompleteClientSummaryFromStructured(structured);
    if (composed.ok) return composed.text;
    // Incomplete structured source: wrap body paragraphs with full disclaimer (never hard-slice).
    if (structured?.trim()) {
      const body = structured
        .replace(/^CLIENT-SAFE SUMMARY\s*/i, "")
        .replace(/^\(not for court or CPS\)\s*/i, "")
        .replace(/\n?\[CaseBrain — client-safe summary\.[\s\S]*$/i, "")
        .trim();
      if (body) {
        const wrapped = wrapClientSummaryBody(body);
        const again = composeCompleteClientSummaryFromStructured(wrapped);
        if (again.ok) return again.text;
        return wrapped;
      }
    }
  }
  if (fallbackBody?.trim()) {
    const wrapped = wrapClientSummaryBody(fallbackBody.trim());
    const composed = composeCompleteClientSummaryFromStructured(wrapped);
    return composed.ok ? composed.text : wrapped;
  }
  return null;
}

/** Demo-pack dirs that may supplement ESA (client-summary / court / chase). */
function demoDirsFor(sourceCaseId: string): string[] {
  return [DEMO_THIRTY, DEMO_FIVE]
    .map((root) => path.join(root, sourceCaseId))
    .filter((d) => fs.existsSync(d));
}

function resolveSourcePack(sourceCaseId: string): ResolvedPack | null {
  const esaDir = path.join(ESA, sourceCaseId);
  const esaTruthPath = path.join(esaDir, "truth-key.json");
  const esaBundlePath = path.join(esaDir, "bundle-text.md");
  if (fs.existsSync(esaTruthPath) && fs.existsSync(esaBundlePath)) {
    const truth = readJson<Record<string, unknown>>(esaTruthPath) ?? {};
    const demos = demoDirsFor(sourceCaseId);
    const output =
      demos.map((d) => readJson<Record<string, unknown>>(path.join(d, "casebrain-output.json"))).find(Boolean) ??
      {};
    const courtTab =
      demos.map((d) => readJson<Record<string, unknown>>(path.join(d, "court-tab.json"))).find(Boolean) ?? null;
    const cpsChase =
      demos
        .map((d) =>
          readJson<{ primaryItems?: Array<Record<string, unknown>>; safeCourtLine?: string }>(
            path.join(d, "cps-chase.json"),
          ),
        )
        .find(Boolean) ?? null;
    const truthMap =
      demos
        .map((d) =>
          readJson<{ truthMap?: EvidenceRow[]; mustNotOverstate?: string[] }>(
            path.join(d, "overview-truth-map.json"),
          ),
        )
        .find(Boolean) ?? null;
    const evidenceRows = evidenceRowsFromTruth(truth);
    const chaseFromCps = (cpsChase?.primaryItems ?? [])
      .map((c) => String(c.label ?? "").trim())
      .filter((c) => c && !isFixtureIdLike(c));
    const courtLine =
      (typeof courtTab?.safeCourtLine === "string" ? courtTab.safeCourtLine : null) ||
      cpsChase?.safeCourtLine ||
      null;
    const clientSummaryText =
      resolveClientSummaryText([esaDir, ...demos]) ||
      (output.clientLabel
        ? wrapClientSummaryBody(
            `We are reviewing the papers for ${safeClient(String(output.clientLabel))}. This is early-stage — nothing is final until we have full disclosure and your instructions.`,
          )
        : null);
    return {
      sourceCaseId,
      kind: "esa",
      sourceEvidenceRef: path.relative(ROOT, esaDir).replace(/\\/g, "/"),
      allegation: safeAllegation(
        String(truth.offenceWording ?? output.allegation ?? truth.allegation ?? truth.charge ?? ""),
      ),
      clientLabel: safeClient(String(output.clientLabel ?? truth.clientLabel ?? truth.defendant ?? "Client")),
      auditFamily: String(truth.offenceFamily ?? truth.family ?? truth.scenarioFamily ?? "unknown"),
      hay: fs.readFileSync(esaBundlePath, "utf8"),
      evidenceRows,
      chaseLabels: chaseFromCps.length ? chaseFromCps : chaseFromTruth(truth),
      courtLine,
      clientSummaryText,
      doNotOverstate: Array.isArray(truth.mustNotSayGlobal)
        ? (truth.mustNotSayGlobal as string[]).map(String)
        : (truthMap?.mustNotOverstate ?? []).map(String),
      hearingIso: (truth.nextHearingIso as string) ?? (truth.hearingDateIso as string) ?? null,
      hearingRaw: (truth.nextHearing as string) ?? null,
      defencePlanSafe: typeof courtTab?.safePositionToday === "string" ? courtTab.safePositionToday : null,
    };
  }

  for (const root of [DEMO_THIRTY, DEMO_FIVE]) {
    const dir = path.join(root, sourceCaseId);
    if (!fs.existsSync(dir)) continue;
    const truth = readJson<Record<string, unknown>>(path.join(dir, "truth-key.json")) ?? {};
    const output = readJson<Record<string, unknown>>(path.join(dir, "casebrain-output.json")) ?? {};
    const cpsChase = readJson<{
      primaryItems?: Array<Record<string, unknown>>;
      safeCourtLine?: string;
    }>(path.join(dir, "cps-chase.json"));
    const courtTab = readJson<Record<string, unknown>>(path.join(dir, "court-tab.json"));
    const truthMap = readJson<{ truthMap?: EvidenceRow[]; mustNotOverstate?: string[] }>(
      path.join(dir, "overview-truth-map.json"),
    );
    const mapRows = (truthMap?.truthMap ?? []).filter((r) => r.label && !isFixtureIdLike(r.label));
    const evidenceRows = mapRows.length
      ? mapRows.map((r) => ({ label: r.label, existence: String(r.existence) }))
      : evidenceRowsFromTruth(truth);
    const chaseFromCps = (cpsChase?.primaryItems ?? [])
      .map((c) => String(c.label ?? "").trim())
      .filter((c) => c && !isFixtureIdLike(c));
    const chaseLabels = chaseFromCps.length ? chaseFromCps : chaseFromTruth(truth);
    const courtLine =
      (typeof courtTab?.safeCourtLine === "string" ? courtTab.safeCourtLine : null) ||
      cpsChase?.safeCourtLine ||
      null;
    const clientSummaryText = resolveClientSummaryText([dir]);
    const doNot =
      truthMap?.mustNotOverstate ??
      (Array.isArray(courtTab?.doNotOverstate) ? (courtTab!.doNotOverstate as string[]) : []);
    return {
      sourceCaseId,
      kind: "demo_pack",
      sourceEvidenceRef: path.relative(ROOT, dir).replace(/\\/g, "/"),
      allegation: safeAllegation(
        String(output.allegation ?? truth.offenceWording ?? truth.allegation ?? truth.charge ?? ""),
      ),
      clientLabel: safeClient(String(output.clientLabel ?? truth.clientLabel ?? truth.defendant ?? "Client")),
      auditFamily: String(truth.offenceFamily ?? truth.family ?? output.family ?? "unknown"),
      hay: [courtLine ?? "", ...evidenceRows.map((r) => r.label), ...chaseLabels, clientSummaryText ?? ""]
        .filter(Boolean)
        .join("\n"),
      evidenceRows,
      chaseLabels,
      courtLine,
      clientSummaryText,
      doNotOverstate: doNot.map(String),
      hearingIso: (truth.nextHearingIso as string) ?? null,
      hearingRaw: (truth.nextHearing as string) ?? null,
      defencePlanSafe: typeof courtTab?.safePositionToday === "string" ? courtTab.safePositionToday : null,
    };
  }

  if (V9_SOURCE_RE.test(sourceCaseId)) {
    const pack = DEMO_AUDIT_V9_FORTY_CASES.find((p) => p.spec.id === sourceCaseId);
    if (pack) {
      const truth = pack.truthKey as unknown as Record<string, unknown>;
      return {
        sourceCaseId,
        kind: "v9_catalog",
        sourceEvidenceRef: `lib/eval/demo-audit-packs/v9-forty-case-catalog#${sourceCaseId}`,
        allegation: safeAllegation(pack.truthKey.offenceWording ?? pack.spec.title),
        clientLabel: safeClient(pack.spec.defendant),
        auditFamily: String(pack.truthKey.offenceFamily ?? "unknown"),
        hay: pack.canonicalBundle,
        evidenceRows: evidenceRowsFromTruth({
          evidenceItems: (pack.truthKey.evidenceItems ?? []).map((it) => ({
            evidence_item: it.evidence_item,
            correct_evidence_state: it.correct_evidence_state,
          })),
        }),
        chaseLabels: chaseFromTruth(truth),
        courtLine: null,
        clientSummaryText: wrapClientSummaryBody(
          `We are reviewing the papers for ${pack.spec.defendant}. This is early-stage — nothing is final until we have full disclosure and your instructions.`,
        ),
        doNotOverstate: (pack.truthKey.mustNotSayGlobal ?? []).map(String),
        hearingIso: null,
        hearingRaw: null,
        defencePlanSafe: null,
      };
    }
  }
  return null;
}

function toFiveRows(rows: EvidenceRow[]): FiveAnswersEvidenceRow[] {
  return rows.map((r) => ({
    label: r.label,
    existence: r.existence as FiveAnswersEvidenceRow["existence"],
    reliability: "needs_review",
  }));
}

function blockedPreview(itemLabel: string, reason: string): string {
  return formatBlockedCopyPreview({ itemLabel, reason });
}

function familyBlockedPreview(
  itemLabel: string,
  issues: FamilyCompatibilityIssue[],
  audience: FamilyBlockAudience,
  matterFamily?: ReturnType<typeof classifyMatterFamily>,
): { text: string; protectedAudit: FamilyCompatibilityProtectedMetadata } {
  const reason = describeFamilyCompatibilityForSolicitor({ issues, audience });
  if (solicitorVisibleTextContainsFamilyIssueCodes(reason)) {
    throw new Error("family_blocked_preview_leaked_issue_codes");
  }
  return {
    text: blockedPreview(itemLabel, reason),
    protectedAudit: buildFamilyCompatibilityProtectedMetadata({ issues, matterFamily }),
  };
}

function buildTemplate(pack: ResolvedPack): BuiltTemplate {
  const { allegation, hay, auditFamily } = pack;
  const familyResolution = resolveGateOffenceFamily({ allegation, bundleHay: hay, auditFamily });
  const offenceFamilyState = familyResolution.failClosed ? "uncertain" : "resolved";
  const hearing = resolveSolicitorHearingStatus({
    bundleNextHearingIso: pack.hearingIso,
    nextHearingRaw: pack.hearingRaw,
    bundleHay: hay,
    asOf: new Date("2026-07-21T12:00:00Z"),
  });
  const hearingLabel = formatHearingStatusForDisplay(hearing);
  const chaseBrief = buildDisclosureChaseBrief({
    caseId: pack.sourceCaseId,
    caseTitle: `Matter — ${pack.clientLabel}`,
    clientLabel: pack.clientLabel,
    allegation,
    stage: "Pre-hearing",
    hearingStatus: hearing.statusLabel,
    hearingDateIso: hearing.dateIso,
    bundleHealth: "Review papers",
    positionStatus: "Position not safely recorded yet",
    battleboard: null,
    snapshotMissing: pack.evidenceRows
      .filter((r) => r.existence === "missing" || r.existence === "referred_only")
      .map((r) => ({ label: r.label, status: humanizeEvidenceState(r.existence) })),
    proceduralOutstanding: pack.chaseLabels,
    bundleText: hay,
  });

  const surfaces: BuiltSurface[] = [];
  const push = (
    surfaceId: string,
    label: string,
    text: string,
    o: Partial<BuiltSurface> & { gateStatus: string },
  ) => {
    const canCopy = o.canCopy ?? false;
    if (solicitorVisibleTextContainsFamilyIssueCodes(text) || solicitorVisibleTextContainsInternalSystemLanguage(text)) {
      throw new Error(`solicitor_visible_internal_language_leak:${surfaceId}`);
    }
    surfaces.push({
      surfaceId,
      label,
      text,
      gateStatus: o.gateStatus,
      canCopy,
      canExport: o.canExport ?? canCopy,
      apiUsable: o.apiUsable ?? canCopy,
      blockedNotRepaired: o.blockedNotRepaired ?? !canCopy,
      protectedAudit: o.protectedAudit ?? null,
    });
  };
  const pushCopyable = (
    surfaceId: string,
    label: string,
    rawText: string,
    mode: "copy" | "export" = "copy",
    itemLabel?: string,
    itemIndex?: number,
  ) => {
    if (isDetachedDisputedChargeCopy(rawText)) {
      push(
        surfaceId,
        label,
        blockedPreview(
          itemLabel ?? label,
          "Disputed charge wording cannot be copied without the attached citation-discrepancy warning.",
        ),
        { gateStatus: "charge_warning_detached", canCopy: false, blockedNotRepaired: true },
      );
      return;
    }
    // All-exit family invariant: never copy drink-device wording on non-drink-driving matters.
    if (
      violatesDrinkDriveCopyInvariant({
        allegation,
        auditFamily,
        text: rawText,
        canCopy: true,
      })
    ) {
      push(
        surfaceId,
        label,
        blockedPreview(
          itemLabel ?? label,
          "Drink-driving/device wording is not available for copy on this non-drink-driving matter.",
        ),
        { gateStatus: "family_incompatible", canCopy: false, blockedNotRepaired: true },
      );
      return;
    }
    const chaseCompat = assessChaseLabelFamilyCompatibility({
      allegation,
      auditFamily,
      label: rawText,
    });
    if (!chaseCompat.ok && classifyMatterFamily({ allegation, auditFamily }) === "driver_information") {
      push(
        surfaceId,
        label,
        blockedPreview(itemLabel ?? label, chaseCompat.reason || "Family-incompatible chase/prose blocked."),
        { gateStatus: "family_incompatible", canCopy: false, blockedNotRepaired: true },
      );
      return;
    }
    const vis = renderCopyableSolicitorText({
      rawText,
      allegation,
      bundleHay: hay,
      auditFamily,
      surfaceId: `scale3000_${surfaceId}`,
      mode,
      itemLabel,
      itemIndex,
    });
    push(surfaceId, label, vis.display, {
      gateStatus: vis.gateStatus,
      canCopy: vis.canCopy,
      canExport: vis.canCopy,
      apiUsable: vis.canCopy,
      blockedNotRepaired: vis.blockedNotRepaired,
    });
  };

  // Solicitor-visible context only — pack kind / sourceCaseId stay in SurfaceRecord audit fields.
  push(
    "source_context",
    "Source context",
    [
      `Client: ${pack.clientLabel}`,
      `Allegation: ${allegation}`,
      `Hearing: ${hearingLabel}`,
      `Evidence rows: ${pack.evidenceRows.length}`,
      `Chase labels: ${pack.chaseLabels.length}`,
    ].join("\n"),
    { gateStatus: "context", canCopy: false, canExport: false, apiUsable: false, blockedNotRepaired: true },
  );

  const chargeModel = buildSolicitorChargeModel({
    sourceChargeText: allegation,
    // Raw audit ref is retained on the model as internalAuditReference only.
    sourceReference: `Source pack ${pack.kind} (${pack.sourceCaseId}) — charge wording as recorded`,
    clientLabel: pack.clientLabel,
  });
  // Registry conflict assessment retained for internal audit only (not solicitor wording).
  void assessOffenceLabelWording(allegation);
  push("case_header", "Charge", chargeModel.displayText, {
    gateStatus: chargeModel.verificationStatus,
    canCopy: false,
    canExport: false,
    apiUsable: false,
    // Internal audit flag only — never shown in solicitor text.
    blockedNotRepaired: chargeModel.verificationStatus !== "verified",
  });
  // Structured charge copy bypasses the generic gate/qualified-queue path so that
  // discrepancy warnings stay inseparable from the recorded charge (never replaced
  // with bare "copy unavailable"). Still enforce drink-device + detachment guards.
  {
    const chargeCopy = chargeModel.copyText;
    if (isDetachedDisputedChargeCopy(chargeCopy)) {
      push(
        "case_header_charge_copy",
        "Charge (copy)",
        blockedPreview(
          "Charge",
          "Disputed charge wording cannot be copied without the attached citation-discrepancy warning.",
        ),
        { gateStatus: "charge_warning_detached", canCopy: false, blockedNotRepaired: true },
      );
    } else if (
      violatesDrinkDriveCopyInvariant({
        allegation,
        auditFamily,
        text: chargeCopy,
        canCopy: true,
      })
    ) {
      push(
        "case_header_charge_copy",
        "Charge (copy)",
        blockedPreview(
          "Charge",
          "Drink-driving/device wording is not available for copy on this non-drink-driving matter.",
        ),
        { gateStatus: "family_incompatible", canCopy: false, blockedNotRepaired: true },
      );
    } else {
      push("case_header_charge_copy", "Charge (copy)", chargeCopy, {
        gateStatus:
          chargeModel.verificationStatus === "discrepancy"
            ? "discrepancy_with_inseparable_warning"
            : chargeModel.verificationStatus,
        canCopy: true,
        canExport: true,
        apiUsable: true,
        blockedNotRepaired: false,
      });
    }
  }
  if (!chargeModel.verifiedWordingAvailable) {
    push(
      "case_header_verified_charge",
      "Verified charge wording",
      "Verified charge wording is not available until the operative charge sheet has been checked. Registry text is not offered as a substitute charge.",
      {
        gateStatus: "verified_unavailable",
        canCopy: false,
        canExport: false,
        apiUsable: false,
        blockedNotRepaired: true,
      },
    );
  }

  const evidencePartition = partitionEvidenceForSolicitorDisplay({
    allegation,
    auditFamily,
    evidenceRows: toFiveRows(pack.evidenceRows),
  });
  const evidenceView = buildSolicitorVisibleEvidenceView(toFiveRows(pack.evidenceRows), {
    allegation,
    auditFamily,
  });

  const rawEvidenceCount = pack.evidenceRows.length;
  const compatibleEvidenceCount = evidencePartition.compatible.length;
  const quarantinedEvidenceCount = evidencePartition.quarantined.length;
  if (compatibleEvidenceCount + quarantinedEvidenceCount !== rawEvidenceCount) {
    throw new Error(
      `FIND-QUARANTINE-RECONCILE: compatible ${compatibleEvidenceCount} + quarantined ${quarantinedEvidenceCount} !== raw ${rawEvidenceCount}`,
    );
  }

  const overviewText = formatCompatibleEvidenceCounts({
    overviewCountsLine: evidenceView.overviewCountsText,
    quarantinedCount: quarantinedEvidenceCount,
    rawSourceCount: rawEvidenceCount,
    compatibleCount: compatibleEvidenceCount,
  });
  push("overview_counts", "Evidence currently compatible with this matter", overviewText, {
    gateStatus: quarantinedEvidenceCount ? "compatible_with_quarantine_disclosure" : "display",
    canCopy: true,
    blockedNotRepaired: false,
  });

  if (evidenceView.displayItems.length || quarantinedEvidenceCount) {
    const truthText = formatCompatibleTruthMap({
      truthMapText: evidenceView.truthMapText,
      quarantinedCount: quarantinedEvidenceCount,
      quarantinedLabels: evidencePartition.quarantined.map((r) => r.label),
      rawSourceCount: rawEvidenceCount,
      compatibleCount: compatibleEvidenceCount,
    });
    const truthFam = assessFamilyEvidenceCompatibility({
      allegation,
      auditFamily,
      prose: evidenceView.truthMapText,
    });
    if (!truthFam.ok && containsDrinkDriveDeviceWording(evidenceView.truthMapText)) {
      push(
        "truth_map",
        "Evidence truth map",
        blockedPreview(
          "Evidence truth map",
          "Compatible evidence map unavailable — family-incompatible wording remained after filtering.",
        ),
        { gateStatus: "family_incompatible", canCopy: false, blockedNotRepaired: true },
      );
    } else {
      push("truth_map", "Evidence currently compatible with this matter", truthText, {
        gateStatus: quarantinedEvidenceCount ? "compatible_with_quarantine_disclosure" : "display",
        canCopy: true,
        blockedNotRepaired: false,
      });
    }
  } else {
    push(
      "truth_map",
      "Evidence truth map",
      "Evidence currently compatible with this matter:\n(none recorded)",
      { gateStatus: "empty", canCopy: true, blockedNotRepaired: false },
    );
  }

  push(
    "evidence_family_quarantine",
    "Quarantined evidence review",
    formatQuarantineReviewSection({
      quarantinedLabels: evidencePartition.quarantined.map((r) => r.label),
      reason:
        evidencePartition.contradiction?.summary ||
        "Rows conflict with the recorded allegation / matter family and are held for solicitor review.",
    }),
    {
      gateStatus: quarantinedEvidenceCount ? "quarantine_review" : "empty",
      canCopy: false,
      canExport: false,
      apiUsable: false,
      blockedNotRepaired: true,
    },
  );

  if (evidencePartition.contradiction) {
    push(
      "matter_family_contradiction",
      "Matter review — allegation and evidence family",
      [
        "Review required.",
        `Recorded allegation family: ${evidencePartition.contradiction.allegationFamily}.`,
        `Conflicting evidence family: ${evidencePartition.contradiction.evidenceFamily}.`,
        evidencePartition.contradiction.summary,
      ].join("\n"),
      { gateStatus: "review_required", canCopy: false, canExport: false, apiUsable: false, blockedNotRepaired: true },
    );
  }

  push(
    "evidence_alias_expansion",
    "Evidence alias / source expansion",
    evidenceView.aliasExpansionText,
    {
      gateStatus: "context",
      canCopy: false,
      canExport: false,
      apiUsable: false,
      blockedNotRepaired: true,
    },
  );

  push("hearing_status_strip", "Hearing status", hearingLabel, {
    gateStatus: hearing.kind,
    canCopy: true,
    blockedNotRepaired: false,
  });
  push(
    "offence_family",
    "Offence family (solicitor)",
    familyResolution.failClosed
      ? "Offence family not safely resolved — treat wording as provisional."
      : "Offence family resolved for this matter.",
    { gateStatus: offenceFamilyState, canCopy: true, blockedNotRepaired: false },
  );

  const evidenceLabels = evidenceView.displayItems.map((i) => i.label);

  if (pack.clientSummaryText) {
    const youthSafe = sanitizeYouthVenueProse({
      prose: pack.clientSummaryText,
      bundleHay: hay,
      allegation,
    });
    const fam = assessFamilyEvidenceCompatibility({
      allegation,
      auditFamily,
      prose: youthSafe,
    });
    const emptyGeneric = fam.issues.includes("empty_generic_client_summary");
    if (!fam.ok && !emptyGeneric) {
      const blocked = familyBlockedPreview(
        "Client-safe summary wording",
        fam.issues,
        "client",
        fam.matterFamily,
      );
      push("client_summary", "Client-safe summary", blocked.text, {
        gateStatus: "family_incompatible",
        canCopy: false,
        blockedNotRepaired: true,
        protectedAudit: blocked.protectedAudit,
      });
    } else if (emptyGeneric) {
      pushCopyable(
        "client_summary",
        "Client-safe summary",
        `${youthSafe.trim()}\n\nNo more specific client-safe summary can safely be generated from the served papers alone. Outstanding disclosure items are listed on the evidence map and chase list.`,
        "copy",
        "Client-safe summary wording",
      );
    } else {
      pushCopyable("client_summary", "Client-safe summary", youthSafe, "copy", "Client-safe summary wording");
    }
  } else {
    push(
      "client_summary",
      "Client-safe summary",
      blockedPreview("Client-safe summary wording", "Structured client summary missing from source pack."),
      { gateStatus: "missing", canCopy: false, blockedNotRepaired: true },
    );
  }

  const courtLineRaw = pack.courtLine || chaseBrief.safeCourtLine || null;
  if (courtLineRaw) {
    const fam = assessFamilyEvidenceCompatibility({ allegation, auditFamily, prose: courtLineRaw });
    const prov = assessProvenanceCoherence({ prose: courtLineRaw, evidenceLabels });
    if (!fam.ok) {
      const blocked = familyBlockedPreview("Court line", fam.issues, "court", fam.matterFamily);
      push("court_line", "Court line", blocked.text, {
        gateStatus: "family_incompatible",
        canCopy: false,
        blockedNotRepaired: true,
        protectedAudit: blocked.protectedAudit,
      });
    } else if (!prov.ok) {
      push(
        "court_line",
        "Court line",
        blockedPreview(
          "Court line",
          `Court line mentions material not on the displayed evidence map (${prov.orphanMentions.join(", ")}). Treat as provisional procedural wording only after solicitor review.`,
        ),
        { gateStatus: "provenance_incoherent", canCopy: false, blockedNotRepaired: true },
      );
    } else {
      pushCopyable("court_line", "Court line", courtLineRaw, "copy", "Court line");
    }
  } else {
    push(
      "court_line",
      "Court line",
      blockedPreview("Court line", "No safe court line from source or chase brief."),
      { gateStatus: "missing", canCopy: false, blockedNotRepaired: true },
    );
  }

  const primary = chaseBrief.primaryItems;
  if (!primary.length) {
    push(
      "cps_chase_draft",
      "CPS chase draft",
      blockedPreview("CPS chase draft", "No primary disclosure chase items produced."),
      { gateStatus: "empty", canCopy: false, blockedNotRepaired: true },
    );
  } else {
    primary.forEach((it, idx) => {
      const draft = preserveProtectedAcronyms(it.draftChaseWording || it.label);
      const chaseCompat = assessChaseLabelFamilyCompatibility({
        allegation,
        auditFamily,
        label: `${it.label} ${draft}`,
      });
      const fam = assessFamilyEvidenceCompatibility({ allegation, auditFamily, prose: draft });
      if (!chaseCompat.ok || !fam.ok) {
        const issues = [...new Set([...fam.issues, ...chaseCompat.issues])];
        const blocked = familyBlockedPreview(
          `CPS chase — ${solicitorDisplayLabel(it.label)}`,
          issues,
          "default",
          fam.matterFamily,
        );
        push(
          "cps_chase_draft",
          `CPS chase — ${solicitorDisplayLabel(it.label)}`,
          blocked.text,
          {
            gateStatus: "family_incompatible",
            canCopy: false,
            blockedNotRepaired: true,
            protectedAudit: blocked.protectedAudit,
          },
        );
        return;
      }
      const onMap =
        evidenceLabels.some((l) => l.toLowerCase().includes(it.label.toLowerCase().slice(0, 12))) ||
        assessProvenanceCoherence({ prose: draft, evidenceLabels }).ok ||
        /\bMG6|schedule\b/i.test(draft);
      if (
        !onMap &&
        !evidenceLabels.some((l) => l.trim().toLowerCase() === it.label.trim().toLowerCase())
      ) {
        const tokenHit = evidenceLabels.some((l) =>
          it.label
            .toLowerCase()
            .split(/[^a-z0-9]+/)
            .filter((t) => t.length > 3)
            .some((t) => l.toLowerCase().includes(t)),
        );
        if (!tokenHit) {
          push(
            "cps_chase_draft",
            `CPS chase — ${solicitorDisplayLabel(it.label)}`,
            blockedPreview(
              `CPS chase — ${solicitorDisplayLabel(it.label)}`,
              "Chase item is not linked to a displayed evidence-map row or family-compatible procedural request.",
            ),
            { gateStatus: "provenance_incoherent", canCopy: false, blockedNotRepaired: true },
          );
          return;
        }
      }
      pushCopyable(
        "cps_chase_draft",
        `CPS chase — ${solicitorDisplayLabel(it.label)}`,
        draft,
        "copy",
        `CPS chase — ${solicitorDisplayLabel(it.label)}`,
        idx,
      );
    });
  }

  // Chase brief: supported + procedural (compatible) vs quarantined source requests needing review.
  const compatibleChaseLabels: string[] = [];
  const contradictionChaseLabels: string[] = [];
  for (const raw of dedupeSolicitorLabels(chaseBrief.items.map((it) => it.label))) {
    const label = preserveProtectedAcronyms(sanitizeSolicitorProse(raw));
    const compat = assessChaseLabelFamilyCompatibility({ allegation, auditFamily, label });
    if (compat.ok) compatibleChaseLabels.push(label);
    else contradictionChaseLabels.push(label);
  }
  const chaseBriefText = formatCompatibleChaseBrief({
    supportedLabels: compatibleChaseLabels,
    quarantinedLabels: contradictionChaseLabels,
  });
  if (compatibleChaseLabels.length || contradictionChaseLabels.length) {
    push("chase_brief", "Disclosure chase (supported requests)", chaseBriefText, {
      gateStatus: contradictionChaseLabels.length
        ? "compatible_with_quarantine_disclosure"
        : "display",
      // Copyable when supported requests exist, or when exclusions must travel with the chase string.
      canCopy: true,
      blockedNotRepaired: false,
    });
  } else {
    push(
      "chase_brief",
      "Disclosure chase (supported requests)",
      blockedPreview("Disclosure chase list", "No chase items produced."),
      { gateStatus: "empty", canCopy: false, blockedNotRepaired: true },
    );
  }
  if (contradictionChaseLabels.length) {
    push(
      "chase_source_contradictions",
      "Quarantined chase requests (solicitor review)",
      [
        "Source chase requests quarantined for solicitor review (not for copy as outstanding disclosure):",
        ...contradictionChaseLabels.map((l) => `• ${l}`),
        "",
        "These requests conflict with the recorded allegation / matter family and must not be injected from a broad offence-family template.",
      ].join("\n"),
      {
        gateStatus: "quarantine_review",
        canCopy: false,
        canExport: false,
        apiUsable: false,
        blockedNotRepaired: true,
      },
    );
  }

  if (pack.doNotOverstate.length) {
    push(
      "do_not_overstate",
      "Do-not-overstate warnings",
      pack.doNotOverstate.map((x) => `• ${sanitizeSolicitorProse(x)}`).join("\n"),
      { gateStatus: "warning", canCopy: false, canExport: false, apiUsable: false, blockedNotRepaired: true },
    );
  } else {
    push("do_not_overstate", "Do-not-overstate warnings", "(no do-not-overstate warnings recorded)", {
      gateStatus: "empty",
      canCopy: false,
      blockedNotRepaired: true,
    });
  }

  // Never promote must-not-say / absolute-proof phrases into affirmative defence-plan copy.
  const defenceRaw =
    pack.defencePlanSafe && !containsAbsoluteProofWording(pack.defencePlanSafe)
      ? pack.defencePlanSafe
      : "Position not safely recorded yet — do not overstate disclosure completeness. Treat outstanding disclosure as provisional pending served source material.";
  pushCopyable("defence_plan_safe_wording", "Defence plan safe wording", defenceRaw, "copy", "Defence plan safe wording");

  if (!primary.length) {
    push(
      "copy_preview",
      "Copy preview",
      blockedPreview("Copy preview", "No chase drafts available for copy preview."),
      { gateStatus: "empty", canCopy: false, blockedNotRepaired: true },
    );
  } else {
    let emitted = 0;
    primary.forEach((it, idx) => {
      if (emitted >= 3) return;
      const draft = preserveProtectedAcronyms(it.draftChaseWording || it.label);
      if (containsAbsoluteProofWording(draft)) return;
      const compat = assessChaseLabelFamilyCompatibility({
        allegation,
        auditFamily,
        label: `${it.label} ${draft}`,
      });
      if (!compat.ok) {
        push(
          "copy_preview",
          `Copy preview — ${solicitorDisplayLabel(it.label)}`,
          blockedPreview(
            solicitorDisplayLabel(it.label),
            compat.reason || "Family-incompatible chase preview blocked.",
          ),
          { gateStatus: "family_incompatible", canCopy: false, blockedNotRepaired: true },
        );
        emitted += 1;
        return;
      }
      pushCopyable(
        "copy_preview",
        `Copy preview — ${solicitorDisplayLabel(it.label)}`,
        draft,
        "copy",
        solicitorDisplayLabel(it.label),
        idx,
      );
      emitted += 1;
    });
  }

  const exportCandidate =
    (courtLineRaw &&
    assessFamilyEvidenceCompatibility({ allegation, auditFamily, prose: courtLineRaw }).ok
      ? courtLineRaw
      : null) ||
    (pack.clientSummaryText
      ? sanitizeYouthVenueProse({ prose: pack.clientSummaryText, bundleHay: hay, allegation })
      : null) ||
    hearingLabel;
  const exportFam = assessFamilyEvidenceCompatibility({
    allegation,
    auditFamily,
    prose: exportCandidate ?? "",
  });
  if (!exportFam.ok) {
    const blocked = familyBlockedPreview(
      "Export preview",
      exportFam.issues,
      "export",
      exportFam.matterFamily,
    );
    push("export_preview", "Export preview", blocked.text, {
      gateStatus: "family_incompatible",
      canCopy: false,
      blockedNotRepaired: true,
      protectedAudit: blocked.protectedAudit,
    });
  } else {
    pushCopyable("export_preview", "Export preview", exportCandidate ?? hearingLabel, "export", "Export preview");
  }

  {
    const apiRaw = exportCandidate ?? hearingLabel;
    const fam = assessFamilyEvidenceCompatibility({ allegation, auditFamily, prose: apiRaw });
    if (!fam.ok || violatesDrinkDriveCopyInvariant({ allegation, auditFamily, text: apiRaw, canCopy: true })) {
      push(
        "api_consumer_preview",
        "API consumer preview",
        blockedPreview("API consumer preview", "API exit blocked — family-incompatible wording."),
        { gateStatus: "family_incompatible", canCopy: false, apiUsable: false, blockedNotRepaired: true },
      );
    } else {
      const vis = renderCopyableSolicitorText({
        rawText: apiRaw,
        allegation,
        bundleHay: hay,
        auditFamily,
        surfaceId: "api_scale3000_consumer_preview",
        mode: "copy",
        itemLabel: "API consumer preview",
      });
      const gated = gateSolicitorOutput({
        surfaceId: "api_executive_brief",
        texts: [vis.canCopy ? vis.display : ""],
        allegation,
        bundleHay: hay,
        auditFamily,
        mode: "api",
        data: { texts: [vis.display] },
      });
      const ok = vis.canCopy && gated.canCopy;
      push("api_consumer_preview", "API consumer preview", vis.display, {
        gateStatus: ok ? gated.status : vis.gateStatus,
        canCopy: ok,
        canExport: false,
        apiUsable: ok,
        blockedNotRepaired: !ok,
      });
    }
  }

  pushCopyable(
    "family_leak_probe",
    "Cross-family containment probe",
    "Consider defensive force and PWITS continuity on this matter.",
    "copy",
    "Family leak probe",
  );

  let provenanceCount = 0;
  for (const row of pack.evidenceRows) {
    if (provenanceCount >= 4) break;
    const vis = solicitorVisibleEvidenceTitle(row.label);
    const display = preserveProtectedAcronyms(vis.display);
    push("provenance_title", "Evidence provenance title", display, {
      gateStatus: vis.blocked ? "blocked_title" : "ok",
      canCopy: false,
      canExport: false,
      apiUsable: false,
      blockedNotRepaired: true,
    });
    provenanceCount += 1;
  }
  if (!provenanceCount) {
    push(
      "provenance_title",
      "Evidence provenance title",
      blockedPreview("Evidence provenance title", "No evidence labels for provenance titles."),
      { gateStatus: "empty", canCopy: false, blockedNotRepaired: true },
    );
  }

  push(
    "blocked_empty_state",
    "Blocked empty state",
    blockedPreview("Empty surface", "No solicitor-safe text is available for this placeholder surface."),
    { gateStatus: "empty", canCopy: false, blockedNotRepaired: true },
  );

  return { pack, offenceFamilyState, surfaces };
}

function materialiseIdentity(id: ScaleIdentity, built: BuiltTemplate): SurfaceRecord[] {
  const fp = sha256Hex(
    [id.caseId, id.family, id.trap, built.pack.allegation, built.offenceFamilyState].join("|"),
  );
  return built.surfaces.map((s) => ({
    caseId: id.caseId,
    sourceCaseId: id.sourceCaseId,
    lane: "scale3000" as const,
    surfaceId: s.surfaceId,
    label: s.label,
    text: s.text,
    textHash: sha256Hex(s.text),
    gateStatus: s.gateStatus,
    canCopy: s.canCopy,
    canExport: s.canExport,
    apiUsable: s.apiUsable,
    blockedNotRepaired: s.blockedNotRepaired,
    sourceEvidenceRef: built.pack.sourceEvidenceRef,
    offenceFamilyState: built.offenceFamilyState,
    matterFingerprint: fp,
    schemaVersion: SCHEMA_VERSION,
    pipelineVersion: PIPELINE_VERSION,
    auditFamily: built.pack.auditFamily,
    trap: id.trap,
    layout: id.layout,
    protectedAudit: s.protectedAudit ?? null,
  }));
}

const FIXTURE_RE =
  /\b(?:cb-(?:fresh|found)-\d+|demo-audit-\d+|sc-[0-9a-f]+|messy-pdf-v\d+|pilot-\d+|proof-pack-\d+|CASE-\d+|SYN-[A-Z0-9-]+)\b/i;
const BUILDER_RE = /\b(CaseBrain H5|Brain 1|presentation builders|no Brain|builder(?:Name)?|audit family seed)\b/i;
const ENUM_RE = /\b(referred_only|not_safely_confirmed|needs_review|not_started)\b/;
const PLACEHOLDER_RE = /\{\{[A-Z0-9_]+\}\}|\{[A-Z][A-Z0-9_]{2,}\}/;

function scanSurface(rec: SurfaceRecord): Finding[] {
  const out: Finding[] = [];
  const h12 = rec.textHash.slice(0, 12);
  const copyableExit = rec.canCopy || rec.canExport || rec.apiUsable;

  // Internal fixture / audit / system language: scan EVERY solicitor-visible surface
  // (copyable, blocked, context). Blocked status does not authorise leakage.
  if (containsSolicitorForbiddenInternalLanguage(rec.text)) {
    out.push({
      findingId: `FIND-LEAK-internal_language-${h12}`,
      code: "internal_language",
      severity: "error",
      caseId: rec.caseId,
      surfaceId: rec.surfaceId,
      textHash: rec.textHash,
      detail: "Solicitor-visible surface contains fixture/audit/developer language",
      evidenceRef: rec.sourceEvidenceRef,
    });
  }
  for (const hit of scanSolicitorVisibleInternalLanguageBoundary(rec.text)) {
    out.push({
      findingId: `FIND-LEAK-${hit.kind}-${h12}`,
      code: hit.kind === "family_issue_code" ? "family_issue_code_leak" : "system_language_leak",
      severity: "error",
      caseId: rec.caseId,
      surfaceId: rec.surfaceId,
      textHash: rec.textHash,
      detail: `Solicitor-visible surface (including blocked) contains ${hit.kind}: ${hit.matched}`,
      evidenceRef: rec.sourceEvidenceRef,
    });
  }
  for (const [code, re] of [
    ["fixture_id", FIXTURE_RE],
    ["builder_name", BUILDER_RE],
  ] as const) {
    const m = rec.text.match(re);
    if (m) {
      out.push({
        findingId: `FIND-LEAK-${code}-${h12}`,
        code,
        severity: "error",
        caseId: rec.caseId,
        surfaceId: rec.surfaceId,
        textHash: rec.textHash,
        detail: `Leak pattern ${code}: ${m[0]}`,
        evidenceRef: rec.sourceEvidenceRef,
      });
    }
  }

  if (!copyableExit) return out;

  const profile = resolveSolicitorBoundaryProfile(rec.surfaceId);
  const boundary = assessSolicitorVisibleBoundaryForSurface(rec.text, rec.surfaceId);
  if (!boundary.ok) {
    for (const issue of boundary.issues) {
      out.push({
        findingId: `FIND-TRUNC-${issue}-${h12}`,
        code: `boundary_${issue}`,
        severity: "error",
        caseId: rec.caseId,
        surfaceId: rec.surfaceId,
        textHash: rec.textHash,
        detail: `Copyable surface failed ${profile} boundary: ${issue}`,
        evidenceRef: rec.sourceEvidenceRef,
      });
    }
  }
  for (const q of scanSolicitorVisibleCopyQuality(rec.text)) {
    out.push({
      findingId: `FIND-QUAL-${q}-${h12}`,
      code: q,
      severity: "warn",
      caseId: rec.caseId,
      surfaceId: rec.surfaceId,
      textHash: rec.textHash,
      detail: `Copy quality issue: ${q}`,
      evidenceRef: rec.sourceEvidenceRef,
    });
  }
  for (const [code, re] of [
    ["raw_enum", ENUM_RE],
    ["placeholder", PLACEHOLDER_RE],
  ] as const) {
    const m = rec.text.match(re);
    if (m) {
      out.push({
        findingId: `FIND-LEAK-${code}-${h12}`,
        code,
        severity: "error",
        caseId: rec.caseId,
        surfaceId: rec.surfaceId,
        textHash: rec.textHash,
        detail: `Leak pattern ${code}: ${m[0]}`,
        evidenceRef: rec.sourceEvidenceRef,
      });
    }
  }
  return out;
}

function detectDupChase(caseId: string, surfaces: SurfaceRecord[], evidenceRef: string): Finding[] {
  const labels = surfaces
    .filter((s) => s.surfaceId === "cps_chase_draft" || s.surfaceId === "chase_brief")
    .flatMap((s) =>
      s.text
        .split("\n")
        .map((l) => l.replace(/^•\s*/, "").replace(/^CPS chase —\s*/i, "").trim().toLowerCase())
        .filter(Boolean),
    )
    .filter((l) => !l.startsWith("total ") && !l.startsWith("item:") && !l.startsWith("status:"));
  const seen = new Set<string>();
  const dups = new Set<string>();
  for (const l of labels) {
    if (seen.has(l)) dups.add(l);
    seen.add(l);
  }
  return [...dups].map((label) => {
    const h = sha256Hex(label).slice(0, 12);
    return {
      findingId: `FIND-DUP-CHASE-${h}`,
      code: "duplicate_chase_label",
      severity: "warn" as const,
      caseId,
      surfaceId: "chase_brief",
      textHash: sha256Hex(label),
      detail: `Duplicate chase label within case: ${label}`,
      evidenceRef,
    };
  });
}

function reclassifyV1Findings(opts: {
  v1FindingsPath: string;
  v1SurfacesPath: string;
  v1StringIndexPath: string;
  outMapPath: string;
  outSummaryPath: string;
}): {
  total: number;
  byDisposition: Record<string, number>;
  bySurfaceProfile: Record<string, number>;
  byUniqueExact: Record<string, number>;
  byTemplate: Record<string, number>;
  byCase: number;
  occurrenceUnits: number;
} {
  const findings = fs
    .readFileSync(opts.v1FindingsPath, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l) as Finding);
  const stringIndex = fs.existsSync(opts.v1StringIndexPath)
    ? (JSON.parse(fs.readFileSync(opts.v1StringIndexPath, "utf8")) as Record<
        string,
        { text: string; count: number; templateHash: string }
      >)
    : {};

  // Index first surface row per textHash+surfaceId for context
  const surfaceByKey = new Map<string, { text: string; surfaceId: string; caseId: string }>();
  for (const line of fs.readFileSync(opts.v1SurfacesPath, "utf8").trim().split("\n").filter(Boolean)) {
    const s = JSON.parse(line) as SurfaceRecord;
    const k = `${s.textHash}|${s.surfaceId}|${s.caseId}`;
    if (!surfaceByKey.has(k)) surfaceByKey.set(k, { text: s.text, surfaceId: s.surfaceId, caseId: s.caseId });
  }

  type Disp =
    | "confirmed_defect"
    | "detector_false_positive"
    | "needs_human_review"
    | "duplicate_occurrence_of_shared_string"
    | "unresolved";

  const byDisposition: Record<string, number> = {};
  const bySurfaceProfile: Record<string, number> = {};
  const byUniqueExact: Record<string, number> = {};
  const byTemplate: Record<string, number> = {};
  const cases = new Set<string>();
  const primaryByHashIssue = new Map<string, string>(); // textHash|code -> findingId of primary
  const rows: Array<Record<string, unknown>> = [];

  for (const f of findings) {
    cases.add(f.caseId);
    let profile: string;
    try {
      profile = resolveSolicitorBoundaryProfile(f.surfaceId);
    } catch {
      profile = "unmapped";
    }
    bySurfaceProfile[profile] = (bySurfaceProfile[profile] || 0) + 1;

    const idx = stringIndex[f.textHash];
    const text =
      idx?.text ??
      surfaceByKey.get(`${f.textHash}|${f.surfaceId}|${f.caseId}`)?.text ??
      null;
    const templateHash = idx?.templateHash ?? (text ? sha256Hex(normaliseSolicitorTemplate(text)) : null);

    let disposition: Disp = "unresolved";
    let reason = "text_not_found";

    if (text != null) {
      byUniqueExact[f.textHash] = (byUniqueExact[f.textHash] || 0) + 1;
      if (templateHash) byTemplate[templateHash] = (byTemplate[templateHash] || 0) + 1;

      const primaryKey = f.textHash;
      const primaryId = primaryByHashIssue.get(primaryKey);
      if (primaryId && primaryId !== f.findingId) {
        disposition = "duplicate_occurrence_of_shared_string";
        reason = `shared_string_primary=${primaryId}; original_code=${f.code}`;
      } else {
        if (!primaryId) primaryByHashIssue.set(primaryKey, f.findingId);
        try {
          const reassessment = assessSolicitorVisibleBoundaryForSurface(text, f.surfaceId);
          if (reassessment.ok) {
            disposition = "detector_false_positive";
            reason = `surface_grammar=${reassessment.profile}; punctuation_heuristic_not_applicable`;
          } else {
            const codeBare = f.code.replace(/^boundary_/, "");
            if (reassessment.issues.includes(codeBare as (typeof reassessment.issues)[number])) {
              disposition = "confirmed_defect";
              reason = `profile=${reassessment.profile}; issues=${reassessment.issues.join(",")}`;
            } else if (reassessment.issues.length) {
              disposition = "needs_human_review";
              reason = `profile=${reassessment.profile}; original=${f.code}; now=${reassessment.issues.join(",")}`;
            } else {
              disposition = "needs_human_review";
              reason = `profile=${reassessment.profile}; empty_issue_set`;
            }
          }
        } catch (err) {
          disposition = "unresolved";
          reason = err instanceof Error ? err.message : String(err);
        }
      }
    }

    byDisposition[disposition] = (byDisposition[disposition] || 0) + 1;
    rows.push({
      findingId: f.findingId,
      v1Code: f.code,
      caseId: f.caseId,
      surfaceId: f.surfaceId,
      textHash: f.textHash,
      templateHash,
      surfaceProfile: profile,
      disposition,
      reason,
      evidenceRef: f.evidenceRef,
    });
  }

  ensureDir(path.dirname(opts.outMapPath));
  fs.writeFileSync(opts.outMapPath, rows.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf8");

  const summary = {
    v1FindingCount: findings.length,
    dispositionOccurrenceCounts: byDisposition,
    uniqueExactStringCount: Object.keys(byUniqueExact).length,
    normalisedTemplateCount: Object.keys(byTemplate).length,
    occurrenceCount: findings.length,
    affectedCaseCount: cases.size,
    occurrenceCountsBySurfaceProfile: bySurfaceProfile,
    note: "Counts are reported separately by unit — never combined. dispositionOccurrenceCounts sum to v1FindingCount.",
    uniqueExactDispositionRollup: (() => {
      const m: Record<string, Disp> = {};
      for (const r of rows) {
        const h = String(r.textHash);
        const d = r.disposition as Disp;
        // Unique-string rollup uses the primary disposition only (ignore duplicate rows).
        if (d === "duplicate_occurrence_of_shared_string") continue;
        const rank: Record<Disp, number> = {
          confirmed_defect: 5,
          needs_human_review: 4,
          unresolved: 3,
          detector_false_positive: 2,
          duplicate_occurrence_of_shared_string: 1,
        };
        if (!m[h] || rank[d] > rank[m[h]!]) m[h] = d;
      }
      const out: Record<string, number> = {};
      for (const d of Object.values(m)) out[d] = (out[d] || 0) + 1;
      return out;
    })(),
    confirmedDefectOccurrenceCount: rows.filter((r) => r.disposition === "confirmed_defect").length,
    confirmedDefectUniqueExactCount: new Set(
      rows.filter((r) => r.disposition === "confirmed_defect").map((r) => String(r.textHash)),
    ).size,
  };
  writeJson(opts.outSummaryPath, summary);
  return {
    total: findings.length,
    byDisposition,
    bySurfaceProfile,
    byUniqueExact,
    byTemplate,
    byCase: cases.size,
    occurrenceUnits: findings.length,
  };
}

function main() {
  const { limit, resume, outRun } = parseArgs(process.argv.slice(2));
  const OUT = path.join(MATERIALISATION_ROOT, outRun);
  ensureDir(OUT);
  ensureDir(path.join(OUT, "review-batches"));

  if (!fs.existsSync(path.join(RUN_V1, "findings.jsonl"))) {
    throw new Error(`run-v1 evidence missing at ${RUN_V1} — refuse to proceed without immutable baseline`);
  }

  const summary = readJson<{ cases: ScaleIdentity[] }>(SUMMARY_PATH);
  if (!summary?.cases?.length) throw new Error(`Missing or empty summary: ${SUMMARY_PATH}`);

  let identities = summary.cases.map((c) => ({
    caseId: c.caseId,
    family: c.family,
    trap: c.trap,
    layout: c.layout,
    sourceCaseId: c.sourceCaseId,
    scenario: c.scenario ?? "",
  }));
  if (limit != null) identities = identities.slice(0, limit);
  const requested = identities.length;

  const progressPath = path.join(OUT, "run-progress.json");
  const processedSet = new Set<string>();
  if (resume && fs.existsSync(progressPath)) {
    for (const id of readJson<{ processedCaseIds?: string[] }>(progressPath)?.processedCaseIds ?? []) {
      processedSet.add(id);
    }
  }

  const surfacesPath = path.join(OUT, "surfaces.jsonl");
  const identityPath = path.join(OUT, "identity-manifest.jsonl");
  const findingsPath = path.join(OUT, "findings.jsonl");
  const failedPath = path.join(OUT, "failed-identities.jsonl");
  const occurrencePath = path.join(OUT, "occurrence-map.jsonl");

  if (!resume) {
    for (const f of [surfacesPath, identityPath, findingsPath, failedPath, occurrencePath]) {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }
    const batchDir = path.join(OUT, "review-batches");
    if (fs.existsSync(batchDir)) {
      for (const f of fs.readdirSync(batchDir)) {
        fs.unlinkSync(path.join(batchDir, f));
      }
    }
  }

  const packCache = new Map<string, ResolvedPack | null>();
  const templateCache = new Map<string, BuiltTemplate>();
  const stringIndex = new Map<string, { text: string; count: number; templateHash: string }>();
  const templateIndex = new Map<string, { template: string; count: number; exampleHash: string }>();
  const occurrenceAcc = new Map<string, Array<{ caseId: string; surfaceId: string }>>();
  type ReviewItem = {
    textHash: string;
    text: string;
    blocked: boolean;
    occurrences: Array<{ caseId: string; surfaceId: string }>;
  };
  const reviewByHash = new Map<string, ReviewItem>();

  let processed = 0;
  let failed = 0;
  let skippedIncomplete = 0;
  let surfacesTotal = 0;
  let copyable = 0;
  let blocked = 0;
  let findingCount = 0;
  const processedCaseIds = [...processedSet];
  const centralIds = phase2CentralSurfaceIds();
  const seenSurfaceIds = new Set<string>();

  writeJson(path.join(OUT, "lane-separation.json"), {
    N_scale: N_SCALE,
    N_materialised_530: N_MATERIALISED_530,
    note: "Scale-3000 and ESA-530 materialised lanes must not be combined implicitly; any union denominator must be explicit (e.g. 3530).",
    programmePassSupported: false,
    run: outRun,
    preservesRunV1: path.relative(ROOT, RUN_V1).replace(/\\/g, "/"),
  });

  writeJson(path.join(OUT, "RUN-MANIFEST.json"), {
    lane: "scale3000",
    run: outRun,
    programmePassSupported: false,
    schemaVersion: SCHEMA_VERSION,
    pipelineVersion: PIPELINE_VERSION,
    summaryPath: path.relative(ROOT, SUMMARY_PATH).replace(/\\/g, "/"),
    outDir: path.relative(ROOT, OUT).replace(/\\/g, "/"),
    runV1Dir: path.relative(ROOT, RUN_V1).replace(/\\/g, "/"),
    phase2CentralSurfaceCount: centralIds.length,
    phase2CentralSurfaceIds: centralIds,
    surfaceMappingNote:
      "phase2CentralSurfaceIds (31) recorded for coverage accounting. Runner emits consolidated solicitor surfaces with mandatory surface-aware boundary profiles.",
    requested,
    limit,
    resume,
    generatedAt: new Date().toISOString(),
  });

  // Continue with the existing processing loop — OUT is now local.
  for (let i = 0; i < identities.length; i++) {
    const id = identities[i]!;
    if (processedSet.has(id.caseId)) continue;

    try {
      let pack = packCache.get(id.sourceCaseId);
      if (pack === undefined) {
        pack = resolveSourcePack(id.sourceCaseId);
        packCache.set(id.sourceCaseId, pack);
      }

      if (!pack) {
        skippedIncomplete += 1;
        failed += 1;
        findingCount += 1;
        appendJsonl(identityPath, [
          {
            caseId: id.caseId,
            sourceCaseId: id.sourceCaseId,
            family: id.family,
            trap: id.trap,
            layout: id.layout,
            status: "incomplete_source",
            findingId: "FIND-SRC-MISSING",
          },
        ]);
        appendJsonl(findingsPath, [
          {
            findingId: `FIND-SRC-MISSING-${sha256Hex(id.caseId).slice(0, 12)}`,
            code: "FIND-SRC-MISSING",
            severity: "error",
            caseId: id.caseId,
            surfaceId: "source_context",
            textHash: sha256Hex(""),
            detail: `No ESA / demo-pack / v9-catalog source for ${id.sourceCaseId}`,
            evidenceRef: id.sourceCaseId,
          },
        ]);
        appendJsonl(failedPath, [
          { caseId: id.caseId, sourceCaseId: id.sourceCaseId, reason: "incomplete_source" },
        ]);
        processedCaseIds.push(id.caseId);
        processed += 1;
      } else {
        let built = templateCache.get(id.sourceCaseId);
        if (!built) {
          built = buildTemplate(pack);
          templateCache.set(id.sourceCaseId, built);
        }
        const surfaces = materialiseIdentity(id, built);
        for (const s of surfaces) seenSurfaceIds.add(s.surfaceId);
        requireAllSurfacesHaveProfiles([...seenSurfaceIds]);
        const overviewSurf = surfaces.find((s) => s.surfaceId === "overview_counts");
        const truthSurf = surfaces.find((s) => s.surfaceId === "truth_map" && s.canCopy);
        if (overviewSurf && truthSurf) {
          const overviewCounts = parseOverviewCountsLine(overviewSurf.text);
          if (!overviewCounts) {
            throw new Error(`FIND-COUNT-PARSE overview_counts unparseable for ${id.caseId}`);
          }
          const fromTruth = countOverviewCategoriesFromDisplayItems(
            parseTruthMapCanonicalStates(truthSurf.text).map((existence) => ({ existence })),
          );
          assertCountsEqual(fromTruth, overviewCounts, `invariant overview↔truth_map ${id.caseId}`);
        }
        surfacesTotal += surfaces.length;
        for (const s of surfaces) {
          if (s.canCopy) copyable += 1;
          if (s.blockedNotRepaired || !s.canCopy) blocked += 1;
          const tpl = normaliseSolicitorTemplate(s.text);
          const tplHash = sha256Hex(tpl);
          const cur = stringIndex.get(s.textHash);
          if (cur) cur.count += 1;
          else stringIndex.set(s.textHash, { text: s.text, count: 1, templateHash: tplHash });
          const tcur = templateIndex.get(tplHash);
          if (tcur) tcur.count += 1;
          else templateIndex.set(tplHash, { template: tpl, count: 1, exampleHash: s.textHash });
          const occKey = `${tplHash}|${s.textHash}`;
          const occ = occurrenceAcc.get(occKey) ?? [];
          occ.push({ caseId: s.caseId, surfaceId: s.surfaceId });
          occurrenceAcc.set(occKey, occ);
          const rev = reviewByHash.get(s.textHash);
          if (rev) rev.occurrences.push({ caseId: s.caseId, surfaceId: s.surfaceId });
          else {
            reviewByHash.set(s.textHash, {
              textHash: s.textHash,
              text: s.text,
              blocked: !s.canCopy,
              occurrences: [{ caseId: s.caseId, surfaceId: s.surfaceId }],
            });
          }
        }
        const findings = [
          ...surfaces.flatMap(scanSurface),
          ...detectDupChase(id.caseId, surfaces, pack.sourceEvidenceRef),
        ];
        findingCount += findings.length;
        appendJsonl(surfacesPath, surfaces);
        appendJsonl(findingsPath, findings);
        appendJsonl(identityPath, [
          {
            caseId: id.caseId,
            sourceCaseId: id.sourceCaseId,
            family: id.family,
            trap: id.trap,
            layout: id.layout,
            status: "materialised",
            surfaceCount: surfaces.length,
            sourceKind: pack.kind,
            offenceFamilyState: built.offenceFamilyState,
          },
        ]);
        processedCaseIds.push(id.caseId);
        processed += 1;
      }
    } catch (err) {
      failed += 1;
      appendJsonl(failedPath, [
        {
          caseId: id.caseId,
          sourceCaseId: id.sourceCaseId,
          reason: err instanceof Error ? err.message : String(err),
        },
      ]);
      processedCaseIds.push(id.caseId);
      processed += 1;
    }

    if (processed % 50 === 0 || i === identities.length - 1) {
      writeJson(progressPath, {
        processedCaseIds,
        processed,
        failed,
        skippedIncomplete,
        surfacesTotal,
        updatedAt: new Date().toISOString(),
      });
      console.error(
        `[scale3000-materialise:${outRun}] ${processed}/${identities.length} processed (failed=${failed} incomplete=${skippedIncomplete} surfaces=${surfacesTotal})`,
      );
    }
  }

  requireAllSurfacesHaveProfiles([...seenSurfaceIds]);

  appendJsonl(
    occurrencePath,
    [...occurrenceAcc.entries()].map(([key, occs]) => {
      const [templateHash, exactHash] = key.split("|");
      return { templateHash, exactHash, occurrences: occs };
    }),
  );

  const stringObj: Record<string, { text: string; count: number; templateHash: string }> = {};
  for (const [h, v] of stringIndex) stringObj[h] = v;
  writeJson(path.join(OUT, "string-index.json"), stringObj);
  const templateObj: Record<string, { template: string; count: number; exampleHash: string }> = {};
  for (const [h, v] of templateIndex) templateObj[h] = v;
  writeJson(path.join(OUT, "template-index.json"), templateObj);

  const unblocked = [...reviewByHash.values()].filter((r) => !r.blocked);
  const blockedItems = [...reviewByHash.values()].filter((r) => r.blocked);
  const batches: string[] = [];
  let batchNo = 0;
  const flushBatch = (items: ReviewItem[], tag: "copyable" | "blocked") => {
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      batchNo += 1;
      const name = `batch-${String(batchNo).padStart(3, "0")}.json`;
      writeJson(path.join(OUT, "review-batches", name), {
        batchId: `batch-${String(batchNo).padStart(3, "0")}`,
        tag,
        count: items.slice(i, i + BATCH_SIZE).length,
        items: items.slice(i, i + BATCH_SIZE),
      });
      batches.push(name);
    }
  };
  flushBatch(unblocked, "copyable");
  flushBatch(blockedItems, "blocked");

  fs.writeFileSync(
    path.join(OUT, "review-batches", "INDEX.md"),
    [
      `# Review batches — scale3000 solicitor materialisation (${outRun})`,
      "",
      `Unique exact strings: ${reviewByHash.size}`,
      `Copyable preferred first; blocked samples tagged \`blocked\`. Max ${BATCH_SIZE} per batch.`,
      `Surface-aware boundary profiles; run-v1 preserved immutable.`,
      "",
      ...batches.map((b, i) => `${i + 1}. [${b}](./${b})`),
      "",
    ].join("\n"),
    "utf8",
  );

  const disposition = reclassifyV1Findings({
    v1FindingsPath: path.join(RUN_V1, "findings.jsonl"),
    v1SurfacesPath: path.join(RUN_V1, "surfaces.jsonl"),
    v1StringIndexPath: path.join(RUN_V1, "string-index.json"),
    outMapPath: path.join(OUT, "v1-finding-disposition-map.jsonl"),
    outSummaryPath: path.join(OUT, "v1-finding-disposition-summary.json"),
  });

  writeJson(path.join(OUT, "hashes.json"), {
    surfaces: fileHash(surfacesPath),
    identityManifest: fileHash(identityPath),
    findings: fileHash(findingsPath),
    stringIndex: fileHash(path.join(OUT, "string-index.json")),
    templateIndex: fileHash(path.join(OUT, "template-index.json")),
    occurrenceMap: fileHash(occurrencePath),
    laneSeparation: fileHash(path.join(OUT, "lane-separation.json")),
    v1FindingDispositionMap: fileHash(path.join(OUT, "v1-finding-disposition-map.jsonl")),
    runV1SurfacesPreserved: fileHash(path.join(RUN_V1, "surfaces.jsonl")),
    runV1FindingsPreserved: fileHash(path.join(RUN_V1, "findings.jsonl")),
  });

  fs.writeFileSync(
    path.join(OUT, "progress-report.md"),
    [
      `# Progress — scale3000 solicitor materialisation (${outRun})`,
      "",
      `- requested: ${requested}`,
      `- processed: ${processed}`,
      `- failed: ${failed}`,
      `- skippedIncomplete: ${skippedIncomplete}`,
      `- surfacesTotal: ${surfacesTotal}`,
      `- copyable: ${copyable}`,
      `- blocked: ${blocked}`,
      `- exactUnique: ${stringIndex.size}`,
      `- templateUnique: ${templateIndex.size}`,
      `- batchCount: ${batches.length}`,
      `- findingCount: ${findingCount}`,
      `- phase2CentralSurfaceIds: ${centralIds.length}`,
      `- pipelineVersion: ${PIPELINE_VERSION}`,
      `- programmePassSupported: false`,
      "",
      `## run-v1 finding reclassification (occurrences)`,
      `- v1 findings: ${disposition.total}`,
      ...Object.entries(disposition.byDisposition).map(([k, v]) => `- ${k}: ${v}`),
      "",
      `N_scale=${N_SCALE}, N_materialised_530=${N_MATERIALISED_530} — do not merge denominators without an explicit union.`,
      `run-v1 immutable at ${path.relative(ROOT, RUN_V1).replace(/\\/g, "/")}.`,
      "",
    ].join("\n"),
    "utf8",
  );

  writeJson(progressPath, {
    processedCaseIds,
    processed,
    failed,
    skippedIncomplete,
    surfacesTotal,
    completed: true,
    run: outRun,
    updatedAt: new Date().toISOString(),
  });

  console.log(
    JSON.stringify(
      {
        run: outRun,
        requested,
        processed,
        failed,
        skippedIncomplete,
        surfacesTotal,
        copyable,
        blocked,
        exactUnique: stringIndex.size,
        templateUnique: templateIndex.size,
        batchCount: batches.length,
        findingCount,
        v1Disposition: disposition.byDisposition,
        outDir: path.relative(ROOT, OUT).replace(/\\/g, "/"),
        firstBatchPath: batches.length
          ? path.relative(ROOT, path.join(OUT, "review-batches", batches[0]!)).replace(/\\/g, "/")
          : null,
        reproductionCommands: [
          "npx tsx scripts/integrity-programme/scale3000-solicitor-materialisation.ts",
          "npx tsx scripts/integrity-programme/scale3000-solicitor-materialisation.ts --limit=20",
          "npx tsx scripts/integrity-programme/scale3000-solicitor-materialisation.ts --resume",
        ],
      },
      null,
      2,
    ),
  );
}

main();
