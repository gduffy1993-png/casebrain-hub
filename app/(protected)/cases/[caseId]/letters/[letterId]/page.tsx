import { notFound } from "next/navigation";
import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { LetterDiff } from "@/components/letters/letter-diff";

type Params = {
  params: { caseId: string; letterId: string };
};

export default async function LetterDetailPage({ params }: Params) {
  const { caseId, letterId } = params;
  const { orgId } = await requireAuthContext();
  const supabase = getSupabaseAdminClient();

  const { data: letter } = await supabase
    .from("letters")
    .select(
      "id, version, body, created_by, updated_at, cases!inner(id, org_id, title)",
    )
    .eq("id", letterId)
    .eq("case_id", caseId)
    .eq("cases.org_id", orgId)
    .maybeSingle();

  if (!letter) {
    notFound();
  }

  const { data: previousVersion } = await supabase
    .from("letters")
    .select("body, version")
    .eq("case_id", caseId)
    .lt("version", letter.version)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const previousBody = previousVersion?.body ?? "";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-accent">
          Letter v{letter.version}
        </h1>
        <p className="text-sm text-accent/60">
          Drafted by {letter.created_by ?? "CaseBrain"} on{" "}
          {letter.updated_at
            ? new Date(letter.updated_at).toLocaleString("en-GB")
            : "unknown date"}
        </p>
      </header>

      <Card title="Current version">
        <pre className="whitespace-pre-wrap text-sm leading-relaxed text-accent/80">
          {letter.body}
        </pre>
      </Card>

      {previousBody && (
        <Card title="Changes since previous version">
          <LetterDiff previous={previousBody} current={letter.body} />
        </Card>
      )}
    </div>
  );
}

