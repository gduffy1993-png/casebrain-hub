/**
 * POST /api/criminal/law/ingest
 * Ingest criminal law content (e.g. CPIA 1996) into the corpus. Requires OPENAI_API_KEY.
 * Body: { source: "cpia" } – reads content/criminal-law/cpia-1996.md and chunks by section.
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

const SOURCE_LABEL: Record<string, string> = {
  cpia: "CPIA 1996",
};

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

  if (sourceKey === "cpia") {
    const filePath = path.join(process.cwd(), "content", "criminal-law", "cpia-1996.md");
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ ok: false, error: "CPIA content file not found" }, { status: 404 });
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
    if (!del.ok) return NextResponse.json({ ok: false, error: del.error }, { status: 500 });
    const result = await ingestLawChunks(chunks);
    if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
    return NextResponse.json({ ok: true, source: sourceLabel, count: result.count });
  }

  return NextResponse.json({ ok: false, error: "Unknown source" }, { status: 400 });
}
