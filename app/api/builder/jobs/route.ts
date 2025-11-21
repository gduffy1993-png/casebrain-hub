import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { assertRateLimit } from "@/lib/rate-limit";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";

type BuilderJobPayload = {
  prompt: string;
  requiresApproval?: boolean;
};

export async function POST(request: Request) {
  const { userId, orgId } = await requireAuthContext();
  assertRateLimit(`builder:enqueue:${userId}`, { limit: 20, windowMs: 60_000 });

  const body = (await request.json()) as BuilderJobPayload;

  if (!body.prompt?.trim()) {
    return NextResponse.json(
      { error: "prompt is required" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("builder_jobs")
    .insert({
      org_id: orgId,
      created_by: userId,
      prompt: body.prompt.trim(),
      requires_approval: Boolean(body.requiresApproval),
    })
    .select("id, status, prompt")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to enqueue job" },
      { status: 500 },
    );
  }

  return NextResponse.json({ job: data }, { status: 201 });
}

export async function GET() {
  const { userId, orgId } = await requireAuthContext();
  assertRateLimit(`builder:list:${userId}`, { limit: 60, windowMs: 60_000 });

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("builder_jobs")
    .select(
      "id, prompt, status, output, error, requires_approval, approved_at, created_at, updated_at",
    )
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ jobs: data ?? [] });
}

