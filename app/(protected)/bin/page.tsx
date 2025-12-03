import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Trash2, RotateCcw, AlertTriangle } from "lucide-react";
import { BinCaseCard } from "@/components/cases/BinCaseCard";

export default async function BinPage() {
  const { orgId } = await requireAuthContext();
  const supabase = getSupabaseAdminClient();

  // Fetch archived cases
  const { data: archivedCases, error } = await supabase
    .from("cases")
    .select("id, title, summary, practice_area, updated_at, archived_at")
    .eq("org_id", orgId)
    .eq("is_archived", true)
    .order("archived_at", { ascending: false });

  if (error) {
    throw error;
  }

  const practiceAreaLabel = (area: string | null) => {
    switch (area) {
      case "pi":
        return "Personal Injury";
      case "clinical_negligence":
        return "Clinical Negligence";
      case "housing_disrepair":
        return "Housing Disrepair";
      default:
        return "General";
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <header>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-danger/10">
            <Trash2 className="h-6 w-6 text-danger" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-accent">Bin</h1>
            <p className="text-sm text-accent-soft">
              Archived cases waiting for permanent deletion or restoration
            </p>
          </div>
        </div>
      </header>

      {/* Warning Banner */}
      <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4">
        <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-warning">
            Items in the bin can be restored or permanently deleted
          </p>
          <p className="mt-1 text-xs text-accent-soft">
            Permanently deleted cases cannot be recovered. All documents, letters, and notes will be lost.
          </p>
        </div>
      </div>

      <Card
        title={`Archived Cases (${archivedCases?.length ?? 0})`}
        description="Cases that have been moved to the bin. Restore or delete permanently."
      >
        {archivedCases && archivedCases.length > 0 ? (
          <div className="space-y-3">
            {archivedCases.map((caseItem, index) => (
              <div
                key={caseItem.id}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <BinCaseCard
                  caseId={caseItem.id}
                  title={caseItem.title}
                  summary={caseItem.summary}
                  practiceArea={practiceAreaLabel(caseItem.practice_area)}
                  archivedAt={caseItem.archived_at}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-muted">
              <Trash2 className="h-8 w-8 text-accent-muted" />
            </div>
            <p className="mt-4 text-lg font-medium text-accent">Bin is empty</p>
            <p className="mt-1 text-sm text-accent-soft">
              Archived cases will appear here
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}

