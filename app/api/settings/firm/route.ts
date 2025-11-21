import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";

type FirmSettingsPayload = {
  firmName?: string;
  firmAddress?: string;
  defaultSignOff?: string;
};

export async function GET() {
  const { orgId } = await requireRole(["owner"]);
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from("organisation_settings")
    .select("firm_name, firm_address, default_sign_off")
    .eq("org_id", orgId)
    .maybeSingle();

  return NextResponse.json({
    firmName: data?.firm_name ?? "",
    firmAddress: data?.firm_address ?? "",
    defaultSignOff: data?.default_sign_off ?? "",
  });
}

export async function POST(request: Request) {
  const { orgId } = await requireRole(["owner"]);
  const payload = (await request.json()) as FirmSettingsPayload;

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("organisation_settings")
    .upsert(
      {
        org_id: orgId,
        firm_name: payload.firmName?.trim() || null,
        firm_address: payload.firmAddress?.trim() || null,
        default_sign_off: payload.defaultSignOff?.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "org_id" },
    )
    .select("org_id")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to update firm settings" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

