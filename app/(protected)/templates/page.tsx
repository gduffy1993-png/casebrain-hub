import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";

export default async function TemplatesPage() {
  await requireRole(["owner", "solicitor"]);
  const supabase = getSupabaseAdminClient();
  const { data: templates, error } = await supabase
    .from("letterTemplates")
    .select("id, name, body_template, practice_area, created_at")
    .order("practice_area", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  // Group templates by practice area
  const templatesByArea = {
    pi: templates?.filter((t) => t.practice_area === "pi" || t.practice_area === "clinical_negligence") ?? [],
    housing: templates?.filter((t) => t.practice_area === "housing_disrepair") ?? [],
    general: templates?.filter((t) => !t.practice_area || t.practice_area === "general") ?? [],
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-accent">
            Letter templates
          </h1>
          <p className="text-sm text-accent/60">
            Manage the firm-approved templates that power AI letter drafting.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {process.env.NEXT_PUBLIC_ENABLE_LABS === "true" && (
            <Link href="/templates/pi">
              <Button variant="secondary" className="gap-2">
                PI templates
              </Button>
            </Link>
          )}
          <Button variant="primary" className="gap-2">
            <Plus className="h-4 w-4" />
            New Template
          </Button>
        </div>
      </div>

      <Card>
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <div className="space-y-6">
            {templatesByArea.pi.length > 0 && (
              <div>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-accent/70">
                  PI / Clinical Negligence Templates
                </h2>
                <ul className="space-y-4">
                  {templatesByArea.pi.map((template) => (
                    <TemplateItem key={template.id} template={template} />
                  ))}
                </ul>
              </div>
            )}

            {templatesByArea.housing.length > 0 && (
              <div>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-accent/70">
                  Housing Disrepair Templates
                </h2>
                <ul className="space-y-4">
                  {templatesByArea.housing.map((template) => (
                    <TemplateItem key={template.id} template={template} />
                  ))}
                </ul>
              </div>
            )}

            {templatesByArea.general.length > 0 && (
              <div>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-accent/70">
                  General Templates
                </h2>
                <ul className="space-y-4">
                  {templatesByArea.general.map((template) => (
                    <TemplateItem key={template.id} template={template} />
                  ))}
                </ul>
              </div>
            )}

            {templates?.length === 0 && (
              <p className="text-sm text-accent/60">
                No templates found. Add your first template to start drafting.
              </p>
            )}
          </div>
        </Suspense>
      </Card>
    </div>
  );
}

function TemplateItem({
  template,
}: {
  template: { id: string; name: string; body_template: string; created_at: string };
}) {
  return (
    <li className="rounded-2xl border border-primary/10 bg-surface-muted/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-accent">{template.name}</h2>
          <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm text-accent/60">
            {template.body_template.slice(0, 240)}…
          </p>
        </div>
        <Link
          href={`/templates/${template.id}`}
          className="text-xs font-semibold text-primary hover:underline"
        >
          Edit
        </Link>
      </div>
      <p className="mt-3 text-xs text-accent/40">
        Created {new Date(template.created_at).toLocaleDateString("en-GB")}
      </p>
    </li>
  );
}

