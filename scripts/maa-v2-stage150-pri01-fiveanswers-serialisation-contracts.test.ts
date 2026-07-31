/**
 * PRI-01 / Five Answers serialisation contracts — positive, negative, mutation.
 *
 * Corpus-harness invariant: casebrain-output fiveAnswers rows must match view
 * truthMap rows; court note alone never invents evidence.
 *
 * Run: npx tsx scripts/maa-v2-stage150-pri01-fiveanswers-serialisation-contracts.test.ts
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { FiveAnswersEvidenceRow } from "../lib/criminal/five-answers/types";
import type { LiveProductionSurfaces } from "../lib/criminal/canonical-live-surface-adapter";
import {
  alignCasebrainOutputFiveAnswersWithViewRows,
  deepCopyFiveAnswersEvidenceRows,
  serializeFiveAnswersEvidenceRowsFromSurfaces,
} from "../lib/eval/master-assurance-auditor/v2/stage150/batch10/deficit120/five-answers-serialisation";
import {
  buildEvalContext,
  evaluateAllStage150Intelligence,
} from "../lib/eval/master-assurance-auditor/v2/stage150/detectors";

function row(over: Partial<FiveAnswersEvidenceRow> & Pick<FiveAnswersEvidenceRow, "label">): FiveAnswersEvidenceRow {
  return {
    existence: "served",
    reliability: "needs_review",
    ...over,
  };
}

function surfacesWith(args: {
  rows: FiveAnswersEvidenceRow[];
  courtLine: string | null;
}): Pick<LiveProductionSurfaces, "truthMap" | "composedProse"> {
  return {
    truthMap: {
      caseSaying: { allegation: "x", mainIssue: "y", nextAction: "z" },
      evidenceState: { rows: args.rows, hardRules: [] },
      mustNotOverstate: [],
      chase: [],
      courtNote: {
        text: args.courtLine ?? "",
        copySuggestionLabel: "",
        sendabilityLabel: "",
        canCopy: false,
        footer: "",
      },
      contradictions: [],
      evidenceTrace: { sections: [], rows: [] } as never,
    },
    composedProse: {
      courtLine: args.courtLine,
      cpsChase: null,
      clientDisclaimer: "",
      limitations: [],
    },
  };
}

function pri01Hits(output: Record<string, unknown>) {
  const ctx = buildEvalContext("contract-case", output);
  return evaluateAllStage150Intelligence(ctx).filter(
    (h) => h.controlId === "MAA2-PRI-01-NO-IMPORTANT-OMISSION",
  );
}

describe("Five Answers serialisation — positive paths", () => {
  it("canonical rows correctly reach Five Answers / casebrain bag", () => {
    const rows = [
      row({ label: "CCTV full window", existence: "missing", note: "bundle.pdf · p.3" }),
      row({ label: "Final signed MG11", existence: "incomplete", note: "draft only" }),
    ];
    const s = serializeFiveAnswersEvidenceRowsFromSurfaces(
      surfacesWith({ rows, courtLine: "Court asks for disclosure timetable." }),
    );
    assert.equal(s.rows.length, 2);
    assert.equal(s.inventedFromCourt, false);
    assert.equal(s.viewRowsSha256, s.persistedRowsSha256);
    assert.equal(s.rows[0]!.label, "CCTV full window");
    assert.equal(s.rows[0]!.existence, "missing");
    assert.equal(s.rows[1]!.existence, "incomplete");
    assert.equal(pri01Hits({ courtNote: { text: "Court" }, fiveAnswersEvidenceRows: s.rows }).length, 0);
  });

  it("preserves existence states: missing/referred/incomplete/served", () => {
    const rows = [
      row({ label: "A", existence: "missing" }),
      row({ label: "B", existence: "referred_only" }),
      row({ label: "C", existence: "incomplete" }),
      row({ label: "D", existence: "served" }),
    ];
    const s = serializeFiveAnswersEvidenceRowsFromSurfaces(surfacesWith({ rows, courtLine: "x" }));
    assert.deepEqual(
      s.rows.map((r) => r.existence),
      ["missing", "referred_only", "incomplete", "served"],
    );
  });

  it("preserves co-defendant attribution notes and distinct labels/aliases wording", () => {
    const rows = [
      row({
        label: "Co-defendant interview (D2 only)",
        existence: "referred_only",
        note: "other_defendant_only — not usable against D1",
      }),
      row({
        label: "Interview alias cam-a",
        existence: "served",
        note: "distinct unit from cam-b; alias preserved",
      }),
    ];
    const s = serializeFiveAnswersEvidenceRowsFromSurfaces(surfacesWith({ rows, courtLine: "x" }));
    assert.match(s.rows[0]!.note!, /other_defendant_only/);
    assert.match(s.rows[1]!.note!, /distinct unit/);
    assert.notEqual(s.rows[0]!.label, s.rows[1]!.label);
  });

  it("preserves extract/full, clip/master, draft/signed, recording/transcript distinctions", () => {
    const rows = [
      row({ label: "CCTV extract only", existence: "served", note: "not full window / master" }),
      row({ label: "CCTV master reel", existence: "missing", note: "clip is not master" }),
      row({ label: "Draft MG11", existence: "incomplete", note: "not final signed" }),
      row({ label: "Final signed MG11", existence: "served", note: "signed operative" }),
      row({ label: "BWV recording", existence: "missing", note: "recording outstanding" }),
      row({ label: "BWV transcript", existence: "served", note: "transcript ≠ recording" }),
    ];
    const s = serializeFiveAnswersEvidenceRowsFromSurfaces(surfacesWith({ rows, courtLine: "x" }));
    assert.equal(s.rows.length, 6);
    assert.match(s.rows[0]!.note!, /not full/);
    assert.match(s.rows[1]!.note!, /not master/);
    assert.match(s.rows[2]!.note!, /not final signed/);
    assert.match(s.rows[5]!.note!, /transcript/);
  });

  it("preserves provenance/limitation notes", () => {
    const rows = [
      row({
        label: "Phone download",
        existence: "missing",
        note: "bundle.pdf · p.4 (compiled p.4) — page identity known; limitation: extract only listed",
      }),
    ];
    const s = serializeFiveAnswersEvidenceRowsFromSurfaces(surfacesWith({ rows, courtLine: "x" }));
    assert.match(s.rows[0]!.note!, /compiled p\.4/);
    assert.match(s.rows[0]!.note!, /limitation/);
  });
});

describe("Five Answers serialisation — negative paths", () => {
  it("empty evidence remains empty even when court note present", () => {
    const s = serializeFiveAnswersEvidenceRowsFromSurfaces(
      surfacesWith({ rows: [], courtLine: "The defence asks the court to record outstanding material." }),
    );
    assert.equal(s.rows.length, 0);
    assert.equal(s.courtNotePresent, true);
    assert.equal(s.inventedFromCourt, false);
    const hits = pri01Hits({
      courtNote: { text: "The defence asks the court to record outstanding material." },
      fiveAnswersEvidenceRows: s.rows,
    });
    assert.ok(hits.length >= 1, "PRI-01 must fire when court present and five empty");
  });

  it("court note present but no evidence rows — align does not invent", () => {
    const aligned = alignCasebrainOutputFiveAnswersWithViewRows({
      casebrainOutput: {
        courtNote: { text: "Court line with no evidence units." },
        fiveAnswersEvidenceRows: [],
      },
      viewEvidenceRows: [],
    });
    assert.equal(aligned.afterLen, 0);
    assert.equal(aligned.inventedFromCourt, false);
    assert.equal(aligned.repaired, false);
  });

  it("deep copy isolates persisted rows from later surface mutation", () => {
    const live: FiveAnswersEvidenceRow[] = [row({ label: "Live CCTV", existence: "served" })];
    const s = serializeFiveAnswersEvidenceRowsFromSurfaces(
      surfacesWith({ rows: live, courtLine: "x" }),
    );
    live.length = 0;
    assert.equal(s.rows.length, 1);
    assert.equal(s.rows[0]!.label, "Live CCTV");
  });
});

describe("Five Answers serialisation — mutation / repair", () => {
  it("empty bag with non-empty view rows is repaired from view (not court)", () => {
    const viewRows = [
      row({ label: "CCTV master", existence: "missing", note: "p.3" }),
      row({ label: "Signed MG11", existence: "missing", note: "p.5" }),
    ];
    const aligned = alignCasebrainOutputFiveAnswersWithViewRows({
      casebrainOutput: {
        courtNote: { text: "Court present." },
        fiveAnswersEvidenceRows: [],
      },
      viewEvidenceRows: viewRows,
    });
    assert.equal(aligned.repaired, true);
    assert.equal(aligned.afterLen, 2);
    assert.equal(aligned.inventedFromCourt, false);
    assert.equal(
      pri01Hits({
        courtNote: { text: "Court present." },
        fiveAnswersEvidenceRows: aligned.output.fiveAnswersEvidenceRows,
      }).length,
      0,
    );
  });

  it("mutation emptying fiveAnswers after align re-triggers PRI-01", () => {
    const rows = deepCopyFiveAnswersEvidenceRows([
      row({ label: "Unit", existence: "served", note: "prov" }),
    ]);
    const good = { courtNote: { text: "Court" }, fiveAnswersEvidenceRows: rows };
    assert.equal(pri01Hits(good).length, 0);
    const mutated = { ...good, fiveAnswersEvidenceRows: [] };
    assert.ok(pri01Hits(mutated).length >= 1);
  });

  it("view/copy/export/API/PDF/composed-prose consistency: bag matches view rows only", () => {
    const viewRows = [row({ label: "Shared unit", existence: "referred_only", note: "prov" })];
    const bag = alignCasebrainOutputFiveAnswersWithViewRows({
      casebrainOutput: {
        courtNote: { text: "Court" },
        fiveAnswersEvidenceRows: [],
        exitPayloadReceipts: {
          view: { payloadIdentity: "sha256:view" },
          copy: { payloadIdentity: "sha256:copy" },
          export: { payloadIdentity: "sha256:export" },
          api: { payloadIdentity: "sha256:api" },
          pdf: { payloadIdentity: "sha256:pdf" },
          composed_prose: { payloadIdentity: "sha256:prose" },
        },
      },
      viewEvidenceRows: viewRows,
    });
    const five = bag.output.fiveAnswersEvidenceRows as FiveAnswersEvidenceRow[];
    assert.equal(five.length, 1);
    assert.equal(five[0]!.label, viewRows[0]!.label);
    assert.equal(five[0]!.existence, viewRows[0]!.existence);
    assert.equal(five[0]!.note, viewRows[0]!.note);
    // Court text unchanged — not used as evidence seed
    assert.equal((bag.output.courtNote as { text: string }).text, "Court");
  });
});
