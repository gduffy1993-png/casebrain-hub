import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { getSupabaseAdminClient } from "@/lib/supabase";

type PortalPageParams = {
  params: { token: string };
};

export default async function PortalPage({ params }: PortalPageParams) {
  const supabase = getSupabaseAdminClient();

  const { data: session } = await supabase
    .from("portal_sessions")
    .select("case_id, expires_at, sections, cases:cases(title, summary)")
    .eq("token", params.token)
    .maybeSingle();

  if (!session) {
    notFound();
  }

  const expiresAt = new Date(session.expires_at);
  if (expiresAt.getTime() < Date.now()) {
    notFound();
  }

  const sections = (session.sections as string[]) ?? [];

  const { data: documents } =
    sections.includes("documents")
      ? await supabase
          .from("documents")
          .select("id, name, ai_summary, created_at")
          .eq("case_id", session.case_id)
          .limit(20)
      : { data: [] };

  const { data: timeline } =
    sections.includes("timeline")
      ? await supabase
          .from("documents")
          .select("extracted_json")
          .eq("case_id", session.case_id)
      : { data: [] };

  const flattenedTimeline =
    timeline
      ?.flatMap((doc) => {
        const extraction = doc.extracted_json as any;
        return extraction?.timeline ?? [];
      })
      .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "")) ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      <header className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold text-accent">
          CaseBrain Client Portal
        </h1>
        <p className="text-sm text-accent/60">
          Secure read-only view of the matter. Link expires{" "}
          {expiresAt.toLocaleString("en-GB")}.
        </p>
      </header>

      {sections.includes("summary") ? (
        <Card title="Case summary">
          <p className="text-sm text-accent/70">
            {Array.isArray(session.cases)
              ? session.cases[0]?.summary ?? "Summary not yet available."
              : (session.cases as { summary?: string } | null | undefined)?.summary ??
                "Summary not yet available."}
          </p>
        </Card>
      ) : null}

      {sections.includes("timeline") ? (
        <Card title="Timeline">
          <ul className="space-y-3">
            {flattenedTimeline.length ? (
              flattenedTimeline.map((event: any) => (
                <li key={event.id} className="rounded-2xl border border-primary/10 bg-white/70 p-3">
                  <p className="text-xs uppercase tracking-wide text-accent/40">
                    {event.date ? new Date(event.date).toLocaleDateString("en-GB") : ""}
                  </p>
                  <p className="text-sm font-semibold text-accent">{event.label}</p>
                  <p className="text-xs text-accent/60">{event.description}</p>
                </li>
              ))
            ) : (
              <li className="text-sm text-accent/60">Timeline not available.</li>
            )}
          </ul>
        </Card>
      ) : null}

      {sections.includes("documents") ? (
        <Card title="Documents">
          <ul className="space-y-3">
            {(documents ?? []).map((doc) => (
              <li
                key={doc.id}
                className="rounded-2xl border border-primary/10 bg-white/70 p-3 text-sm text-accent/70"
              >
                <p className="font-semibold text-accent">{doc.name}</p>
                <p className="text-xs text-accent/40">
                  Uploaded {new Date(doc.created_at).toLocaleDateString("en-GB")}
                </p>
                <p className="mt-2 text-xs text-accent/60">
                  {doc.ai_summary ?? "Summary pending."}
                </p>
              </li>
            ))}
            {!documents?.length && (
              <li className="text-sm text-accent/60">No documents available for sharing.</li>
            )}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}

