import { requireRole } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { PiLetterTemplatesManager } from "@/components/pi/PiLetterTemplatesManager";
import type { PiLetterTemplate } from "@/types";

type TemplateRow = PiLetterTemplate & {
  scope: "org" | "global";
};

export default async function PiTemplatesPage() {
  const { orgId } = await requireRole(["owner", "solicitor"]);

  if (!orgId || orgId.startsWith("solo-")) {
    return (
      <div className="space-y-4">
        <Card>
          <p className="text-sm text-accent/60">
            PI letter templates require an active organisation. Connect to a real organisation to
            manage local templates.
          </p>
        </Card>
      </div>
    );
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("pi_letter_templates")
    .select("id, org_id, code, name, description, body, created_at, updated_at")
    .or(`org_id.eq.${orgId},org_id.is.null`)
    .order("org_id", { ascending: false })
    .order("code", { ascending: true });

  if (error) {
    throw error;
  }

  const templates: TemplateRow[] =
    data?.map((template) => ({
      ...template,
      scope: template.org_id === null ? "global" : "org",
    })) ?? [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-accent">PI / Clinical Neg letter templates</h1>
        <p className="mt-1 text-sm text-accent/60">
          Maintain personal injury and clinical negligence letter templates. Global templates are
          provided by CaseBrain; create organisation versions to customise the copy.
        </p>
      </header>

      <PiLetterTemplatesManager templates={templates} orgId={orgId} />
    </div>
  );
}


