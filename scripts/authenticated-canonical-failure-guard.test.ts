#!/usr/bin/env npx tsx
/**
 * CB-HIST-AUTHENTICATED-CANONICAL-FAILURE-MUST-NOT-FALLBACK-TO-CHASE-TRUTH
 * Run: npx tsx scripts/authenticated-canonical-failure-guard.test.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import { resolveAuthenticatedCanonicalEvidenceAuthority } from "../lib/criminal/authenticated-canonical-evidence-guard";
import { buildFiveAnswersView } from "../lib/criminal/five-answers/build-five-answers-view";
import { evidenceRowFromSourceState } from "../lib/criminal/five-answers/evidence-trace";
import { HISTORICAL_INVARIANTS } from "../lib/eval/master3000-quality/invariants";
import type { DisclosureChaseBrief } from "../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import type { HearingWarRoomBrief } from "../components/criminal/hearing-war-room/buildHearingWarRoomBrief";

assert.ok(
  HISTORICAL_INVARIANTS.some(
    (i) => i.id === "CB-HIST-AUTHENTICATED-CANONICAL-FAILURE-MUST-NOT-FALLBACK-TO-CHASE-TRUTH",
  ),
  "invariant registry entry required",
);

const chaseItem = {
  label: "Master CCTV footage",
  baseStatus: "Outstanding",
  whyItMatters: "Needed",
  draftChaseWording: "Please provide Master CCTV footage",
  source: "MG6",
} as DisclosureChaseBrief["primaryItems"][number];

const chase = {
  primaryItems: [chaseItem],
  items: [chaseItem],
  additionalItems: [],
  disclosureSummary: "fixture",
  safeCourtLine: "Court note provisional",
} as unknown as DisclosureChaseBrief;

const warRoom = {
  safePositionToday: "Provisional",
  doNotOverstate: [],
  sayThis: [],
  instructionsNeeded: [],
  bundleContradictions: [],
} as unknown as HearingWarRoomBrief;

// Pending → suppress; do not treat as ready chase-fallback authority.
{
  const r = resolveAuthenticatedCanonicalEvidenceAuthority({
    bundleLoading: true,
    canonical: null,
    evidenceRowsFromCanonical: [],
  });
  assert.equal(r.authority, "pending");
  assert.equal(r.suppressChaseDerivedEvidence, true);
  assert.equal(r.evidenceRowsOverride, undefined);
}

// Fetch failed / canonical missing after load → unavailable, suppress.
{
  const r = resolveAuthenticatedCanonicalEvidenceAuthority({
    bundleLoading: false,
    canonical: null,
    evidenceRowsFromCanonical: [],
  });
  assert.equal(r.authority, "unavailable");
  assert.equal(r.suppressChaseDerivedEvidence, true);
  assert.equal(r.evidenceRowsOverride, undefined);
}

// Malformed/missing payload (undefined) after load → unavailable.
{
  const r = resolveAuthenticatedCanonicalEvidenceAuthority({
    bundleLoading: false,
    canonical: undefined,
    evidenceRowsFromCanonical: [evidenceRowFromSourceState("X", "served")],
  });
  assert.equal(r.authority, "unavailable");
  assert.equal(r.suppressChaseDerivedEvidence, true);
}

// Ready with authoritative empty [] — not chase rehydrate.
{
  const r = resolveAuthenticatedCanonicalEvidenceAuthority({
    bundleLoading: false,
    canonical: { evidenceState: { items: [] }, evidenceRows: [] },
    evidenceRowsFromCanonical: [],
  });
  assert.equal(r.authority, "ready");
  assert.equal(r.suppressChaseDerivedEvidence, false);
  assert.deepEqual(r.evidenceRowsOverride, []);

  const view = buildFiveAnswersView({
    allegation: "Robbery",
    warRoom,
    chase,
    matterConfidence: null,
    doNotOverstate: [],
    evidenceRowsOverride: r.evidenceRowsOverride,
  });
  assert.equal(view.evidenceState.rows.length, 0);
}

// Ready with rows — pass through.
{
  const rows = [evidenceRowFromSourceState("CCTV clip", "served")];
  const r = resolveAuthenticatedCanonicalEvidenceAuthority({
    bundleLoading: false,
    canonical: { evidenceState: { items: [{ label: "CCTV clip", state: "served" }] } },
    evidenceRowsFromCanonical: rows,
  });
  assert.equal(r.authority, "ready");
  assert.equal(r.suppressChaseDerivedEvidence, false);
  assert.equal(r.evidenceRowsOverride?.length, 1);
}

// Opposite: explicit legacy/eval caller may still pass undefined to buildFiveAnswersView.
{
  const legacy = buildFiveAnswersView({
    allegation: "Robbery",
    warRoom,
    chase,
    matterConfidence: null,
    doNotOverstate: [],
    evidenceRowsOverride: undefined,
  });
  assert.ok(legacy.evidenceState.rows.some((row) => /master cctv/i.test(row.label)));
}

// Production UI guard: authenticated path must suppress when override is undefined.
{
  const ui = fs.readFileSync("components/criminal/five-answers/FiveAnswersView.tsx", "utf8");
  assert.match(ui, /suppressChaseDerivedEvidence/);
  assert.match(ui, /five-answers-canonical-unavailable/);
  assert.match(ui, /suppressChaseDerivedEvidence \|\| evidenceRowsOverride === undefined/);
  assert.match(ui, /buildHearingMode\(/);
  assert.match(ui, /buildExportPack\(/);

  const hook = fs.readFileSync("components/criminal/workflow/useMatterBrief.ts", "utf8");
  assert.match(hook, /resolveAuthenticatedCanonicalEvidenceAuthority/);
  assert.match(hook, /setBundleSource\(null\)/);
  assert.match(hook, /suppressChaseDerivedEvidence/);
}

console.log("authenticated-canonical-failure-guard.test.ts: PASS");
