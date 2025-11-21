import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";

type UpdatePayload = {
  name?: string;
  description?: string | null;
  body?: string;
};

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: { templateId: string };
  },
) {
  const { templateId } = params;
  const { orgId } = await requireRole(["owner", "solicitor"]);
  const payload = (await request.json()) as UpdatePayload;

  const supabase = getSupabaseAdminClient();
  const { data: template } = await supabase
    .from("pi_letter_templates")
    .select("org_id")
    .eq("id", templateId)
    .maybeSingle();

  if (!template) {
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }

  if (template.org_id !== orgId) {
    return NextResponse.json(
      { error: "Only organisation-specific templates can be edited." },
      { status: 403 },
    );
  }

  const updates: Record<string, string | null> = {};
  if (payload.name !== undefined) updates.name = payload.name.trim();
  if (payload.description !== undefined) updates.description = payload.description?.trim() || null;
  if (payload.body !== undefined) updates.body = payload.body;

  const { error } = await supabase
    .from("pi_letter_templates")
    .update(updates)
    .eq("id", templateId);

  if (error) {
    console.error("[pi:letter-templates] Failed to update template", { error, templateId });
    return NextResponse.json(
      { error: "Unable to update PI letter template." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  {
    params,
  }: {
    params: { templateId: string };
  },
) {
  const { templateId } = params;
  const { orgId } = await requireRole(["owner", "solicitor"]);

  const supabase = getSupabaseAdminClient();
  const { data: template } = await supabase
    .from("pi_letter_templates")
    .select("org_id")
    .eq("id", templateId)
    .maybeSingle();

  if (!template) {
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }

  if (template.org_id !== orgId) {
    return NextResponse.json(
      { error: "Only organisation-specific templates can be deleted." },
      { status: 403 },
    );
  }

  const { error } = await supabase
    .from("pi_letter_templates")
    .delete()
    .eq("id", templateId)
    .eq("org_id", orgId);

  if (error) {
    console.error("[pi:letter-templates] Failed to delete template", { error, templateId });
    return NextResponse.json(
      { error: "Unable to delete PI letter template." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}


