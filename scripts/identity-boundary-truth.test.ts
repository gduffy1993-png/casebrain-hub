/**
 * A case may not wear another case's identity.
 *
 * Run: npx tsx scripts/identity-boundary-truth.test.ts
 */
import assert from "node:assert/strict";

import {
  demoPackConflictsWithSourceAllegation,
  foreignMatterRefs,
} from "../lib/criminal/case-identity-boundary";

let checks = 0;
function check(name: string, fn: () => void): void {
  fn();
  checks += 1;
}

console.log("another case's clothes stay on that case");

check("Vale robbery is not the Marcus Vale fraud pack", () => {
  assert.equal(
    demoPackConflictsWithSourceAllegation(
      "Robbery, contrary to section 8 Theft Act 1968",
      "Fraud by false representation",
    ),
    true,
  );
});

check("the real Marcus Vale demo still matches its own fraud allegation", () => {
  assert.equal(
    demoPackConflictsWithSourceAllegation(
      "Fraud by false representation, Fraud Act 2006 s.2",
      "Fraud by false representation",
    ),
    false,
  );
  assert.equal(
    demoPackConflictsWithSourceAllegation(
      "Offence wording not safely extracted",
      "Fraud by false representation",
    ),
    false,
  );
});

check("a chase line citing another CB-TB is foreign; the home ref is not", () => {
  const papers = "Matter ref CB-TB-039\nR v Marcus Andrew Vale\nRobbery";
  assert.deepEqual(foreignMatterRefs(papers, "Please serve O1 from CB-TB-1925"), ["CB-TB-1925"]);
  assert.deepEqual(foreignMatterRefs(papers, "O1 Full interview transcript — CB-TB-039"), []);
});

console.log(`identity-boundary-truth: ${checks} checks passed`);
