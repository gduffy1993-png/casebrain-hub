import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";

type CaseLite = { id: string; title: string; org_id: string };
type DocRow = {
  id: string;
  name: string;
  type: string;
  created_at: string;
  extracted_json: unknown;
  cases?: CaseLite[];
};

export default async function DocumentsPage() {
  const { orgId } = await requireAuthContext();
  const supabase = getSupabaseAdminClient();

  const { data: documents, error } = await supabase
    .from("documents")
    .select(
      "id, name, type, created_at, extracted_json, cases!inner(id, title, org_id)",
    )
    .eq("cases.org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-accent">
          Document library
        </h1>
        <p className="text-sm text-accent/60">
          Browse every document you've uploaded across all cases in your firm.
        </p>
      </header>
      <Card>
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <div className="divide-y divide-primary/10">
            {(documents as DocRow[] | null | undefined)?.map((doc) => (
              <div
                key={doc.id}
                className="grid gap-3 p-4 sm:grid-cols-[1fr,200px,200px]"
              >
                <div>
                  <p className="font-medium text-accent">{doc.name}</p>
                  <p className="mt-1 text-xs text-accent/50">
                    {doc.type} — {new Date(doc.created_at).toLocaleString("en-GB")}
                  </p>
                  <p className="mt-2 text-sm text-accent/60">
                    {
                      (
                        (doc.extracted_json as {
                          aiSummary?: { summary?: string };
                        } | null)?.aiSummary?.summary ?? "No AI summary available yet."
                      )
                    }
                  </p>
                </div>
                <div className="text-sm text-accent/60">
                  Case: {doc.cases?.[0]?.title ?? "Unlinked"}
                </div>
                <div className="text-right text-xs text-accent/50">
                  Stored securely in Supabase
                </div>
              </div>
            ))}
            {!documents?.length && (
              <p className="p-8 text-center text-sm text-accent/60">
                No documents found. Upload files to populate this list.
              </p>
            )}
          </div>
        </Suspense>
      </Card>
    </div>
  );
}

