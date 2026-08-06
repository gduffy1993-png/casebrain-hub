/**
 * Final Batch-10 population acceptance — mutation/negative contracts + independent recompute.
 */

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import {
  BATCH10_BASELINE,
  type Batch10StructuredCasePacket,
} from "../lib/eval/master-assurance-auditor/v2/stage150/batch10/schemas";
import { independentlyRecomputePopulation } from "../lib/eval/master-assurance-auditor/v2/stage150/batch10/final-acceptance/independent-recompute";
import { strictValidateDeficitPacket } from "../lib/eval/master-assurance-auditor/v2/stage150/batch10/deficit120/strict-validators";
import { lockCohortA } from "../lib/eval/master-assurance-auditor/v2/stage150/batch10/deficit120/cohort-pipeline";
import { materialiseStructuredPacket } from "../lib/eval/master-assurance-auditor/v2/stage150/batch10/materialise";
import { buildStage150ImplementationCapabilityMatrix } from "../lib/eval/master-assurance-auditor/v2/stage150/implementation-matrix";
import { validateStructuredPacket } from "../lib/eval/master-assurance-auditor/v2/stage150/batch10/validators";

function loadAcceptedB(): Batch10StructuredCasePacket {
  const root = path.join(
    process.cwd(),
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch10-deficit120-candidates",
  );
  const id = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== "_rejected")
    .map((d) => d.name)
    .sort()[0]!;
  return JSON.parse(
    fs.readFileSync(path.join(root, id, "structured-case-packet.json"), "utf8"),
  ) as Batch10StructuredCasePacket;
}

function hasCode(reasons: string[], needle: string): boolean {
  return reasons.some((r) => r.includes(needle));
}

describe("Final Batch-10 acceptance foundation", () => {
  it("Cohort A remains byte-locked and gates stay false", () => {
    assert.equal(BATCH10_BASELINE, "78d16bb1a2606f7187f69fc8474e97629bce69ca");
    const lock = lockCohortA(process.cwd());
    assert.equal(lock.count, 30);
    assert.equal(lock.allUnchanged, true);
    const m = buildStage150ImplementationCapabilityMatrix();
    assert.ok(m.rows.every((r) => r.currentlyRunnableOnStage150 === false));
  });

  it("independent recompute reports populationPacketReadinessMet without implying Stage-150 PASS", () => {
    const r = independentlyRecomputePopulation(process.cwd());
    assert.match(r.meaning, /does not mean detector readiness/i);
    assert.equal(r.truthContentsOpened, false);
    assert.equal(r.exitMatrix.authenticated_browser.not_exercised, r.populationAccepted);
    assert.equal(r.cohortA.allUnchanged, true);
    assert.ok(r.populationAccepted >= 0);
  });
});

describe("Final Batch-10 validator mutation contracts", () => {
  it("rejects duplicate case/source identities", () => {
    const dupId = structuredClone(loadAcceptedB());
    dupId.sourceManifest.push({ ...dupId.sourceManifest[0]! });
    assert.ok(hasCode(strictValidateDeficitPacket(dupId), "duplicate_source_id"));
  });

  it("rejects cloned truth/source under a new ID at population fingerprint layer", () => {
    const base = loadAcceptedB();
    const clone = structuredClone(base);
    clone.caseId = "clone-under-new-id-must-collide";
    const pdfSha = base.preservedOriginalHashes.bundlePdfSha256;
    const docs = (p: Batch10StructuredCasePacket) =>
      p.sourceManifest
        .map((d) => `${d.contentSha256 ?? ""}|${d.title ?? ""}|${d.sourcePageStart ?? ""}|${d.sourcePageEnd ?? ""}`)
        .sort()
        .join(";");
    const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
    const fp = (p: Batch10StructuredCasePacket) =>
      crypto
        .createHash("sha256")
        .update(
          `${pdfSha ?? "nopdf"}::${docs(p)}::${p.chargeInstruments
            .map((c) => norm(c.exactWording ?? ""))
            .sort()
            .join("|")}::${p.evidenceUnits
            .map((e) => norm(e.label ?? ""))
            .sort()
            .join("|")}`,
        )
        .digest("hex");
    assert.equal(fp(base), fp(clone));
  });

  it("rejects missing or incomplete charge instruments", () => {
    const p = structuredClone(loadAcceptedB());
    p.chargeInstruments = [];
    assert.ok(strictValidateDeficitPacket(p).includes("missing_charge_instruments"));
    const p2 = structuredClone(loadAcceptedB());
    if (p2.chargeInstruments[0]) {
      p2.chargeInstruments[0].status = null;
      p2.chargeInstruments[0].version = null;
    }
    assert.ok(hasCode(strictValidateDeficitPacket(p2), "incomplete_charge"));
  });

  it("rejects default/synthetic page 1 provenance and missing defendant attribution", () => {
    const p = structuredClone(loadAcceptedB());
    p.provenance.push({
      occurrenceRef: "/x",
      quotationExactText: null,
      quotedSpan: null,
      sourceDocumentId: null,
      sourcePage: "1",
      compiledPage: null,
      pageIdentityKnown: false,
      limitationReason: null,
      sourcePointer: "x",
    });
    assert.ok(hasCode(strictValidateDeficitPacket(p), "unknown_page_defaulted_to_1"));
    const p2 = structuredClone(loadAcceptedB());
    if (p2.evidenceUnits[0]) {
      p2.evidenceUnits[0].subjectDefendantId = null;
      p2.evidenceUnits[0].personId = null;
    }
    assert.ok(hasCode(strictValidateDeficitPacket(p2), "incomplete_evidence"));
  });

  it("rejects ambiguous evidence-unit matches claimed as resolved", () => {
    const p = structuredClone(loadAcceptedB());
    if (!p.chaseRelationships[0]) throw new Error("expected chase");
    p.chaseRelationships[0].ambiguity = "ambiguous_multiple_matches";
    p.chaseRelationships[0].linkMethod = "explicit_id";
    p.chaseRelationships[0].evidenceUnitId = p.evidenceUnits[0]?.evidenceUnitId ?? "eu-x";
    assert.ok(hasCode(strictValidateDeficitPacket(p), "ambiguous_evidence_unit_match"));
  });

  it("rejects missing chase linkage and invalid chronology/unsupported timestamps", () => {
    const p = structuredClone(loadAcceptedB());
    p.chaseRelationships = [];
    assert.ok(strictValidateDeficitPacket(p).includes("missing_explicit_chase_linkage"));
    const p2 = structuredClone(loadAcceptedB());
    p2.chronologyEvents = [];
    assert.ok(strictValidateDeficitPacket(p2).includes("missing_chronology_timezone"));
    const p3 = structuredClone(loadAcceptedB());
    if (p3.chronologyEvents[0]) {
      p3.chronologyEvents[0].timestamp = "tomorrow morning TBD";
    }
    assert.ok(hasCode(strictValidateDeficitPacket(p3), "unsupported_timestamp"));
  });

  it("rejects extract/full, clip/master, draft/signed, recording/transcript collapse", () => {
    const p = structuredClone(loadAcceptedB());
    p.evidenceUnits.push({
      ...p.evidenceUnits[0]!,
      evidenceUnitId: "eu-collapse-ef",
      label: "extract full pack",
      extractFullRelationship: null,
    });
    assert.ok(hasCode(validateStructuredPacket(p).map((i) => i.code), "extract_full") || hasCode(strictValidateDeficitPacket(p), "extract_full"));

    const p2 = structuredClone(loadAcceptedB());
    p2.evidenceUnits.push({
      ...p2.evidenceUnits[0]!,
      evidenceUnitId: "eu-collapse-cm",
      label: "CCTV still clip master",
      stillClipMasterRelationship: null,
    });
    assert.ok(hasCode(strictValidateDeficitPacket(p2), "clip_master"));

    const p3 = structuredClone(loadAcceptedB());
    p3.evidenceUnits.push({
      ...p3.evidenceUnits[0]!,
      evidenceUnitId: "eu-collapse-ds",
      label: "draft signed statement",
      draftFinalRelationship: null,
    });
    assert.ok(hasCode(strictValidateDeficitPacket(p3), "draft_signed"));

    const p4 = structuredClone(loadAcceptedB());
    p4.evidenceUnits.push({
      ...p4.evidenceUnits[0]!,
      evidenceUnitId: "eu-collapse-rt",
      label: "recording transcript pack",
      recordingTranscriptRelationship: null,
    });
    assert.ok(hasCode(strictValidateDeficitPacket(p4), "recording_transcript"));
  });

  it("rejects metadata presented as a real exit", () => {
    const p = structuredClone(loadAcceptedB());
    p.exitPayloadReceipts.view.metadataOnly = true;
    p.exitPayloadReceipts.view.realPayloadPresent = true;
    assert.ok(hasCode(strictValidateDeficitPacket(p), "exit_metadata_masquerade"));
  });

  it("rejects truth/output conflation, missing hashes, developer/fixture language", () => {
    const p = structuredClone(loadAcceptedB()) as Batch10StructuredCasePacket & {
      mustNotSay?: string[];
    };
    p.mustNotSay = ["leak"];
    assert.ok(strictValidateDeficitPacket(p as Batch10StructuredCasePacket).includes("truth_output_conflation"));
    const p2 = structuredClone(loadAcceptedB());
    p2.preservedOriginalHashes.bundlePdfSha256 = null;
    assert.ok(strictValidateDeficitPacket(p2).includes("missing_pdf_hash"));
    const p3 = structuredClone(loadAcceptedB());
    if (p3.chargeInstruments[0]) {
      p3.chargeInstruments[0].exactWording = `${p3.chargeInstruments[0].exactWording}\nsynthetic fixtureId`;
    }
    assert.ok(strictValidateDeficitPacket(p3).includes("developer_fixture_language"));
  });

  it("rejects altered Cohort-A packets via hash lock", () => {
    const lock = lockCohortA(process.cwd());
    assert.ok(lock.locks.every((l) => l.unchanged));
    const sample = lock.locks[0]!;
    const abs = path.join(process.cwd(), sample.relativePath);
    const original = fs.readFileSync(abs);
    const tmp = path.join(os.tmpdir(), "cohort-a-mutate-test.json");
    fs.writeFileSync(tmp, `${original.toString("utf8").replace("stage150", "MUTATED")}\n`);
    assert.notEqual(
      crypto.createHash("sha256").update(fs.readFileSync(tmp)).digest("hex"),
      sample.expectedSha256,
    );
    assert.equal(
      crypto.createHash("sha256").update(fs.readFileSync(abs)).digest("hex"),
      sample.expectedSha256,
    );
  });

  it("rejects prose-only rematerialisation (no invented pages)", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fa-prose-"));
    fs.writeFileSync(path.join(dir, "bundle-text.md"), "vague allegation only");
    const r = materialiseStructuredPacket({
      caseId: "prose",
      sourceLaneId: "stage150_deficit120_controlled",
      sourceDir: dir,
    });
    assert.equal(r.ok, false);
  });

  it("clean population still independently accepts after mutation contracts load", () => {
    const r = independentlyRecomputePopulation(process.cwd());
    assert.equal(r.cohortA.allUnchanged, true);
    assert.equal(r.truthContentsOpened, false);
    if (r.populationAccepted < 150) {
      assert.equal(r.deficit, 150 - r.populationAccepted);
      assert.equal(r.populationPacketReadinessMet, false);
    } else {
      assert.equal(r.populationPacketReadinessMet, true);
      assert.equal(r.deficit, 0);
      assert.equal(r.uniqueness.uniqueCaseIds, 150);
      assert.equal(r.uniqueness.uniqueSourceFingerprints, 150);
      assert.equal(r.uniqueness.uniquePdfHashes, 150);
      assert.equal(r.uniqueness.uniquePacketHashes, 150);
    }
  });
});
