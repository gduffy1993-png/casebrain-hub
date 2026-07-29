/**
 * Load preserved saved materialisations for calibration.
 * Primary corpus: artifacts/casebrain-qa/gold-manual-proof-set-v1 (CASE-01..20).
 */

import fs from "node:fs";
import path from "node:path";
import type { SavedCaseMaterialisation, MaterialisedSurface, TruthExpectation } from "./types";
import { sha256Hex } from "./hashes";

export const DEFAULT_GOLD_CORPUS_ROOT = path.join(
  "artifacts",
  "casebrain-qa",
  "gold-manual-proof-set-v1",
);

function readJson<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function surfacesFromActual(actual: Record<string, unknown>, caseId: string): MaterialisedSurface[] {
  const surfaces: MaterialisedSurface[] = [];
  const push = (
    surfaceId: string,
    text: string,
    exits: MaterialisedSurface["exitModes"],
    extra?: Partial<MaterialisedSurface>,
  ) => {
    if (!text?.trim()) return;
    surfaces.push({
      surfaceId,
      text,
      exitModes: exits,
      ...extra,
    });
  };

  push("allegation", String(actual.allegation ?? ""), ["view", "copy", "composed_prose"]);
  push("client_summary", String(actual.clientSummaryPreview ?? ""), ["view", "copy"], {
    canCopy: true,
  });
  push("court_line", String(actual.courtLine ?? ""), ["view", "copy", "composed_prose"], {
    canCopy: true,
  });

  const truthMap = Array.isArray(actual.truthMapRows) ? actual.truthMapRows : [];
  for (const row of truthMap as Array<Record<string, unknown>>) {
    const label = String(row.label ?? "");
    const existence = String(row.existence ?? "");
    const reliability = String(row.reliability ?? "");
    push(
      "truth_map",
      `${label} · ${existence} · ${reliability}`,
      ["view", "copy"],
      { canCopy: true },
    );
  }

  const chase = Array.isArray(actual.cpsChase) ? actual.cpsChase : [];
  for (const row of chase as Array<Record<string, unknown>>) {
    push("disclosure_chase", String(row.draft ?? row.label ?? ""), ["view", "copy", "export"], {
      canCopy: true,
    });
  }

  const doNot = Array.isArray(actual.doNotOverstate) ? actual.doNotOverstate : [];
  for (const line of doNot) {
    push("do_not_overstate", String(line), ["view"], { canCopy: false });
  }

  const receipts = Array.isArray(actual.proofReceipts) ? actual.proofReceipts : [];
  for (const r of receipts as Array<Record<string, unknown>>) {
    const line = String(r.outputLine ?? "");
    const surface = String(r.surface ?? "proof_receipt");
    push(`proof_receipt:${surface}`, line, ["view", "copy", "export"], {
      sourceDocument: r.sourceDocument != null ? String(r.sourceDocument) : null,
      sourcePage: r.sourcePage != null ? String(r.sourcePage) : null,
      pageIdentityKnown:
        r.sourcePage != null &&
        !/source verification required|unavailable|unknown/i.test(String(r.sourcePage)),
    });
  }

  // Ensure at least one surface exists for case accounting
  if (!surfaces.length) {
    surfaces.push({
      surfaceId: "empty_packet",
      text: "",
      exitModes: ["view"],
    });
  }

  void caseId;
  return surfaces;
}

function expectationsFromExpected(expected: Record<string, unknown> | null): TruthExpectation[] {
  if (!expected) return [];
  const states = Array.isArray(expected.truthStates) ? expected.truthStates : [];
  return states.map((row: Record<string, unknown>) => ({
    evidenceItem: String(row.evidence_item ?? ""),
    evidenceType: row.evidence_type != null ? String(row.evidence_type) : null,
    correctEvidenceState:
      row.correct_evidence_state != null ? String(row.correct_evidence_state) : null,
    chaseNeeded: typeof row.chase_needed === "boolean" ? row.chase_needed : null,
    safeToRelyOn: typeof row.safe_to_rely_on === "boolean" ? row.safe_to_rely_on : null,
    mustNotSay: Array.isArray(row.must_not_say) ? row.must_not_say.map(String) : [],
    sourcePageAnchor: row.source_page_anchor != null ? String(row.source_page_anchor) : null,
  }));
}

export function loadGoldCasePacket(caseDir: string): SavedCaseMaterialisation {
  const actualPath = path.join(caseDir, "actual-summary.json");
  const expectedPath = path.join(caseDir, "expected.json");
  const actual = readJson<Record<string, unknown>>(actualPath);
  if (!actual) {
    throw new Error(`Missing actual-summary.json in ${caseDir}`);
  }
  const expected = readJson<Record<string, unknown>>(expectedPath);
  const caseId = String(actual.goldId ?? path.basename(caseDir));
  const truthMapRows = Array.isArray(actual.truthMapRows)
    ? (actual.truthMapRows as Array<Record<string, unknown>>).map((r) => ({
        label: String(r.label ?? ""),
        existence: String(r.existence ?? ""),
        reliability: String(r.reliability ?? ""),
      }))
    : [];
  const cpsChase = Array.isArray(actual.cpsChase)
    ? (actual.cpsChase as Array<Record<string, unknown>>).map((r) => ({
        label: String(r.label ?? ""),
        draft: String(r.draft ?? ""),
      }))
    : [];

  return {
    caseId,
    sourceCaseId: actual.sourceCaseId != null ? String(actual.sourceCaseId) : null,
    familyLabel: expected?.familyLabel != null ? String(expected.familyLabel) : null,
    allegation: actual.allegation != null ? String(actual.allegation) : null,
    clientLabel: actual.clientLabel != null ? String(actual.clientLabel) : null,
    surfaces: surfacesFromActual(actual, caseId),
    truthExpectations: expectationsFromExpected(expected),
    truthMapRows,
    cpsChase,
    doNotOverstate: Array.isArray(actual.doNotOverstate)
      ? actual.doNotOverstate.map(String)
      : [],
    inputBundlePath: expected?.inputBundlePath != null ? String(expected.inputBundlePath) : null,
    packetPath: caseDir,
    builtAt: actual.builtAt != null ? String(actual.builtAt) : null,
  };
}

export function listGoldCaseDirs(corpusRoot: string): string[] {
  const casesRoot = path.join(corpusRoot, "cases");
  if (!fs.existsSync(casesRoot)) return [];
  return fs
    .readdirSync(casesRoot)
    .filter((n) => /^CASE-\d+$/i.test(n))
    .sort()
    .map((n) => path.join(casesRoot, n));
}

export function loadGoldCorpus(input: {
  corpusRoot?: string;
  limit?: number;
}): SavedCaseMaterialisation[] {
  const root = input.corpusRoot ?? DEFAULT_GOLD_CORPUS_ROOT;
  const dirs = listGoldCaseDirs(root);
  const limited = typeof input.limit === "number" ? dirs.slice(0, input.limit) : dirs;
  return limited.map(loadGoldCasePacket);
}

export function hashFileIfExists(filePath: string | null): string | null {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return sha256Hex(fs.readFileSync(filePath));
}

export function hashJsonFile(filePath: string): string {
  return sha256Hex(fs.readFileSync(filePath));
}
