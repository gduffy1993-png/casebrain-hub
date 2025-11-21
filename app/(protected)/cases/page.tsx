import Link from "next/link";
import { notFound } from "next/navigation";
import { clsx } from "clsx";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { PiQuickActions } from "@/components/pi/PiQuickActions";

type CasesPageProps = {
  searchParams: { practiceArea?: string };
};

const PRACTICE_AREA_FILTERS: Array<{ label: string; value: string }> = [
  { label: "All", value: "all" },
  { label: "PI", value: "pi" },
  { label: "Clinical Neg", value: "clinical_negligence" },
  { label: "Housing Disrepair", value: "housing_disrepair" },
  { label: "General", value: "general" },
];

export default async function CasesPage({ searchParams }: CasesPageProps) {
  const { orgId } = await requireAuthContext();
  const supabase = getSupabaseAdminClient();
  const selectedPracticeArea = (searchParams.practiceArea ?? "all").toLowerCase();

  let query = supabase
    .from("cases")
    .select("id, title, summary, practice_area, updated_at")
    .eq("org_id", orgId)
    .eq("is_archived", false) // Exclude archived cases
    .order("updated_at", { ascending: false });

  if (selectedPracticeArea !== "all") {
    if (selectedPracticeArea === "general") {
      // General = cases that are null or not in specific practice areas
      query = query.or(
        "practice_area.is.null,practice_area.not.in.(pi,clinical_negligence,housing_disrepair)",
      );
    } else {
      query = query.eq("practice_area", selectedPracticeArea);
    }
  }

  const { data: cases, error } = await query;

  if (error) {
    throw error;
  }

  if (!cases) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-accent">Cases</h1>
          <p className="text-sm text-accent/60">
            All matters scoped to your organisation. Filter by practice area to focus on PI &
            Clinical Neg.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/upload">
            <Button variant="secondary" className="gap-2">
              <Plus className="h-4 w-4" />
              Upload to create case
            </Button>
          </Link>
          {process.env.NEXT_PUBLIC_ENABLE_LABS === "true" && (
          <div className="flex gap-2">
            <Link href="/cases/new/pi">
              <Button variant="primary" className="gap-2">
                <Plus className="h-4 w-4" />
                New PI / Clin Neg case
              </Button>
            </Link>
            <Link href="/cases/new/housing">
              <Button variant="primary" className="gap-2">
                <Plus className="h-4 w-4" />
                New Housing Disrepair case
              </Button>
            </Link>
          </div>
          )}
        </div>
      </div>

      <FilterToolbar selected={selectedPracticeArea} />

      <Card>
        {cases.length ? (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {cases.map((caseItem) => (
              <li key={caseItem.id}>
                <div className="flex h-full flex-col rounded-2xl border border-primary/10 bg-surface-muted/80 p-5 transition hover:border-primary/40 hover:shadow-card">
                  <div className="flex items-start justify-between gap-3">
                    <Link href={`/cases/${caseItem.id}`} className="flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-accent">{caseItem.title}</p>
                          <p className="mt-2 line-clamp-3 text-sm text-accent/60">
                            {caseItem.summary ?? "Awaiting summary"}
                          </p>
                        </div>
                        <PracticeBadge practiceArea={caseItem.practice_area} />
                      </div>
                    </Link>
                    <CaseArchiveButton caseId={caseItem.id} caseTitle={caseItem.title} />
                  </div>
                  <p className="mt-4 text-xs text-accent/40">
                    Updated{" "}
                    {caseItem.updated_at
                      ? new Date(caseItem.updated_at).toLocaleString("en-GB", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : "unknown"}
                  </p>
                  {process.env.NEXT_PUBLIC_ENABLE_LABS === "true" &&
                    caseItem.practice_area === "pi" ? (
                    <div className="mt-3">
                      <PiQuickActions caseId={caseItem.id} />
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState selectedPracticeArea={selectedPracticeArea} />
        )}
      </Card>
    </div>
  );
}

function FilterToolbar({ selected }: { selected: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PRACTICE_AREA_FILTERS.map((filter) => {
        const isActive = selected === filter.value;
        return (
          <Link
            key={filter.value}
            href={
              filter.value === "all"
                ? "/cases"
                : `/cases?practiceArea=${encodeURIComponent(filter.value)}`
            }
            className={clsx(
              "rounded-full border px-4 py-2 text-sm font-medium transition",
              isActive
                ? "border-primary bg-primary/10 text-primary"
                : "border-primary/10 text-accent/60 hover:border-primary/40",
            )}
          >
            {filter.label}
          </Link>
        );
      })}
    </div>
  );
}

function PracticeBadge({ practiceArea }: { practiceArea: string | null }) {
  if (practiceArea === "pi") {
    return <Badge className="bg-primary/10 text-primary">PI</Badge>;
  }
  if (practiceArea === "clinical_negligence") {
    return <Badge className="bg-warning/10 text-warning">Clinical Neg</Badge>;
  }
  if (practiceArea === "housing_disrepair") {
    return <Badge className="bg-success/10 text-success">Housing Disrepair</Badge>;
  }
  return <Badge variant="default">General</Badge>;
}

function EmptyState({ selectedPracticeArea }: { selectedPracticeArea: string }) {
  const label =
    PRACTICE_AREA_FILTERS.find((filter) => filter.value === selectedPracticeArea)?.label ??
    "cases";

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-primary/30 bg-surface-muted/60 p-16 text-center">
      <h2 className="text-lg font-semibold text-accent">No {label.toLowerCase()} found.</h2>
      <p className="max-w-md text-sm text-accent/60">
        Upload a disclosure pack or run the PI / Clinical Neg intake wizard to start building your
        timeline.
      </p>
    </div>
  );
}
