import { NextResponse } from "next/server";
import { assertRateLimit } from "@/lib/rate-limit";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";

type CreateTaskPayload = {
  caseId: string;
  title: string;
  description?: string;
  dueAt?: string;
};

export async function POST(request: Request) {
  const { userId, orgId } = await requireAuthContext();
  assertRateLimit(`tasks:create:${userId}`, { limit: 30, windowMs: 60_000 });

  const payload = (await request.json()) as CreateTaskPayload;

  if (!payload.caseId || !payload.title?.trim()) {
    return NextResponse.json(
      { error: "caseId and title are required" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      org_id: orgId,
      case_id: payload.caseId,
      title: payload.title.trim(),
      description: payload.description?.trim(),
      due_at: payload.dueAt ? new Date(payload.dueAt).toISOString() : null,
      created_by: userId,
    })
    .select("*")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to create task" },
      { status: 500 },
    );
  }

  return NextResponse.json({ task: data }, { status: 201 });
}

export async function GET() {
  const { userId, orgId } = await requireAuthContext();
  assertRateLimit(`tasks:list:${userId}`, { limit: 60, windowMs: 60_000 });

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("id, title, description, due_at, status, case_id, assigned_to, priority, created_at, updated_at")
    .eq("org_id", orgId)
    .order("due_at", { ascending: true })
    .limit(50);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ tasks: data ?? [] });
}

