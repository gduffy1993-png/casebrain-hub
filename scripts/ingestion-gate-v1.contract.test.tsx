import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { IngestionGateNotice } from "../components/criminal/IngestionGateNotice";
import {
  buildAuthenticatedMatterCanonicalFromDocuments,
  composeAuthenticatedBundleSourceWithCanonical,
} from "../lib/criminal/authenticated-matter-canonical";
import { getDocumentBodyText } from "../lib/bundle/bundle-document-text";
import {
  assessmentForStoredDocument,
  buildCaseIngestionAssessment,
  buildIngestionAssessment,
  quarantinedIngestionAssessment,
} from "../lib/upload/ingestion-assessment";

let checks = 0;
async function check(name: string, run: () => void | Promise<void>): Promise<void> {
  await run();
  checks += 1;
  console.log(`ok ${checks} - ${name}`);
}

const liamPlaceholder =
  "[PDF extraction failed: PDF parsing failed: bad XRef entry. The PDF may be corrupted, password-protected, or use an unsupported format.. File stored but text extraction unavailable. Please re-upload a valid PDF or use OCR if needed.]";

async function main() {
await check("Liam parser placeholder is quarantined and cannot become quiet source output", () => {
  assert.equal(liamPlaceholder.length, 233);
  const doc = {
    id: "liam-parker",
    name: "Liam Parker theft bundle.pdf",
    type: "application/pdf",
    raw_text: liamPlaceholder,
    extracted_text: liamPlaceholder,
    extracted_json: {
      extractionError: "PDF parsing failed: bad XRef entry",
    },
  };
  const composed = composeAuthenticatedBundleSourceWithCanonical([doc], {
    caseId: "liam-parker",
    withSurfaces: true,
  });
  assert.equal(composed.canonical.ingestion.decision, "quarantined");
  assert.equal(composed.canonical.ingestion.substantiveOutputsWithheld, true);
  assert.ok(composed.canonical.ingestion.reasonCodes.includes("parser_diagnostic_placeholder"));
  assert.ok(composed.canonical.ingestion.reasonCodes.includes("parser_xref_failure"));
  assert.equal(composed.combinedTextLength, 0);
  assert.equal(composed.units.length, 0);
  assert.equal(composed.pipeline.bundleText, "");
  assert.equal(composed.canonical.pageAwareFrontMatterScan, null);
  assert.deepEqual(composed.canonical.findings, []);
  assert.deepEqual(composed.canonical.evidenceRows, []);
  assert.deepEqual(composed.canonical.chaseLabels, []);
  assert.equal(composed.surfaces, null);
  assert.equal(getDocumentBodyText(doc), "");

  const html = renderToStaticMarkup(
    <IngestionGateNotice assessment={composed.canonical.ingestion} surface="overview" />,
  );
  assert.match(html, /Source extraction incomplete/);
  assert.match(html, /PDF could not be safely read/);
  assert.match(html, /Substantive outputs withheld/);
  assert.doesNotMatch(html, /\b0 items\b/i);
  assert.doesNotMatch(html, /no chase needed/i);
  assert.doesNotMatch(html, /bad XRef entry/i);
});

await check("recoverable XRef stream fallback remains available but degraded", () => {
  const text =
    "R v Marcus Andrew Vale\nRobbery contrary to section 8 Theft Act 1968\nFull interview transcript outstanding.";
  const assessment = buildIngestionAssessment({
    fileName: "recoverable-xref.pdf",
    mimeType: "application/pdf",
    text,
    pageCount: 1,
    pageUnits: [],
    parserRoute: "pdf_stream_fallback",
    parserError: "bad XRef entry",
  });
  assert.equal(assessment.decision, "degraded");
  assert.equal(assessment.sourceTextUsable, true);
  assert.equal(assessment.substantiveOutputsAllowed, true);
  assert.ok(assessment.reasonCodes.includes("fallback_recovered_content"));
  assert.ok(assessment.reasonCodes.includes("parser_xref_failure"));

  const built = buildAuthenticatedMatterCanonicalFromDocuments([
    {
      id: "recoverable",
      name: "recoverable-xref.pdf",
      type: "application/pdf",
      raw_text: text,
      extracted_text: text,
      extracted_json: { ingestionAssessment: assessment },
    },
  ]);
  assert.equal(built.units.length, 1);
  assert.match(built.pipeline.bundleText, /Marcus Andrew Vale/);
});

await check("malformed XRef with no recovered content is quarantined", () => {
  const assessment = quarantinedIngestionAssessment({
    fileName: "malformed-xref.pdf",
    mimeType: "application/pdf",
    parserError: "PDF parsing failed: bad XRef entry",
  });
  assert.equal(assessment.decision, "quarantined");
  assert.equal(assessment.sourceTextUsable, false);
  assert.ok(assessment.reasonCodes.includes("parser_xref_failure"));

  const storedStub = buildIngestionAssessment({
    fileName: "malformed-xref.pdf",
    mimeType: "application/pdf",
    text: "bad XRef entry",
    pageCount: null,
    pageUnits: [],
    parserRoute: "legacy_stored_text",
    parserError: "bad XRef entry",
  });
  assert.equal(storedStub.decision, "quarantined");
  assert.ok(storedStub.reasonCodes.includes("parser_error_stub"));
});

await check("clean multi-page extraction is accepted and keeps page units", () => {
  const pageUnits = [
    { text: "R v Taylor Reed\nCharge: Harassment", textLayerEmpty: false },
    { text: "Listing: Crown Court on 18 September 2026", textLayerEmpty: false },
  ];
  const assessment = buildIngestionAssessment({
    fileName: "clean-bundle.pdf",
    mimeType: "application/pdf",
    text: pageUnits.map((page) => page.text).join("\f"),
    pageCount: 2,
    pageUnits,
    parserRoute: "pdf_page_units",
  });
  assert.equal(assessment.decision, "accepted");
  assert.equal(assessment.substantiveOutputsAllowed, true);

  const built = buildAuthenticatedMatterCanonicalFromDocuments([
    {
      id: "clean",
      name: "clean-bundle.pdf",
      type: "application/pdf",
      raw_text: pageUnits.map((page) => page.text).join("\f"),
      extracted_json: {
        ingestionAssessment: assessment,
        pageCount: 2,
        pages: pageUnits.map((page, index) => ({
          compiledPage: index + 1,
          sourcePage: null,
          text: page.text,
          textLayerEmpty: false,
        })),
      },
    },
  ]);
  assert.equal(built.canonical.ingestion.substantiveOutputsWithheld, false);
  assert.equal(built.canonical.pageUnitCount, 2);
  assert.match(built.pipeline.bundleText, /Taylor Reed/);
});

await check("scanned or empty text-layer page requires OCR and is withheld", () => {
  const assessment = buildIngestionAssessment({
    fileName: "scan.pdf",
    mimeType: "application/pdf",
    text: "",
    pageCount: 1,
    pageUnits: [{ text: "", textLayerEmpty: true }],
    parserRoute: "pdf_page_units",
  });
  assert.equal(assessment.decision, "needs_ocr");
  assert.equal(assessment.substantiveOutputsAllowed, false);
  assert.ok(assessment.reasonCodes.includes("ocr_required"));

  const caseAssessment = buildCaseIngestionAssessment([
    {
      id: "scan",
      name: "scan.pdf",
      type: "application/pdf",
      extracted_json: { ingestionAssessment: assessment },
    },
  ]);
  assert.equal(caseAssessment.substantiveOutputsWithheld, true);
});

await check("short genuine structured document is accepted", () => {
  const text = "Charge: Theft.";
  const assessment = buildIngestionAssessment({
    fileName: "short.pdf",
    mimeType: "application/pdf",
    text,
    pageCount: 1,
    pageUnits: [{ text, textLayerEmpty: false }],
    parserRoute: "pdf_page_units",
  });
  assert.equal(assessment.decision, "accepted");
  assert.equal(assessment.substantiveOutputsAllowed, true);
  assert.ok(assessment.reasonCodes.includes("genuine_short_document_accepted"));
});

await check("unreadable table or layout is degraded review, not a silent guess", () => {
  const assessment = buildIngestionAssessment({
    fileName: "table.pdf",
    mimeType: "application/pdf",
    text: "Count 1 Theft\nCount 2 Burglary",
    pageCount: 1,
    pageUnits: [{ text: "Count 1 Theft\nCount 2 Burglary", textLayerEmpty: false }],
    parserRoute: "pdf_page_units",
    tableLayoutReadable: false,
  });
  assert.equal(assessment.decision, "degraded");
  assert.equal(assessment.substantiveOutputsAllowed, true);
  assert.ok(assessment.reasonCodes.includes("table_layout_unreadable"));
});

await check("material parser disagreement is review-only and not a silent winner", () => {
  const assessment = buildIngestionAssessment({
    fileName: "conflict.pdf",
    mimeType: "application/pdf",
    text: "Defendant Liam Parker charged with theft at Manchester Crown Court.",
    comparisonText: "Witness Olivia Brown describes an assault at Leeds Magistrates Court.",
    pageCount: 1,
    pageUnits: [
      {
        text: "Defendant Liam Parker charged with theft at Manchester Crown Court.",
        textLayerEmpty: false,
      },
    ],
    parserRoute: "pdf_page_units",
  });
  assert.equal(assessment.decision, "parser_conflict");
  assert.equal(assessment.substantiveOutputsAllowed, false);
  assert.ok(assessment.reasonCodes.includes("parser_output_conflict"));
});

await check("missing or dropped page count is quarantined", () => {
  const assessment = buildIngestionAssessment({
    fileName: "dropped-pages.pdf",
    mimeType: "application/pdf",
    text: "Only one extracted page remains.",
    pageCount: 3,
    pageUnits: [{ text: "Only one extracted page remains.", textLayerEmpty: false }],
    parserRoute: "pdf_page_units",
  });
  assert.equal(assessment.decision, "quarantined");
  assert.ok(assessment.reasonCodes.includes("missing_or_dropped_pages"));
});

await check("a one-page compiled mismatch stays degraded, not quarantined", () => {
  const assessment = buildIngestionAssessment({
    fileName: "blank-separator.pdf",
    mimeType: "application/pdf",
    text: "R v Taylor Reed\nCharge: Harassment",
    pageCount: 11,
    pageUnits: Array.from({ length: 10 }, (_, index) => ({
      text: index === 0 ? "R v Taylor Reed\nCharge: Harassment" : `Page ${index + 1} continues.`,
      textLayerEmpty: false,
    })),
    parserRoute: "pdf_page_units",
  });
  assert.equal(assessment.decision, "degraded");
  assert.equal(assessment.substantiveOutputsAllowed, true);
  assert.ok(assessment.reasonCodes.includes("page_count_mismatch"));
});

await check("one blank page in a readable bundle is degraded, not a quiet withhold", () => {
  const assessment = buildIngestionAssessment({
    fileName: "blank-page.pdf",
    mimeType: "application/pdf",
    text: "R v Taylor Reed\nCharge: Harassment",
    pageCount: 2,
    pageUnits: [
      { text: "R v Taylor Reed\nCharge: Harassment", textLayerEmpty: false },
      { text: "", textLayerEmpty: true },
    ],
    parserRoute: "pdf_page_units",
  });
  assert.equal(assessment.decision, "degraded");
  assert.equal(assessment.substantiveOutputsAllowed, true);
  assert.ok(assessment.reasonCodes.includes("partial_text_layer"));
});

await check("representative legacy healthy source remains usable", () => {
  const text =
    "R v Jordan Pike\nSection 18 grievous bodily harm with intent.\nMG5 case summary and witness statements are included.";
  const assessment = assessmentForStoredDocument({
    name: "known-healthy.pdf",
    type: "application/pdf",
    raw_text: text,
    extracted_text: text,
  });
  assert.equal(assessment.decision, "degraded");
  assert.equal(assessment.substantiveOutputsAllowed, true);
  assert.ok(assessment.reasonCodes.includes("legacy_metadata_inferred"));

  const built = buildAuthenticatedMatterCanonicalFromDocuments([
    {
      id: "known-healthy",
      name: "known-healthy.pdf",
      type: "application/pdf",
      raw_text: text,
      extracted_text: text,
    },
  ]);
  assert.equal(built.units.length, 1);
  assert.equal(built.canonical.ingestion.substantiveOutputsWithheld, false);
});

console.log(`ingestion-gate-v1-contract: ${checks} checks passed`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
