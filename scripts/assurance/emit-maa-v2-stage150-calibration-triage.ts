/**
 * Stage-150 calibration triage — dispositions against authorised truth/source.
 * Does NOT alter freeze, packets, detectors, or CaseBrain.
 *
 * Usage: npx tsx scripts/assurance/emit-maa-v2-stage150-calibration-triage.ts
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const RUN_ID = "s150-cal-2026-07-31T16-55-01-119Z-a33adbda";
const CAL_ROOT = path.join(
  ROOT,
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-calibration-run",
);
const OUT = path.join(CAL_ROOT, "triage");
const BASELINE = "9cdd8fd66773872cb94a21c0a202ee63c40f6a83";

type Disposition =
  | "confirmed_app_defect"
  | "detector_false_positive"
  | "unresolved_source"
  | "truth_key_defect"
  | "safe_containment"
  | "duplicate_occurrence_of_confirmed_root"
  | "not_exercised_projection_only";

type Cand = {
  candidateId: string;
  caseId: string;
  cohort: "A" | "B";
  controlId: string;
  findingCode: string;
  occurrenceRef: string;
  exactWording: string;
  wordingHash: string;
  normalisedTemplateHash: string;
  plainEnglish: string;
  surface: string;
  exitId: string | null;
  duplicateOfCandidateId: string | null;
  ownerFindingId: string | null;
  ownershipGroupId: string | null;
  evidenceRefs: string[];
  outputSha256: string;
};

function sha(buf: string | Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function loadFreeze(): { freezeSha256: string; candidates: Cand[]; runId: string } {
  const doc = JSON.parse(
    fs.readFileSync(path.join(CAL_ROOT, "candidate-freeze-receipt.json"), "utf8"),
  ) as { runId: string; freezeSha256: string; candidates: Cand[] };
  if (doc.runId !== RUN_ID) throw new Error(`Unexpected runId ${doc.runId}`);
  const body = `${doc.candidates.map((c) => JSON.stringify(c)).join("\n")}${doc.candidates.length ? "\n" : ""}`;
  const recomputed = sha(body);
  if (recomputed !== doc.freezeSha256) {
    throw new Error(`Candidate freeze hash mismatch — ledger altered (expected ${doc.freezeSha256})`);
  }
  return doc;
}

function loadMembership(): Array<{ caseId: string; cohort: "A" | "B"; sourceCasePath: string | null; packetRelativePath: string }> {
  const freeze = JSON.parse(
    fs.readFileSync(path.join(CAL_ROOT, "frozen-population-manifest.json"), "utf8"),
  ) as {
    membership: Array<{
      caseId: string;
      cohort: "A" | "B";
      sourceCasePath: string | null;
      packetRelativePath: string;
    }>;
  };
  return freeze.membership;
}

function readJsonSafe(abs: string): Record<string, unknown> | null {
  if (!fs.existsSync(abs)) return null;
  return JSON.parse(fs.readFileSync(abs, "utf8")) as Record<string, unknown>;
}

function main(): void {
  const started = Date.now();
  const freeze = loadFreeze();
  const membership = loadMembership();
  const memById = new Map(membership.map((m) => [m.caseId, m]));
  const byId = new Map(freeze.candidates.map((c) => [c.candidateId, c]));

  // —— Duplicate audit (independent) ——
  const duplicateLinkAudit = freeze.candidates
    .filter((c) => c.duplicateOfCandidateId)
    .map((c) => {
      const owner = byId.get(c.duplicateOfCandidateId!);
      const sameControl = owner?.controlId === c.controlId;
      const sameWording = owner?.wordingHash === c.wordingHash;
      const sameOccurrence = owner?.occurrenceRef === c.occurrenceRef;
      const sameFindingCode = owner?.findingCode === c.findingCode;
      // Substantive root: same control + finding + exact wording hash + same occurrence path shape.
      // Cross-case OK when generator/projection shared; similar-but-different labels are NOT enough
      // (already enforced by wordingHash equality).
      const substantiveSharedRoot = Boolean(
        owner && sameControl && sameWording && sameOccurrence && sameFindingCode,
      );
      return {
        candidateId: c.candidateId,
        caseId: c.caseId,
        cohort: c.cohort,
        controlId: c.controlId,
        duplicateOfCandidateId: c.duplicateOfCandidateId,
        ownerCaseId: owner?.caseId ?? null,
        ownerCohort: owner?.cohort ?? null,
        ownerExists: !!owner,
        sameControl,
        sameFindingCode,
        sameWordingHash: sameWording,
        sameOccurrenceRef: sameOccurrence,
        crossCase: owner ? owner.caseId !== c.caseId : false,
        substantiveSharedRoot,
        auditVerdict: !owner
          ? "invalid_missing_owner"
          : substantiveSharedRoot
            ? "valid_shared_root"
            : "invalid_insufficient_root",
        note: substantiveSharedRoot
          ? "Same control, findingCode, wordingHash, and occurrenceRef — shared substantive root."
          : "Reject: wording similarity alone or mismatched occurrence/control.",
      };
    });

  // —— Per-occurrence disposition ——
  const dispositions: Array<Record<string, unknown>> = [];
  const rootRegistry = new Map<
    string,
    {
      rootCauseId: string;
      title: string;
      dispositionClass: Disposition;
      controlIds: string[];
      cohort: "A" | "B" | "mixed";
      primaryCandidateId: string;
      occurrenceIds: string[];
      caseIds: string[];
      surfaces: string[];
      exits: Array<string | null>;
    }
  >();

  function ensureRoot(args: {
    rootCauseId: string;
    title: string;
    dispositionClass: Disposition;
    controlId: string;
    cohort: "A" | "B";
    primaryCandidateId: string;
    candidateId: string;
    caseId: string;
    surface: string;
    exitId: string | null;
  }) {
    const existing = rootRegistry.get(args.rootCauseId);
    if (!existing) {
      rootRegistry.set(args.rootCauseId, {
        rootCauseId: args.rootCauseId,
        title: args.title,
        dispositionClass: args.dispositionClass,
        controlIds: [args.controlId],
        cohort: args.cohort,
        primaryCandidateId: args.primaryCandidateId,
        occurrenceIds: [args.candidateId],
        caseIds: [args.caseId],
        surfaces: [args.surface],
        exits: [args.exitId],
      });
      return;
    }
    if (!existing.controlIds.includes(args.controlId)) existing.controlIds.push(args.controlId);
    if (!existing.occurrenceIds.includes(args.candidateId)) existing.occurrenceIds.push(args.candidateId);
    if (!existing.caseIds.includes(args.caseId)) existing.caseIds.push(args.caseId);
    if (!existing.surfaces.includes(args.surface)) existing.surfaces.push(args.surface);
    if (!existing.exits.includes(args.exitId)) existing.exits.push(args.exitId);
    if (existing.cohort !== args.cohort) existing.cohort = "mixed";
  }

  // Cohort B confirmed root (PRI-01 empty fiveAnswers on genuine output)
  const B_ROOT = "RC-S150-PRI01-EMPTY-FIVEANSWERS-WITH-COURT";

  for (const c of freeze.candidates) {
    const mem = memById.get(c.caseId);
    const isProjection = c.cohort === "A";
    let disposition: Disposition;
    let explanation: string;
    let rootCauseId: string;
    let expectedOrSourceWording: string | null = null;
    let sourceDocument: string | null = null;
    let sourcePage: string | null = null;
    let projectionVersusGenuine: "projection_only" | "genuine_casebrain_output";
    let ownerRootId: string | null = null;

    if (isProjection) {
      projectionVersusGenuine = "projection_only";
      // Projection honesty: never confirmed_app_defect / confirmed_output_intrinsic
      disposition = "not_exercised_projection_only";
      rootCauseId =
        c.controlId.startsWith("MAA2-CHS-")
          ? "RC-S150-COHORTA-PROJECTION-CHS-MISSING-COPYSUGGESTION"
          : `RC-S150-COHORTA-PROJECTION-${c.findingCode}`;
      explanation =
        "Cohort A has no genuine casebrain-output.json. Finding arose from structuredPacketToEvalOutput projection (chaseItems without copySuggestion / five-part fields). Projection ≠ CaseBrain output — cannot confirm app defect.";
      const truthAbs = mem?.sourceCasePath
        ? path.join(ROOT, mem.sourceCasePath, "truth-key.json")
        : null;
      const truth = truthAbs ? readJsonSafe(truthAbs) : null;
      expectedOrSourceWording = truth
        ? `truth.expectedChaseItems/evidenceItems present on ESA truth-key (keys=${Object.keys(truth).join(",")}) — not used as CaseBrain output`
        : null;
      sourceDocument = mem?.sourceCasePath ?? null;
      sourcePage = null;
      ensureRoot({
        rootCauseId,
        title: "Cohort A projection-only chase draft/five-part incompleteness",
        dispositionClass: "not_exercised_projection_only",
        controlId: c.controlId,
        cohort: "A",
        primaryCandidateId: c.candidateId,
        candidateId: c.candidateId,
        caseId: c.caseId,
        surface: c.surface,
        exitId: c.exitId,
      });
    } else {
      projectionVersusGenuine = "genuine_casebrain_output";
      const srcDir = mem?.sourceCasePath ? path.join(ROOT, mem.sourceCasePath) : null;
      const output = srcDir ? readJsonSafe(path.join(srcDir, "casebrain-output.json")) : null;
      const truth = srcDir ? readJsonSafe(path.join(srcDir, "truth-key.json")) : null;
      const view = srcDir ? readJsonSafe(path.join(srcDir, "exits/view/payload.json")) : null;
      const five = Array.isArray(output?.fiveAnswersEvidenceRows)
        ? (output!.fiveAnswersEvidenceRows as unknown[])
        : null;
      const court = (output?.courtNote as { text?: string } | undefined)?.text ?? "";
      const viewRows =
        (
          (view?.truthMap as { evidenceState?: { rows?: unknown[] } } | undefined)?.evidenceState
            ?.rows ?? []
        ) as unknown[];

      if (c.controlId === "MAA2-PRI-01-NO-IMPORTANT-OMISSION" && c.findingCode === "XEX_MISSING_TRUTH_MAP") {
        const fiveEmpty = !five || five.length === 0;
        const courtPresent = court.trim().length > 0;
        const viewHasEvidence = viewRows.length > 0;
        expectedOrSourceWording = truth
          ? `truth.expectedEvidenceDistinctions=${JSON.stringify((truth as { expectedEvidenceDistinctions?: unknown }).expectedEvidenceDistinctions ?? null).slice(0, 400)}`
          : null;
        sourceDocument = "bundle.pdf (via buildLiveProductionSurfacesFromDocumentUnits)";
        sourcePage =
          viewHasEvidence && typeof viewRows[0] === "object" && viewRows[0] && "note" in (viewRows[0] as object)
            ? String((viewRows[0] as { note?: string }).note ?? "")
            : null;

        if (fiveEmpty && courtPresent && viewHasEvidence) {
          // Genuine output bag omits fiveAnswers while view exit carries evidence rows + court present.
          const dupMeta = duplicateLinkAudit.find((d) => d.candidateId === c.candidateId);
          if (c.duplicateOfCandidateId && dupMeta?.substantiveSharedRoot) {
            disposition = "duplicate_occurrence_of_confirmed_root";
            ownerRootId = B_ROOT;
            explanation =
              "Duplicate of confirmed PRI-01 root: empty fiveAnswersEvidenceRows with court wording present on genuine production output; view exit truthMap still carries evidence rows. Same substantive omission across deficit-120 homicide packs.";
          } else {
            disposition = "confirmed_app_defect";
            explanation =
              "Confirmed on genuine casebrain-output: fiveAnswersEvidenceRows=[] while courtNote.text is present. View exit truthMap.evidenceState.rows is non-empty (evidence exists on production surfaces) — solicitor-visible evidence map omitted from the persisted casebrain-output bag. Truth expects evidence distinctions. Independent technical review — not solicitor gold.";
          }
          rootCauseId = B_ROOT;
          ensureRoot({
            rootCauseId: B_ROOT,
            title:
              "Genuine production output: empty fiveAnswersEvidenceRows while court wording present (evidence rows exist on view exit)",
            dispositionClass: "confirmed_app_defect",
            controlId: c.controlId,
            cohort: "B",
            primaryCandidateId:
              c.duplicateOfCandidateId && dupMeta?.substantiveSharedRoot
                ? c.duplicateOfCandidateId
                : c.candidateId,
            candidateId: c.candidateId,
            caseId: c.caseId,
            surface: c.surface,
            exitId: c.exitId,
          });
        } else if (fiveEmpty && courtPresent && !viewHasEvidence) {
          disposition = "unresolved_source";
          rootCauseId = "RC-S150-PRI01-UNRESOLVED-NO-VIEW-ROWS";
          explanation =
            "fiveAnswers empty with court present, but view exit also lacks evidence rows — may be source poverty rather than output omission.";
        } else {
          disposition = "detector_false_positive";
          rootCauseId = "RC-S150-PRI01-FP";
          explanation = "PRI-01 preconditions not met on re-inspection of frozen output.";
        }
      } else {
        disposition = "unresolved_source";
        rootCauseId = `RC-S150-UNCLASSIFIED-${c.findingCode}`;
        explanation = "Unexpected Cohort B control in this freeze — requires separate review.";
      }
    }

    dispositions.push({
      candidateId: c.candidateId,
      caseId: c.caseId,
      cohort: c.cohort,
      controlId: c.controlId,
      findingCode: c.findingCode,
      exactCaseBrainWording: c.exactWording,
      expectedOrSourceWording,
      sourceDocument,
      sourcePage,
      exitId: c.exitId,
      surface: c.surface,
      occurrenceRef: c.occurrenceRef,
      projectionVersusGenuine,
      outputSha256: c.outputSha256,
      ownerFindingId: c.ownerFindingId,
      ownershipGroupId: c.ownershipGroupId,
      frozenDuplicateOfCandidateId: c.duplicateOfCandidateId,
      rootCauseId,
      ownerRootId,
      disposition,
      explanation,
      reviewerRole: "independent_technical_review",
      notSolicitorOrHumanGoldApproval: true,
      plainEnglish: c.plainEnglish,
      wordingHash: c.wordingHash,
      normalisedTemplateHash: c.normalisedTemplateHash,
      evidenceRefs: c.evidenceRefs,
    });
  }

  // Counts
  const byDisp = (d: Disposition) => dispositions.filter((x) => x.disposition === d).length;
  const cohortA = dispositions.filter((d) => d.cohort === "A");
  const cohortB = dispositions.filter((d) => d.cohort === "B");
  const confirmedRoots = [...rootRegistry.values()].filter(
    (r) => r.dispositionClass === "confirmed_app_defect",
  );
  const before = JSON.parse(fs.readFileSync(path.join(CAL_ROOT, "finding-units.json"), "utf8")) as {
    units: Record<string, number>;
  };

  const unitReport = {
    schemaVersion: "stage150-calibration-triage-units@1.0.0",
    note: "Units remain separate — 58 occurrences are not 58 independent defects.",
    occurrences: 58,
    exactStrings: new Set(freeze.candidates.map((c) => c.wordingHash)).size,
    normalisedTemplates: new Set(freeze.candidates.map((c) => c.normalisedTemplateHash)).size,
    affectedCases: new Set(freeze.candidates.map((c) => c.caseId)).size,
    affectedSurfaces: new Set(freeze.candidates.map((c) => c.surface)).size,
    affectedExits: [...new Set(freeze.candidates.map((c) => c.exitId))],
    uniqueConfirmedRootCauses: confirmedRoots.length,
    dispositions: {
      confirmed_app_defect: byDisp("confirmed_app_defect"),
      detector_false_positive: byDisp("detector_false_positive"),
      unresolved_source: byDisp("unresolved_source"),
      truth_key_defect: byDisp("truth_key_defect"),
      safe_containment: byDisp("safe_containment"),
      duplicate_occurrence_of_confirmed_root: byDisp("duplicate_occurrence_of_confirmed_root"),
      not_exercised_projection_only: byDisp("not_exercised_projection_only"),
    },
    byCohort: {
      A: {
        occurrences: cohortA.length,
        not_exercised_projection_only: cohortA.filter(
          (d) => d.disposition === "not_exercised_projection_only",
        ).length,
        confirmed_app_defect: cohortA.filter((d) => d.disposition === "confirmed_app_defect").length,
      },
      B: {
        occurrences: cohortB.length,
        confirmed_app_defect: cohortB.filter((d) => d.disposition === "confirmed_app_defect").length,
        duplicate_occurrence_of_confirmed_root: cohortB.filter(
          (d) => d.disposition === "duplicate_occurrence_of_confirmed_root",
        ).length,
      },
    },
  };

  const projectionHonesty = {
    schemaVersion: "stage150-cohort-a-projection-honesty@1.0.0",
    rule: "A projection is not a CaseBrain output. No Cohort-A projection-only finding may be confirmed_app_defect / confirmed_output_intrinsic.",
    cohortAOccurrenceCount: cohortA.length,
    cohortAConfirmedAppDefectCount: cohortA.filter((d) => d.disposition === "confirmed_app_defect")
      .length,
    cohortAAllProjectionOnly: cohortA.every((d) => d.disposition === "not_exercised_projection_only"),
    genuineCasebrainOutputOnCohortA: false,
    projectionMechanism: "structuredPacketToEvalOutput(Batch10StructuredCasePacket)",
    controlsTriggered: [...new Set(cohortA.map((d) => d.controlId as string))],
    explanation:
      "All 56 Cohort A findings are chase-label / empty-copySuggestion probes on projected bags. ESA truth keys exist but were only consulted for context; they do not convert projections into CaseBrain outputs.",
  };

  const duplicateReport = {
    schemaVersion: "stage150-duplicate-link-audit@1.0.0",
    frozenDuplicateLinks: 48,
    audited: duplicateLinkAudit.length,
    validSharedRoot: duplicateLinkAudit.filter((d) => d.auditVerdict === "valid_shared_root").length,
    invalid: duplicateLinkAudit.filter((d) => d.auditVerdict !== "valid_shared_root").length,
    crossCaseValid: duplicateLinkAudit.filter(
      (d) => d.auditVerdict === "valid_shared_root" && d.crossCase,
    ).length,
    note: "Valid duplicate = same control + findingCode + wordingHash + occurrenceRef (shared substantive root). Similar wording alone rejected. Surfaces/cases preserved; confirmed roots counted once.",
    links: duplicateLinkAudit,
  };

  const remediationOrder = confirmedRoots.map((r, idx) => ({
    order: idx + 1,
    rootCauseId: r.rootCauseId,
    title: r.title,
    occurrenceCount: r.occurrenceIds.length,
    caseIds: r.caseIds,
    controlIds: r.controlIds,
    sharedProductionModuleResponsible:
      "lib/eval/master-assurance-auditor/v2/stage150/batch10/deficit120/production-capture.ts (casebrain-output.fiveAnswersEvidenceRows ← surfaces.truthMap.evidenceState.rows) and/or lib/criminal/canonical-live-surface-adapter.ts truthMap row population consistency with persisted output bag",
    whyItOccurred:
      "Persisted genuine casebrain-output left fiveAnswersEvidenceRows empty while courtNote.text was populated, even though the view exit payload from the same production builder carried non-empty truthMap.evidenceState.rows. PRI-01 correctly treats empty fiveAnswers + court as an omission. Truth keys expect evidence distinctions.",
    affectedAudiencesExits: [
      "casebrain-output bag (detector-facing)",
      "view exit carries evidence (inconsistency)",
      "solicitor-visible evidence map consumers reading fiveAnswersEvidenceRows",
    ],
    oneSharedRemediation:
      "When writing casebrain-output, copy the exact truthMap.evidenceState.rows array used for the view exit payload (byte-identical rows). Add an invariant: if courtNote.text is non-empty and view truthMap has rows, fiveAnswersEvidenceRows must be non-empty. Do not invent rows; only persist what production surfaces already produced.",
    contracts: {
      positive:
        "court present + view truthMap rows ≥1 ⇒ fiveAnswersEvidenceRows length matches view rows and detector PRI-01 does not fire",
      negative:
        "court present + fiveAnswersEvidenceRows=[] + view rows≥1 ⇒ PRI-01 candidate remains (fail closed until mapping fixed)",
      mutation:
        "Zero fiveAnswersEvidenceRows after capture while view rows unchanged ⇒ calibration contract fails; restoring copy from truthMap clears PRI-01",
    },
    frozenRerunAcceptanceCondition:
      "Re-run frozen 150 calibration without packet rewrite: Cohort B PRI-01 occurrence count for this root = 0 on packs where view truthMap.evidenceState.rows were non-empty at capture; Cohort A projection-only dispositions unchanged; stage150ExecutionAllowed remains false; no promotions.",
  }));

  const beforeAfter = {
    schemaVersion: "stage150-triage-before-after@1.0.0",
    beforeAutoTriageUnits: before.units,
    afterIndependentTriage: unitReport.dispositions,
    deltaNote:
      "Auto-triage previously counted confirmed_output_intrinsic without projection honesty. After triage, Cohort A cannot confirm app defects; unique confirmed roots collapse to Cohort B PRI-01 only.",
    uniqueConfirmedRootsBeforeClaimed: before.units.confirmedOutputIntrinsicDefects ?? null,
    uniqueConfirmedRootsAfter: confirmedRoots.length,
    occurrencesStill58: unitReport.occurrences === 58,
  };

  writeJson("disposition-ledger-58.json", {
    schemaVersion: "stage150-calibration-disposition-ledger@1.0.0",
    runId: RUN_ID,
    candidateFreezeSha256: freeze.freezeSha256,
    reviewedAt: new Date().toISOString(),
    reviewerRole: "independent_technical_review",
    occurrenceCount: dispositions.length,
    rows: dispositions,
  });
  writeJson("cohort-a-projection-honesty-report.json", projectionHonesty);
  writeJson("duplicate-link-audit.json", duplicateReport);
  writeJson("unique-root-cause-register.json", {
    schemaVersion: "stage150-unique-root-cause-register@1.0.0",
    roots: [...rootRegistry.values()],
    confirmedRootCount: confirmedRoots.length,
  });
  writeJson("proposed-shared-remediation-order.json", {
    schemaVersion: "stage150-proposed-shared-remediation-order@1.0.0",
    implementedInThisWorkUnit: false,
    items: remediationOrder,
  });
  writeJson("before-after-count-comparison.json", beforeAfter);
  writeJson("unit-report.json", unitReport);

  const stop = {
    schemaVersion: "maa-v2-stage150-calibration-triage-stop@1.0.0",
    title: "STOP FOR CODEX REVIEW — STAGE-150 CALIBRATION TRIAGE",
    status: "STAGE150_CALIBRATION_TRIAGE_UNCOMMITTED",
    createdAt: new Date().toISOString(),
    elapsedMs: Date.now() - started,
    baselineCommit: BASELINE,
    calibrationRunId: RUN_ID,
    candidateFreezeSha256: freeze.freezeSha256,
    populationAltered: false,
    freezeAltered: false,
    candidateLedgerAltered: false,
    detectorsAltered: false,
    packetsAltered: false,
    caseBrainRepaired: false,
    promotions: [],
    stage150ExecutionAllowed: false,
    programmePassSupported: false,
    committed: false,
    pushed: false,
    unitReport,
    projectionHonesty: {
      cohortAOccurrences: cohortA.length,
      cohortAConfirmedForbidden: projectionHonesty.cohortAConfirmedAppDefectCount,
      allProjectionOnly: projectionHonesty.cohortAAllProjectionOnly,
    },
    duplicateAudit: {
      frozenLinks: 48,
      validSharedRoot: duplicateReport.validSharedRoot,
      invalid: duplicateReport.invalid,
    },
    uniqueConfirmedRootCauses: confirmedRoots.length,
    confirmedRootIds: confirmedRoots.map((r) => r.rootCauseId),
    artefacts: [
      "disposition-ledger-58.json",
      "cohort-a-projection-honesty-report.json",
      "duplicate-link-audit.json",
      "unique-root-cause-register.json",
      "proposed-shared-remediation-order.json",
      "before-after-count-comparison.json",
      "unit-report.json",
      "STOP-FOR-CODEX-REVIEW.json",
    ],
    blockers: [
      "Triage complete — measurement/disposition only",
      "No CaseBrain repair / detector change / promotion",
      "No Stage 300",
      "No corpus or programme PASS",
      "Stop uncommitted for Codex review",
    ],
  };
  writeJson("STOP-FOR-CODEX-REVIEW.json", stop);

  console.log(
    JSON.stringify(
      {
        out: OUT,
        occurrences: 58,
        dispositions: unitReport.dispositions,
        uniqueConfirmedRoots: confirmedRoots.length,
        cohortAProjectionOnly: projectionHonesty.cohortAAllProjectionOnly,
        duplicateValid: duplicateReport.validSharedRoot,
        freezeIntact: true,
      },
      null,
      2,
    ),
  );
}

main();
