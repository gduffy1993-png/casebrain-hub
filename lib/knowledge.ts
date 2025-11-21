import type { SupabaseClient } from "@supabase/supabase-js";

const ENTITY_PATTERNS: Array<{ type: string; regex: RegExp }> = [
  { type: "person", regex: /\b(Mr|Mrs|Ms|Dr)\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?/g },
  { type: "organisation", regex: /\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)* (Ltd|LLP|LLC|PLC))\b/g },
  { type: "court", regex: /\b(High Court|County Court|Court of Appeal|Supreme Court)\b/g },
];

export async function extractEntitiesFromText({
  client,
  orgId,
  caseId,
  text,
}: {
  client: SupabaseClient;
  orgId: string;
  caseId: string;
  text: string;
}) {
  const entities: Array<{ label: string; type: string }> = [];
  ENTITY_PATTERNS.forEach((pattern) => {
    const matches = text.match(pattern.regex);
    if (matches) {
      matches.forEach((match) =>
        entities.push({ label: match.trim(), type: pattern.type }),
      );
    }
  });

  if (!entities.length) return;

  const unique = Array.from(
    new Map(entities.map((entity) => [entity.label, entity])).values(),
  );

  await client.from("entities").insert(
    unique.map((entity) => ({
      org_id: orgId,
      case_id: caseId,
      label: entity.label,
      type: entity.type,
    })),
  );
}

export async function linkEntities({
  client,
  orgId,
  relationships,
}: {
  client: SupabaseClient;
  orgId: string;
  relationships: Array<{
    sourceLabel: string;
    targetLabel: string;
    relationship: string;
    caseId: string;
  }>;
}) {
  if (!relationships.length) return;
  for (const rel of relationships) {
    const { data: source } = await client
      .from("entities")
      .select("id")
      .eq("org_id", orgId)
      .eq("case_id", rel.caseId)
      .eq("label", rel.sourceLabel)
      .maybeSingle();
    const { data: target } = await client
      .from("entities")
      .select("id")
      .eq("org_id", orgId)
      .eq("case_id", rel.caseId)
      .eq("label", rel.targetLabel)
      .maybeSingle();

    if (source?.id && target?.id) {
      await client.from("entity_links").insert({
        org_id: orgId,
        source_entity: source.id,
        target_entity: target.id,
        relationship: rel.relationship,
      });
    }
  }
}

