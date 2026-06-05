import fs from "node:fs";
import { Buffer } from "node:buffer";
import { extractTextFromFileBuffer } from "@/lib/upload/extract-text-from-file";
import { realLayoutStressPdfPath } from "./real-layout-stress-paths";

export async function extractStressSamplePdf(sampleId: string): Promise<{
  text: string;
  chars: number;
  error?: string;
}> {
  const pdfPath = realLayoutStressPdfPath(sampleId);
  if (!fs.existsSync(pdfPath)) {
    return { text: "", chars: 0, error: "pdf_missing" };
  }
  try {
    const buffer = fs.readFileSync(pdfPath);
    const text = await extractTextFromFileBuffer(`${sampleId}.pdf`, "application/pdf", Buffer.from(buffer));
    return { text, chars: text.length };
  } catch (e) {
    return {
      text: "",
      chars: 0,
      error: e instanceof Error ? e.message : "extract_failed",
    };
  }
}
