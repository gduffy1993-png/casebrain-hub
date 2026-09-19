/**
 * Shared identity authority and incomplete-charge wrap rules.
 * Run: npx tsx scripts/identity-charge-shared-rules.test.ts
 */
import assert from "node:assert/strict";
import {
  extractBundleCaseMetadata,
  isIncompleteChargeWording,
} from "../lib/criminal/extract-bundle-case-metadata";

function meta(text: string) {
  return extractBundleCaseMetadata(text);
}

assert.equal(isIncompleteChargeWording("possession of a"), true);
assert.equal(isIncompleteChargeWording("Leon Marsh is"), true);
assert.equal(isIncompleteChargeWording("Robbery, contrary to s.8 Theft Act 1968"), false);
assert.equal(
  isIncompleteChargeWording("Possession with intent to supply Class A controlled drugs"),
  false,
);

{
  const aaron = [
    "PROSECUTION CASE PAPERS",
    "R v Aaron Ross",
    "DefendantAaron David RoseDOB09/09/1999",
    "2Charge sheet and initial details2Defendant, offence and hearing",
    "CHARGE SHEET AND INITIAL DETAILS",
    "R v Aaron Ross",
    "DefendantAaron David Ross",
    "Offence",
    "Affray, contrary to section 3 Public Order Act 1986; assault by beating of an emergency worker, contrary to",
    "section 1 Assaults on Emergency Workers (Offences) Act 2018",
    "ParticularsOn 02 June 2026 at Northbridge, used or threatened unlawful violence towards another and assaulted PC",
    "Lewis Hall, an emergency worker acting in the exercise of his functions.",
    "MG5 CASE SUMMARY",
    "Police allege Aaron Ross was involved in a disturbance. Officers say he swung towards Mason Reed.",
  ].join("\n");
  const got = meta(aaron);
  assert.equal(got.defendantName, "Aaron David Ross");
  assert.match(got.offenceDisplay ?? got.offenceWording ?? "", /Affray/i);
  assert.match(got.offenceDisplay ?? got.offenceWording ?? "", /emergency worker/i);
  assert.doesNotMatch(got.defendantName ?? "", /Rose/i);
  assert.doesNotMatch(got.defendantName ?? "", /Mason Reed/i);
  assert.doesNotMatch(got.defendantName ?? "", /Lewis Hall/i);
}

{
  const consistent = [
    "R v Priya Nair",
    "Defendant: Priya Nair",
    "CHARGE SHEET AND INITIAL DETAILS",
    "R v Priya Nair",
    "Defendant: Priya Nair",
    "Charge: Harassment, contrary to section 2 Protection from Harassment Act 1997",
  ].join("\n");
  const got = meta(consistent);
  assert.equal(got.defendantName, "Priya Nair");
  assert.match(got.offenceDisplay ?? got.offenceWording ?? "", /Harassment/i);
}

{
  const witnessOnly = [
    "MG11 WITNESS STATEMENT",
    "Statement of Casey Lane",
    "Witness: Casey Lane",
    "I saw a male leave the shop. No charging decision is recorded in this bundle.",
  ].join("\n");
  const got = meta(witnessOnly);
  assert.equal(got.defendantName, null);
  assert.doesNotMatch(got.defendantName ?? "", /Casey Lane/i);
}

{
  const witnessBesideDefendant = [
    "R v Kian Doyle",
    "DefendantKian Doyle",
    "CHARGE SHEET / indictment extract",
    "Defendant: Kian Doyle.",
    "Co-occupier named in papers: Casey Lane; no charging decision recorded against Casey Lane in this bundle.",
    "Primary allegationPossession with intent to supply Class A controlled drugs",
    "Count 1: On a date in 2026 at a fictional address in Westbridge, Kian Doyle is alleged to have had possession of a",
    "quantity of cocaine, a Class A controlled drug, with intent to supply it to another.",
    "Count 2: Possession of criminal property is noted as under review in the MG5 narrative, but no final count is printed",
    "on this charge sheet extract.",
  ].join("\n");
  const got = meta(witnessBesideDefendant);
  assert.equal(got.defendantName, "Kian Doyle");
  assert.doesNotMatch(got.defendantName ?? "", /Casey Lane/i);
  const charge = got.offenceDisplay ?? got.offenceWording ?? "";
  assert.match(charge, /possession with intent to supply Class A/i);
  assert.doesNotMatch(charge, /possession of a$/i);
  assert.doesNotMatch(charge, /under review/i);
}

{
  const leon = [
    "R v Leon Marsh - Robbery / poor identification",
    "DefendantLeon Marsh",
    "Primary allegationRobbery, Theft Act 1968 s.8",
    "CHARGE SHEET / indictment extract",
    "Defendant: Leon Marsh",
    "Count 1: Robbery. Particulars: on a date in 2026 at a fictional convenience store in Riverford, Leon Marsh is",
    "alleged to have stolen cash and goods and immediately before or at the time of doing so, and in order to do so,",
    "used or threatened force.",
    "The charge sheet does not itself resolve identification.",
  ].join("\n");
  const got = meta(leon);
  assert.equal(got.defendantName, "Leon Marsh");
  const charge = got.offenceDisplay ?? got.offenceWording ?? "";
  assert.match(charge, /Robbery/i);
  assert.match(charge, /s\.?8|Theft Act 1968/i);
  assert.doesNotMatch(charge, /Leon Marsh is$/i);
}

{
  const countOnlyWrapped = [
    "CHARGE SHEET AND INITIAL DETAILS",
    "Defendant: Omar West",
    "Count 1: On a date in 2026 at a fictional address in Westbridge, Omar West is alleged to have had possession of a",
    "quantity of cocaine, a Class A controlled drug, with intent to supply it to another.",
  ].join("\n");
  const got = meta(countOnlyWrapped);
  assert.equal(got.defendantName, "Omar West");
  const charge = `${got.offenceDisplay ?? ""} ${got.offenceWording ?? ""}`;
  assert.match(charge, /quantity of cocaine/i);
  assert.match(charge, /intent to supply/i);
  assert.doesNotMatch(charge, /possession of a$/i);
}

{
  const fragmentOnly = [
    "MG5 CASE SUMMARY",
    "The officer writes that Leon Marsh is",
    "Police arrested a male on the street. No charge sheet is included in this bundle.",
  ].join("\n");
  const got = meta(fragmentOnly);
  assert.equal(got.offenceWording, null);
  assert.doesNotMatch(got.offenceDisplay ?? "", /Leon Marsh is/i);
}

{
  const thin = "This folder contains a covering letter only. Hearing date to be confirmed.";
  const got = meta(thin);
  assert.equal(got.defendantName, null);
  assert.equal(got.offenceWording, null);
}

{
  const conflict = [
    "CHARGE SHEET AND INITIAL DETAILS",
    "R v Jane Doe",
    "Defendant: John Smith",
    "Charge: Theft, contrary to section 1 Theft Act 1968",
  ].join("\n");
  const got = meta(conflict);
  assert.equal(got.defendantName, null);
  assert.match(got.offenceDisplay ?? got.offenceWording ?? "", /Theft/i);
}

{
  const oneLine = [
    "R v Jordan Quinn",
    "Defendant: Jordan Quinn",
    "Statement of Offence: Intimidating a witness, contrary to section 51 of the Criminal Justice and Public Order Act 1994.",
  ].join("\n");
  const got = meta(oneLine);
  assert.equal(got.defendantName, "Jordan Quinn");
  assert.match(got.offenceDisplay ?? got.offenceWording ?? "", /intimidating a witness/i);
}

console.log("identity-charge-shared-rules.test.ts: PASS");
