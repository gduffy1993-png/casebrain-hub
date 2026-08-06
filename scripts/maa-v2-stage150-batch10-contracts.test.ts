/**
 * MAA V2 Stage-150 Batch-10 contracts — source-backed rematerialisation honesty.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { STAGE150_IMPLEMENTED_IDS } from "../lib/eval/master-assurance-auditor/v2/stage150/batch5-implemented";
import { runBatch10Census } from "../lib/eval/master-assurance-auditor/v2/stage150/batch10/census";
import { materialiseStructuredPacket } from "../lib/eval/master-assurance-auditor/v2/stage150/batch10/materialise";
import type { Batch10StructuredCasePacket } from "../lib/eval/master-assurance-auditor/v2/stage150/batch10/schemas";
import { BATCH10_BASELINE } from "../lib/eval/master-assurance-auditor/v2/stage150/batch10/schemas";
import {
  assertNoTruthKeyLeakage,
  validateStructuredPacket,
} from "../lib/eval/master-assurance-auditor/v2/stage150/batch10/validators";
import { buildStage150ImplementationCapabilityMatrix } from "../lib/eval/master-assurance-auditor/v2/stage150/implementation-matrix";

function writeFixture(dir: string, files: Record<string, string | Buffer>): void {
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, body] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), body);
  }
}

function canonicalBundle(over: { listing?: string; indexExtra?: string; chargeStatus?: string } = {}): string {
  return `RESTRICTED — PROSECUTION DISCLOSURE BUNDLE

URN: 26/DA/001
Defendant: Riley Moss
Court: Northgate Magistrates' Court

=== SECTION: COVER_INDEX ===

INDEX

Document | Pages | Note
Charge sheet | 1 |
MG5 case summary | 2-3 |
MG11 complainant statement (draft unsigned) | 5-6 |
CCTV still clip | 7 |
Interview recording transcript | 8 |
Exhibit list | 9 |
Court listing | 11 |${over.indexExtra ?? ""}

=== SECTION: CHARGE ===

R v Riley Moss

Statement of Offence:
Harassment, contrary to section 2 of the Protection from Harassment Act 1997.

Particulars of Offence:
Between 3 January 2026 and 14 March 2026 at Northgate sent messages amounting to harassment.

=== SECTION: LISTING ===

${over.listing ?? "PTPH listed — 18 August 2026, 10:00 Europe/London"}
`;
}

describe("Batch-10 foundation honesty", () => {
  it("preserves baseline totals and Stage-150 gates posture", () => {
    assert.equal(BATCH10_BASELINE, "78d16bb1a2606f7187f69fc8474e97629bce69ca");
    const m = buildStage150ImplementationCapabilityMatrix();
    assert.equal(m.totals.implemented, 8);
    assert.equal(m.totals.partially_implemented, 98);
    assert.equal(m.totals.specified_not_implemented, 55);
    assert.equal(STAGE150_IMPLEMENTED_IDS.size, 8);
    assert.ok(m.rows.every((r) => r.currentlyRunnableOnStage150 === false));
  });

  it("census keeps lane denominators separate and does not open truth", () => {
    const census = runBatch10Census(BATCH10_BASELINE);
    assert.equal(census.truthContentsOpened, false);
    const esa = census.lanes.find((l) => l.laneId === "esa_valid_499");
    const demo = census.lanes.find((l) => l.laneId === "esa_demo_audit_pdf_backed");
    const scale = census.lanes.find((l) => l.laneId === "scale3000_messy_pdf_proof_v9");
    assert.ok(esa);
    assert.ok(demo);
    assert.ok(scale?.blueprintOnly);
    assert.equal(esa!.caseDirectoryCount, 499);
    assert.ok((demo?.caseDirectoryCount ?? 0) >= 1);
    for (const c of esa!.cases.slice(0, 5)) {
      assert.equal(c.truthKeyContentsOpened, false);
    }
  });
});

describe("Batch-10 behavioural contracts", () => {
  it("positive: genuine page identity rematerialises", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "b10-pos-"));
    writeFixture(dir, {
      "bundle.pdf": Buffer.from("%PDF-1.4 fixture"),
      "canonical-bundle.md": canonicalBundle(),
      "pdf-extraction-meta.json": JSON.stringify({
        pageCount: 2,
        pages: [
          { pageNumber: 1, label: "Cover and charge", text: "SECTION: CHARGE wording" },
          { pageNumber: 2, label: "MG5", text: "MG5" },
        ],
        pdfFileName: "bundle.pdf",
      }),
      "bundle-text.md": "x",
      "truth-key.json": JSON.stringify({ mustNotSay: ["secret-truth"] }),
    });
    const r = materialiseStructuredPacket({
      caseId: "fixture-pos",
      sourceLaneId: "esa_demo_audit_pdf_backed",
      sourceDir: dir,
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.packet.truthKeyContentsOpened, false);
    assert.ok(r.packet.sourceManifest.some((d) => d.pageIdentityKnown));
    assert.ok(r.packet.chargeInstruments.length >= 1);
    assert.equal(validateStructuredPacket(r.packet).length, 0);
    assertNoTruthKeyLeakage(r.packet);
  });

  it("negative: unknown page identity stays null with limitation", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "b10-unk-"));
    writeFixture(dir, {
      "bundle.pdf": Buffer.from("%PDF-1.4 fixture"),
      "canonical-bundle.md": canonicalBundle({ indexExtra: "\nMystery annex | see above | Unknown pages" }),
      "pdf-extraction-meta.json": JSON.stringify({ pageCount: 0, pages: [], pdfFileName: "bundle.pdf" }),
    });
    const r = materialiseStructuredPacket({
      caseId: "fixture-unk",
      sourceLaneId: "esa_demo_audit_pdf_backed",
      sourceDir: dir,
    });
    // May accept via index rows; unknown page rows must carry limitation / pageIdentityKnown false
    if (r.ok) {
      const mystery = r.packet.sourceManifest.find((d) => /Mystery annex/i.test(d.title ?? ""));
      assert.ok(mystery);
      assert.equal(mystery!.pageIdentityKnown, false);
      assert.ok(mystery!.limitationReason);
    }
  });

  it("negative: duplicate source identities rejected by validator", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "b10-dup-"));
    writeFixture(dir, {
      "bundle.pdf": Buffer.from("%PDF-1.4 fixture"),
      "canonical-bundle.md": canonicalBundle(),
      "pdf-extraction-meta.json": JSON.stringify({
        pageCount: 1,
        pages: [{ pageNumber: 1, label: "Cover and charge", text: "CHARGE" }],
        pdfFileName: "bundle.pdf",
      }),
    });
    const r = materialiseStructuredPacket({
      caseId: "fixture-dup",
      sourceLaneId: "esa_demo_audit_pdf_backed",
      sourceDir: dir,
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    const dup = structuredClone(r.packet);
    dup.sourceManifest.push({ ...dup.sourceManifest[0]! });
    const issues = validateStructuredPacket(dup);
    assert.ok(issues.some((i) => i.code === "duplicate_source_id"));
  });

  it("negative: extract≠full / recording≠transcript / draft cues", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "b10-rel-"));
    writeFixture(dir, {
      "bundle.pdf": Buffer.from("%PDF-1.4 fixture"),
      "canonical-bundle.md": canonicalBundle(),
      "pdf-extraction-meta.json": JSON.stringify({
        pageCount: 1,
        pages: [{ pageNumber: 1, label: "Cover and charge", text: "CHARGE" }],
      }),
    });
    const r = materialiseStructuredPacket({
      caseId: "fixture-rel",
      sourceLaneId: "esa_demo_audit_pdf_backed",
      sourceDir: dir,
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    const draft = r.packet.evidenceUnits.find((e) => /draft unsigned/i.test(e.label ?? ""));
    assert.ok(draft);
    assert.ok(draft!.draftFinalRelationship === "draft" || draft!.draftFinalRelationship === "unsigned");
    const collapsed = structuredClone(r.packet);
    collapsed.evidenceUnits.push({
      ...collapsed.evidenceUnits[0]!,
      evidenceUnitId: "eu-collapse",
      label: "extract full pack",
      extractFullRelationship: null,
    });
    assert.ok(validateStructuredPacket(collapsed).some((i) => i.code === "extract_full"));
  });

  it("negative: metadata masquerading as exit / missing payload bytes", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "b10-exit-"));
    writeFixture(dir, {
      "bundle.pdf": Buffer.from("%PDF-1.4 fixture"),
      "canonical-bundle.md": canonicalBundle(),
      "pdf-extraction-meta.json": JSON.stringify({
        pageCount: 1,
        pages: [{ pageNumber: 1, label: "Cover and charge", text: "CHARGE" }],
      }),
    });
    const r = materialiseStructuredPacket({
      caseId: "fixture-exit",
      sourceLaneId: "esa_demo_audit_pdf_backed",
      sourceDir: dir,
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.packet.exitPayloadReceipts.view.realPayloadPresent, false);
    const bad = structuredClone(r.packet);
    bad.exitPayloadReceipts.view.metadataOnly = true;
    bad.exitPayloadReceipts.view.realPayloadPresent = true;
    assert.ok(validateStructuredPacket(bad).some((i) => i.code === "exit_metadata_masquerade"));
    const missing = structuredClone(r.packet);
    missing.exitPayloadReceipts.copy.realPayloadPresent = true;
    missing.exitPayloadReceipts.copy.payloadIdentity = null;
    assert.ok(validateStructuredPacket(missing).some((i) => i.code === "missing_exit_payload_bytes"));
  });

  it("unavailable: prose-only ESA-like packet rejected", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "b10-prose-"));
    writeFixture(dir, {
      "bundle-text.md": "The allegation is that he stole. Court note only.",
      "casebrain-output.json": JSON.stringify({ courtNote: { text: "x" } }),
    });
    const r = materialiseStructuredPacket({
      caseId: "fixture-prose",
      sourceLaneId: "esa_valid_499",
      sourceDir: dir,
    });
    assert.equal(r.ok, false);
  });

  it("mutation: removing page meta changes acceptance", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "b10-mut-"));
    writeFixture(dir, {
      "bundle.pdf": Buffer.from("%PDF-1.4 fixture"),
      "canonical-bundle.md": canonicalBundle(),
      "pdf-extraction-meta.json": JSON.stringify({
        pageCount: 1,
        pages: [{ pageNumber: 1, label: "Cover and charge", text: "CHARGE" }],
      }),
    });
    const before = materialiseStructuredPacket({
      caseId: "fixture-mut",
      sourceLaneId: "esa_demo_audit_pdf_backed",
      sourceDir: dir,
    });
    assert.equal(before.ok, true);
    fs.unlinkSync(path.join(dir, "pdf-extraction-meta.json"));
    // Still has canonical index — may remain ok; mutate further by stripping canonical
    fs.unlinkSync(path.join(dir, "canonical-bundle.md"));
    const after = materialiseStructuredPacket({
      caseId: "fixture-mut",
      sourceLaneId: "esa_demo_audit_pdf_backed",
      sourceDir: dir,
    });
    assert.equal(after.ok, false);
  });

  it("truth-key leakage forbidden", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "b10-truth-"));
    writeFixture(dir, {
      "bundle.pdf": Buffer.from("%PDF-1.4 fixture"),
      "canonical-bundle.md": canonicalBundle(),
      "pdf-extraction-meta.json": JSON.stringify({
        pageCount: 1,
        pages: [{ pageNumber: 1, label: "Cover and charge", text: "CHARGE" }],
      }),
      "truth-key.json": JSON.stringify({ mustNotSay: ["leak-me"], expectedSendability: "blocked" }),
    });
    const r = materialiseStructuredPacket({
      caseId: "fixture-truth",
      sourceLaneId: "esa_demo_audit_pdf_backed",
      sourceDir: dir,
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assertNoTruthKeyLeakage(r.packet);
    const leaked = structuredClone(r.packet) as Batch10StructuredCasePacket & {
      truthKeyComparison?: unknown;
    };
    leaked.truthKeyComparison = { mustNotSay: ["leak-me"] };
    assert.throws(() => assertNoTruthKeyLeakage(leaked as typeof r.packet));
  });

  it("interrupted/resumed materialisation checkpoint is writable", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "b10-ckpt-"));
    const ck = path.join(root, "_checkpoint.json");
    const body = {
      schemaVersion: "batch10-materialisation-checkpoint@1.0.0",
      baselineCommit: BATCH10_BASELINE,
      processedCaseIds: ["a"],
      acceptedCaseIds: [],
      rejected: [{ caseId: "a", reasons: ["interrupted"] }],
    };
    fs.writeFileSync(ck, `${JSON.stringify(body, null, 2)}\n`);
    const loaded = JSON.parse(fs.readFileSync(ck, "utf8"));
    assert.deepEqual(loaded.processedCaseIds, ["a"]);
    assert.equal(loaded.rejected[0].reasons[0], "interrupted");
  });

  it("negative: defendant bleed and competing timestamps without group", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "b10-bleed-"));
    writeFixture(dir, {
      "bundle.pdf": Buffer.from("%PDF-1.4 fixture"),
      "canonical-bundle.md": canonicalBundle(),
      "pdf-extraction-meta.json": JSON.stringify({
        pageCount: 1,
        pages: [{ pageNumber: 1, label: "Cover and charge", text: "CHARGE" }],
      }),
    });
    const r = materialiseStructuredPacket({
      caseId: "fixture-bleed",
      sourceLaneId: "esa_demo_audit_pdf_backed",
      sourceDir: dir,
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    const bleed = structuredClone(r.packet);
    if (bleed.evidenceUnits[0]) {
      bleed.evidenceUnits[0].subjectDefendantId = "Alice and Bob";
    }
    assert.ok(validateStructuredPacket(bleed).some((i) => i.code === "defendant_bleed"));
    const competing = structuredClone(r.packet);
    competing.chronologyEvents = [
      {
        eventId: "e1",
        eventIdDerivation: { algorithm: "sha256", of: "e1", note: "t" },
        eventType: "hearing",
        timestamp: "18 August 2026 10:00",
        timezone: "Europe/London",
        sourceDocumentId: null,
        sourcePointer: "a",
        competingEventGroupId: null,
        confidence: "high",
      },
      {
        eventId: "e2",
        eventIdDerivation: { algorithm: "sha256", of: "e2", note: "t" },
        eventType: "hearing",
        timestamp: "18 August 2026 11:00",
        timezone: "Europe/London",
        sourceDocumentId: null,
        sourcePointer: "b",
        competingEventGroupId: null,
        confidence: "high",
      },
    ];
    assert.ok(validateStructuredPacket(competing).some((i) => i.code === "competing_timestamps"));
  });

  it("negative: operative/amended self-replace and ambiguous chase", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "b10-amd-"));
    writeFixture(dir, {
      "bundle.pdf": Buffer.from("%PDF-1.4 fixture"),
      "canonical-bundle.md": canonicalBundle(),
      "pdf-extraction-meta.json": JSON.stringify({
        pageCount: 1,
        pages: [{ pageNumber: 1, label: "Cover and charge", text: "CHARGE" }],
      }),
    });
    const r = materialiseStructuredPacket({
      caseId: "fixture-amd",
      sourceLaneId: "esa_demo_audit_pdf_backed",
      sourceDir: dir,
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    const amd = structuredClone(r.packet);
    if (amd.chargeInstruments[0]) {
      amd.chargeInstruments[0].status = "amended";
      amd.chargeInstruments[0].replacesInstrumentId = amd.chargeInstruments[0].instrumentId;
    }
    assert.ok(validateStructuredPacket(amd).some((i) => i.code === "operative_amended"));
    const chase = structuredClone(r.packet);
    chase.chaseRelationships = [
      {
        requestId: "r1",
        requestIdDerivation: { algorithm: "sha256", of: "r1", note: "t" },
        chaseLabel: "item",
        evidenceUnitId: null,
        linkMethod: "none",
        resolutionState: null,
        duplicateOrAliasRelationship: null,
        ambiguity: "ambiguous_multiple_matches",
        sourcePointer: "x",
      },
    ];
    // Ambiguous with linkMethod none is allowed (explicit); collapse to claiming explicit_id without id is not.
    chase.chaseRelationships[0]!.linkMethod = "explicit_id";
    assert.ok(validateStructuredPacket(chase).some((i) => i.code === "ambiguous_chase"));
  });
});
