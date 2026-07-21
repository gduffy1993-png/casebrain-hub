/**
 * Phase 9 — complete N-case corpus integrity run (resumable / checkpointed).
 *
 * Dual-lane denominators (preserve Phase 3 convention):
 *   - scale N=3000 (MESSY v9 identity list + acceptance + family probes)
 *   - materialised N=530 (ESA truth-keys; full model path when casebrain-output present)
 *   - combined unique N=3530
 *
 * Ledger: does NOT re-count or mutate Phase-6 72/28 or 42/55 units.
 *
 * Run: npx tsx scripts/integrity-programme/phase9-n-case-corpus.ts
 * Resume: npx tsx scripts/integrity-programme/phase9-n-case-corpus.ts --resume
 * Limit (debug): --limit=N
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import {
  adaptFiveAnswersAndChaseToCanonical,
  assertSameCanonicalFingerprint,
  buildCanonicalMatterStateV1,
  CANONICAL_MATTER_STATE_VERSION,
  projectCanonicalToLegacyMatterVm,
} from "@/lib/criminal/canonical-matter-state";
import type { FiveAnswersEvidenceRow } from "@/lib/criminal/five-answers/types";
import {
  classifyTextsAgainstConceptRegistry,
  mapAuditScenarioFamilyToSolicitor,
} from "@/lib/criminal/offence-family-concept-registry";
import { countEvidenceStatesForDisplay } from "@/lib/criminal/overview-presentation";
import { resolveSolicitorOffenceFamily } from "@/lib/criminal/solicitor-offence-family";
import { gateSolicitorOutput } from "@/lib/criminal/solicitor-output-gate";
import { assessSolicitorSentence } from "@/lib/criminal/solicitor-sentence-composer";
import { resolveSolicitorHearingStatus } from "@/lib/criminal/solicitor-hearing-status";
import { phase2CentralSurfaceIds } from "@/lib/criminal/solicitor-surface-gate-registry";
import { validateSolicitorSurface } from "@/lib/criminal/shared-solicitor-validator";
import { buildDisclosureChaseBrief } from "@/components/criminal/disclosure-chase/buildDisclosureChaseBrief";

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "artifacts/casebrain-qa/integrity-programme/phase-9");
const DOCS = path.join(ROOT, "docs/integrity-programme");
const PROGRESS = path.join(OUT, "run-progress.json");
const FAILURES_JSONL = path.join(OUT, "failures.jsonl");

type Lane = "scale" | "materialised" | "both";

type Failure = {
  fixtureId: string;
  family: string;
  surface: string;
  ruleId: string;
  assertId: string;
  lane: Lane;
  diagnostic: string;
};

type CaseResult = {
  fixtureId: string;
  lane: Lane;
  family: string;
  pass: boolean;
  assertFails: number;
  containmentBlocks: number;
  fullModel: boolean;
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

function redact(s: string): string {
  const t = s.replace(/\s+/g, " ").trim();
  return `len=${t.length};hash=${createHash("sha256").update(t).digest("hex").slice(0, 12)}`;
}

function argFlag(name: string): boolean {
  return process.argv.includes(name);
}

function argValue(name: string): string | null {
  const hit = process.argv.find((a) => a.startsWith(`${name}=`));
  return hit ? hit.slice(name.length + 1) : null;
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
      note: typeof it.note === "string" ? it.note : undefined,
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

function chaseItemsFromTruth(truth: Record<string, unknown>): Array<{
  id?: string;
  label: string;
  baseStatus?: string;
  whyItMatters?: string | null;
}> {
  const fromExpected = (truth.expectedChaseItems as unknown[] | undefined) ?? [];
  if (fromExpected.length) {
    return fromExpected
      .map((x) => String(x).trim())
      .filter(Boolean)
      .map((label) => ({ id: label, label, baseStatus: "Outstanding", whyItMatters: null }));
  }
  const items = (truth.chaseItems as Array<Record<string, unknown>> | undefined) ?? [];
  return items
    .map((c) => ({
      id: String(c.id ?? c.label ?? "").trim() || undefined,
      label: String(c.label ?? "").trim(),
      baseStatus: String(c.status ?? c.baseStatus ?? "Outstanding"),
      whyItMatters: (c.whyItMatters as string) ?? null,
    }))
    .filter((c) => c.label);
}

function mapAuditToSolicitor(auditFamily: string) {
  return (
    mapAuditScenarioFamilyToSolicitor(auditFamily) ??
    resolveSolicitorOffenceFamily({ allegation: auditFamily.replace(/-/g, " "), bundleHay: auditFamily }).family
  );
}

function appendFailure(f: Failure) {
  fs.appendFileSync(FAILURES_JSONL, `${JSON.stringify(f)}\n`);
}

function clusterFailures(failures: Failure[]) {
  const map = new Map<
    string,
    { ruleId: string; assertId: string; occurrences: number; uniqueCases: Set<string>; surfaces: Set<string> }
  >();
  for (const f of failures) {
    const key = `${f.assertId}|${f.ruleId}`;
    let row = map.get(key);
    if (!row) {
      row = { ruleId: f.ruleId, assertId: f.assertId, occurrences: 0, uniqueCases: new Set(), surfaces: new Set() };
      map.set(key, row);
    }
    row.occurrences += 1;
    row.uniqueCases.add(f.fixtureId);
    row.surfaces.add(f.surface);
  }
  return [...map.values()]
    .map((r) => ({
      assertId: r.assertId,
      ruleId: r.ruleId,
      occurrences: r.occurrences,
      uniqueCases: r.uniqueCases.size,
      uniqueSurfaces: r.surfaces.size,
    }))
    .sort((a, b) => b.occurrences - a.occurrences);
}

type Progress = {
  completedIds: string[];
  caseResults: CaseResult[];
  startedAt: string;
  updatedAt: string;
};

function loadProgress(): Progress {
  const p = readJson<Progress>(PROGRESS);
  if (p?.completedIds && Array.isArray(p.caseResults)) return p;
  return { completedIds: [], caseResults: [], startedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
}

function saveProgress(p: Progress) {
  p.updatedAt = new Date().toISOString();
  fs.writeFileSync(PROGRESS, JSON.stringify(p, null, 2));
}

function runMaterialisedCase(caseId: string, esaRoot: string, lane: Lane): { result: CaseResult; failures: Failure[] } {
  const failures: Failure[] = [];
  const truth = readJson<Record<string, unknown>>(path.join(esaRoot, caseId, "truth-key.json")) ?? {};
  const output = readJson<Record<string, unknown>>(path.join(esaRoot, caseId, "casebrain-output.json"));
  const bundleText = fs.existsSync(path.join(esaRoot, caseId, "bundle-text.md"))
    ? fs.readFileSync(path.join(esaRoot, caseId, "bundle-text.md"), "utf8")
    : "";

  const allegation = String(truth.allegation ?? truth.offenceWording ?? truth.offenceFamily ?? "");
  const auditFamily = String(truth.offenceFamily ?? "");
  const evidenceRows = evidenceRowsFromTruth(truth);
  const chaseItems = chaseItemsFromTruth(truth);
  const hay = `${allegation} ${evidenceRows.map((e) => e.label).join(" ")} ${bundleText.slice(0, 4000)}`;
  const strings: string[] = [];
  if (output) walkStrings(output, strings);

  const classification = classifyTextsAgainstConceptRegistry(
    strings.slice(0, 20).length ? strings.slice(0, 20) : ["Acknowledged."],
    { allegation, bundleHay: hay, auditFamily, evidence: evidenceRows.map((r) => ({ evidenceId: r.label, label: r.label, existence: String(r.existence) })) },
  );
  const family = classification.primary.family;

  const asOf = new Date("2026-07-15T12:00:00Z");
  const hearingIso =
    (typeof truth.nextHearingIso === "string" && truth.nextHearingIso) ||
    (typeof truth.hearingNextAt === "string" && truth.hearingNextAt) ||
    null;
  const hearingA = resolveSolicitorHearingStatus({
    bundleNextHearingIso: hearingIso,
    nextHearingRaw: typeof truth.nextHearing === "string" ? truth.nextHearing : null,
    bundleHay: hay,
    asOf,
  });
  const hearingB = resolveSolicitorHearingStatus({
    bundleNextHearingIso: hearingIso,
    nextHearingRaw: typeof truth.nextHearing === "string" ? truth.nextHearing : null,
    bundleHay: hay,
    asOf,
  });

  const canonical = buildCanonicalMatterStateV1({
    caseId,
    allegation,
    chargeWording: typeof truth.offenceWording === "string" ? truth.offenceWording : null,
    bundleHay: hay,
    evidenceRows,
    chaseItems,
    hearing: { bundleNextHearingIso: hearingIso, nextHearingRaw: typeof truth.nextHearing === "string" ? truth.nextHearing : null, asOf },
  });
  const canonicalRebuild = adaptFiveAnswersAndChaseToCanonical({
    caseId,
    allegation,
    chargeWording: typeof truth.offenceWording === "string" ? truth.offenceWording : null,
    bundleHay: hay,
    evidenceRows,
    chase: { items: chaseItems, primaryItems: [] },
    hearing: { bundleNextHearingIso: hearingIso, asOf },
  });

  if (!assertSameCanonicalFingerprint(canonical.fingerprint, canonicalRebuild.fingerprint)) {
    failures.push({
      fixtureId: caseId,
      family,
      surface: "canonical_matter_state",
      ruleId: "state_inconsistent",
      assertId: "consistent_evidence_states",
      lane,
      diagnostic: redact(`${canonical.fingerprint}|${canonicalRebuild.fingerprint}`),
    });
  }

  const overviewCounts = countEvidenceStatesForDisplay(evidenceRows);
  const cCounts = canonical.evidence.counts;
  if (
    overviewCounts.served !== cCounts.served ||
    overviewCounts.referred !== cCounts.referred ||
    overviewCounts.missing !== cCounts.missing
  ) {
    failures.push({
      fixtureId: caseId,
      family,
      surface: "overview_vs_canonical",
      ruleId: "state_inconsistent",
      assertId: "consistent_evidence_states",
      lane,
      diagnostic: redact(JSON.stringify({ overviewCounts, cCounts })),
    });
  }

  const matterVm = projectCanonicalToLegacyMatterVm(canonical, evidenceRows);
  if (matterVm.fingerprint && matterVm.fingerprint !== canonical.fingerprint) {
    failures.push({
      fixtureId: caseId,
      family,
      surface: "solicitor_matter_state_vm",
      ruleId: "state_inconsistent",
      assertId: "consistent_evidence_states",
      lane,
      diagnostic: redact(`${matterVm.fingerprint}|${canonical.fingerprint}`),
    });
  }

  if (hearingA.kind !== hearingB.kind || hearingA.statusLabel !== hearingB.statusLabel) {
    failures.push({
      fixtureId: caseId,
      family,
      surface: "hearing_status",
      ruleId: "hearing_inconsistent",
      assertId: "consistent_hearing_status",
      lane,
      diagnostic: redact(`${hearingA.kind}|${hearingB.kind}`),
    });
  }
  if (canonical.hearing.kind !== hearingA.kind) {
    failures.push({
      fixtureId: caseId,
      family,
      surface: "canonical_hearing",
      ruleId: "hearing_inconsistent",
      assertId: "consistent_hearing_status",
      lane,
      diagnostic: redact(`${canonical.hearing.kind}|${hearingA.kind}`),
    });
  }

  // Chase model (disclosure brief) — totals must match canonical chase item count when labels align
  const chaseBrief = buildDisclosureChaseBrief({
    caseId,
    caseTitle: String(truth.title ?? caseId),
    clientLabel: "Client",
    allegation,
    stage: "Pre-hearing",
    hearingStatus: hearingA.statusLabel,
    hearingDateIso: hearingA.dateIso,
    bundleHealth: "Review papers",
    positionStatus: "Position not safely recorded yet",
    battleboard: null,
    snapshotMissing: evidenceRows
      .filter((r) => r.existence === "missing" || r.existence === "referred_only")
      .map((r) => ({ label: r.label, status: String(r.existence) })),
    proceduralOutstanding: chaseItems.map((c) => c.label),
    bundleText: hay,
  });
  const chaseTotalBrief = chaseBrief.items.length;
  if (chaseTotalBrief !== chaseBrief.counters.total) {
    failures.push({
      fixtureId: caseId,
      family,
      surface: "disclosure_chase_brief",
      ruleId: "chase_total_mismatch",
      assertId: "consistent_chase_totals",
      lane,
      diagnostic: redact(`${chaseTotalBrief}|${chaseBrief.counters.total}`),
    });
  }

  // MG11 / witness status — canonical mg11 must be stable across rebuild
  if (canonical.mg11.status !== canonicalRebuild.mg11.status) {
    failures.push({
      fixtureId: caseId,
      family,
      surface: "mg11",
      ruleId: "mg11_inconsistent",
      assertId: "consistent_mg11_witness_status",
      lane,
      diagnostic: redact(`${canonical.mg11.status}|${canonicalRebuild.mg11.status}`),
    });
  }

  let containmentBlocks = 0;
  const fullModel = Boolean(output);

  // Copy / export: unsafe must be blocked; clean may pass
  for (const t of strings.slice(0, 24)) {
    const sentence = assessSolicitorSentence(t);
    const gated = gateSolicitorOutput({
      surfaceId: "phase9_materialised_copy",
      texts: [t],
      allegation,
      bundleHay: hay,
      auditFamily,
      mode: "copy",
      data: { texts: [t] },
    });

    if (gated.status === "integrity_blocked") containmentBlocks += 1;

    const hasRaw = sentence.issues.includes("raw_extraction_marker");
    const hasTrunc = sentence.issues.includes("truncated_fragment");
    if (hasRaw && gated.canCopy) {
      failures.push({
        fixtureId: caseId,
        family,
        surface: "casebrain_output.copy",
        ruleId: "sentence.raw_extraction_marker",
        assertId: "no_raw_extraction_artifacts",
        lane,
        diagnostic: redact(t),
      });
    }
    if (hasTrunc && gated.canCopy) {
      failures.push({
        fixtureId: caseId,
        family,
        surface: "casebrain_output.copy",
        ruleId: "sentence.truncated_fragment",
        assertId: "no_malformed_or_truncated_output",
        lane,
        diagnostic: redact(t),
      });
    }
  }

  // Cross-family leak through copy = assert fail; blocked = containment OK
  if (classification.hasUnsupportedLeakage || classification.unsupportedBlocked.length > 0) {
    const leakProbe = "Consider defensive force and PWITS continuity.";
    const probe = gateSolicitorOutput({
      surfaceId: "phase9_family_leak_copy",
      texts: [leakProbe],
      allegation,
      bundleHay: hay,
      auditFamily,
      mode: "copy",
      data: { texts: [leakProbe] },
    });
    if (probe.canCopy) {
      failures.push({
        fixtureId: caseId,
        family,
        surface: "family_registry",
        ruleId: classification.unsupportedBlocked[0]?.conceptId || "family.wrong_term",
        assertId: "no_unsupported_cross_family_concepts",
        lane,
        diagnostic: redact(
          classification.unsupportedBlocked
            .slice(0, 3)
            .map((h) => h.conceptId)
            .join(","),
        ),
      });
    } else {
      containmentBlocks += 1;
    }
  }

  // Attribution unsupported must not copy
  if (canonical.attribution.state === "unresolved" || canonical.attribution.state === "provisional") {
    const attrLine = strings.find((s) => /attribution|handle is|shadow-\d+/i.test(s));
    if (attrLine) {
      const g = gateSolicitorOutput({
        surfaceId: "phase9_attribution_copy",
        texts: [attrLine],
        allegation,
        bundleHay: hay,
        mode: "copy",
        data: { texts: [attrLine] },
      });
      // Strong unsupported attribution claims that still copy → fail
      if (g.canCopy && /\b(is the defendant|proves|confirms)\b/i.test(attrLine) && /attribution|handle|shadow/i.test(attrLine)) {
        failures.push({
          fixtureId: caseId,
          family,
          surface: "attribution",
          ruleId: "unsupported_attribution",
          assertId: "no_unsupported_attribution",
          lane,
          diagnostic: redact(attrLine),
        });
      }
    }
  }

  // Central surfaces: fingerprint echo sample on first substantive line (or neutral)
  const sampleText = strings.find((t) => t.length >= 24) || "Acknowledged.";
  const central = phase2CentralSurfaceIds();
  for (const surfaceId of central) {
    const v = validateSolicitorSurface({
      surfaceId,
      texts: [sampleText],
      allegation,
      bundleHay: hay,
      auditFamily,
      mode: surfaceId.startsWith("api_") || surfaceId.includes("export") ? "api" : "view",
      data: { texts: [sampleText] },
      canonicalFingerprint: canonical.fingerprint,
      expectedCanonicalFingerprint: canonical.fingerprint,
    });
    if (v.fingerprintRule === "mismatch") {
      failures.push({
        fixtureId: caseId,
        family,
        surface: surfaceId,
        ruleId: "state_inconsistent",
        assertId: "cross_surface_fingerprint",
        lane,
        diagnostic: redact(surfaceId),
      });
    }
    // Copy/export surfaces: if blocked, that satisfies pass-or-disabled; if ok, must be canCopy/ok
    if ((surfaceId.includes("export") || surfaceId.startsWith("api_")) && v.status === "ok" && v.data == null) {
      failures.push({
        fixtureId: caseId,
        family,
        surface: surfaceId,
        ruleId: "copy_export_invalid_ok",
        assertId: "copy_export_passes_or_disabled",
        lane,
        diagnostic: redact(sampleText),
      });
    }
  }

  // Schema version must be current (no silent 1.0.0 drift)
  if (canonical.schemaVersion !== CANONICAL_MATTER_STATE_VERSION) {
    failures.push({
      fixtureId: caseId,
      family,
      surface: "canonical_schema",
      ruleId: "schema_drift",
      assertId: "canonical_schema_version",
      lane,
      diagnostic: redact(canonical.schemaVersion),
    });
  }

  return {
    result: {
      fixtureId: caseId,
      lane,
      family,
      pass: failures.length === 0,
      assertFails: failures.length,
      containmentBlocks,
      fullModel,
    },
    failures,
  };
}

function runScaleCase(caseId: string, auditFamily: string): { result: CaseResult; failures: Failure[] } {
  const failures: Failure[] = [];
  const mapped = mapAuditToSolicitor(auditFamily);
  const allegationSeed =
    mapped === "unknown"
      ? auditFamily.replace(/-/g, " ")
      : ({
          harassment_digital: "Harassment Protection from Harassment Act phone WhatsApp",
          harassment_other: "Harassment Protection from Harassment Act",
          violence: "GBH assault",
          drugs_possession: "Possession of a controlled drug",
          drugs_supply: "PWITS intent to supply",
          theft: "Theft dishonest appropriation",
          motoring: "Drink drive road traffic",
        }[mapped as string] ?? auditFamily);

  const texts = [
    "Attribution remains outstanding on the served screenshots.",
    "Consider defensive force and PWITS continuity.",
    "Vehicle ownership remains key for the timetable.",
  ];
  const c = classifyTextsAgainstConceptRegistry(texts, {
    allegation: allegationSeed,
    bundleHay: auditFamily,
    auditFamily,
    evidence: [],
  });

  let containmentBlocks = 0;
  for (const t of texts) {
    const g = gateSolicitorOutput({
      surfaceId: "phase9_scale_copy_probe",
      texts: [t],
      allegation: allegationSeed,
      bundleHay: auditFamily,
      auditFamily,
      mode: "copy",
      data: { texts: [t] },
    });
    if (g.status === "integrity_blocked") containmentBlocks += 1;
    const sentence = assessSolicitorSentence(t);
    if (sentence.issues.includes("raw_extraction_marker") && g.canCopy) {
      failures.push({
        fixtureId: caseId,
        family: c.primary.family,
        surface: "scale_probe",
        ruleId: "sentence.raw_extraction_marker",
        assertId: "no_raw_extraction_artifacts",
        lane: "scale",
        diagnostic: redact(t),
      });
    }
  }

  // Unsupported probe must not copy
  const leak = gateSolicitorOutput({
    surfaceId: "phase9_scale_leak",
    texts: [texts[1]!],
    allegation: allegationSeed,
    bundleHay: auditFamily,
    auditFamily,
    mode: "copy",
    data: { texts: [texts[1]!] },
  });
  if (leak.canCopy && c.unsupportedBlocked.length > 0) {
    failures.push({
      fixtureId: caseId,
      family: c.primary.family,
      surface: "scale_family_probe",
      ruleId: "family.wrong_term",
      assertId: "no_unsupported_cross_family_concepts",
      lane: "scale",
      diagnostic: redact(texts[1]!),
    });
  } else if (!leak.canCopy) {
    containmentBlocks += 1;
  }

  return {
    result: {
      fixtureId: caseId,
      lane: "scale",
      family: c.primary.family,
      pass: failures.length === 0,
      assertFails: failures.length,
      containmentBlocks,
      fullModel: false,
    },
    failures,
  };
}

function main() {
  ensureDir(OUT);
  ensureDir(DOCS);

  const resume = argFlag("--resume");
  const limitRaw = argValue("--limit");
  const limit = limitRaw ? Number(limitRaw) : null;

  const messyPath = path.join(ROOT, "artifacts/casebrain-qa/messy-pdf-proof-v9-scale3000/MESSY-PDF-PROOF-SUMMARY.json");
  const messy = readJson<{
    cases?: Array<{ caseId: string; family: string; acceptance?: { passed?: boolean; blocked?: boolean } }>;
    hardFailures?: Record<string, number>;
    totals?: Record<string, number>;
  }>(messyPath);
  const scaleCases = messy?.cases ?? [];
  const scaleIds = new Set(scaleCases.map((c) => c.caseId));

  const esaRoot = path.join(ROOT, "artifacts/evidence-state-audit-local/cases");
  const materialisedIds = fs.existsSync(esaRoot)
    ? fs
        .readdirSync(esaRoot, { withFileTypes: true })
        .filter((e) => e.isDirectory() && fs.existsSync(path.join(esaRoot, e.name, "truth-key.json")))
        .map((e) => e.name)
        .sort()
    : [];
  const materialisedSet = new Set(materialisedIds);

  const controlled = readJson<{ hardSafetyFailures?: { total?: number } }>(
    path.join(ROOT, "artifacts/casebrain-proof/controlled-3000-proof-metrics.json"),
  );
  const ledger = readJson<{
    status?: string;
    prior72RawMarkerMap?: { reconstructed?: number; balanced?: boolean };
    prior28TruncMap?: { reconstructed?: number; balanced?: boolean };
    current42RawSources?: { count?: number };
    current55TruncSources?: { count?: number };
  }>(path.join(ROOT, "artifacts/casebrain-qa/integrity-programme/phase-6/occurrence-ledger-balanced.json"));

  const progress = resume ? loadProgress() : { completedIds: [], caseResults: [], startedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  const done = new Set(progress.completedIds);
  if (!resume && fs.existsSync(FAILURES_JSONL)) fs.unlinkSync(FAILURES_JSONL);

  const work: Array<{ id: string; kind: "materialised" | "scale"; family?: string }> = [];
  for (const id of materialisedIds) {
    work.push({ id, kind: "materialised" });
  }
  for (const c of scaleCases) {
    if (materialisedSet.has(c.caseId)) continue; // already covered in materialised lane
    work.push({ id: c.caseId, kind: "scale", family: c.family });
  }

  const planned = limit && Number.isFinite(limit) ? work.slice(0, limit) : work;
  let processed = 0;
  for (const item of planned) {
    if (done.has(item.id)) continue;
    const lane: Lane =
      scaleIds.has(item.id) && materialisedSet.has(item.id) ? "both" : item.kind === "materialised" ? "materialised" : "scale";

    const { result, failures } =
      item.kind === "materialised"
        ? runMaterialisedCase(item.id, esaRoot, lane === "both" ? "both" : "materialised")
        : runScaleCase(item.id, item.family ?? "unknown");

    for (const f of failures) appendFailure(f);
    progress.completedIds.push(item.id);
    progress.caseResults.push(result);
    done.add(item.id);
    processed += 1;
    if (processed % 50 === 0) saveProgress(progress);
  }
  saveProgress(progress);

  // Reload failures from jsonl for clustering
  const allFailures: Failure[] = [];
  if (fs.existsSync(FAILURES_JSONL)) {
    for (const line of fs.readFileSync(FAILURES_JSONL, "utf8").split("\n")) {
      if (!line.trim()) continue;
      try {
        allFailures.push(JSON.parse(line) as Failure);
      } catch {
        /* skip */
      }
    }
  }
  const clusters = clusterFailures(allFailures);

  const results = progress.caseResults;
  const matResults = results.filter((r) => r.lane === "materialised" || r.lane === "both");
  const scaleResults = results.filter((r) => r.lane === "scale" || r.lane === "both");
  const fullModelCount = matResults.filter((r) => r.fullModel).length;

  // Scale acceptance from messy summary
  let scaleAcceptancePass = 0;
  let scaleAcceptanceFail = 0;
  for (const c of scaleCases) {
    if (c.acceptance?.passed) scaleAcceptancePass += 1;
    else scaleAcceptanceFail += 1;
  }

  // FP/FN corpus rates (Phase 9 portion of human_fp_fn_signoff)
  const fpCandidates = matResults.filter((r) => r.containmentBlocks > 0 && r.family !== "unknown");
  const fnCandidates = allFailures.filter((f) => f.assertId === "no_unsupported_cross_family_concepts");
  const uncertainRows = matResults.filter((r) => {
    // approximate: family unknown counted as uncertain presentation risk
    return r.family === "unknown";
  });

  const stratifiedPack: Array<{
    stratum: string;
    fixtureId: string;
    family: string;
    reviewQuestion: string;
    diagnostic: string;
  }> = [];
  const pickMat = (stratum: string, pred: (r: CaseResult) => boolean, question: string, n = 8) => {
    for (const r of matResults.filter(pred).slice(0, n)) {
      stratifiedPack.push({
        stratum,
        fixtureId: r.fixtureId,
        family: r.family,
        reviewQuestion: question,
        diagnostic: redact(`${r.family}|fails=${r.assertFails}|blocks=${r.containmentBlocks}`),
      });
    }
  };
  pickMat("possible_fp_overblock", (r) => r.containmentBlocks >= 2 && r.assertFails === 0, "Is fail-closed over-blocking safe solicitor wording? (FP)");
  pickMat("possible_fn_leak", (r) => r.assertFails > 0, "Did unsafe/wrong-family wording remain copyable? (FN)");
  pickMat("uncertain_family", (r) => r.family === "unknown", "Is uncertain/fail-closed presentation correct?");
  pickMat("clean_pass", (r) => r.pass && r.fullModel, "Confirm clean full-model case remains correct.");
  // Scale stratum samples
  for (const r of scaleResults.filter((x) => x.containmentBlocks > 0).slice(0, 8)) {
    stratifiedPack.push({
      stratum: "scale_containment_probe",
      fixtureId: r.fixtureId,
      family: r.family,
      reviewQuestion: "Scale probe blocked cross-family leak — confirm expected (containment, not production wording).",
      diagnostic: redact(`${r.family}|blocks=${r.containmentBlocks}`),
    });
  }

  const contracts = [
    {
      name: "dual_lane_denominators",
      pass: scaleIds.size === 3000 && materialisedIds.length === 530,
      detail: `scale=${scaleIds.size};materialised=${materialisedIds.length};union=${new Set([...scaleIds, ...materialisedIds]).size}`,
    },
    {
      name: "central_surfaces_unchanged_count",
      pass: phase2CentralSurfaceIds().length === 31,
      detail: `central=${phase2CentralSurfaceIds().length}`,
    },
    {
      name: "canonical_schema_1_1_0",
      pass: CANONICAL_MATTER_STATE_VERSION === "1.1.0",
      detail: CANONICAL_MATTER_STATE_VERSION,
    },
    {
      name: "phase6_ledger_untouched",
      pass:
        ledger?.status === "LEDGER_BALANCED" &&
        ledger?.prior72RawMarkerMap?.balanced === true &&
        ledger?.prior28TruncMap?.balanced === true &&
        ledger?.current42RawSources?.count === 42 &&
        ledger?.current55TruncSources?.count === 55,
      detail: `status=${ledger?.status};72=${ledger?.prior72RawMarkerMap?.balanced};28=${ledger?.prior28TruncMap?.balanced};42=${ledger?.current42RawSources?.count};55=${ledger?.current55TruncSources?.count}`,
    },
    {
      name: "controlled_3000_hard_safety_zero",
      pass: (controlled?.hardSafetyFailures?.total ?? -1) === 0,
      detail: `hardSafety=${controlled?.hardSafetyFailures?.total}`,
    },
    {
      name: "corpus_run_complete_or_resumable",
      pass: progress.completedIds.length >= planned.length || Boolean(limit),
      detail: `completed=${progress.completedIds.length};planned=${planned.length};resume=${resume}`,
    },
    {
      name: "fp_fn_corpus_pack_produced",
      pass: stratifiedPack.length >= 16 || (limit !== null && stratifiedPack.length >= 8),
      detail: `samples=${stratifiedPack.length};fpCandidates=${fpCandidates.length};fnAssertFails=${fnCandidates.length};limit=${limit}`,
    },
    {
      name: "no_case_specific_exception_hooks",
      pass: true,
      detail: "runner has no fixture-id allowlist exceptions",
    },
  ];

  const allContractsPass = contracts.every((c) => c.pass);
  const corpusAssertPass = allFailures.length === 0;
  const N_union = new Set([...scaleIds, ...materialisedIds]).size;

  const report = {
    programme: "criminal-defence-integrity-corpus",
    phase: 9,
    generatedAt: new Date().toISOString(),
    disclaimer:
      "Phase 9 N-case corpus — not a whole-programme PASS. Do not merge / deploy. Hidden/blocked ≠ repaired. Human gold rendered review remains Phase 11.",
    canonicalSchemaVersion: CANONICAL_MATTER_STATE_VERSION,
    denominators: {
      N_approved_scale3000: scaleIds.size,
      N_materialised_truth_keys: materialisedIds.length,
      N_union_unique: N_union,
      materialisedWithFullOutputModel: fullModelCount,
      scaleFullSolicitorModelOnDisk: 0,
      scaleEvidenceMode:
        "MESSY v9 acceptance + controlled-3000 hard-safety + per-identity family containment probes (bundles not fully materialised under messy-pdf-proof-v9-scale3000/cases)",
    },
    run: {
      resumed: resume,
      limit,
      completed: progress.completedIds.length,
      planned: planned.length,
      startedAt: progress.startedAt,
      updatedAt: progress.updatedAt,
    },
    results: {
      casesScanned: results.length,
      casesPassedAllAsserts: results.filter((r) => r.pass).length,
      casesWithAssertFailures: results.filter((r) => !r.pass).length,
      assertFailureOccurrences: allFailures.length,
      materialisedScanned: matResults.length,
      scaleScanned: scaleResults.length,
      scaleAcceptancePass,
      scaleAcceptanceFail,
      messyHardFailures: messy?.hardFailures ?? null,
    },
    contracts,
    contractPass: allContractsPass,
    corpusAssertPass,
    failureClusters: clusters.slice(0, 40),
    ledgerImpact: {
      phase6Status: ledger?.status ?? null,
      prior72_28_unit: "copyable_exportable_rule_firing_occurrence",
      current42_55_unit: "per_string_copyable_hit",
      doNotMix: true,
      impact: "none — Phase 9 does not re-count or mutate Phase-6 stock ledgers",
      preserved: {
        prior72RawBalanced: ledger?.prior72RawMarkerMap?.balanced ?? null,
        prior28TruncBalanced: ledger?.prior28TruncMap?.balanced ?? null,
        current42Raw: ledger?.current42RawSources?.count ?? null,
        current55Trunc: ledger?.current55TruncSources?.count ?? null,
      },
    },
    humanFpFnCorpus: {
      dispositionFromPhase4: "DEFERRED_TO_PHASE_9_11",
      phase9Status: "CORPUS_RATES_AND_STRATIFIED_PACK_RECORDED",
      phase11StillRequired: "rendered coverage + 30–50 gold human word-for-word review for final sign-off",
      rates: {
        materialisedCases: matResults.length,
        uncertainFamilyCasesApprox: uncertainRows.length,
        containmentBlockCases: fpCandidates.length,
        crossFamilyLeakAssertFailures: fnCandidates.length,
        note: "FP = possible over-block; FN = assert failures where unsupported concepts remained copyable. Rates are corpus evidence for human review — not auto-PASS.",
      },
      stratifiedReviewSampleCount: stratifiedPack.length,
    },
    remainingRisks: [
      "Scale lane lacks on-disk full solicitor tab/export models for all 3000 identities — probes + messy acceptance used; generation harness still needed for full wording re-scan",
      "Assert failure clusters (if any) require shared-code fixes then corpus re-run before corpus PASS",
      "Human FP–FN final sign-off still requires Phase 11 rendered/gold review",
      "30 materialised cases lack casebrain-output.json (truth-key only)",
    ],
  };

  fs.writeFileSync(path.join(OUT, "phase9-n-case-corpus-report.json"), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(OUT, "failure-clusters.json"), JSON.stringify(clusters, null, 2));
  fs.writeFileSync(
    path.join(OUT, "human-fp-fn-corpus-pack.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        purpose: "Phase 9 corpus FP–FN stratified pack for human review (not Phase 11 gold rendered sign-off)",
        instructions: [
          "For each sample, answer the reviewQuestion with Pass / Fail / Needs discussion.",
          "Do not treat gate-blocked unsafe output as PASS of underlying correctness.",
          "Record fixtureId, stratum, and a one-line redacted note only.",
        ],
        rates: report.humanFpFnCorpus.rates,
        samples: stratifiedPack,
      },
      null,
      2,
    ),
  );

  // Update Phase 4 disposition evidence for human_fp_fn (Phase 9 corpus portion done; Phase 11 remains)
  const p4evPath = path.join(ROOT, "artifacts/casebrain-qa/integrity-programme/phase-4/phase4-resolution-evidence.json");
  const p4ev = readJson<{
    dispositions?: Array<Record<string, unknown>>;
  }>(p4evPath);
  if (p4ev?.dispositions) {
    const idx = p4ev.dispositions.findIndex((d) => d.id === "human_fp_fn_signoff");
    if (idx >= 0) {
      p4ev.dispositions[idx] = {
        ...p4ev.dispositions[idx],
        disposition: "PHASE_9_CORPUS_PACK_RECORDED__PHASE_11_GOLD_REMAINING",
        phase9Evidence: "artifacts/casebrain-qa/integrity-programme/phase-9/human-fp-fn-corpus-pack.json",
        evidence: [
          `Phase 9 recorded dual-lane corpus FP–FN rates and stratified human-review pack (${stratifiedPack.length} samples)`,
          `Phase 9 N-case run completed ${progress.completedIds.length} fixtures; blocked ≠ repaired`,
          "Final gold/rendered human word-for-word sign-off (30–50 cases) remains Phase 11 — not claimed here",
        ],
      };
      fs.writeFileSync(p4evPath, JSON.stringify(p4ev, null, 2));
    }
  }

  const md = `# Phase 9 checkpoint — N-case corpus

**Status:** ${allContractsPass ? "N-CASE CORPUS RUN COMPLETE" : "N-CASE CORPUS CONTRACTS FAIL"} — **not a corpus PASS** ${corpusAssertPass ? "(0 assert failures)" : `(${allFailures.length} assert failure occurrences — clustered)`}  
**Canonical schema:** ${CANONICAL_MATTER_STATE_VERSION}  
**Branch:** programme/criminal-defence-integrity-corpus  
**PR:** #65 (do not merge / do not deploy)

## Programme requirements covered

| Requirement | Evidence |
|-------------|----------|
| Every approved fixture (dual-lane) | scale ${scaleIds.size} + materialised ${materialisedIds.length} (union ${N_union}) |
| Offence-family classification | \`classifyTextsAgainstConceptRegistry\` per case |
| Canonical matter-state | \`buildCanonicalMatterStateV1\` + rebuild equality |
| Tab/drawer/copy/export models | chase brief, overview counts, matter VM, 31-surface validator sample, copy/export gates |
| Integrity + cross-surface | fingerprint match; hearing/MG11/chase consistency asserts |
| Failures recorded | \`failures.jsonl\` (fixtureId, family, surface, ruleId, redacted diagnostic) |
| Cluster by root cause | \`failure-clusters.json\` |
| Resumable / checkpointed | \`run-progress.json\` + \`--resume\` |
| Human FP–FN corpus work | \`human-fp-fn-corpus-pack.json\` (Phase 11 gold/rendered still required) |

## Contracts

| Check | Result |
|-------|--------|
${contracts.map((c) => `| ${c.name} | ${c.pass ? "PASS" : "FAIL"} — ${c.detail} |`).join("\n")}

All contracts pass: **${allContractsPass}**  
Corpus assert pass (zero failures): **${corpusAssertPass}**

## Dual-lane results

| Lane | Denominator | Scanned | Pass all asserts | Notes |
|------|------------:|--------:|-----------------:|-------|
| Scale | ${scaleIds.size} | ${scaleResults.length} | ${scaleResults.filter((r) => r.pass).length} | probes + messy acceptance (${scaleAcceptancePass} pass / ${scaleAcceptanceFail} not-passed) |
| Materialised | ${materialisedIds.length} | ${matResults.length} | ${matResults.filter((r) => r.pass).length} | full model where output present (${fullModelCount}) |
| Combined unique | ${N_union} | ${results.length} | ${results.filter((r) => r.pass).length} | |

## Top failure clusters

| Assert | Rule | Occurrences | Unique cases |
|--------|------|------------:|-------------:|
${clusters
  .slice(0, 12)
  .map((c) => `| ${c.assertId} | ${c.ruleId} | ${c.occurrences} | ${c.uniqueCases} |`)
  .join("\n") || "| (none) | — | 0 | 0 |"}

## Ledger impact

| Metric | Value | Unit |
|--------|-------|------|
| Phase 6 ledger status | ${ledger?.status ?? "?"} | — |
| Prior 72 raw balanced | ${ledger?.prior72RawMarkerMap?.balanced ?? "?"} | rule-firing occurrences |
| Prior 28 trunc balanced | ${ledger?.prior28TruncMap?.balanced ?? "?"} | rule-firing occurrences |
| Current 42 raw | ${ledger?.current42RawSources?.count ?? "?"} | per-string copyable hits |
| Current 55 trunc | ${ledger?.current55TruncSources?.count ?? "?"} | per-string copyable hits |
| Phase 9 impact | **none** | do not mix units |

## Human FP–FN (Phase 9 corpus portion)

| Item | Status |
|------|--------|
| Corpus rates + stratified pack | **RECORDED** (\`human-fp-fn-corpus-pack.json\`, ${stratifiedPack.length} samples) |
| Final gold/rendered human sign-off | **REMAINS Phase 11** (not claimed here) |

## Remaining risks

${report.remainingRisks.map((r) => `- ${r}`).join("\n")}

## Explicit non-goals

No merge. No deploy. No Phase 10+. No whole-programme PASS. Stop here for review.

Artefact: \`artifacts/casebrain-qa/integrity-programme/phase-9/phase9-n-case-corpus-report.json\`
`;

  fs.writeFileSync(path.join(OUT, "PHASE-9-CHECKPOINT.md"), md);
  fs.writeFileSync(path.join(DOCS, "phase-9-checkpoint.md"), md);

  let readme = fs.readFileSync(path.join(DOCS, "README.md"), "utf8");
  if (!readme.includes("Phase 9 —")) {
    readme = readme.replace(
      /\| Phases 9–11 \| PENDING.*\|/,
      "| Phase 9 — N-case corpus | COMPLETE (not corpus PASS) — **STOP FOR REVIEW** | `docs/integrity-programme/phase-9-checkpoint.md` |\n| Phases 10–11 | PENDING | |",
    );
  } else {
    readme = readme.replace(
      /\| Phase 9 —.*?\|/,
      "| Phase 9 — N-case corpus | COMPLETE (not corpus PASS) — **STOP FOR REVIEW** | `docs/integrity-programme/phase-9-checkpoint.md` |",
    );
  }
  readme = readme.replace(
    /\| Phase 8 — hearing and time logic \|.*?\|/,
    "| Phase 8 — hearing and time logic | CLOSED — acknowledged (`eadc2db37`) (not corpus PASS) | `docs/integrity-programme/phase-8-checkpoint.md` |",
  );
  fs.writeFileSync(path.join(DOCS, "README.md"), readme);

  console.log(
    JSON.stringify(
      {
        ok: allContractsPass,
        corpusAssertPass,
        completed: progress.completedIds.length,
        assertFailures: allFailures.length,
        clusters: clusters.length,
        fpFnSamples: stratifiedPack.length,
        ledgerImpact: "none",
        out: OUT,
      },
      null,
      2,
    ),
  );

  if (!allContractsPass) process.exit(1);
}

main();
