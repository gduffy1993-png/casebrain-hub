import { notFound } from "next/navigation";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, FileText, Download } from "lucide-react";

type DocumentPageParams = {
  params: { id: string };
};

export default async function DocumentDetailPage({ params }: DocumentPageParams) {
  const { id } = params;
  const { orgId } = await requireAuthContext();
  const supabase = getSupabaseAdminClient();

  const { data: document, error } = await supabase
    .from("documents")
    .select("id, name, type, uploaded_by, created_at, case_id, extracted_json, cases!inner(org_id, title)")
    .eq("id", id)
    .eq("cases.org_id", orgId)
    .maybeSingle();

  if (error || !document) {
    notFound();
  }

  const extracted = document.extracted_json as Record<string, unknown> | null;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/cases/${document.case_id}`}>
            <Button variant="secondary" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to case
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-accent">{document.name}</h1>
            <p className="text-sm text-accent/60">
              Uploaded by {document.uploaded_by} on{" "}
              {new Date(document.created_at).toLocaleDateString("en-GB")}
            </p>
          </div>
        </div>
        <Button variant="primary" className="gap-2">
          <Download className="h-4 w-4" />
          Download
        </Button>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Document Info">
          <dl className="space-y-3">
            <div>
              <dt className="text-xs uppercase tracking-wide text-accent/50">Type</dt>
              <dd className="text-sm text-accent">{document.type ?? "Unknown"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-accent/50">Case</dt>
              <dd className="text-sm text-accent">
                <Link
                  href={`/cases/${document.case_id}`}
                  className="text-primary hover:underline"
                >
                  {(document.cases as unknown as { title: string }).title}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-accent/50">Uploaded</dt>
              <dd className="text-sm text-accent">
                {new Date(document.created_at).toLocaleString("en-GB")}
              </dd>
            </div>
          </dl>
        </Card>

        <Card title="Extracted Data">
          {extracted ? (
            <div className="max-h-96 overflow-auto rounded-lg bg-surface-muted p-4">
              <pre className="text-xs text-accent/70">
                {JSON.stringify(extracted, null, 2)}
              </pre>
            </div>
          ) : (
            <p className="text-sm text-accent/60">
              No extracted data available for this document.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}

