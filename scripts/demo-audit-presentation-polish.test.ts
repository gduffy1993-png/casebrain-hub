#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { buildH5CaseModels } from "../lib/eval/line-source-proof/build-case-models";
import { buildLineSourceProof } from "../lib/eval/line-source-proof/build-report";
import { renderSolicitorProofPacket } from "../lib/eval/line-source-proof/render-solicitor-proof-packet";
import {
  demoAuditClientSummaryParagraph,
  isDemoAuditCase,
  polishDemoAuditChaseBrief,
} from "../lib/eval/demo-audit-packs/presentation-polish";
import { buildTruthMapRowsFromTruthKey } from "../lib/eval/demo-audit-packs/presentation-polish";
import type { EvidenceStateTruthKey } from "../lib/eval/evidence-state-audit/types";

const ROOT = process.cwd();

function loadCase(caseId: string) {
  const dir = path.join(ROOT, "artifacts/evidence-state-audit-local/cases", caseId);
  const truthKey = JSON.parse(fs.readFileSync(path.join(dir, "truth-key.json"), "utf8")) as EvidenceStateTruthKey;
  const bundleText = fs.readFileSync(path.join(dir, "bundle-text.md"), "utf8");
  return { dir, truthKey, bundleText };
}

assert.ok(isDemoAuditCase("demo-audit-01-phone-harassment"));
assert.ok(!isDemoAuditCase("cb-fresh-001-taylor-brookes"));

const phone = loadCase("demo-audit-01-phone-harassment");
const phoneRows = buildTruthMapRowsFromTruthKey(phone.truthKey);
assert.ok(phoneRows.some((r) => r.existence === "served" && /screenshot/i.test(r.label)));
assert.ok(phoneRows.some((r) => r.existence === "missing" && /full phone download/i.test(r.label)));
assert.ok(!phoneRows.some((r) => /cad|999/i.test(r.label)));

const phoneModels = buildH5CaseModels(phone.dir);
assert.ok(!phoneModels.chase.primaryItems.some((i) => /mg6\s*\/\s*unused|cad|999/i.test(i.label)));
assert.ok(phoneModels.chase.primaryItems.some((i) => /phone download|subscriber/i.test(i.label)));
assert.ok(!phoneModels.warRoom.doNotOverstate.some((l) => /\bbwv\b/i.test(l)));
assert.match(phoneModels.chase.safeCourtLine ?? "", /screenshot|phone download|subscriber/i);

const cctv = loadCase("demo-audit-02-cctv-stills");
const cctvRows = buildTruthMapRowsFromTruthKey(cctv.truthKey);
assert.ok(cctvRows.some((r) => r.existence === "served" && /cctv still/i.test(r.label)));
assert.ok(cctvRows.some((r) => r.existence === "missing" && /master/i.test(r.label)));

const bwv = loadCase("demo-audit-03-bwv-custody");
const bwvModels = buildH5CaseModels(bwv.dir);
assert.ok(bwvModels.chase.primaryItems.some((i) => /bwv/i.test(i.label)));
assert.ok(bwvModels.chase.primaryItems.some((i) => /custody/i.test(i.label)));
assert.ok(!bwvModels.chase.primaryItems.some((i) => /phone|encro|cctv/i.test(i.label)));

const coDef = loadCase("demo-audit-04-co-def-interview");
const coDefRows = buildTruthMapRowsFromTruthKey(coDef.truthKey);
assert.ok(coDefRows.some((r) => /co-defendant/i.test(r.label)));
assert.ok(coDefRows.some((r) => /target defendant interview/i.test(r.label) && r.existence === "missing"));

const encro = loadCase("demo-audit-05-encro-attribution");
const encroModels = buildH5CaseModels(encro.dir);
assert.ok(encroModels.chase.primaryItems.some((i) => /handle attribution|platform/i.test(i.label)));
assert.ok(!encroModels.chase.primaryItems.some((i) => /mg6\s*\/\s*unused/i.test(i.label)));

const WRONG_FAMILY_REFUSED = /do not import (bwv|phone)|cad\/999 timing supports|receipt\/phone records/i;
for (const caseId of [
  "demo-audit-01-phone-harassment",
  "demo-audit-02-cctv-stills",
  "demo-audit-03-bwv-custody",
  "demo-audit-04-co-def-interview",
  "demo-audit-05-encro-attribution",
]) {
  const dir = path.join(ROOT, "artifacts/evidence-state-audit-local/cases", caseId);
  const report = buildLineSourceProof(dir, path.join(ROOT, "artifacts/casebrain-qa/line-source-proof"));
  const packet = renderSolicitorProofPacket(report);
  assert.ok(!WRONG_FAMILY_REFUSED.test(packet), `${caseId} solicitor packet must not show wrong-family refused lines`);
  const truthKey = JSON.parse(fs.readFileSync(path.join(dir, "truth-key.json"), "utf8")) as EvidenceStateTruthKey;
  const clientPara = demoAuditClientSummaryParagraph(truthKey, "Test Client");
  const caseSpecific: Record<string, RegExp> = {
    "demo-audit-01-phone-harassment": /screenshot|full phone download/i,
    "demo-audit-02-cctv-stills": /cctv still|master cctv/i,
    "demo-audit-03-bwv-custody": /custody record extract|body-worn/i,
    "demo-audit-04-co-def-interview": /co-defendant interview|your interview/i,
    "demo-audit-05-encro-attribution": /message extract|handle attribution/i,
  };
  assert.match(clientPara, caseSpecific[caseId]!, `${caseId} client summary case-specific`);
}

const coDefReport = buildLineSourceProof(coDef.dir, path.join(ROOT, "artifacts/casebrain-qa/line-source-proof"));
const coDefPacket = renderSolicitorProofPacket(coDefReport);
assert.match(coDefPacket, /co-defendant interview.*segregat/i);

console.log("demo-audit-presentation-polish.test.ts: PASS");
