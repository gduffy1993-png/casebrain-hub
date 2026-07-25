import { Buffer } from "node:buffer";

export type ExtractedFileTextMeta = {
  text: string;
  /** PDF page count from parser when available; null for non-PDF or unknown. */
  pageCount: number | null;
};

/**
 * Extract plain text (+ page metadata for PDFs) from upload buffers.
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
      const pdfParse = (await import("pdf-parse")).default;
      const result = await pdfParse(buffer, { max: 0 });
      const pages =
        typeof result.numpages === "number" && result.numpages > 0
          ? Math.round(result.numpages)
          : null;
      return { text: result.text || "", pageCount: pages };
    } catch (error) {
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
      return { text: result.value || "", pageCount: null };
    } catch (error) {
      throw new Error(
        `Word document parsing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  try {
    return { text: buffer.toString("utf-8"), pageCount: null };
  } catch {
    return { text: buffer.toString("latin1"), pageCount: null };
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
