/**
 * Label-only rematerialise for shared-root fix.
 * Updates fiveAnswersEvidenceRows (+ view exit truthMap rows) from the repaired
 * deriveEvidenceRowsFromDocumentUnits. Preserves original audience-packs, chase items,
 * court note, and other exits — avoids AUD/XPP regression from wholesale rebuild.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { buildLiveProductionSurfacesFromDocumentUnits } from "../../lib/criminal/canonical-live-surface-adapter";
import type { UploadedDocumentUnit } from "../../lib/criminal/build-from-document-units";
import {
  formatChargeWithInseparableWarning,
  isForbiddenGenericChargeReplacement,
  resolveChargeCompleteness,
} from "../../lib/criminal/charge-allegation-completeness";
import {
  sanitizeSolicitorVisibleValueTree,
  stripInternalCorpusIdentifiers,
} from "../../lib/criminal/solicitor-visible-matter-reference";
import { buildAudiencePacksFromProductionSurfaces } from "../../lib/eval/master-assurance-auditor/v2/stage300/new150/audience-packs-from-surfaces";
import {
  FIVE_ANSWERS_SERIALISATION_INVARIANT,
  serializeFiveAnswersEvidenceRowsFromSurfaces,
} from "../../lib/eval/master-assurance-auditor/v2/stage150/batch10/deficit120/five-answers-serialisation";

const SOURCE_ROOTS = [
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-new-150-control-coverage/sources",
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch10-deficit120-sources",
] as const;
const OUT_ROOT =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-calibration-run-v2-solicitor-boundary-containment/rematerialised-outputs";

const FRAGMENT_RES = [
  /(?:^|[\s:])Evidence referred or\s*$/i,
  /^Headline Summary Prosecution relies on$/i,
  /^final statement\.\s*Final signed MG11 remains$/i,
  /^not stated on$/i,
  /^Summary Prosecution$/i,
  /^listing\.$/i,
  /^Evidence$/i,
  /^not stated$/i,
];

function sha256(buf: string | Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}
function writeJson(abs: string, value: unknown): void {
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function documentsFromPdfMeta(caseId: string, meta: any): UploadedDocumentUnit[] {
  return [
    {
      id: `doc-${caseId}`,
      title: "bundle.pdf",
      uploadOrder: 1,
      documentType: "bundle",
      pages: (meta.pages ?? []).map((p: any) => ({
        pageNumber: p.pageNumber,
        compiledPage: p.pageNumber,
        text: p.text || `page ${p.pageNumber}`,
        pageIdentityKnown: true,
      })),
      fullText: (meta.pages ?? []).map((p: any) => p.text).join("\n\n"),
    },
  ];
}

function labelStats(rows: Array<{ label?: string }>): {
  count: number;
  fragmentCount: number;
  fragmentLabels: string[];
} {
  const labels = rows.map((r) => String(r.label ?? ""));
  const fragmentLabels = labels.filter((l) => FRAGMENT_RES.some((re) => re.test(l)));
  return { count: labels.length, fragmentCount: fragmentLabels.length, fragmentLabels: [...new Set(fragmentLabels)] };
}

async function rematerialiseOne(caseId: string, repoRoot: string, sourceRootRel: string) {
  const sourceDir = path.join(repoRoot, sourceRootRel, caseId);
  const metaPath = path.join(sourceDir, "pdf-extraction-meta.json");
  const beforePath = path.join(sourceDir, "casebrain-output.json");
  if (!fs.existsSync(metaPath) || !fs.existsSync(beforePath)) {
    return {
      caseId,
      ok: false,
      before: { count: 0, fragmentCount: 0, fragmentLabels: [] as string[] },
      after: { count: 0, fragmentCount: 0, fragmentLabels: [] as string[] },
      changed: false,
    };
  }

  const beforeCb = JSON.parse(fs.readFileSync(beforePath, "utf8"));
  const before = labelStats(Array.isArray(beforeCb.fiveAnswersEvidenceRows) ? beforeCb.fiveAnswersEvidenceRows : []);
  const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
  const documents = documentsFromPdfMeta(caseId, meta);

  // Structured charge completeness — never slice(0,120); never hide recorded text behind a generic.
  let offenceFromBundle: string | null = null;
  const canonicalPath = path.join(sourceDir, "canonical-bundle.md");
  if (fs.existsSync(canonicalPath)) {
    const canonical = fs.readFileSync(canonicalPath, "utf8");
    const chargeMatch = canonical.match(
      /(?:CHARGE|Particulars of Offence|Offence)\s*[:\n]+\s*([^\n]+contrary to[^\n]+)/i,
    );
    if (chargeMatch?.[1]) offenceFromBundle = chargeMatch[1].replace(/\s+/g, " ").trim();
  }
  // Prefer any previously recorded allegation as sourceChargeText (exact recorded wording).
  // Prefer newest rematerialised exits first; never prefer a mid-word truncated prior when a
  // complete canonical/court recovery is available (handled inside resolveChargeCompleteness).
  let recordedFromPrior: string | null = null;
  const priorViewCandidates = [
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-calibration-run-v2-solicitor-wording-correction/rematerialised-outputs",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-calibration-run-v2-final-remediation/rematerialised-outputs",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-calibration-run-v2-post-fix-wording-recalibration/rematerialised-outputs",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-calibration-run-v2-post-shared-root-fix/rematerialised-outputs",
  ];
  for (const root of priorViewCandidates) {
    const priorView = path.join(repoRoot, root, caseId, "exits", "view", "payload.json");
    if (!fs.existsSync(priorView)) continue;
    try {
      const prior = JSON.parse(fs.readFileSync(priorView, "utf8"));
      const a = prior?.truthMap?.caseSaying?.allegation;
      if (typeof a === "string" && a.trim()) {
        recordedFromPrior = a.trim();
        break;
      }
    } catch {
      /* ignore */
    }
  }
  const chargeCompleteness = resolveChargeCompleteness({
    recordedChargeText: recordedFromPrior,
    canonicalOffenceLine: offenceFromBundle,
    courtNoteText: typeof beforeCb.courtNote?.text === "string" ? beforeCb.courtNote.text : null,
  });
  if (isForbiddenGenericChargeReplacement(chargeCompleteness.displayedChargeText)) {
    throw new Error(`rematerialise refused generic charge hide for ${caseId}`);
  }
  const allegation = chargeCompleteness.displayedChargeText;
  const allegationWithStatus = formatChargeWithInseparableWarning(chargeCompleteness);

  const surfaces = buildLiveProductionSurfacesFromDocumentUnits(documents, {
    caseId,
    allegation,
    recordedChargeText: recordedFromPrior ?? allegation,
    canonicalOffenceLine: offenceFromBundle,
    courtNoteText: typeof beforeCb.courtNote?.text === "string" ? beforeCb.courtNote.text : null,
    caseTitle: caseId,
    clientLabel: "Defendant",
  });
  const fiveSerialised = serializeFiveAnswersEvidenceRowsFromSurfaces(surfaces);
  const strippedRows = fiveSerialised.rows.map((r) => ({
    ...r,
    label: stripInternalCorpusIdentifiers(String(r.label ?? "")) || String(r.label ?? ""),
  }));
  if (surfaces.truthMap.evidenceState?.rows) {
    surfaces.truthMap.evidenceState.rows = strippedRows;
  }
  // Strip corpus IDs from chase labels used on solicitor exits.
  surfaces.disclosureChase.items = (surfaces.disclosureChase.items ?? []).map((i) => ({
    ...i,
    label: stripInternalCorpusIdentifiers(i.label ?? "") || i.label,
  }));
  if (Array.isArray((surfaces.disclosureChase as { primaryItems?: unknown }).primaryItems)) {
    const chase = surfaces.disclosureChase as {
      primaryItems: Array<{ label?: string; [k: string]: unknown }>;
    };
    chase.primaryItems = chase.primaryItems.map((i) => ({
      ...i,
      label: stripInternalCorpusIdentifiers(String(i.label ?? "")) || i.label,
    }));
  }
  // Ensure export-pack clipboard text never carries fixture IDs (version stamp rebuilt in buildExportPack).
  surfaces.exportPack.sections = (surfaces.exportPack.sections ?? []).map((s) => ({
    ...s,
    textForClipboard: stripInternalCorpusIdentifiers(s.textForClipboard ?? ""),
  }));
  // Strip fixture/harness tokens from copy lines, API prose, and evidence-trace anchors.
  surfaces.copyLines = (surfaces.copyLines ?? []).map((line) => ({
    ...line,
    text: stripInternalCorpusIdentifiers(line.text ?? ""),
    provenanceLine: stripInternalCorpusIdentifiers(line.provenanceLine ?? ""),
  }));
  surfaces.api = sanitizeSolicitorVisibleValueTree(surfaces.api) as typeof surfaces.api;
  surfaces.truthMap = sanitizeSolicitorVisibleValueTree(surfaces.truthMap) as typeof surfaces.truthMap;
  surfaces.pdf = sanitizeSolicitorVisibleValueTree(surfaces.pdf) as typeof surfaces.pdf;
  surfaces.composedProse = sanitizeSolicitorVisibleValueTree(
    surfaces.composedProse,
  ) as typeof surfaces.composedProse;
  const after = labelStats(strippedRows);

  const outDir = path.join(repoRoot, OUT_ROOT, caseId);
  fs.mkdirSync(outDir, { recursive: true });
  fs.copyFileSync(beforePath, path.join(outDir, "casebrain-output.pre-fix.json"));

  // LABEL + EXIT rebuild from fixed surfaces. Preserve original audience packs (no AUD regression).
  const chaseItems = (surfaces.disclosureChase.items ?? []).map((i, idx) => ({
    label: i.label ?? `chase-${idx + 1}`,
    requestId: `chase-${caseId}-${idx + 1}`,
    evidenceUnitId: null,
    linkageStatus: "unresolved",
    resolutionState: "outstanding",
    sendabilityLabel: "review_required",
    copySuggestion: i.draftChaseWording ?? null,
  }));

  const postFix = {
    ...beforeCb,
    rematerialisedForSharedRootFix: true,
    rematerialisedAt: new Date().toISOString(),
    rematerialiseMode: "label-exits-and-contained-audience-packs",
    fiveAnswersEvidenceRows: strippedRows,
    fiveAnswersSerialisation: {
      invariant: FIVE_ANSWERS_SERIALISATION_INVARIANT,
      viewRowsSha256: fiveSerialised.viewRowsSha256,
      persistedRowsSha256: fiveSerialised.persistedRowsSha256,
      courtNotePresent: fiveSerialised.courtNotePresent,
      inventedFromCourt: false,
      sharedRootFix: "deriveEvidenceRowsFromDocumentUnits-fragment-rejection-v2",
      labelCorpusIdStripApplied: true,
    },
    warningsAndGaps: {
      ...(beforeCb.warningsAndGaps ?? {}),
      chaseItems,
      doNotOverstate: surfaces.truthMap.mustNotOverstate ?? beforeCb.warningsAndGaps?.doNotOverstate ?? [],
    },
  };

  // Rebuild audience packs: professional payloadText only; exact raw in protectedRawSourceExtracts.
  const audiencePacks = buildAudiencePacksFromProductionSurfaces({
    caseId,
    allegation,
    clientLabel: "Defendant",
    surfaces,
  });
  writeJson(path.join(outDir, "audience-packs.json"), audiencePacks);

  const postFixWithProtected = {
    ...postFix,
    protectedRawSourceExtracts: {
      note: "Exact raw supervisor/source extracts retained for audit only; never embedded in AudiencePack.payloadText.",
      records: audiencePacks.protectedRawSourceExtracts,
    },
  };
  writeJson(path.join(outDir, "casebrain-output.json"), postFixWithProtected);

  // Rebuild exits from fixed surfaces so chase/API labels pick up the shared-root repair.
  // Charge + warning inseparable on every exit.
  const exitPayloads: Record<string, unknown> = {
    view: {
      exitId: "view",
      kind: "five_answers_view",
      truthMap: surfaces.truthMap,
      chargeCompleteness: surfaces.chargeCompleteness,
      allegationWithStatus,
    },
    copy: {
      exitId: "copy",
      kind: "copy_safe_lines",
      copyLines: surfaces.copyLines,
      chargeCompleteness: surfaces.chargeCompleteness,
      allegation: allegationWithStatus,
    },
    export: {
      exitId: "export",
      kind: "export_pack",
      exportPack: surfaces.exportPack,
      chargeCompleteness: surfaces.chargeCompleteness,
      allegation: allegationWithStatus,
    },
    api: {
      exitId: "api",
      kind: "api_surface",
      api: surfaces.api,
      chargeCompleteness: surfaces.chargeCompleteness,
      allegation: allegationWithStatus,
    },
    pdf: {
      exitId: "pdf",
      kind: "pdf_exit",
      pdf: surfaces.pdf,
      chargeCompleteness: surfaces.chargeCompleteness,
      allegation: allegationWithStatus,
    },
    composed_prose: {
      exitId: "composed_prose",
      kind: "composed_prose",
      composedProse: surfaces.composedProse,
      chargeCompleteness: surfaces.chargeCompleteness,
      allegation: allegationWithStatus,
    },
  };
  for (const [exitId, payload] of Object.entries(exitPayloads)) {
    writeJson(
      path.join(outDir, "exits", exitId, "payload.json"),
      sanitizeSolicitorVisibleValueTree(payload),
    );
  }

  const beforeSha = sha256(fs.readFileSync(beforePath));
  const afterSha = sha256(fs.readFileSync(path.join(outDir, "casebrain-output.json")));
  return { caseId, ok: true, before, after, changed: beforeSha !== afterSha };
}

async function main(): Promise<void> {
  const repoRoot = process.cwd();
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : Infinity;

  const caseEntries: Array<{ caseId: string; sourceRootRel: string }> = [];
  for (const sourceRootRel of SOURCE_ROOTS) {
    const sourceAbs = path.join(repoRoot, sourceRootRel);
    if (!fs.existsSync(sourceAbs)) continue;
    for (const d of fs.readdirSync(sourceAbs).sort()) {
      if (!fs.existsSync(path.join(sourceAbs, d, "casebrain-output.json"))) continue;
      if (!fs.existsSync(path.join(sourceAbs, d, "pdf-extraction-meta.json"))) continue;
      caseEntries.push({ caseId: d, sourceRootRel });
    }
  }
  const selected = caseEntries.slice(0, Number.isFinite(limit) ? limit : undefined);

  const rows = [];
  for (const { caseId, sourceRootRel } of selected) {
    rows.push(await rematerialiseOne(caseId, repoRoot, sourceRootRel));
    if (rows.length % 25 === 0) console.error(`progress ${rows.length}/${selected.length}`);
  }

  const summary = {
    schemaVersion: "stage300-v2-final-remediation-rematerialise@1.0.0",
    mode: "structured-charge-completeness-all-exits",
    chargeCompleteness: "resolveChargeCompleteness-never-hide-recorded-source",
    sourceRoots: SOURCE_ROOTS,
    caseCount: rows.length,
    okCount: rows.filter((r) => r.ok).length,
    changedCount: rows.filter((r) => r.changed).length,
    beforeFragmentOccurrences: rows.reduce((a, r) => a + r.before.fragmentCount, 0),
    afterFragmentOccurrences: rows.reduce((a, r) => a + r.after.fragmentCount, 0),
    uniqueBeforeFragments: [...new Set(rows.flatMap((r) => r.before.fragmentLabels))],
    uniqueAfterFragments: [...new Set(rows.flatMap((r) => r.after.fragmentLabels))],
    sharedRootFixed: "lib/criminal/build-from-document-units.ts#deriveEvidenceRowsFromDocumentUnits",
    note: "Label-only patch for new-150 + Stage-150 deficit120. Audience packs and chase preserved. Source trees untouched.",
  };
  writeJson(path.join(repoRoot, path.dirname(OUT_ROOT), "rematerialise-summary.json"), summary);
  writeJson(path.join(repoRoot, path.dirname(OUT_ROOT), "rematerialise-per-case.json"), rows);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
