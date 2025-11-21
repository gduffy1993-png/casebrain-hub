import { notFound } from "next/navigation";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { LetterGenerator } from "@/components/letters/letter-generator";
import { Card } from "@/components/ui/card";

type Params = {
  params: { caseId: string };
};

export default async function NewLetterPage({ params }: Params) {
  const { caseId } = params;
  const { orgId } = await requireAuthContext();
  const supabase = getSupabaseAdminClient();

  const [{ data: caseRecord }, { data: templates }] = await Promise.all([
    supabase
      .from("cases")
      .select("id, title, summary, org_id, practice_area")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .eq("is_archived", false)
      .maybeSingle(),
    supabase
      .from("letterTemplates")
      .select("id, name, body_template, practice_area")
      .order("created_at", { ascending: false }),
  ]);

  if (!caseRecord) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-accent">
          Generate letter for {caseRecord.title}
        </h1>
        <p className="text-sm text-accent/60">
          Templates pull facts from extracted documents and your own notes.
        </p>
      </header>
      <Card>
        <LetterGenerator
          caseId={caseId}
          templates={templates ?? []}
          practiceArea={caseRecord.practice_area ?? "general"}
        />
      </Card>
    </div>
  );
}

