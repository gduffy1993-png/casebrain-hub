import { getSupabaseAdminClient } from "./supabase";

type NotificationSettings = {
  slack_webhook?: string | null;
  teams_webhook?: string | null;
  calendar_email?: string | null;
};

async function fetchSettings(orgId: string): Promise<NotificationSettings> {
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from("organisation_settings")
    .select("slack_webhook, teams_webhook, calendar_email")
    .eq("org_id", orgId)
    .maybeSingle();
  return data ?? {};
}

export async function sendTaskNotifications(
  orgId: string,
  message: string,
  link?: string,
) {
  const settings = await fetchSettings(orgId);

  if (settings.slack_webhook) {
    await fetch(settings.slack_webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: link ? `${message}\n${link}` : message }),
    }).catch(() => null);
  }

  if (settings.teams_webhook) {
    await fetch(settings.teams_webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: message,
        potentialAction: link
          ? [
              {
                "@type": "OpenUri",
                name: "Open in CaseBrain",
                targets: [{ os: "default", uri: link }],
              },
            ]
          : undefined,
      }),
    }).catch(() => null);
  }

  return settings;
}

export function buildTaskLink(taskId: string) {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000/tasks";
  return `${base}?task=${taskId}`;
}

