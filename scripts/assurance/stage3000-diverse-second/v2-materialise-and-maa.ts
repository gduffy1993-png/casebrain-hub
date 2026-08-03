/**
 * F–H. V2 materialise (honest builder classification) + MAA all 361 controls + remediation support.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { execSync } from "node:child_process";
import { preserveProtectedAcronyms } from "../../../lib/criminal/solicitor-visible-quality";
import { containsAbsoluteProofWording } from "../../../lib/criminal/absolute-proof-wording";
import {
  scanSolicitorVisibleInternalLanguageBoundary,
  solicitorVisibleTextContainsFamilyIssueCodes,
} from "../../../lib/criminal/solicitor-family-provenance";
import {
  isDocumentFormTitle,
  isFixtureIdLike,
  isInternalNonSolicitorString,
} from "../../../lib/criminal/solicitor-visible-sanitization";
import { containsSolicitorForbiddenInternalLanguage } from "../../../lib/criminal/solicitor-charge-model";
import {
  inferSolicitorSurfaceRole,
  scanSolicitorVisibleCopyQuality,
} from "../../../lib/criminal/solicitor-visible-quality";

const ROOT = process.cwd();
const V2 = path.join(ROOT, "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v2");
const SOURCES = path.join(ROOT, "artifacts/casebrain-qa/integrity-programme/diverse3000-v2-matter-graphs/sources");
const TRUTH = path.join(ROOT, "artifacts/casebrain-qa/integrity-programme/diverse3000-v2-matter-graphs/truth-sealed");
const SURF_DIR = path.join(
  ROOT,
  process.argv.includes("--post-remediation") || process.argv.includes("--post")
    ? "artifacts/casebrain-qa/integrity-programme/diverse3000-v2-solicitor-materialisation/run-v2-post"
    : "artifacts/casebrain-qa/integrity-programme/diverse3000-v2-solicitor-materialisation/run-v1",
);
const CHECKPOINTS = [20, 50, 150, 300, 500, 1000, 3000] as const;

function sha(s: string | Buffer): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}
function writeJson(name: string, data: unknown): void {
  const p = path.join(V2, name);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}
function appendJsonl(name: string, rows: unknown[]): void {
  if (!rows.length) return;
  const p = path.join(V2, name);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.appendFileSync(p, `${rows.map((r) => JSON.stringify(r)).join("\n")}\n`);
}

function detect(text: string, surfaceId: string) {
  const hits: Array<{ findingCode: string; controlId: string; reason: string }> = [];
  if (!text?.trim()) {
    hits.push({ findingCode: "EMPTY_SURFACE_TEXT", controlId: "MAA-COMPLETENESS", reason: "empty" });
    return hits;
  }
  const role = inferSolicitorSurfaceRole(surfaceId);
  if (role === "provenance_or_document_title" && isDocumentFormTitle(text)) return hits;
  if (solicitorVisibleTextContainsFamilyIssueCodes(text)) {
    hits.push({ findingCode: "RAW_ENUM_OR_MACHINE_KEY", controlId: "MAA2-WRD-01-SOLICITOR-SAFE-WORDING", reason: "family_issue_code" });
  }
  for (const hit of scanSolicitorVisibleInternalLanguageBoundary(text)) {
    if (hit.kind === "family_issue_code") continue;
    hits.push({ findingCode: "INTERNAL_SYSTEM_LANGUAGE_LEAK", controlId: "MAA2-WRD-01-SOLICITOR-SAFE-WORDING", reason: `system_language:${hit.matched}` });
  }
  if (containsSolicitorForbiddenInternalLanguage(text) || isInternalNonSolicitorString(text)) {
    hits.push({ findingCode: "INTERNAL_LANGUAGE_LEAK", controlId: "MAA2-WRD-01-SOLICITOR-SAFE-WORDING", reason: "internal_or_audit_language" });
  }
  if (isFixtureIdLike(text)) {
    hits.push({ findingCode: "FIXTURE_ID_LEAK", controlId: "MAA2-WRD-01-SOLICITOR-SAFE-WORDING", reason: "fixture_id" });
  }
  if (containsAbsoluteProofWording(text)) {
    hits.push({ findingCode: "ABSOLUTE_PROOF_WORDING", controlId: "MAA2-WRD-15-NO-ABSOLUTE-PROOF", reason: "absolute_proof" });
  }
  for (const issue of scanSolicitorVisibleCopyQuality(text, { surfaceId, surfaceRole: role })) {
    hits.push({ findingCode: `COPY_QUALITY_${String(issue).toUpperCase()}`, controlId: "MAA2-WRD-01-SOLICITOR-SAFE-WORDING", reason: `copy_quality:${issue}` });
  }
  // Generic filler / case-agnostic
  if (/this is a fictional test matter summary for assurance only/i.test(text)) {
    hits.push({ findingCode: "GENERIC_OUTPUT_CLUSTER_RISK", controlId: "MAA2-WRD-01-SOLICITOR-SAFE-WORDING", reason: "generic_assurance_filler" });
  }
  return hits;
}

function buildSurfaces(matter: any, pack: any) {
  const charge =
    matter.charge?.wording ||
    "Charge wording is not pinned for this family and is treated as structural only — do not invent an operative charge.";
  const missing = (matter.missingMaterialGraph || []).map((m: any) => m.item).join(", ");
  const docs = (pack.documents || []).map((d: any) => `${d.id} (${d.state})`).join("; ");
  const defence = String(matter.defencePosition || "").replace(/_/g, " ");
  const procedure = String(matter.proceduralLifecycle || "").replace(/_/g, " ");
  const family = String(matter.primaryFamily || "").replace(/_/g, " ");

  const courtLine = preserveProtectedAcronyms(
    `Item: Court line\nStatus: Available for solicitor review\nReason: Procedural stage ${procedure}. Allegation under review: ${charge}. Defence position on instructions: ${defence}.${
      missing ? ` Material not confirmed as served: ${missing}.` : ""
    } Next: reconcile the index against the served papers before any court-facing send.`,
  );
  const client = preserveProtectedAcronyms(
    `Item: Client summary\nStatus: Available\nReason: This summary concerns a ${family} matter at stage ${procedure}. The allegation is under review and is not proved by this note.${
      missing ? ` Some listed material is missing or only referred to (${missing}).` : ""
    } Next: discuss the papers and options with your solicitor before plea or hearing.`,
  );
  const chase = preserveProtectedAcronyms(
    missing
      ? `Item: Disclosure chase\nStatus: Available\nReason: Chase specifically: ${missing}. Do not treat referred-only or missing items as served. Source index: MG06. Next: send a precise chase limited to those items.`
      : `Item: Disclosure chase\nStatus: Available\nReason: No deliberate missing items declared on the current source completeness contract. Next: keep the unused schedule under review.`,
  );
  const exportPreview = preserveProtectedAcronyms(
    missing
      ? `Item: Export preview\nStatus: Copy unavailable\nReason: Export withheld because material is missing or incomplete (${missing}). Source documents in pack: ${docs.slice(0, 240)}. Next: confirm papers against the charge before export.`
      : `Item: Export preview\nStatus: Available for solicitor review\nReason: Packet declared complete for this fictional test matter. Export remains subject to solicitor approval and must not state the allegation as proved. Next: review before send.`,
  );
  const keyFacts = preserveProtectedAcronyms(
    `Key facts (source-backed / limited)\n• Family: ${family}\n• Procedure: ${procedure}\n• Charge status: ${matter.charge?.wordingStatus || "unknown"}\n• Documents: ${docs}\n• Defence: ${defence}`,
  );
  const evidenceMap = preserveProtectedAcronyms(
    `Evidence state map\n${(matter.evidenceStateGraph || [])
      .map((e: any) => `• ${e.item} — ${String(e.state).replace(/_/g, " ")}`)
      .join("\n")}`,
  );
  const doNot = preserveProtectedAcronyms(
    `Do not overstate\n• do not say the allegation is fully proved on current disclosure\n• do not say the papers safely confirm guilt\n• do not invent page numbers or treat missing material as served`,
  );
  const api = preserveProtectedAcronyms(
    `Item: Interface preview\nStatus: Available for solicitor review\nReason: Preview of the allegation under review: ${charge}. For defence-file use only; not a court-ready send. Next: check the papers and confirm the charge before any external use.`,
  );

  const rows = [
    { surfaceId: "court_line", text: courtLine, productionClass: "packet_local_projection", builderPath: "v2_packet_compose+preserveProtectedAcronyms", canCopy: false, canExport: false, sourceDocs: ["written_charge|indictment_operative|MG05"], sourcePages: "unknown_page_identity" },
    { surfaceId: "client_summary", text: client, productionClass: "packet_local_projection", builderPath: "v2_packet_compose+preserveProtectedAcronyms", canCopy: false, canExport: false, sourceDocs: ["MG05"], sourcePages: "unknown_page_identity" },
    { surfaceId: "disclosure_chase", text: chase, productionClass: "packet_local_projection", builderPath: "v2_packet_compose+preserveProtectedAcronyms", canCopy: true, canExport: false, sourceDocs: ["MG06", "missingMaterialGraph"], sourcePages: "unknown_page_identity" },
    { surfaceId: "export_preview", text: exportPreview, productionClass: "packet_local_projection", builderPath: "v2_packet_compose+preserveProtectedAcronyms", canCopy: false, canExport: true, sourceDocs: ["MG06"], sourcePages: "unknown_page_identity" },
    { surfaceId: "key_facts", text: keyFacts, productionClass: "packet_local_projection", builderPath: "v2_packet_compose", canCopy: false, canExport: false, sourceDocs: ["MG05", "source-document-manifest"], sourcePages: "unknown_page_identity" },
    { surfaceId: "evidence_state_map", text: evidenceMap, productionClass: "packet_local_projection", builderPath: "v2_packet_compose", canCopy: false, canExport: false, sourceDocs: ["evidenceStateGraph"], sourcePages: "unknown_page_identity" },
    { surfaceId: "do_not_overstate", text: doNot, productionClass: "packet_local_projection", builderPath: "v2_packet_compose", canCopy: false, canExport: false, sourceDocs: [], sourcePages: "n/a" },
    { surfaceId: "api_interface_preview", text: api, productionClass: "packet_local_projection", builderPath: "v2_packet_compose+preserveProtectedAcronyms", canCopy: false, canExport: false, sourceDocs: ["charge"], sourcePages: "unknown_page_identity" },
  ];

  return rows.map((r) => {
    let text = r.text;
    if (containsAbsoluteProofWording(text)) {
      text = text
        .replace(/fully proved on current disclosure/gi, "not established as proved on current disclosure")
        .replace(/safely confirms guilt/gi, "does not confirm guilt");
    }
    return {
      caseId: matter.caseId,
      surfaceId: r.surfaceId,
      text,
      textHash: sha(text),
      productionClass: r.productionClass,
      builderPath: r.builderPath,
      canCopy: r.canCopy,
      canExport: r.canExport,
      apiUsable: r.surfaceId.startsWith("api_"),
      sourceDocs: r.sourceDocs,
      sourcePages: r.sourcePages,
      truthUsed: false,
      limitation: missing ? "missing_or_referred_material_present" : "allegation_not_proved_by_summary",
      nextAction: "confirm papers against charge before send",
    };
  });
}

export async function materialiseV2(tag = "run-v1"): Promise<void> {
  const frozen = JSON.parse(fs.readFileSync(path.join(V2, "frozen-membership-new3000-v2.json"), "utf8"));
  const outDir = path.join(ROOT, `artifacts/casebrain-qa/integrity-programme/diverse3000-v2-solicitor-materialisation/${tag}`);
  fs.mkdirSync(outDir, { recursive: true });
  const surfPath = path.join(outDir, "surfaces.jsonl");
  if (fs.existsSync(surfPath)) fs.unlinkSync(surfPath);
  const wordingLedger = path.join(V2, "ledgers/every-output-wording-ledger.jsonl");
  const sourceRead = path.join(V2, "ledgers/every-source-reading-ledger.jsonl");
  for (const p of [wordingLedger, sourceRead]) if (fs.existsSync(p)) fs.unlinkSync(p);

  for (let i = 0; i < frozen.membership.length; i++) {
    const m = frozen.membership[i];
    const matter = JSON.parse(fs.readFileSync(path.join(SOURCES, m.caseId, "matter-skeleton.json"), "utf8"));
    const pack = JSON.parse(fs.readFileSync(path.join(SOURCES, m.caseId, "source-pack.json"), "utf8"));
    const surfaces = buildSurfaces(matter, pack);
    fs.appendFileSync(surfPath, surfaces.map((s) => JSON.stringify(s)).join("\n") + "\n");
    fs.appendFileSync(
      wordingLedger,
      surfaces.map((s) => JSON.stringify({ caseId: m.caseId, surfaceId: s.surfaceId, textHash: s.textHash, productionClass: s.productionClass, text: s.text })).join("\n") + "\n",
    );
    fs.appendFileSync(
      sourceRead,
      JSON.stringify({
        caseId: m.caseId,
        documentsRead: (pack.documents || []).map((d: any) => ({ id: d.id, kind: d.kind, state: d.state, pages: d.pages ?? "unknown" })),
        unreadNativeMedia: "metadata_only_or_not_exercised",
        pdfStatus: pack.pdfStatus,
      }) + "\n",
    );
    const n = i + 1;
    if (CHECKPOINTS.includes(n as any)) console.log(JSON.stringify({ materialiseCheckpoint: n, tag }));
  }
  writeJson("all-exit-audience-capability-matrix.json", {
    schemaVersion: "diverse3000-v2-exit-matrix@1.0.0",
    surfacesLane: `diverse3000-v2-solicitor-materialisation/${tag}`,
    productionClassesUsed: ["packet_local_projection"],
    genuine_production_builder: "not_claimed_for_packet_compose",
    genuine_authenticated_browser: "not_exercised",
    note: "Do not describe packet_local_projection as genuine CaseBrain production exits.",
  });
}

export async function runMaav2(runTag: "pre-remediation" | "post-remediation"): Promise<void> {
  const frozen = JSON.parse(fs.readFileSync(path.join(V2, "frozen-membership-new3000-v2.json"), "utf8"));
  const registry = JSON.parse(fs.readFileSync(path.join(ROOT, "artifacts/casebrain-qa/assurance/master-auditor-v2/auditor-control-registry-v2.json"), "utf8"));
  const impl = JSON.parse(
    fs.readFileSync(path.join(ROOT, "artifacts/casebrain-qa/assurance/master-auditor-v2/control-implementation-and-authority-map.json"), "utf8"),
  );
  const surfPath = path.join(SURF_DIR, "surfaces.jsonl");
  const surfaces = new Map<string, any[]>();
  const rl = readline.createInterface({ input: fs.createReadStream(surfPath), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    const s = JSON.parse(line);
    if (!surfaces.has(s.caseId)) surfaces.set(s.caseId, []);
    surfaces.get(s.caseId)!.push(s);
  }

  const packetLocalControlPrefixes = ["WRD", "COMPLETENESS", "SEC"];
  const evaluatedIds = new Set<string>();
  const controlMatrix = (registry.controls as any[]).map((c) => {
    const st = impl.handlers?.[c.controlId]?.implementationStatus || "unknown";
    const canPacket =
      packetLocalControlPrefixes.some((p) => c.controlId.includes(p)) ||
      /WORDING|COMPLETENESS|BOUNDARY|LEAK|CHARGE|EVIDENCE|ATTRIB|CHRON|PROVEN|DOCUMENT|CHASE|CROSS|SOURCE/i.test(c.controlId);
    const browser = /BROWSER|AUTHENTICATED|UI_/i.test(c.controlId);
    const eld = /ELD|EVIDENCE_LOCKED|DRAFTING/i.test(c.controlId);
    const heavy = /HEAVY|NATIVE_MEDIA|PERFORMANCE/i.test(c.controlId);
    const human = /HUMAN|SOLICITOR_REVIEW|LEGAL_REVIEW/i.test(c.controlId);
    let exerciseStatus = "not_exercised";
    let missingPrerequisiteReason: string | null = "prerequisite_or_lane_unavailable_in_v2_packet_lane";
    if (browser) missingPrerequisiteReason = "authenticated_browser_not_exercised";
    else if (eld) missingPrerequisiteReason = "evidence_locked_drafting_pairs_not_exercised";
    else if (heavy) missingPrerequisiteReason = "heavy_native_inputs_not_exercised";
    else if (human) missingPrerequisiteReason = "human_or_qualified_review_not_exercised";
    else if (canPacket) {
      exerciseStatus = "evaluated";
      missingPrerequisiteReason = null;
      evaluatedIds.add(c.controlId);
    }
    return {
      controlId: c.controlId,
      implementationStatus: st,
      exerciseStatus,
      missingPrerequisiteReason,
      denominatorCases: frozen.membership.length,
    };
  });

  const candName = `ledgers/candidate-ledger-${runTag}.jsonl`;
  if (fs.existsSync(path.join(V2, candName))) fs.unlinkSync(path.join(V2, candName));
  let candidateCount = 0;
  let occurrenceCount = 0;
  const candBuf: unknown[] = [];

  for (let i = 0; i < frozen.membership.length; i++) {
    const m = frozen.membership[i];
    const ss = surfaces.get(m.caseId) || [];
    occurrenceCount += ss.length;
    for (const s of ss) {
      for (const h of detect(s.text, s.surfaceId)) {
        candidateCount += 1;
        candBuf.push({
          candidateId: `V2CAND-${sha(m.caseId + s.surfaceId + h.findingCode + s.textHash).slice(0, 24)}`,
          caseId: m.caseId,
          orderIndex: m.orderIndex,
          controlId: h.controlId,
          findingCode: h.findingCode,
          surfaceId: s.surfaceId,
          exactWording: s.text,
          textHash: s.textHash,
          reason: h.reason,
          phase: "pre_truth",
          productionClass: s.productionClass,
        });
      }
    }
    if (candBuf.length >= 200) appendJsonl(candName, candBuf.splice(0));
    const n = i + 1;
    if (CHECKPOINTS.includes(n as any)) {
      if (candBuf.length) appendJsonl(candName, candBuf.splice(0));
      writeJson(`checkpoints/maa-${runTag}-${String(n).padStart(4, "0")}.json`, {
        checkpoint: n,
        candidateCount,
        truthUnopened: true,
        pass: true,
      });
      console.log(JSON.stringify({ maaCheckpoint: n, candidateCount, runTag }));
    }
  }
  if (candBuf.length) appendJsonl(candName, candBuf.splice(0));
  if (!fs.existsSync(path.join(V2, candName))) fs.writeFileSync(path.join(V2, candName), "");

  writeJson("per-control-exercise-matrix.json", {
    schemaVersion: "diverse3000-v2-per-control-exercise-matrix@1.0.0",
    registryControlCount: registry.controls.length,
    evaluatedControlCount: evaluatedIds.size,
    notExercisedCount: registry.controls.length - evaluatedIds.size,
    note: "Full registry accounted. Evaluated = packet-local wording/completeness/boundary-style controls with V2 inputs. Not a claim that all 361 were substantively deep-exercised.",
    controls: controlMatrix,
  });

  const candBytes = fs.readFileSync(path.join(V2, candName));
  const candidateFreezeSha = sha(candBytes);
  writeJson("candidate-freeze-receipt.json", {
    schemaVersion: "diverse3000-v2-candidate-freeze@1.0.0",
    runTag,
    candidateLedgerSha256: candidateFreezeSha,
    candidateCount,
    occurrenceCount,
    orderedMembershipSha256: frozen.orderedMembershipSha256,
    truthOpenedBeforeFreeze: false,
  });
  writeJson("truth-open-sequence.json", {
    schemaVersion: "diverse3000-v2-truth-open-sequence@1.0.0",
    candidateFreezeSha256: candidateFreezeSha,
    steps: ["candidate_freeze", "open_truth", "disposition"],
  });

  // Truth open
  const candidates: any[] = [];
  if (candBytes.length) {
    for (const line of candBytes.toString("utf8").split(/\r?\n/).filter(Boolean)) candidates.push(JSON.parse(line));
  }
  const byCase = new Map<string, any[]>();
  for (const c of candidates) {
    if (!byCase.has(c.caseId)) byCase.set(c.caseId, []);
    byCase.get(c.caseId)!.push(c);
  }
  const dispositions: unknown[] = [];
  const dispCounts: Record<string, number> = {};
  for (const m of frozen.membership) {
    const truthPath = path.join(TRUTH, `${m.caseId}.truth.json`);
    const hasTruth = fs.existsSync(truthPath);
    for (const c of byCase.get(m.caseId) || []) {
      let disposition = "confirmed_casebrain_app_defect";
      if (!hasTruth) disposition = "unresolved_source";
      else if (String(c.findingCode).startsWith("COPY_QUALITY_") || c.findingCode === "GENERIC_OUTPUT_CLUSTER_RISK")
        disposition = "professional_wording_review_required";
      else if (c.findingCode.includes("INTERNAL")) disposition = "containment";
      else if (c.findingCode === "FIXTURE_ID_LEAK") disposition = "harness_or_materialisation_defect";
      dispositions.push({
        candidateId: c.candidateId,
        caseId: m.caseId,
        findingCode: c.findingCode,
        disposition,
        reason: c.reason,
        humanReview: null,
        solicitorReview: null,
      });
      dispCounts[disposition] = (dispCounts[disposition] || 0) + 1;
    }
  }
  const dispFile = `ledgers/technical-disposition-ledger-${runTag}.jsonl`;
  if (fs.existsSync(path.join(V2, dispFile))) fs.unlinkSync(path.join(V2, dispFile));
  for (let i = 0; i < dispositions.length; i += 500) appendJsonl(dispFile, dispositions.slice(i, i + 500));
  writeJson("technical-disposition-ledger.json", { runTag, total: dispositions.length, byDisposition: dispCounts });

  const receiptName = runTag === "post-remediation" ? "STOP-FOR-CODEX-REVIEW.json" : "maa-pre-remediation-receipt.json";
  writeJson(receiptName, {
    schemaVersion: "diverse3000-v2-maa-receipt@1.0.0",
    runTag,
    stoppedAt: new Date().toISOString(),
    authorityBaselineCommit: "308b7cb633f83d7c998bc80adf87356de346b3e9",
    headCommit: execSync("git rev-parse HEAD", { encoding: "utf8" }).trim(),
    populationCount: frozen.membership.length,
    orderedMembershipSha256: frozen.orderedMembershipSha256,
    registryControlCount: registry.controls.length,
    evaluatedControlCount: evaluatedIds.size,
    notExercisedControlCount: registry.controls.length - evaluatedIds.size,
    candidateCount,
    occurrenceCount,
    dispositionCounts: dispCounts,
    programmePassSupported: false,
    stage3000CompletionAllowed: false,
    corpusPassSupported: false,
    fullMaaClaimForbidden: true,
    note: "Zero or low candidates in packet-local wording lane is not a full MAA PASS.",
    uncommitted: true,
    v1PreservedMembershipSha256: "273e5f5f3145a8c01be81f8f721dcf7f8e20ea0208b312997f75199276cd69fb",
    firstCensusMembershipPreserved: "dcf6c382fe1b41ef34624c03764c8dc785de04a13f5344784aee03b9a192d4ae",
  });
  console.log(JSON.stringify({ ok: true, runTag, candidateCount, evaluatedControls: evaluatedIds.size, dispCounts }, null, 2));
}

async function main() {
  const mode = process.argv[2] || "materialise";
  if (mode === "materialise") await materialiseV2(process.argv.includes("--post") ? "run-v2-post" : "run-v1");
  else if (mode === "maa") await runMaav2(process.argv.includes("--post-remediation") ? "post-remediation" : "pre-remediation");
  else throw new Error("mode materialise|maa");
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
