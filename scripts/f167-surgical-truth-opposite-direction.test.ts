process.env.NEXT_PUBLIC_CRIMINAL_PILOT_MODE = "true";

/**
 * Opposite-direction + Arden-shape surgical truth contracts for F167.
 * Run: npx tsx scripts/f167-surgical-truth-opposite-direction.test.ts
 */
import assert from "node:assert/strict";

import { humanizeEvidenceLabel } from "../components/criminal/five-answers/evidence-display";
import { familySupport } from "../lib/criminal/chase-source-gate";
import { isDigitalHarassmentBundleHay, polishPresentationLine } from "../lib/criminal/demo-presentation-polish";
import {
  workflowDisclosureChaseLabels,
  workflowSafeCourtLine,
  workflowTopNextActions,
} from "../lib/criminal/pilot-workflow";

const ARDEN_CTX = {
  caseTitle: "Arden Vale — Robbery",
  allegation: "Robbery — poor identification",
  routeTitle: "Identification / participation / attribution pressure",
};

const ARDEN_SNIPPET = `
Defendant(s): Arden Vale
Offence: Robbery
Exact allegation wording: On 02/06/2026 at Station Lane, Arden Vale is alleged to have stolen a
phone from Marlow Reed and immediately before doing so used force.
MG6 / DISCLOSURE POSITION
Served according to MG6 extract: MG5 extract, MG6 extract, partial CCTV stills, one MG11 extract, custody/interview summary.
Outstanding / incomplete: full bundle pages 88-94 and 201-206, full CCTV master, continuity statement, complete signed MG11.
INTERVIEW / CLIENT ACCOUNT
No comment after limited disclosure. Defence later records that identification and force are disputed.
`.trim();

// --- A: CAD mention must not invent 999 audio / court CAD clause ---
{
  const court = workflowSafeCourtLine({
    ...ARDEN_CTX,
    bundleText: ARDEN_SNIPPET,
  });
  assert.ok(court);
  assert.doesNotMatch(court!, /999|CAD/i, "Arden robbery court line must not invent 999/CAD");
  assert.match(court!, /CCTV/i);

  const withCad = workflowSafeCourtLine({
    ...ARDEN_CTX,
    bundleText: `${ARDEN_SNIPPET}\nCAD log and 999 audio outstanding for timing.`,
  });
  assert.match(withCad!, /999\/CAD/i, "opposite: explicit CAD/999 must remain in court line");
}

// --- B: stolen phone property must not become phone download ---
{
  const polished = polishPresentationLine("MG6 / unused schedule clarification", ARDEN_SNIPPET);
  assert.doesNotMatch(
    polished,
    /phone download|source export/i,
    "robbery stolen-phone hay must not rewrite MG6 into phone download",
  );

  const harassmentHay =
    "Harassment screenshots served. Full phone download / source export outstanding. Subscriber data missing.";
  const digitalPolished = polishPresentationLine("MG6 / unused schedule clarification", harassmentHay);
  assert.match(
    digitalPolished,
    /phone download|source export/i,
    "opposite: true digital-disclosure hay may still rewrite MG6 umbrella",
  );

  assert.equal(familySupport("phone", ARDEN_SNIPPET), "absent");
  assert.equal(
    familySupport("phone", "Full phone download / source export outstanding on MG6."),
    "mentioned",
  );
}

// --- C: interview summary ≠ recording/transcript chase promotion ---
{
  assert.equal(
    humanizeEvidenceLabel("custody/interview summary", "missing"),
    "Interview summary outstanding",
  );
  assert.equal(
    humanizeEvidenceLabel("Interview recording / transcript", "missing"),
    "Interview recording outstanding",
  );
  assert.equal(familySupport("interview", ARDEN_SNIPPET), "absent");
  assert.equal(
    familySupport("interview", "Interview recording outstanding. Transcript not served."),
    "mentioned",
  );
}

// --- D: export log gated separately from CCTV master/continuity ---
{
  const actions = workflowTopNextActions({
    ...ARDEN_CTX,
    bundleText: ARDEN_SNIPPET,
  })!;
  assert.ok(actions.some((a) => /CCTV master/i.test(a)));
  assert.ok(!actions.some((a) => /export log/i.test(a)), "Arden has no export log — do not chase it");

  const actionsWithExport = workflowTopNextActions({
    ...ARDEN_CTX,
    bundleText: `${ARDEN_SNIPPET}\nCCTV export log outstanding.`,
  })!;
  assert.ok(
    actionsWithExport.some((a) => /export log/i.test(a)),
    "opposite: explicit export log must remain chaseable",
  );
}

// --- E: unused/MG6C gate ---
{
  assert.equal(familySupport("mg6_unused", ARDEN_SNIPPET), "absent");
  assert.equal(
    familySupport("mg6_unused", "MG6C unused schedule incomplete. Unused material pending."),
    "mentioned",
  );

  const labels = workflowDisclosureChaseLabels({
    ...ARDEN_CTX,
    bundleText: ARDEN_SNIPPET,
  })!;
  assert.ok(labels.some((l) => /CCTV master/i.test(l)));
  assert.ok(!labels.some((l) => /999|CAD/i.test(l)));
  assert.ok(!labels.some((l) => /export log/i.test(l)));
}

assert.ok(
  isDigitalHarassmentBundleHay(
    "Screenshots and WhatsApp message pack served. Phone extraction outstanding.",
    "Harassment",
  ),
);

console.log("f167-surgical-truth-opposite-direction: PASS");
