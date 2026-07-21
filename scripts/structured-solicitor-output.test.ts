/**
 * Phase 5 — structured composer tests + stock migration dispositions.
 * Run: npx tsx scripts/structured-solicitor-output.test.ts
 */
import assert from "node:assert/strict";
import {
  STRUCTURED_SOLICITOR_OUTPUT_VERSION,
  composeStructuredSolicitorOutput,
  migrateLegacySolicitorString,
  assessStructuredField,
} from "@/lib/criminal/structured-solicitor-output";
import { assessSolicitorSentence } from "@/lib/criminal/solicitor-sentence-composer";
import { classifyWrongFamilyHits, resolveSolicitorOffenceFamily } from "@/lib/criminal/solicitor-offence-family";

assert.equal(STRUCTURED_SOLICITOR_OUTPUT_VERSION, "1.0.0");

// Court line from structured fields — no pipe join
{
  const r = composeStructuredSolicitorOutput({
    subject: "Phone extraction source material",
    evidenceState: "missing",
    sourceEvidenceId: "ev_phone_001",
    kind: "court_line",
  });
  assert.equal(r.ok, true);
  assert.ok(r.text && /asks the court to record/i.test(r.text));
  assert.ok(!/\|\s*\d+\s*\|/.test(r.text!));
  assert.equal(r.disposition, "reconstructed");
}

// Never complete speculative quotation
{
  const r = composeStructuredSolicitorOutput({
    subject: "MG11 statement",
    sourceQuotation: '"the complainant said',
    kind: "client_summary",
  });
  assert.equal(r.output?.sourceQuotation, null);
  assert.ok(r.rejections.some((x) => x.code === "field.speculative_quotation"));
}

// Legitimate abbreviation not truncated
{
  const a = assessSolicitorSentence("Chase disclosure from the CPS");
  assert.equal(a.ok, true, `CPS ending should not truncate: ${a.issues}`);
  const b = assessStructuredField("Confirm MG11", "subject");
  assert.equal(b.ok, true);
}

// Raw marker legacy → reconstruct or omit (not "hidden")
{
  const raw = migrateLegacySolicitorString("Phone download | 4 | outstanding", {
    kind: "cps_chase",
    evidenceState: "missing",
  });
  assert.ok(raw.disposition === "reconstructed" || raw.disposition === "safely_omitted" || raw.disposition === "still_blocked");
  if (raw.disposition === "reconstructed") {
    assert.ok(raw.text && !/\|\s*\d+\s*\|/.test(raw.text));
  }
  // Must not claim repaired by silence
  assert.ok(raw.disposition !== undefined);
}

// Truncated legacy
{
  const trunc = migrateLegacySolicitorString("Chase the and", {
    kind: "cps_chase",
  });
  assert.ok(
    trunc.disposition === "safely_omitted" || trunc.disposition === "still_blocked",
    `truncated must omit or stay blocked, got ${trunc.disposition}`,
  );
  assert.equal(trunc.ok, false);
}

// Provenance: ID alone insufficient
{
  const fam = resolveSolicitorOffenceFamily({
    allegation: "Harassment contrary to Protection from Harassment Act phone WhatsApp",
  });
  const hits = classifyWrongFamilyHits(
    "Chase PWITS continuity on the schedule.",
    fam,
    "harassment",
    {
      evidence: [{ evidenceId: "ev_empty_shell", label: "item 1" }],
      allegation: "Harassment contrary to Protection from Harassment Act phone WhatsApp",
    },
  );
  assert.ok(hits.some((h) => h.kind === "unsupported_template_leakage"));
}

console.log(
  JSON.stringify(
    {
      ok: true,
      schemaVersion: STRUCTURED_SOLICITOR_OUTPUT_VERSION,
      assertions: 6,
    },
    null,
    2,
  ),
);
console.log("structured-solicitor-output.test.ts: PASS");
