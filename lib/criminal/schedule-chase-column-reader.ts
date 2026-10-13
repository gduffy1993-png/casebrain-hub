/**
 * Server-only column PDF reader via Python/PyMuPDF.
 * Do not import from client components.
 */
import { execFileSync } from "node:child_process";
import path from "node:path";

export function columnPages(pdfPath: string): string[] {
  const script = path.join(process.cwd(), "scripts/pattern-brain-reader-pages.py");
  return JSON.parse(
    execFileSync("python", [script, pdfPath], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 }),
  ) as string[];
}
