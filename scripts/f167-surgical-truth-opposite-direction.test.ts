process.env.NEXT_PUBLIC_CRIMINAL_PILOT_MODE = "true";

/**
 * Opposite-direction + Arden-shape surgical truth contracts for F167.
 * Run: npx tsx scripts/f167-surgical-truth-opposite-direction.test.ts
 */
import assert from "node:assert/strict";

import { humanizeEvidenceLabel } from "../components/criminal/five-answers/evidence-display";
import {
  buildDisclosureChaseBrief,
  reconcileCad999ModalityItems,
  reconcileInterviewModalityItems,
  interviewChaseLabelFromSignals,
  reconcilePhoneDownloadModalityItems,
  reconcileSubscriberModalityItems,
} from "../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { familySupport, expandAndGateChaseLines } from "../lib/criminal/chase-source-gate";
import {
  displayChaseCardLabel,
  isDigitalHarassmentBundleHay,
  polishPresentationLine,
} from "../lib/criminal/demo-presentation-polish";
import { finalizeDisclosureChasePresentation } from "../lib/criminal/disclosure-chase-finalize";
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
    "Interview recording and transcript outstanding",
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

  const grantGlued = reconcileCad999ModalityItems(
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
        mergedFrom: ["CAD / 999 audio / control-room material", "8CAD / 999 extractPresent"],
      },
    ],
    "8CAD / 999 extractPresent",
  );
  assert.equal(grantGlued.length, 0, "Grant: glued extractPresent token must also drop CAD chase");

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

// --- K: interview recording vs transcript — no slash-blend identity ---
{
  assert.equal(
    interviewChaseLabelFromSignals(
      "Interview recording / transcript\nRecording state not safely confirmed; transcript state served.",
    ),
    "Interview recording",
    "Tobin-like: transcript served → chase recording only",
  );
  assert.equal(
    interviewChaseLabelFromSignals(
      "Interview summary present. Full interview transcript outstanding needed.",
    ),
    "Interview transcript",
    "Ahmed-like: transcript outstanding only",
  );
  assert.equal(
    interviewChaseLabelFromSignals(
      "Interview summary only. Full interview recording and transcript not served.",
    ),
    "Interview recording and transcript",
    "Patel-like: both modalities outstanding without slash blend",
  );

  const tobinCard = reconcileInterviewModalityItems(
    [
      {
        id: "chase-family-interview",
        familyId: "interview",
        label: "Interview recording / transcript",
        whyItMatters: "test",
        source: "Custody",
        baseStatus: "Outstanding",
        urgency: "high",
        deadlineLabel: "test",
        evidenceAnchor: null,
        linkedRoute: null,
        draftChaseWording: "Please provide Interview recording / transcript",
        courtLine: "Interview outstanding",
        mergedFrom: ["Interview recording / transcript"],
        provenance: {
          sourceDocumentTitle: null,
          sourceDocumentType: null,
          sourcePage: null,
          compiledPage: null,
          sourceFilename: null,
          evidenceState: "missing",
          defendant: null,
          countNumber: null,
          unresolvedConflictOrLimitation:
            "Recording state not safely confirmed; transcript state served.",
        },
      },
    ],
    "Full interview transcript Outstanding\nInterview record completeness caution",
  );
  assert.equal(tobinCard.length, 1);
  assert.equal(tobinCard[0]!.label, "Interview recording");
  assert.doesNotMatch(tobinCard[0]!.label, /recording\s*\/\s*transcript/i);

  assert.equal(
    humanizeEvidenceLabel("Interview transcript", "missing"),
    "Interview transcript outstanding",
  );
}

// --- L: phone mid-state vs Brookes full vs Arden property ---
{
  const grant = reconcilePhoneDownloadModalityItems(
    [],
    "Logical download summary only. Full report not in section. MG6 disclosure schedule Present.",
  );
  assert.ok(
    grant.some((i) => /summary only|full download report not in section/i.test(i.label)),
    "Grant mid-state must surface",
  );
  assert.ok(!grant.some((i) => /^Full phone download/i.test(i.label)), "mid-state ≠ full invent");

  const brookes = reconcilePhoneDownloadModalityItems(
    [
      {
        id: "p1",
        familyId: "other",
        label: "Full phone download / source extraction",
        whyItMatters: "test",
        source: "Crown",
        baseStatus: "Outstanding",
        urgency: "high",
        deadlineLabel: "test",
        evidenceAnchor: null,
        linkedRoute: null,
        draftChaseWording: "Please provide full phone download",
        courtLine: "phone outstanding",
        mergedFrom: ["Full phone download outstanding"],
      },
    ],
    "Full phone download outstanding. Source export not served. Subscriber report not served.",
  );
  assert.ok(
    brookes.some((i) => /Full phone download/i.test(i.label)),
    "opposite: Brookes full download TP",
  );

  // Brookes: inject full download when no upstream phone card exists yet.
  const brookesInjectOnly = reconcilePhoneDownloadModalityItems(
    [],
    "Full phone download outstanding. Source export not served. Subscriber report not served.",
  );
  assert.ok(
    brookesInjectOnly.some((i) => /Full phone download/i.test(i.label)),
    "Brookes: full download inject when no upstream card",
  );

  const arden = reconcilePhoneDownloadModalityItems(
    [
      {
        id: "p2",
        familyId: "other",
        label: "Phone download / source export",
        whyItMatters: "test",
        source: "Crown",
        baseStatus: "Outstanding",
        urgency: "high",
        deadlineLabel: "test",
        evidenceAnchor: null,
        linkedRoute: null,
        draftChaseWording: "Please provide phone download",
        courtLine: "phone",
        mergedFrom: ["stolen phone from Marlow Reed"],
      },
    ],
    "Stolen phone from Marlow Reed. No phone download or source export on MG6.",
  );
  assert.equal(arden.length, 0, "opposite: Arden property-phone TN");

  const ahmedSub = reconcileSubscriberModalityItems(
    [],
    "phone subscriber data outstanding not attached",
  );
  assert.ok(
    ahmedSub.some((i) => /subscriber/i.test(i.label)),
    "Ahmed: subscriber outstanding must surface",
  );

  const ahmedNewline = reconcileSubscriberModalityItems(
    [],
    "phone subscriber data\routstanding\rnot attached",
  );
  assert.ok(
    ahmedNewline.some((i) => /subscriber/i.test(i.label)),
    "Ahmed: newline schedule cells still establish subscriber outstanding",
  );

  const trapSub = reconcileSubscriberModalityItems(
    [
      {
        id: "s1",
        familyId: "other",
        label: "Subscriber / account data",
        whyItMatters: "assuming",
        source: "Crown",
        baseStatus: "Outstanding",
        urgency: "medium",
        deadlineLabel: "test",
        evidenceAnchor: null,
        linkedRoute: null,
        draftChaseWording: "subscriber",
        courtLine: "sub",
        mergedFrom: ["assuming missing CCTV"],
      },
    ],
    "The case should not be strengthened by assuming missing CCTV, statements, codes, or forensic evidence.",
  );
  assert.equal(trapSub.length, 0, "Trap: do not invent subscriber from assuming");

  // Brookes: phone + subscriber must survive finalize collapse (no mute under phone).
  {
    const brookesHay =
      "Full phone download outstanding. Source export not served. Subscriber report not served.";
    const brookesPair = finalizeDisclosureChasePresentation(
      reconcileSubscriberModalityItems(
        reconcilePhoneDownloadModalityItems(
          [
            {
              id: "p1",
              familyId: "other",
              label: "Full phone download / source extraction",
              whyItMatters: "test",
              source: "Crown",
              baseStatus: "Outstanding",
              urgency: "high",
              deadlineLabel: "test",
              evidenceAnchor: null,
              linkedRoute: null,
              draftChaseWording: "Please provide full phone download",
              courtLine: "phone outstanding",
              mergedFrom: ["Full phone download outstanding"],
            },
          ],
          brookesHay,
        ),
        brookesHay,
      ),
    );
    assert.ok(
      brookesPair.some((i) => /Full phone download/i.test(i.label)),
      "Brookes: full phone download remains after finalize",
    );
    assert.ok(
      brookesPair.some((i) => /subscriber/i.test(i.label)),
      "Brookes: subscriber inject remains distinct after finalize",
    );

    // Soft-mute residual: digital modality must land on primaryItems, not collapsed "Other".
    const brookesBrief = buildDisclosureChaseBrief({
      caseId: "test-brookes-soft",
      caseTitle: "Taylor Brookes",
      clientLabel: "Taylor Brookes",
      allegation: "Harassment — phone attribution disputed",
      stage: "PTPH",
      hearingStatus: "Listed",
      hearingDateIso: null,
      bundleHealth: "ok",
      positionStatus: "provisional",
      battleboard: null,
      bundleText: brookesHay,
    });
    assert.ok(
      brookesBrief.primaryItems.some((i) => /Full phone download/i.test(i.label)),
      "Brookes: full phone download on primary Chase board (not soft-muted under Other)",
    );
    assert.ok(
      brookesBrief.primaryItems.some((i) => /subscriber/i.test(i.label)),
      "Brookes: subscriber on primary Chase board (not soft-muted under Other)",
    );
  }

  // Trap opposite: thin invent-advisory hay must not promote subscriber onto primary.
  {
    const trapBrief = buildDisclosureChaseBrief({
      caseId: "test-trap-soft",
      caseTitle: "Trap thin file",
      clientLabel: "Trap",
      allegation: "Assault",
      stage: "PTPH",
      hearingStatus: "Listed",
      hearingDateIso: null,
      bundleHealth: "ok",
      positionStatus: "provisional",
      battleboard: null,
      bundleText:
        "The case should not be strengthened by assuming missing CCTV, statements, codes, or forensic evidence.",
    });
    assert.equal(
      trapBrief.primaryItems.filter((i) => /subscriber/i.test(i.label)).length,
      0,
      "Trap: no subscriber invent on primary",
    );
  }

  // Phone mid-state hay must not reclassify a CAD card; Tobin extract body soft-drops CAD lump.
  {
    const tobinHay =
      "Phone download reference referenced only.\nCAD / 999 Extract\nTime Entry\n21:14 Call received from member of public\nUnit assigned\nOfficer arrival";
    const kept = reconcilePhoneDownloadModalityItems(
      [
        {
          id: "c1",
          familyId: "cad_999",
          label: "CAD / 999 audio / control-room material",
          whyItMatters: "test",
          source: "Crown",
          baseStatus: "Outstanding",
          urgency: "high",
          deadlineLabel: "test",
          evidenceAnchor: "CAD / 999 Extract",
          linkedRoute: null,
          draftChaseWording: "Please provide CAD",
          courtLine: "CAD",
          mergedFrom: ["CAD / 999 Extract", "999 / CAD material"],
        },
      ],
      tobinHay,
    );
    assert.ok(
      kept.some((i) => i.familyId === "cad_999"),
      "Tobin: phone mid-state hay must not rewrite CAD card into phone",
    );
    const soft = reconcileCad999ModalityItems(kept, tobinHay);
    assert.equal(
      soft.filter((i) => i.familyId === "cad_999").length,
      0,
      "Tobin: served CAD/999 Extract body soft-drops lumped audio chase",
    );
  }

  // Trap: overflow draft must not display-polish into Subscriber.
  assert.notEqual(
    displayChaseCardLabel({
      label: "Additional source-material issues (6 on file)",
      mergedFrom: ["assuming missing CCTV", "statements", "codes", "forensic evidence", "interview record", "continuity note"],
      draftChaseWording:
        "Please provide the outstanding source material identified on the disclosure schedule, including subscriber/account data, message exports, call logs, and any MG11/source material referred to but not served",
      whyItMatters: "assuming missing CCTV",
    }),
    "Subscriber / account data",
    "Trap: draft wording alone must not invent Subscriber display label",
  );

  // Grant/Tobin mid-state label survives finalize humanize.
  {
    const mid = finalizeDisclosureChasePresentation(
      reconcilePhoneDownloadModalityItems(
        [],
        "Logical download summary only. Full report not in this section.",
      ),
    );
    assert.ok(
      mid.some((i) => /summary only|full download report not in section/i.test(i.label)),
      "Grant: mid-state label survives finalize",
    );
  }

  // Overview battleboard: compound chase templates must not invent missing modalities.
  {
    const thinNoMedia = expandAndGateChaseLines(
      ["Chase CAD audit, 999 audio, and CCTV master with continuity."],
      "Defendant: Barlow. MG6 disclosure schedule. Outstanding material listed.",
    );
    assert.equal(thinNoMedia.length, 0, "thin file: no CAD/999/CCTV master invent from timeline lump");

    const transcriptOnly = expandAndGateChaseLines(
      ["Chase interview recording/transcript and pre-interview disclosure."],
      "MG6/05 full interview transcript Outstanding Listed but not attached. Interview summary on file. No PACE recording wording.",
    );
    assert.ok(
      transcriptOnly.some((l) => /interview transcript/i.test(l)),
      "transcript outstanding: transcript chase survives",
    );
    assert.equal(
      transcriptOnly.filter((l) => /interview recording/i.test(l)).length,
      0,
      "transcript outstanding: recording invent dropped",
    );

    const stillsOnly = expandAndGateChaseLines(
      ["Chase CCTV master and continuity."],
      "Partial CCTV stills served. Continuity statement outstanding. No master wording.",
    );
    assert.equal(stillsOnly.length, 0, "stills≠master: CCTV master chase dropped");

    const ardenMaster = expandAndGateChaseLines(
      ["Chase CCTV master and continuity."],
      "Partial CCTV stills served. Full CCTV master outstanding. Continuity statement outstanding.",
    );
    assert.ok(
      ardenMaster.some((l) => /CCTV master/i.test(l)),
      "Arden opposite: master outstanding keeps CCTV master chase",
    );

    const page999Noise = expandAndGateChaseLines(
      ["Chase CAD audit, 999 audio, and CCTV master with continuity."],
      "MG6 schedule page 999. Outstanding material listed. No CAD log or 999 audio on file.",
    );
    assert.equal(page999Noise.length, 0, "page-999 noise must not invent CAD audit or 999 audio");

    const dunnCad = expandAndGateChaseLines(
      ["Chase CAD audit and 999 audio."],
      "CAD / 999 Extract present. 999 audio outstanding. CAD log full print outstanding.",
    );
    assert.ok(dunnCad.some((l) => /CAD audit/i.test(l)), "Dunn opposite: CAD language keeps CAD audit chase");
    assert.ok(dunnCad.some((l) => /999 audio/i.test(l)), "Dunn opposite: 999 audio outstanding keeps chase");
  }

  const trapInterview = reconcileInterviewModalityItems(
    [
      {
        id: "chase-family-interview",
        familyId: "interview",
        label: "Interview recording / transcript",
        whyItMatters: "test",
        source: "Custody",
        baseStatus: "Outstanding",
        urgency: "high",
        deadlineLabel: "test",
        evidenceAnchor: null,
        linkedRoute: null,
        draftChaseWording: "Please provide Interview recording / transcript",
        courtLine: "Interview outstanding",
        mergedFrom: ["interview record outstanding"],
      },
    ],
    "No PACE interview transcript or summary is provided. Outstanding/not provided: interview record.",
  );
  assert.equal(trapInterview.length, 0, "Trap: do not invent interview recording from interview record alone");
}

console.log("f167-surgical-truth-opposite-direction: PASS");
