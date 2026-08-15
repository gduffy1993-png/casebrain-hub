/**
 * Live Battleboard guards + gauntlet header extraction regression.
 * Run: npx tsx scripts/live-battleboard-gauntlet-header.test.ts
 */
import assert from "node:assert/strict";
import { buildCaseSummarySnippet } from "../lib/criminal/build-case-summary-snippet";
import {
  extractBundleCaseMetadata,
  isGluedHearingCourtOffenceLabel,
  repairGluedOffenceLabel,
  sanitizeComplainantName,
} from "../lib/criminal/extract-bundle-case-metadata";
import {
  buildBundleTruthLedger,
  guardBattleboardOutput,
  guardSolicitorLine,
} from "../lib/criminal/bundle-truth-ledger";
import {
  resolveCaseHeaderMetadata,
  sanitizeHeaderAllegation,
  sanitizeHeaderClient,
} from "../lib/criminal/resolve-case-header-metadata";
import type { BattleboardOutput, BattleboardRoute } from "../lib/criminal/strategy-battleboard";

const GAUNTLET_GLUE_OFFENCE =
  "2026 at 12:00 at Northshire Crown Court. Allegation: section 20 unlawful wounding against swung first. MG.";

const GAUNTLET_BUNDLE = `
Defendant: Owen Flint
Court: Northshire Crown Court
Next hearing: 17 June 2026 at 12:00 for PTPH

Allegation: section 20 unlawful wounding

MG5 case summary
Complainant swung first during struggle at canal steps. Bottle injury alleged.

MG11 WITNESS STATEMENT - Complainant - Ben Cray — draft unsigned — not final
MG6C/001 — Canal Store exterior CCTV not served — May show first movement and whether complainant
MG6C/002 — Full medical report absent — Injury severity and causation incomplete.

SCANNED CONTINUATION - PAGE NOTE 1
This page contains administrative continuation text, exhibit handling notes, and continuation only.
`.trim();

assert.ok(isGluedHearingCourtOffenceLabel(GAUNTLET_GLUE_OFFENCE));
const repaired = repairGluedOffenceLabel(GAUNTLET_GLUE_OFFENCE);
assert.match(repaired ?? "", /section\s*20\s+unlawful\s+wounding/i);
assert.doesNotMatch(repaired ?? "", /Northshire Crown Court|2026 at 12:00/i);

assert.equal(sanitizeHeaderClient("Owen Flint."), "Owen Flint");
assert.match(sanitizeHeaderAllegation(GAUNTLET_GLUE_OFFENCE), /section\s*20\s+unlawful\s+wounding/i);

const NARRATIVE_SOUP_OFFENCE =
  "contrary to section 47 of the Offences Against the Person Act 1861. He had pleaded guilty before HHJ Smith at Northshire Crown Court on 12 January 2026.";
assert.ok(isGluedHearingCourtOffenceLabel(NARRATIVE_SOUP_OFFENCE));
assert.match(
  sanitizeHeaderAllegation(NARRATIVE_SOUP_OFFENCE),
  /assault occasioning actual bodily harm|s\.?\s*47/i,
);
assert.doesNotMatch(sanitizeHeaderAllegation(NARRATIVE_SOUP_OFFENCE), /pleaded guilty|HHJ Smith/i);

const ORPHAN_STATUTORY_TAIL = "contrary to section 1(1) of the Offences Against the Person Act 1861.";
assert.ok(isGluedHearingCourtOffenceLabel(ORPHAN_STATUTORY_TAIL));
assert.match(sanitizeHeaderAllegation(ORPHAN_STATUTORY_TAIL), /not safely extracted/i);

const OFFENSIVE_WEAPON_SOUP =
  "contrary to section 1(1) of the Prevention of Crime Act 1953. He had pleaded guilty to that offence at an earlier hearing.";
assert.ok(isGluedHearingCourtOffenceLabel(OFFENSIVE_WEAPON_SOUP));
assert.match(sanitizeHeaderAllegation(OFFENSIVE_WEAPON_SOUP), /offensive weapon/i);
assert.doesNotMatch(sanitizeHeaderAllegation(OFFENSIVE_WEAPON_SOUP), /pleaded guilty/i);

const APPEAL_SNIPPET = `
REX
V
MARTIN ADAMS
ON APPEAL FROM THE CROWN COURT AT PORTSMOUTH
HHJ Ashworth
LORD JUSTICE WARBY
sentenced for having an offensive weapon,
contrary to section 1(1) of the Prevention of Crime Act 1953.
`.trim();
const appealMeta = extractBundleCaseMetadata(APPEAL_SNIPPET);
assert.equal(appealMeta.defendantName, "Martin Adams");
assert.match(appealMeta.offenceDisplay ?? "", /offensive weapon/i);
assert.match(appealMeta.court ?? "", /Portsmouth/i);
assert.doesNotMatch(appealMeta.court ?? "", /HHJ|LORD JUSTICE/i);

const ROBBERY_SNIPPET = `
Defendant(s): Arden Vale
Offence: Robbery
Exact allegation wording: On 02/06/2026 at Station Lane, Arden Vale is alleged to have stolen a phone.
`.trim();
const robberyMeta = extractBundleCaseMetadata(ROBBERY_SNIPPET);
assert.equal(robberyMeta.defendantName, "Arden Vale");
assert.match(robberyMeta.offenceDisplay ?? "", /^Robbery$/i);
assert.equal(robberyMeta.nextHearingRaw, null);

const ABH_SNIPPET = `
- Defendant name: Emery Beck
- Defendant DOB: 14/05/1997
- Court/stage: Northlake Magistrates Court / police station pre-charge
- Next hearing/review date: 24/06/2026
- Offence type: ABH s.47
`.trim();
const abhMeta = extractBundleCaseMetadata(ABH_SNIPPET);
assert.equal(abhMeta.defendantName, "Emery Beck");
assert.match(abhMeta.offenceDisplay ?? "", /ABH,\s*s\.?\s*47/i);
assert.match(abhMeta.nextHearingRaw ?? "", /24\/06\/2026/);
assert.doesNotMatch(abhMeta.nextHearingRaw ?? "", /14\/05\/1997/);

const meta = extractBundleCaseMetadata(GAUNTLET_BUNDLE);
const header = resolveCaseHeaderMetadata({ snapshot: null, bundleText: GAUNTLET_BUNDLE });
assert.equal(sanitizeHeaderClient(header.clientLabel), "Owen Flint");
assert.match(sanitizeHeaderAllegation(header.allegation), /section\s*20\s+unlawful\s+wounding/i);
assert.doesNotMatch(sanitizeHeaderAllegation(header.allegation), /2026 at 12:00|Northshire Crown Court/i);
assert.match(header.nextHearing, /12:00/);
assert.match(header.court ?? "", /Northshire Crown Court/i);

const summary = buildCaseSummarySnippet({
  clientLabel: "Owen Flint.",
  allegation: GAUNTLET_GLUE_OFFENCE,
  bundleCombinedText: GAUNTLET_BUNDLE,
});
assert.match(summary, /Owen Flint is accused of section 20 unlawful wounding/i);
assert.doesNotMatch(summary, /2026 at 12:00|against swung first|\. MG\./i);

const summaryWithFalseComplainant = buildCaseSummarySnippet({
  clientLabel: "Owen Flint",
  allegation: "Section 20 unlawful wounding",
  complainant: "swung first. MG.",
  bundleCombinedText: GAUNTLET_BUNDLE,
});
assert.match(summaryWithFalseComplainant, /Owen Flint is accused of Section 20 unlawful wounding/i);
assert.doesNotMatch(summaryWithFalseComplainant, /against swung first|\. MG\./i);

assert.equal(meta.complainant, "Ben Cray");

assert.equal(sanitizeComplainantName("Ben Cray Statement"), "Ben Cray");
assert.equal(sanitizeComplainantName("Ben Cray Witness Statement"), "Ben Cray");
assert.equal(sanitizeComplainantName("Ben Cray Draft Unsigned"), "Ben Cray");
assert.equal(sanitizeComplainantName("John Statement"), "John Statement");

const summaryWithStatementTail = buildCaseSummarySnippet({
  clientLabel: "Owen Flint",
  allegation: "Section 20 unlawful wounding",
  complainant: "Ben Cray Statement",
  bundleCombinedText: GAUNTLET_BUNDLE,
});
assert.match(
  summaryWithStatementTail,
  /Owen Flint is accused of Section 20 unlawful wounding against Ben Cray\./i,
);
assert.doesNotMatch(summaryWithStatementTail, /against Ben Cray Statement/i);

const ledger = buildBundleTruthLedger({ bundleText: GAUNTLET_BUNDLE });
const mockRoute: BattleboardRoute = {
  id: "backup-continuity",
  title: "Continuity / provenance pressure",
  status: "viable",
  route_type: "continuity",
  why_it_helps: [
    "MG11 is consistent and served.",
    "SCANNED CONTINUATION - PAGE NOTE 1",
    "This page contains administrative continuation text, exhibit handling notes.",
    "MG6C/002 — Full medical report absent — Injury severity and causation incomplete.",
  ],
  what_hurts_us: [],
  evidence_anchors: ["MG6C/001Canal Store exterior CCTV not servedMay show first movement"],
  collapse_risks: ["MG11 is consistent and served."],
  next_moves: [],
  hearing_line: "Causation/injury level is conditional on served medical material.",
  safety_note: "Provisional only.",
};

const mockBattleboard: BattleboardOutput = {
  case_id: "gauntlet-test",
  generated_at: "2026-06-12T00:00:00.000Z",
  overall_status: "usable",
  solicitor_safe_summary: "Defence position not safely recorded.",
  primary_route: mockRoute,
  routes: [mockRoute],
  global_collapse_risks: ["MG11 is consistent and served.", "Full CCTV confirms Crown timing."],
  urgent_next_moves: ["Chase CCTV full window"],
};

const guarded = guardBattleboardOutput(mockBattleboard, { ledger, bundleText: GAUNTLET_BUNDLE });
const whyHelps = guarded.primary_route?.why_it_helps ?? [];
assert.ok(!whyHelps.some((l) => /mg11 is consistent and served/i.test(l)));
assert.ok(!whyHelps.some((l) => /scanned continuation/i.test(l)));
assert.ok(!whyHelps.some((l) => /administrative continuation/i.test(l)));
assert.ok(whyHelps.some((l) => /MG6C\/002/i.test(l)));
assert.ok(!guarded.global_collapse_risks.some((l) => /mg11 is consistent and served/i.test(l)));
assert.ok(!guarded.global_collapse_risks.some((l) => /full cctv confirms/i.test(l)));

const anchored = guarded.primary_route?.evidence_anchors?.[0] ?? "";
assert.doesNotMatch(anchored, /not servedMay/);

assert.equal(guardSolicitorLine("MG11 is consistent and served.", { ledger, bundleText: GAUNTLET_BUNDLE }), null);

console.log("live-battleboard-gauntlet-header.test.ts: ok");
