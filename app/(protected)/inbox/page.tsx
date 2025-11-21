import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { Card } from "@/components/ui/card";

type MailMessageRow = {
  id: string;
  subject: string;
  from_address: string;
  redacted_body: string;
  summary:
    | {
        summary?: string;
        bulletPoints?: string[];
      }
    | null
    | undefined;
  received_at: string;
  cases:
    | { id: string; title: string }
    | Array<{ id: string; title: string }>
    | null
    | undefined;
  auto_reply:
    | {
        subject?: string;
        body?: string;
        followUpTasks?: string[];
      }
    | null
    | undefined;
  opponent_name?: string | null;
  opponent_email?: string | null;
  requires_follow_up?: boolean | null;
};

export default async function InboxPage() {
  const { orgId } = await requireAuthContext();
  const supabase = getSupabaseAdminClient();

  const { data: messages, error } = await supabase
    .from("mail_messages")
    .select(
      "id, subject, from_address, redacted_body, summary, received_at, auto_reply, opponent_name, opponent_email, requires_follow_up, cases(id, title)",
    )
    .eq("org_id", orgId)
    .order("received_at", { ascending: false })
    .limit(25);

  if (error) {
    throw error;
  }

  const resolveCaseTitle = (row: MailMessageRow) => {
    if (!row.cases) return "Unassigned";
    if (Array.isArray(row.cases)) {
      return row.cases[0]?.title ?? "Unassigned";
    }
    return row.cases.title ?? "Unassigned";
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-accent">Inbox</h1>
        <p className="mt-2 max-w-2xl text-sm text-accent/60">
          CaseBrain ingests firm emails, redacts sensitive details, and summarises
          key points so you can triage faster.
        </p>
      </header>

      <Card>
        <div className="divide-y divide-primary/10">
          {(messages as MailMessageRow[] | null | undefined)?.length ? (
            messages!.map((message) => (
              <article
                key={message.id}
                className="grid gap-4 p-5 sm:grid-cols-[1fr,160px]"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-accent/40">
                    <span>{new Date(message.received_at).toLocaleString("en-GB")}</span>
                    <span>From: {message.from_address}</span>
                    <span>
                      Case: {resolveCaseTitle(message)}
                    </span>
                    {message.opponent_name || message.opponent_email ? (
                      <span className="text-danger">
                        Opponent: {message.opponent_name ?? message.opponent_email}
                      </span>
                    ) : null}
                    {message.requires_follow_up ? (
                      <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-semibold text-warning">
                        Follow-up
                      </span>
                    ) : null}
                  </div>
                  <h2 className="text-sm font-semibold text-accent">
                    {message.subject}
                  </h2>
                  <p className="text-sm leading-relaxed text-accent/70">
                    {message.summary?.summary ??
                      message.redacted_body.slice(0, 280) + "…"}
                  </p>
                  {message.summary?.bulletPoints?.length ? (
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-accent/70">
                      {message.summary.bulletPoints.map(
                        (point: string, index: number) => (
                          <li key={index}>{point}</li>
                        ),
                      )}
                    </ul>
                  ) : null}
                  {message.auto_reply ? (
                    <div className="rounded-2xl border border-primary/10 bg-surface-muted/80 p-3 text-xs text-accent/70">
                      <p className="font-semibold text-accent">Suggested reply</p>
                      <p className="mt-1 text-accent/70">
                        <span className="font-semibold">Subject:</span>{" "}
                        {message.auto_reply.subject ?? "Re:" + message.subject}
                      </p>
                      <pre className="mt-2 whitespace-pre-wrap text-accent/60">
                        {message.auto_reply.body}
                      </pre>
                      {message.auto_reply.followUpTasks?.length ? (
                        <ul className="mt-2 list-disc space-y-1 pl-4 text-accent/60">
                          {message.auto_reply.followUpTasks.map((task: string, index: number) => (
                            <li key={index}>Task: {task}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <pre className="max-h-48 overflow-y-auto rounded-2xl border border-primary/10 bg-surface-muted/80 p-3 text-xs text-accent/60">
                  {message.redacted_body}
                </pre>
              </article>
            ))
          ) : (
            <p className="p-8 text-center text-sm text-accent/60">
              No messages ingested yet. Connect your mailbox or import messages via the API.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}

