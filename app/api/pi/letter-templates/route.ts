import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";

type CreateTemplatePayload = {
  code: string;
  name: string;
  description?: string | null;
  body: string;
};

export async function POST(request: Request) {
  const { orgId } = await requireRole(["owner", "solicitor"]);
  const payload = (await request.json()) as CreateTemplatePayload;

  if (!payload.code?.trim() || !payload.name?.trim() || !payload.body?.trim()) {
    return NextResponse.json(
      { error: "code, name and body are required." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("pi_letter_templates")
    .insert({
      org_id: orgId,
      code: payload.code.trim(),
      name: payload.name.trim(),
      description: payload.description?.trim() || null,
      body: payload.body,
    })
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("[pi:letter-templates] Failed to create template", { error, orgId });
    return NextResponse.json(
      { error: "Unable to create PI letter template." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}


