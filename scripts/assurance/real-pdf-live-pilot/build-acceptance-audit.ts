/**
 * Final Codex acceptance audit artefacts for Real-PDF Live Pilot v1.
 * Regenerates control-exercise-audit-24, raster/wording acceptance reports,
 * and a Markdown register. Does not claim PASS / auth / browser / merge.
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { MASTER_CONTROL_REGISTRY } from "../../../lib/eval/master-assurance-auditor/control-registry";

const ART =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/real-pdf-live-pilot-v1";
const HIST =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/real-pdf-live-pilot-v1-historical-pre-wording-remediation";

function readJson<T>(p: string): T {
  return JSON.parse(fs.readFileSync(p, "utf8")) as T;
}

const summary = readJson<{
  exercises: Array<{
    controlId: string;
    laneId?: string;
    status: string;
    findingsEmitted: number;
    passCount: number;
    defectCount: number;
    unresolvedCount: number;
    containmentCount: number;
    notExercisedFindingCount: number;
    casesApplicable: number;
    casesFullyExercised: number;
    casesPartiallyExercised: number;
    casesNotExercised: number;
    notExercisedReason?: string | null;
  }>;
}>(path.join(ART, "per-control-exercise-summary.json"));

const histWording = readJson<{
  occurrences: number;
  exactStrings: number;
  normalisedTemplates: number;
  casesWithIssues: number;
  byKind: Record<string, unknown>;
}>(path.join(HIST, "wording-denominator-summary.json"));

const liveWording = readJson<{
  occurrences: number;
  exactStrings: number;
  normalisedTemplates: number;
  casesWithIssues: number;
  byKind: Record<string, unknown>;
}>(path.join(ART, "wording-denominator-summary.json"));

const liveDisp = readJson<{ genuineProductDefectGate?: unknown }>(
  path.join(ART, "wording-triage-disposition.json"),
);

const raster = readJson<{
  launchStatus?: unknown;
  results: Array<{
    caseId: string;
    status: string;
    pageCount: number;
    pages?: unknown[];
    anyBlankPage?: boolean;
    anyTinyContentBoundingBox?: boolean;
    anyBrokenFontSuspected?: boolean;
    incompleteChargeWarningPresentInText?: boolean;
  }>;
}>(path.join(ART, "output-pdf-raster-results.json"));

/** Exact field prerequisites per control, derived from run-all-controls.ts handlers. */
const PREREQS: Record<string, string[]> = {
  "MAA-INGEST-COVERAGE": [
    "SavedCaseMaterialisation.inputBundlePath (or adapter equivalent)",
    "projectForControlAdapter from live surfaces",
  ],
  "MAA-DOC-LIFECYCLE": [
    "truthMapRows with draft vs signed/final language signals",
    "projectForControlAdapter",
  ],
  "MAA-PARTIES-ATTRIBUTION": [
    "multi-party / attribution rows on packet (often absent on single-defendant strategy adapter)",
    "projectForControlAdapter",
  ],
  "MAA-CHARGE-MODEL": [
    "allegation and/or charges[] on adapter packet",
    "projectForControlAdapter",
  ],
  "MAA-EVIDENCE-STATE": [
    "evidence-state distinct units on truth map / evidence rows",
    "projectForControlAdapter",
  ],
  "MAA-CHRONOLOGY-HEARING": [
    "hearing/chronology surfaces or court line text",
    "projectForControlAdapter",
  ],
  "MAA-PROVENANCE": [
    "provenance lines / surface text with source linkage signals",
    "projectForControlAdapter",
  ],
  "MAA-RELIABILITY": [
    "reliability/limitation language on truth map or surfaces",
    "projectForControlAdapter",
  ],
  "MAA-COMPLETENESS": [
    "charge completeness / missing-item signals on surfaces",
    "projectForControlAdapter",
  ],
  "MAA-DEFENCE-LENS": [
    "defence-oriented surface text (war room / key facts)",
    "projectForControlAdapter",
  ],
  "MAA-PROSECUTION-LENS": [
    "prosecution-oriented surface text (often limited on defence adapter)",
    "projectForControlAdapter",
  ],
  "MAA-JUDICIAL-LENS": [
    "court_line / hearing readiness signal",
    "projectForControlAdapter",
  ],
  "MAA-LEGAL-CURRENTNESS": [
    "allegation string for Act/OAPA/PACE/Theft Act/PFHA regex only",
    "NO offence-label registry cross-check in this detector path",
    "projectForControlAdapter",
  ],
  "MAA-AUDIENCE-WORDING": [
    "client_summary surface text with audience disclaimer patterns",
    "projectForControlAdapter",
  ],
  "MAA-ACTION-QUALITY": [
    "action/next-step signals on packet surfaces",
    "projectForControlAdapter",
  ],
  "MAA-CROSS-EXIT": [
    "multi-exit surface projections from live adapter",
    "projectForControlAdapter",
  ],
  "MAA-CROSS-SURFACE": [
    "multi-surface live packet (charges/war room/key facts/chase)",
    "projectForControlAdapter",
  ],
  "MAA-CHASE-QUALITY": [
    "cpsChase / disclosure chase items",
    "projectForControlAdapter",
  ],
  "MAA-HALLUCINATION": [
    "surface text for absolute-proof phrase scan",
    "projectForControlAdapter",
  ],
  "MAA-SECURITY-PRIVACY": [
    "surface texts for INTERNAL_LEAK_RE / FIXTURE_PATH_RE negative scan only",
    "NO auth/ACL/PII-pipeline exercise",
    "projectForControlAdapter",
  ],
  "MAA-RESILIENCE": [
    "stable caseId on loaded packet (thin proxy)",
    "projectForControlAdapter",
  ],
  "MAA-OUTPUT-DESIGN": [
    "truthMapRows / cpsChase presence for urgent-signal design pass",
    "projectForControlAdapter",
  ],
  "MAA-HUMAN-SUPERVISION": [
    "concatenated surface text for fabricated sign-off phrase scan only",
    "NO actual human reviewer workflow",
    "projectForControlAdapter",
  ],
  "MAA-BIAS-FAIRNESS": [
    "concatenated surface text for PREJUDICE_RE negative scan only",
    "does not prove fairness",
    "projectForControlAdapter",
  ],
};

const PHRASE_PROXY = new Set([
  "MAA-LEGAL-CURRENTNESS",
  "MAA-SECURITY-PRIVACY",
  "MAA-HUMAN-SUPERVISION",
  "MAA-BIAS-FAIRNESS",
  "MAA-RESILIENCE",
  "MAA-OUTPUT-DESIGN",
]);

const PHRASE_PROXY_NOTES: Record<string, string> = {
  "MAA-LEGAL-CURRENTNESS":
    "Phrase/proxy: regex for Act/OAPA/PACE/Theft Act/PFHA on allegation only; no controlled offence registry trace. Mostly not_exercised; unresolved when citation-like text present. Not a full legal-currentness exercise.",
  "MAA-SECURITY-PRIVACY":
    "Phrase/proxy negative scan: INTERNAL_LEAK_RE / FIXTURE_PATH_RE over surface text; absence yields pass. Does not exercise auth, ACL, PII redaction pipeline, or storage controls.",
  "MAA-HUMAN-SUPERVISION":
    "Phrase/proxy negative scan: detects fabricated sign-off language only; absence yields pass. Does not exercise an actual human reviewer workflow; human fields remain blank.",
  "MAA-BIAS-FAIRNESS":
    "Phrase/proxy negative scan: PREJUDICE_RE over concatenated text; absence yields low-confidence pass. Explicitly does not prove fairness.",
  "MAA-RESILIENCE":
    "Thin proxy: emits pass when case packet loaded under stable caseId. Deterministic ID stability across reruns is not proven per finding in this pilot.",
  "MAA-OUTPUT-DESIGN":
    "Design-signal lane: pass based on presence/absence of chase/urgent signals. Marked designFinding; not a factual defect exercise.",
};

type SampleFinding = {
  caseId: string;
  finding: {
    controlId?: string;
    verdict?: string;
    code?: string;
    surface?: string;
    exactWording?: string;
    plainEnglish?: string;
    supportingHash?: string;
  };
  receiptPath: string;
};

const receiptDir = path.join(ART, "bulk/receipts");
const sampleByControl = new Map<string, SampleFinding>();
const codesByControl = new Map<string, Set<string>>();
if (fs.existsSync(receiptDir)) {
  for (const file of fs.readdirSync(receiptDir).filter((f) => f.endsWith(".json"))) {
    const receiptPath = path.join(receiptDir, file);
    const rec = readJson<{
      caseId: string;
      findings?: SampleFinding["finding"][];
    }>(receiptPath);
    for (const f of rec.findings || []) {
      if (!f.controlId) continue;
      if (!codesByControl.has(f.controlId)) codesByControl.set(f.controlId, new Set());
      if (f.code) codesByControl.get(f.controlId)!.add(f.code);
      if (!sampleByControl.has(f.controlId)) {
        sampleByControl.set(f.controlId, {
          caseId: rec.caseId,
          finding: f,
          receiptPath: receiptPath.replace(/\\/g, "/"),
        });
      }
    }
  }
}

type ControlAuditRecord = {
  controlId: string;
  laneId: string | null;
  label: string | null;
  claimedStatusInSummary: string;
  honestExerciseStatus: string;
  exerciseClass: string;
  phraseProxyReclassificationNote: string | null;
  substantiveHandler: {
    entrypoint: string;
    reusedModules: string[];
    adapter: string;
  };
  exactPrerequisites: string[];
  applicableCaseUnitDenominator: {
    casesApplicable: number;
    unit: string;
    denominatorNote: string;
    casesFullyExercised: number;
    casesPartiallyExercised: number;
    casesNotExercised: number;
  };
  behaviouralContractRefs: string[];
  findingResultSummary: {
    findingsEmitted: number;
    passCount: number;
    defectCount: number;
    unresolvedCount: number;
    containmentCount: number;
    notExercisedFindingCount: number;
    observedCodes: string[];
    notExercisedReason: string | null;
  };
  evidenceRefs: {
    perControlSummary: string;
    sampleReceiptPath: string | null;
    sampleCaseId: string | null;
    sampleVerdict: string | null;
    sampleCode: string | null;
    sampleSurface: string | null;
    exactWordingPreview: string;
    plainEnglish: string;
    note: string;
  };
  registryIntent: string | null;
  severity: string | null;
};

const audits: ControlAuditRecord[] = [];
for (const ex of summary.exercises) {
  const reg = MASTER_CONTROL_REGISTRY.find((c) => c.id === ex.controlId);
  const sample = sampleByControl.get(ex.controlId);
  const isProxy = PHRASE_PROXY.has(ex.controlId);
  let honestStatus = ex.status;
  let exerciseClass = "substantive_detector";

  if (
    ex.status === "not_exercised" ||
    (ex.notExercisedFindingCount === ex.findingsEmitted &&
      ex.passCount === 0 &&
      ex.defectCount === 0 &&
      ex.unresolvedCount === 0 &&
      ex.containmentCount === 0)
  ) {
    honestStatus = "not_exercised";
    exerciseClass = "invoked_but_not_exercised";
  } else if (isProxy) {
    exerciseClass = "phrase_proxy_or_negative_scan";
    if (ex.status === "fully_exercised") honestStatus = "partially_exercised";
  }

  audits.push({
    controlId: ex.controlId,
    laneId: ex.laneId || reg?.laneId || null,
    label: reg?.label || null,
    claimedStatusInSummary: ex.status,
    honestExerciseStatus: honestStatus,
    exerciseClass,
    phraseProxyReclassificationNote: PHRASE_PROXY_NOTES[ex.controlId] || null,
    substantiveHandler: {
      entrypoint: `lib/eval/master-assurance-auditor/controls/run-all-controls.ts#${ex.controlId}`,
      reusedModules: reg?.reusedModules || [],
      adapter: "scripts/assurance/real-pdf-live-pilot/pdf-materialise.ts#projectForControlAdapter",
    },
    exactPrerequisites: PREREQS[ex.controlId] || [
      "SavedCaseMaterialisation adapter from live surfaces",
      "run-all-controls.ts",
    ],
    applicableCaseUnitDenominator: {
      casesApplicable: ex.casesApplicable,
      unit: "pilot_matter_RP_xx",
      denominatorNote:
        "20 frozen real-PDF matters projected into SavedCaseMaterialisation via projectForControlAdapter",
      casesFullyExercised: ex.casesFullyExercised,
      casesPartiallyExercised: ex.casesPartiallyExercised,
      casesNotExercised: ex.casesNotExercised,
    },
    behaviouralContractRefs: [
      reg?.mutationOrContract
        ? `scripts/${reg.mutationOrContract.replace(/^scripts\//, "")}`
        : "scripts/master-assurance-auditor-contracts.test.ts",
      ...(reg?.reusedModules || []).slice(0, 3),
    ],
    findingResultSummary: {
      findingsEmitted: ex.findingsEmitted,
      passCount: ex.passCount,
      defectCount: ex.defectCount,
      unresolvedCount: ex.unresolvedCount,
      containmentCount: ex.containmentCount,
      notExercisedFindingCount: ex.notExercisedFindingCount,
      observedCodes: [...(codesByControl.get(ex.controlId) || [])].sort(),
      notExercisedReason: ex.notExercisedReason ?? null,
    },
    evidenceRefs: {
      perControlSummary:
        "artifacts/casebrain-qa/assurance/master-auditor-v2/real-pdf-live-pilot-v1/per-control-exercise-summary.json",
      sampleReceiptPath: sample?.receiptPath || null,
      sampleCaseId: sample?.caseId || null,
      sampleVerdict: sample?.finding.verdict || null,
      sampleCode: sample?.finding.code || null,
      sampleSurface: sample?.finding.surface || null,
      exactWordingPreview: (sample?.finding.exactWording || "").slice(0, 160),
      plainEnglish: (sample?.finding.plainEnglish || "").slice(0, 220),
      note: "Receipts live under gitignored bulk/receipts/ (regenerable). Compact summary artefacts are committed.",
    },
    registryIntent: reg?.intent || null,
    severity: reg?.severity || null,
  });
}

const counts = {
  claimedInvoked: audits.length,
  claimedExercisedInPriorSummary: 24,
  honestFullyExercised: audits.filter((a) => a.honestExerciseStatus === "fully_exercised")
    .length,
  honestPartiallyExercised: audits.filter(
    (a) => a.honestExerciseStatus === "partially_exercised",
  ).length,
  honestNotExercised: audits.filter((a) => a.honestExerciseStatus === "not_exercised")
    .length,
  phraseProxyOrNegativeScan: audits.filter(
    (a) => a.exerciseClass === "phrase_proxy_or_negative_scan",
  ).length,
  invokedButNotExercised: audits.filter(
    (a) => a.exerciseClass === "invoked_but_not_exercised",
  ).length,
  substantiveDetector: audits.filter((a) => a.exerciseClass === "substantive_detector")
    .length,
};

const specialAttention = [
  "MAA-LEGAL-CURRENTNESS",
  "MAA-SECURITY-PRIVACY",
  "MAA-HUMAN-SUPERVISION",
  "MAA-BIAS-FAIRNESS",
].map((id) => audits.find((a) => a.controlId === id));

const auditDoc = {
  schemaVersion: "real-pdf-live-pilot-control-exercise-audit-24@1.1.0",
  generatedAt: new Date().toISOString(),
  honestyPreamble:
    'The prior claim "24 controls exercised" means 24 V1 registry controls were INVOKED via runAllControls against the live-surface adapter. This audit reclassifies each control by actual finding outcomes and detector substance. Phrase-proxy / negative-scan lanes are not treated as full substantive exercise. Auth HTTP and browser workflows remain NOT_EXERCISED.',
  counts,
  specialAttentionReclassification: specialAttention,
  controls: audits,
};
fs.writeFileSync(
  path.join(ART, "control-exercise-audit-24.json"),
  JSON.stringify(auditDoc, null, 2) + "\n",
);

const mdLines: string[] = [
  "# Control exercise audit — 24 V1 controls (honest reclassification)",
  "",
  auditDoc.honestyPreamble,
  "",
  "## Counts",
  "",
  `- Claimed invoked: **${counts.claimedInvoked}**`,
  `- Honest fully_exercised: **${counts.honestFullyExercised}**`,
  `- Honest partially_exercised: **${counts.honestPartiallyExercised}**`,
  `- Honest not_exercised: **${counts.honestNotExercised}**`,
  `- Phrase-proxy / negative-scan: **${counts.phraseProxyOrNegativeScan}**`,
  `- Invoked but not exercised: **${counts.invokedButNotExercised}**`,
  `- Substantive detector class: **${counts.substantiveDetector}**`,
  "",
  "## Special attention",
  "",
];
for (const a of specialAttention) {
  if (!a) continue;
  mdLines.push(
    `### ${a.controlId}`,
    `- Honest status: **${a.honestExerciseStatus}** (claimed: ${a.claimedStatusInSummary})`,
    `- Class: ${a.exerciseClass}`,
    `- Note: ${a.phraseProxyReclassificationNote}`,
    "",
  );
}
mdLines.push("## Per-control register", "");
for (const a of audits) {
  mdLines.push(
    `### ${a.controlId} — ${a.label || a.laneId}`,
    `- Handler: \`${a.substantiveHandler.entrypoint}\``,
    `- Prerequisites: ${a.exactPrerequisites.map((p) => `\`${p}\``).join("; ")}`,
    `- Denominator: ${a.applicableCaseUnitDenominator.casesApplicable} cases (${a.applicableCaseUnitDenominator.unit}); FE=${a.applicableCaseUnitDenominator.casesFullyExercised} PE=${a.applicableCaseUnitDenominator.casesPartiallyExercised} NE=${a.applicableCaseUnitDenominator.casesNotExercised}`,
    `- Behavioural contract refs: ${a.behaviouralContractRefs.join(", ")}`,
    `- Finding/result: findings=${a.findingResultSummary.findingsEmitted} pass=${a.findingResultSummary.passCount} defect=${a.findingResultSummary.defectCount} unresolved=${a.findingResultSummary.unresolvedCount} containment=${a.findingResultSummary.containmentCount} NE-findings=${a.findingResultSummary.notExercisedFindingCount}; codes=[${a.findingResultSummary.observedCodes.join(", ")}]`,
    `- Evidence: sample ${a.evidenceRefs.sampleCaseId || "n/a"} / ${a.evidenceRefs.sampleCode || "n/a"} / ${a.evidenceRefs.sampleReceiptPath || "compact summary only"}`,
    `- Honest status: **${a.honestExerciseStatus}** (${a.exerciseClass})`,
    "",
  );
}
fs.writeFileSync(path.join(ART, "control-exercise-audit-24.md"), mdLines.join("\n") + "\n");

const pages = raster.results.flatMap((r) => r.pages || []);
const rasterAcceptance = {
  schemaVersion: "real-pdf-live-pilot-output-pdf-raster-acceptance@1.0.0",
  generatedAt: new Date().toISOString(),
  outputPdfCount: raster.results.length,
  totalPagesRendered: pages.length || raster.results.reduce((n, r) => n + (r.pageCount || 0), 0),
  pagesActuallyInspected:
    pages.length || raster.results.reduce((n, r) => n + (r.pageCount || 0), 0),
  inspectionMethod: {
    automatedGeometryChecks: true,
    automatedGeometryChecksDetail:
      "blank/near-all-white pixel fraction; non-white bounding-box tiny-content heuristic; tofu/replacement-char density from extracted text layer; %PDF header; pageCount>0",
    humanVisualReviewCompleted: false,
    humanVisualReviewNote:
      "Human/legal visual review fields remain blank. Automated raster inspection only.",
  },
  failures: {
    clippingOrTinyContentBoundingBox: raster.results.filter(
      (r) => r.anyTinyContentBoundingBox,
    ).length,
    blankOrNearAllWhitePages: raster.results.filter((r) => r.anyBlankPage).length,
    brokenFontOrTofuSuspected: raster.results.filter((r) => r.anyBrokenFontSuspected)
      .length,
    overflowFailuresRecorded: 0,
    overflowNote:
      "No dedicated overflow detector beyond tiny-content bbox heuristic; no overflow failures flagged.",
  },
  launchStatus: raster.launchStatus,
  perPdf: raster.results.map((r) => ({
    caseId: r.caseId,
    status: r.status,
    pageCount: r.pageCount,
    anyBlankPage: r.anyBlankPage,
    anyTinyContentBoundingBox: r.anyTinyContentBoundingBox,
    anyBrokenFontSuspected: r.anyBrokenFontSuspected,
    incompleteChargeWarningPresentInText: r.incompleteChargeWarningPresentInText,
  })),
};
fs.writeFileSync(
  path.join(ART, "output-pdf-raster-acceptance.json"),
  JSON.stringify(rasterAcceptance, null, 2) + "\n",
);

fs.writeFileSync(
  path.join(ART, "output-pdf-visual-report.md"),
  `# Output PDF visual / raster report (acceptance)

## Counts
- Genuine CaseBrain output PDFs: **${rasterAcceptance.outputPdfCount}**
- Total pages rendered: **${rasterAcceptance.totalPagesRendered}**
- Pages actually inspected (automated): **${rasterAcceptance.pagesActuallyInspected}**

## Inspection method
- Automated geometry checks: **yes** (blank/near-white, tiny non-white bbox, tofu/font heuristic, PDF header)
- Human visual review: **not completed** (fields blank)

## Failures
- Clipping / tiny-content bbox: **${rasterAcceptance.failures.clippingOrTinyContentBoundingBox}**
- Blank / near-all-white pages: **${rasterAcceptance.failures.blankOrNearAllWhitePages}**
- Broken font / tofu suspected: **${rasterAcceptance.failures.brokenFontOrTofuSuspected}**
- Overflow failures recorded: **${rasterAcceptance.failures.overflowFailuresRecorded}**

## Notes
- Raster exercised via Puppeteer + pdf.js CDN.
- Source PDFs were never counted as output PDFs.
- No authenticated browser claim.
`,
);

const wordingAcceptance = {
  schemaVersion: "real-pdf-live-pilot-wording-acceptance-denominators@1.0.0",
  generatedAt: new Date().toISOString(),
  scopeNote:
    "Separate denominators for historical pre-remediation pilot outputs vs post-remediation rematerialisation. Not the 1.7M corpus.",
  historicalPreRemediation: {
    path: HIST,
    occurrences: histWording.occurrences,
    exactStrings: histWording.exactStrings,
    normalisedTemplates: histWording.normalisedTemplates,
    casesWithIssues: histWording.casesWithIssues,
    byKind: histWording.byKind,
    triageOfHistoricalHits: {
      truncation: {
        claimedOccurrences: 238,
        disposition: "detector_false_positive_majority",
        note: "Complete endings (proof/page/record/pace/report/full) flagged by over-broad mid-word heuristic.",
      },
      snake_case_enum_leak: {
        claimedOccurrences: 112,
        disposition: "genuine_product_defect_fixed",
        note: "Provenance/document-type/evidence-state enums leaked; fixed in shared layers.",
      },
      acronym_casing: {
        claimedOccurrences: 9,
        disposition: "genuine_product_defect_fixed",
        note: "mG5/mG6-class casing; fixed via preserveProtectedAcronyms sanitization pass.",
      },
    },
  },
  postRemediation: {
    occurrences: liveWording.occurrences,
    exactStrings: liveWording.exactStrings,
    normalisedTemplates: liveWording.normalisedTemplates,
    casesWithIssues: liveWording.casesWithIssues,
    byKind: liveWording.byKind,
    genuineProductDefectGate: liveDisp.genuineProductDefectGate,
  },
};
fs.writeFileSync(
  path.join(ART, "wording-acceptance-denominators.json"),
  JSON.stringify(wordingAcceptance, null, 2) + "\n",
);

fs.writeFileSync(
  path.join(ART, "wording-acceptance-report.md"),
  `# Wording acceptance denominators

## Historical (pre-wording-remediation)
- Occurrences: **${histWording.occurrences}**
- Exact strings: **${histWording.exactStrings}**
- Normalised templates: **${histWording.normalisedTemplates}**
- Cases with issues: **${histWording.casesWithIssues}**

### Historical triage (genuine vs detector FP)
- Truncation (~238 claimed): **detector false-positive majority**
- Snake_case enum leak (~112): **genuine product defect — fixed**
- Acronym casing (~9): **genuine product defect — fixed**

## Post-remediation (current pilot outputs)
- Occurrences: **${liveWording.occurrences}**
- Exact strings: **${liveWording.exactStrings}**
- Normalised templates: **${liveWording.normalisedTemplates}**
- Cases with issues: **${liveWording.casesWithIssues}**
`,
);

console.log(
  JSON.stringify(
    {
      counts,
      raster: {
        pdfs: rasterAcceptance.outputPdfCount,
        pages: rasterAcceptance.totalPagesRendered,
        failures: rasterAcceptance.failures,
      },
      wording: {
        histOcc: histWording.occurrences,
        liveOcc: liveWording.occurrences,
      },
      sha256Audit: crypto
        .createHash("sha256")
        .update(fs.readFileSync(path.join(ART, "control-exercise-audit-24.json")))
        .digest("hex"),
    },
    null,
    2,
  ),
);
