/**
 * Parametric canonical bundle builders for demo-audit PDF cases 06–30.
 * Fictional prosecution disclosure only — no synthetic/fake wording in PDF-facing text.
 */
import type { EvidenceStateTruthKey } from "@/lib/eval/evidence-state-audit/types";

export type TrapKind =
  | "none"
  | "ocr"
  | "index_only"
  | "duplicate_index"
  | "missing_pages"
  | "layout_hearing";

export type PhoneBundleParams = {
  defendant: string;
  urn: string;
  court: string;
  officer: string;
  complainant: string;
  exhibitPrefix: string;
  phoneNumber: string;
  offenceLine: string;
  particulars: string;
  trap?: TrapKind;
  domesticAngle?: boolean;
};

export function buildPhoneHarassmentBundle(p: PhoneBundleParams): string {
  const ep = p.exhibitPrefix;
  const trap = p.trap ?? "none";
  const indexExtra =
    trap === "duplicate_index"
      ? `\nScreenshot and message pack (duplicate index entry) | 7-8 | Duplicate index line`
      : trap === "index_only"
        ? `\nFull phone download export | 12-14 | Listed — pages not attached`
        : trap === "missing_pages"
          ? `\nSubscriber data pack | 12 | Listed — page missing from bundle`
          : "";
  const listingDate =
    trap === "layout_hearing" || trap === "ocr"
      ? "PTPH listed — l8 August 2026, 10:00 (OCR: letter l may be digit 1)"
      : "PTPH listed — 18 August 2026, 10:00";

  return `RESTRICTED — PROSECUTION DISCLOSURE BUNDLE

URN: ${p.urn}
Defendant: ${p.defendant}
Court: ${p.court}

=== SECTION: COVER_INDEX ===

INDEX

Document | Pages | Note
Charge sheet | 1 |
MG5 case summary | 2-3 |
MG6C disclosure schedule | 4 |
MG11 complainant statement (draft unsigned) | 5-6 |
Screenshot and message pack | 7-8 |
Exhibit list | 9 |
Police note — attribution | 10 |
Court listing | 11 |${indexExtra}

=== SECTION: CHARGE ===

R v ${p.defendant}

Statement of Offence:
${p.offenceLine}

Particulars of Offence:
${p.particulars}

=== SECTION: MG5 ===

MG05 — OFFENCE REPORT

URN: ${p.urn}
Anticipated Plea: Not Guilty
Officer in case: ${p.officer}

Headline Summary
The prosecution relies on a served screenshot and message pack, a phone extraction summary, and complainant account. Full phone download, subscriber data, and final signed MG11 are outstanding. Attribution is asserted in police papers but not fully proved on current disclosure.
${p.domesticAngle ? "\nDomestic context noted in complainant account — full digital attribution still required before sender identity is safely confirmed." : ""}

Evidence on file (served)
Charge sheet; MG5; MG6C schedule; draft complainant MG11; screenshot/message pack (${ep}/01); exhibit list; police attribution note.

Evidence referred or outstanding
Full phone download/source export; subscriber/account data; full message export; call logs; device-level extraction metadata; final signed MG11; MG6C clarification on unused material.

=== SECTION: MG6 ===

MG6C — UNUSED MATERIAL SCHEDULE

MG6C/001 — Phone extraction summary — served (summary only; source download outstanding).
MG6C/002 — Screenshot and message pack ${ep}/01 — served on bundle.
MG6C/003 — Subscriber/account data — outstanding — not on bundle.
MG6C/004 — Full phone download / source export — outstanding — not on bundle.
MG6C/005 — Call logs — outstanding — not on bundle.
MG6C/006 — Device metadata export — referred on MG6C — not attached.
MG6C/007 — Final signed complainant MG11 — outstanding — draft only on bundle.
MG6C/008 — Additional unused material — clarification sought.

=== SECTION: MG11 ===

MG11 — COMPLAINANT STATEMENT (draft unsigned)

I am ${p.complainant}. Between January and March 2026 I received persistent messages on WhatsApp and SMS from a number I did not recognise.

I saved screenshots exhibited as ${ep}/01. Police told me a phone was seized from ${p.defendant}. I have not seen the full phone download and cannot say who typed each message without subscriber/account records.

Statement not yet signed — final MG11 outstanding.

=== SECTION: SCREENSHOTS ===

EXHIBIT ${ep}/01 — SCREENSHOT AND MESSAGE PACK (served)

Pack reference: DFU/${ep}/2026
Note: Screenshots served. Full extraction source file not attached.
${trap === "ocr" ? "\nOCR note on seized handset label: l2/0l/2026 (verify against custody record)." : ""}

--- Screenshot 1 (WhatsApp) ---
From: ${p.phoneNumber}
"I know where you work"

--- Screenshot 2 (SMS) ---
From: ${p.phoneNumber}
"Answer me"

--- Extraction summary (served summary only) ---
DFU summary: partial extraction completed. Full download referred on MG6C/004 — not attached.
Subscriber identity: not on bundle (MG6C/003 outstanding).

=== SECTION: EXHIBIT_LIST ===

EXHIBIT LIST — R v ${p.defendant} (${p.urn})

${ep}/01 — Screenshot and message pack — SERVED — pages 7-8
${ep}/02 — Phone extraction summary — SERVED (summary only)
${ep}/03 — Draft complainant MG11 — SERVED (unsigned)
${ep}/04 — Subscriber/account data — NOT SERVED
${ep}/05 — Full phone download — NOT SERVED

=== SECTION: POLICE_NOTE ===

POLICE NOTE — DIGITAL ATTRIBUTION (${p.officer})

Screenshot pack ${ep}/01 is served. Attribution of sender identity for ${p.phoneNumber} is asserted but NOT fully proved: subscriber/account data and full phone download are outstanding.

=== SECTION: LISTING ===

${listingDate}, ${p.court}, Court 3.
`;
}

export function phoneHarassmentTruthKey(
  caseId: string,
  title: string,
  defendant: string,
): EvidenceStateTruthKey {
  return {
    caseId,
    title,
    offenceFamily: "harassment_digital",
    offenceWording: "Harassment, contrary to section 2 of the Protection from Harassment Act 1997",
    profile: "needs_review",
    bundleStatus: "pdf_backed_demo",
    proofChainMode: "pdf_backed_controlled",
    evidenceItems: [
      { evidence_item: "charge sheet", evidence_type: "charge", correct_evidence_state: "served", chase_needed: false, safe_to_rely_on: true },
      { evidence_item: "mg5", evidence_type: "mg5", correct_evidence_state: "served", chase_needed: false, safe_to_rely_on: true },
      { evidence_item: "mg6", evidence_type: "mg6", correct_evidence_state: "served", chase_needed: false, safe_to_rely_on: true },
      { evidence_item: "screenshot and message pack", evidence_type: "phone_digital", correct_evidence_state: "served", source_page_anchor: "7", chase_needed: false, safe_to_rely_on: true },
      { evidence_item: "phone extraction summary", evidence_type: "phone_digital", correct_evidence_state: "served", chase_needed: false, safe_to_rely_on: false },
      { evidence_item: "full phone download", evidence_type: "phone_digital", correct_evidence_state: "missing", chase_needed: true, safe_to_rely_on: false },
      { evidence_item: "subscriber/account data", evidence_type: "phone_digital", correct_evidence_state: "missing", chase_needed: true, safe_to_rely_on: false },
      { evidence_item: "device metadata", evidence_type: "phone_digital", correct_evidence_state: "referred_only", chase_needed: true, safe_to_rely_on: false },
      { evidence_item: "complainant MG11", evidence_type: "mg11", correct_evidence_state: "incomplete", chase_needed: true, safe_to_rely_on: false },
      { evidence_item: "attribution material", evidence_type: "phone_digital", correct_evidence_state: "not_safely_confirmed", chase_needed: true, safe_to_rely_on: false, must_not_say: [`${defendant} sent`, "defendant sent"] },
    ],
    expectedChaseItems: ["full phone download", "subscriber/account data", "full message export", "final signed MG11", "MG6C clarification"],
    expectedSendability: "provisional_check_source",
    mustNotSayGlobal: ["defendant sent the messages", `${defendant} sent`, "attribution is proved", "BWV shows", "CCTV proves"],
    blockingFailPatterns: ["defendant sent each message", "guaranteed"],
  };
}

export type CctvBundleParams = {
  defendant: string;
  urn: string;
  court: string;
  officer: string;
  exhibitPrefix: string;
  offenceLine: string;
  particulars: string;
  trap?: TrapKind;
};

export function buildCctvTheftBundle(p: CctvBundleParams): string {
  const ep = p.exhibitPrefix;
  const trap = p.trap ?? "none";
  const indexExtra =
    trap === "index_only" || trap === "missing_pages"
      ? `\nMaster CCTV footage camera 4 | 10-12 | Listed — export not attached to bundle`
      : "";

  return `RESTRICTED — PROSECUTION DISCLOSURE BUNDLE

URN: ${p.urn}
Defendant: ${p.defendant}
Court: ${p.court}

=== SECTION: COVER_INDEX ===

INDEX

Document | Pages | Note
Charge sheet | 1 |
MG5 case summary | 2-3 |
MG6C disclosure schedule | 4 |
Officer MG11 | 5 |
CCTV still images | 6-7 |
Exhibit list | 8 |
Court listing | 9 |${indexExtra}

=== SECTION: CHARGE ===

R v ${p.defendant}

Statement of Offence:
${p.offenceLine}

Particulars of Offence:
${p.particulars}

=== SECTION: MG5 ===

MG05 — OFFENCE REPORT

URN: ${p.urn}
Officer in case: ${p.officer}

Headline Summary
CCTV still images are served. Master CCTV footage, full export, continuity, and audit trail are outstanding. Identification from stills alone is not safely confirmed on current papers.

=== SECTION: MG6 ===

MG6C — UNUSED MATERIAL SCHEDULE

MG6C/CCTV/01 — CCTV still images ${ep}/CCTV/01 — served on bundle.
MG6C/CCTV/02 — Master CCTV footage camera 4 — outstanding — not on bundle.
MG6C/CCTV/03 — Full CCTV export (native format) — referred on MG6C — export not attached.
MG6C/CCTV/04 — Continuity and provenance statement — outstanding.
MG6C/CCTV/05 — Audit trail / source file hash record — outstanding.

=== SECTION: MG11 ===

MG11 — OFFICER STATEMENT (${p.officer})

1. I attended following a report of shop theft.
2. CCTV still images ${ep}/CCTV/01 are served on this bundle. Master footage and full export are NOT served.
3. Stills show a person in relevant aisle. Image quality is limited. I cannot rely on stills alone for positive identification.

=== SECTION: CCTV_STILLS ===

EXHIBIT ${ep}/CCTV/01 — CCTV STILL IMAGES (served)

Camera 4 — menswear aisle — still frames only.
Note: Stills served. Master recording and continuity outstanding per MG6C/CCTV/02–05.
${trap === "ocr" ? "\nTimestamp OCR on still overlay: l4:22 (verify against store clock)." : ""}

=== SECTION: EXHIBIT_LIST ===

EXHIBIT LIST — R v ${p.defendant}

${ep}/CCTV/01 — CCTV still images — SERVED — pages 6-7
${ep}/CCTV/02 — Master CCTV footage — NOT SERVED
${ep}/CCTV/03 — Full CCTV export — REFERRED ONLY

=== SECTION: LISTING ===

First hearing listed — 22 September 2026, ${p.court}.
${trap === "layout_hearing" ? "Listing OCR note: l2 September may read as 12 September — verify with court." : ""}
`;
}

export function cctvTheftTruthKey(caseId: string, title: string): EvidenceStateTruthKey {
  return {
    caseId,
    title,
    offenceFamily: "theft_retail",
    offenceWording: "Theft from a shop, contrary to section 1(1) and 7(1) of the Theft Act 1968",
    profile: "needs_review",
    bundleStatus: "pdf_backed_demo",
    proofChainMode: "pdf_backed_controlled",
    evidenceItems: [
      { evidence_item: "charge sheet", evidence_type: "charge", correct_evidence_state: "served", chase_needed: false, safe_to_rely_on: true },
      { evidence_item: "mg5", evidence_type: "mg5", correct_evidence_state: "served", chase_needed: false, safe_to_rely_on: true },
      { evidence_item: "mg6", evidence_type: "mg6", correct_evidence_state: "served", chase_needed: false, safe_to_rely_on: true },
      { evidence_item: "cctv still images", evidence_type: "cctv", correct_evidence_state: "served", source_page_anchor: "6", chase_needed: false, safe_to_rely_on: false },
      { evidence_item: "master cctv footage", evidence_type: "cctv", correct_evidence_state: "missing", chase_needed: true, safe_to_rely_on: false },
      { evidence_item: "full cctv export", evidence_type: "cctv", correct_evidence_state: "referred_only", chase_needed: true, safe_to_rely_on: false },
      { evidence_item: "continuity/provenance", evidence_type: "cctv", correct_evidence_state: "missing", chase_needed: true, safe_to_rely_on: false },
      { evidence_item: "audit trail", evidence_type: "cctv", correct_evidence_state: "missing", chase_needed: true, safe_to_rely_on: false },
      {
        evidence_item: "recognition/ID basis",
        evidence_type: "cctv",
        correct_evidence_state: "missing",
        chase_needed: true,
        safe_to_rely_on: false,
        must_not_say: ["CCTV proves identity", "CCTV proves offence"],
      },
    ],
    expectedChaseItems: ["master cctv footage", "full cctv export", "continuity/provenance", "audit trail"],
    expectedSendability: "provisional_check_source",
    mustNotSayGlobal: [
      "CCTV proves identity",
      "CCTV proves offence",
      "positive identification from stills",
      "phone download",
      "Encro handle",
    ],
    blockingFailPatterns: ["CCTV proves", "guaranteed identification"],
  };
}

export type BwvBundleParams = {
  defendant: string;
  urn: string;
  court: string;
  officer: string;
  officerRank: string;
  trap?: TrapKind;
};

export function buildBwvAssaultBundle(p: BwvBundleParams): string {
  const trap = p.trap ?? "none";
  return `RESTRICTED — PROSECUTION DISCLOSURE BUNDLE

URN: ${p.urn}
Defendant: ${p.defendant}
Court: ${p.court}

=== SECTION: COVER_INDEX ===

INDEX

Document | Pages | Note
Charge sheet | 1 |
MG5 case summary | 2-3 |
MG6C disclosure schedule | 4 |
Officer MG11 (draft) | 5 |
Custody record extract | 6 |
BWV reference / listing | 7 |

=== SECTION: CHARGE ===

R v ${p.defendant}

Statement of Offence:
Assault an emergency worker, contrary to section 1 of the Assaults on Emergency Workers (Offences) Act 2018.

Particulars of Offence:
On 12 March 2026 at ${p.court.replace(" Court", "")} assaulted ${p.officerRank} ${p.officer.split(" ").slice(-1)[0]}, an emergency worker.

=== SECTION: MG5 ===

MG05 — OFFENCE REPORT

URN: ${p.urn}
Officer in case: ${p.officer}

Headline Summary
Officer account and custody extract are served. Body-worn video is referred on MG6C but not attached. Full custody record, interview audio/transcript, and PACE safeguards detail are outstanding.

=== SECTION: MG6 ===

MG6C — UNUSED MATERIAL SCHEDULE

MG6C/010 — Body-worn video ${p.officer} — referred on schedule — full export not attached.
MG6C/011 — Custody record — extract only served — full record outstanding.
MG6C/012 — Officer MG11 — draft unsigned — served.
MG6C/013 — Interview audio — outstanding — not on bundle.
MG6C/014 — Interview transcript — outstanding.
MG6C/015 — PACE safeguards detail — outstanding.

=== SECTION: MG11 ===

MG11 — OFFICER STATEMENT (draft unsigned)

I am ${p.officer}.

1. I activated body-worn video at the scene. The defendant was arrested.
2. The full BWV clip is referred on MG6C/010 but is NOT attached to this bundle.
3. Custody after arrest is summarised in the extract only.

=== SECTION: CUSTODY ===

CUSTODY RECORD EXTRACT — ${p.defendant}

Arrest time: 12/03/2026 19:50
Authorised detention: yes (extract only)
Full custody record: outstanding per MG6C/011
${trap === "ocr" ? "PACE review time OCR: l9:55 — verify against custody system." : ""}
${trap === "missing_pages" ? "Note: pages 8-9 of full custody record listed on index but not attached." : ""}

=== SECTION: LISTING ===

PTPH — 5 October 2026, ${p.court}.
`;
}

export function bwvAssaultTruthKey(caseId: string, title: string): EvidenceStateTruthKey {
  return {
    caseId,
    title,
    offenceFamily: "assault_emergency_worker",
    offenceWording: "Assault an emergency worker, contrary to section 1 of the Assaults on Emergency Workers (Offences) Act 2018",
    profile: "needs_review",
    bundleStatus: "pdf_backed_demo",
    proofChainMode: "pdf_backed_controlled",
    evidenceItems: [
      { evidence_item: "charge sheet", evidence_type: "charge", correct_evidence_state: "served", chase_needed: false, safe_to_rely_on: true },
      { evidence_item: "mg5", evidence_type: "mg5", correct_evidence_state: "served", chase_needed: false, safe_to_rely_on: true },
      { evidence_item: "mg6", evidence_type: "mg6", correct_evidence_state: "served", chase_needed: false, safe_to_rely_on: true },
      { evidence_item: "officer MG11", evidence_type: "mg11", correct_evidence_state: "incomplete", chase_needed: true, safe_to_rely_on: false },
      { evidence_item: "custody record extract", evidence_type: "custody", correct_evidence_state: "incomplete", chase_needed: true, safe_to_rely_on: false },
      { evidence_item: "body-worn video", evidence_type: "bwv", correct_evidence_state: "referred_only", chase_needed: true, safe_to_rely_on: false },
      { evidence_item: "full custody record", evidence_type: "custody", correct_evidence_state: "missing", chase_needed: true, safe_to_rely_on: false },
      { evidence_item: "interview audio", evidence_type: "interview", correct_evidence_state: "missing", chase_needed: true, safe_to_rely_on: false },
      { evidence_item: "PACE safeguards detail", evidence_type: "custody", correct_evidence_state: "missing", chase_needed: true, safe_to_rely_on: false },
    ],
    expectedChaseItems: ["full bwv export", "full custody record", "interview audio", "PACE safeguards detail"],
    expectedSendability: "provisional_check_source",
    mustNotSayGlobal: ["BWV shows the assault", "full video proves", "phone extraction"],
    blockingFailPatterns: ["bwv proves guilt"],
  };
}

export type CoDefBundleParams = {
  defendant: string;
  coDefendant: string;
  urn: string;
  court: string;
  officer: string;
  trap?: TrapKind;
};

export function buildCoDefBurglaryBundle(p: CoDefBundleParams): string {
  const trap = p.trap ?? "none";
  const indexExtra =
    trap === "index_only"
      ? `\n${p.defendant} interview summary | 9-10 | Listed — not attached`
      : trap === "duplicate_index"
        ? `\nCo-defendant interview (duplicate line) | 6 | Duplicate index`
        : "";

  return `RESTRICTED — PROSECUTION DISCLOSURE BUNDLE

URN: ${p.urn}
Defendant: ${p.defendant}
Co-defendant: ${p.coDefendant}
Court: ${p.court}

=== SECTION: COVER_INDEX ===

INDEX

Document | Pages | Note
Charge sheet | 1 |
MG5 case summary | 2-3 |
MG6C disclosure schedule | 4 |
Officer statement | 5 |
Co-defendant interview summary | 6 |
Exhibit list | 7 |
Court listing | 8 |${indexExtra}

=== SECTION: CHARGE ===

R v ${p.defendant}

Statement of Offence:
Burglary in a dwelling, contrary to section 9(1)(b) of the Theft Act 1968.

Particulars of Offence:
On 4 January 2026 at 14 Lane End burgled a dwelling and stole property therein.

=== SECTION: MG5 ===

MG05 — OFFENCE REPORT

URN: ${p.urn}
Officer in case: ${p.officer}

Headline Summary
Co-defendant ${p.coDefendant} interview summary is served for segregation only. ${p.defendant} interview summary, audio, and transcript are outstanding.

=== SECTION: MG6 ===

MG6C — UNUSED MATERIAL SCHEDULE

MG6C/INT/01 — Co-defendant ${p.coDefendant} interview summary — served — other defendant only.
MG6C/INT/02 — ${p.defendant} interview summary — outstanding — not on bundle.
MG6C/INT/03 — ${p.defendant} interview audio — outstanding.
MG6C/INT/04 — ${p.defendant} interview transcript — outstanding.
MG6C/INT/05 — Co-defendant attribution/continuity — outstanding.

=== SECTION: OFFICER_STMT ===

OFFICER STATEMENT — ${p.officer}

Co-defendant interview summary for ${p.coDefendant} is served. Target defendant ${p.defendant} interview material is NOT served. Do not import co-defendant account into target defendant position.

=== SECTION: CO_DEF_INTERVIEW ===

CO-DEFENDANT INTERVIEW SUMMARY — ${p.coDefendant} ONLY

Interview date: 10/01/2026
Defendant interviewed: ${p.coDefendant} (NOT ${p.defendant})
Summary served for segregation. Target defendant interview outstanding per MG6C/INT/02.

=== SECTION: EXHIBIT_LIST ===

EXHIBIT LIST — R v ${p.defendant}

INT/01 — Co-defendant interview summary (${p.coDefendant}) — SERVED — page 6 — OTHER DEFENDANT ONLY
INT/02 — ${p.defendant} interview — NOT SERVED

=== SECTION: LISTING ===

PTPH — 12 November 2026, ${p.court}.
`;
}

export function coDefBurglaryTruthKey(
  caseId: string,
  title: string,
  defendant: string,
  coDefendant: string,
): EvidenceStateTruthKey {
  return {
    caseId,
    title,
    offenceFamily: "burglary_dwelling",
    offenceWording: "Burglary in a dwelling, contrary to section 9(1)(b) of the Theft Act 1968",
    profile: "needs_review",
    bundleStatus: "pdf_backed_demo",
    proofChainMode: "pdf_backed_controlled",
    evidenceItems: [
      { evidence_item: "charge sheet", evidence_type: "charge", correct_evidence_state: "served", chase_needed: false, safe_to_rely_on: true },
      { evidence_item: "mg5", evidence_type: "mg5", correct_evidence_state: "served", chase_needed: false, safe_to_rely_on: true },
      { evidence_item: "mg6", evidence_type: "mg6", correct_evidence_state: "served", chase_needed: false, safe_to_rely_on: true },
      { evidence_item: "officer statement", evidence_type: "mg11", correct_evidence_state: "served", chase_needed: false, safe_to_rely_on: true },
      { evidence_item: `co-defendant ${coDefendant} interview summary`, evidence_type: "interview", correct_evidence_state: "other_defendant_only", source_page_anchor: "6", defendant_relevance: "co_defendant", chase_needed: false, safe_to_rely_on: false, must_not_say: [`${defendant} said`, "defendant admitted"] },
      { evidence_item: `${defendant} interview summary`, evidence_type: "interview", correct_evidence_state: "missing", defendant_relevance: "primary_defendant", chase_needed: true, safe_to_rely_on: false },
      { evidence_item: `${defendant} interview audio`, evidence_type: "interview", correct_evidence_state: "missing", chase_needed: true, safe_to_rely_on: false },
      { evidence_item: `${defendant} interview transcript`, evidence_type: "interview", correct_evidence_state: "missing", chase_needed: true, safe_to_rely_on: false },
      { evidence_item: "co-defendant attribution/continuity", evidence_type: "interview", correct_evidence_state: "missing", chase_needed: true, safe_to_rely_on: false },
    ],
    expectedChaseItems: ["target defendant interview summary", "target defendant interview audio", "target defendant interview transcript", "co-defendant attribution/continuity"],
    expectedSendability: "provisional_check_source",
    mustNotSayGlobal: [`${defendant} admitted`, "import co-defendant interview", "BWV shows"],
    blockingFailPatterns: [`${defendant} said in interview`],
  };
}

export type EncroBundleParams = {
  defendant: string;
  urn: string;
  court: string;
  officer: string;
  handle: string;
  exhibitPrefix: string;
  countyLines?: boolean;
};

export function buildEncroDrugsBundle(p: EncroBundleParams): string {
  const ep = p.exhibitPrefix;
  return `RESTRICTED — PROSECUTION DISCLOSURE BUNDLE

URN: ${p.urn}
Defendant: ${p.defendant}
Court: ${p.court}

=== SECTION: COVER_INDEX ===

INDEX

Document | Pages | Note
Charge sheet | 1 |
MG5 case summary | 2-3 |
MG6C disclosure schedule | 4 |
Officer statement | 5 |
Encro message extracts | 6-7 |
Exhibit list | 8 |
Court listing | 9 |

=== SECTION: CHARGE ===

R v ${p.defendant}

Statement of Offence:
Being concerned in the supply of a controlled drug of Class A, namely cocaine, contrary to section 4(2)(b) of the Misuse of Drugs Act 1971.

Particulars of Offence:
Between 1 November 2025 and 28 February 2026 were concerned in the supply of cocaine to others${p.countyLines ? " as part of a county-lines network" : ""}.

=== SECTION: MG5 ===

MG05 — OFFENCE REPORT

URN: ${p.urn}
Officer in case: ${p.officer}

Headline Summary
Encro-style message extracts are served. Handle ${p.handle} appears in thread. Mapping of handle/phone to ${p.defendant} is not proved on current papers. Platform extraction, attribution report, subscriber data, and device continuity are outstanding.

Chronological summary
11/2025 — Operation targeting county-lines network on Encro-style platform.
01/2026 — Message extracts obtained; schedule served as ${ep}/MSG/01.
02/2026 — ${p.defendant} arrested; handset seized; full download not on bundle.
02/2026 — MG6C updated: platform extraction referred; handle attribution report outstanding.

Evidence on file (served)
Charge sheet; MG5; MG6C; officer statement; message extracts ${ep}/MSG/01; exhibit list.

Evidence referred or outstanding
Platform/source extraction; handle attribution report; subscriber/account data; device continuity; full download/export.

=== SECTION: MG6 ===

MG6C — UNUSED MATERIAL SCHEDULE

MG6C/ENC/01 — Encro message extracts ${ep}/MSG/01 — served on bundle.
MG6C/ENC/02 — Platform/source extraction — referred — export not attached.
MG6C/ENC/03 — Handle attribution report (${p.handle}) — outstanding — not on bundle.
MG6C/ENC/04 — Subscriber/account data — outstanding.
MG6C/ENC/05 — Device continuity — outstanding.
MG6C/ENC/06 — Co-defendant material — outstanding — segregate per defendant.
MG6C/ENC/07 — Full download/export — outstanding.

=== SECTION: OFFICER_STMT ===

OFFICER STATEMENT — ${p.officer}

1. This case concerns an Encro-style messaging platform.

2. Message extracts ${ep}/MSG/01 are served on the bundle. Handle ${p.handle} appears in the thread.

3. A handle attribution report linking ${p.handle} or the associated handset to ${p.defendant} is NOT served (MG6C/ENC/03 outstanding).

4. Platform extraction and subscriber data are outstanding. Without served attribution material, the defence cannot safely treat the handle or phone reference as proof of ${p.defendant}'s role.

=== SECTION: MESSAGE_EXTRACTS ===

EXHIBIT ${ep}/MSG/01 — MESSAGE EXTRACTS (served)

Handle: ${p.handle}
Date: 14/01/2026 — "2 on way — usual spot"
Date: 22/01/2026 — "Need reload tonight"

Attribution: handle mapping to ${p.defendant} NOT served on bundle.

=== SECTION: EXHIBIT_LIST ===

EXHIBIT LIST — R v ${p.defendant}

${ep}/MSG/01 — Message extracts — SERVED — pages 6-7
ENC/03 — Handle attribution report — NOT SERVED

=== SECTION: LISTING ===

Plea and trial preparation — 20 January 2027, ${p.court}.
`;
}

export function encroDrugsTruthKey(caseId: string, title: string, defendant: string): EvidenceStateTruthKey {
  return {
    caseId,
    title,
    offenceFamily: "drugs_supply",
    offenceWording: "Being concerned in the supply of a controlled drug of Class A, contrary to section 4(2)(b) of the Misuse of Drugs Act 1971",
    profile: "needs_review",
    bundleStatus: "pdf_backed_demo",
    proofChainMode: "pdf_backed_controlled",
    evidenceItems: [
      { evidence_item: "charge sheet", evidence_type: "charge", correct_evidence_state: "served", chase_needed: false, safe_to_rely_on: true },
      { evidence_item: "mg5", evidence_type: "mg5", correct_evidence_state: "served", chase_needed: false, safe_to_rely_on: true },
      { evidence_item: "mg6", evidence_type: "mg6", correct_evidence_state: "served", chase_needed: false, safe_to_rely_on: true },
      { evidence_item: "message extracts", evidence_type: "encro", correct_evidence_state: "served", source_page_anchor: "6", chase_needed: false, safe_to_rely_on: false },
      { evidence_item: "officer statement", evidence_type: "mg11", correct_evidence_state: "served", chase_needed: false, safe_to_rely_on: true },
      { evidence_item: "platform/source extraction", evidence_type: "encro", correct_evidence_state: "referred_only", chase_needed: true, safe_to_rely_on: false },
      { evidence_item: "handle attribution report", evidence_type: "encro", correct_evidence_state: "missing", chase_needed: true, safe_to_rely_on: false },
      { evidence_item: "subscriber/account data", evidence_type: "encro", correct_evidence_state: "missing", chase_needed: true, safe_to_rely_on: false },
      { evidence_item: "device continuity", evidence_type: "encro", correct_evidence_state: "missing", chase_needed: true, safe_to_rely_on: false },
      {
        evidence_item: "co-defendant material",
        evidence_type: "encro",
        correct_evidence_state: "missing",
        defendant_relevance: "co_defendant",
        chase_needed: true,
        safe_to_rely_on: false,
      },
      { evidence_item: "handle/phone attribution", evidence_type: "encro", correct_evidence_state: "not_safely_confirmed", chase_needed: true, safe_to_rely_on: false, must_not_say: [`${defendant} is the handle`, "handle proves"] },
    ],
    expectedChaseItems: [
      "platform/source extraction",
      "handle attribution report",
      "subscriber/account data",
      "device continuity",
    ],
    expectedSendability: "provisional_check_source",
    mustNotSayGlobal: [
      "handle proves defendant",
      `${defendant} is the handle`,
      "phone proves role",
      "BWV shows",
      "CCTV proves",
    ],
    blockingFailPatterns: ["handle proves", "guaranteed supply"],
  };
}

export type FraudBundleParams = {
  defendant: string;
  urn: string;
  court: string;
  officer: string;
  exhibitPrefix: string;
  withSubscriber?: boolean;
};

export function buildFraudBankBundle(p: FraudBundleParams): string {
  const ep = p.exhibitPrefix;
  const subLines = p.withSubscriber
    ? `\nMG6C/FRD/05 — Subscriber/account data for linked handset — outstanding — not on bundle.`
    : "";

  return `RESTRICTED — PROSECUTION DISCLOSURE BUNDLE

URN: ${p.urn}
Defendant: ${p.defendant}
Court: ${p.court}

=== SECTION: COVER_INDEX ===

INDEX

Document | Pages | Note
Charge sheet | 1 |
MG5 case summary | 2-3 |
MG6C disclosure schedule | 4 |
Officer statement | 5 |
Bank statement summaries | 6-7 |
Exhibit list | 8 |
Court listing | 9 |

=== SECTION: CHARGE ===

R v ${p.defendant}

Statement of Offence:
Fraud by false representation, contrary to section 1 of the Fraud Act 2006.

Particulars of Offence:
Between 1 May 2025 and 30 September 2025 dishonestly made false representations to obtain money from victims.

=== SECTION: MG5 ===

MG05 — OFFENCE REPORT

URN: ${p.urn}
Officer in case: ${p.officer}

Headline Summary
Bank statement summaries are served showing account movements. Full transaction export, source banking records, and beneficiary tracing are outstanding.

=== SECTION: MG6 ===

MG6C — UNUSED MATERIAL SCHEDULE

MG6C/FRD/01 — Bank statement summaries ${ep}/BNK/01 — served on bundle.
MG6C/FRD/02 — Full transaction export — outstanding — not on bundle.
MG6C/FRD/03 — Source banking records — outstanding.
MG6C/FRD/04 — Beneficiary tracing report — referred — not attached.${subLines}

=== SECTION: OFFICER_STMT ===

OFFICER STATEMENT — ${p.officer}

Bank summaries ${ep}/BNK/01 are served. Full transaction export and source records are NOT on bundle. Account attribution to ${p.defendant} requires outstanding tracing material.

=== SECTION: BANK_RECORDS ===

EXHIBIT ${ep}/BNK/01 — BANK STATEMENT SUMMARIES (served)

Account reference: ****4821 (summary pages only)
Period: May–September 2025
Note: Summaries served. Full export and native banking records outstanding per MG6C/FRD/02–03.

=== SECTION: EXHIBIT_LIST ===

EXHIBIT LIST — R v ${p.defendant}

${ep}/BNK/01 — Bank statement summaries — SERVED — pages 6-7
FRD/02 — Full transaction export — NOT SERVED

=== SECTION: LISTING ===

Case management — 8 March 2027, ${p.court}.
`;
}

export function fraudBankTruthKey(caseId: string, title: string, withSubscriber?: boolean): EvidenceStateTruthKey {
  const items = [
    { evidence_item: "charge sheet", evidence_type: "charge", correct_evidence_state: "served" as const, chase_needed: false, safe_to_rely_on: true },
    { evidence_item: "mg5", evidence_type: "mg5", correct_evidence_state: "served" as const, chase_needed: false, safe_to_rely_on: true },
    { evidence_item: "mg6", evidence_type: "mg6", correct_evidence_state: "served" as const, chase_needed: false, safe_to_rely_on: true },
    { evidence_item: "bank statement summaries", evidence_type: "financial", correct_evidence_state: "served" as const, source_page_anchor: "6", chase_needed: false, safe_to_rely_on: false },
    { evidence_item: "officer statement", evidence_type: "mg11", correct_evidence_state: "served" as const, chase_needed: false, safe_to_rely_on: true },
    { evidence_item: "full transaction export", evidence_type: "financial", correct_evidence_state: "missing" as const, chase_needed: true, safe_to_rely_on: false },
    { evidence_item: "source banking records", evidence_type: "financial", correct_evidence_state: "missing" as const, chase_needed: true, safe_to_rely_on: false },
    { evidence_item: "beneficiary tracing report", evidence_type: "financial", correct_evidence_state: "referred_only" as const, chase_needed: true, safe_to_rely_on: false },
  ];
  if (withSubscriber) {
    items.push({ evidence_item: "subscriber/account data", evidence_type: "phone_digital", correct_evidence_state: "missing", chase_needed: true, safe_to_rely_on: false });
  }
  return {
    caseId,
    title,
    offenceFamily: "fraud_financial",
    offenceWording: "Fraud by false representation, contrary to section 1 of the Fraud Act 2006",
    profile: "needs_review",
    bundleStatus: "pdf_backed_demo",
    proofChainMode: "pdf_backed_controlled",
    evidenceItems: items,
    expectedChaseItems: withSubscriber
      ? ["full transaction export", "source banking records", "beneficiary tracing report", "subscriber/account data"]
      : ["full transaction export", "source banking records", "beneficiary tracing report"],
    expectedSendability: "provisional_check_source",
    mustNotSayGlobal: ["fraud proved from summaries alone", "BWV shows", "CCTV proves"],
    blockingFailPatterns: ["guaranteed fraud"],
  };
}

export type MotoringBundleParams = {
  defendant: string;
  urn: string;
  court: string;
  officer: string;
  breathVariant?: boolean;
};

export function buildMotoringBundle(p: MotoringBundleParams): string {
  return `RESTRICTED — PROSECUTION DISCLOSURE BUNDLE

URN: ${p.urn}
Defendant: ${p.defendant}
Court: ${p.court}

=== SECTION: COVER_INDEX ===

INDEX

Document | Pages | Note
Charge sheet | 1 |
MG5 case summary | 2-3 |
MG6C disclosure schedule | 4 |
Officer MG11 | 5 |
Breath/device procedure summary | 6 |
Court listing | 7 |

=== SECTION: CHARGE ===

R v ${p.defendant}

Statement of Offence:
${p.breathVariant ? "Drive motor vehicle with alcohol concentration above limit, contrary to section 5(1)(a) of the Road Traffic Act 1988." : "Fail to provide driver details, contrary to section 172(2) of the Road Traffic Act 1988."}

Particulars of Offence:
On 6 June 2026 at ${p.court.replace(" Court", "")} ${p.breathVariant ? "drove a motor vehicle on a road after consuming alcohol in excess of the prescribed limit." : "failed to provide driver details following a request under section 172."}

=== SECTION: MG5 ===

MG05 — OFFENCE REPORT

URN: ${p.urn}
Officer in case: ${p.officer}

Headline Summary
${p.breathVariant ? "Breath procedure summary served. Device calibration, full intoxilyser record, and CCTV/dashcam export are outstanding." : "Thin SJP file: charge and officer account served. Driver identity, device records, and CCTV export remain provisional."}

=== SECTION: MG6 ===

MG6C — UNUSED MATERIAL SCHEDULE

MG6C/MOT/01 — Officer MG11 — served.
MG6C/MOT/02 — Breath/device procedure summary — served (summary only).
MG6C/MOT/03 — Device calibration certificate — outstanding.
MG6C/MOT/04 — Full intoxilyser record — outstanding.
MG6C/MOT/05 — CCTV/dashcam export — referred — not attached.
MG6C/MOT/06 — Collision/medical expert — outstanding if relied upon.

=== SECTION: MG11 ===

MG11 — OFFICER STATEMENT (${p.officer})

1. ${p.breathVariant ? "I conducted a roadside breath test and station procedure." : "I requested driver details following an alleged motoring offence."}
2. Procedure summary is served. Full device calibration and native export records are NOT on bundle.

=== SECTION: BREATH_PROCEDURE ===

BREATH / DEVICE PROCEDURE SUMMARY (served extract only)

Device: Intoxilyser reference on summary
Result on summary: ${p.breathVariant ? "42 µg/100ml breath (summary page only)" : "N/A — s172 matter"}
Calibration certificate: outstanding MG6C/MOT/03
Full intoxilyser record: outstanding MG6C/MOT/04

=== SECTION: LISTING ===

Single justice procedure / first hearing — 14 July 2026, ${p.court}.
`;
}

export function motoringTruthKey(caseId: string, title: string, breathVariant?: boolean): EvidenceStateTruthKey {
  return {
    caseId,
    title,
    offenceFamily: "motoring_road_traffic",
    offenceWording: breathVariant
      ? "Drive with excess alcohol, contrary to section 5(1)(a) of the Road Traffic Act 1988"
      : "Fail to provide driver details, contrary to section 172(2) of the Road Traffic Act 1988",
    profile: "needs_review",
    bundleStatus: "pdf_backed_demo",
    proofChainMode: "pdf_backed_controlled",
    evidenceItems: [
      { evidence_item: "charge sheet", evidence_type: "charge", correct_evidence_state: "served", chase_needed: false, safe_to_rely_on: true },
      { evidence_item: "mg5", evidence_type: "mg5", correct_evidence_state: "served", chase_needed: false, safe_to_rely_on: true },
      { evidence_item: "mg6", evidence_type: "mg6", correct_evidence_state: "served", chase_needed: false, safe_to_rely_on: true },
      { evidence_item: "officer MG11", evidence_type: "mg11", correct_evidence_state: "served", chase_needed: false, safe_to_rely_on: false },
      { evidence_item: "breath/device procedure summary", evidence_type: "device", correct_evidence_state: "served", source_page_anchor: "6", chase_needed: false, safe_to_rely_on: false },
      { evidence_item: "device calibration certificate", evidence_type: "device", correct_evidence_state: "missing", chase_needed: true, safe_to_rely_on: false },
      { evidence_item: "full intoxilyser record", evidence_type: "device", correct_evidence_state: "missing", chase_needed: true, safe_to_rely_on: false },
      { evidence_item: "cctv/dashcam export", evidence_type: "cctv", correct_evidence_state: "referred_only", chase_needed: true, safe_to_rely_on: false },
    ],
    expectedChaseItems: ["device calibration certificate", "full intoxilyser record", "cctv/dashcam export"],
    expectedSendability: "provisional_check_source",
    mustNotSayGlobal: ["Do not treat device summary as proof of reliability", "BWV shows"],
    blockingFailPatterns: ["guaranteed conviction", "device reliability proved"],
  };
}

export type SexualBundleParams = {
  defendant: string;
  urn: string;
  court: string;
  officer: string;
  complainant: string;
};

export function buildSexualAbeBundle(p: SexualBundleParams): string {
  return `RESTRICTED — PROSECUTION DISCLOSURE BUNDLE

URN: ${p.urn}
Defendant: ${p.defendant}
Court: ${p.court}

=== SECTION: COVER_INDEX ===

INDEX

Document | Pages | Note
Charge sheet | 1 |
MG5 case summary | 2-3 |
MG6C disclosure schedule | 4 |
Complainant MG11 (draft) | 5-6 |
ABE interview note | 7 |
Exhibit list | 8 |
Court listing | 9 |

=== SECTION: CHARGE ===

R v ${p.defendant}

Statement of Offence:
Sexual assault, contrary to section 3 of the Sexual Offences Act 2003.

Particulars of Offence:
On a date between 1 January 2018 and 31 December 2019 sexually assaulted ${p.complainant}.

=== SECTION: MG5 ===

MG05 — OFFENCE REPORT

URN: ${p.urn}
Officer in case: ${p.officer}

Headline Summary
Historic allegation. Draft complainant MG11 served. ABE interview video and transcript are referred on MG6C but NOT attached. Third-party counselling notes outstanding.

=== SECTION: MG6 ===

MG6C — UNUSED MATERIAL SCHEDULE

MG6C/SX/01 — Complainant MG11 (draft) — served unsigned.
MG6C/SX/02 — ABE interview video — referred — not attached.
MG6C/SX/03 — ABE interview transcript — outstanding.
MG6C/SX/04 — Third-party counselling notes — outstanding.
MG6C/SX/05 — Final signed MG11 — outstanding.

=== SECTION: MG11 ===

MG11 — COMPLAINANT STATEMENT (draft unsigned)

I am ${p.complainant}. I make this statement about historic allegations against ${p.defendant}.

I participated in an ABE interview. I have not been provided the served video on this bundle. Final signed statement outstanding.

=== SECTION: ABE_NOTE ===

ABE INTERVIEW NOTE (reference only)

Interview date: 15/02/2026
Interview reference: ABE/${p.urn}/01
Status: Referred on MG6C/SX/02 — video NOT attached to bundle.
Transcript: outstanding MG6C/SX/03.

=== SECTION: EXHIBIT_LIST ===

EXHIBIT LIST — R v ${p.defendant}

SX/01 — Draft complainant MG11 — SERVED unsigned
SX/02 — ABE interview video — REFERRED ONLY — not attached

=== SECTION: LISTING ===

Case management — 2 April 2027, ${p.court}.
`;
}

export function sexualAbeTruthKey(caseId: string, title: string): EvidenceStateTruthKey {
  return {
    caseId,
    title,
    offenceFamily: "sexual_offences",
    offenceWording: "Sexual assault, contrary to section 3 of the Sexual Offences Act 2003",
    profile: "needs_review",
    bundleStatus: "pdf_backed_demo",
    proofChainMode: "pdf_backed_controlled",
    evidenceItems: [
      { evidence_item: "charge sheet", evidence_type: "charge", correct_evidence_state: "served", chase_needed: false, safe_to_rely_on: true },
      { evidence_item: "mg5", evidence_type: "mg5", correct_evidence_state: "served", chase_needed: false, safe_to_rely_on: true },
      { evidence_item: "mg6", evidence_type: "mg6", correct_evidence_state: "served", chase_needed: false, safe_to_rely_on: true },
      { evidence_item: "complainant MG11", evidence_type: "mg11", correct_evidence_state: "incomplete", chase_needed: true, safe_to_rely_on: false },
      { evidence_item: "ABE interview video", evidence_type: "abe", correct_evidence_state: "referred_only", chase_needed: true, safe_to_rely_on: false },
      { evidence_item: "ABE interview transcript", evidence_type: "abe", correct_evidence_state: "missing", chase_needed: true, safe_to_rely_on: false },
      { evidence_item: "third-party counselling notes", evidence_type: "mg11", correct_evidence_state: "missing", chase_needed: true, safe_to_rely_on: false },
      { evidence_item: "final signed MG11", evidence_type: "mg11", correct_evidence_state: "missing", chase_needed: true, safe_to_rely_on: false },
    ],
    expectedChaseItems: ["ABE interview video", "ABE interview transcript", "final signed MG11", "third-party counselling notes"],
    expectedSendability: "provisional_check_source",
    mustNotSayGlobal: ["ABE proves guilt", "complainant proved", "BWV shows"],
    blockingFailPatterns: ["guaranteed conviction"],
  };
}

export type YouthBundleParams = {
  defendant: string;
  urn: string;
  court: string;
  officer: string;
  yjsVariant?: boolean;
};

export function buildYouthBundle(p: YouthBundleParams): string {
  return `RESTRICTED — PROSECUTION DISCLOSURE BUNDLE

URN: ${p.urn}
Defendant: ${p.defendant} (youth — 17 years)
Court: ${p.court}

=== SECTION: COVER_INDEX ===

INDEX

Document | Pages | Note
Charge sheet | 1 |
MG5 case summary | 2-3 |
MG6C disclosure schedule | 4 |
Officer statement | 5 |
YJS report extract | 6 |
Appropriate adult note | 7 |
Court listing | 8 |

=== SECTION: CHARGE ===

R v ${p.defendant}

Statement of Offence:
Theft from a shop, contrary to section 1(1) and 7(1) of the Theft Act 1968.

Particulars of Offence:
On 20 May 2026 stole goods belonging to a retailer.

=== SECTION: MG5 ===

MG05 — OFFENCE REPORT

URN: ${p.urn}
Officer in case: ${p.officer}

Headline Summary
Youth defendant. YJS report extract served. Full YJS pre-sentence report, vulnerability assessment, and youth interview audio remain outstanding or referred only.

=== SECTION: MG6 ===

MG6C — UNUSED MATERIAL SCHEDULE

MG6C/YTH/01 — Officer statement — served.
MG6C/YTH/02 — YJS report extract — served (partial).
MG6C/YTH/03 — Full YJS pre-sentence report — outstanding.
MG6C/YTH/04 — Vulnerability assessment — ${p.yjsVariant ? "referred — not attached" : "outstanding"}.
MG6C/YTH/05 — Youth interview audio — outstanding.
MG6C/YTH/06 — Appropriate adult continuity — served note only.

=== SECTION: OFFICER_STMT ===

OFFICER STATEMENT — ${p.officer}

Youth defendant arrested with appropriate adult present. YJS extract served. Full YJS PSR and vulnerability material NOT on bundle.

=== SECTION: YJS_REPORT ===

YJS REPORT EXTRACT (served partial)

YJS reference: YJS/${p.urn}/01
Extract pages served. Full pre-sentence report outstanding per MG6C/YTH/03.

=== SECTION: AA_NOTE ===

APPROPRIATE ADULT NOTE

Appropriate adult present at station. Full interview audio outstanding MG6C/YTH/05.

=== SECTION: LISTING ===

Youth court — 16 June 2026, ${p.court}.
`;
}

export function youthTruthKey(caseId: string, title: string, yjsVariant?: boolean): EvidenceStateTruthKey {
  return {
    caseId,
    title,
    offenceFamily: "youth_court",
    offenceWording: "Theft from a shop, contrary to section 1(1) and 7(1) of the Theft Act 1968",
    profile: "needs_review",
    bundleStatus: "pdf_backed_demo",
    proofChainMode: "pdf_backed_controlled",
    evidenceItems: [
      { evidence_item: "charge sheet", evidence_type: "charge", correct_evidence_state: "served", chase_needed: false, safe_to_rely_on: true },
      { evidence_item: "mg5", evidence_type: "mg5", correct_evidence_state: "served", chase_needed: false, safe_to_rely_on: true },
      { evidence_item: "mg6", evidence_type: "mg6", correct_evidence_state: "served", chase_needed: false, safe_to_rely_on: true },
      { evidence_item: "officer statement", evidence_type: "mg11", correct_evidence_state: "served", chase_needed: false, safe_to_rely_on: true },
      { evidence_item: "YJS report extract", evidence_type: "yjs", correct_evidence_state: "served", source_page_anchor: "6", chase_needed: false, safe_to_rely_on: false },
      { evidence_item: "full YJS pre-sentence report", evidence_type: "yjs", correct_evidence_state: "missing", chase_needed: true, safe_to_rely_on: false },
      { evidence_item: "vulnerability assessment", evidence_type: "yjs", correct_evidence_state: yjsVariant ? "referred_only" : "missing", chase_needed: true, safe_to_rely_on: false },
      { evidence_item: "youth interview audio", evidence_type: "interview", correct_evidence_state: "missing", chase_needed: true, safe_to_rely_on: false },
    ],
    expectedChaseItems: ["full YJS pre-sentence report", "vulnerability assessment", "youth interview audio"],
    expectedSendability: "provisional_check_source",
    mustNotSayGlobal: ["youth guilt proved", "BWV shows", "full interview shows"],
    blockingFailPatterns: ["guaranteed conviction"],
  };
}
