/**
 * GET /api/criminal/law/retrieve?q=...&limit=5
 * Retrieve law chunks by semantic similarity. Used to ground Defence Plan box / chat.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { retrieveLawChunks } from "@/lib/criminal/criminal-law-corpus";

export async function GET(req: NextRequest) {
  const auth = await requireAuthContextApi();
  if (!auth) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q") ?? "";
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "5", 10) || 5, 20);

  if (!q.trim()) {
    return NextResponse.json({ ok: true, chunks: [] });
  }

  const chunks = await retrieveLawChunks(q.trim(), limit);
  return NextResponse.json({ ok: true, chunks });
}
