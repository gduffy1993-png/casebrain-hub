import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { BUILTIN_PLAYBOOKS } from "@/lib/playbooks";

export const runtime = "nodejs";

export async function GET() {
  const { orgId } = await requireRole(["owner", "solicitor"]);
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from("playbooks")
    .select("id, name, description, steps, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  return NextResponse.json({
    builtin: BUILTIN_PLAYBOOKS.map(({ key, name, description, steps }) => ({
      id: key,
      name,
      description,
      steps,
      builtin: true,
    })),
    custom: data ?? [],
  });
}

export async function POST(request: Request) {
  const { userId, orgId } = await requireRole(["owner"]);
  const supabase = getSupabaseAdminClient();
  const payload = (await request.json()) as {
    name: string;
    description?: string;
    steps: unknown;
  };

  const { data, error } = await supabase
    .from("playbooks")
    .insert({
      org_id: orgId,
      name: payload.name,
      description: payload.description,
      steps: payload.steps,
      created_by: userId,
    })
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to create playbook" },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}

