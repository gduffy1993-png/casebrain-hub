/**
 * pdf-parse's bundled pdf.js throws `bad XRef entry` on pdfkit files.
 * The drawn text is still in the content streams. Recover that. Do not invent
 * a board from an independent sidecar extract while the file itself is unreadable.
 *
 * Run: npx tsx scripts/pdf-xref-fallback-truth.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import PDFDocument from "pdfkit";

import { mapCaseDocumentsToUploadedUnits } from "../lib/criminal/authenticated-matter-canonical";
import { extractBundleCaseMetadata } from "../lib/criminal/extract-bundle-case-metadata";
import {
  combineCaseDocumentsText,
  getDocumentBodyText,
  isExtractionFailurePlaceholder,
} from "../lib/bundle/bundle-document-text";
import { extractTextAndMetaFromFileBuffer } from "../lib/upload/extract-text-from-file";

let checks = 0;
function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  return Promise.resolve(fn()).then(() => {
    checks += 1;
  });
}

function makePdfkitPdf(text: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.fontSize(12).text(text);
    doc.end();
  });
}

console.log("xref throw recovers drawn text; junk xref does not invent");

async function main() {
await check("pdfkit Vale-shaped papers recover name, robbery, and O1 — not the error banner", async () => {
  const buf = await makePdfkitPdf(
    "R v Marcus Andrew Vale\nRobbery contrary to section 8 Theft Act 1968\nO1 Full interview transcript Outstanding",
  );
  let threw = false;
  try {
    const pdfParse = (await import("pdf-parse")).default;
    await pdfParse(buf, { max: 0 });
  } catch {
    threw = true;
  }
  assert.equal(threw, true, "this fixture must still be the pdf-parse xref failure");

  const meta = await extractTextAndMetaFromFileBuffer("CB-TB-039.pdf", "application/pdf", buf);
  assert.doesNotMatch(meta.text, /PDF parsing failed|bad XRef/i);
  assert.match(meta.text, /Marcus Andrew Vale/);
  assert.match(meta.text, /Robbery/);
  assert.match(meta.text, /O1 Full interview transcript Outstanding/);
  const identity = extractBundleCaseMetadata(meta.text);
  assert.match(identity.defendantName ?? "", /Marcus Andrew Vale/);
  assert.match(identity.offenceDisplay ?? identity.offenceWording ?? "", /Robbery/i);
});

await check("a broken xref with no drawn text still fails — independent Vale extract is not read", async () => {
  const junk = Buffer.from(
    "%PDF-1.4\n1 0 obj\n<< /Length 12 >>\nstream\nxxxxxxxxxxxx\nendstream\nendobj\ntrailer\n%%EOF\n",
    "latin1",
  );
  await assert.rejects(
    () => extractTextAndMetaFromFileBuffer("junk.pdf", "application/pdf", junk),
    /PDF parsing failed/i,
  );
  const sidecar = readFileSync(
    path.join(
      "artifacts",
      "casebrain-qa",
      "assurance",
      "family-pdf-accuracy-v1",
      "_extracts",
      "RP-04-VALE039.full.txt",
    ),
    "utf8",
  );
  assert.match(sidecar, /Marcus Andrew Vale|Robbery/i);
});

await check("a stored failure banner is not papers, and a real short extract still is", () => {
  const banner =
    "[PDF extraction failed: PDF parsing failed: bad XRef entry. The PDF may be corrupted, password-protected, or use an unsupported format.. File stored but text extraction unavailable. Please re-upload a valid PDF or use OCR if needed.]";
  assert.equal(isExtractionFailurePlaceholder(banner), true);
  assert.equal(getDocumentBodyText({ extracted_text: banner }), "");
  assert.equal(
    combineCaseDocumentsText([{ extracted_text: banner }]),
    "",
  );
  const fromBanner = extractBundleCaseMetadata(banner);
  assert.equal(fromBanner.defendantName, null);
  assert.equal(fromBanner.offenceDisplay, null);

  const reed =
    "Taylor Reed\nCharge: Harassment\nScreenshots of WhatsApp messages served.\nFull phone download / subscriber mapping outstanding.\nNo BWV. No CCTV.";
  assert.equal(isExtractionFailurePlaceholder(reed), false);
  assert.equal(getDocumentBodyText({ extracted_text: reed }), reed);
  const reedMeta = extractBundleCaseMetadata(reed);
  assert.equal(reedMeta.defendantName, "Taylor Reed");
  assert.match(reedMeta.offenceDisplay ?? "", /harassment/i);

  const prose = "The officer said the phone extraction failed at the station. Charge: Theft.";
  assert.equal(isExtractionFailurePlaceholder(prose), false);
  assert.match(getDocumentBodyText({ extracted_text: prose }), /phone extraction failed/);

  const mixed = combineCaseDocumentsText([
    { extracted_text: banner },
    { extracted_text: reed },
  ]);
  assert.match(mixed, /Taylor Reed/);
  assert.doesNotMatch(mixed, /PDF extraction failed/);

  const units = mapCaseDocumentsToUploadedUnits([
    { id: "vale-failed", name: "CB-TB-039_Vale.pdf", extracted_text: banner },
  ]);
  assert.equal(units.length, 0, "a failure banner must not become a served document unit");
  const reedUnits = mapCaseDocumentsToUploadedUnits([
    { id: "reed", name: "LIVE-02-phone.pdf", extracted_text: reed },
  ]);
  assert.equal(reedUnits.length, 1, "a real short extract must still become a document unit");
});

await check("a readable xref PDF still uses the parser, not the stream scrape", async () => {
  const buf = readFileSync(
    path.join(
      "artifacts",
      "casebrain-qa",
      "pr101-live-20-visual-pdf-review",
      "case-17-case-9",
      "source.pdf",
    ),
  );
  const meta = await extractTextAndMetaFromFileBuffer("CB-TB-039_Vale.pdf", "application/pdf", buf);
  assert.ok(meta.pageUnits.length > 0, "parser path must keep page units");
  assert.match(meta.text, /Marcus Andrew Vale/);
  assert.match(meta.text, /Robbery/);
});

console.log(`pdf-xref-fallback-truth: ${checks} checks passed`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
