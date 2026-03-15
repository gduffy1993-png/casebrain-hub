/**
 * POST /api/criminal/law/ingest
 * Ingest criminal law content into the corpus. Requires OPENAI_API_KEY.
 * Body: { source: "cpia" | "offence_elements" | "pace_d" | "pace_abce" | "sentencing" | "evidence" | "procedure" | "case_law" }.
 */

import { NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import fs from "fs";
import path from "path";
import {
  deleteLawChunksBySource,
  ingestLawChunks,
  chunkText,
  type LawChunk,
} from "@/lib/criminal/criminal-law-corpus";
import { getOffenceElementsCorpusText } from "@/lib/criminal/offence-elements";

const SOURCE_LABEL: Record<string, string> = {
  cpia: "CPIA 1996",
  offence_elements: "Offence elements",
  pace_d: "PACE Code D",
  pace_abce: "PACE Codes A/B/C/E",
  sentencing: "Sentencing guidelines",
  evidence: "Evidence",
  procedure: "Procedure",
  case_law: "Case law principles",
};

/** File-based sources: key -> filename in content/criminal-law */
const FILE_SOURCES: Record<string, string> = {
  cpia: "cpia-1996.md",
  pace_d: "pace-code-d.md",
  pace_abce: "pace-codes-abce.md",
  sentencing: "sentencing-guidelines.md",
  evidence: "evidence.md",
  procedure: "procedure.md",
  case_law: "case-law-principles.md",
};

function ingestFromFile(sourceLabel: string, filePath: string): Promise<{ ok: boolean; count: number; error?: string }> {
  return (async () => {
    if (!fs.existsSync(filePath)) {
      return { ok: false, count: 0, error: `Content file not found: ${filePath}` };
    }
    const raw = fs.readFileSync(filePath, "utf-8");
    const chunks: LawChunk[] = [];
    const sections = raw.split(/\n(?=#{2,3} )/m).filter((s) => s.trim());
    for (const section of sections) {
      const lines = section.trim().split("\n");
      const title = lines[0].replace(/^#{2,3}\s*/, "").trim();
      const content = lines.slice(1).join("\n").trim();
      if (!content) continue;
      const subChunks = chunkText(content, 1200, 100);
      if (subChunks.length === 1) {
        chunks.push({ source: sourceLabel, title, content_text: content });
      } else {
        subChunks.forEach((text, i) => {
          chunks.push({ source: sourceLabel, title: `${title} (part ${i + 1})`, content_text: text });
        });
      }
    }
    const del = await deleteLawChunksBySource(sourceLabel);
    if (!del.ok) return { ok: false, count: 0, error: del.error };
    return ingestLawChunks(chunks);
  })();
}

export async function POST(req: Request) {
  const auth = await requireAuthContextApi();
  if (!auth) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  let body: { source?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const sourceKey = body.source ?? "cpia";
  const sourceLabel = SOURCE_LABEL[sourceKey] ?? sourceKey;

  if (sourceKey === "offence_elements") {
    const raw = getOffenceElementsCorpusText();
    const chunks: LawChunk[] = [];
    const sections = raw.split(/\n(?=## )/m).filter((s) => s.trim());
    for (const section of sections) {
      const lines = section.trim().split("\n");
      const title = lines[0].replace(/^##\s*/, "").trim();
      const content = lines.slice(1).join("\n").trim();
      if (!content) continue;
      const subChunks = chunkText(content, 1200, 100);
      if (subChunks.length === 1) {
        chunks.push({ source: sourceLabel, title, content_text: content });
      } else {
        subChunks.forEach((text, i) => {
          chunks.push({ source: sourceLabel, title: `${title} (part ${i + 1})`, content_text: text });
        });
      }
    }
    const del = await deleteLawChunksBySource(sourceLabel);
    if (!del.ok) return NextResponse.json({ ok: false, error: del.error }, { status: 500 });
    const result = await ingestLawChunks(chunks);
    if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
    return NextResponse.json({ ok: true, source: sourceLabel, count: result.count });
  }

  if (FILE_SOURCES[sourceKey]) {
    const filePath = path.join(process.cwd(), "content", "criminal-law", FILE_SOURCES[sourceKey]);
    const result = await ingestFromFile(sourceLabel, filePath);
    if (!result.ok) {
      const status = result.error?.includes("not found") ? 404 : 500;
      return NextResponse.json({ ok: false, error: result.error }, { status });
    }
    return NextResponse.json({ ok: true, source: sourceLabel, count: result.count });
  }

  return NextResponse.json(
    { ok: false, error: "Unknown source. Use: cpia, offence_elements, pace_d, pace_abce, sentencing, evidence, procedure, case_law." },
    { status: 400 }
  );
}
