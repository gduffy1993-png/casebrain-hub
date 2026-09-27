/**
 * Labelled front-sheet court/ledger gate — no family furniture, no sentence fragments.
 * Run: npx tsx scripts/smoke-pack-court-ledger-gate.test.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildDisclosureChaseBrief } from "../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { buildHearingWarRoomBrief, buildChaseItemsForHearing } from "../components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import { extractBundleCaseMetadata } from "../lib/criminal/extract-bundle-case-metadata";
import { lineIsUnsourcedNarrativeChase } from "../lib/criminal/bundle-material-normalizer";
import { lineIsUnbackedOffenceFamilyFurniture } from "../lib/criminal/smoke-pack-front-sheet";
import {
  workflowSafeCourtLine,
  workflowTopNextActions,
  workflowCourtRecordAsks,
} from "../lib/criminal/pilot-workflow";

process.env.NEXT_PUBLIC_CRIMINAL_PILOT_MODE = "true";

const EXTRACTS = path.join(
  process.cwd(),
  "artifacts/casebrain-qa/assurance/family-pdf-accuracy-v1/_extracts",
);

const VALE_BELL = fs.readFileSync(path.join(EXTRACTS, "CB-CHARGE-2026-0039.full.txt"), "utf8");
const GRANT = fs.readFileSync(path.join(EXTRACTS, "RP-02-GRANT.full.txt"), "utf8");
const DUNN = fs.readFileSync(path.join(EXTRACTS, "RP-13-DUNN.full.txt"), "utf8");

const HALE = [
  "R v Leon Hale",
  "Charge: Murder, contrary to common law",
  "Court: Northchester Crown Court",
  "Next hearing: 22 May 2026 10:00 — First Appearance",
  "EX-MUR-007 — Police officer statement BWV — not served",
  "EX-MUR-009 — CCTV stills and timing note Master footage outstanding EX-MUR-009 to EX-MUR-011",
  "EX-MUR-012 — CAD and 999 summaries Original audio/log outstanding",
  "Full 999 audio Not yet served.",
  "Full CAD incident log Not yet served.",
  "EX-MUR-021 — Interview summary Full recording/transcript outstanding",
  "EX-MUR-022 — Custody record summary Full record/CCTV outstanding",
  "Phone summaries are partial. Full phone download and final cell-site report are outstanding.",
].join("\n");

const FAMILY_FURNITURE =
  /\bpossession\b|\bphone(?:-|\s+)?(?:attribution|ownership|extraction)\b|\bcctv\b|\bpre-interview\b/i;
const FRAGMENT =
  /review remains outstanding or incomplete|this point collapses if|strategy point collapses if/i;

function chaseBrief(bundleText: string, extras: { caseTitle: string; clientLabel: string; allegation: string }) {
  return buildDisclosureChaseBrief({
    caseId: "court-ledger-gate",
    caseTitle: extras.caseTitle,
    clientLabel: extras.clientLabel,
    allegation: extras.allegation,
    stage: "trial tomorrow",
    hearingStatus: "Listed",
    hearingDateIso: null,
    bundleHealth: "Review papers",
    positionStatus: "Position not safely recorded yet",
    battleboard: null,
    snapshotMissing: [],
    proceduralOutstanding: [],
    bundleText,
  });
}

function warBrief(bundleText: string, extras: { caseTitle: string; clientLabel: string; allegation: string }) {
  return buildHearingWarRoomBrief({
    caseId: "court-ledger-gate",
    caseTitle: extras.caseTitle,
    clientLabel: extras.clientLabel,
    allegation: extras.allegation,
    stage: "trial tomorrow",
    hearingStatus: "Listed",
    bundleHealth: "Review papers",
    positionStatus: "Provisional",
    battleboard: null,
    hasSavedPosition: false,
    chaseItems: [],
    bundleText,
  });
}

const valeMeta = extractBundleCaseMetadata(VALE_BELL);
const valeCtx = {
  caseTitle: "Drug driving - Vale Bell",
  clientLabel: "Vale Bell",
  allegation: valeMeta.offenceWording ?? "Drug driving",
  bundleText: VALE_BELL,
};
const valeHay = [
  workflowSafeCourtLine(valeCtx) ?? "",
  ...(workflowTopNextActions(valeCtx) ?? []),
  ...(workflowCourtRecordAsks(valeCtx) ?? []),
].join("\n");
const valeWar = warBrief(VALE_BELL, valeCtx);
const valeCourtHay = [
  valeHay,
  valeWar.safePositionToday,
  ...valeWar.sayThis,
  ...valeWar.doNotOverstate,
  ...valeWar.askCourtToRecord,
  ...valeWar.nextHearingMoves,
].join("\n");

// 1. Drug-driving front-sheet does not emit possession/phone/CCTV/pre-interview lines.
assert.doesNotMatch(valeCourtHay, FAMILY_FURNITURE);
const valeHearingChase = buildChaseItemsForHearing({
  bundleText: VALE_BELL,
  snapshotMissing: [],
  battleboard: null,
}).join("\n");
assert.doesNotMatch(valeHearingChase, FAMILY_FURNITURE);

// 2. Court/detail uses proof pressure from labelled PDF, not generic family furniture.
assert.match(valeWar.safePositionToday, /driver identity and toxicology procedure/i);
assert.match(valeWar.safePositionToday, /provisional/i);
assert.match(valeCourtHay, /continuity|solicitor review/i);

// 3. Narrative fragments cannot become chase cards.
assert.equal(lineIsUnsourcedNarrativeChase("review remains outstanding or incomplete."), true);
assert.equal(lineIsUnsourcedNarrativeChase("This point collapses if: strategy point collapses if"), true);
assert.equal(lineIsUnbackedOffenceFamilyFurniture("phone ownership", ""), false);
assert.equal(lineIsUnbackedOffenceFamilyFurniture("phone ownership", VALE_BELL), true);
assert.equal(lineIsUnbackedOffenceFamilyFurniture("CCTV master footage", VALE_BELL), true);
const valeChase = chaseBrief(VALE_BELL, valeCtx);
const valeChaseHay = valeChase.primaryItems
  .map((item) => `${item.label}\n${item.evidenceAnchor ?? ""}\n${item.draftChaseWording}`)
  .join("\n");
assert.doesNotMatch(valeChaseHay, FRAGMENT);

// 4. Real labelled outstanding material still appears.
assert.ok(
  valeChase.primaryItems.some((item) => /driver identity and toxicology/i.test(item.label)),
  "labelled outstanding material remains a chase card",
);
assert.ok(
  valeChase.primaryItems.some((item) => /Outstanding material:/i.test(item.evidenceAnchor ?? "")),
  "labelled outstanding keeps a File/PDF receipt",
);

// 5. Normal bundles like Dunn/Grant/Hale do not regress.
const haleChase = chaseBrief(HALE, {
  caseTitle: "R v Leon Hale",
  clientLabel: "Leon Hale",
  allegation: "Murder, contrary to common law",
});
assert.ok(
  /CCTV|phone|CAD|999|interview|BWV/i.test(
    haleChase.primaryItems.map((item) => item.label).join("\n"),
  ),
  "Hale still surfaces source-backed gaps",
);

const grantChase = chaseBrief(GRANT, {
  caseTitle: "R v Vincent Grant",
  clientLabel: "Vincent Grant",
  allegation: "Possession of a controlled drug of Class A with intent to supply",
});
assert.ok(grantChase.primaryItems.length > 0, "Grant still has chase items");
assert.doesNotMatch(
  grantChase.primaryItems.map((item) => item.label).join("\n"),
  FRAGMENT,
);

const dunnMeta = extractBundleCaseMetadata(DUNN);
assert.match(dunnMeta.defendantName ?? "", /Dunn/i);
assert.match(`${dunnMeta.offenceWording ?? ""} ${dunnMeta.offenceDisplay ?? ""}`, /burgle|conspiracy/i);
const dunnChase = chaseBrief(DUNN, {
  caseTitle: "R v Ellis Dunn",
  clientLabel: "Ellis Dunn",
  allegation: dunnMeta.offenceWording ?? "Conspiracy to burgle",
});
assert.doesNotMatch(dunnChase.primaryItems.map((item) => item.label).join("\n"), FRAGMENT);
assert.doesNotMatch(
  dunnChase.primaryItems.map((item) => item.label).join("\n"),
  /phone-attribution|pre-interview|possession and phone/i,
);

console.log("smoke-pack-court-ledger-gate.test.ts: PASS");
