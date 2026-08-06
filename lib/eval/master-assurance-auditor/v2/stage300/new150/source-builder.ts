/**
 * Parametric Stage-300 new-150 source + blinded truth builders.
 * No case-ID branching. Truth never fed to CaseBrain builders.
 */

import { NEW150_TEMPLATE_ID } from "./constants";
import type { New150CaseSpec } from "./coverage-catalog";

export type New150SourceArtifacts = {
  canonicalBundle: string;
  bundleText: string;
  truthKey: Record<string, unknown>;
  templateId: typeof NEW150_TEMPLATE_ID;
  uniqueWordingToken: string;
  nativeFiles: Array<{ relativePath: string; contents: string; contentType: string }>;
  sourceCapabilityInventory: Record<string, unknown>;
};

export function buildNew150Source(spec: New150CaseSpec): New150SourceArtifacts {
  const token = `S300-${spec.sequence.toString(16).padStart(4, "0")}-${spec.family.slice(0, 4)}-${spec.coverageTag.slice(0, 6)}`;
  const evidenceTitle = `Exhibit pack ${token}`;
  const draftTitle = `MG11 complainant statement (draft unsigned) ${token}`;
  const signedTitle = `MG11 complainant statement (signed) ${token}`;
  const recordingTitle = `Interview recording ${token}`;
  const transcriptTitle = `Interview transcript ${token}`;
  const cctvClip = `CCTV still clip ${token}`;
  const cctvMaster = `CCTV master export ${token}`;
  const sf = spec.sourceFacts;

  const coDefBlock =
    spec.coDefendants.length > 0
      ? `\nCo-defendants: ${spec.coDefendants.join("; ")} (attribution must not conflate).`
      : "";

  const dobBlock = sf.dateOfBirth
    ? `\nDate of birth (custody record): ${sf.dateOfBirth}\nAge calculation inputs: DOB=${sf.dateOfBirth}; offenceDate=${sf.offenceDate}; hearingDate=${sf.hearingDate}; timezone=${spec.timezone}.`
    : `\nDate of birth: not stated on served pages.`;

  const youthBlock = sf.youthCourt
    ? `\nProcedural listing: YOUTH COURT. Youth safeguards (appropriate adult) apply. Youth procedure is separate from culpability assessment.`
    : "";

  const fitnessBlock = sf.fitnessAllegationPresent
    ? `\nFitness allegation: defence raises fitness to plead / effective participation concern (psychiatric report outstanding).\nFitness decision: ${
        sf.fitnessDecisionPresent
          ? "court has recorded a fitness decision boundary on the listing note (decision ≠ guilt)."
          : "no fitness decision yet — allegation only."
      }`
    : "";

  const piiBlock = sf.disclosurePiiBoundaryPresent
    ? `\nDisclosure vs PII: schedule marks witness home address and medical identifiers as PII-withheld; open disclosure items remain on MG6C without PII.`
    : "";

  const taxonomyBlock = sf.legalCategoryLabelsPresent
    ? `\nLegal-category labels on MG5 (source-backed, not CaseBrain taxonomy bag):\n- source_fact: served exhibit pack pages\n- allegation: statement of offence\n- prosecution_position: MG5 headline\n- defence_position: reserved\n- unresolved_question: outstanding MG11 signed / recording master\nPinned authority version note: legal-state-category-set@pinned-lsl05-v1 (source annotation only).`
    : "";

  const ocrMark = sf.ocrHeavy ? " [scanned OCR extract — degraded glyphs]" : "";
  const nativeMark = sf.nativeFormats
    ? "\nNative inputs present: device-export.json, schedule.csv, disclosure-notice.eml (see native/)."
    : "";
  const versionBlock = sf.versionDraftPair
    ? `\n=== SECTION: DRAFT_V1 ===\nDefence note draft v1 ${token} — unsigned — sentence: The defendant was at home at the material time.\n=== SECTION: DRAFT_V2 ===\nDefence note draft v2 ${token} — amended after later disclosure — sentence: The defendant was at home at the material time according to the later-served schedule entry.\nSupersedes: draft v1. Approval: solicitor approval required before external send.`
    : "";

  const conflictBlock =
    spec.coverageTag === "conflicting_source"
      ? `\nConflicting source note: MG5 says offence on ${sf.offenceDate}; listing diary shows competing date ${sf.hearingDate} without reconciliation.`
      : "";

  const denser =
    spec.coverageTag === "dense_bundle"
      ? `\n=== SECTION: ANNEX_A ===\nDense multi-section disclosure annex A ${token} with repeated exhibit cross-refs.\n=== SECTION: ANNEX_B ===\nDense annex B ${token} — further unused material schedule rows.`
      : "";

  const later =
    spec.coverageTag === "later_disclosure" || sf.chaseOutstanding
      ? `MG6C/007 — Later disclosure annex — outstanding — later service marked\n`
      : "";

  const chargeStatusBlock = [
    `Instrument status: ${spec.instrumentStatus}`,
    `Instrument version: ${spec.instrumentVersion}`,
    spec.replacesPrior
      ? `Replaces prior instrument: version 1 charge sheet for ${spec.defendant} (amended particulars)`
      : `Replacement linkage: none`,
  ].join("\n");

  const particulars = `Between ${sf.offenceDate} and ${sf.hearingDate} at ${spec.court}, ${spec.defendant} engaged in conduct particularised under ${spec.theme} (matter token ${token}).`;

  const servedLinkNote = sf.chaseLinkedServed
    ? `MG6C/001 — ${evidenceTitle} — served — on bundle pages 7-8 — evidenceUnitRef=EU-${token}-EXHIBIT`
    : `MG6C/001 — ${evidenceTitle} — served — on bundle pages 7-8`;

  const canonicalBundle = `RESTRICTED — PROSECUTION DISCLOSURE BUNDLE

URN: ${spec.urn}
Defendant: ${spec.defendant}${coDefBlock}
Court: ${spec.court}
Coverage family: ${spec.family}
Coverage tag: ${spec.coverageTag}
Format notes: Stage-300 new-150 control-coverage materialisation

=== SECTION: COVER_INDEX ===

INDEX

Document | Pages | Note
Charge sheet | 1 |
MG5 case summary | 2-3 |
MG6C disclosure schedule | 4 |
${draftTitle} | 5-6 |
${evidenceTitle} | 7-8 |
${cctvClip} | 9 |
${recordingTitle} | 10 |
${transcriptTitle} | 11 |
Court listing / custody | 12 |
${sf.versionDraftPair ? `Defence draft v1 | 13 |\nDefence draft v2 | 14 |\n` : ""}${sf.nativeFormats ? `Native email/JSON/CSV refs | 15 |\n` : ""}
=== SECTION: CHARGE ===

R v ${spec.defendant}

Statement of Offence:
${spec.offenceLine}

Particulars of Offence:
${particulars}

${chargeStatusBlock}

=== SECTION: MG5 ===

MG05 — OFFENCE REPORT

URN: ${spec.urn}
Officer in case: DC Reed ${5000 + spec.sequence}
Family theme: ${spec.theme}
Coverage tag: ${spec.coverageTag}

Headline Summary
Prosecution relies on served ${evidenceTitle}, draft MG11, and listing. Outstanding material is scheduled on MG6C. Matter token ${token}.
${taxonomyBlock}${fitnessBlock}${piiBlock}${conflictBlock}

Evidence on file (served)
- Charge sheet
- MG5
- MG6C
- ${draftTitle}
- ${evidenceTitle}
- ${cctvClip}

Evidence referred or outstanding
- ${signedTitle}
- ${recordingTitle} master export where not attached
- ${cctvMaster}
- Subscriber/account data where digital attribution is live

=== SECTION: MG6 ===

MG6C — UNUSED MATERIAL SCHEDULE

${servedLinkNote}
MG6C/002 — ${draftTitle} — served — draft only
MG6C/003 — ${signedTitle} — outstanding — not on bundle
MG6C/004 — ${recordingTitle} — outstanding — not on bundle
MG6C/005 — ${transcriptTitle} — served — pages 11
MG6C/006 — Subscriber/account data — outstanding — not on bundle
${later}=== SECTION: MG11 ===

MG11 — COMPLAINANT STATEMENT (draft unsigned)${ocrMark}

I am the complainant in ${spec.urn}. Between the offence window and listing I experienced the events summarised in the charge particulars (token ${token}). I have not signed a final statement. Final signed MG11 remains outstanding on MG6C/003.

=== SECTION: EXHIBIT ===

${evidenceTitle} — SERVED

Pack reference: DFU/${token}
Evidence unit id (source label): EU-${token}-EXHIBIT
Contents: screenshots/messages/still imagery relevant to ${spec.theme}.${nativeMark}
${sf.attachmentAbsentRef ? `\nAttachment reference without binary: email-attach://missing-${token}.pdf (referenced in schedule; binary absent from bundle).` : ""}

=== SECTION: LISTING ===

${spec.hearingLine}
Custody / listing extract:${dobBlock}${youthBlock}
Offence date (source): ${sf.offenceDate}
Hearing date (source): ${sf.hearingDate}
Timezone: ${spec.timezone}
${versionBlock}
${denser}
`;

  const nativeFiles: New150SourceArtifacts["nativeFiles"] = [];
  if (sf.nativeFormats) {
    nativeFiles.push(
      {
        relativePath: "native/device-export.json",
        contentType: "application/json",
        contents: `${JSON.stringify(
          {
            deviceId: `dev-${token}`,
            exportedAt: sf.offenceDate,
            messages: [{ from: "unknown", body: `msg ${token}`, ts: sf.offenceDate }],
          },
          null,
          2,
        )}\n`,
      },
      {
        relativePath: "native/schedule.csv",
        contentType: "text/csv",
        contents: `item,status,ref\nMG6C/001,served,EU-${token}-EXHIBIT\nMG6C/003,outstanding,signed-mg11\n`,
      },
      {
        relativePath: "native/disclosure-notice.eml",
        contentType: "message/rfc822",
        contents: `From: cps@example.test\nTo: defence@example.test\nSubject: Disclosure ${token}\n\nPlease find schedule reference EU-${token}-EXHIBIT.\nAttachment-Ref: missing-${token}.pdf\n`,
      },
    );
  }

  const sourceCapabilityInventory = {
    schemaVersion: "stage300-new150-source-capability-inventory@1.0.0",
    caseId: spec.caseId,
    note: "Corpus design inventory only — not CaseBrain output; not eligibility by itself.",
    dateOfBirthPresent: sf.dateOfBirth != null,
    dateOfBirth: sf.dateOfBirth,
    offenceDate: sf.offenceDate,
    hearingDate: sf.hearingDate,
    timezone: spec.timezone,
    youthCourt: sf.youthCourt,
    fitnessAllegationPresent: sf.fitnessAllegationPresent,
    fitnessDecisionPresent: sf.fitnessDecisionPresent,
    disclosurePiiBoundaryPresent: sf.disclosurePiiBoundaryPresent,
    legalCategoryLabelsPresent: sf.legalCategoryLabelsPresent,
    ocrHeavy: sf.ocrHeavy,
    passwordCorruptFlag: sf.passwordCorruptFlag,
    redactionMaskPresent: sf.redactionMaskPresent,
    paginationDiscontinuity: sf.paginationDiscontinuity,
    attachmentAbsentRef: sf.attachmentAbsentRef,
    nativeFormats: sf.nativeFormats,
    versionDraftPair: sf.versionDraftPair,
    audiencePackAttempt: sf.audiencePackAttempt,
    chaseLinkedServedLabel: sf.chaseLinkedServed ? `EU-${token}-EXHIBIT` : null,
    targetedControlIds: spec.targetedControlIds,
  };

  const truthKey = {
    schemaVersion: "stage300-new150-truth-key@1.0.0",
    caseId: spec.caseId,
    blinded: true,
    mustNotOpenDuringOutputGeneration: true,
    uniqueWordingToken: token,
    expectedDefendant: spec.defendant,
    expectedOffenceFamily: spec.family,
    expectedCoverageTag: spec.coverageTag,
    expectedTargetedControls: spec.targetedControlIds,
    expectedInstrumentStatus: spec.instrumentStatus,
    expectedInstrumentVersion: spec.instrumentVersion,
    expectedTimezone: spec.timezone,
    expectedDob: sf.dateOfBirth,
    expectedOffenceDate: sf.offenceDate,
    expectedHearingDate: sf.hearingDate,
    expectedYouthCourt: sf.youthCourt,
    expectedFitnessAllegation: sf.fitnessAllegationPresent,
    expectedDisclosurePiiBoundary: sf.disclosurePiiBoundaryPresent,
    expectedChaseOutstanding: [signedTitle, recordingTitle, "Subscriber/account data"],
    expectedLinkedExhibitLabel: sf.chaseLinkedServed ? `EU-${token}-EXHIBIT` : null,
    expectedEvidenceDistinctions: {
      draftVsSigned: { draft: draftTitle, signed: signedTitle },
      recordingVsTranscript: { recording: recordingTitle, transcript: transcriptTitle },
      clipVsMaster: { clip: cctvClip, master: cctvMaster },
    },
    mustNotSay: [`truth-leak-${token}`, "fabricated-exit-payload"],
    lineage: {
      templateId: NEW150_TEMPLATE_ID,
      family: spec.family,
      coverageTag: spec.coverageTag,
      sequence: spec.sequence,
    },
  };

  return {
    canonicalBundle,
    bundleText: canonicalBundle,
    truthKey,
    templateId: NEW150_TEMPLATE_ID,
    uniqueWordingToken: token,
    nativeFiles,
    sourceCapabilityInventory,
  };
}
