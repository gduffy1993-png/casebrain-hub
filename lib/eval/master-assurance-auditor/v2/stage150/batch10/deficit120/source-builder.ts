/**
 * Shared parametric source/truth builders for deficit-120 — no case-ID branching.
 * Truth is written separately and must not be read during output generation.
 */

import type { Deficit120CaseSpec } from "./coverage-catalog";

export type Deficit120SourceArtifacts = {
  canonicalBundle: string;
  bundleText: string;
  truthKey: Record<string, unknown>;
  templateId: "deficit120-disclosure-v1";
  uniqueWordingToken: string;
};

export function buildDeficit120Source(spec: Deficit120CaseSpec): Deficit120SourceArtifacts {
  const token = `UQ-${spec.sequence.toString(16).padStart(4, "0")}-${spec.family.slice(0, 4)}`;
  const evidenceTitle = `Exhibit pack ${token}`;
  const draftTitle = `MG11 complainant statement (draft unsigned) ${token}`;
  const recordingTitle = `Interview recording ${token}`;
  const transcriptTitle = `Interview transcript ${token}`;
  const cctvTitle =
    spec.variant === "messy" ? `CCTV still clip ${token}` : `CCTV master export ${token}`;

  const indexExtra =
    spec.variant === "messy"
      ? `\nMystery annex | see above | OCR-ambiguous page note`
      : spec.variant === "later_disclosure"
        ? `\nLater disclosure annex | 12 | marked later service`
        : "";

  const chargeStatusBlock = [
    `Instrument status: ${spec.instrumentStatus}`,
    `Instrument version: ${spec.instrumentVersion}`,
    spec.replacesPrior
      ? `Replaces prior instrument: version 1 charge sheet for ${spec.defendant} (amended particulars)`
      : `Replacement linkage: none`,
  ].join("\n");

  const particulars = `Between 3 January 2026 and 14 March 2026 at ${spec.court}, ${spec.defendant} engaged in conduct particularised under ${spec.theme} (matter token ${token}).`;

  const ocrMark = spec.variant === "ocr_scan" ? " [scanned OCR extract]" : "";
  const mixedMark =
    spec.variant === "mixed_format"
      ? "\nNative JSON/CSV extract reference: device-export.json (hash placeholder on schedule)."
      : "";

  const canonicalBundle = `RESTRICTED — PROSECUTION DISCLOSURE BUNDLE

URN: ${spec.urn}
Defendant: ${spec.defendant}
Court: ${spec.court}
Coverage family: ${spec.family}
Format variant: ${spec.variant}

=== SECTION: COVER_INDEX ===

INDEX

Document | Pages | Note
Charge sheet | 1 |
MG5 case summary | 2-3 |
MG6C disclosure schedule | 4 |
${draftTitle} | 5-6 |
${evidenceTitle} | 7-8 |
${cctvTitle} | 9 |
${recordingTitle} | 10 |
${transcriptTitle} | 11 |
Court listing | 12 |${indexExtra}

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
Officer in case: DC Reed ${4000 + spec.sequence}
Family theme: ${spec.theme}

Headline Summary
Prosecution relies on served ${evidenceTitle}, draft MG11, and listing. Outstanding material is scheduled on MG6C. Matter token ${token}.
${spec.formatNotes.map((n) => `Note: ${n}`).join("\n")}

Evidence on file (served)
- Charge sheet
- MG5
- MG6C
- ${draftTitle}
- ${evidenceTitle}
- ${cctvTitle}

Evidence referred or outstanding
- Full signed MG11
- ${recordingTitle} master export where not attached
- Subscriber/account data where digital attribution is live

=== SECTION: MG6 ===

MG6C — UNUSED MATERIAL SCHEDULE

MG6C/001 — ${evidenceTitle} — served — on bundle pages 7-8
MG6C/002 — ${draftTitle} — served — draft only
MG6C/003 — Full signed MG11 — outstanding — not on bundle
MG6C/004 — ${recordingTitle} — outstanding — not on bundle
MG6C/005 — ${transcriptTitle} — served — pages 11
MG6C/006 — Subscriber/account data — outstanding — not on bundle
${spec.variant === "later_disclosure" ? "MG6C/007 — Later disclosure annex — outstanding — later service marked\n" : ""}
=== SECTION: MG11 ===

MG11 — COMPLAINANT STATEMENT (draft unsigned)${ocrMark}

I am the complainant in ${spec.urn}. Between January and March 2026 I experienced the events summarised in the charge particulars (token ${token}). I have not signed a final statement. Final signed MG11 remains outstanding on MG6C/003.

=== SECTION: EXHIBIT ===

${evidenceTitle} — SERVED

Pack reference: DFU/${token}
Contents: screenshots/messages/still imagery relevant to ${spec.theme}.${mixedMark}

=== SECTION: LISTING ===

${spec.hearingLine}
`;

  // Truth key — blinded expectations only; never fed to CaseBrain builders.
  const truthKey = {
    schemaVersion: "deficit120-truth-key@1.0.0",
    caseId: spec.caseId,
    blinded: true,
    mustNotOpenDuringOutputGeneration: true,
    uniqueWordingToken: token,
    expectedDefendant: spec.defendant,
    expectedOffenceFamily: spec.family,
    expectedInstrumentStatus: spec.instrumentStatus,
    expectedInstrumentVersion: spec.instrumentVersion,
    expectedTimezone: spec.timezone,
    expectedChaseOutstanding: ["Full signed MG11", recordingTitle, "Subscriber/account data"],
    expectedEvidenceDistinctions: {
      draftVsSigned: draftTitle,
      recordingVsTranscript: { recording: recordingTitle, transcript: transcriptTitle },
      stillVsMaster: cctvTitle,
    },
    mustNotSay: [`truth-leak-${token}`, "fabricated-exit-payload"],
    lineage: {
      templateId: "deficit120-disclosure-v1",
      family: spec.family,
      variant: spec.variant,
      sequence: spec.sequence,
    },
  };

  return {
    canonicalBundle,
    bundleText: canonicalBundle,
    truthKey,
    templateId: "deficit120-disclosure-v1",
    uniqueWordingToken: token,
  };
}
