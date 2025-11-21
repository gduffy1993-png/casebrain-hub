import { notFound } from "next/navigation";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import type { ExtractedCaseFacts } from "@/types";

type PortalPageParams = {
  params: { token: string };
};

export default async function PortalPage({ params }: PortalPageParams) {
  const { token } = params;
  const supabase = getSupabaseAdminClient();

  const { data: session } = await supabase
    .from("portal_sessions")
    .select("id, case_id, org_id, expires_at, last_accessed_at")
    .eq("token", token)
    .maybeSingle();

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card>
          <div className="p-8 text-center">
            <h1 className="text-xl font-semibold text-accent">
              This link has expired or is invalid
            </h1>
            <p className="mt-2 text-sm text-accent/60">
              Please contact your solicitor for a new link.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  if (session.expires_at && new Date(session.expires_at) < new Date()) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card>
          <div className="p-8 text-center">
            <h1 className="text-xl font-semibold text-accent">
              This link has expired
            </h1>
            <p className="mt-2 text-sm text-accent/60">
              Please contact your solicitor for a new link.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // Update last accessed
  await supabase
    .from("portal_sessions")
    .update({ last_accessed_at: new Date().toISOString() })
    .eq("id", session.id);

  const { data: caseRecord } = await supabase
    .from("cases")
    .select("id, title, summary, practice_area")
    .eq("id", session.case_id)
    .eq("org_id", session.org_id)
    .maybeSingle();

  if (!caseRecord) {
    notFound();
  }

  const [{ data: documents }, { data: timeline }] = await Promise.all([
    supabase
      .from("documents")
      .select("id, name, created_at")
      .eq("case_id", session.case_id)
      .order("created_at", { ascending: false }),
    supabase
      .from("documents")
      .select("extracted_json")
      .eq("case_id", session.case_id),
  ]);

  const timelineEvents =
    timeline
      ?.flatMap((doc) => {
        const extracted = doc.extracted_json as ExtractedCaseFacts | null;
        return extracted?.timeline ?? [];
      })
      .sort((a, b) => a.date.localeCompare(b.date)) ?? [];

  return (
    <div className="min-h-screen bg-surface p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="text-center">
          <h1 className="text-3xl font-semibold text-accent">
            {caseRecord.title}
          </h1>
          <p className="mt-2 text-sm text-accent/60">
            CaseBrain Client Portal
          </p>
        </header>

        <Card title="Case Summary">
          <p className="text-sm text-accent/70">
            {caseRecord.summary ?? "No summary available."}
          </p>
        </Card>

        <Card title="Timeline">
          {timelineEvents.length > 0 ? (
            <ul className="space-y-4">
              {timelineEvents.map((event) => (
                <li
                  key={event.id}
                  className="flex gap-3 rounded-2xl border border-primary/10 bg-surface-muted/70 p-3"
                >
                  <div className="mt-1 rounded-full bg-primary/20 p-2">
                    <div className="h-4 w-4 rounded-full bg-primary" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-accent/50">
                      {new Date(event.date).toLocaleDateString("en-GB")}
                    </p>
                    <p className="text-sm font-semibold text-accent">
                      {event.label}
                    </p>
                    <p className="text-xs text-accent/60">{event.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-accent/60">
              Timeline not yet populated.
            </p>
          )}
        </Card>

        <Card title="Documents">
          {documents && documents.length > 0 ? (
            <ul className="space-y-3">
              {documents.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center justify-between rounded-2xl border bg-surface-muted/70 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-accent">{doc.name}</p>
                    <p className="text-xs text-accent/50">
                      {new Date(doc.created_at).toLocaleDateString("en-GB")}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-accent/60">No documents shared yet.</p>
          )}
        </Card>

        <div className="text-center text-xs text-accent/40">
          <p>Generated by CaseBrain Hub</p>
          <p className="mt-1">
            This is a read-only view. For questions, contact your solicitor.
          </p>
        </div>
      </div>
    </div>
  );
}

