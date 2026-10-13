import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import type { UploadedDocumentUnit } from "../lib/criminal/build-from-document-units";

const require = createRequire(import.meta.url);

type PdfTextItem = {
  str: string;
  transform: number[];
};

type PdfPageData = {
  getTextContent(options: {
    normalizeWhitespace: boolean;
    disableCombineTextItems: boolean;
  }): Promise<{ items: PdfTextItem[] }>;
};

type ParsedPdf = {
  numpages: number;
  text: string;
};

const parsePdf = require("pdf-parse/lib/pdf-parse.js") as (
  data: Buffer,
  options?: {
    pagerender(page: PdfPageData): Promise<string>;
    max: number;
    version: string;
  },
) => Promise<ParsedPdf>;

function sha256(value: Buffer | string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export type ParsedOriginalPdf = {
  path: string;
  pdfSha256: string;
  extractSha256: string;
  extractionEngine: "pdf_parse" | "pymupdf_fallback";
  text: string;
  document: UploadedDocumentUnit;
};

function extractWithPyMuPdf(pdfPath: string): string[] {
  const script = [
    "import fitz, json, sys",
    "doc = fitz.open(sys.argv[1])",
    "pages = [page.get_text('text').rstrip('\\n') for page in doc]",
    "print(json.dumps(pages, ensure_ascii=False))",
  ].join("\n");
  return JSON.parse(
    execFileSync("python", ["-c", script, pdfPath], {
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    }),
  ) as string[];
}

export async function readOriginalPdfAsDocument(
  pdfPath: string,
  id: string,
  uploadOrder = 1,
): Promise<ParsedOriginalPdf> {
  const bytes = fs.readFileSync(pdfPath);
  const pages: string[] = [];
  let text: string;
  let extractionEngine: ParsedOriginalPdf["extractionEngine"] = "pdf_parse";
  try {
    const parsed = await parsePdf(bytes, {
      max: 0,
      version: "v1.10.100",
      pagerender: async (page): Promise<string> => {
        const content = await page.getTextContent({
          normalizeWhitespace: false,
          disableCombineTextItems: false,
        });
        let lastY: number | undefined;
        let pageText = "";
        for (const item of content.items) {
          const y = item.transform[5];
          pageText +=
            lastY === undefined || lastY === y ? item.str : `\n${item.str}`;
          lastY = y;
        }
        pages.push(pageText);
        return pageText;
      },
    });
    text = parsed.text;
  } catch {
    pages.splice(0, pages.length, ...extractWithPyMuPdf(pdfPath));
    text = pages.join("\n\n");
    extractionEngine = "pymupdf_fallback";
  }
  return {
    path: pdfPath,
    pdfSha256: sha256(bytes),
    extractSha256: sha256(text),
    extractionEngine,
    text,
    document: {
      id,
      title: path.basename(pdfPath),
      documentType: "case_papers",
      uploadOrder,
      pages: pages.map((text, index) => ({
        pageNumber: index + 1,
        compiledPage: index + 1,
        text,
        pageIdentityKnown: true,
      })),
    },
  };
}
