import assert from "node:assert/strict";

import {
  buildCanonicalPipelineFromDocumentUnits,
  type UploadedDocumentUnit,
} from "@/lib/criminal/build-from-document-units";
import { buildLiveProductionSurfacesFromDocumentUnits } from "@/lib/criminal/canonical-live-surface-adapter";
import { extractCriminalCaseMeta, validateCourtName } from "@/lib/criminal/structured-extractor";
import { sanitizeChargeLocation } from "@/lib/criminal/structured-charge-state";
import {
  professionalizeSolicitorPressurePoint,
  sanitizeSolicitorProse,
} from "@/lib/criminal/solicitor-visible-sanitization";
import { stripInternalCorpusIdentifiers } from "@/lib/criminal/solicitor-visible-matter-reference";

let passed = 0;
function check(name: string, fn: () => void): void {
  fn();
  passed += 1;
  process.stdout.write(`  ok  ${name}\n`);
}

check("joined public-form labels preserve defendant, charge and court", () => {
  const meta = extractCriminalCaseMeta({
    documentName: "combined.pdf",
    now: new Date("2026-01-01T00:00:00Z"),
    text: `
DefendantRyan HaleDOB22/05/2001
CourtNorthbridge Magistrates' CourtHearing16 June 2026 at 10:00
Charge
Robbery, contrary to section 8(1) Theft Act 1968
Particulars
On 16 June 2026 Ryan Hale is alleged to have stolen a phone using force.
`,
  });
  assert.equal(meta.defendantName, "Ryan Hale");
  assert.match(meta.charges[0]?.offence ?? "", /robbery/i);
  assert.equal(meta.hearings.length, 1);
  assert.equal(meta.hearings[0]?.court, "Northbridge Magistrates' Court");
});

check("concatenated ChargeMurder label is extracted without invented particulars", () => {
  const meta = extractCriminalCaseMeta({
    documentName: "murder-bundle.pdf",
    text: `DefendantAva NorthDOB02/01/1990\nChargeMurder, contrary to common law\nParticulars\nThe prosecution alleges an unlawful killing.`,
  });
  assert.equal(meta.defendantName, "Ava North");
  assert.match(meta.charges[0]?.offence ?? "", /murder/i);
});

check("Accused / DOB compact label preserves the accused name", () => {
  const meta = extractCriminalCaseMeta({
    documentName: "thin.pdf",
    text: `Accused / DOBTia Sharp / 1994-10-01\nCharge: Criminal damage contrary to section 1 Criminal Damage Act 1971`,
  });
  assert.equal(meta.defendantName, "Tia Sharp");
});

check("repeated descriptions of one hearing collapse to one normalized listing", () => {
  const meta = extractCriminalCaseMeta({
    documentName: "bundle.pdf",
    now: new Date("2026-01-01T00:00:00Z"),
    text: `
Hearing listed at Northchester Crown Court on 22 May 2026 for case management.
Matter listed for PTPH on 22 May 2026 at Northchester Crown Court.
First appearance at Northchester Crown Court on 22 May 2026.
`,
  });
  assert.equal(meta.hearings.length, 1);
  assert.equal(meta.hearings[0]?.court, "Northchester Crown Court");
  assert.equal(meta.hearings[0]?.type, "Plea Hearing");
});

check("glued field prefixes do not contaminate court names", () => {
  assert.equal(validateCourtName("CourtNorthbridge Magistrates' Court"), "Northbridge Magistrates' Court");
  assert.equal(
    validateCourtName("Police stationOld Mill Police StationCourtNorthshire Magistrates Court"),
    "Northshire Magistrates Court",
  );
  assert.equal(validateCourtName("# Crown Court at Manchester"), null);
});

check("prose fragments are not rendered as charge locations", () => {
  assert.equal(sanitizeChargeLocation(", not every element of the allegation"), null);
  assert.equal(sanitizeChargeLocation("Station Lane, Northbridge"), "Station Lane, Northbridge");
});

function combinedBundle(): UploadedDocumentUnit {
  return {
    id: "combined-bundle",
    title: "Criminal defence bundle.pdf",
    documentType: "case_document",
    uploadOrder: 0,
    pages: [
      { pageNumber: 1, compiledPage: 1, text: "PROSECUTION BUNDLE\nIndex", pageIdentityKnown: true },
      {
        pageNumber: 2,
        compiledPage: 2,
        pageIdentityKnown: true,
        text: `
CHARGE SHEET
Defendant: Arden Vale
Charge
Robbery, contrary to section 8(1) Theft Act 1968
Particulars
On 2 June 2026 at Station Lane, Arden Vale is alleged to have stolen a phone and used force.
`,
      },
      {
        pageNumber: 3,
        compiledPage: 3,
        pageIdentityKnown: true,
        text: "MG5 summary\nThe defendant was charged with robbery. This is narrative only.",
      },
    ],
    fullText: null,
  };
}

check("combined-bundle inner charge page feeds canonical production surfaces", () => {
  const pipeline = buildCanonicalPipelineFromDocumentUnits([combinedBundle()]);
  assert.equal(pipeline.charges.length, 1);
  assert.match(pipeline.charges[0]?.offence ?? "", /robbery/i);
  assert.equal(pipeline.charges[0]?.sourcePage, "p.2");
  assert.equal(pipeline.charges[0]?.compiledPage, "p.2");
  assert.equal(pipeline.charges[0]?.sourceDocumentTitle, "Criminal defence bundle.pdf");

  const surfaces = buildLiveProductionSurfacesFromDocumentUnits([combinedBundle()]);
  assert.match(surfaces.charges[0]?.offence ?? "", /robbery/i);
  assert.match(surfaces.chargeCompleteness.sourceChargeText ?? "", /stolen a phone/i);
  assert.doesNotMatch(surfaces.chargeCompleteness.sourceChargeText ?? "", /^\[?unknown\]?$/i);
});

check("narrative charged-with prose alone does not become a charge instrument", () => {
  const doc: UploadedDocumentUnit = {
    id: "mg5-only",
    title: "MG5 case summary.pdf",
    documentType: "mg5",
    uploadOrder: 0,
    pages: [{ pageNumber: 1, compiledPage: 1, pageIdentityKnown: true, text: "The defendant was charged with robbery following arrest. Evidence remains disputed." }],
    fullText: null,
  };
  assert.equal(buildCanonicalPipelineFromDocumentUnits([doc]).charges.length, 0);
});

check("charge-sheet-extract and charge-wording layouts remain page-bound", () => {
  const documents: UploadedDocumentUnit[] = [
    {
      id: "extract",
      title: "combined.pdf",
      documentType: "case_document",
      uploadOrder: 0,
      pages: [
        {
          pageNumber: 3,
          compiledPage: 3,
          pageIdentityKnown: true,
          text: "CHARGE SHEET EXTRACT\nLena Price is charged with Fraud by false representation in that, on 14 April 2026, the alleged conduct occurred.",
        },
      ],
      fullText: null,
    },
    {
      id: "wording",
      title: "second-combined.pdf",
      documentType: "case_document",
      uploadOrder: 1,
      pages: [
        {
          pageNumber: 9,
          compiledPage: 9,
          pageIdentityKnown: true,
          text: "CHARGE WORDING\nOn 9 June 2026 at Northgate, Sofia Blake is alleged to have dishonestly handled stolen goods.",
        },
      ],
      fullText: null,
    },
  ];
  const pipeline = buildCanonicalPipelineFromDocumentUnits(documents);
  assert.equal(pipeline.charges.length, 2);
  assert.deepEqual(pipeline.charges.map((charge) => charge.sourcePage), ["p.3", "p.9"]);
  assert.equal(pipeline.charges[0]?.offence, "Fraud by false representation");
  assert.deepEqual(pipeline.charges[0]?.defendants, ["Lena Price"]);
  assert.doesNotMatch(pipeline.charges[0]?.offence ?? "", /\bat$/i);
});

check("operative inner charge page outranks a provisional cover label", () => {
  const doc: UploadedDocumentUnit = {
    id: "murder-combined",
    title: "combined.pdf",
    documentType: "case_document",
    uploadOrder: 0,
    pages: [
      { pageNumber: null, compiledPage: 1, pageIdentityKnown: true, text: "ChargeMurder, contrary to common law" },
      {
        pageNumber: null,
        compiledPage: 3,
        pageIdentityKnown: true,
        text: "CHARGE SHEET EXTRACT\nLeon Hale is charged with murder, contrary to common law, in that on 14 April 2026 he unlawfully killed Marcus Vale.",
      },
    ],
    fullText: null,
  };
  const pipeline = buildCanonicalPipelineFromDocumentUnits([doc]);
  assert.equal(pipeline.charges.length, 1);
  assert.equal(pipeline.charges[0]?.documentRole, "operative");
  assert.equal(pipeline.charges[0]?.compiledPage, "p.3");
  assert.match(pipeline.charges[0]?.particulars ?? "", /unlawfully killed Marcus Vale/i);
  assert.deepEqual(pipeline.charges[0]?.defendants, ["Leon Hale"]);
});

check("wrapped and alternative-labelled particulars are reconstructed to a complete sentence", () => {
  const docs: UploadedDocumentUnit[] = [
    {
      id: "wrapped",
      title: "wrapped.pdf",
      documentType: "case_document",
      uploadOrder: 0,
      pages: [{
        pageNumber: 2,
        compiledPage: 2,
        pageIdentityKnown: true,
        text: "CHARGE SHEET\nDefendant: Ryan Hale\nCharge\nRobbery, contrary to section 8 Theft Act 1968\nParticulars\nOn 16 June Ryan Hale stole a phone and, immediately before doing\nso, used force on the complainant.\nMG5 CASE SUMMARY",
      }],
      fullText: null,
    },
    {
      id: "alternative-label",
      title: "thin.pdf",
      documentType: "case_document",
      uploadOrder: 1,
      pages: [{
        pageNumber: 1,
        compiledPage: 1,
        pageIdentityKnown: true,
        text: "CHARGE SHEET EXTRACT\nDefendant: Tia Sharp\nCharge: Criminal damage contrary to section 1 Criminal Damage Act 1971\nBundle wording of allegation: On 4 February Tia Sharp damaged a window belonging to Samir Nelson.",
      }],
      fullText: null,
    },
  ];
  const charges = buildCanonicalPipelineFromDocumentUnits(docs).charges;
  assert.match(charges.find((charge) => /robbery/i.test(charge.offence))?.particulars ?? "", /doing so, used force/i);
  assert.match(charges.find((charge) => /criminal damage/i.test(charge.offence))?.particulars ?? "", /damaged a window/i);
});

check("visually wrapped charge statements remain complete and receive a grounded offence label", () => {
  const doc: UploadedDocumentUnit = {
    id: "wrapped-allegation",
    title: "case bundle.pdf",
    documentType: "charge_sheet",
    uploadOrder: 0,
    pages: [{
      pageNumber: 1,
      compiledPage: 1,
      pageIdentityKnown: true,
      text: "CHARGE SHEET EXTRACT\nOn 10 May 2026 at Crown Quay, Amira Rowe is alleged to have used threatening or abusive words or behaviour with\nintent to cause harassment, alarm or distress.\nMG5 CASE SUMMARY",
    }],
    fullText: null,
  };
  const charge = buildCanonicalPipelineFromDocumentUnits([doc]).charges[0];
  assert.equal(charge?.offence, "Threatening or abusive words or behaviour");
  assert.match(charge?.particulars ?? "", /with intent to cause harassment, alarm or distress\.$/i);
});

check("multi-count wrapped statements stay attached to their own count", () => {
  const doc: UploadedDocumentUnit = {
    id: "multi-count",
    title: "multi-count.pdf",
    documentType: "charge_sheet",
    uploadOrder: 0,
    pages: [{
      pageNumber: 1,
      compiledPage: 1,
      pageIdentityKnown: true,
      text: "CHARGE SHEET EXTRACT\nOn 16 May 2026 at Southbank Mall, Harper Hale is alleged to have used threatening or abusive words or behaviour with\nintent to cause harassment alarm or distress.\nADDITIONAL COUNT / CO-DEFENDANT\nCo-defendant: Mina North.\nCount 2: Public order s.4A - used threatening or abusive words or behaviour with intent to cause harassment alarm or\ndistress.\nFictional evaluation file",
    }],
    fullText: null,
  };
  const charges = buildCanonicalPipelineFromDocumentUnits([doc]).charges;
  assert.equal(charges.length, 2);
  assert.match(charges[0]?.particulars ?? "", /Harper Hale/i);
  assert.doesNotMatch(charges[1]?.particulars ?? "", /Harper Hale/i);
  assert.match(charges[1]?.particulars ?? "", /Public order s\.4A/i);
});

check("wrapped theft and supply allegations receive grounded complete labels", () => {
  const make = (id: string, statement: string): UploadedDocumentUnit => ({
    id,
    title: `${id}.pdf`,
    documentType: "charge_sheet",
    uploadOrder: 0,
    pages: [{
      pageNumber: 1,
      compiledPage: 1,
      pageIdentityKnown: true,
      text: `CHARGE SHEET EXTRACT\n${statement}\nMG5 CASE SUMMARY`,
    }],
    fullText: null,
  });
  const theft = buildCanonicalPipelineFromDocumentUnits([
    make("theft", "On 22 June 2026 at Kingswell Gardens, Theo Vale is alleged to have dishonestly appropriated retail goods belonging to\na shop with intent permanently to deprive it of them."),
  ]).charges[0];
  const supply = buildCanonicalPipelineFromDocumentUnits([
    make("supply", "On 20 June 2026 at Southbank Mall, Caleb Hale is alleged to have possessed a controlled Class A drug with intent to\nsupply it to another."),
  ]).charges[0];
  assert.equal(theft?.offence, "Theft from a shop");
  assert.match(theft?.particulars ?? "", /permanently to deprive/i);
  assert.equal(supply?.offence, "Possession with intent to supply a Class A controlled drug");
  assert.match(supply?.particulars ?? "", /supply it to another/i);
});

check("bail and custody states never become charge lifecycle status", () => {
  const meta = extractCriminalCaseMeta({
    documentName: "charge.pdf",
    text: "Status: conditional bail\nCHARGE SHEET\nCharge: Robbery, contrary to section 8 Theft Act 1968",
  });
  assert.equal(meta.charges[0]?.status, null);
});

check("PDF boundary converts document-lifecycle diagnostics into professional wording", () => {
  const point = professionalizeSolicitorPressurePoint(
    'Document lifecycle role: Document role operative for "CB-TEST-001.pdf".',
  );
  assert.equal(point?.label, "Charge-document version");
  assert.match(point?.reason ?? "", /current charge document appears to have been identified/i);
  assert.doesNotMatch(point?.reason ?? "", /Document lifecycle role|CB-TEST/i);
});

check("PDF boundary converts raw interview enums into professional wording", () => {
  const point = professionalizeSolicitorPressurePoint(
    "Recording service versus transcript completeness: Recording state not_safely_confirmed; transcript state incomplete.",
  );
  assert.equal(point?.label, "Interview materials");
  assert.match(point?.reason ?? "", /recording is not safely confirmed/i);
  assert.doesNotMatch(point?.reason ?? "", /not_safely_confirmed/);
});

check("PDF boundary removes malformed event extracts and internal PACE diagnostics", () => {
  const point = professionalizeSolicitorPressurePoint(
    "Custody / interview clock: Competing timestamps for the same event (s2cctv bridge streetservedserved): 21:18 vs 21:20. Affirmative PACE OK / no-breach is forbidden.",
  );
  assert.equal(point?.label, "Timing discrepancy");
  assert.equal(
    point?.reason,
    "Timing requires review: the papers record competing timestamps (21:18, 21:20). Reconcile the source records before relying on the sequence.",
  );
  assert.doesNotMatch(point?.reason ?? "", /s2cctv|servedserved|Affirmative|no-breach/i);
});

check("final solicitor prose boundary restores protected acronym casing", () => {
  assert.equal(sanitizeSolicitorProse("cctv and pace material"), "CCTV and PACE material");
});

check("final solicitor prose boundary removes evaluation filenames and standalone diagnostics", () => {
  const text = sanitizeSolicitorProse(
    'Document role operative for "CB-TEST-2026-0033.pdf". Source: CB-TEST-2026-0033.pdf.',
  );
  assert.match(text, /current charge document appears to have been identified/i);
  assert.match(text, /Source: Source bundle/i);
  assert.doesNotMatch(text, /Document role operative|CB-TEST/i);
});

check("standalone timestamp diagnostics discard malformed event descriptions", () => {
  const text = sanitizeSolicitorProse(
    "Competing timestamps for the same event (s2cctv bridge streetservedserved): 21:18 vs 21:20.",
  );
  assert.equal(
    text,
    "Timing requires review: the papers record competing timestamps (21:18, 21:20). Reconcile the source records before relying on the sequence.",
  );
});

check("provenance limitations are concise professional instructions", () => {
  const text = sanitizeSolicitorProse(
    "Exact document title, page, evidence state, and defendant/count provenance not fully available — do not treat filename alone as source proof.",
  );
  assert.equal(
    text,
    "The exact page and defendant/count link are not fully available. Confirm the source document before relying on this point.",
  );
});

check("all CaseBrain evaluation PDF filenames are removed from ordinary solicitor prose", () => {
  const text = stripInternalCorpusIdentifiers(
    "Source: CB-AA-MESSY-0009_Robbery_co-accused_messy_bundle.pdf (case document).",
  );
  assert.equal(text, "Source: Source bundle (case document).");
  assert.doesNotMatch(text, /CB-AA|co_accused/i);
});

check("amended and superseded lifecycle diagnostics become professional instructions", () => {
  const amended = professionalizeSolicitorPressurePoint(
    'Document lifecycle role: Document role amended for "CB-TB-22_Sam_Okonkwo.pdf".',
  );
  const superseded = sanitizeSolicitorProse(
    'Document role superseded for "CB-AA-MESSY-0009.pdf".',
  );
  assert.equal(amended?.label, "Charge-document version");
  assert.match(amended?.reason ?? "", /amended charge document appears/i);
  assert.match(superseded, /earlier charge document is marked as superseded/i);
  assert.doesNotMatch(`${amended?.reason} ${superseded}`, /Document role|CB-/i);
});

check("unfinished charge locations are suppressed rather than displayed", () => {
  assert.equal(sanitizeChargeLocation("in Northchester district, the"), null);
  assert.equal(sanitizeChargeLocation("in Northchester district,"), null);
  assert.equal(sanitizeChargeLocation("Station Lane, Northbridge"), "Station Lane, Northbridge");
});

check("wrapped harassment and drug-supply wording receives a complete grounded label", () => {
  const documents: UploadedDocumentUnit[] = [
    {
      id: "harassment",
      title: "harassment.pdf",
      documentType: "case_document",
      uploadOrder: 0,
      pages: [{
        pageNumber: 1,
        compiledPage: 1,
        pageIdentityKnown: true,
        text: "CHARGE WORDING\nBetween 12/05/2026 and 27/04/2026, Priya Baines is alleged to have pursued a course of conduct amounting to\nharassment of Mira Seddon.\nMG5 CASE SUMMARY",
      }],
      fullText: null,
    },
    {
      id: "supply",
      title: "supply.pdf",
      documentType: "case_document",
      uploadOrder: 1,
      pages: [{
        pageNumber: 1,
        compiledPage: 1,
        pageIdentityKnown: true,
        text: "CHARGE WORDING\nOn 09/04/2026 at Eastmere Bus Station, Callum Vale is alleged to have possessed a controlled drug of Class A with\nintent to supply it to another.\nMG5 CASE SUMMARY",
      }],
      fullText: null,
    },
  ];
  const charges = buildCanonicalPipelineFromDocumentUnits(documents).charges;
  assert.equal(charges.find((row) => row.sourceDocumentTitle === "harassment.pdf")?.offence, "Harassment");
  assert.equal(
    charges.find((row) => row.sourceDocumentTitle === "supply.pdf")?.offence,
    "Possession with intent to supply a Class A controlled drug",
  );
});

check("version headings and drafting notes cannot become charges, and duplicate wrapped charges collapse", () => {
  const messy: UploadedDocumentUnit = {
    id: "messy",
    title: "messy.pdf",
    documentType: "case_document",
    uploadOrder: 0,
    pages: [{
      pageNumber: 4,
      compiledPage: 4,
      pageIdentityKnown: true,
      text: "CHARGE SHEET\nDefendant: Mina West\nCount 1: OLD VERSION\nCount 1: Robbery.\nCount 2: / alternative: lesser or related allegation to be reviewed depending on served\nParticulars: On 14 April 2026 Mina West is alleged to have stolen a phone using force.",
    }],
    fullText: null,
  };
  const fraud: UploadedDocumentUnit = {
    id: "fraud",
    title: "fraud.pdf",
    documentType: "case_document",
    uploadOrder: 1,
    pages: [{
      pageNumber: 3,
      compiledPage: 3,
      pageIdentityKnown: true,
      text: "CHARGE SHEET / INDICTMENT EXTRACT\nDefendant: Marcus Vale\nCount 1: Fraud by false representation, contrary to section 2 of the Fraud Act 2006. Particulars: between dates in\n2025 and 2026, Marcus Vale is alleged to have dishonestly made representations.\nCharge: Fraud by false representation, s.2 Fraud Act 2006",
    }],
    fullText: null,
  };
  const charges = buildCanonicalPipelineFromDocumentUnits([messy, fraud]).charges;
  assert.equal(charges.filter((row) => /robbery/i.test(row.offence)).length, 1);
  assert.equal(charges.filter((row) => /fraud by false representation/i.test(row.offence)).length, 1);
  assert.doesNotMatch(charges.map((row) => row.offence).join(" | "), /OLD VERSION|alternative: lesser/i);
});

check("competing statutory routes are labelled as unresolved rather than rendered as a fragment", () => {
  const doc: UploadedDocumentUnit = {
    id: "unclear-route",
    title: "unclear-route.pdf",
    documentType: "charge_sheet",
    uploadOrder: 0,
    pages: [{
      pageNumber: 2,
      compiledPage: 2,
      pageIdentityKnown: true,
      text: "CHARGE SHEET AND INITIAL DETAILS\nDefendant: Samuel Okonkwo\nOffence\nCharge wording unclear on served papers; allegation appears to concern assisting another to retain criminal\nproperty contrary to section 327 or section 328 Proceeds of Crime Act 2002\nParticulars\nThe served charge sheet contains inconsistent wording.",
    }],
    fullText: null,
  };
  const charge = buildCanonicalPipelineFromDocumentUnits([doc]).charges[0];
  assert.equal(charge?.offence, "Proceeds of Crime Act 2002 allegation — exact statutory route unclear");
  assert.match(charge?.particulars ?? "", /inconsistent wording/i);
});

process.stdout.write(`legacy 1120 shared-root contracts: ${passed} passed\n`);
