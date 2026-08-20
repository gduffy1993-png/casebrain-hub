process.env.NEXT_PUBLIC_CRIMINAL_PILOT_MODE = "true";

/**
 * Opposite-direction + Arden-shape surgical truth contracts for F167.
 * Run: npx tsx scripts/f167-surgical-truth-opposite-direction.test.ts
 */
import assert from "node:assert/strict";

import { humanizeEvidenceLabel } from "../components/criminal/five-answers/evidence-display";
import { reconcileCad999ModalityItems } from "../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { familySupport } from "../lib/criminal/chase-source-gate";
import {
  displayChaseCardLabel,
  isDigitalHarassmentBundleHay,
  polishPresentationLine,
} from "../lib/criminal/demo-presentation-polish";
import { generateExplanationFidelity } from "../lib/eval/casebrain-auditor/explanation-fidelity-generate";
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

// --- F: readiness/explanation WHY must not glue export log onto CCTV master alone ---
{
  const sections = generateExplanationFidelity(ARDEN_SNIPPET);
  const missing = sections.find((s) => s.key === "missing-material");
  const issues = (missing?.blocks ?? []).map((b) => b.issue).join("\n");
  assert.match(issues, /CCTV.*stills served.*master/i, "Arden stills-vs-master must remain visible");
  assert.doesNotMatch(issues, /export\s+log/i, "Arden PDF has no export log — do not promote in WHY");

  const withExport = generateExplanationFidelity(`${ARDEN_SNIPPET}\nCCTV export log outstanding.`);
  const withExportIssues = (withExport.find((s) => s.key === "missing-material")?.blocks ?? [])
    .map((b) => b.issue)
    .join("\n");
  assert.match(
    withExportIssues,
    /export\s+log/i,
    "opposite: source-established export log must still surface in readiness WHY",
  );
}

// --- G: Trap invent-advisory CCTV must not promote master; Arden stills/master must ---
{
  const TRAP_SNIPPET = `
MG6 Served: MG5 case summary, MG6 disclosure note, Officer statement.
Outstanding/not provided: interview record, continuity / provenance note if relied upon.
No PACE interview transcript or summary is provided.
The case should not be strengthened by assuming missing CCTV, statements, codes, or forensic evidence.
`.trim();

  assert.equal(
    familySupport("cctv", TRAP_SNIPPET),
    "absent",
    "Trap invent-advisory CCTV is not an established exhibit",
  );
  assert.equal(familySupport("cctv", ARDEN_SNIPPET), "mentioned", "Arden stills/master establish CCTV");

  const trapLabels = workflowDisclosureChaseLabels({
    caseTitle: "Leo Greene — Assault by beating",
    allegation: "Assault by beating",
    routeTitle: "Violence / complainant account pressure",
    bundleText: TRAP_SNIPPET,
  });
  // Violence profile may be null labels or non-CCTV; never invent CCTV master from Trap.
  if (trapLabels) {
    assert.ok(
      !trapLabels.some((l) => /CCTV master|full window|CCTV continuity/i.test(l)),
      "Trap must not invent CCTV master/continuity chase",
    );
  }

  const ardenLabels = workflowDisclosureChaseLabels({
    ...ARDEN_CTX,
    bundleText: ARDEN_SNIPPET,
  })!;
  assert.ok(ardenLabels.some((l) => /CCTV master/i.test(l)), "Arden CCTV master chase preserved");

  const trapActions = workflowTopNextActions({
    caseTitle: "Leo Greene — Assault by beating",
    allegation: "Assault by beating",
    routeTitle: "Violence / complainant account pressure",
    bundleText: TRAP_SNIPPET,
  });
  if (trapActions) {
    assert.ok(
      !trapActions.some((a) => /CCTV master|export log/i.test(a)),
      "Trap must not invent CCTV master/export-log next actions",
    );
  }
}

// --- H: CAD extract Present must not chase as missing; 999 audio opposite must ---
{
  const grantLike = reconcileCad999ModalityItems(
    [
      {
        id: "chase-family-cad_999",
        familyId: "cad_999",
        label: "CAD / 999 audio / control-room material",
        whyItMatters: "test",
        source: "Police control room",
        baseStatus: "Outstanding",
        urgency: "high",
        deadlineLabel: "test",
        evidenceAnchor: "8CAD / 999 extractPresent",
        linkedRoute: null,
        draftChaseWording: "Please provide CAD / 999 audio / control-room material",
        courtLine: "CAD outstanding",
        mergedFrom: [
          "CAD / 999 audio / control-room material",
          "8CAD / 999 extractPresent",
          "CAD / 999 EXTRACT",
        ],
      },
    ],
    "8 CAD / 999 extract Present\nMG6 disclosure schedule Present",
  );
  assert.equal(grantLike.length, 0, "Grant: CAD extract Present must not remain outstanding chase");

  const dunnLike = reconcileCad999ModalityItems(
    [
      {
        id: "chase-family-cad_999",
        familyId: "cad_999",
        label: "CAD / 999 audio / control-room material",
        whyItMatters: "test",
        source: "Police control room",
        baseStatus: "Outstanding",
        urgency: "high",
        deadlineLabel: "test",
        evidenceAnchor: null,
        linkedRoute: null,
        draftChaseWording: "Please provide CAD / 999",
        courtLine: "CAD outstanding",
        mergedFrom: ["CAD / 999 audio / control-room material"],
      },
    ],
    "S04 CAD incident log extract Served\nO02 CAD log full print Outstanding\nO05 999 audio Outstanding Listed but not attached",
  );
  assert.equal(dunnLike.length, 1, "Dunn: remaining CAD modalities must stay chaseable");
  assert.match(dunnLike[0]!.label, /999 audio/i);
  assert.match(dunnLike[0]!.label, /CAD log full print/i);
  assert.doesNotMatch(dunnLike[0]!.label, /extract/i);
}

// --- I: stills alone ≠ CCTV master invent label ---
{
  assert.equal(
    humanizeEvidenceLabel("CCTV stills", "served"),
    "CCTV stills served",
    "served stills alone must not invent master outstanding",
  );
  assert.match(
    humanizeEvidenceLabel("CCTV stills — full CCTV master outstanding", "missing"),
    /master outstanding/i,
    "opposite: stills+master language keeps master outstanding",
  );
}

// --- J: Trap /sim/-in-assuming must not invent Subscriber; real subscriber must ---
{
  assert.notEqual(
    displayChaseCardLabel({
      label: "Additional source-material issues (1 on file)",
      mergedFrom: ["The case should not be strengthened by assuming missing CCTV"],
      whyItMatters: "assuming missing CCTV",
    }),
    "Subscriber / account data",
    "Trap: assuming must not invent Subscriber via /sim/ substring",
  );
  assert.match(
    displayChaseCardLabel({
      label: "Additional source-material issues (1 on file)",
      mergedFrom: ["subscriber report not served"],
    }),
    /subscriber/i,
    "opposite: real subscriber outstanding still surfaces",
  );
}

console.log("f167-surgical-truth-opposite-direction: PASS");
