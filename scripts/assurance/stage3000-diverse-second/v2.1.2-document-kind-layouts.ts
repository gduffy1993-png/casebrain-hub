/**
 * V2.1.2 document-kind-specific fictional PDF page builders + PDFKit renderers.
 * NO universal single layout. Uses only node:crypto / node:fs / node:path.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export type PageSpec = {
  pageIndex: number;
  pageIdentity: string;
  purpose: string;
  text: string;
  textHash: string;
  headings: string[];
  layoutKind: string;
};

export type DocSpec = {
  docId: string;
  title: string;
  kind: string;
  state: string;
  pages: PageSpec[];
  contentHash: string;
  realPaginatedFile: boolean;
  privilegeSeparated?: boolean;
  publicTemplateRef?: string;
};

export type PublicTemplateEntry = {
  publicStructure: string;
  referenceNote: string;
  informedByUrlHint: string;
};

export function sha(s: string | Buffer): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export function isAbsentState(state: string): boolean {
  return /^(missing|referred_only|absent)$/i.test(state) || /missing_referred/i.test(state);
}

export const PUBLIC_TEMPLATE_MAP: Record<string, PublicTemplateEntry> = {
  written_charge: {
    publicStructure:
      "Written charge / requisition — offence statement, particulars, defendant identity block, court venue, return date.",
    referenceNote:
      "Informed by Criminal Procedure Rules forms catalogue (written charge / requisition structure).",
    informedByUrlHint: "https://www.gov.uk/guidance/criminal-procedure-rules-forms",
  },
  indictment: {
    publicStructure:
      "Indictment — count header, STATEMENT OF OFFENCE, PARTICULARS OF OFFENCE, multi-count table where applicable.",
    referenceNote: "Informed by Crown Court indictment practice and CPR indictment form structure.",
    informedByUrlHint: "https://www.gov.uk/guidance/criminal-procedure-rules-forms",
  },
  mg05: {
    publicStructure:
      "MG5 case summary — defendant/complainant headers, offence summary, key evidence narrative, witness outline, limitations.",
    referenceNote: "Informed by Home Office Manual of Guidance MG forms / national file standard (MG5).",
    informedByUrlHint:
      "https://www.gov.uk/government/publications/manual-of-guidance-and-mg-forms/criminal-casefiles-forms-standards-and-file-structure-accessible",
  },
  mg06: {
    publicStructure:
      "MG6 file front sheet / index — multi-column inventory of papers with status (served / referred / absent).",
    referenceNote: "Informed by MG6 national file front-sheet / index conventions.",
    informedByUrlHint:
      "https://www.gov.uk/government/publications/manual-of-guidance-and-mg-forms/criminal-casefiles-forms-standards-and-file-structure-accessible",
  },
  mg06c: {
    publicStructure:
      "MG6C unused material schedule — schedule number, description, disclosure decision columns.",
    referenceNote: "Informed by MG6C unused schedule structure and CPS Disclosure Manual.",
    informedByUrlHint: "https://www.cps.gov.uk/prosecution-guidance/disclosure-manual",
  },
  mg11_statement: {
    publicStructure:
      "MG11 witness statement — declaration, personal particulars boxes, numbered statement paragraphs, signature block.",
    referenceNote: "Informed by MG11 witness statement form structure (Manual of Guidance).",
    informedByUrlHint:
      "https://www.gov.uk/government/publications/manual-of-guidance-and-mg-forms/criminal-casefiles-forms-standards-and-file-structure-accessible",
  },
  mg11_continuation: {
    publicStructure:
      "MG11 continuation sheet — carries statement URN/page continuation of an existing MG11 page 1; numbered paragraphs only.",
    referenceNote: "Informed by MG11 continuation conventions; must not exist without a statement first page.",
    informedByUrlHint:
      "https://www.gov.uk/government/publications/manual-of-guidance-and-mg-forms/criminal-casefiles-forms-standards-and-file-structure-accessible",
  },
  custody_record: {
    publicStructure:
      "Custody record extract — timed detention events, rights, reviews, authorising officer columns.",
    referenceNote: "Informed by PACE custody record structural fields commonly disclosed in case files.",
    informedByUrlHint:
      "https://www.gov.uk/guidance/criminal-procedure-rules-2025-and-criminal-practice-directions-2023",
  },
  interview_record: {
    publicStructure:
      "Interview / MG15-style record — tape/URN identifiers, caution, Q&A or summary blocks, exhibits produced.",
    referenceNote: "Informed by MG15 interview record structure in Manual of Guidance.",
    informedByUrlHint:
      "https://www.gov.uk/government/publications/manual-of-guidance-and-mg-forms/criminal-casefiles-forms-standards-and-file-structure-accessible",
  },
  media_schedule: {
    publicStructure:
      "Media / BWV / CCTV clip schedule — clip id, source location, start/end, served-vs-master columns.",
    referenceNote:
      "Informed by digital material disclosure practice (CPS Disclosure Manual Ch.30) and Common Platform media sections.",
    informedByUrlHint:
      "https://www.cps.gov.uk/prosecution-guidance/disclosure-manual-chapter-30-digital-material",
  },
  master_clip_schedule: {
    publicStructure:
      "Master-versus-clip continuity schedule — master ref, clip extracts, hash/path placeholders, absence markers.",
    referenceNote: "Informed by digital material / continuity disclosure expectations; masters may be referred-only.",
    informedByUrlHint:
      "https://www.cps.gov.uk/prosecution-guidance/disclosure-manual-chapter-30-digital-material",
  },
  phone_download_schedule: {
    publicStructure:
      "Phone / download / message schedule — device, extraction method, attribution columns, message/call rows.",
    referenceNote: "Informed by CPS digital material disclosure structure for device extractions.",
    informedByUrlHint:
      "https://www.cps.gov.uk/prosecution-guidance/disclosure-manual-chapter-30-digital-material",
  },
  disclosure_schedule: {
    publicStructure: "Disclosure schedule — item id, description, service state, sensitivity/PII flags.",
    referenceNote: "Informed by CPS Disclosure Manual schedule practice.",
    informedByUrlHint: "https://www.cps.gov.uk/prosecution-guidance/disclosure-manual",
  },
  unused_schedule: {
    publicStructure: "Unused material schedule — schedule refs, brief description, relevance/disclosure decision.",
    referenceNote: "Informed by unused schedule / MG6C practice and Disclosure Manual.",
    informedByUrlHint: "https://www.cps.gov.uk/prosecution-guidance/disclosure-manual",
  },
  forensic_report: {
    publicStructure: "Streamlined / forensic report — exhibit refs, methods limits, findings, SFR caveats.",
    referenceNote: "Informed by Forensic Science Regulator code structure and SFR limits practice.",
    informedByUrlHint:
      "https://www.gov.uk/government/publications/forensic-science-activities-statutory-code-of-practice-version-2",
  },
  medical_report: {
    publicStructure:
      "Medical report extract — clinician header, examination findings, opinion limits, confidentiality banner.",
    referenceNote: "Informed by typical disclosed medical report sectioning used in criminal case files.",
    informedByUrlHint:
      "https://www.gov.uk/government/publications/add-case-documents-to-the-crown-court-digital-case-system",
  },
  expert_report: {
    publicStructure:
      "Expert report — expertise declaration, instructions, opinion, limitations, CPR Part 19 style headers.",
    referenceNote: "Informed by CPR expert evidence form/structure expectations.",
    informedByUrlHint:
      "https://www.gov.uk/guidance/criminal-procedure-rules-2025-and-criminal-practice-directions-2023",
  },
  abe_record: {
    publicStructure:
      "ABE / visually recorded interview record — interview metadata, special measures note, transcript extract markers.",
    referenceNote: "Informed by Achieving Best Evidence / special measures structural fields in casefile practice.",
    informedByUrlHint: "https://www.cps.gov.uk/prosecution-guidance-library",
  },
  hearing_notice: {
    publicStructure:
      "Hearing notice — court, listing date/time, hearing type, attendance requirements, case identifiers.",
    referenceNote: "Informed by HMCTS listing / hearing notice structural fields.",
    informedByUrlHint:
      "https://www.gov.uk/government/publications/how-to-use-hmcts-common-platform/where-to-add-case-materials",
  },
  court_order: {
    publicStructure: "Court order — court header, parties, operative paragraphs, judge/clerk endorsement block.",
    referenceNote: "Informed by CPR / HMCTS order form structure.",
    informedByUrlHint: "https://www.gov.uk/guidance/criminal-procedure-rules-forms",
  },
  exhibit_schedule: {
    publicStructure:
      "Exhibit / MG12-style list — exhibit number, description, recovered by, location, continuity pointer.",
    referenceNote: "Informed by MG12 exhibit list structure in Manual of Guidance.",
    informedByUrlHint:
      "https://www.gov.uk/government/publications/manual-of-guidance-and-mg-forms/criminal-casefiles-forms-standards-and-file-structure-accessible",
  },
  continuity_record: {
    publicStructure: "Continuity / chain-of-custody record — timed handovers, seal numbers, custodian signatures.",
    referenceNote: "Informed by forensic continuity / exhibit movement practice.",
    informedByUrlHint:
      "https://www.gov.uk/government/publications/forensic-science-activities-statutory-code-of-practice-version-2",
  },
  defence_proof: {
    publicStructure:
      "Defence proof of evidence / privileged working extract — privilege band, instructions position, issues list.",
    referenceNote: "Informed by defence case preparation structural practice; privilege-separated in fictional packs.",
    informedByUrlHint:
      "https://www.gov.uk/guidance/criminal-procedure-rules-2025-and-criminal-practice-directions-2023",
  },
  email_attachment_summary: {
    publicStructure:
      "Email / attachment summary — headers (From/To/Date/Subject), attachment inventory, hash placeholders.",
    referenceNote: "Informed by digital disclosure schedules for native email/attachments.",
    informedByUrlHint:
      "https://www.cps.gov.uk/prosecution-guidance/disclosure-manual-chapter-30-digital-material",
  },
  youth_justice_record: {
    publicStructure: "Youth justice / YOT record extract — age markers, appropriate adult, youth court listing fields.",
    referenceNote: "Informed by youth justice casefile structural fields commonly disclosed.",
    informedByUrlHint:
      "https://www.gov.uk/guidance/criminal-procedure-rules-2025-and-criminal-practice-directions-2023",
  },
  interpreter_record: {
    publicStructure:
      "Interpreter / translation record — language, interpreter identity block, passages interpreted, certificate.",
    referenceNote: "Informed by interpreter/translation certification structures used in criminal proceedings.",
    informedByUrlHint: "https://www.gov.uk/guidance/criminal-procedure-rules-forms",
  },
  welsh_language_record: {
    publicStructure:
      "Welsh-language proceedings record — language preference, bilingual headings, translation status.",
    referenceNote: "Informed by Welsh Language Act / bilingual court document practice in England and Wales.",
    informedByUrlHint:
      "https://www.gov.uk/guidance/criminal-procedure-rules-2025-and-criminal-practice-directions-2023",
  },
  chronology: {
    publicStructure: "Case chronology — dated event rows linking procedure, disclosure and evidence milestones.",
    referenceNote: "Informed by case-preparation chronology practice used across Common Platform / DCS packs.",
    informedByUrlHint:
      "https://www.gov.uk/government/publications/add-case-documents-to-the-crown-court-digital-case-system",
  },
  metadata_fixture: {
    publicStructure: "Media metadata fixture — path/hash/codec/duration fields; native bytes marked not_exercised.",
    referenceNote: "Informed by digital material metadata disclosure practice where natives are unavailable.",
    informedByUrlHint:
      "https://www.cps.gov.uk/prosecution-guidance/disclosure-manual-chapter-30-digital-material",
  },
  generic_specialist: {
    publicStructure:
      "Specialist / residual case document — titled sections appropriate to kind without universal sparse border layout.",
    referenceNote:
      "Fallback structural layout for specialist kinds; still kind-labelled and dense, not the V2.1.1 universal template.",
    informedByUrlHint:
      "https://www.gov.uk/government/publications/manual-of-guidance-and-mg-forms/criminal-casefiles-forms-standards-and-file-structure-accessible",
  },
};

const FICTIONAL_BANNER = "FICTIONAL TEST — NOT AN OPERATIVE DOCUMENT";
const FICTIONAL_FOOTNOTE = "Fictional test material only — not police, CPS, court or solicitor operative paper.";

type MatterCtx = {
  caseId: string;
  family: string;
  familyRaw: string;
  charge: string;
  chargeStatus: string;
  defence: string;
  procedure: string;
  defendants: number;
  missingItems: string[];
  courtHint: string;
};

function humanize(s: string): string {
  return String(s || "").replace(/_/g, " ");
}

function chooseLayoutKind(doc: any, matter: MatterCtx): string {
  const kind = String(doc.kind || "").toLowerCase();
  const title = String(doc.title || "").toLowerCase();
  const id = String(doc.id || "").toLowerCase();
  const fam = matter.familyRaw.toLowerCase();

  if (/missing_referred/.test(kind)) return "generic_specialist";
  if (/written_charge|charge_sheet|sjp|summons/.test(kind)) return "written_charge";
  if (/indictment/.test(kind)) return "indictment";
  if (kind === "mg05" || /^mg5/.test(kind)) return "mg05";
  if (kind === "mg06c" || /mg6c/.test(kind) || (/unused/.test(id + title) && /mg6|disclosure/.test(kind)))
    return "mg06c";
  if (kind === "mg06" || /^mg6(?!c)/.test(kind)) return "mg06";
  if (/disclosure_unused|unused_schedule/.test(kind)) return "unused_schedule";
  if (/disclosure/.test(kind)) return "disclosure_schedule";
  if (/mg11|statement/.test(kind)) return "mg11_statement";
  if (/custody/.test(kind) || /custody/.test(title)) return "custody_record";
  if (/mg15|interview/.test(kind)) return "interview_record";
  if (/metadata/.test(kind)) return "metadata_fixture";
  if (/media_schedule/.test(kind) || (/cctv|bwv/.test(kind + id + title) && /schedule|media/.test(kind + id))) {
    if (/master/.test(id + title)) return "master_clip_schedule";
    return "media_schedule";
  }
  if (/digital_schedule|phone_download|phone|download/.test(kind) || /phone|download/.test(id + title))
    return "phone_download_schedule";
  if (/mg22|sfr|forensic/.test(kind)) return "forensic_report";
  if (/medical/.test(kind) || /medical/.test(title)) return "medical_report";
  if (/expert/.test(kind) || /expert/.test(title)) return "expert_report";
  if (/abe|special_measures|abe_sm/.test(kind)) return "abe_record";
  if ((/hearing|listing/.test(kind) || /hearing notice/.test(title)) && !/order/.test(kind)) return "hearing_notice";
  if (/^(order|bail)/.test(kind) || /restraining|protective.?order|bail.?condition/.test(kind + title))
    return "court_order";
  if (/mg12|exhibit/.test(kind)) return "exhibit_schedule";
  if (/continuity|chain.?of.?custody/.test(kind + title)) return "continuity_record";
  if (/defence_proof|defence_statement/.test(kind) || doc.state === "privileged") return "defence_proof";
  if (/email|attachment|eml/.test(kind + title)) return "email_attachment_summary";
  if (/youth|yot|yjs/.test(kind + id + title) || (/youth/.test(fam) && /third_party/.test(kind)))
    return "youth_justice_record";
  if (/interpret|translat/.test(kind + title)) return "interpreter_record";
  if (/welsh|cymraeg/.test(kind + title + fam)) return "welsh_language_record";
  if (/chronology/.test(kind)) return "chronology";
  // Family-informed digital / media fallbacks for residual schedule kinds
  if (/phone|digital|cloud|social|cma|crypto|malicious_communications/.test(fam) && /schedule|digital/.test(kind))
    return "phone_download_schedule";
  if (/cctv|bwv|anpr|media/.test(fam) && /schedule|media|digital/.test(kind)) return "media_schedule";
  if (/sexual|abe|vulnerable/.test(fam) && /abe|special/.test(kind + id)) return "abe_record";
  return "generic_specialist";
}

function pageBudgetFor(layoutKind: string, doc: any, matter: MatterCtx): number {
  const declared = Number(doc.pages);
  const base =
    declared > 0
      ? Math.min(6, Math.max(1, declared))
      : layoutKind === "mg05"
        ? 2
        : layoutKind === "mg11_statement"
          ? 2
          : layoutKind === "interview_record"
            ? 3
            : layoutKind === "indictment" && matter.defendants > 1
              ? 2
              : 1;

  if (layoutKind === "mg11_statement") return Math.min(4, Math.max(1, base));
  if (layoutKind === "written_charge") return matter.defendants > 1 ? 2 : 1;
  if (layoutKind === "mg06" || layoutKind === "hearing_notice" || layoutKind === "metadata_fixture") return 1;
  return Math.min(5, Math.max(1, base));
}

function buildPageSpecs(args: {
  doc: any;
  matter: MatterCtx;
  layoutKind: string;
}): PageSpec[] {
  const { doc, matter, layoutKind } = args;
  const pages: PageSpec[] = [];
  const n = pageBudgetFor(layoutKind, doc, matter);
  const docText = String(doc.text || "").slice(0, 800);

  const push = (layout: string, purpose: string, headings: string[], body: string[]) => {
    const pageIndex = pages.length + 1;
    // MG11 continuation only after a statement first page
    if (layout === "mg11_continuation") {
      if (pages.length === 0 || pages[0].layoutKind !== "mg11_statement") return;
    }
    const text = [
      FICTIONAL_BANNER,
      `Document: ${doc.title}`,
      `Matter family (fictional): ${matter.family}`,
      ...headings.map((h) => `## ${h}`),
      ...body,
      "",
      FICTIONAL_FOOTNOTE,
    ].join("\n");
    pages.push({
      pageIndex,
      pageIdentity: `${doc.id}/page/${pageIndex}`,
      purpose,
      text,
      textHash: sha(text),
      headings,
      layoutKind: layout,
    });
  };

  switch (layoutKind) {
    case "written_charge": {
      push(
        "written_charge",
        "charge_instrument_particulars",
        ["Written charge / requisition", "Statement of offence", "Particulars"],
        [
          `Court / venue (modelled): ${matter.courtHint}`,
          `Defendant count modelled: ${matter.defendants}`,
          `STATEMENT OF OFFENCE`,
          matter.charge,
          `Contrary to the modelled statutory provision for this family.`,
          `Charge wording status: ${matter.chargeStatus}`,
          `PARTICULARS OF OFFENCE`,
          `It is alleged that within the charged window the defendant(s) committed the offence set out above.`,
          `Place and date particularised by reference to the served MG5 narrative and witness papers.`,
          `Procedural stage: ${matter.procedure}.`,
          `Defence position on instructions: ${matter.defence}.`,
          "This instrument is modelled as the charging document for fictional-test purposes only.",
          "Do not treat this summary as proof of the allegation.",
          "Service: modelled with initial disclosure; return date to be fixed by listing office.",
          "Certificate of service and administrative endorsement appear on the rendered form.",
        ],
      );
      if (matter.defendants > 1 && n >= 2) {
        push(
          "written_charge",
          "charge_defendant_allocation",
          ["Defendant allocation table", "Counts"],
          [
            "Count | Defendant index | Allocation note",
            "----- | ---------------- | ---------------",
            ...Array.from({ length: Math.min(matter.defendants, 4) }, (_, i) =>
              `1.${i + 1} | D${i + 1} | Count attribution must remain defendant-specific`,
            ),
            "No cross-defendant bleed is authorised by this fictional instrument.",
          ],
        );
      }
      break;
    }
    case "indictment": {
      push(
        "indictment",
        "indictment_count_particulars",
        ["INDICTMENT", "Count 1 — STATEMENT OF OFFENCE", "PARTICULARS OF OFFENCE"],
        [
          `IN THE CROWN COURT AT [FICTIONAL VENUE]`,
          `THE KING v. [FICTIONAL DEFENDANT]`,
          "",
          "COUNT 1",
          "STATEMENT OF OFFENCE",
          matter.charge,
          "Contrary to the modelled statutory provision for this family.",
          "",
          "PARTICULARS OF OFFENCE",
          "The defendant on a date unknown within the charged window, at a place particularised in the served papers, committed the offence alleged in Count 1.",
          "The Crown relies on the served MG5 narrative, witness statements and media schedules listed on the MG6 index.",
          `Lifecycle state: ${doc.state}.`,
          /superseded|draft/i.test(doc.state)
            ? "WARNING: draft/superseded — not the operative instrument."
            : "Modelled as operative indictment for fictional-test purposes only.",
          "Plea / endorsement: not recorded on Count 1 page — see instrument history where present.",
        ],
      );
      if (n >= 2) {
        push(
          "indictment",
          "indictment_further_counts_or_history",
          ["Further counts / instrument history"],
          [
            matter.defendants > 1
              ? `Further count allocation across ${matter.defendants} defendants — each count remains defendant-specific.`
              : "No additional counts pinned; this page records instrument history and endorsement only.",
            `Defence position on instructions: ${matter.defence}.`,
            `Procedure: ${matter.procedure}.`,
            /superseded|draft/i.test(doc.state)
              ? `This page retains ${doc.state} history — operative precedence prefers signed/served counterparts.`
              : "Endorsement block: fictional clerk stamp; listing date modelled.",
            "Continuity: prefer the operative instrument over draft/superseded counterparts when both exist.",
            "Do not treat indictment endorsement as proof of the allegation.",
          ],
        );
      }
      break;
    }
    case "mg05": {
      push(
        "mg05",
        "mg5_case_summary_narrative",
        ["MG5 — Case summary", "Offence summary", "Key evidence narrative"],
        [
          `Defendant / matter family: ${matter.family}`,
          `Defence on instructions: ${matter.defence}`,
          `Procedural stage: ${matter.procedure}`,
          `Allegation under review: ${matter.charge}`,
          "",
          "NARRATIVE",
          docText || "Officer summary limited to disclosed papers in this pack.",
          "",
          "Witness outline: complainant account recorded as allegation only — not proved.",
          "Reliability: MG5 narrative must not be read as establishing guilt.",
        ],
      );
      if (n >= 2) {
        push(
          "mg05",
          "mg5_evidence_outline",
          ["Evidence outline", "Limitations", "Next action"],
          [
            "Evidence listed is limited to items served or partially served in the pack.",
            matter.missingItems.length
              ? `Index cross-reference (not served here): ${matter.missingItems.join(", ")}.`
              : "No deliberate missing-item markers declared on the completeness contract.",
            `Next action: reconcile MG5 against MG6 index before any court-facing send.`,
            "Do not quote referred-absent masters as if content were available.",
          ],
        );
      }
      break;
    }
    case "mg06": {
      push(
        "mg06",
        "mg6_file_index",
        ["MG6 — File front sheet / index", "Inventory"],
        [
          "Seq | Document | Kind | Status",
          "--- | -------- | ---- | ------",
          "1 | Written charge / indictment | instrument | see pack",
          "2 | MG5 case summary | mg05 | served",
          "3 | Disclosure / unused | schedule | see schedules",
          ...(matter.missingItems.length
            ? matter.missingItems.map((m, i) => `${4 + i} | ${m} | referred | ABSENT — not served`)
            : ["4 | (no referred-absent masters declared) | — | —"]),
          "",
          "Contract: MG6 may refer to an absent master; the master remains absent and has no source pages.",
          `Chase binding: request ${matter.missingItems.join(", ") || "nil"} by identity against this MG6 page.`,
        ],
      );
      break;
    }
    case "mg06c":
    case "unused_schedule": {
      push(
        layoutKind,
        layoutKind === "mg06c" ? "mg6c_unused_schedule" : "unused_material_schedule",
        [layoutKind === "mg06c" ? "MG6C — Unused material schedule" : "Unused material schedule", "Schedule rows"],
        [
          "Sch# | Description | Decision | Notes",
          "---- | ----------- | -------- | -----",
          "U1 | Custody CCTV extract log | disclose | clip only",
          "U2 | Third-party counselling note | withhold review | PII",
          "U3 | Officer notebook unused pages | disclose | redacted",
          matter.missingItems.length
            ? `Outstanding / absent items to chase: ${matter.missingItems.join(", ")}.`
            : "No deliberate outstanding absences beyond schedule rows.",
          "Update chase when service state changes.",
        ],
      );
      if (n >= 2) {
        push(
          layoutKind,
          "unused_schedule_continuation_decisions",
          ["Further unused items", "Sensitivity"],
          [
            "Sch# | Description | Decision",
            "---- | ----------- | --------",
            "U4 | Call-data print unused numbers | disclose",
            "U5 | Social-media scrape discarded threads | review",
            "PII redaction markers present on source export — fictional test only.",
          ],
        );
      }
      break;
    }
    case "mg11_statement": {
      push(
        "mg11_statement",
        "witness_statement_opening",
        ["MG11 — Witness statement", "Declaration", "Statement"],
        [
          "Criminal Procedure Rules / MG11 declaration (fictional test form):",
          "This statement is true to the best of my knowledge and belief and I make it knowing that, if it is tendered in evidence, I shall be liable to prosecution if I have wilfully stated in it anything which I know to be false or do not believe to be true.",
          "",
          `URN / page: ${doc.id}/page/1`,
          `Matter family: ${matter.family}`,
          "1. I am the maker of this fictional-test statement.",
          `2. I give this account concerning the ${matter.family} allegation under review.`,
          `3. ${docText || "Account recorded as allegation/denial material — not proved fact."}`,
          `4. Defence position context recorded elsewhere: ${matter.defence}.`,
          "Signature block: ______________________  Date: [fictional]",
        ],
      );
      for (let i = 2; i <= n; i++) {
        const paraStart = 4 + (i - 2) * 3;
        push(
          "mg11_continuation",
          `witness_statement_continuation_paras_${paraStart}`,
          ["MG11 — Continuation sheet", `Continuation of ${doc.id}`],
          [
            `Continues statement ${doc.id} from page 1 — not a free-standing document.`,
            `URN carry-forward: ${doc.id}`,
            `${paraStart}. Further detail of first contact with police (fictional timeline).`,
            `${paraStart + 1}. Description of location and persons present limited to disclosed papers.`,
            `${paraStart + 2}. I confirm I have read this continuation and it forms part of my statement.`,
            "No generic filler: each paragraph advances the account.",
          ],
        );
      }
      break;
    }
    case "custody_record": {
      push(
        "custody_record",
        "custody_detention_timeline",
        ["Custody record extract", "Timed events"],
        [
          "Time | Event | Authorising officer | Notes",
          "---- | ----- | ------------------- | -----",
          "14:02 | Arrival / detention authorised | Sgt Fictional | Rights given",
          "14:18 | Solicitor requested | — | Defence contact",
          "15:40 | Review of detention | Insp Fictional | Continued",
          "16:10 | Interview commenced | — | See interview record",
          `Procedural stage: ${matter.procedure}`,
          "Timestamps are fictional-test modelled values and must remain internally consistent.",
        ],
      );
      if (n >= 2) {
        push(
          "custody_record",
          "custody_rights_and_reviews",
          ["Rights / reviews / property"],
          [
            "Right | Status",
            "----- | ------",
            "Legal advice | exercised (modelled)",
            "Appropriate adult | " + (/youth|vulnerable|mental/.test(matter.familyRaw) ? "required — see youth/vulnerable record" : "not indicated"),
            "Property sealed | bag #FT-001",
            "Release / charge decision remains subject to papers served.",
          ],
        );
      }
      break;
    }
    case "interview_record": {
      push(
        "interview_record",
        "interview_opening_caution",
        ["Interview record (MG15-style)", "Identifiers", "Caution"],
        [
          `Interview URN: FT-INT-${doc.title.replace(/[^A-Za-z0-9]/g, "").slice(0, 8).toUpperCase() || "01"}`,
          `Matter family: ${matter.family}`,
          "Tape / digital media ref: FT-INT-01 (fictional)",
          "Persons present: interviewing officer; suspect; solicitor (modelled).",
          "Caution administered (fictional wording mark only).",
          `Defence position context: ${matter.defence}.`,
          `State: ${doc.state}.`,
        ],
      );
      if (n >= 2) {
        push(
          "interview_record",
          "interview_qa_summary",
          ["Interview summary / Q&A extract"],
          [
            "Q: Account of movements on the material date?",
            `A: Position on instructions — ${matter.defence}.`,
            "Q: Comment on the allegation instrument?",
            "A: Allegation not admitted as proved; account limited to disclosed papers.",
            docText.slice(0, 400),
            /incomplete/i.test(doc.state) ? "Marker: incomplete transcript — do not treat as full record." : "Transcript status: modelled complete for fictional test.",
          ],
        );
      }
      if (n >= 3) {
        push(
          "interview_record",
          "interview_exhibits_produced",
          ["Exhibits produced in interview"],
          [
            "Exhibit | Shown | Response noted",
            "------- | ----- | --------------",
            "EX1 still | yes | no comment / denial per instructions",
            "Clip schedule ref | yes | continuity to be checked",
            "End of interview / times recorded (fictional).",
          ],
        );
      }
      break;
    }
    case "media_schedule": {
      push(
        "media_schedule",
        "media_clip_schedule_log",
        ["CCTV / BWV clip schedule", "Served clips"],
        [
          "Clip | Source | Start | End | Master | Status",
          "---- | ------ | ----- | --- | ------ | ------",
          "C1 | High St cam 3 | 21:02:10 | 21:04:44 | M-HS-3 | clip served",
          "C2 | BWV PC Fictional | 21:05:01 | 21:07:18 | M-BWV-01 | clip served",
          "C3 | Store cam | 20:58:00 | 21:01:00 | M-ST-2 | partial",
          matter.missingItems.filter((m) => /master|cctv|bwv|media/i.test(m)).length
            ? `Absent masters referred: ${matter.missingItems.filter((m) => /master|cctv|bwv|media/i.test(m)).join(", ")}.`
            : "No additional media-master absence markers beyond pack state.",
          "Do not treat clip presence as full master continuity.",
        ],
      );
      break;
    }
    case "master_clip_schedule": {
      push(
        "master_clip_schedule",
        "master_versus_clip_continuity",
        ["Master versus clip schedule", "Continuity"],
        [
          "Master | Clip extracts | Hash placeholder | Availability",
          "------ | ------------- | ---------------- | ------------",
          "M-HS-3 | C1 | sha256:ft…a1 | referred_only / absent where marked",
          "M-BWV-01 | C2 | sha256:ft…b2 | metadata only",
          "Native master bytes must not be invented when marked absent.",
          docText.slice(0, 300),
        ],
      );
      break;
    }
    case "phone_download_schedule": {
      push(
        "phone_download_schedule",
        "phone_extraction_schedule",
        ["Phone / download schedule", "Device & attribution"],
        [
          "Device | Extraction | User attribution | Limit",
          "------ | ---------- | ---------------- | -----",
          "Handset A | logical | disputed | partial",
          "Cloud backup B | export | unknown author | incomplete",
          "",
          "Msg# | Direction | Timestamp | Attribution note",
          "---- | --------- | --------- | -----------------",
          "1 | inbound | modelled | sender ≠ author caution",
          "2 | outbound | modelled | device user disputed",
          "Device / account / user / sender / author separation required.",
          docText.slice(0, 350),
        ],
      );
      if (n >= 2) {
        push(
          "phone_download_schedule",
          "phone_call_and_app_rows",
          ["Calls / apps / attachments"],
          [
            "Call/App | Counterparty | Duration/size | Note",
            "-------- | ------------ | ------------- | ----",
            "Voice 1 | unknown | 00:42 | attribution open",
            "App chat export | group | 120 KB | attachment schedule separate",
            matter.missingItems.length
              ? `Outstanding digital items: ${matter.missingItems.join(", ")}.`
              : "No further deliberate digital absences declared.",
          ],
        );
      }
      break;
    }
    case "disclosure_schedule": {
      push(
        "disclosure_schedule",
        "disclosure_service_schedule",
        ["Disclosure schedule", "Service state"],
        [
          "Item | Description | Service state | PII",
          "---- | ----------- | ------------- | ---",
          "D1 | MG5 | served | n",
          "D2 | MG11 signed | served | y-redacted",
          "D3 | Media clip schedule | partial | n",
          matter.missingItems.length
            ? `Chase list: ${matter.missingItems.join(", ")}.`
            : "No deliberate outstanding absences declared.",
        ],
      );
      break;
    }
    case "forensic_report": {
      push(
        "forensic_report",
        "forensic_sfr_findings",
        ["Streamlined forensic report", "Findings & limits"],
        [
          `Lab / SFR ref: ${doc.id}`,
          "Exhibit(s): FT-EX-01 / FT-EX-02",
          "Method: modelled screening only.",
          "Finding: indication recorded for fictional-test purposes — not evaluative gold.",
          "SFR limits apply; not a full evaluative opinion.",
          `Family context: ${matter.family}.`,
          docText.slice(0, 400),
        ],
      );
      if (n >= 2) {
        push(
          "forensic_report",
          "forensic_continuity_and_caveats",
          ["Continuity & caveats"],
          [
            "Continuity pointer must be reconciled to exhibit schedule.",
            "Quality caveat: fictional test — Regulator code structure only.",
            "Do not overstate scientific certainty.",
          ],
        );
      }
      break;
    }
    case "medical_report": {
      push(
        "medical_report",
        "medical_examination_extract",
        ["Medical report extract", "Examination", "Opinion limits"],
        [
          "Confidential — fictional test medical extract.",
          "Clinician: Dr Fictional (modelled).",
          "Examination findings limited to disclosed extract.",
          "Opinion: consistent with alleged mechanism OR non-specific — not proof of allegation.",
          docText.slice(0, 400),
        ],
      );
      break;
    }
    case "expert_report": {
      push(
        "expert_report",
        "expert_opinion_extract",
        ["Expert report", "Declaration", "Opinion"],
        [
          "CPR expert declaration (fictional structural mark).",
          `Instructions concern: ${matter.family} matter.`,
          "Opinion limited to materials listed in disclosure schedule.",
          "Limitations: incomplete natives / referred masters where marked.",
          docText.slice(0, 400),
        ],
      );
      break;
    }
    case "abe_record": {
      push(
        "abe_record",
        "abe_interview_metadata",
        ["ABE / visually recorded interview record", "Special measures"],
        [
          `ABE URN: ${doc.id}`,
          "Interview setting: modelled suite / remote as applicable.",
          "Special measures note: structural only — qualified legal review still required.",
          "Transcript extract markers: [start] … [end] — content not invented beyond pack text.",
          docText.slice(0, 450),
          `Family: ${matter.family}. Defence context: ${matter.defence}.`,
        ],
      );
      break;
    }
    case "hearing_notice": {
      push(
        "hearing_notice",
        "hearing_listing_notice",
        ["Hearing notice", "Listing particulars"],
        [
          `Court: ${matter.courtHint}`,
          `Matter family: ${matter.family}`,
          `Hearing type / stage: ${matter.procedure}`,
          "Date/time: [fictional listing]",
          "Attendance: defendant / advocate as directed.",
          "Bring papers: charge/indictment, MG5, disclosure update.",
        ],
      );
      break;
    }
    case "court_order": {
      push(
        "court_order",
        "court_order_operative_paragraphs",
        ["Court order", "Operative paragraphs"],
        [
          `IN THE ${matter.courtHint.toUpperCase()} (modelled)`,
          `Matter family: ${matter.family}`,
          "IT IS ORDERED THAT (fictional test):",
          "1. Conditions / directions as modelled for this pack.",
          "2. Breach must be proved separately and is not established by this extract.",
          `Related family: ${matter.family}.`,
          docText.slice(0, 350),
          "Endorsement: fictional judicial/clerk block only.",
        ],
      );
      break;
    }
    case "exhibit_schedule": {
      push(
        "exhibit_schedule",
        "exhibit_list_mg12",
        ["Exhibit list (MG12-style)", "Inventory"],
        [
          "Ex# | Description | Recovered by | Location | Continuity",
          "--- | ----------- | ------------ | -------- | ----------",
          "EX1 | Sealed bag / device | PC Fictional | Store A | CR-01",
          "EX2 | Clothing item | CSI Fictional | Store B | CR-02",
          "EX3 | Phone handset | Digital unit | Faraday | see phone schedule",
          "Continuity must be checked against continuity record.",
        ],
      );
      if (n >= 2) {
        push(
          "exhibit_schedule",
          "exhibit_list_further_items",
          ["Further exhibits"],
          [
            "Ex# | Description | Note",
            "--- | ----------- | ----",
            "EX4 | Swab set | SFR linked",
            "EX5 | Document bundle | copies served",
          ],
        );
      }
      break;
    }
    case "continuity_record": {
      push(
        "continuity_record",
        "continuity_chain_of_custody",
        ["Continuity / chain of custody", "Handovers"],
        [
          "Time | From | To | Seal | Signature mark",
          "---- | ---- | -- | ---- | --------------",
          "Day0 22:10 | Scene | Exhibits | S-100 | FT",
          "Day1 09:00 | Exhibits | Lab | S-100 | FT",
          "Day3 14:00 | Lab | Exhibits | S-101 | FT",
          "Breaks in continuity must be chased — do not invent missing seals.",
        ],
      );
      break;
    }
    case "defence_proof": {
      push(
        "defence_proof",
        "defence_privileged_extract",
        ["Defence proof of evidence extract", "PRIVILEGED"],
        [
          "PRIVILEGED — defence working extract. Not for ordinary copy/export/API send.",
          `Position on instructions: ${matter.defence}`,
          "Issues to explore: attribution, continuity, missing masters, charge particularity.",
          "Do not merge privileged defence wording into prosecution-facing exits.",
          docText.slice(0, 400),
        ],
      );
      if (n >= 2) {
        push(
          "defence_proof",
          "defence_issues_and_requests",
          ["Issues list", "Requests"],
          [
            `Missing/referred chase candidates: ${matter.missingItems.join(", ") || "nil declared"}.`,
            "Proof extract remains privilege-separated in this fictional pack.",
          ],
        );
      }
      break;
    }
    case "email_attachment_summary": {
      push(
        "email_attachment_summary",
        "email_headers_and_attachments",
        ["Email / attachment summary", "Headers"],
        [
          "From: disclosures@fictional.example",
          "To: defence@fictional.example",
          "Date: [fictional]",
          `Subject: Service — ${matter.family} pack (fictional)`,
          "",
          "Attachment | Size | SHA256 placeholder | Note",
          "---------- | ---- | ------------------- | ----",
          "MG5.pdf | n/a | ft…c3 | served",
          "clip_C1.mp4 | n/a | not_exercised | metadata only",
        ],
      );
      break;
    }
    case "youth_justice_record": {
      push(
        "youth_justice_record",
        "youth_justice_extract",
        ["Youth justice / YOT record extract", "Age & safeguards"],
        [
          "Age marker: under 18 (modelled) — youth court / youth safeguards apply where indicated.",
          "Appropriate adult: required / recorded (fictional).",
          `Procedure: ${matter.procedure}`,
          "YOT / third-party material may be referred-only — do not invent content.",
          docText.slice(0, 400),
        ],
      );
      break;
    }
    case "interpreter_record": {
      push(
        "interpreter_record",
        "interpreter_certification",
        ["Interpreter / translation record", "Certificate"],
        [
          "Language: [modelled]",
          "Interpreter identity block: fictional register number.",
          "Passages interpreted: interview / hearing extract as marked.",
          "Certificate: I confirm the interpretation/translation is accurate to the best of my skill (fictional).",
          docText.slice(0, 300),
        ],
      );
      break;
    }
    case "welsh_language_record": {
      push(
        "welsh_language_record",
        "welsh_language_proceedings",
        ["Welsh-language record / Cofnod iaith Gymraeg", "Language preference"],
        [
          "Language preference: Welsh / bilingual (modelled).",
          "Dewis iaith: Cymraeg / dwyieithog (modelled).",
          "Translation status: structural bilingual headings only in this fictional extract.",
          `Matter family: ${matter.family} (fictional bilingual extract).`,
        ],
      );
      break;
    }
    case "chronology": {
      push(
        "chronology",
        "case_chronology_events",
        ["Case chronology", "Milestones"],
        [
          "Date | Event | Source pointer",
          "---- | ----- | --------------",
          "D0 | Incident alleged | MG5",
          "D1 | Arrest / custody | custody record",
          "D2 | Interview | interview record",
          `D3 | ${matter.procedure} | hearing notice`,
          "D4 | Disclosure update | MG6 / schedules",
        ],
      );
      break;
    }
    case "metadata_fixture": {
      push(
        "metadata_fixture",
        "media_metadata_only",
        ["Media metadata fixture", "Native bytes not_exercised"],
        [
          "Native video/audio bytes: not_exercised.",
          "path: /fictional/media/clip_C1.mp4",
          "sha256: ft-meta-placeholder",
          "codec / duration: modelled placeholders only",
          "Cannot summarise native content that was never supplied.",
          docText.slice(0, 300),
        ],
      );
      break;
    }
    default: {
      push(
        "generic_specialist",
        "document_specific_body",
        [doc.title || doc.kind || "Document", "Particulars"],
        [
          `Kind: ${doc.kind}`,
          `Lifecycle state: ${doc.state}`,
          `Family: ${matter.family}`,
          `Stage: ${matter.procedure}`,
          docText || "Purpose: document-specific body for this specialist kind — not generic continuation.",
          /draft|superseded|amend/i.test(doc.state)
            ? `Lifecycle: ${doc.state} — do not treat as operative instrument.`
            : `Status: ${doc.state}.`,
        ],
      );
      if (n >= 2 && /draft|superseded|amend/i.test(doc.state)) {
        push(
          "generic_specialist",
          "lifecycle_history_not_operative",
          ["Lifecycle history"],
          [
            `This document is ${doc.state}.`,
            "Operative precedence must prefer signed/served/operative counterparts.",
          ],
        );
      }
    }
  }

  return pages;
}

export function buildDocSpecs(args: {
  caseId: string;
  matter: any;
  packDocuments: any[];
  missingItems: string[];
}): { present: DocSpec[]; absent: any[] } {
  const { caseId, matter, packDocuments, missingItems } = args;
  const familyRaw = String(matter.primaryFamily || "");
  const matterCtx: MatterCtx = {
    caseId,
    family: humanize(familyRaw),
    familyRaw,
    charge: matter.charge?.wording || "Charge wording not pinned — structural only.",
    chargeStatus: matter.charge?.wordingStatus || "unknown",
    defence: humanize(String(matter.defencePosition || "")),
    procedure: humanize(String(matter.proceduralLifecycle || "")),
    defendants: matter.defendantCount || 1,
    missingItems: missingItems || [],
    courtHint: /crown|ptph|trial|sentence|appeal/i.test(String(matter.proceduralLifecycle || ""))
      ? "Crown Court (modelled)"
      : "Magistrates' Court (modelled)",
  };

  const absent: any[] = [];
  const present: DocSpec[] = [];

  for (const doc of packDocuments || []) {
    const state = String(doc.state || "");
    if (isAbsentState(state) || doc.kind === "missing_referred") {
      absent.push({
        docId: doc.id,
        title: doc.title,
        kind: doc.kind,
        state: doc.state,
        pages: [],
        realPaginatedFile: false,
        reason: "absent_or_referred_only_no_generated_pages",
      });
      continue;
    }

    let layoutKind = chooseLayoutKind(doc, matterCtx);
    // Family-informed refinements for borderline kinds
    if (layoutKind === "generic_specialist") {
      if (/sexual|abe|vulnerable|historic_sexual/.test(familyRaw) && /abe|special|third_party|statement/.test(String(doc.kind)))
        layoutKind = /statement|mg11/.test(String(doc.kind)) ? "mg11_statement" : "abe_record";
      if (/youth/.test(familyRaw) && /third_party|yjs|youth/.test(String(doc.kind) + String(doc.id)))
        layoutKind = "youth_justice_record";
      if (/phone|digital|cloud|social|cma|crypto|malicious_communications/.test(familyRaw) && /schedule|digital|layout/.test(String(doc.kind)))
        layoutKind = "phone_download_schedule";
      if (/welsh/.test(familyRaw)) layoutKind = "welsh_language_record";
    }

    const pages = buildPageSpecs({ doc, matter: matterCtx, layoutKind });
    const content = pages.map((p) => p.text).join("\n\f\n");
    present.push({
      docId: doc.id,
      title: doc.title,
      kind: doc.kind,
      state: doc.state,
      pages,
      contentHash: sha(content),
      realPaginatedFile: true,
      privilegeSeparated: state === "privileged" || doc.kind === "defence_proof" || layoutKind === "defence_proof",
      publicTemplateRef: layoutKind,
    });
  }

  return { present, absent };
}

/* ───────────────────────── PDF rendering ───────────────────────── */

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_X = 42;
const MARGIN_TOP = 36;
const MARGIN_BOTTOM = 48;
const BODY_BOTTOM = PAGE_H - MARGIN_BOTTOM;
const BODY_WIDTH = PAGE_W - MARGIN_X * 2;

type DrawCtx = {
  pdf: any;
  page: PageSpec;
  docSpec: DocSpec;
  pdfPageNumber: number;
  y: number;
};

function clipBody(pdf: any): void {
  pdf.save();
  pdf.rect(MARGIN_X - 2, MARGIN_TOP - 2, BODY_WIDTH + 4, BODY_BOTTOM - MARGIN_TOP + 4).clip();
}

function endClip(pdf: any): void {
  pdf.restore();
}

function drawFictionalBanner(pdf: any): number {
  // Slim header band — visibly marks fictional test without destroying form realism
  pdf.save();
  pdf.rect(0, 0, PAGE_W, 18).fill("#1a1a1a");
  pdf.fillColor("#ffffff").fontSize(7).font("Helvetica-Bold");
  pdf.text(FICTIONAL_BANNER, MARGIN_X, 5, { width: BODY_WIDTH, align: "center", lineBreak: false });
  pdf.restore();
  return 22;
}

function humanDocPageLabel(page: PageSpec, pdfPageNumber: number): string {
  // Visible document pagination only — exact source pageIdentity lives in page-map JSON, not body/footer harness.
  const m = /\/page\/(\d+)$/.exec(page.pageIdentity);
  const sourcePageNo = m?.[1] ?? String(page.pageIndex);
  return `Document page ${sourcePageNo}  ·  Bundle sheet ${pdfPageNumber}`;
}

function drawFooter(ctx: DrawCtx): void {
  const { pdf, page, pdfPageNumber, docSpec } = ctx;
  pdf.save();
  pdf.font("Helvetica").fontSize(7).fillColor("#333333");
  const y = PAGE_H - 36;
  const left = `${docSpec.title.slice(0, 42)}  ·  ${humanDocPageLabel(page, pdfPageNumber)}`;
  pdf.text(left, MARGIN_X, y, {
    width: BODY_WIDTH * 0.72,
    lineBreak: false,
  });
  pdf.text("TEST COPY", MARGIN_X + BODY_WIDTH * 0.72, y, {
    width: BODY_WIDTH * 0.28,
    align: "right",
    lineBreak: false,
  });
  pdf.fontSize(6).fillColor("#666666").text(FICTIONAL_FOOTNOTE, MARGIN_X, y + 12, {
    width: BODY_WIDTH,
    lineBreak: false,
  });
  pdf.restore();
}

function ensureY(ctx: DrawCtx, need: number): void {
  if (ctx.y + need > BODY_BOTTOM - 8) {
    ctx.y = BODY_BOTTOM - 8; // clip budget — no overflow blank pages
  }
}

function h1(ctx: DrawCtx, title: string, size = 14): void {
  ensureY(ctx, size + 8);
  ctx.pdf.font("Helvetica-Bold").fontSize(size).fillColor("#111111");
  ctx.pdf.text(title, MARGIN_X, ctx.y, { width: BODY_WIDTH, align: "center" });
  ctx.y = ctx.pdf.y + 6;
}

function h2(ctx: DrawCtx, title: string): void {
  ensureY(ctx, 16);
  ctx.pdf.font("Helvetica-Bold").fontSize(10).fillColor("#111111");
  ctx.pdf.text(title, MARGIN_X, ctx.y, { width: BODY_WIDTH });
  ctx.y = ctx.pdf.y + 3;
}

function rule(ctx: DrawCtx): void {
  ensureY(ctx, 8);
  ctx.pdf.moveTo(MARGIN_X, ctx.y).lineTo(MARGIN_X + BODY_WIDTH, ctx.y).strokeColor("#444444").lineWidth(0.8).stroke();
  ctx.y += 6;
}

function para(ctx: DrawCtx, text: string, opts?: { size?: number; bold?: boolean; indent?: number }): void {
  const size = opts?.size ?? 8.5;
  ensureY(ctx, size + 4);
  const maxH = Math.max(10, BODY_BOTTOM - 8 - ctx.y);
  ctx.pdf.font(opts?.bold ? "Helvetica-Bold" : "Helvetica").fontSize(size).fillColor("#111111");
  ctx.pdf.text(text, MARGIN_X + (opts?.indent || 0), ctx.y, {
    width: BODY_WIDTH - (opts?.indent || 0),
    height: maxH,
    ellipsis: true,
  });
  ctx.y = Math.min(ctx.pdf.y + 2, BODY_BOTTOM - 8);
}

function fieldRow(ctx: DrawCtx, label: string, value: string): void {
  ensureY(ctx, 14);
  const labelW = 130;
  ctx.pdf.font("Helvetica-Bold").fontSize(8).fillColor("#111111");
  ctx.pdf.text(label, MARGIN_X, ctx.y, { width: labelW, lineBreak: false });
  ctx.pdf.font("Helvetica").fontSize(8);
  ctx.pdf.text(value, MARGIN_X + labelW, ctx.y, {
    width: BODY_WIDTH - labelW,
    height: 24,
    ellipsis: true,
  });
  ctx.y += 14;
}

function table(ctx: DrawCtx, headers: string[], rows: string[][], colWeights?: number[]): void {
  const cols = headers.length;
  const weights = colWeights && colWeights.length === cols ? colWeights : headers.map(() => 1);
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const widths = weights.map((w) => (BODY_WIDTH * w) / weightSum);
  const rowH = 14;
  const drawRow = (cells: string[], header: boolean) => {
    ensureY(ctx, rowH + 2);
    if (ctx.y + rowH > BODY_BOTTOM - 8) return;
    let x = MARGIN_X;
    ctx.pdf.save();
    if (header) {
      ctx.pdf.rect(MARGIN_X, ctx.y, BODY_WIDTH, rowH).fill("#e8e8e8");
    } else {
      ctx.pdf.rect(MARGIN_X, ctx.y, BODY_WIDTH, rowH).strokeColor("#cccccc").lineWidth(0.4).stroke();
    }
    ctx.pdf.font(header ? "Helvetica-Bold" : "Helvetica").fontSize(7).fillColor("#111111");
    for (let i = 0; i < cols; i++) {
      ctx.pdf.text(String(cells[i] ?? ""), x + 2, ctx.y + 3, {
        width: widths[i] - 4,
        lineBreak: false,
        height: rowH - 4,
        ellipsis: true,
      });
      x += widths[i];
    }
    ctx.pdf.restore();
    ctx.y += rowH;
  };
  drawRow(headers, true);
  for (const r of rows) drawRow(r, false);
  ctx.y += 4;
}

function box(ctx: DrawCtx, title: string, lines: string[], minH = 48): void {
  ensureY(ctx, minH);
  const top = ctx.y;
  const maxH = Math.max(20, BODY_BOTTOM - 8 - top);
  ctx.pdf.rect(MARGIN_X, top, BODY_WIDTH, Math.min(minH, maxH)).strokeColor("#333333").lineWidth(0.9).stroke();
  ctx.pdf.font("Helvetica-Bold").fontSize(8).fillColor("#111111");
  ctx.pdf.text(title, MARGIN_X + 4, top + 4, { width: BODY_WIDTH - 8 });
  ctx.pdf.font("Helvetica").fontSize(7.5);
  let yy = top + 16;
  for (const ln of lines) {
    if (yy > top + maxH - 10) break;
    ctx.pdf.text(ln, MARGIN_X + 4, yy, { width: BODY_WIDTH - 8, lineBreak: false, ellipsis: true });
    yy += 11;
  }
  ctx.y = top + Math.min(minH, maxH) + 6;
}

function linesFromPage(page: PageSpec, skip = 4): string[] {
  return page.text
    .split("\n")
    .filter((l) => l && !l.startsWith("##") && l !== FICTIONAL_BANNER && l !== FICTIONAL_FOOTNOTE)
    .slice(skip);
}

function fictionalUrn(docId: string): string {
  // Human URN-style identifier — not a machine case path or harness pageIdentity string.
  const slug = docId.replace(/^doc-/, "").replace(/[^A-Za-z0-9]+/g, "/").slice(0, 28).toUpperCase();
  return `URN TEST/FICT/${slug || "DOC"}`;
}

function pickChargeLine(pageText: string, headings: string[]): string {
  const lines = pageText.split("\n").map((l) => l.trim()).filter(Boolean);
  const preferred = lines.find(
    (l) =>
      l.length > 24 &&
      !/^FICTIONAL|^Document:|^Matter family|^## |^STATEMENT|^PARTICULARS|^COUNT|^THE |^IN THE|^Court |^Lifecycle|^Charge wording status|^Contrary to the modelled|^Mode:|^Do not |^This instrument|^Allegation|^Procedural|^Family under|^It is alleged|^WARNING|^Modelled as|^Plea |^Endorsement|^Continuity|^Further count|^No additional|^Defence position|^Procedure:|^Place and|^Service:|^Certificate|^Counsel|^Preferred|^Tape |^Persons |^Caution |^Interview URN|^Subject:|^From:|^To:|^Date:|^Attachment|^Dewis |^Language preference|^Age marker|^Appropriate|^YOT |^Translation|^IN THE CROWN|^THE KING|^THE QUEEN/i.test(
        l,
      ) &&
      (/Contrary to|Battery|Assault|Theft|possess|fraud|wound|rape|supply|bladed|affray|riot|contempt|TWOC|going equipped|shoplift|sexual|drugs|immunity|common assault|Charge wording not pinned/i.test(
        l,
      ) ||
        (/offence/i.test(l) && !/^STATEMENT OF OFFENCE$/i.test(l))),
  );
  if (preferred) return preferred;
  const statusLine = lines.find((l) => /Charge wording not pinned/i.test(l));
  if (statusLine) return statusLine;
  return headings.find((h) => /offence|charge|count/i.test(h) && !/^STATEMENT OF OFFENCE$/i.test(h)) || "Charge wording structural";
}

function drawWrittenCharge(ctx: DrawCtx): void {
  h1(ctx, "WRITTEN CHARGE / REQUISITION", 13);
  para(ctx, "Criminal Procedure Rules — modelled form structure (fictional test)", { size: 7 });
  rule(ctx);
  fieldRow(ctx, "Prosecutor reference", fictionalUrn(ctx.docSpec.docId));
  fieldRow(ctx, "Court / venue", linesFromPage(ctx.page).find((l) => /Court|venue/i.test(l)) || "Magistrates' Court (modelled)");
  fieldRow(ctx, "Return / first hearing", "Date to be fixed — listing office (fictional)");
  fieldRow(ctx, "Instrument status", ctx.docSpec.state);
  fieldRow(ctx, "Accused", "[FICTIONAL DEFENDANT] — date of birth withheld in test pack");
  fieldRow(ctx, "Address for service", "[FICTIONAL ADDRESS] — withheld / redacted in test pack");
  fieldRow(ctx, "Prosecutor", "Crown Prosecution Service (modelled charging unit)");
  rule(ctx);
  h2(ctx, "STATEMENT OF OFFENCE");
  const chargeLine = pickChargeLine(ctx.page.text, ctx.page.headings);
  box(
    ctx,
    "Offence as charged",
    [
      chargeLine,
      "Contrary to the statutory provision modelled for this family.",
      "Mode: summary / either-way as applicable to the modelled offence.",
      "Maximum penalty: as provided by the modelled statute (not restated as proof).",
    ],
    68,
  );
  h2(ctx, "PARTICULARS OF OFFENCE");
  para(
    ctx,
    "It is alleged that within the charged window the defendant(s) committed the offence set out above. This instrument records the allegation only — it does not prove the allegation.",
  );
  para(
    ctx,
    "Particulars (modelled): place — as particularised in the MG5 narrative; date — within the charged window; victim/property — as alleged on the papers served; manner — as particularised on the charging instrument.",
    { size: 8 },
  );
  para(
    ctx,
    "The accused is put on notice that the prosecution may rely on witness statements, media schedules and unused-material decisions disclosed separately. Nothing in this form elevates an allegation to a proved fact.",
    { size: 8 },
  );
  table(
    ctx,
    ["Box", "Content"],
    [
      ["A — Identity", "Accused named above; address withheld in fictional pack"],
      ["B — Offence", chargeLine.slice(0, 90)],
      ["C — Particulars", "Charged window · place as alleged · allegation not proved"],
      ["D — Law", "Statutory citation modelled for family under review"],
      ["E — Reminder", "Accused must attend as directed; failure may lead to warrant"],
      ["F — Disclosure", "Initial disclosure served with this instrument (modelled)"],
      ["G — Advice", "Obtain legal advice before the return date"],
    ],
    [1, 4],
  );
  if (ctx.page.purpose.includes("allocation")) {
    h2(ctx, "Defendant allocation (multi-accused)");
    table(
      ctx,
      ["Count", "Defendant", "Note"],
      [
        ["1.1", "D1", "Defendant-specific — no cross-bleed"],
        ["1.2", "D2", "Defendant-specific — no cross-bleed"],
        ["1.3", "D3+", "Further defendants remain separately particularised"],
      ],
      [1, 1, 3],
    );
  } else {
    h2(ctx, "Administrative endorsement");
    table(
      ctx,
      ["Field", "Value"],
      [
        ["Purpose of this page", ctx.page.purpose.replace(/_/g, " ")],
        ["Prosecutor endorsement", "Signed (fictional) — charging lawyer"],
        ["Authorising officer", "Fictional charging lawyer / reviewing lawyer"],
        ["Service", "Modelled as served with initial disclosure pack"],
        ["Language", "English (Welsh/interpreter notes appear on separate records where modelled)"],
      ],
      [1, 3],
    );
  }
  h2(ctx, "Certificate of service (modelled)");
  table(
    ctx,
    ["Method", "Date", "By"],
    [
      ["Hand / post / electronic (modelled)", "Listing office date", "Prosecutor admin"],
      ["Defence firm copy", "Same pack", "Disclosures desk"],
    ],
    [3, 2, 2],
  );
  para(ctx, "Notice to accused: You will be told of the hearing date. Bring this charge sheet. Legal advice should be obtained. This is fictional test material only.", { size: 7.5 });
  para(ctx, "Clerk / listing note: return date to be fixed; do not treat modelled venue as an operative listing.", { size: 7.5 });
}

function drawIndictment(ctx: DrawCtx): void {
  h1(ctx, "I N D I C T M E N T", 16);
  para(ctx, "IN THE CROWN COURT AT [FICTIONAL VENUE]", { size: 10, bold: true });
  para(ctx, "THE KING  v.  [FICTIONAL DEFENDANT]", { size: 10, bold: true });
  fieldRow(ctx, "Indictment reference", fictionalUrn(ctx.docSpec.docId));
  fieldRow(ctx, "Preferred by", "Crown Prosecution Service (modelled)");
  fieldRow(ctx, "Counsel for the Crown", "[FICTIONAL COUNSEL] (modelled)");
  fieldRow(ctx, "Defence", "On the papers / as instructed (modelled)");
  rule(ctx);
  if (/superseded|draft/i.test(ctx.docSpec.state)) {
    ctx.pdf.save();
    ctx.pdf.font("Helvetica-Bold").fontSize(9).fillColor("#880000");
    ctx.pdf.text(`STATUS: ${ctx.docSpec.state.toUpperCase()} — NOT OPERATIVE`, MARGIN_X, ctx.y, {
      width: BODY_WIDTH,
      align: "center",
    });
    ctx.pdf.restore();
    ctx.y += 14;
  }
  h2(ctx, "COUNT 1");
  h2(ctx, "STATEMENT OF OFFENCE");
  const offence = pickChargeLine(ctx.page.text, ctx.page.headings);
  box(
    ctx,
    "Statement of offence",
    [
      offence,
      "Contrary to the modelled statutory provision.",
      "Trial on indictment — Crown Court.",
      "Particulars below do not prove the allegation.",
    ],
    62,
  );
  h2(ctx, "PARTICULARS OF OFFENCE");
  para(
    ctx,
    "[FICTIONAL DEFENDANT] on a date unknown within the charged window, at a place particularised in the served papers, committed the offence alleged in Count 1.",
  );
  para(
    ctx,
    "Further particulars: the Crown relies on the served MG5 narrative, witness statements and media schedules listed on the MG6 index. Allegation not proved by this indictment alone.",
    { size: 8 },
  );
  para(
    ctx,
    "Where a draft or superseded indictment exists in the pack, operative precedence prefers the signed/served counterpart. This page must not be read as establishing guilt.",
    { size: 8 },
  );
  table(
    ctx,
    ["Count", "Offence short title", "Mode", "Status"],
    [["1", offence.slice(0, 48), "Indictment", ctx.docSpec.state]],
    [1, 4, 1, 2],
  );
  h2(ctx, "Plea / result grid (modelled — blank unless entered)");
  table(
    ctx,
    ["Event", "Entry"],
    [
      ["Plea", "Not recorded on this page"],
      ["Jury present", "—"],
      ["Verdict", "—"],
      ["Sentence / order", "—"],
    ],
    [1, 3],
  );
  h2(ctx, "Endorsement / clerk block");
  table(
    ctx,
    ["Item", "Entry"],
    [
      ["Date preferred", "Modelled listing date"],
      ["Judge / clerk", "Fictional endorsement only"],
      ["Plea entered", "Not recorded on this page"],
      ["Purpose of page", ctx.page.purpose.replace(/_/g, " ")],
      ["Bundle sheet", humanDocPageLabel(ctx.page, ctx.pdfPageNumber)],
    ],
    [1, 3],
  );
  if (/history|further/i.test(ctx.page.purpose)) {
    h2(ctx, "Instrument history");
    for (const ln of linesFromPage(ctx.page, 2).slice(0, 10)) para(ctx, ln, { size: 8 });
  } else {
    para(ctx, "Further counts: none pinned on Count 1 page. Instrument history appears on a continuation page where modelled.", { size: 8 });
  }
}

function drawMg05(ctx: DrawCtx): void {
  h1(ctx, "MG5  CASE SUMMARY", 12);
  para(ctx, "Manual of Guidance — fictional test layout", { size: 7 });
  rule(ctx);
  fieldRow(ctx, "Document", ctx.docSpec.title);
  fieldRow(ctx, "Purpose", ctx.page.purpose.replace(/_/g, " "));
  fieldRow(ctx, "File status", ctx.docSpec.state);
  fieldRow(ctx, "Reviewing lawyer", "CPS reviewing lawyer (modelled)");
  box(
    ctx,
    "Offence / allegation summary",
    [
      pickChargeLine(ctx.page.text, ctx.page.headings),
      linesFromPage(ctx.page, 0).find((l) => /Allegation|Defence|Procedural/i.test(l)) ||
        "Allegation limited to disclosed papers in this pack.",
    ],
    48,
  );
  h2(ctx, ctx.page.purpose.includes("evidence") ? "Evidence outline" : "Key evidence narrative");
  for (const ln of linesFromPage(ctx.page, 3).slice(0, 14)) {
    para(ctx, ln, { size: 8 });
  }
  h2(ctx, "Witness / evidence checklist (modelled)");
  table(
    ctx,
    ["Item", "State", "Note"],
    [
      ["Complainant account", "allegation only", "Not proved"],
      ["Officer narrative", "served/partial", "See pack"],
      ["Media / BWV", "see schedule", "Masters may be referred-absent"],
      ["Unused / MG6C", "see schedule", "Disclosure decision separate"],
    ],
    [2, 2, 3],
  );
  h2(ctx, "Limitations / next action");
  para(ctx, "Reliability: MG5 narrative must not be read as establishing guilt. Reconcile against MG6 before any court-facing send.", { size: 8 });
  para(ctx, "Do not quote referred-absent masters as if content were available. Next action: chase missing items by exact identity on MG6.", { size: 8 });
}

function drawMg06(ctx: DrawCtx): void {
  h1(ctx, "MG6  FILE FRONT SHEET / INDEX", 12);
  fieldRow(ctx, "File / case", fictionalUrn(ctx.docSpec.docId));
  rule(ctx);
  table(
    ctx,
    ["Seq", "Document", "Kind", "Status"],
    [
      ["1", "Charge / indictment", "instrument", "see pack"],
      ["2", "MG5 case summary", "mg05", "served"],
      ["3", "Disclosure / unused", "schedule", "see schedules"],
      ["4", "Referred / absent", "referred", "ABSENT if marked"],
    ],
    [1, 3, 2, 2],
  );
  para(ctx, "Contract: referred masters remain absent — zero invented pages.", { size: 8 });
  for (const ln of linesFromPage(ctx.page, 8).slice(0, 6)) para(ctx, ln, { size: 7.5 });
}

function drawScheduleTable(ctx: DrawCtx, title: string): void {
  h1(ctx, title, 11);
  fieldRow(ctx, "Schedule id", fictionalUrn(ctx.docSpec.docId));
  fieldRow(ctx, "State", ctx.docSpec.state);
  rule(ctx);
  const rows =
    ctx.page.layoutKind === "phone_download_schedule"
      ? [
          ["Handset A", "logical", "disputed", "partial"],
          ["Cloud B", "export", "unknown", "incomplete"],
          ["Msg 1", "inbound", "modelled", "sender≠author"],
        ]
      : ctx.page.layoutKind === "media_schedule" || ctx.page.layoutKind === "master_clip_schedule"
        ? [
            ["C1", "High St cam", "21:02", "clip served"],
            ["C2", "BWV", "21:05", "clip served"],
            ["M-HS-3", "master", "—", "referred/absent"],
          ]
        : [
            ["U1", "CCTV extract log", "disclose", "clip"],
            ["U2", "Counselling note", "review", "PII"],
            ["U3", "Notebook unused", "disclose", "redacted"],
          ];
  table(ctx, ["Ref", "Description", "Col3", "Status"], rows, [1, 3, 2, 2]);
  for (const ln of linesFromPage(ctx.page, 6).slice(0, 8)) para(ctx, ln, { size: 7.5 });
}

function drawMg11(ctx: DrawCtx): void {
  const cont = ctx.page.layoutKind === "mg11_continuation";
  h1(ctx, cont ? "MG11  CONTINUATION SHEET" : "MG11  WITNESS STATEMENT", 12);
  if (cont) {
    para(ctx, `Continuation of statement — carries URN from page 1`, { size: 8, bold: true });
  }
  rule(ctx);
  if (!cont) {
    box(
      ctx,
      "Declaration",
      [
        "This statement is true to the best of my knowledge and belief and I make it knowing that,",
        "if tendered in evidence, I shall be liable to prosecution if I have wilfully stated anything",
        "which I know to be false or do not believe to be true. (Fictional test form.)",
      ],
      52,
    );
    fieldRow(ctx, "URN", fictionalUrn(ctx.docSpec.docId));
    fieldRow(ctx, "Statement page", humanDocPageLabel(ctx.page, ctx.pdfPageNumber));
    fieldRow(ctx, "Document state", ctx.docSpec.state);
  } else {
    fieldRow(ctx, "URN carry-forward", fictionalUrn(ctx.docSpec.docId));
    fieldRow(ctx, "Continuation page", humanDocPageLabel(ctx.page, ctx.pdfPageNumber));
  }
  h2(ctx, "Statement");
  for (const ln of linesFromPage(ctx.page, cont ? 2 : 5).slice(0, 14)) {
    para(ctx, ln, { size: 8 });
  }
  if (!cont) {
    ensureY(ctx, 28);
    ctx.pdf.font("Helvetica").fontSize(8);
    ctx.pdf.text("Signature: ______________________     Date: ______________", MARGIN_X, ctx.y);
    ctx.y += 16;
  }
}

function drawCustody(ctx: DrawCtx): void {
  h1(ctx, "CUSTODY RECORD EXTRACT", 12);
  fieldRow(ctx, "Record", fictionalUrn(ctx.docSpec.docId));
  rule(ctx);
  table(
    ctx,
    ["Time", "Event", "Authorising officer", "Notes"],
    [
      ["14:02", "Arrival / detention", "Sgt Fictional", "Rights given"],
      ["14:18", "Solicitor requested", "—", "Defence contact"],
      ["15:40", "Detention review", "Insp Fictional", "Continued"],
      ["16:10", "Interview commenced", "—", "See MG15"],
    ],
    [1.2, 2.5, 2, 2],
  );
  for (const ln of linesFromPage(ctx.page, 8).slice(0, 8)) para(ctx, ln, { size: 8 });
}

function drawInterview(ctx: DrawCtx): void {
  h1(ctx, "INTERVIEW RECORD (MG15-style)", 11);
  fieldRow(ctx, "Interview URN", fictionalUrn(ctx.docSpec.docId));
  fieldRow(ctx, "Purpose", ctx.page.purpose.replace(/_/g, " "));
  fieldRow(ctx, "State", ctx.docSpec.state);
  fieldRow(ctx, "Tape / media ref", "FT-INT-01 (fictional)");
  rule(ctx);
  if (ctx.page.purpose.includes("opening")) {
    box(
      ctx,
      "Caution / persons present",
      [
        "Caution administered (fictional mark).",
        "Persons: interviewing officer; suspect; solicitor (modelled).",
        "Appropriate adult / interpreter: see youth / interpreter records where modelled.",
      ],
      52,
    );
  }
  h2(ctx, "Record body");
  for (const ln of linesFromPage(ctx.page, 3).slice(0, 12)) para(ctx, ln, { size: 8 });
  h2(ctx, "Exhibits / media produced in interview");
  table(
    ctx,
    ["Ref", "Shown", "Response noted"],
    [
      ["EX1", "Yes", "Comment recorded (modelled)"],
      ["Clip C1", "Yes", "Identification remains conditional"],
      ["Master", "No", "Referred / absent — not shown"],
    ],
    [1, 1, 3],
  );
  h2(ctx, "Limitations");
  para(ctx, "Incomplete transcript markers must not be treated as a full record. Allegation not proved by this interview extract.", { size: 8 });
  para(ctx, "Next action: reconcile interview URN against media schedule and MG6 index before court send.", { size: 8 });
}

function drawReport(ctx: DrawCtx, title: string): void {
  h1(ctx, title, 12);
  fieldRow(ctx, "Report id", fictionalUrn(ctx.docSpec.docId));
  fieldRow(ctx, "State", ctx.docSpec.state);
  rule(ctx);
  for (const h of ctx.page.headings.slice(1)) h2(ctx, h);
  for (const ln of linesFromPage(ctx.page, 2).slice(0, 18)) para(ctx, ln, { size: 8 });
}

function drawDefence(ctx: DrawCtx): void {
  // Privilege watermark band
  ctx.pdf.save();
  ctx.pdf.rect(MARGIN_X, ctx.y, BODY_WIDTH, 22).fill("#4a1c1c");
  ctx.pdf.fillColor("#ffffff").font("Helvetica-Bold").fontSize(9);
  ctx.pdf.text("PRIVILEGED — DEFENCE WORKING EXTRACT", MARGIN_X, ctx.y + 6, {
    width: BODY_WIDTH,
    align: "center",
    lineBreak: false,
  });
  ctx.pdf.restore();
  ctx.y += 28;
  h1(ctx, "Defence proof of evidence (extract)", 11);
  para(ctx, "Not for ordinary copy / export / API send.", { size: 8, bold: true });
  rule(ctx);
  fieldRow(ctx, "Privilege band", "defence_working / privileged");
  fieldRow(ctx, "Audience", "Defence team only (fictional test)");
  fieldRow(ctx, "Page purpose", ctx.page.purpose.replace(/_/g, " "));
  h2(ctx, "Instructions / issues");
  for (const ln of linesFromPage(ctx.page, 1).slice(0, 12)) para(ctx, ln, { size: 8 });
  h2(ctx, "Working checklist");
  table(
    ctx,
    ["Issue", "Current position", "Next"],
    [
      ["Charge instrument", "Review operative vs draft", "Prefer operative"],
      ["Missing masters", "Chase by MG6 identity", "Do not invent pages"],
      ["Media", "Clip ≠ master", "Confirm served state"],
      ["Attribution", "Keep maker distinct", "No ownership collapse"],
    ],
    [2, 3, 2],
  );
  para(ctx, "Safe current position: privileged working notes only — not a court-ready proof. Do not overstate allegation as proved.", { size: 8 });
}

function drawOrderOrHearing(ctx: DrawCtx, kind: "order" | "hearing"): void {
  h1(ctx, kind === "order" ? "COURT ORDER" : "HEARING NOTICE", 13);
  para(ctx, kind === "order" ? "Operative paragraphs (fictional test)" : "Listing particulars (fictional test)", { size: 8 });
  rule(ctx);
  fieldRow(ctx, "Reference", fictionalUrn(ctx.docSpec.docId));
  for (const ln of linesFromPage(ctx.page, 1).slice(0, 14)) para(ctx, ln, { size: 8.5 });
  if (kind === "order") {
    ensureY(ctx, 36);
    ctx.pdf.rect(MARGIN_X, ctx.y, BODY_WIDTH, 32).stroke();
    ctx.pdf.font("Helvetica").fontSize(8).text("Judicial / clerk endorsement (fictional): ______________________", MARGIN_X + 6, ctx.y + 10);
    ctx.y += 40;
  }
}

function drawExhibitOrContinuity(ctx: DrawCtx, kind: "exhibit" | "continuity"): void {
  h1(ctx, kind === "exhibit" ? "EXHIBIT LIST (MG12-style)" : "CONTINUITY / CHAIN OF CUSTODY", 11);
  rule(ctx);
  if (kind === "exhibit") {
    table(
      ctx,
      ["Ex#", "Description", "Recovered by", "Continuity"],
      [
        ["EX1", "Sealed bag / device", "PC Fictional", "CR-01"],
        ["EX2", "Clothing item", "CSI Fictional", "CR-02"],
        ["EX3", "Phone handset", "Digital unit", "phone sch."],
      ],
      [1, 3, 2, 2],
    );
  } else {
    table(
      ctx,
      ["Time", "From", "To", "Seal"],
      [
        ["Day0 22:10", "Scene", "Exhibits", "S-100"],
        ["Day1 09:00", "Exhibits", "Lab", "S-100"],
        ["Day3 14:00", "Lab", "Exhibits", "S-101"],
      ],
      [2, 2, 2, 1],
    );
  }
  for (const ln of linesFromPage(ctx.page, 6).slice(0, 8)) para(ctx, ln, { size: 8 });
}

function drawEmail(ctx: DrawCtx): void {
  h1(ctx, "EMAIL / ATTACHMENT SUMMARY", 11);
  box(
    ctx,
    "Headers",
    [
      "From: disclosures@fictional.example",
      "To: defence@fictional.example",
      `Subject: Service — fictional disclosure pack`,
    ],
    48,
  );
  table(
    ctx,
    ["Attachment", "SHA256 placeholder", "Note"],
    [
      ["MG5.pdf", "ft…c3", "served"],
      ["clip_C1.mp4", "not_exercised", "metadata only"],
    ],
    [2, 2, 2],
  );
}

function drawMetadata(ctx: DrawCtx): void {
  h1(ctx, "MEDIA METADATA FIXTURE", 11);
  para(ctx, "Native video/audio bytes: not_exercised", { bold: true, size: 9 });
  rule(ctx);
  table(
    ctx,
    ["Field", "Value"],
    [
      ["path", "/fictional/media/clip_C1.mp4"],
      ["sha256", "ft-meta-placeholder"],
      ["codec/duration", "modelled placeholders"],
      ["native_content", "not_exercised"],
    ],
    [2, 4],
  );
}

function drawGeneric(ctx: DrawCtx): void {
  h1(ctx, String(ctx.docSpec.title || ctx.docSpec.kind).toUpperCase(), 11);
  para(ctx, `Kind: ${ctx.docSpec.kind}    State: ${ctx.docSpec.state}`, { size: 8 });
  rule(ctx);
  for (const h of ctx.page.headings) h2(ctx, h);
  for (const ln of linesFromPage(ctx.page, 0).slice(0, 20)) para(ctx, ln, { size: 8 });
}

function drawChronology(ctx: DrawCtx): void {
  h1(ctx, "CASE CHRONOLOGY", 12);
  table(
    ctx,
    ["Date", "Event", "Source pointer"],
    [
      ["D0", "Incident alleged", "MG5"],
      ["D1", "Arrest / custody", "custody record"],
      ["D2", "Interview", "interview record"],
      ["D3", "Procedural listing", "hearing notice"],
      ["D4", "Disclosure update", "MG6 / schedules"],
    ],
    [1, 3, 2],
  );
}

function drawAbeYouthInterpreterWelsh(ctx: DrawCtx): void {
  const titles: Record<string, string> = {
    abe_record: "ABE / VISUALLY RECORDED INTERVIEW RECORD",
    youth_justice_record: "YOUTH JUSTICE / YOT RECORD EXTRACT",
    interpreter_record: "INTERPRETER / TRANSLATION RECORD",
    welsh_language_record: "WELSH-LANGUAGE RECORD / COFNOD IAITH GYMRAEG",
  };
  h1(ctx, titles[ctx.page.layoutKind] || ctx.docSpec.title, 11);
  rule(ctx);
  for (const ln of linesFromPage(ctx.page, 0).slice(0, 18)) para(ctx, ln, { size: 8 });
}

function renderPage(pdf: any, docSpec: DocSpec, page: PageSpec, pdfPageNumber: number): void {
  const y0 = drawFictionalBanner(pdf);
  const ctx: DrawCtx = { pdf, page, docSpec, pdfPageNumber, y: Math.max(y0, MARGIN_TOP) };
  clipBody(pdf);

  switch (page.layoutKind) {
    case "written_charge":
      drawWrittenCharge(ctx);
      break;
    case "indictment":
      drawIndictment(ctx);
      break;
    case "mg05":
      drawMg05(ctx);
      break;
    case "mg06":
      drawMg06(ctx);
      break;
    case "mg06c":
      drawScheduleTable(ctx, "MG6C — UNUSED MATERIAL SCHEDULE");
      break;
    case "unused_schedule":
      drawScheduleTable(ctx, "UNUSED MATERIAL SCHEDULE");
      break;
    case "disclosure_schedule":
      drawScheduleTable(ctx, "DISCLOSURE SCHEDULE");
      break;
    case "media_schedule":
      drawScheduleTable(ctx, "CCTV / BWV / MEDIA CLIP SCHEDULE");
      break;
    case "master_clip_schedule":
      drawScheduleTable(ctx, "MASTER VERSUS CLIP SCHEDULE");
      break;
    case "phone_download_schedule":
      drawScheduleTable(ctx, "PHONE / DOWNLOAD / MESSAGE SCHEDULE");
      break;
    case "mg11_statement":
    case "mg11_continuation":
      drawMg11(ctx);
      break;
    case "custody_record":
      drawCustody(ctx);
      break;
    case "interview_record":
      drawInterview(ctx);
      break;
    case "forensic_report":
      drawReport(ctx, "STREAMLINED FORENSIC REPORT");
      break;
    case "medical_report":
      drawReport(ctx, "MEDICAL REPORT EXTRACT");
      break;
    case "expert_report":
      drawReport(ctx, "EXPERT REPORT");
      break;
    case "defence_proof":
      drawDefence(ctx);
      break;
    case "hearing_notice":
      drawOrderOrHearing(ctx, "hearing");
      break;
    case "court_order":
      drawOrderOrHearing(ctx, "order");
      break;
    case "exhibit_schedule":
      drawExhibitOrContinuity(ctx, "exhibit");
      break;
    case "continuity_record":
      drawExhibitOrContinuity(ctx, "continuity");
      break;
    case "email_attachment_summary":
      drawEmail(ctx);
      break;
    case "metadata_fixture":
      drawMetadata(ctx);
      break;
    case "chronology":
      drawChronology(ctx);
      break;
    case "abe_record":
    case "youth_justice_record":
    case "interpreter_record":
    case "welsh_language_record":
      drawAbeYouthInterpreterWelsh(ctx);
      break;
    default:
      drawGeneric(ctx);
      break;
  }

  endClip(pdf);
  drawFooter(ctx);
}

export async function renderKindSpecificPdf(
  caseDir: string,
  docs: DocSpec[],
  loadPdfKit: () => any,
): Promise<{
  pdfPath: string;
  sha256: string;
  pageCount: number;
  pageMap: Array<{ pageIdentity: string; pdfPageNumber: number; docId: string; purpose: string; layoutKind: string }>;
}> {
  const PDFDocument = loadPdfKit();
  fs.mkdirSync(caseDir, { recursive: true });
  const pdfPath = path.join(caseDir, "bundle-fictional-test.pdf");
  const pageMap: Array<{
    pageIdentity: string;
    pdfPageNumber: number;
    docId: string;
    purpose: string;
    layoutKind: string;
  }> = [];
  let pdfPageNumber = 0;

  await new Promise<void>((resolve, reject) => {
    const pdf = new PDFDocument({
      size: "A4",
      margin: 0,
      bufferPages: true,
      autoFirstPage: true,
    });
    const stream = fs.createWriteStream(pdfPath);
    pdf.pipe(stream);
    let first = true;

    for (const d of docs) {
      for (const page of d.pages) {
        if (!first) pdf.addPage({ size: "A4", margin: 0 });
        first = false;
        pdfPageNumber += 1;
        pageMap.push({
          pageIdentity: page.pageIdentity,
          pdfPageNumber,
          docId: d.docId,
          purpose: page.purpose,
          layoutKind: page.layoutKind,
        });
        renderPage(pdf, d, page, pdfPageNumber);
      }
    }

    // Edge case: no pages
    if (pdfPageNumber === 0) {
      drawFictionalBanner(pdf);
      pdf.font("Helvetica").fontSize(10).fillColor("#111111");
      pdf.text("No present paginated documents in this pack (all absent/referred-only).", MARGIN_X, 80, {
        width: BODY_WIDTH,
      });
    }

    pdf.end();
    stream.on("finish", () => resolve());
    stream.on("error", reject);
  });

  const buf = fs.readFileSync(pdfPath);
  return { pdfPath, sha256: sha(buf), pageCount: pdfPageNumber, pageMap };
}
