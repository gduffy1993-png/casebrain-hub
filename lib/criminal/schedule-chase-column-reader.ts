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

function hostedReaderUrl(): string | null {
  const explicit = process.env.SCHEDULE_CHASE_READER_URL?.trim();
  if (explicit) return explicit;
  const deploymentHost = process.env.VERCEL_URL?.trim();
  return deploymentHost ? `https://${deploymentHost}/api/schedule_chase_reader` : null;
}

export async function columnPagesForPdf(buffer: Buffer, localPdfPath: string): Promise<string[]> {
  const url = hostedReaderUrl();
  if (!url) return columnPages(localPdfPath);

  const secret = process.env.SCHEDULE_CHASE_READER_SECRET?.trim();
  if (!secret) throw new Error("Hosted schedule-chase reader secret is not configured");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/pdf",
      "Content-Length": String(buffer.length),
    },
    body: buffer,
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    throw new Error(`Hosted schedule-chase reader failed (${response.status})`);
  }

  const payload = (await response.json()) as { ok?: boolean; pages?: unknown };
  if (!payload.ok || !Array.isArray(payload.pages) || !payload.pages.every((page) => typeof page === "string")) {
    throw new Error("Hosted schedule-chase reader returned an invalid payload");
  }
  return payload.pages as string[];
}
