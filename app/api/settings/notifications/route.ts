import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";

type NotificationSettingsPayload = {
  slackWebhook?: string;
  teamsWebhook?: string;
  calendarEmail?: string;
};

export async function GET() {
  const { orgId } = await requireRole(["owner"]);
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from("organisation_settings")
    .select("slack_webhook, teams_webhook, calendar_email")
    .eq("org_id", orgId)
    .maybeSingle();

  return NextResponse.json({
    slackWebhook: data?.slack_webhook ?? "",
    teamsWebhook: data?.teams_webhook ?? "",
    calendarEmail: data?.calendar_email ?? "",
  });
}

export async function POST(request: Request) {
  const { orgId } = await requireRole(["owner"]);
  const payload = (await request.json()) as NotificationSettingsPayload;

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("organisation_settings")
    .upsert(
      {
        org_id: orgId,
        slack_webhook: payload.slackWebhook?.trim() || null,
        teams_webhook: payload.teamsWebhook?.trim() || null,
        calendar_email: payload.calendarEmail?.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "org_id" },
    )
    .select("org_id")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to update settings" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

