/**
 * Unit checks for client-summary compose + solicitor copy quality.
 * Run: npx tsx scripts/client-summary-compose-quality.test.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  clientSummaryMatchesSemanticUnits,
  composeCompleteClientSummaryFromStructured,
  parseClientSummarySemanticUnits,
} from "@/lib/criminal/client-safe-summary-compose";
import { sanitizeSolicitorProse } from "@/lib/criminal/solicitor-visible-sanitization";
import {
  preserveProtectedAcronyms,
  scanSolicitorVisibleCopyQuality,
  sentenceCasePreservingAcronyms,
} from "@/lib/criminal/solicitor-visible-quality";
import { humanizeChaseFragmentLabel } from "@/lib/criminal/disclosure-chase-finalize";
import { finalizeSolicitorVisibleProse } from "@/lib/criminal/solicitor-visible-boundary";

const ROOT = path.resolve(__dirname, "..");
const structuredPath = path.join(
  ROOT,
  "artifacts/casebrain-qa/demo-audit-thirty/demo-audit-21-historic-sexual-abe/client-summary.json",
);
const structured = JSON.parse(fs.readFileSync(structuredPath, "utf8")) as { text: string };
const composed = composeCompleteClientSummaryFromStructured(structured.text);
assert.equal(composed.ok, true);
if (!composed.ok) throw new Error("compose failed");
assert.ok(composed.text.includes("ABE"));
assert.ok(/Not for court or CPS use\.\]\s*$/.test(composed.text.trim()));
assert.equal(finalizeSolicitorVisibleProse(composed.text).ok, true);
const units = parseClientSummarySemanticUnits(composed.text);
assert.ok(units);
assert.equal(clientSummaryMatchesSemanticUnits(composed.text, units!).pass, true);

// Historic 600-cap must not match semantic units / boundary
const HISTORIC_600 = `${composed.text.split("\n\n[CaseBrain")[0]}\n\n[CaseBrain — client-safe summary. Evidence state: provisional. Not for court or CPS us`;
assert.equal(HISTORIC_600.length, 600);
assert.equal(finalizeSolicitorVisibleProse(HISTORIC_600).ok, false);
assert.equal(clientSummaryMatchesSemanticUnits(HISTORIC_600, units!).pass, false);

// Further-papers wording
const further = sanitizeSolicitorProse(
  "Further papers on the file appears outstanding on the current file — solicitor to confirm relevance before fixing hearing position. — still chase if disclosure-relevant.",
);
assert.match(further, /Further papers appear to be outstanding/);
assert.doesNotMatch(further, /still chase/);
assert.equal(scanSolicitorVisibleCopyQuality(further).length, 0);

// BWV humanisation
const bwv = humanizeChaseFragmentLabel("BWV / footage | not served | log only; clip outstanding");
assert.equal(
  bwv,
  "BWV/footage is not served. Only a log entry is available; the clip remains outstanding.",
);
assert.equal(scanSolicitorVisibleCopyQuality(sanitizeSolicitorProse(bwv)).length, 0);

// Youth doubled space
const youth = sanitizeSolicitorProse(
  "We are reviewing the papers in your case (Kian Doyle (youth — 17 years)).",
);
assert.doesNotMatch(youth, /  \(/);
assert.match(youth, /for Kian Doyle \(youth — 17 years\)/);

// SFR / ANPR casing
assert.equal(sentenceCasePreservingAcronyms("SFR drugs analysis"), "SFR drugs analysis");
assert.equal(preserveProtectedAcronyms("please provide anpr image export"), "please provide ANPR image export");
assert.ok(scanSolicitorVisibleCopyQuality("Please provide sfr drugs analysis.").includes("protected_acronym_casing"));
assert.equal(scanSolicitorVisibleCopyQuality("Please provide SFR drugs analysis.").length, 0);

console.log("client-summary-compose-quality.test.ts: PASS");
