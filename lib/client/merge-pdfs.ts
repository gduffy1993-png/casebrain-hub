import { PDFDocument } from "pdf-lib";

/** Matches `/api/upload` max files per request when uploading separately. */
export const MAX_SEPARATE_PDF_UPLOAD = 20;

/** Max PDFs to stitch client-side before sending as one file. */
export const MAX_SOURCE_PDFS_FOR_MERGE = 40;

function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

/**
 * Merge PDFs in order in the browser. Fails fast on encrypted/corrupt inputs.
 */
export async function mergePdfFilesToSingleFile(files: File[]): Promise<File> {
  if (files.length === 0) {
    throw new Error("No PDFs to merge.");
  }
  for (const f of files) {
    if (!isPdfFile(f)) {
      throw new Error(`"${f.name}" is not a PDF — merge supports PDFs only.`);
    }
  }

  const merged = await PDFDocument.create();
  for (let i = 0; i < files.length; i++) {
    const file = files[i]!;
    const bytes = await file.arrayBuffer();
    let src: PDFDocument;
    try {
      src = await PDFDocument.load(bytes);
    } catch {
      throw new Error(
        `Could not read "${file.name}" (${i + 1} of ${files.length}). It may be encrypted, corrupt, or not a valid PDF.`
      );
    }
    const indices = src.getPageIndices();
    const pages = await merged.copyPages(src, indices);
    pages.forEach((p) => merged.addPage(p));
  }

  const out = await merged.save();
  const firstStem = files[0]!.name.replace(/\.pdf$/i, "") || "bundle";
  const suggestedName =
    files.length === 1 ? files[0]!.name : `Combined_${firstStem}_${files.length}parts.pdf`;

  return new File([new Uint8Array(out)], suggestedName, { type: "application/pdf" });
}
