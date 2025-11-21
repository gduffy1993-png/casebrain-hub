"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/Toast";

type FormState = {
  slackWebhook: string;
  teamsWebhook: string;
  calendarEmail: string;
};

export function NotificationSettingsForm() {
  const [form, setForm] = useState<FormState>({
    slackWebhook: "",
    teamsWebhook: "",
    calendarEmail: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const pushToast = useToast((state) => state.push);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/settings/notifications");
        if (!response.ok) {
          throw new Error("Unable to load notification settings");
        }
        const payload = (await response.json()) as FormState;
        setForm(payload);
      } catch (error) {
        pushToast(
          error instanceof Error
            ? error.message
            : "Unable to load notification settings",
        );
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [pushToast]);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/settings/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Failed to update settings");
      }
      pushToast("Notification settings saved.");
    } catch (error) {
      pushToast(
        error instanceof Error
          ? error.message
          : "Failed to update notification settings",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-accent/60">Loading notification settings…</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-accent/50">
          Slack incoming webhook
        </label>
        <input
          value={form.slackWebhook}
          onChange={(event) =>
            setForm((state) => ({ ...state, slackWebhook: event.target.value }))
          }
          placeholder="https://hooks.slack.com/services/..."
          className="mt-2 w-full rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-accent shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
        />
        <p className="mt-1 text-xs text-accent/40">
          CaseBrain will post task updates to this channel if provided.
        </p>
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-accent/50">
          Microsoft Teams webhook
        </label>
        <input
          value={form.teamsWebhook}
          onChange={(event) =>
            setForm((state) => ({ ...state, teamsWebhook: event.target.value }))
          }
          placeholder="https://..."
          className="mt-2 w-full rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-accent shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-accent/50">
          Calendar email
        </label>
        <input
          type="email"
          value={form.calendarEmail}
          onChange={(event) =>
            setForm((state) => ({
              ...state,
              calendarEmail: event.target.value,
            }))
          }
          placeholder="calendar@firm.com"
          className="mt-2 w-full rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-accent shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
        />
        <p className="mt-1 text-xs text-accent/40">
          Used for sending ICS invites for deadlines and tasks.
        </p>
      </div>

      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : "Save notification settings"}
      </Button>
    </form>
  );
}

