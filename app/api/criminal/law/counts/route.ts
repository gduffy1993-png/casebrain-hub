/**
 * GET /api/criminal/law/counts
 * Returns chunk counts per source for the criminal law corpus (verify ingestion).
 * Requires auth.
 */

import { NextResponse } from "next/server";
import { requireAuthContextApi } from "@/lib/auth-api";
import { getLawChunkCountsBySource } from "@/lib/criminal/criminal-law-corpus";

export async function GET() {
  const auth = await requireAuthContextApi();
  if (!auth) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const counts = await getLawChunkCountsBySource();
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return NextResponse.json({
    ok: true,
    counts,
    total,
  });
}
