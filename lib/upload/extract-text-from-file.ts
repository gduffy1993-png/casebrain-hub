import { Buffer } from "node:buffer";

import {
  buildPageUnitsFromCompiledPageTexts,
  renderPageTextFromItems,
  summariseTextLayerCoverage,
  type ExtractedPageUnit,
} from "@/lib/upload/pdf-page-units";
import {
  countPdfPageObjects,
  extractPdfTextFromContentStreams,
} from "@/lib/upload/pdf-stream-text-fallback";
import {
  buildIngestionAssessment,
  type IngestionAssessment,
} from "@/lib/upload/ingestion-assessment";

/**
 * Per-page text extraction using the parser's page renderer. Lives here because this
 * module is the only server-only entry point allowed to load the PDF parser; the page
 * helpers themselves stay dependency-free so shared canonical code can import them.
 *
 * Returns null rather than throwing when page units cannot be produced, so the caller
 * degrades to explicit unknown page identity instead of inventing pages.
 */
type PdfPageUnitExtraction = {
  pageUnits: ExtractedPageUnit[];
  reportedPageCount: number | null;
};

async function extractPdfPageUnitsWithCountFromBuffer(
  buffer: Buffer,
): Promise<PdfPageUnitExtraction | null> {
  try {
    const pdfParse = (await import("pdf-parse")).default;
    const pageTexts: string[] = [];
    const result = await pdfParse(buffer, {
      max: 0,
      pagerender: async (pageData: {
        getTextContent: (opts: {
          normalizeWhitespace: boolean;
          disableCombineTextItems: boolean;
        }) => Promise<{ items: Array<{ str: string; transform: number[] }> }>;
      }) => {
        const content = await pageData.getTextContent({
          normalizeWhitespace: false,
          disableCombineTextItems: false,
        });
        const text = renderPageTextFromItems(content.items);
        pageTexts.push(text);
        // The parser concatenates whatever is returned into fullText; the form feed
        // keeps page boundaries recoverable for consumers that only see fullText.
        return `${text}\f`;
      },
    } as Parameters<typeof pdfParse>[1]);
    if (!pageTexts.length) return null;
    return {
      pageUnits: buildPageUnitsFromCompiledPageTexts(pageTexts),
      reportedPageCount:
        typeof result.numpages === "number" && result.numpages > 0
          ? Math.round(result.numpages)
          : null,
    };
  } catch {
    return null;
  }
}

export async function extractPdfPageUnitsFromBuffer(
  buffer: Buffer,
): Promise<ExtractedPageUnit[] | null> {
  const extracted = await extractPdfPageUnitsWithCountFromBuffer(buffer);
  return extracted?.pageUnits ?? null;
}

export type ExtractedFileTextMeta = {
  text: string;
  /** PDF page count from parser when available; null for non-PDF or unknown. */
  pageCount: number | null;
  /**
   * Independent page units when the source could be split. Empty when the format
   * carries no page structure — callers must then keep page identity explicitly
   * unknown rather than treating the whole document as page 1.
   */
  pageUnits: ExtractedPageUnit[];
  /** Present when one or more pages carry no extractable text layer. */
  textLayerLimitation: string | null;
  /** Layer 0 decision. Parser diagnostics live here, never in source text. */
  ingestionAssessment: IngestionAssessment;
};

/**
 * Extract plain text (+ page units for PDFs) from upload buffers.
 * Page units are what give locally-extracted documents exact-page provenance when
 * external extraction is unavailable, so they are produced on the same path.
 */
export async function extractTextAndMetaFromFileBuffer(
  fileName: string,
  mimeType: string,
  buffer: Buffer,
): Promise<ExtractedFileTextMeta> {
  const lower = fileName.toLowerCase();
  const isPdf = mimeType === "application/pdf" || lower.endsWith(".pdf");
  if (isPdf) {
    try {
      const pageExtraction = await extractPdfPageUnitsWithCountFromBuffer(buffer);
      const pageUnits = pageExtraction?.pageUnits ?? [];
      if (pageUnits.length) {
        const coverage = summariseTextLayerCoverage(pageUnits);
        const text = pageUnits.map((p) => p.text).join("\f");
        const pageCount = pageExtraction?.reportedPageCount ?? pageUnits.length;
        return {
          text,
          pageCount,
          pageUnits,
          textLayerLimitation: coverage.limitation,
          ingestionAssessment: buildIngestionAssessment({
            fileName,
            mimeType,
            text,
            pageCount,
            pageUnits,
            parserRoute: "pdf_page_units",
          }),
        };
      }
      const pdfParse = (await import("pdf-parse")).default;
      const result = await pdfParse(buffer, { max: 0 });
      const pages =
        typeof result.numpages === "number" && result.numpages > 0
          ? Math.round(result.numpages)
          : null;
      const text = result.text || "";
      return {
        text,
        pageCount: pages,
        pageUnits: [],
        textLayerLimitation: null,
        ingestionAssessment: buildIngestionAssessment({
          fileName,
          mimeType,
          text,
          pageCount: pages,
          pageUnits: [],
          parserRoute: "pdf_text_fallback",
        }),
      };
    } catch (error) {
      const recovered = extractPdfTextFromContentStreams(buffer);
      if (recovered) {
        const parserError = error instanceof Error ? error.message : "Unknown parser error";
        const pageCount = countPdfPageObjects(buffer);
        return {
          text: recovered,
          pageCount,
          pageUnits: [],
          textLayerLimitation: null,
          ingestionAssessment: buildIngestionAssessment({
            fileName,
            mimeType,
            text: recovered,
            pageCount,
            pageUnits: [],
            parserRoute: "pdf_stream_fallback",
            parserError,
          }),
        };
      }
      throw new Error(
        `PDF parsing failed: ${error instanceof Error ? error.message : "Unknown error"}. The PDF may be corrupted, password-protected, or use an unsupported format.`,
      );
    }
  }

  const isDocx =
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lower.endsWith(".docx");
  const isDoc = mimeType === "application/msword" || lower.endsWith(".doc");
  if (isDocx || isDoc) {
    try {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      return {
        text: result.value || "",
        pageCount: null,
        pageUnits: [],
        textLayerLimitation: null,
        ingestionAssessment: buildIngestionAssessment({
          fileName,
          mimeType,
          text: result.value || "",
          pageCount: null,
          pageUnits: [],
          parserRoute: "docx",
        }),
      };
    } catch (error) {
      throw new Error(
        `Word document parsing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  try {
    const text = buffer.toString("utf-8");
    return {
      text,
      pageCount: null,
      pageUnits: [],
      textLayerLimitation: null,
      ingestionAssessment: buildIngestionAssessment({
        fileName,
        mimeType,
        text,
        pageCount: null,
        pageUnits: [],
        parserRoute: "plain_text",
      }),
    };
  } catch {
    const text = buffer.toString("latin1");
    return {
      text,
      pageCount: null,
      pageUnits: [],
      textLayerLimitation: null,
      ingestionAssessment: buildIngestionAssessment({
        fileName,
        mimeType,
        text,
        pageCount: null,
        pageUnits: [],
        parserRoute: "plain_text",
      }),
    };
  }
}

/**
 * Extract plain text from PDF / DOCX / text buffers (used by upload + eval pack import).
 */
export async function extractTextFromFileBuffer(
  fileName: string,
  mimeType: string,
  buffer: Buffer,
): Promise<string> {
  const meta = await extractTextAndMetaFromFileBuffer(fileName, mimeType, buffer);
  return meta.text;
}

/** Same behaviour as legacy `extractTextFromFile` in upload route. */
export async function extractTextFromFile(file: File, buffer: Buffer): Promise<string> {
  return extractTextFromFileBuffer(file.name, file.type || "application/octet-stream", buffer);
}

export async function extractTextAndMetaFromFile(
  file: File,
  buffer: Buffer,
): Promise<ExtractedFileTextMeta> {
  return extractTextAndMetaFromFileBuffer(
    file.name,
    file.type || "application/octet-stream",
    buffer,
  );
}
