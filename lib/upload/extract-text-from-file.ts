import { Buffer } from "node:buffer";

/**
 * Extract plain text from PDF / DOCX / text buffers (used by upload + eval pack import).
 */
export async function extractTextFromFileBuffer(
  fileName: string,
  mimeType: string,
  buffer: Buffer
): Promise<string> {
  const lower = fileName.toLowerCase();
  const isPdf = mimeType === "application/pdf" || lower.endsWith(".pdf");
  if (isPdf) {
    try {
      const pdfParse = (await import("pdf-parse")).default;
      const result = await pdfParse(buffer, { max: 0 });
      return result.text || "";
    } catch (error) {
      throw new Error(
        `PDF parsing failed: ${error instanceof Error ? error.message : "Unknown error"}. The PDF may be corrupted, password-protected, or use an unsupported format.`
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
      return result.value || "";
    } catch (error) {
      throw new Error(`Word document parsing failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  try {
    return buffer.toString("utf-8");
  } catch {
    return buffer.toString("latin1");
  }
}

/** Same behaviour as legacy `extractTextFromFile` in upload route. */
export async function extractTextFromFile(file: File, buffer: Buffer): Promise<string> {
  return extractTextFromFileBuffer(file.name, file.type || "application/octet-stream", buffer);
}
