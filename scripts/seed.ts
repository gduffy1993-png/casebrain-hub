import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { env } from "../lib/env";

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
  auth: { autoRefreshToken: false, persistSession: false },
  },
);

async function main() {
  const orgId = process.env.SEED_ORG_ID ?? randomUUID();
  const userId = process.env.SEED_USER_ID ?? randomUUID();

  await supabase.from("orgs").upsert({
    id: orgId,
    name: "Demo Litigation LLP",
  });

  await supabase.from("users").upsert({
    id: userId,
    email: "demo.solicitor@example.com",
    name: "Demo Solicitor",
    role: "owner",
    org_id: orgId,
  });

  const cases = [
    {
      title: "Matthews v Northbound Transport Ltd",
      summary:
        "Road traffic accident claim with liability contested, disclosure pending.",
    },
    {
      title: "Stark v Greenbanks Housing",
      summary:
        "Housing disrepair matter with expert report awaited and Part 36 offer outstanding.",
    },
    {
      title: "Harris v MedSecure NHS Trust",
      summary:
        "Clinical negligence case involving delayed diagnosis and ongoing settlement discussions.",
    },
  ];

  for (const legalCase of cases) {
    const { data: createdCase, error: caseError } = await supabase
      .from("cases")
      .insert({
        org_id: orgId,
        title: legalCase.title,
        summary: legalCase.summary,
        created_by: userId,
      })
      .select("id")
      .maybeSingle();

    if (caseError || !createdCase) {
      console.error("Failed to create case", legalCase.title, caseError);
      continue;
    }

    await supabase.from("deadlines").insert({
      case_id: createdCase.id,
      title: "Disclosure list due (CPR 31.10)",
      due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      business_days: 10,
    });

    await supabase.from("letters").insert({
      case_id: createdCase.id,
      template_id: "acknowledgment",
      body: "Dear Sir/Madam,\n\nWe acknowledge safe receipt of your correspondence and will revert within the prescribed timeframe.\n\nYours faithfully,\nDemo Litigation LLP",
      version: 1,
      created_by: userId,
    });
  }

  console.log("Seed data inserted for org:", orgId);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

