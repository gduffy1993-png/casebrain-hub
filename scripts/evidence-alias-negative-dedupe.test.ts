/**
 * Negative-dedupe contracts: alias family alone must not collapse distinct
 * evidential units that differ in scope or status.
 * Run: npx tsx scripts/evidence-alias-negative-dedupe.test.ts
 */
import assert from "node:assert/strict";
import {
  dedupeEvidenceAliases,
  evidenceDedupeKey,
  evidenceScopeTags,
  scopesCompatible,
} from "@/lib/criminal/evidence-alias-dedupe";
import { buildSolicitorVisibleEvidenceView } from "@/lib/criminal/solicitor-visible-evidence-view";
import type { FiveAnswersEvidenceRow } from "@/lib/criminal/five-answers/types";

function row(label: string, existence: FiveAnswersEvidenceRow["existence"]): FiveAnswersEvidenceRow {
  return { label, existence, reliability: "needs_review" };
}

function labels(rows: FiveAnswersEvidenceRow[]): string[] {
  return rows.map((r) => r.label);
}

// --- Scope tag contracts ---
assert.ok(evidenceScopeTags("Phone extraction source material").includes("extract_or_summary"));
assert.ok(evidenceScopeTags("Full phone download").includes("full_export_or_download"));
assert.equal(
  scopesCompatible(evidenceScopeTags("Phone extraction source material"), evidenceScopeTags("Full phone download")),
  false,
);

assert.ok(evidenceScopeTags("CCTV still images").includes("stills_or_screenshots"));
assert.ok(evidenceScopeTags("Master CCTV footage").includes("master_or_full_media"));
assert.ok(evidenceScopeTags("Full CCTV export").includes("master_or_full_media") || evidenceScopeTags("Full CCTV export").includes("full_export_or_download"));

assert.ok(evidenceScopeTags("Draft incomplete MG11").includes("draft_or_unsigned"));
assert.ok(evidenceScopeTags("Final signed MG11").includes("final_signed"));
assert.equal(
  scopesCompatible(evidenceScopeTags("Draft incomplete MG11"), evidenceScopeTags("Final signed MG11")),
  false,
);

assert.ok(evidenceScopeTags("BWV transcript referred").includes("transcript_or_log_only"));
assert.ok(
  evidenceScopeTags("Full BWV video export").includes("master_or_full_media") ||
    evidenceScopeTags("Full BWV video export").includes("full_export_or_download"),
);

// --- Codex Blocker A examples: must remain separate ---
{
  const kept = dedupeEvidenceAliases([
    row("Phone extraction source material", "served"),
    row("Full phone download", "missing"),
  ]);
  assert.equal(kept.length, 2, "served extraction vs missing full download must not collapse");
  // Different existence ⇒ different collapse buckets even within phone alias family
  assert.notEqual(
    evidenceDedupeKey(row("Phone extraction source material", "served")),
    evidenceDedupeKey(row("Full phone download", "missing")),
  );
}

{
  const kept = dedupeEvidenceAliases([
    row("CCTV still images", "served"),
    row("Master CCTV footage", "missing"),
    row("Full CCTV export", "referred_only"),
  ]);
  assert.equal(kept.length, 3, "stills / master / full export must stay distinct");
}

{
  const kept = dedupeEvidenceAliases([
    row("Draft incomplete MG11", "not_safely_confirmed"),
    row("Final signed MG11", "missing"),
  ]);
  assert.equal(kept.length, 2, "draft MG11 vs final signed MG11 must not collapse");
}

{
  const kept = dedupeEvidenceAliases([
    row("BWV reference / transcript", "referred_only"),
    row("Full BWV video export", "missing"),
  ]);
  assert.equal(kept.length, 2, "BWV transcript vs full video export must not collapse");
}

// Same family + same scope + same status may still collapse
{
  const kept = dedupeEvidenceAliases([
    row("MG11 complainant statement", "served"),
    row("Witness statement", "served"),
  ]);
  assert.equal(kept.length, 1, "genuine same-scope served duplicates may collapse");
}

// Different existence alone blocks collapse even with same generic scope
{
  const kept = dedupeEvidenceAliases([
    row("Body-worn video", "served"),
    row("BWV", "missing"),
  ]);
  assert.equal(kept.length, 2, "same family different status must not collapse");
}

// Displayed view regenerates counts from corrected items
{
  const view = buildSolicitorVisibleEvidenceView([
    row("Phone extraction source material", "served"),
    row("Full phone download", "missing"),
    row("CCTV still images", "served"),
    row("Master CCTV footage", "missing"),
    row("Full CCTV export", "referred_only"),
    row("Draft incomplete MG11", "not_safely_confirmed"),
    row("Final signed MG11", "missing"),
    row("BWV reference / transcript", "referred_only"),
    row("Full BWV video export", "missing"),
  ]);
  assert.equal(view.displayItems.length, 9, "zero unsafe alias collapses for Codex examples");
  assert.equal(view.counts.served, 2);
  assert.equal(view.counts.missing, 4);
  assert.equal(view.counts.referred, 2);
  assert.equal(view.counts.incomplete, 1);
  assert.ok(labels(view.displayItems as unknown as FiveAnswersEvidenceRow[]).length === 9 || view.displayItems.length === 9);
  assert.match(view.truthMapText, /Phone extraction/i);
  assert.match(view.truthMapText, /Full phone download/i);
  assert.match(view.truthMapText, /CCTV still/i);
  assert.match(view.truthMapText, /Master CCTV/i);
  assert.match(view.truthMapText, /Full CCTV export/i);
  assert.match(view.truthMapText, /Draft incomplete MG11/i);
  assert.match(view.truthMapText, /Final signed MG11/i);
  assert.match(view.truthMapText, /transcript/i);
  assert.match(view.truthMapText, /Full BWV/i);
}

console.log(JSON.stringify({ ok: true, contract: "evidence-alias-negative-dedupe" }, null, 2));
