import { requireRole } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { BuilderJobForm } from "@/components/builder/BuilderJobForm";
import { PlaybookLauncher } from "@/components/builder/PlaybookLauncher";

type BuilderJobRow = {
  id: string;
  prompt: string;
  status: string;
  output: string | null;
  error: string | null;
  requires_approval: boolean;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
};

export default async function BuilderPage() {
  const { orgId } = await requireRole(["owner"]);
  const supabase = getSupabaseAdminClient();
  const [{ data: jobs }, { data: cases }] = await Promise.all([
    supabase
      .from("builder_jobs")
      .select(
        "id, prompt, status, output, error, requires_approval, approved_at, created_at, updated_at",
      )
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("cases")
      .select("id, title")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-accent">
          CaseBrain Builder
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-accent/60">
          Enqueue automation jobs for the internal coding agent. CaseBrain logs every run and
          records the output so you can review, approve, and iterate quickly.
        </p>
      </header>

      <Card title="New job">
        <BuilderJobForm />
      </Card>

      <Card
        title="Automation playbooks"
        description="Run curated sequences that create tasks, letters, and briefings in one click."
      >
        <PlaybookLauncher cases={(cases ?? []).map((c) => ({ id: c.id, title: c.title }))} />
      </Card>

      <Card title="Recent jobs">
        <div className="overflow-x-auto rounded-2xl border border-primary/10">
          <table className="min-w-full divide-y divide-primary/10 text-sm">
            <thead className="bg-surface-muted/60 text-xs uppercase tracking-wide text-accent/40">
              <tr>
                <th className="px-4 py-3 text-left">Prompt</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Output / Error</th>
                <th className="px-4 py-3 text-left">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/10 text-accent/80">
              {(jobs as BuilderJobRow[] | null | undefined)?.length ? (
                jobs!.map((job) => (
                  <tr key={job.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-accent">
                        {job.prompt.slice(0, 80)}
                        {job.prompt.length > 80 ? "…" : ""}
                      </p>
                      {job.requires_approval ? (
                        <p className="text-xs text-warning">
                          Awaiting approval
                          {job.approved_at
                            ? ` • approved ${new Date(job.approved_at).toLocaleString("en-GB")}`
                            : ""}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        {job.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {job.output ? (
                        <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-xl bg-surface-muted/80 p-3 text-xs text-accent/70">
                          {job.output}
                        </pre>
                      ) : job.error ? (
                        <p className="text-xs text-danger">{job.error}</p>
                      ) : (
                        <p className="text-xs text-accent/50">No output yet.</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-accent/50">
                      {new Date(job.created_at).toLocaleString("en-GB")}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-6 text-sm text-accent/60" colSpan={4}>
                    No builder jobs queued yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

