import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { assertRateLimit } from "@/lib/rate-limit";
import { redact } from "@/lib/redact";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { userId } = await requireUser();
  assertRateLimit(`redact:${userId}`, { limit: 60, windowMs: 60_000 });

  const body = await request.json();
  const text = body?.text as string | undefined;

  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const result = redact(text, env.REDACTION_SECRET);
  return NextResponse.json(result);
}

