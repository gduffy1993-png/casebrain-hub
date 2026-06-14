/**
 * Bundle shape regression — varied criminal bundle layouts.
 * Run: npx tsx scripts/bundle-shape-regression.test.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildCaseSummarySnippet } from "../lib/criminal/build-case-summary-snippet";
import {
  buildMetadataScan,
  extractBundleCaseMetadata,
} from "../lib/criminal/extract-bundle-case-metadata";
import {
  buildBundleTruthLedger,
  guardBattleboardOutput,
} from "../lib/criminal/bundle-truth-ledger";
import { buildStrategyBattleboard } from "../lib/criminal/strategy-battleboard";

const ROOT = path.join(__dirname, "..");

const CORRECTED_INDICTMENT = `
Charge: OLD VERSION
Corrected indictment: Assault occasioning actual bodily harm, section 47 OAPA 1861
Particulars: On a date in 2026 at or near Westbridge Parade, Priya Vale struck Eli Rook.
`.trim();

const metaCorrected = extractBundleCaseMetadata(CORRECTED_INDICTMENT);
assert.match(metaCorrected.offenceDisplay ?? "", /abh|actual bodily harm|section\s*47/i);
assert.doesNotMatch(metaCorrected.offenceDisplay ?? "", /OLD VERSION/i);

const theftPath = path.join(ROOT, "docs/fictional-bundle-theft/FICTIONAL_THEFT_BUNDLE_COPY_PASTE.txt");
const theftMeta = extractBundleCaseMetadata(fs.readFileSync(theftPath, "utf8"));
assert.equal(theftMeta.defendantName, "Ashleigh Merritt");
assert.match(theftMeta.offenceDisplay ?? "", /theft/i);
assert.match(theftMeta.nextHearingRaw ?? "", /14 May 2024/i);

const pikePath = path.join(ROOT, "docs/fictional-bundle-gbh/FICTIONAL_GBH_BUNDLE_COPY_PASTE.txt");
const pikeMeta = extractBundleCaseMetadata(fs.readFileSync(pikePath, "utf8"));
assert.equal(pikeMeta.defendantName, "Jordan Pike");
assert.equal(pikeMeta.complainant, "Casey Webb");
assert.match(pikeMeta.offenceDisplay ?? "", /section\s*20|gbh/i);
assert.doesNotMatch(buildMetadataScan(fs.readFileSync(pikePath, "utf8")), /"offence_label"/);

const pilotShapes: Array<{ file: string; defendant: string; offence: RegExp }> = [
  {
    file: "docs/bundle-fidelity-set/gold/pilot-3/kian-doyle/snapshot.md",
    defendant: "Kian Doyle",
    offence: /possession with intent to supply|class\s*a/i,
  },
  {
    file: "docs/bundle-fidelity-set/gold/pilot-3/leon-marsh/snapshot.md",
    defendant: "Leon Marsh",
    offence: /robbery/i,
  },
  {
    file: "docs/bundle-fidelity-set/gold/pilot-3/marcus-vale/snapshot.md",
    defendant: "Marcus Vale",
    offence: /fraud|false representation/i,
  },
];

for (const shape of pilotShapes) {
  const meta = extractBundleCaseMetadata(fs.readFileSync(path.join(ROOT, shape.file), "utf8"));
  assert.equal(meta.defendantName, shape.defendant, shape.file);
  assert.match(meta.offenceWording ?? meta.offenceDisplay ?? "", shape.offence, shape.file);
}

const summary = buildCaseSummarySnippet({
  clientLabel: "Jordan Pike",
  allegation: "Section 20 unlawful wounding",
  complainant: "Casey Webb",
});
assert.match(summary, /Jordan Pike is accused of Section 20 unlawful wounding against Casey Webb/i);
assert.doesNotMatch(summary, /Statement|swung first/i);

const pattersonPath = path.join(ROOT, "test-documents/crown-court-bundle.md");
const pattersonMeta = extractBundleCaseMetadata(fs.readFileSync(pattersonPath, "utf8"));
assert.equal(pattersonMeta.defendantName, "James Patterson");
assert.match(
  pattersonMeta.offenceDisplay ?? "",
  /wounding with intent.*grievous bodily harm|s\.?\s*18/i,
);
assert.doesNotMatch(pattersonMeta.offenceDisplay ?? "", /GRIEVOUS\.?\s*$/i);
assert.match(pattersonMeta.nextHearingRaw ?? "", /22\/11\/2023|22 Nov 2023/i);
assert.equal(pattersonMeta.court, "Crown Court at Manchester");

const pattersonSummary = buildCaseSummarySnippet({
  clientLabel: "James Patterson",
  allegation: pattersonMeta.offenceDisplay ?? "",
  bundleCombinedText: fs.readFileSync(pattersonPath, "utf8"),
  battleboard: null,
});
assert.doesNotMatch(pattersonSummary, /✅|Appropriate adult not required/i);

const golden0431 = fs.readFileSync(
  path.join(ROOT, "docs/fictional-cases-40/NS-CPS-2026-0431.txt"),
  "utf8",
);
const g431Meta = extractBundleCaseMetadata(golden0431);
assert.match(g431Meta.offenceDisplay ?? "", /theft person \(snatch\)/i);
assert.doesNotMatch(g431Meta.offenceDisplay ?? "", /\(s\)\s*as\s*tag:/i);

const brokenOffenceTag = "Offence(s) as tag: Drug driving (fictional charge drafting for test data).";
const brokenOcrTag = "(s) as tag: Fraud retail refund (fictional charge drafting for test data).";
assert.match(extractBundleCaseMetadata(`=== CHARGE ===\n${brokenOffenceTag}`).offenceDisplay ?? "", /drug driving/i);
assert.match(extractBundleCaseMetadata(`=== CHARGE ===\n${brokenOcrTag}`).offenceDisplay ?? "", /fraud retail refund/i);

const g431Bb = guardBattleboardOutput(
  buildStrategyBattleboard({ case_id: "g431", bundle_text: golden0431, offence_label: g431Meta.offenceDisplay }),
  { ledger: buildBundleTruthLedger({ bundleText: golden0431 }), bundleText: golden0431 },
);
const g431BbText = JSON.stringify(g431Bb);
assert.doesNotMatch(g431BbText, /CAD\/999 timing supports Crown sequence/i);
assert.doesNotMatch(g431BbText, /Primary eval hook/i);

const publicStyleGlue = `
DefendantRyan Thomas HaleDOB14/03/1998
CourtNorthbridge Magistrates CourtHearing16 June 2026 at 10:00
OffenceRobbery, contrary to section 8 Theft Act 1968
Hearing date and time16 June 2026 at 10:00
`.trim();
const psMeta = extractBundleCaseMetadata(publicStyleGlue);
assert.equal(psMeta.defendantName, "Ryan Thomas Hale");
assert.match(psMeta.offenceDisplay ?? "", /robbery/i);
assert.doesNotMatch(psMeta.offenceDisplay ?? "", /^Theft, contrary to s\.1/i);
assert.match(psMeta.nextHearingRaw ?? "", /16 June 2026/i);
assert.match(psMeta.court ?? "", /Northbridge Magistrates/i);

const burglaryNotTheft = `
Charge sheet
Defendant: Vincent Mark Coates
Burglary, contrary to section 9(1)(b) Theft Act 1968
`.trim();
const burgMeta = extractBundleCaseMetadata(burglaryNotTheft);
assert.match(burgMeta.offenceDisplay ?? "", /burglary/i);
assert.doesNotMatch(burgMeta.offenceDisplay ?? "", /^Theft, contrary to s\.1/i);

const v4PublicStyle = `
Matter refDefendantCourt / hearing
CB-TB-001Ryan Thomas HaleCourt: Northbridge Magistrates' Court | Hearing: 16 June
2026 at 10:00
Next hearing16 June 2026 at 10:00
NoteNo alternative current hearing date appears in the served listing notice.
`.trim();
const v4Meta = extractBundleCaseMetadata(v4PublicStyle);
assert.match(v4Meta.nextHearingRaw ?? "", /16 June 2026 at 10:00/i);
assert.doesNotMatch(v4Meta.nextHearingRaw ?? "", /appears in the served listing/i);
assert.match(v4Meta.court ?? "", /Northbridge Magistrates/i);

const v4CrownGlue = `
CourtCrown CourtHearing at PrestonNext hearing04 July 2026at10:30
CourtCrown Court at PrestonCase refCB-TB-031
`.trim();
const v4CrownMeta = extractBundleCaseMetadata(v4CrownGlue);
assert.equal(v4CrownMeta.court, "Crown Court at Preston");
assert.match(v4CrownMeta.nextHearingRaw ?? "", /04 July 2026 at 10:30/i);

const v4Pwits = `
ChargePossession of cocaine with intent to supply,
contrary to section 5(3) Misuse of Drugs Act 1971
`.trim();
const v4PwitsMeta = extractBundleCaseMetadata(v4Pwits);
assert.match(v4PwitsMeta.offenceDisplay ?? "", /intent to supply|cocaine/i);

const correctedS20 = `
Statement of offenceCorrected indictment s20
wounding, contrary to section 20 Offences against the Person Act 1861.
`.trim();
assert.match(extractBundleCaseMetadata(correctedS20).offenceDisplay ?? "", /unlawful wounding|section 20/i);

const mixedCounts = `
Particulars of offenceOn 29 May 2026 at Canal Yard theft is alleged as Theft,
contrary to section 1 Theft Act 1968; possession of a bladed article, contrary to section 139 Criminal Justice Act 1988
`.trim();
assert.match(extractBundleCaseMetadata(mixedCounts).offenceDisplay ?? "", /theft/i);
assert.match(extractBundleCaseMetadata(mixedCounts).offenceDisplay ?? "", /bladed article/i);

const courtHearingMag = `
DefendantExample ClientDOB22/11/1986 CourtHearingHillford Magistrates' Court 08 July 2026 at 10:15
`.trim();
const courtHearingMagMeta = extractBundleCaseMetadata(courtHearingMag);
assert.match(courtHearingMagMeta.court ?? "", /Hillford Magistrates/i);
assert.doesNotMatch(courtHearingMagMeta.court ?? "", /^Court$/i);
assert.match(courtHearingMagMeta.nextHearingRaw ?? "", /08 July 2026/i);

const stageFirstHearingGlue = `
DefendantHannah ShawDOB28/01/1991
Address[redacted address]CourtCrown Court at Manchester
Hearing02 September 2026 at 11:30StageCrown Court first hearing
SummaryThis bundle is listed for a Crown Court first hearing at Crown Court at Manchester.
`.trim();
const stageFirstHearingMeta = extractBundleCaseMetadata(stageFirstHearingGlue);
assert.match(stageFirstHearingMeta.nextHearingRaw ?? "", /02 September 2026 at 11:30/i);
assert.doesNotMatch(stageFirstHearingMeta.nextHearingRaw ?? "", /Court Crown/i);

const courtHearingGluedDate = `
DefendantGrace CoatesDOB20/08/1992 CourtHearingCrown Court at Preston31 July 2026 at 10:30
`.trim();
const courtHearingGluedDateMeta = extractBundleCaseMetadata(courtHearingGluedDate);
assert.match(courtHearingGluedDateMeta.nextHearingRaw ?? "", /31 July 2026 at 10:30/i);
assert.match(courtHearingGluedDateMeta.court ?? "", /Crown Court at Preston/i);

const v5HearingLabel = `
DefendantIsaac Shaw
Court: Crown Court at Manchester
Hearing: 27August 2026 14:00
Stage: IDPC
`.trim();
const v5HearingMeta = extractBundleCaseMetadata(v5HearingLabel);
assert.match(v5HearingMeta.nextHearingRaw ?? "", /27 August 2026 14:00/i);

const v5HearingColon = `
DefendantExample Client
Court: Northchester Crown Court
Hearing: 17 July 2026 10:30
`.trim();
assert.match(extractBundleCaseMetadata(v5HearingColon).nextHearingRaw ?? "", /17 July 2026 10:30/i);

const v5Affray = `
Charge contrary to section 3 Public Order Act 1986
`.trim();
assert.match(extractBundleCaseMetadata(v5Affray).offenceDisplay ?? "", /affray/i);

console.log("bundle-shape-regression.test.ts: ok");
