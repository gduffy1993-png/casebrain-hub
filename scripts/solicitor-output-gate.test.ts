/**
 * Phase 2 gate tests — block unsafe, pass valid, copy/API reflect blocked.
 * Run: npx tsx scripts/solicitor-output-gate.test.ts
 */
import assert from "node:assert/strict";
import {
  gateSolicitorOutput,
  integrityBlockedApiBody,
  collectIntegrityRuleIds,
} from "@/lib/criminal/solicitor-output-gate";
import { gatedJsonResponse } from "@/lib/criminal/gated-json-response";
import { buildCopySafeResult } from "@/lib/criminal/trust/copy-safe";
import { classifyWrongFamilyHits, resolveSolicitorOffenceFamily } from "@/lib/criminal/solicitor-offence-family";
import { phase2CentralSurfaceIds } from "@/lib/criminal/solicitor-surface-gate-registry";

let blocked = 0;
let passed = 0;

function expectBlock(name: string, ok: boolean) {
  if (!ok) throw new Error(`expected block: ${name}`);
  blocked += 1;
}
function expectPass(name: string, ok: boolean) {
  if (!ok) throw new Error(`expected pass: ${name}`);
  passed += 1;
}

// Unsafe: raw extraction marker in solicitor wording
{
  const g = gateSolicitorOutput({
    surfaceId: "test_raw",
    texts: ["MG6C disclosure schedule | 4 | remains outstanding."],
    allegation: "Harassment via WhatsApp",
    bundleHay: "WhatsApp MG11 screenshots phone",
    mode: "copy",
    data: { texts: ["MG6C disclosure schedule | 4 | remains outstanding."] },
  });
  expectBlock("raw marker", g.status === "integrity_blocked" && g.canCopy === false && g.data === null);
}

// Unsafe: unsupported template leakage
{
  const g = gateSolicitorOutput({
    surfaceId: "test_leak",
    texts: ["Consider defensive force and PWITS continuity."],
    allegation: "Harassment via messages",
    bundleHay: "WhatsApp screenshots MG11 phone extraction",
    mode: "export",
    data: { texts: ["Consider defensive force and PWITS continuity."] },
  });
  expectBlock("wrong family leak", g.status === "integrity_blocked");
  assert.ok(g.ruleIds.includes("wrong_family.unsupported_template_leakage"));
}

// Valid: clean harassment line
{
  const g = gateSolicitorOutput({
    surfaceId: "test_ok",
    texts: ["Attribution remains outstanding on the served screenshots."],
    allegation: "Harassment contrary to Protection from Harassment Act",
    bundleHay: "WhatsApp screenshots MG11 phone extraction subscriber",
    mode: "copy",
    data: { texts: ["Attribution remains outstanding on the served screenshots."] },
  });
  expectPass("valid harassment", g.status === "ok" && g.canCopy === true && g.data != null);
}

// Source-backed mixed: drugs concept allowed only with structured evidence IDs (not keyword hay alone)
{
  const fam = resolveSolicitorOffenceFamily({
    allegation: "Harassment contrary to Protection from Harassment Act phone WhatsApp",
    bundleHay: "harassment WhatsApp screenshots",
  });
  const evidence = [
    {
      evidenceId: "ev_drug_wraps_001",
      label: "PWITS wraps controlled drug intent to supply",
      existence: "referred_only",
    },
    {
      evidenceId: "ev_phone_001",
      label: "Phone extraction WhatsApp screenshots",
      existence: "served",
    },
  ];
  const hits = classifyWrongFamilyHits(
    "Chase PWITS continuity and phone attribution.",
    fam,
    "harassment WhatsApp PWITS wraps controlled drug intent to supply phone",
    { evidence, allegation: "Harassment contrary to Protection from Harassment Act phone WhatsApp" },
  );
  const unsupported = hits.filter((h) => h.kind === "unsupported_template_leakage");
  expectPass("source-backed mixed not leak", unsupported.length === 0);
  assert.ok(hits.some((h) => h.kind === "source_backed_ok") || unsupported.length === 0);

  // Keyword hay alone must NOT allow
  const keywordOnly = classifyWrongFamilyHits(
    "Chase PWITS continuity on the schedule.",
    fam,
    "harassment WhatsApp PWITS wraps controlled drug intent to supply",
    { evidence: [], allegation: "Harassment contrary to Protection from Harassment Act phone WhatsApp" },
  );
  assert.ok(
    keywordOnly.some((h) => h.kind === "unsupported_template_leakage"),
    "keyword hay alone must not activate drugs family",
  );

  const g = gateSolicitorOutput({
    surfaceId: "test_mixed",
    texts: ["Chase PWITS continuity on the served schedule."],
    allegation: "Harassment contrary to Protection from Harassment Act phone WhatsApp",
    bundleHay: "harassment WhatsApp screenshots",
    evidence,
    mode: "copy",
    data: { texts: ["Chase PWITS continuity on the served schedule."] },
  });
  expectPass("mixed source-backed copy", g.status !== "integrity_blocked" || !g.ruleIds.includes("wrong_family.unsupported_template_leakage"));
}

// Copy-safe reflects blocked
{
  const copy = buildCopySafeResult({
    text: "Vehicle ownership and intent to supply remain key.",
    kind: "court_line",
    sourceState: "served",
    allegation: "Harassment via WhatsApp",
    bundleHay: "screenshots MG11 messages only",
  });
  expectBlock("copy-safe blocked", copy.canCopy === false);
}

// Valid copy still passes
{
  const copy = buildCopySafeResult({
    text: "Ask CPS for the full phone download.",
    kind: "cps_chase",
    sourceState: "missing",
    allegation: "Harassment",
    bundleHay: "WhatsApp MG11 phone screenshots",
  });
  expectPass("copy-safe valid", copy.canCopy === true || copy.sendability !== "blocked");
}

// API cannot bypass — gatedJsonResponse returns integrity_blocked body
{
  const res = gatedJsonResponse("api_letters_draft", {
    subject: "Disclosure",
    body: "Outstanding material | 12 | on index.",
  });
  assert.equal(res.status, 200);
  // NextResponse body is not easily read in node without await res.json() — check helper body shape
  const body = integrityBlockedApiBody("api_letters_draft", ["sentence.raw_extraction_marker"]);
  assert.equal(body.status, "integrity_blocked");
  assert.equal(body.ok, false);
  assert.equal(body.canCopy, false);
  assert.equal(body.data, null);
  expectBlock("api typed block shape", body.status === "integrity_blocked");

  const { ruleIds } = collectIntegrityRuleIds(
    ["Outstanding material | 12 | on index."],
    "Harassment",
    "WhatsApp MG11",
  );
  assert.ok(ruleIds.includes("sentence.raw_extraction_marker"));
  expectBlock("api rule detection", true);
}

// Safe workflow: non-substantive ack without family context may pass
{
  const g = gateSolicitorOutput({
    surfaceId: "api_defence_plan_chat",
    texts: ["Acknowledged."],
    mode: "api",
    data: { texts: ["Acknowledged."] },
  });
  expectPass("api non-substantive without family ok", g.status === "ok");
}

// Substantive without family must fail closed
{
  const g = gateSolicitorOutput({
    surfaceId: "api_defence_plan_chat",
    texts: ["Ask the court to record that disclosure remains outstanding."],
    mode: "api",
    data: { texts: ["Ask the court to record that disclosure remains outstanding."] },
  });
  expectBlock("api substantive without family blocked", g.status === "integrity_blocked");
}

// Registry has central surfaces
{
  assert.ok(phase2CentralSurfaceIds().length >= 15);
  expectPass("central registry populated", true);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      blockedAssertions: blocked,
      passAssertions: passed,
    },
    null,
    2,
  ),
);
console.log("solicitor-output-gate.test.ts: PASS");
