/**
 * Phase 11 remediation — regenerate blinded v2 comparison set from frozen v1 membership.
 * Does NOT modify v1 freeze/hash/renders/reports.
 *
 * Run: npx tsx scripts/integrity-programme/phase11-remediation-v2.ts
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
import {
  canUseSolicitorApiResponse,
  solicitorUiStateFromApiBody,
} from "@/lib/criminal/integrity-blocked-consumer";
import {
  displayForSafelyOmitted,
  REVIEW_REQUIRED_NEUTRAL,
} from "@/lib/criminal/structured-solicitor-output";
import {
  isInternalNonSolicitorString,
  QUALIFIED_SOLICITOR_REVIEW_QUEUE_BANNER,
  requiresQualifiedSolicitorReviewQueue,
  solicitorDisplayLabel,
  solicitorVisibleGatedCopy,
} from "@/lib/criminal/solicitor-visible-sanitization";

const ROOT = path.resolve(__dirname, "../..");
const V1 = path.join(ROOT, "artifacts/casebrain-qa/integrity-programme/phase-11");
const OUT = path.join(ROOT, "artifacts/casebrain-qa/integrity-programme/phase-11-remediation");
const V2 = path.join(OUT, "v2");
const RENDER = path.join(V2, "rendered");
const BUNDLE = path.join(V2, "reviewer-bundle");
const BEFORE_AFTER = path.join(OUT, "before-after-surfaces");
const DOCS = path.join(ROOT, "docs/integrity-programme");
const ESA = path.join(ROOT, "artifacts/evidence-state-audit-local/cases");
const GOLD_PACK = path.join(ROOT, "artifacts/casebrain-qa/gold-manual-proof-set-v1");

const V1_FREEZE_HASH = "619f62a2d3408edf05cdb3e57304f4cdfd0e59a2c2247ab5a22fde973f5a9e3a";

type SampleDef = {
  goldId: string;
  stratum?: string;
  sourceKind: string;
  fixtureId: string;
  selectionReason?: string;
  reviewFocus?: string;
};

type Surface = {
  surface: string;
  label: string;
  solicitorVisibleText: string;
  gateStatus: string;
  canCopy: boolean | null;
  sourceEvidenceAvailable: boolean;
  sourceEvidenceNote: string;
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

function evidenceRowsFromTruth(truth: Record<string, unknown>): FiveAnswersEvidenceRow[] {
  const rows: FiveAnswersEvidenceRow[] = [];
  const items = (truth.evidenceItems as Array<Record<string, unknown>> | undefined) ?? [];
  for (const it of items) {
    const label = String(it.label ?? it.evidence_item ?? it.name ?? "").trim();
    if (!label) continue;
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
  return items.map((c) => ({ label: String(c.label ?? "").trim() })).filter((c) => c.label);
}

function mapAuditToSolicitor(auditFamily: string) {
  return (
    mapAuditScenarioFamilyToSolicitor(auditFamily) ??
    resolveSolicitorOffenceFamily({ allegation: auditFamily.replace(/-/g, " "), bundleHay: auditFamily }).family
  );
}

function writeBlindMarkdown(goldId: string, surfaces: Surface[]) {
  const lines = [
    `# ${goldId} — solicitor-visible render (v2)`,
    "",
    "> Solicitor-facing text only. No stratum, selection reason, review focus, hypothesis, or prediction metadata.",
    "> Blocked ≠ repaired. Human judgments belong only in the blank workbook.",
    "",
  ];
  for (const s of surfaces) {
    lines.push(`## ${s.label}`);
    lines.push("");
    lines.push(`Source evidence: ${s.sourceEvidenceAvailable ? "available (see note)" : "unavailable / controlled synthetic"}`);
    lines.push(`Note: ${s.sourceEvidenceNote}`);
    lines.push("");
    lines.push("```text");
    lines.push(s.solicitorVisibleText);
    lines.push("```");
    lines.push("");
  }
  fs.writeFileSync(path.join(RENDER, `${goldId}.md`), lines.join("\n"), "utf8");
  fs.writeFileSync(path.join(RENDER, `${goldId}.json`), JSON.stringify({ goldId, surfaces }, null, 2), "utf8");
}

function renderSynthetic(def: SampleDef): Surface[] {
  const allegation = "Harassment contrary to Protection from Harassment Act";
  const hay = "WhatsApp screenshots MG11 phone extraction subscriber";
  const id = def.fixtureId;
  const surfaces: Surface[] = [];
  const note = "Controlled synthetic probe — no client bundle on disk.";

  if (id === "SYN-TRUNC-01") {
    const text = "The attribution remains outstan";
    const gated = gateSolicitorOutput({
      surfaceId: "phase11_v2_trunc_copy",
      texts: [text],
      allegation,
      bundleHay: hay,
      mode: "copy",
      data: { texts: [text] },
    });
    const vis = solicitorVisibleGatedCopy({
      text,
      canCopy: gated.canCopy,
      blockedBanner: gated.banner,
    });
    surfaces.push({
      surface: "copy_preview",
      label: "Copy preview",
      solicitorVisibleText: vis.display,
      gateStatus: vis.gateStatus,
      canCopy: vis.canCopy,
      sourceEvidenceAvailable: false,
      sourceEvidenceNote: note,
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
      sourceEvidenceAvailable: false,
      sourceEvidenceNote: note,
    });
  } else if (id === "SYN-OMIT-01" || id === "SYN-RR-01") {
    const omitted = displayForSafelyOmitted("|| raw | table | fragment ||");
    surfaces.push({
      surface: "overview_field",
      label: "Overview field after safe omit",
      solicitorVisibleText: omitted.display ?? REVIEW_REQUIRED_NEUTRAL,
      gateStatus: omitted.kind,
      canCopy: false,
      sourceEvidenceAvailable: false,
      sourceEvidenceNote: note,
    });
  } else if (id === "SYN-RR-PLACEHOLDER-01") {
    const text = "Please chase {{MISSING_ITEM}} before the hearing.";
    const gated = gateSolicitorOutput({
      surfaceId: "phase11_v2_placeholder",
      texts: [text],
      allegation,
      bundleHay: hay,
      mode: "copy",
      data: { texts: [text] },
    });
    const vis = solicitorVisibleGatedCopy({ text, canCopy: gated.canCopy, blockedBanner: gated.banner });
    surfaces.push({
      surface: "copy_preview",
      label: "Copy preview",
      solicitorVisibleText: vis.display,
      gateStatus: vis.gateStatus,
      canCopy: vis.canCopy,
      sourceEvidenceAvailable: false,
      sourceEvidenceNote: note,
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
      sourceEvidenceAvailable: false,
      sourceEvidenceNote: note,
    });
  } else if (id === "SYN-API-BLOCK-01") {
    const body = integrityBlockedApiBody("phase11_v2_api", ["sentence.truncated_fragment"]);
    const ui = solicitorUiStateFromApiBody(body);
    surfaces.push({
      surface: "api_consumer_ui",
      label: "API consumer message",
      solicitorVisibleText: ui.banner ?? QUALIFIED_SOLICITOR_REVIEW_QUEUE_BANNER,
      gateStatus: "integrity_blocked",
      canCopy: false,
      sourceEvidenceAvailable: false,
      sourceEvidenceNote: note,
    });
    surfaces.push({
      surface: "api_usable_check",
      label: "API usability",
      solicitorVisibleText: canUseSolicitorApiResponse(body)
        ? "USABLE (unexpected)"
        : "NOT USABLE — integrity-blocked response rejected",
      gateStatus: "consumer_reject",
      canCopy: false,
      sourceEvidenceAvailable: false,
      sourceEvidenceNote: note,
    });
  } else if (id === "SYN-EXPORT-FAMILY-01" || id === "SYN-FAM-LEAK-01") {
    const text = "Consider defensive force and PWITS continuity on this harassment matter.";
    const gated = gateSolicitorOutput({
      surfaceId: "phase11_v2_family_export",
      texts: [text],
      allegation,
      bundleHay: hay,
      auditFamily: "harassment_digital",
      mode: "export",
      data: { texts: [text] },
    });
    const vis = solicitorVisibleGatedCopy({ text, canCopy: gated.canCopy, blockedBanner: gated.banner });
    surfaces.push({
      surface: "export_preview",
      label: "Export preview",
      solicitorVisibleText: vis.display,
      gateStatus: vis.gateStatus,
      canCopy: vis.canCopy,
      sourceEvidenceAvailable: false,
      sourceEvidenceNote: note,
    });
  } else if (id === "SYN-COPY-SAFE-01") {
    const text = "Attribution remains outstanding on the served screenshots.";
    const gated = gateSolicitorOutput({
      surfaceId: "phase11_v2_safe_copy",
      texts: [text],
      allegation,
      bundleHay: hay,
      auditFamily: "harassment_digital",
      mode: "copy",
      data: { texts: [text] },
    });
    const vis = solicitorVisibleGatedCopy({ text, canCopy: gated.canCopy, blockedBanner: gated.banner });
    surfaces.push({
      surface: "copy_preview",
      label: "Copy preview (safe control)",
      solicitorVisibleText: vis.display,
      gateStatus: vis.gateStatus,
      canCopy: vis.canCopy,
      sourceEvidenceAvailable: false,
      sourceEvidenceNote: note,
    });
  } else {
    throw new Error(`Unknown synthetic ${id}`);
  }
  return surfaces;
}

function renderGoldManual(def: SampleDef): Surface[] {
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
  const surfaces: Surface[] = [];
  const note = summary
    ? `Gold-manual packet ${goldId} actual-summary (controlled fictional bundle).`
    : `Gold packet missing at ${summaryPath}`;
  if (!summary) {
    surfaces.push({
      surface: "missing_packet",
      label: "Case packet",
      solicitorVisibleText: "Source packet unavailable — cannot assess substantive correctness without papers.",
      gateStatus: "missing",
      canCopy: false,
      sourceEvidenceAvailable: false,
      sourceEvidenceNote: note,
    });
    return surfaces;
  }

  surfaces.push({
    surface: "case_header",
    label: "Case header",
    solicitorVisibleText: `Client: ${summary.clientLabel ?? "(unlabelled)"}\nAllegation: ${summary.allegation ?? "(none)"}`,
    gateStatus: "display",
    canCopy: true,
    sourceEvidenceAvailable: true,
    sourceEvidenceNote: note,
  });

  if (summary.courtLine) {
    const gated = gateSolicitorOutput({
      surfaceId: "phase11_v2_court_line",
      texts: [summary.courtLine],
      allegation: summary.allegation ?? "",
      bundleHay: JSON.stringify(summary.truthMapRows ?? []).slice(0, 400),
      mode: "copy",
      data: { texts: [summary.courtLine] },
    });
    const vis = solicitorVisibleGatedCopy({
      text: summary.courtLine,
      canCopy: gated.canCopy,
      blockedBanner: gated.banner,
      queueForQualifiedReview: requiresQualifiedSolicitorReviewQueue(summary.courtLine),
    });
    surfaces.push({
      surface: "court_line",
      label: "Court line",
      solicitorVisibleText: vis.display,
      gateStatus: vis.gateStatus,
      canCopy: vis.canCopy,
      sourceEvidenceAvailable: true,
      sourceEvidenceNote: note,
    });
  }

  if (summary.clientSummaryPreview) {
    surfaces.push({
      surface: "client_summary",
      label: "Client-safe summary",
      solicitorVisibleText: summary.clientSummaryPreview,
      gateStatus: "display",
      canCopy: true,
      sourceEvidenceAvailable: true,
      sourceEvidenceNote: note,
    });
  }

  for (const chase of (summary.cpsChase ?? []).slice(0, 4)) {
    surfaces.push({
      surface: "cps_chase_draft",
      label: `CPS chase — ${solicitorDisplayLabel(chase.label)}`,
      solicitorVisibleText: chase.draft.replace(/\bmg(\d+[a-z]?)\b/gi, (_, n: string) => `MG${String(n).toUpperCase()}`),
      gateStatus: "display",
      canCopy: true,
      sourceEvidenceAvailable: true,
      sourceEvidenceNote: note,
    });
  }

  if (summary.truthMapRows?.length) {
    surfaces.push({
      surface: "truth_map",
      label: "Evidence truth map",
      solicitorVisibleText: summary.truthMapRows
        .slice(0, 12)
        .map((r) => `• ${solicitorDisplayLabel(r.label)} — ${r.existence}`)
        .join("\n"),
      gateStatus: "display",
      canCopy: true,
      sourceEvidenceAvailable: true,
      sourceEvidenceNote: note,
    });
  }

  if (summary.doNotOverstate?.length) {
    surfaces.push({
      surface: "do_not_overstate",
      label: "Do-not-overstate warnings",
      solicitorVisibleText: summary.doNotOverstate.map((x) => `• ${x}`).join("\n"),
      gateStatus: "warning",
      canCopy: false,
      sourceEvidenceAvailable: true,
      sourceEvidenceNote: note,
    });
  }

  return surfaces;
}

function renderEsa(def: SampleDef): Surface[] {
  const caseId = def.fixtureId.includes(":") ? def.fixtureId.split(":")[1]! : def.fixtureId;
  const truthPath = path.join(ESA, caseId, "truth-key.json");
  const truth = readJson<Record<string, unknown>>(truthPath) ?? {};
  const output = readJson<Record<string, unknown>>(path.join(ESA, caseId, "casebrain-output.json"));
  const surfaces: Surface[] = [];
  const sourceAvailable = fs.existsSync(truthPath);
  const note = sourceAvailable
    ? `ESA truth-key for ${caseId}${output ? " (+ casebrain-output)" : " (truth-key only; full output unavailable)"}.`
    : `ESA materials unavailable for ${caseId}.`;

  if (!sourceAvailable) {
    surfaces.push({
      surface: "missing_source",
      label: "Source context",
      solicitorVisibleText: "Source evidence unavailable — substantive correctness cannot be fully assessed.",
      gateStatus: "missing",
      canCopy: false,
      sourceEvidenceAvailable: false,
      sourceEvidenceNote: note,
    });
    return surfaces;
  }

  const auditFamily = String(truth.family ?? truth.scenarioFamily ?? truth.offenceFamily ?? "unknown");
  const family = mapAuditToSolicitor(auditFamily);
  const allegation = String(truth.allegation ?? truth.charge ?? truth.title ?? caseId);
  const evidenceRows = evidenceRowsFromTruth(truth);
  const chaseItems = chaseItemsFromTruth(truth);
  const strings: string[] = [];
  walkStrings(output ?? truth, strings);
  const hay = strings.filter((s) => !isInternalNonSolicitorString(s)).slice(0, 20).join("\n").slice(0, 2000);

  const hearing = resolveSolicitorHearingStatus({
    bundleNextHearingIso: (truth.nextHearingIso as string) ?? (truth.hearingDateIso as string) ?? null,
    nextHearingRaw: (truth.nextHearing as string) ?? null,
    bundleHay: hay,
    asOf: new Date("2026-07-21T12:00:00Z"),
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
  });

  surfaces.push({
    surface: "hearing_status_strip",
    label: "Hearing status",
    solicitorVisibleText: formatHearingStatusForDisplay(hearing),
    gateStatus: hearing.kind,
    canCopy: true,
    sourceEvidenceAvailable: true,
    sourceEvidenceNote: note,
  });

  surfaces.push({
    surface: "offence_family",
    label: "Offence family (solicitor)",
    solicitorVisibleText:
      family === "unknown"
        ? "Offence family not safely resolved — treat wording as provisional."
        : `Offence family resolved for this matter.`,
    gateStatus: family === "unknown" ? "uncertain" : "resolved",
    canCopy: true,
    sourceEvidenceAvailable: true,
    sourceEvidenceNote: note,
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

  surfaces.push({
    surface: "chase_brief",
    label: "Disclosure chase list",
    solicitorVisibleText:
      `Total ${chaseBrief.counters.total}\n` +
      (chaseBrief.items.slice(0, 8).map((it) => `• ${solicitorDisplayLabel(it.label)}`).join("\n") ||
        "(no chase items)"),
    gateStatus: "display",
    canCopy: true,
    sourceEvidenceAvailable: true,
    sourceEvidenceNote: note,
  });

  const sampleTexts = strings
    .filter((t) => t.length >= 24 && !isInternalNonSolicitorString(t))
    .filter((t) => assessSolicitorSentence(t).issues.length === 0 || /attribution|outstanding|missing|served/i.test(t))
    .slice(0, 4);
  if (sampleTexts.length === 0) {
    sampleTexts.push("Attribution remains outstanding on the served screenshots.");
  }

  for (const t of sampleTexts) {
    const gated = gateSolicitorOutput({
      surfaceId: "phase11_v2_case_copy",
      texts: [t],
      allegation,
      bundleHay: hay,
      auditFamily,
      mode: "copy",
      data: { texts: [t] },
    });
    const vis = solicitorVisibleGatedCopy({
      text: t,
      canCopy: gated.canCopy,
      blockedBanner: gated.banner,
      queueForQualifiedReview: requiresQualifiedSolicitorReviewQueue(t),
    });
    surfaces.push({
      surface: "copy_preview",
      label: "Copy preview",
      solicitorVisibleText: vis.display,
      gateStatus: vis.gateStatus,
      canCopy: vis.canCopy,
      sourceEvidenceAvailable: true,
      sourceEvidenceNote: note,
    });
  }

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
  const leakGate = gateSolicitorOutput({
    surfaceId: "phase11_v2_leak_probe",
    texts: [leakProbe],
    allegation,
    bundleHay: hay,
    auditFamily,
    mode: "copy",
    data: { texts: [leakProbe] },
  });
  const leakVis = solicitorVisibleGatedCopy({
    text: leakProbe,
    canCopy: leakGate.canCopy,
    blockedBanner: leakGate.banner,
  });
  surfaces.push({
    surface: "family_leak_probe",
    label: "Cross-family containment probe",
    solicitorVisibleText: leakVis.display,
    gateStatus: leakVis.gateStatus,
    canCopy: leakVis.canCopy,
    sourceEvidenceAvailable: true,
    sourceEvidenceNote: note,
  });

  buildCanonicalMatterStateV1({
    caseId,
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

  return surfaces;
}

function main() {
  ensureDir(OUT);
  ensureDir(V2);
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
  // Preserve v1 — never write into V1 paths from this runner except read.

  const samples = v1Frozen.samples;
  const fixtureCounts = new Map<string, number>();
  for (const s of samples) fixtureCounts.set(s.fixtureId, (fixtureCounts.get(s.fixtureId) ?? 0) + 1);
  const duplicateFixtures = [...fixtureCounts.entries()].filter(([, n]) => n > 1);

  const duplicationDisclosure = {
    v1Ids: samples.length,
    uniqueFixtures: fixtureCounts.size,
    duplicateFixtures: duplicateFixtures.map(([id, n]) => ({ fixtureId: id, occurrences: n })),
    uniqueRenderBodiesNote:
      "v1 independent review reported 28 unique render bodies after body-only comparison; this remediation keeps the same 33 goldIds for before/after comparison.",
    v2MembershipPolicy:
      "SAME 33 goldIds / fixtures regenerated for comparison. Exact fixture repeats across strata are JUSTIFIED (multi-angle review of the same papers: accepted vs blocked vs uncertain). Membership not silently changed.",
  };

  const frozenAt = new Date().toISOString();
  const v2Defs = samples.map((s) => ({
    goldId: s.goldId,
    sourceKind: s.sourceKind,
    fixtureId: s.fixtureId,
  }));
  const freezePayload = {
    version: "phase11-gold-sample-v2",
    frozenAt,
    parentV1FreezeHash: V1_FREEZE_HASH,
    actualSize: v2Defs.length,
    samples: v2Defs,
    duplicationDisclosure,
  };
  const freezeHash = sha256(JSON.stringify(freezePayload));
  const frozenSample = { ...freezePayload, freezeHash, frozen: true as const };
  fs.writeFileSync(path.join(V2, "gold-sample-frozen-v2.json"), JSON.stringify(frozenSample, null, 2), "utf8");

  const predictions: unknown[] = [];
  const humanSlots: unknown[] = [];
  const beforeAfter: unknown[] = [];
  let surfacesTotal = 0;
  let changedSurfaces = 0;

  for (const def of samples) {
    const surfaces =
      def.sourceKind === "synthetic_controlled"
        ? renderSynthetic(def)
        : def.sourceKind === "gold_manual_pack"
          ? renderGoldManual(def)
          : renderEsa(def);
    writeBlindMarkdown(def.goldId, surfaces);
    surfacesTotal += surfaces.length;

    const v1Json = readJson<{
      surfaces: Array<{ surface: string; solicitorVisibleText: string; gateStatus: string; canCopy: boolean | null }>;
    }>(path.join(V1, "rendered", `${def.goldId}.json`));
    const changes: unknown[] = [];
    const v1Surfaces = v1Json?.surfaces ?? [];
    for (let i = 0; i < Math.max(surfaces.length, v1Surfaces.length); i++) {
      const after = surfaces[i];
      const before = v1Surfaces[i];
      if (!after && before) {
        changes.push({ surface: before.surface, before: { gateStatus: before.gateStatus, canCopy: before.canCopy, textPreview: before.solicitorVisibleText.slice(0, 160) }, after: null });
        changedSurfaces += 1;
        continue;
      }
      if (after && !before) {
        changes.push({ surface: after.surface, before: null, after: { gateStatus: after.gateStatus, canCopy: after.canCopy, textPreview: after.solicitorVisibleText.slice(0, 160) } });
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
    beforeAfter.push({ goldId: def.goldId, changeCount: changes.length, changes });
    fs.writeFileSync(
      path.join(BEFORE_AFTER, `${def.goldId}.json`),
      JSON.stringify({ goldId: def.goldId, changes }, null, 2),
      "utf8",
    );

    // automated prediction (separate archive later)
    const blocked = surfaces.some((s) => s.canCopy === false);
    predictions.push({
      goldId: def.goldId,
      predictedClassification: blocked ? "blocked_or_review" : "accepted",
      predictedFpFnHypothesis: "not_for_blinded_bundle",
      evidenceReference: `phase-11-remediation/v2/rendered/${def.goldId}.md`,
    });
    humanSlots.push({
      goldId: def.goldId,
      expectedClassification: null,
      actualClassification: null,
      falsePositive: null,
      falseNegative: null,
      substantiveWordingJudgment: null,
      reviewerDecision: null,
      rationale: null,
      evidenceReference: `artifacts/casebrain-qa/integrity-programme/phase-11-remediation/v2/rendered/${def.goldId}.md`,
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
    path.join(OUT, "automated-predictions-v2.json"),
    JSON.stringify(
      {
        generatedAt: frozenAt,
        freezeHash,
        separationRule: "AUTOMATED ONLY — excluded from blinded reviewer bundle",
        parentV1FreezeHash: V1_FREEZE_HASH,
        predictions,
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
    status: "AWAITING_HUMAN_GOLD_REVIEW",
    instructions: [
      "v2 remediation comparison set — still awaiting independent qualified human review.",
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
  fs.writeFileSync(path.join(V2, "human-judgment-workbook.json"), JSON.stringify(humanWorkbook, null, 2), "utf8");

  // Blinded reviewer bundle
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
    purpose: "Blinded v2 order — no automated predictions, stratum, selectionReason, reviewFocus, or expected classification",
    freezeHash,
    parentV1FreezeHash: V1_FREEZE_HASH,
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
    const rj = readJson<{ surfaces: Surface[] }>(path.join(RENDER, `${s.goldId}.json`));
    const packet = {
      goldId: s.goldId,
      freezeHash,
      parentV1FreezeHash: V1_FREEZE_HASH,
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
        rj?.surfaces?.[0]?.sourceEvidenceNote ??
        "See render Source evidence notes; where unavailable this is stated explicitly.",
    };
    fs.writeFileSync(path.join(caseDir, "packet.json"), JSON.stringify(packet, null, 2), "utf8");
  }

  fs.writeFileSync(
    path.join(BUNDLE, "INSTRUCTIONS.md"),
    `# Phase 11 v2 gold review — instructions

**Status:** AWAITING_HUMAN_GOLD_REVIEW (remediation comparison set)  
**v2 freeze hash:** \`${freezeHash}\`  
**Parent v1 freeze hash (preserved):** \`${V1_FREEZE_HASH}\`

## Definitions

- **Accepted** — solicitor-visible wording is appropriate to show/copy.
- **Blocked** — copy/export withheld. Blocked ≠ repaired.
- **Review-required** — neutral review message; not silent omission.
- **Uncertain** — family/hearing/provenance not safely resolved.
- **FP** — over-block of safe wording.
- **FN** — under-block of unsafe wording (safety FN is a blocker).
- **Substantive correctness** — word-for-word accuracy; separate from “was it blocked?”.

Follow \`blinded-review-order.json\`. Do not consult automated-predictions-v2.json while judging.
`,
    "utf8",
  );

  fs.writeFileSync(
    path.join(BUNDLE, "HUMAN_JUDGMENT_FORM.md"),
    `# Phase 11 v2 — human judgment form

Freeze hash: \`${freezeHash}\`  
Parent v1: \`${V1_FREEZE_HASH}\`  
Workbook: \`human-judgment-workbook.json\`

| Field | Value |
|-------|-------|
| Reviewer identity | |
| Role | |
| Review date | |

Per case: goldId · expected · actual · FP · FN · substantive wording · decision · rationale.
`,
    "utf8",
  );

  fs.writeFileSync(
    path.join(BUNDLE, "MANIFEST.json"),
    JSON.stringify(
      {
        bundleId: "phase11-reviewer-bundle-v2",
        freezeHash,
        parentV1FreezeHash: V1_FREEZE_HASH,
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

  // Verify key FN remediations
  const g021 = readJson<{ surfaces: Surface[] }>(path.join(RENDER, "GOLD-11-021.json"));
  const g025 = readJson<{ surfaces: Surface[] }>(path.join(RENDER, "GOLD-11-025.json"));
  const g022 = readJson<{ surfaces: Surface[] }>(path.join(RENDER, "GOLD-11-022.json"));
  const g033 = readJson<{ surfaces: Surface[] }>(path.join(RENDER, "GOLD-11-033.json"));
  const fnChecks = {
    "GOLD-11-021_trunc_not_copyable": g021?.surfaces.every((s) => s.canCopy === false) === true,
    "GOLD-11-025_placeholder_not_copyable": g025?.surfaces.every((s) => s.canCopy === false) === true,
    "GOLD-11-022_title_withheld": g022?.surfaces.some((s) => /withheld/i.test(s.solicitorVisibleText)) === true,
    "GOLD-11-033_title_withheld": g033?.surfaces.some((s) => /withheld/i.test(s.solicitorVisibleText)) === true,
    "no_ellipsis_title_shown_022": g022?.surfaces.every((s) => !/said…/.test(s.solicitorVisibleText)) === true,
    "no_ellipsis_title_shown_033": g033?.surfaces.every((s) => !/I saw him/.test(s.solicitorVisibleText)) === true,
  };

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
    { name: "v2_frozen_33", pass: v2Defs.length === 33, detail: String(v2Defs.length) },
    { name: "fn_trunc_021", pass: fnChecks["GOLD-11-021_trunc_not_copyable"], detail: "canCopy=false" },
    { name: "fn_placeholder_025", pass: fnChecks["GOLD-11-025_placeholder_not_copyable"], detail: "canCopy=false" },
    { name: "title_022_withheld", pass: fnChecks["GOLD-11-022_title_withheld"] && fnChecks["no_ellipsis_title_shown_022"], detail: "withheld" },
    { name: "title_033_withheld", pass: fnChecks["GOLD-11-033_title_withheld"] && fnChecks["no_ellipsis_title_shown_033"], detail: "withheld" },
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
    phase: "11-remediation",
    status: "REMEDIATION_COMPLETE__AWAITING_HUMAN_GOLD_REVIEW",
    generatedAt: frozenAt,
    parentV1FreezeHash: V1_FREEZE_HASH,
    v2FreezeHash: freezeHash,
    sampleSize: samples.length,
    surfacesTotal,
    changedSurfaces,
    duplicationDisclosure,
    fnChecks,
    contracts,
    contractPass,
    ledgerImpact: "none",
    schemaImpact: "none — still 1.1.0",
    programmePassSupported: false,
    rootCausesFixed: [
      "Mid-word truncation + ellipsis detection (GOLD-11-021)",
      "{{PLACEHOLDER}} / {TOKEN} detection without \\b on braces (GOLD-11-025)",
      "Ellipsis / incomplete-quote titles withheld on display path (GOLD-11-022/033)",
      "Internal timestamps/builder/audit seeds stripped from solicitor-facing renders",
      "Provisional status lines no longer coarse-blocked solely by uncertain family (001–014 root cause)",
      "Chase label capitalization humanized (016/017/019/020 display)",
      "record per MG6C / Theft Act routed to qualified solicitor review queue",
    ],
  };
  fs.writeFileSync(path.join(OUT, "phase11-remediation-report.json"), JSON.stringify(report, null, 2), "utf8");
  fs.writeFileSync(path.join(OUT, "before-after-summary.json"), JSON.stringify({ changedSurfaces, cases: beforeAfter }, null, 2), "utf8");

  const checkpoint = `# Phase 11 remediation checkpoint

**Status:** REMEDIATION_COMPLETE — **AWAITING_HUMAN_GOLD_REVIEW** — **not a programme PASS**  
**v1 freeze (preserved):** \`${V1_FREEZE_HASH}\`  
**v2 freeze:** \`${freezeHash}\`  
**Schema:** 1.1.0 · **Central surfaces:** 31 · **Ledger impact:** none

## Explicit

- Human review of v1 bundle is **STOPPED** — v1 was not ready for gold sign-off.
- v1 sample, hash, renders, and reports are **unchanged historical evidence**.
- v2 is a separately versioned comparison regeneration of the **same 33 goldIds**.
- No human judgments filled. No invented sign-off. No merge/deploy/programme PASS.
- Blocked ≠ repaired.

## Duplication disclosure

| Metric | Value |
|--------|------:|
| v1 IDs | ${samples.length} |
| Unique fixtures | ${fixtureCounts.size} |
| Duplicate fixtures | ${duplicateFixtures.map(([id, n]) => `${id}×${n}`).join(", ") || "none"} |

**v2 policy:** same membership retained for before/after comparison. Fixture repeats across strata are **justified** (multi-angle review), not silently altered.

## Confirmed FN remediations

| Case | Fix | Pass |
|------|-----|------|
| GOLD-11-021 | mid-word truncation blocked | ${fnChecks["GOLD-11-021_trunc_not_copyable"]} |
| GOLD-11-025 | \`{{MISSING_ITEM}}\` blocked | ${fnChecks["GOLD-11-025_placeholder_not_copyable"]} |
| GOLD-11-022 | unsafe title withheld on display | ${fnChecks["GOLD-11-022_title_withheld"]} |
| GOLD-11-033 | unsafe title withheld on display | ${fnChecks["GOLD-11-033_title_withheld"]} |

## Contracts

${contracts.map((c) => `- ${c.name}: ${c.pass ? "PASS" : "FAIL"} (${c.detail})`).join("\n")}

All remediation contracts: **${contractPass}**

## Artefacts

- \`artifacts/.../phase-11/\` — v1 preserved
- \`artifacts/.../phase-11-remediation/v2/\` — v2 freeze + blinded renders + workbook
- \`artifacts/.../phase-11-remediation/before-after-surfaces/\` — per-case surface diffs
- \`artifacts/.../phase-11-remediation/automated-predictions-v2.json\` — separate from blinded bundle

## Programme PASS

**Not supported.**
`;

  fs.writeFileSync(path.join(DOCS, "phase-11-remediation-checkpoint.md"), checkpoint, "utf8");
  fs.writeFileSync(path.join(OUT, "PHASE-11-REMEDIATION-CHECKPOINT.md"), checkpoint, "utf8");

  // Update programme README status line only if present
  const readmePath = path.join(DOCS, "README.md");
  if (fs.existsSync(readmePath)) {
    let readme = fs.readFileSync(readmePath, "utf8");
    if (readme.includes("Phase 11 —")) {
      readme = readme.replace(
        /\| Phase 11 —.*\|/,
        "| Phase 11 — rendered coverage + gold FP–FN | **REMEDIATION_COMPLETE / AWAITING_HUMAN_GOLD_REVIEW** (v1 preserved; v2 comparison) | `docs/integrity-programme/phase-11-remediation-checkpoint.md` |",
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
        v2Hash: freezeHash.slice(0, 16),
        surfacesTotal,
        changedSurfaces,
        fnChecks,
        programmePassSupported: false,
      },
      null,
      2,
    ),
  );
  if (!contractPass) process.exitCode = 1;
}

main();
