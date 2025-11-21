import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { requireRole } from "@/lib/auth";

export const runtime = "nodejs";

type SlackNotificationPayload = {
  channel: string;
  message: string;
};

export async function POST(request: Request) {
  const { orgId } = await requireRole(["owner"]);

  const payload = (await request.json()) as SlackNotificationPayload;
  if (!payload.channel || !payload.message) {
    return NextResponse.json(
      { error: "channel and message are required" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdminClient();

  const { data: settings } = await supabase
    .from("organisation_settings")
    .select("slack_webhook")
    .eq("org_id", orgId)
    .maybeSingle();

  if (!settings?.slack_webhook) {
    return NextResponse.json(
      { error: "Slack webhook not configured for organisation" },
      { status: 400 },
    );
  }

  const response = await fetch(settings.slack_webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: payload.message,
      channel: payload.channel,
    }),
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "Failed to send Slack notification" },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}

