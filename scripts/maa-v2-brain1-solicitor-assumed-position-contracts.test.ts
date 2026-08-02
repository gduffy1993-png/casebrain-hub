/**
 * Contracts: Brain 1 keeps canonical assumed-position wording; solicitor exits expand it.
 * Run: npx tsx scripts/maa-v2-brain1-solicitor-assumed-position-contracts.test.ts
 */
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";

import {
  BRAIN1_ASSUMED_POSITION_CONFLICT_CANONICAL,
  SOLICITOR_ASSUMED_POSITION_CONFLICT_PROFESSIONAL,
  expandAssumedPositionConflictForSolicitor,
  presentSolicitorBattleboard,
  sanitizeSolicitorProse,
} from "../lib/criminal/solicitor-visible-sanitization";
import { buildStrategyBattleboard } from "../lib/criminal/strategy-battleboard";
import { buildCaseQaPackMarkdown, type CaseQaPackInput } from "../lib/criminal/export-case-qa-pack";

function check(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (e) {
    console.error(`FAIL ${name}`);
    throw e;
  }
}

const PROTECTED_BASELINE = "a831a631f3050e096b89633176f023bee2fd6a5f";
const BRAIN1_FILES = [
  "lib/criminal/strategy-fight-engine.ts",
  "lib/criminal/strategy-fight-engine-generators.ts",
  "lib/criminal/get-aggressive-defense.ts",
  "lib/criminal/strategy-battleboard.ts",
  "lib/criminal/strategy-routes.ts",
  "lib/criminal/bundle-truth-ledger.ts",
  "lib/criminal/bundle-material-normalizer.ts",
] as const;
const GUARDIAN_FILES = [
  "lib/criminal/source-truth-guardian/fingerprint.ts",
  "lib/criminal/source-truth-guardian/guardian.ts",
  "lib/criminal/source-truth-guardian/index.ts",
  "lib/criminal/source-truth-guardian/types.ts",
] as const;

check("Brain1 battleboard blob matches protected baseline 7d1391a8…", () => {
  const blob = execSync("git hash-object lib/criminal/strategy-battleboard.ts", { encoding: "utf8" }).trim();
  assert.equal(blob, "7d1391a81281f735c27e9e28edbb5058c0a95ecb");
  const baseline = execSync(`git rev-parse ${PROTECTED_BASELINE}:lib/criminal/strategy-battleboard.ts`, {
    encoding: "utf8",
  }).trim();
  assert.equal(blob, baseline);
});

const PROVISIONAL_BUNDLE =
  "R v Smith. Allegation assault. Papers served MG5 MG11. No defence position recorded on the file.";

check("Brain1 emits canonical assumed-position conflict value (not expanded)", () => {
  const bb = buildStrategyBattleboard({
    case_id: "contract-assumed-position",
    bundle_text: PROVISIONAL_BUNDLE,
    recorded_position: null,
    position_text: null,
  });
  assert.equal(bb.position_trust, "provisional");
  const joined = [
    ...bb.global_collapse_risks,
    ...(bb.primary_route?.collapse_risks ?? []),
    ...bb.routes.flatMap((r) => r.collapse_risks),
  ].join("\n");
  assert.ok(
    joined.includes(BRAIN1_ASSUMED_POSITION_CONFLICT_CANONICAL),
    "expected Brain1 canonical risk on provisional/not_recorded position",
  );
  assert.ok(
    !joined.includes("treat as provisional until the interview account"),
    "Brain1 must not emit solicitor-expanded wording",
  );
});

check("solicitor sanitisation expands canonical value; idempotent", () => {
  const expanded = sanitizeSolicitorProse(BRAIN1_ASSUMED_POSITION_CONFLICT_CANONICAL);
  assert.equal(expanded, SOLICITOR_ASSUMED_POSITION_CONFLICT_PROFESSIONAL);
  assert.equal(expandAssumedPositionConflictForSolicitor(expanded), SOLICITOR_ASSUMED_POSITION_CONFLICT_PROFESSIONAL);
  assert.equal(
    sanitizeSolicitorProse(SOLICITOR_ASSUMED_POSITION_CONFLICT_PROFESSIONAL),
    SOLICITOR_ASSUMED_POSITION_CONFLICT_PROFESSIONAL,
  );
});

check("presentSolicitorBattleboard expands risks on solicitor presentation", () => {
  const bb = buildStrategyBattleboard({
    case_id: "contract-assumed-position-present",
    bundle_text: PROVISIONAL_BUNDLE,
    recorded_position: null,
    position_text: null,
  });
  const presented = presentSolicitorBattleboard(bb);
  const presentedJoined = [
    ...presented.global_collapse_risks,
    ...(presented.primary_route?.collapse_risks ?? []),
  ].join("\n");
  assert.ok(presentedJoined.includes(SOLICITOR_ASSUMED_POSITION_CONFLICT_PROFESSIONAL));
  assert.ok(
    bb.global_collapse_risks.some((r) => r === BRAIN1_ASSUMED_POSITION_CONFLICT_CANONICAL),
    "underlying Brain1 object remains canonical",
  );
});

check("export QA pack solicitor exit receives improved professional wording", () => {
  const bb = buildStrategyBattleboard({
    case_id: "contract-assumed-position-export",
    bundle_text: PROVISIONAL_BUNDLE,
    recorded_position: null,
    position_text: null,
  });
  const input = {
    caseId: "contract-assumed-position-export",
    caseLabel: "Contract matter",
    exportedAt: "2026-08-02T00:00:00.000Z",
    header: { shortTitle: "Contract matter" },
    caseTitle: "Contract matter",
    clientLabel: "Client",
    allegation: "Allegation not confirmed",
    stage: "Pre-hearing",
    hearingStatus: "Not listed",
    bundleHealth: "Thin",
    positionStatus: "Not recorded",
    controlRoom: {
      bestRouteTitle: null,
      routeStatus: null,
      prosecutionWeakness: [],
      defenceRisks: [],
      immediateActions: [],
      safeCourtLine: null,
      chaseItems: [],
    },
    battleboard: bb,
    warRoom: null,
    disclosureChase: null,
    positionNotes: { savedPosition: null, clientInstructions: null },
    documents: { count: 1, combinedTextLength: 80, rows: [{ name: "MG5" }] },
    bundleText: PROVISIONAL_BUNDLE,
  } as CaseQaPackInput;
  const md = buildCaseQaPackMarkdown(input);
  assert.ok(
    md.includes(SOLICITOR_ASSUMED_POSITION_CONFLICT_PROFESSIONAL),
    "export pack must carry expanded solicitor wording",
  );
});

check("no wording regression: expanded professional sentence is required target", () => {
  assert.match(
    SOLICITOR_ASSUMED_POSITION_CONFLICT_PROFESSIONAL,
    /treat as provisional until the interview account and served papers are reconciled/,
  );
  assert.match(
    SOLICITOR_ASSUMED_POSITION_CONFLICT_PROFESSIONAL,
    /do not fix hearing position on the assumed account alone/,
  );
});

check("all 7 Brain1 + 4 Guardian blobs identical to protected baseline", () => {
  for (const f of [...BRAIN1_FILES, ...GUARDIAN_FILES]) {
    const head = createHash("sha1")
      .update(fs.readFileSync(f))
      .digest("hex");
    // Prefer git blob ids
    const headBlob = execSync(`git hash-object ${f}`, { encoding: "utf8" }).trim();
    const baseBlob = execSync(`git rev-parse ${PROTECTED_BASELINE}:${f}`, { encoding: "utf8" }).trim();
    assert.equal(headBlob, baseBlob, `${f} drifted from protected baseline (${head})`);
  }
});

console.log("All Brain1/solicitor assumed-position contracts passed.");
