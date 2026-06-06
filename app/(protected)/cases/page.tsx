import Link from "next/link";
import { notFound } from "next/navigation";
import { clsx } from "clsx";
import { requireAuthContext } from "@/lib/auth";
import { sortCasesForDisplay } from "@/lib/case-list-sort";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { PiQuickActions } from "@/components/pi/PiQuickActions";
import { CaseArchiveButton } from "@/components/cases/CaseArchiveButton";
import { BulkArchiveCasesButton } from "@/components/cases/BulkArchiveCasesButton";
import { CasesPageClient } from "@/components/cases/CasesPageClient";
import { resolveCaseEntryHref } from "@/components/criminal/criminalCaseNavigation";
import { CurrentPersonaBadge } from "@/components/layout/CurrentPersonaBadge";
import { filterCasesForPilotUser, isCriminalPilotMode, shouldShowInternalDevTools, summarizePilotCaseFilter } from "@/lib/pilot-mode";

type CasesPageProps = {
  searchParams: { practiceArea?: string; role?: string };
};

/** Match sidebar: pilot shows criminal caseload only unless this env is set. */
const SHOW_ALL_PRACTICE_AREA_FILTERS = process.env.NEXT_PUBLIC_SIDEBAR_ALL_PRACTICE_AREAS === "true";

const PRACTICE_AREA_FILTERS_FULL: Array<{ label: string; value: string }> = [
  { label: "All", value: "all" },
  { label: "PI", value: "personal_injury" },
  { label: "Clinical Neg", value: "clinical_negligence" },
  { label: "Housing Disrepair", value: "housing_disrepair" },
  { label: "Family", value: "family" },
  { label: "Criminal", value: "criminal" },
  { label: "General", value: "general" },
];

const PRACTICE_AREA_FILTERS_CRIMINAL_PILOT: Array<{ label: string; value: string }> = [
  { label: "All", value: "all" },
  { label: "Criminal defence", value: "criminal" },
];

const PRACTICE_AREA_FILTERS = SHOW_ALL_PRACTICE_AREA_FILTERS
  ? PRACTICE_AREA_FILTERS_FULL
  : PRACTICE_AREA_FILTERS_CRIMINAL_PILOT;

export default async function CasesPage({ searchParams }: CasesPageProps) {
  const { orgId, userId } = await requireAuthContext();
  const supabase = getSupabaseAdminClient();
  const pilotMode = isCriminalPilotMode();
  const showInternalTools = shouldShowInternalDevTools(userId);
  
  // Get practice area from URL params (set by role selection or global selector)
  // Default to "all" if no practice area in URL
  const selectedPracticeArea = (searchParams.practiceArea ?? "all").toLowerCase();
  const selectedRole = searchParams.role;

  let query = supabase
    .from("cases")
    .select("id, title, summary, practice_area, updated_at, created_at, eval_pack_id, eval_pack_name, eval_case_no")
    .eq("org_id", orgId)
    .eq("is_archived", false); // Exclude archived cases

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

  const { data: casesRaw, error } = await query;

  if (error) {
    throw error;
  }

  if (!casesRaw) {
    notFound();
  }

  const caseIds = casesRaw.map((c) => c.id);
  const criminalByCase = new Map<
    string,
    {
      next_hearing_date: string | null;
      defendant_name: string | null;
      court_name: string | null;
      court_type: string | null;
      alleged_offence: string | null;
      offence_override: string | null;
    }
  >();
  const chargeOffencesByCase = new Map<string, string[]>();

  if (caseIds.length > 0) {
    const [{ data: criminalRows }, { data: chargeRows }] = await Promise.all([
      supabase
        .from("criminal_cases")
        .select(
          "id, next_hearing_date, defendant_name, court_name, court_type, alleged_offence, offence_override",
        )
        .eq("org_id", orgId)
        .in("id", caseIds),
      supabase.from("criminal_charges").select("case_id, offence").eq("org_id", orgId).in("case_id", caseIds),
    ]);

    for (const row of criminalRows ?? []) {
      criminalByCase.set(row.id, {
        next_hearing_date: row.next_hearing_date ?? null,
        defendant_name: row.defendant_name ?? null,
        court_name: row.court_name ?? null,
        court_type: row.court_type ?? null,
        alleged_offence: row.alleged_offence ?? null,
        offence_override: row.offence_override ?? null,
      });
    }

    for (const row of chargeRows ?? []) {
      const offence = row.offence?.trim();
      if (!offence) continue;
      const list = chargeOffencesByCase.get(row.case_id) ?? [];
      list.push(offence);
      chargeOffencesByCase.set(row.case_id, list);
    }
  }

  const mappedCases = casesRaw.map((c) => {
        const criminal = criminalByCase.get(c.id);
        return {
          ...c,
          next_hearing_date: criminal?.next_hearing_date ?? null,
          defendant_name: criminal?.defendant_name ?? null,
          court_name: criminal?.court_name ?? null,
          court_type: criminal?.court_type ?? null,
          alleged_offence: criminal?.alleged_offence ?? null,
          offence_override: criminal?.offence_override ?? null,
          charge_offences: chargeOffencesByCase.get(c.id) ?? null,
        };
      });

  const cases = sortCasesForDisplay(filterCasesForPilotUser(mappedCases, userId));

  if (process.env.NODE_ENV === "development") {
    console.info("[CasesPage] pilot case visibility", summarizePilotCaseFilter(mappedCases, userId));
  }

  return (
    <div className="space-y-6">
      <CasesPageClient />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-accent">Cases</h1>
          <p className="text-sm text-accent/60">
            {pilotMode && !showInternalTools
              ? "Pilot criminal defence matters with bundle-derived metadata on file."
              : selectedPracticeArea !== "all" && selectedRole
                ? `Filtered to ${PRACTICE_AREA_FILTERS.find((f) => f.value === selectedPracticeArea)?.label ?? selectedPracticeArea} cases (${selectedRole})`
                : selectedPracticeArea !== "all"
                  ? `Filtered to ${PRACTICE_AREA_FILTERS.find((f) => f.value === selectedPracticeArea)?.label ?? selectedPracticeArea} cases`
                  : "All matters scoped to your organisation. Filter by practice area to focus on specific areas."}
          </p>
        </div>
        <CurrentPersonaBadge />
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/upload">
            <Button variant="secondary" className="gap-2">
              <Plus className="h-4 w-4" />
              Upload to create case
            </Button>
          </Link>
          <BulkArchiveCasesButton
            caseIds={cases.map((c) => c.id)}
            visibleCount={cases.length}
            hidden={pilotMode && !showInternalTools}
          />
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

      <FilterToolbar selected={selectedPracticeArea} filters={PRACTICE_AREA_FILTERS} />

      <Card>
        {cases.length ? (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {cases.map((caseItem) => (
              <li key={caseItem.id}>
                <div className="flex h-full flex-col rounded-2xl border border-primary/10 bg-surface-muted/80 p-5 transition hover:border-primary/40 hover:shadow-card">
                  <div className="flex items-start justify-between gap-3">
                    <Link href={resolveCaseEntryHref(caseItem.id, caseItem.practice_area)} className="flex-1">
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
          <EmptyState
            selectedPracticeArea={selectedPracticeArea}
            pilotMode={pilotMode && !showInternalTools}
          />
        )}
      </Card>
    </div>
  );
}

function FilterToolbar({
  selected,
  filters,
}: {
  selected: string;
  filters: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((filter) => {
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
  if (practiceArea === "criminal") {
    return <Badge className="bg-primary/15 text-primary border border-primary/25">Criminal</Badge>;
  }
  if (practiceArea === "pi") {
    return <Badge className="bg-primary/10 text-primary">PI</Badge>;
  }
  if (practiceArea === "clinical_negligence") {
    return <Badge className="bg-warning/10 text-warning">Clinical Neg</Badge>;
  }
  if (practiceArea === "housing_disrepair") {
    return <Badge className="bg-success/10 text-success">Housing Disrepair</Badge>;
  }
  if (practiceArea === "family") {
    return <Badge className="bg-secondary/15 text-secondary">Family</Badge>;
  }
  return <Badge variant="default">General</Badge>;
}

function EmptyState({
  selectedPracticeArea,
  pilotMode = false,
}: {
  selectedPracticeArea: string;
  pilotMode?: boolean;
}) {
  if (pilotMode) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-200 bg-white p-16 text-center">
        <h2 className="text-lg font-semibold text-slate-900">No criminal matters yet.</h2>
        <p className="max-w-md text-sm text-slate-600">
          Upload a disclosure pack or bundle to create a matter, or open an existing case once it
          appears here.
        </p>
        <Link
          href="/upload"
          className="mt-2 text-sm font-medium text-blue-700 hover:text-blue-900 underline-offset-2 hover:underline"
        >
          Upload bundle
        </Link>
      </div>
    );
  }

  const label =
    PRACTICE_AREA_FILTERS.find((filter) => filter.value === selectedPracticeArea)?.label ??
    "cases";

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-primary/30 bg-surface-muted/60 p-16 text-center">
      <h2 className="text-lg font-semibold text-accent">No {label.toLowerCase()} found.</h2>
      <p className="max-w-md text-sm text-accent/60">
        {selectedPracticeArea === "criminal"
          ? "Upload a disclosure pack or bundle to create a criminal matter, or open an existing case from Upload."
          : "Upload a disclosure pack or run the PI / Clinical Neg intake wizard to start building your timeline."}
      </p>
    </div>
  );
}
