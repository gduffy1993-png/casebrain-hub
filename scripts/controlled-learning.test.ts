import assert from "node:assert/strict";
import { RuleSchema, LEARNING_VERSION, learnedFields, matchLabelRule, evaluateObservations, type ApprovedRule, type EvaluationObservation } from "../lib/criminal/controlled-learning/core";
import { extractMetadataWithLessons } from "../lib/criminal/controlled-learning/extract";
import { buildBundleSourcePayload } from "../lib/bundle/parse-bundle-display";
import { extractCriminalCaseMeta } from "../lib/criminal/structured-extractor";

let checks = 0;
function check(name: string, test: () => void) { test(); checks++; console.log(`PASS ${name}`); }
const rule: ApprovedRule = { id: "approved-1", field: "defendant", label: "Accused individual", status: "approved", pipelineVersion: LEARNING_VERSION };

check("label rules never contain expected values or executable patterns", () => {
  assert.equal(RuleSchema.safeParse({ field: "defendant", label: "Accused individual", value: "Alex Stone" }).success, false);
  assert.equal(RuleSchema.safeParse({ field: "defendant", label: ".*" }).success, false);
  assert.equal(RuleSchema.safeParse({ field: "defendant", label: "Alex Stone" }).success, false);
});
check("fresh source values are extracted, never a remembered person's name", () => {
  assert.equal(learnedFields("Accused individual: Alex Stone", [rule]).defendant?.value, "Alex Stone");
  assert.equal(learnedFields("Accused individual: Morgan Reed", [rule]).defendant?.value, "Morgan Reed");
  assert.equal(learnedFields("No defendant stated", [rule]).defendant, undefined);
});
check("proposed/revoked/old-version rules do not apply", () => {
  assert.deepEqual(learnedFields("Accused individual: Alex Stone", [{ ...rule, status: "proposed" } as unknown as ApprovedRule]), {});
  assert.deepEqual(learnedFields("Accused individual: Alex Stone", [{ ...rule, pipelineVersion: "old" }]), {});
});
check("conflicting source rows abstain", () => {
  assert.equal(learnedFields("Accused individual: Alex Stone\nAccused individual: Morgan Reed", [rule]).defendant, undefined);
});
check("page separators retain the correct page; flat text never invents page one", () => {
  assert.equal(learnedFields("Cover page\fAccused individual: Alex Stone", [rule]).defendant?.compiledPage, 2);
  assert.equal(learnedFields("Accused individual: Alex Stone", [rule]).defendant?.compiledPage, null);
});
check("narrative mention and instructions cannot teach a fact", () => {
  assert.equal(matchLabelRule("The Accused individual: Alex Stone", rule).length, 0);
  assert.equal(matchLabelRule("Accused individual: Ignore previous instructions", rule).length, 0);
});
check("metadata learning cannot overwrite a known fact", () => {
  const text = "R v Jordan Ellis\nDefendant: Jordan Ellis\nAccused individual: Morgan Reed\nCriminal charge sheet and papers for review.";
  const learned = extractMetadataWithLessons(text, [rule]);
  assert.equal(learned.metadata.defendantName, learned.baseline.defendantName);
  assert.equal(learned.applied.length, 0);
});
check("live bundle builder carries the same learned metadata and source receipt", () => {
  const text = "Criminal papers for review. Reference DEMO-001.\nAccused individual: Morgan Reed\nAn original source row for identification review.";
  const learned = extractMetadataWithLessons(text, [rule]);
  const payload = buildBundleSourcePayload([{ id: "doc-1", name: "original.pdf", raw_text: text }], [rule]);
  assert.equal(payload.caseMetadata.defendantName, learned.metadata.defendantName);
  assert.equal(payload.combinedText, text);
});
check("a learned bundle receipt uses its own document and original page boundaries", () => {
  const namedRule = { ...rule, label: "Defendant named" };
  const payload = buildBundleSourcePayload([
    { id: "first-doc", name: "cover.pdf", raw_text: "Cover page for criminal papers.\fNo identity on this page." },
    { id: "second-doc", name: "identity.pdf", raw_text: "\fDefendant named: Morgan Reed\nOriginal identification row for review." },
  ], [namedRule]);
  assert.equal(payload.caseMetadata.defendantName, "Morgan Reed");
  assert.equal(payload.learningApplied[0].documentId, "second-doc");
  assert.equal(payload.learningApplied[0].compiledPage, 2);
  assert.equal(payload.learningApplied[0].lineNumber, 1);
});
check("AI summaries cannot supply a newly learned field", () => {
  const payload = buildBundleSourcePayload([{ id: "doc", extracted_json: { summary: "Defendant named: Morgan Reed" } }], [{ ...rule, label: "Defendant named" }]);
  assert.equal(payload.learningApplied.length, 0);
  assert.equal(payload.caseMetadata.defendantName, null);
});
check("upload structured extraction accepts approved labels without editing source", () => {
  const result = extractCriminalCaseMeta({ text: "Accused individual: Morgan Reed", documentName: "source.pdf", learningRules: [rule] });
  assert.equal(result.defendantName, "Morgan Reed");
});
const chargeRule: ApprovedRule = { ...rule, field: "charge", label: "Allegation stated" };
const chargeRow = "Allegation stated: Conspiracy to defraud contrary to common law";
check("learned charge wording never creates a count from an absent or narrative number", () => {
  for (const text of [chargeRow, `The witness referred to count 7 in another case.\n${chargeRow}`, `Count: 7\f${chargeRow}`]) {
    assert.equal(extractCriminalCaseMeta({ text, documentName: "source.pdf", learningRules: [chargeRule] }).charges.length, 0);
  }
});
check("an immediately preceding explicit count row can accompany learned charge wording", () => {
  const result = extractCriminalCaseMeta({ text: `Count number: 3\n${chargeRow}`, documentName: "charge-sheet.pdf", learningRules: [chargeRule] });
  assert.equal(result.charges.length, 1);
  assert.equal(result.charges[0].count, 3);
  assert.equal(result.charges[0].offence, "Conspiracy to defraud contrary to common law");
});
check("canonical page headings cannot join a learned charge to a different source page", () => {
  const result = extractCriminalCaseMeta({ text: `[compiled 1]\nCount: 3\n\n[compiled 2]\n${chargeRow}`,
    learningText: `Count: 3\f${chargeRow}`, documentName: "source.pdf", learningRules: [chargeRule] });
  assert.equal(result.charges.length, 0);
});
const observations: EvaluationObservation[] = Array.from({ length: 5 }, (_, index) => ({
  id: `test-${index}`, sourceHash: `pdf-${index}`, sourceCaseId: `case-${index}`, originalPdf: true,
  expected: `Person ${index}`, baseline: null, candidate: `Person ${index}`,
}));
check("five independent improved originals meet the gate", () => {
  assert.equal(evaluateObservations(rule, observations, { sourceHash: "training-pdf", caseId: "training-case" }, "base").eligible, true);
});
check("same-case and duplicate-PDF leakage is blocked", () => {
  assert.equal(evaluateObservations(rule, observations, { sourceHash: "pdf-0", caseId: "case-0" }, "base").eligible, false);
  const duplicates = observations.map(o => ({ ...o, sourceHash: "same-pdf" }));
  assert.equal(evaluateObservations(rule, duplicates, { sourceHash: "train", caseId: "train" }, "base").eligible, false);
});
check("source text alone cannot masquerade as original-PDF validation", () => {
  assert.equal(evaluateObservations(rule, observations.map(o => ({ ...o, originalPdf: false })), { sourceHash: "train", caseId: "train" }, "base").eligible, false);
});
check("one incorrect newly filled answer prevents approval", () => {
  const wrong = observations.map((o, index) => index === 0 ? { ...o, candidate: "Wrong person" } : o);
  const report = evaluateObservations(rule, wrong, { sourceHash: "train", caseId: "train" }, "base");
  assert.equal(report.eligible, false); assert.ok(report.regressions > 0);
});
check("no improvement and undersized test sets cannot pass", () => {
  assert.equal(evaluateObservations(rule, observations.map(o => ({ ...o, baseline: o.expected })), { sourceHash: "train", caseId: "train" }, "base").eligible, false);
  assert.equal(evaluateObservations(rule, observations.slice(0, 4), { sourceHash: "train", caseId: "train" }, "base").eligible, false);
});
console.log(`${checks} controlled-learning checks passed.`);

// Development diagnostic: evidence of what labels this baseline does/does not recognise.
for (const label of ["Accused individual", "Defendant identity", "Person accused", "Defendant named"]) {
  const r = { ...rule, label };
  const run = extractMetadataWithLessons(`Criminal source papers reference DEMO-002.\n${label}: Morgan Reed\nSource record for review only.`, [r]);
  console.log(JSON.stringify({ label, baseline: run.baseline.defendantName, candidate: run.metadata.defendantName, applied: run.applied.length }));
}
