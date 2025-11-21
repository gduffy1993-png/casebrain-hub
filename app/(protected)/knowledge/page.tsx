import { requireAuthContext } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { Card } from "@/components/ui/card";

export default async function KnowledgePage() {
  const { orgId } = await requireAuthContext();
  const supabase = getSupabaseAdminClient();

  const { data: entities } = await supabase
    .from("entities")
    .select("id, label, type, case_id, cases(title)")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: links } = await supabase
    .from("entity_links")
    .select("source_entity, target_entity, relationship")
    .eq("org_id", orgId)
    .limit(100);

  const entityMap = new Map(
    (entities ?? []).map((entity) => [entity.id, entity.label]),
  );

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-accent">Knowledge graph</h1>
        <p className="mt-2 max-w-2xl text-sm text-accent/60">
          CaseBrain maps parties, organisations, courts, and their relationships across your cases.
        </p>
      </header>

      <Card title="Entities">
        <div className="overflow-x-auto rounded-2xl border border-primary/10">
          <table className="min-w-full divide-y divide-primary/10 text-sm">
            <thead className="bg-surface-muted/60 text-xs uppercase tracking-wide text-accent/40">
              <tr>
                <th className="px-4 py-3 text-left">Entity</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Case</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/10 text-accent/80">
              {(entities ?? []).map((entity) => (
                <tr key={entity.id}>
                  <td className="px-4 py-3">{entity.label}</td>
                  <td className="px-4 py-3">{entity.type}</td>
                  <td className="px-4 py-3">
                    {Array.isArray(entity.cases)
                      ? entity.cases[0]?.title ?? "—"
                      : (entity.cases as { title?: string } | null | undefined)?.title ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!(entities ?? []).length && (
            <p className="p-6 text-sm text-accent/60">No entities detected yet.</p>
          )}
        </div>
      </Card>

      <Card title="Relationships">
        <ul className="space-y-3">
          {(links ?? []).map((link) => (
            <li key={`${link.source_entity}-${link.target_entity}`} className="rounded-2xl border border-primary/10 bg-surface-muted/60 p-4 text-sm text-accent/70">
              <span className="font-semibold text-accent">
                {entityMap.get(link.source_entity) ?? link.source_entity}
              </span>{" "}
              →{" "}
              <span className="font-semibold text-accent">
                {entityMap.get(link.target_entity) ?? link.target_entity}
              </span>{" "}
              <span className="uppercase text-accent/40">({link.relationship})</span>
            </li>
          ))}
          {!(links ?? []).length && (
            <li className="text-sm text-accent/60">No relationships recorded yet.</li>
          )}
        </ul>
      </Card>
    </div>
  );
}

