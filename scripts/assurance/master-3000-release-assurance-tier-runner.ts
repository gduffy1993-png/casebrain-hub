/**
 * Master 3000 release-assurance tier runner (deterministic, resumable).
 * Product under test: current worktree HEAD (frozen while a tier runs).
 * Corpus: locked Gold/Rep manifests + ESA local cases; never switches product branch.
 *
 *   npx tsx scripts/assurance/master-3000-release-assurance-tier-runner.ts --tier=gold40
 *   npx tsx scripts/assurance/master-3000-release-assurance-tier-runner.ts --tier=rep150
 *   npx tsx scripts/assurance/master-3000-release-assurance-tier-runner.ts --tier=highrisk500
 *   npx tsx scripts/assurance/master-3000-release-assurance-tier-runner.ts --tier=full3000
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { cad999DisplayLabel } from "../../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { buildCriminalBriefPlan } from "../../lib/criminal/brief-plan/build-brief-plan";
import {
  inferInterviewRecordingStateFromText,
  inferInterviewTranscriptStateFromText,
  isFragmentEvidenceLabel,
} from "../../lib/criminal/build-from-document-units";
import {
  workflowCourtRecordAsks,
  workflowDisclosureChaseLabels,
} from "../../lib/criminal/pilot-workflow";
import {
  classifyClaimTextHeuristically,
  isHighRiskClaimText,
  type SolicitorVisibleClaim,
} from "../../lib/eval/master3000-quality/solicitor-visible-claim-audit";

process.env.NEXT_PUBLIC_CRIMINAL_PILOT_MODE = "1";

const ROOT = process.cwd();
const OUT_ROOT = path.join(
  ROOT,
  "artifacts",
  "casebrain-qa",
  "assurance",
  "master-auditor-v2",
  "master-3000-release-assurance",
);
const CASE_ROOT = path.join(ROOT, "artifacts", "evidence-state-audit-local", "cases");
const GOLD_MANIFEST = path.join(
  ROOT,
  "artifacts/casebrain-qa/assurance/master-auditor-v2/master-3000-phase5-starter-gold-audit/STARTER-GOLD-MANIFEST.json",
);
const HOLDOUT_MANIFEST = path.join(
  ROOT,
  "artifacts/casebrain-qa/assurance/master-auditor-v2/master-3000-phase5-starter-gold-audit/HOLDOUT-CANDIDATE-MANIFEST.json",
);
const REP150_MANIFEST = path.join(
  ROOT,
  "artifacts/casebrain-qa/assurance/master-auditor-v2/master-3000-phase9-representative-150/REPRESENTATIVE-150-MANIFEST.json",
);
const MESSY_SUMMARY = path.join(
  ROOT,
  "artifacts/casebrain-qa/messy-pdf-proof-v9-scale3000/MESSY-PDF-PROOF-SUMMARY.json",
);

type Tier = "gold40" | "rep150" | "highrisk500" | "full3000";

type ManifestMatter = {
  caseId: string;
  title?: string;
  offenceFamily?: string;
  profile?: string;
  sourcePath?: string;
  truthKeyPath?: string;
  strata?: string[];
};

type Finding = {
  caseId: string;
  tier: Tier;
  code: string;
  severity: "P0" | "P1" | "P2";
  classification:
    | "CONFIRMED_LIVE_SHARED_DEFECT"
    | "AUDITOR_FALSE_POSITIVE"
    | "TRUTH_AMBIGUOUS_REQUIRES_REVIEW"
    | "EXPECTED_ACCEPTABLE_BEHAVIOUR"
    | "COVERAGE_GAP_ONLY";
  detail: string;
  evidence?: string[];
};

type Progress = {
  tier: Tier;
  head: string;
  completedCaseIds: string[];
  startedAt: string;
  updatedAt: string;
};

function gitHead(): string {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function argTier(): Tier {
  const raw = process.argv.find((a) => a.startsWith("--tier="))?.slice("--tier=".length);
  if (raw === "gold40" || raw === "rep150" || raw === "highrisk500" || raw === "full3000") return raw;
  throw new Error("Usage: --tier=gold40|rep150|highrisk500|full3000");
}

function readJson<T>(p: string): T {
  return JSON.parse(readFileSync(p, "utf8")) as T;
}

function sha(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

function loadMatters(tier: Tier): ManifestMatter[] {
  if (tier === "gold40") {
    const m = readJson<{ matters: ManifestMatter[] }>(GOLD_MANIFEST);
    return m.matters;
  }
  if (tier === "rep150") {
    const m = readJson<{ matters: ManifestMatter[] }>(REP150_MANIFEST);
    return m.matters;
  }

  const goldIds = new Set(readJson<{ matters: ManifestMatter[] }>(GOLD_MANIFEST).matters.map((x) => x.caseId));
  const holdoutIds = new Set(
    readJson<{ matters: ManifestMatter[] }>(HOLDOUT_MANIFEST).matters.map((x) => x.caseId),
  );
  const dirs = readdirSync(CASE_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((id) => !goldIds.has(id) && !holdoutIds.has(id));

  const pool: ManifestMatter[] = [];
  for (const caseId of dirs) {
    const sourcePath = path.join(CASE_ROOT, caseId, "bundle-text.md");
    const truthKeyPath = path.join(CASE_ROOT, caseId, "truth-key.json");
    if (!existsSync(sourcePath) || !existsSync(truthKeyPath)) continue;
    let offenceFamily = "unknown";
    let profile = "unknown";
    let title = caseId;
    let strata: string[] = [];
    try {
      const tk = readJson<{
        title?: string;
        offenceFamily?: string;
        profile?: string;
        evidenceItems?: unknown[];
      }>(truthKeyPath);
      title = tk.title ?? caseId;
      offenceFamily = tk.offenceFamily ?? "unknown";
      profile = tk.profile ?? "unknown";
      const bundle = readFileSync(sourcePath, "utf8");
      strata = [
        `family:${offenceFamily}`,
        `profile:${profile}`,
        `size:${bundle.length > 20000 ? "large" : bundle.length > 5000 ? "medium" : "small"}`,
        /\b(defendant|co-?defendant)\b/i.test(bundle) && /\band\b.+\bdefendant\b/i.test(bundle)
          ? "multi-defendant"
          : "single-defendant",
        /\bcount\s*[2-9]\b|\bcounts?\b/i.test(bundle) ? "multi-count" : "single-count",
        /\boc\s*r|illegible|noise/i.test(bundle) ? "ocr-noise" : "clean-text",
        /\bCCTV\b/i.test(bundle) ? "ev:cctv" : "ev:no-cctv",
        /\bBWV\b/i.test(bundle) ? "ev:bwv" : "ev:no-bwv",
        /\binterview\b/i.test(bundle) ? "ev:interview" : "ev:no-interview",
      ];
    } catch {
      /* skip bad truth */
      continue;
    }
    pool.push({
      caseId,
      title,
      offenceFamily,
      profile,
      sourcePath: rel(sourcePath),
      truthKeyPath: rel(truthKeyPath),
      strata,
    });
  }

  if (tier === "highrisk500") {
    const score = (m: ManifestMatter) => {
      const s = m.strata ?? [];
      let n = 0;
      if (s.includes("multi-defendant")) n += 5;
      if (s.includes("multi-count")) n += 4;
      if (s.includes("size:large")) n += 3;
      if (s.includes("ocr-noise")) n += 3;
      if (s.includes("ev:cctv")) n += 1;
      if (s.includes("ev:bwv")) n += 1;
      if (s.includes("ev:interview")) n += 1;
      return n;
    };
    return pool.sort((a, b) => score(b) - score(a) || a.caseId.localeCompare(b.caseId)).slice(0, 500);
  }

  // full3000 materialised lane: all ESA with truth (excluding holdout only; include gold for coverage)
  const all: ManifestMatter[] = [];
  for (const caseId of readdirSync(CASE_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)) {
    if (holdoutIds.has(caseId)) continue; // keep holdout sealed
    const sourcePath = path.join(CASE_ROOT, caseId, "bundle-text.md");
    const truthKeyPath = path.join(CASE_ROOT, caseId, "truth-key.json");
    if (!existsSync(sourcePath) || !existsSync(truthKeyPath)) continue;
    const tk = readJson<{ title?: string; offenceFamily?: string; profile?: string }>(truthKeyPath);
    all.push({
      caseId,
      title: tk.title ?? caseId,
      offenceFamily: tk.offenceFamily,
      profile: tk.profile,
      sourcePath: rel(sourcePath),
      truthKeyPath: rel(truthKeyPath),
    });
  }
  return all;
}

function rel(abs: string): string {
  return path.relative(ROOT, abs).replaceAll(path.sep, "/");
}

function absFromRel(p: string): string {
  return path.isAbsolute(p) ? p : path.join(ROOT, p);
}

function progressPath(tier: Tier): string {
  return path.join(OUT_ROOT, `progress-${tier}.json`);
}

function loadProgress(tier: Tier, head: string): Progress {
  const p = progressPath(tier);
  if (!existsSync(p)) {
    return { tier, head, completedCaseIds: [], startedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  }
  const prev = readJson<Progress>(p);
  if (prev.head !== head) {
    // New frozen commit → restart tier
    return { tier, head, completedCaseIds: [], startedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  }
  return prev;
}

function saveProgress(prog: Progress): void {
  prog.updatedAt = new Date().toISOString();
  writeFileSync(progressPath(prog.tier), JSON.stringify(prog, null, 2), "utf8");
}

function auditMatter(tier: Tier, matter: ManifestMatter): {
  findings: Finding[];
  claims: SolicitorVisibleClaim[];
  processing: "success" | "partial" | "failed_safely";
} {
  const findings: Finding[] = [];
  const claims: SolicitorVisibleClaim[] = [];
  const sourcePath = absFromRel(matter.sourcePath ?? path.join(CASE_ROOT, matter.caseId, "bundle-text.md"));
  const truthPath = absFromRel(matter.truthKeyPath ?? path.join(CASE_ROOT, matter.caseId, "truth-key.json"));
  if (!existsSync(sourcePath) || !existsSync(truthPath)) {
    return {
      findings: [
        {
          caseId: matter.caseId,
          tier,
          code: "MISSING_ARTEFACT",
          severity: "P1",
          classification: "COVERAGE_GAP_ONLY",
          detail: "bundle-text or truth-key missing",
        },
      ],
      claims: [],
      processing: "failed_safely",
    };
  }

  const bundleText = readFileSync(sourcePath, "utf8");
  const truth = readJson<{
    evidenceItems?: {
      evidence_item?: string;
      correct_evidence_state?: string;
      chase_needed?: boolean;
    }[];
    offenceWording?: string;
    title?: string;
  }>(truthPath);

  const allegation = truth.offenceWording ?? matter.title ?? matter.caseId;
  let chaseLabels: string[] = [];
  let courtAsks: string[] = [];
  let brief: ReturnType<typeof buildCriminalBriefPlan> | null = null;
  try {
    chaseLabels = workflowDisclosureChaseLabels({
      caseTitle: matter.title ?? matter.caseId,
      allegation,
      bundleText,
    }) ?? [];
    courtAsks = workflowCourtRecordAsks({
      caseTitle: matter.title ?? matter.caseId,
      allegation,
      bundleText,
    }) ?? [];
    brief = buildCriminalBriefPlan({ allegation, bundleText });
  } catch (e) {
    findings.push({
      caseId: matter.caseId,
      tier,
      code: "BUILDER_THROW",
      severity: "P0",
      classification: "CONFIRMED_LIVE_SHARED_DEFECT",
      detail: (e as Error).message,
    });
    return { findings, claims, processing: "failed_safely" };
  }

  const visibleLines = [
    ...chaseLabels.map((t) => ({ surface: "cps_chase" as const, section: "chase", text: t })),
    ...courtAsks.map((t) => ({ surface: "court" as const, section: "court_ask", text: t })),
    ...(brief
      ? [
          { surface: "court" as const, section: "chaseAngle", text: brief.chaseAngle },
          { surface: "client" as const, section: "summaryAngle", text: brief.summaryAngle },
          { surface: "court" as const, section: "todayAngle", text: brief.todayAngle },
          { surface: "overview" as const, section: "mainIssue", text: brief.mainIssue },
          ...brief.missingEvidence.map((m) => ({
            surface: "papers" as const,
            section: "missingEvidence",
            text: m.label,
          })),
        ]
      : []),
  ];

  for (const line of visibleLines) {
    if (!line.text?.trim()) continue;
    const cls = classifyClaimTextHeuristically(line.text);
    const claim: SolicitorVisibleClaim = {
      caseId: matter.caseId,
      surface: line.surface,
      section: line.section,
      text: line.text,
      claimKind: cls.claimKind,
      certainty: cls.certainty,
      supportClass: cls.supportClass,
    };
    claims.push(claim);

    // CAD compound invention
    if (/CAD\s*\/\s*999\s+audio\s*\/\s*control-room material/i.test(line.text)) {
      const has999 = /\b999\b|\bcall audio\b/i.test(bundleText);
      const hasCr = /\bcontrol[-\s]?room\b|\bdispatch\b/i.test(bundleText);
      if (!has999 || !hasCr) {
        findings.push({
          caseId: matter.caseId,
          tier,
          code: "CAD_COMPOUND_INVENTION",
          severity: "P1",
          classification: "CONFIRMED_LIVE_SHARED_DEFECT",
          detail: line.text,
          evidence: [line.surface],
        });
      }
    }

    // BWV invention without source
    if (
      /\bBWV\b/i.test(line.text) &&
      /(outstanding|missing|chase|remain)/i.test(line.text) &&
      !/does not invent|only where the papers support|consideration/i.test(line.text) &&
      !/\bbwv\b|body[-\s]?worn/i.test(bundleText)
    ) {
      findings.push({
        caseId: matter.caseId,
        tier,
        code: "BWV_INVENTION",
        severity: "P1",
        classification: "CONFIRMED_LIVE_SHARED_DEFECT",
        detail: line.text,
        evidence: [line.surface],
      });
    }

    // Self-defence remains live without source support
    if (
      /self-defence[^\n.]{0,40}remains live|self-defence is live/i.test(line.text) &&
      !/self-defence|self defense/i.test(bundleText)
    ) {
      findings.push({
        caseId: matter.caseId,
        tier,
        code: "UNSUPPORTED_DEFENCE_THEORY",
        severity: "P1",
        classification: "CONFIRMED_LIVE_SHARED_DEFECT",
        detail: line.text,
        evidence: [line.surface],
      });
    }

    if (isHighRiskClaimText(line.text) && cls.supportClass === "UNSUPPORTED_PROMOTION") {
      findings.push({
        caseId: matter.caseId,
        tier,
        code: "UNSUPPORTED_PROMOTION",
        severity: "P1",
        classification: "TRUTH_AMBIGUOUS_REQUIRES_REVIEW",
        detail: line.text.slice(0, 240),
        evidence: [line.surface, line.section],
      });
    }
  }

  // Interview polarity on bundle phrases
  if (/\btranscript\b/i.test(bundleText)) {
    const tr = inferInterviewTranscriptStateFromText(bundleText.slice(0, 12000));
    if (/\btranscript\b.{0,80}\b(?:is\s+)?not\s+served\b/i.test(bundleText) && tr === "served") {
      findings.push({
        caseId: matter.caseId,
        tier,
        code: "TRANSCRIPT_POLARITY_INVERT",
        severity: "P0",
        classification: "CONFIRMED_LIVE_SHARED_DEFECT",
        detail: `inferInterviewTranscriptStateFromText → ${tr}`,
      });
    }
  }
  if (/\binterview\s+recording\b/i.test(bundleText)) {
    const rec = inferInterviewRecordingStateFromText(bundleText.slice(0, 12000));
    if (
      /\binterview\s+recording\b.{0,80}\b(?:is\s+)?not\s+served\b/i.test(bundleText) &&
      rec === "served"
    ) {
      findings.push({
        caseId: matter.caseId,
        tier,
        code: "RECORDING_POLARITY_INVERT",
        severity: "P0",
        classification: "CONFIRMED_LIVE_SHARED_DEFECT",
        detail: `inferInterviewRecordingStateFromText → ${rec}`,
      });
    }
  }

  // Fragment label hygiene smoke
  if (isFragmentEvidenceLabel("full recording or transcript is not") !== true) {
    findings.push({
      caseId: matter.caseId,
      tier,
      code: "FRAGMENT_GATE_REGRESSION",
      severity: "P0",
      classification: "CONFIRMED_LIVE_SHARED_DEFECT",
      detail: "isFragmentEvidenceLabel failed negative-polarity gate",
    });
  }

  // CAD-only opposite: label helper
  if (/\bcad\b/i.test(bundleText) && !/\b999\b/i.test(bundleText)) {
    const lab = cad999DisplayLabel(["CAD timing compared with witness"]);
    if (/999/i.test(lab)) {
      findings.push({
        caseId: matter.caseId,
        tier,
        code: "CAD_LABEL_999",
        severity: "P1",
        classification: "CONFIRMED_LIVE_SHARED_DEFECT",
        detail: lab,
      });
    }
  }

  // Truth-key chase needed vs invented families (light)
  for (const item of truth.evidenceItems ?? []) {
    const name = item.evidence_item ?? "";
    if (!name) continue;
    if (/bwv/i.test(name) && item.correct_evidence_state === "missing" && !/\bbwv\b|body[-\s]?worn/i.test(bundleText)) {
      // truth says missing BWV but source never mentions — truth may be heuristic; mark ambiguous
      findings.push({
        caseId: matter.caseId,
        tier,
        code: "TRUTH_KEY_UNSOURCED_BWV",
        severity: "P2",
        classification: "TRUTH_AMBIGUOUS_REQUIRES_REVIEW",
        detail: name,
      });
    }
  }

  return { findings, claims, processing: "success" };
}

function clusterFindings(findings: Finding[]): Record<string, { count: number; severity: string; examples: string[] }> {
  const out: Record<string, { count: number; severity: string; examples: string[] }> = {};
  for (const f of findings) {
    if (f.classification !== "CONFIRMED_LIVE_SHARED_DEFECT") continue;
    const key = f.code;
    if (!out[key]) out[key] = { count: 0, severity: f.severity, examples: [] };
    out[key].count += 1;
    if (out[key].examples.length < 5) out[key].examples.push(`${f.caseId}: ${f.detail.slice(0, 120)}`);
  }
  return out;
}

function main(): void {
  mkdirSync(OUT_ROOT, { recursive: true });
  const tier = argTier();
  const head = gitHead();
  const matters = loadMatters(tier);
  const prog = loadProgress(tier, head);
  const done = new Set(prog.completedCaseIds);

  const claimsPath = path.join(OUT_ROOT, `claims-${tier}.ndjson`);
  const failuresPath = path.join(OUT_ROOT, `failures-${tier}.ndjson`);
  const processingPath = path.join(OUT_ROOT, `processing-${tier}.ndjson`);

  if (prog.completedCaseIds.length === 0) {
    writeFileSync(claimsPath, "", "utf8");
    writeFileSync(failuresPath, "", "utf8");
    writeFileSync(processingPath, "", "utf8");
  }

  const allFindings: Finding[] = [];
  let success = 0;
  let partial = 0;
  let failed = 0;
  let claimsCount = 0;

  // Reload prior failures if resuming
  if (existsSync(failuresPath)) {
    for (const line of readFileSync(failuresPath, "utf8").split(/\r?\n/)) {
      if (!line.trim()) continue;
      try {
        allFindings.push(JSON.parse(line) as Finding);
      } catch {
        /* ignore */
      }
    }
  }

  console.log(`[${tier}] head=${head.slice(0, 9)} matters=${matters.length} resume=${done.size}`);

  for (const matter of matters) {
    if (done.has(matter.caseId)) continue;
    const result = auditMatter(tier, matter);
    if (result.processing === "success") success += 1;
    else if (result.processing === "partial") partial += 1;
    else failed += 1;

    for (const c of result.claims) {
      appendFileSync(claimsPath, `${JSON.stringify(c)}\n`, "utf8");
      claimsCount += 1;
    }
    for (const f of result.findings) {
      appendFileSync(failuresPath, `${JSON.stringify(f)}\n`, "utf8");
      allFindings.push(f);
    }
    appendFileSync(
      processingPath,
      `${JSON.stringify({
        caseId: matter.caseId,
        tier,
        processing: result.processing,
        findings: result.findings.length,
        claims: result.claims.length,
      })}\n`,
      "utf8",
    );

    done.add(matter.caseId);
    prog.completedCaseIds = [...done];
    if (done.size % 25 === 0) {
      saveProgress(prog);
      console.log(`[${tier}] progress ${done.size}/${matters.length}`);
    }
  }
  saveProgress(prog);

  // Recount processing from this run's completed set
  success = 0;
  partial = 0;
  failed = 0;
  if (existsSync(processingPath)) {
    for (const line of readFileSync(processingPath, "utf8").split(/\r?\n/)) {
      if (!line.trim()) continue;
      const row = JSON.parse(line) as { processing: string };
      if (row.processing === "success") success += 1;
      else if (row.processing === "partial") partial += 1;
      else failed += 1;
    }
  }
  claimsCount = 0;
  if (existsSync(claimsPath)) {
    for (const line of readFileSync(claimsPath, "utf8").split(/\r?\n/)) {
      if (line.trim()) claimsCount += 1;
    }
  }

  const confirmed = allFindings.filter((f) => f.classification === "CONFIRMED_LIVE_SHARED_DEFECT");
  const clusters = clusterFindings(allFindings);

  let messyAccount: Record<string, unknown> | null = null;
  if (tier === "full3000" && existsSync(MESSY_SUMMARY)) {
    const messy = readJson<{ totals?: { casesRun?: number }; cases?: { caseId: string }[] }>(MESSY_SUMMARY);
    const messyIds = (messy.cases ?? []).map((c) => c.caseId);
    const materialised = new Set(matters.map((m) => m.caseId));
    const notMaterialised = messyIds.filter((id) => !materialised.has(id));
    messyAccount = {
      messyCorpusDeclared: messy.totals?.casesRun ?? messyIds.length,
      materialisedAuditedExcludingHoldout: matters.length,
      notMaterialisedLocally: notMaterialised.length,
      note: "Full3000 identities from messy-v9 are accounted; only ESA-materialised bundles were claim-audited against current HEAD.",
    };
    writeFileSync(
      path.join(OUT_ROOT, "processing-limitations.json"),
      JSON.stringify(
        {
          recordedAt: new Date().toISOString(),
          head,
          messyAccount,
          holdoutSealed: true,
        },
        null,
        2,
      ),
      "utf8",
    );
  }

  const summary = {
    tier,
    head,
    recordedAt: new Date().toISOString(),
    mattersSelected: matters.length,
    mattersCompleted: done.size,
    processing: { success, partial, failed_safely: failed },
    claimsAudited: claimsCount,
    findingsTotal: allFindings.length,
    confirmedLiveSharedDefects: confirmed.length,
    confirmedBySeverity: {
      P0: confirmed.filter((f) => f.severity === "P0").length,
      P1: confirmed.filter((f) => f.severity === "P1").length,
      P2: confirmed.filter((f) => f.severity === "P2").length,
    },
    clusters,
    messyAccount,
    corpusManifestSha256: sha(JSON.stringify(matters.map((m) => m.caseId).sort())),
    gateClean: confirmed.filter((f) => f.severity === "P0" || f.severity === "P1").length === 0,
  };

  writeFileSync(path.join(OUT_ROOT, `run-summary-${tier}.json`), JSON.stringify(summary, null, 2), "utf8");
  writeFileSync(path.join(OUT_ROOT, `clusters-${tier}.json`), JSON.stringify(clusters, null, 2), "utf8");
  writeFileSync(
    path.join(OUT_ROOT, `corpus-manifest-${tier}.json`),
    JSON.stringify(
      {
        tier,
        head,
        count: matters.length,
        caseIds: matters.map((m) => m.caseId),
        offenceFamilies: Object.fromEntries(
          Object.entries(
            matters.reduce<Record<string, number>>((acc, m) => {
              const k = m.offenceFamily ?? "unknown";
              acc[k] = (acc[k] ?? 0) + 1;
              return acc;
            }, {}),
          ),
        ),
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log(JSON.stringify(summary, null, 2));
  if (!summary.gateClean) {
    console.error(`[${tier}] OPEN confirmed P0/P1 — stop scale escalation until shared-root fix`);
    process.exitCode = 2;
  } else {
    console.log(`[${tier}] GATE CLEAN`);
  }
}

main();
