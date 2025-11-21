import { addDays, addMonths, subDays } from "date-fns";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { createTaskForDeadline } from "@/lib/tasks";

export type ProtocolKind = "pi_basic" | "clinical_negligence_basic";

export type ProtocolContext = {
  caseId: string;
  orgId: string;
  createdBy: string;
  accidentDate?: Date | null;
  limitationDate?: Date | null;
};

type DeadlineSeed = {
  label: string;
  rule: string;
  dueDate: Date;
  description?: string;
};

export async function seedProtocolDeadlines(
  protocol: ProtocolKind,
  ctx: ProtocolContext,
): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const seeds = buildSeeds(protocol, ctx);

  if (!seeds.length) {
    return;
  }

  for (const seed of seeds) {
    try {
      const { data, error } = await supabase
        .from("deadlines")
        .insert({
          org_id: ctx.orgId,
          case_id: ctx.caseId,
          label: seed.label,
          due_date: seed.dueDate.toISOString().slice(0, 10),
          rule: seed.rule,
        })
        .select("id, due_date")
        .maybeSingle();

      if (error || !data) {
        console.error("[pi:protocol] Failed to insert deadline", {
          error,
          seed,
        });
        continue;
      }

      await createTaskForDeadline({
        caseId: ctx.caseId,
        orgId: ctx.orgId,
        createdBy: ctx.createdBy,
        deadlineTitle: seed.label,
        dueDate: new Date(data.due_date),
      });
    } catch (error) {
      console.error("[pi:protocol] Error seeding protocol deadline", { error, seed });
    }
  }
}

function buildSeeds(protocol: ProtocolKind, ctx: ProtocolContext): DeadlineSeed[] {
  const seeds: DeadlineSeed[] = [];
  const accidentDate = ctx.accidentDate ?? null;
  const limitationDate = ctx.limitationDate ?? null;
  const now = new Date();

  if (accidentDate) {
    const cnfDue = addDays(accidentDate, 1);
    seeds.push({
      label: "Submit CNF / LOI",
      rule: protocol === "clinical_negligence_basic" ? "CLIN_NEG_CNF" : "PI_CNF",
      dueDate: cnfDue,
      description: "Send Claim Notification Form or Letter of Instruction.",
    });

    const recordsRequestDue = addMonths(accidentDate, 1);
    seeds.push({
      label: "Request medical records",
      rule: "PI_MEDICAL_RECORDS",
      dueDate: recordsRequestDue,
      description: "Ensure records request has been issued to relevant providers.",
    });
  }

  if (limitationDate) {
    const preLimCheck = subDays(limitationDate, 180);
    seeds.push({
      label: "Limitation check (6 months)",
      rule: "PI_LIM_CHECK",
      dueDate: preLimCheck < now ? now : preLimCheck,
      description: "Review limitation position and issue if necessary.",
    });

    const finalLimReminder = subDays(limitationDate, 30);
    seeds.push({
      label: "Limitation final reminder (30 days)",
      rule: "PI_LIM_FINAL",
      dueDate: finalLimReminder < now ? now : finalLimReminder,
    });
  }

  if (protocol === "clinical_negligence_basic") {
    const expertInstruction = addMonths(now, 2);
    seeds.push({
      label: "Instruct clinical expert",
      rule: "CLIN_NEG_EXPERT",
      dueDate: expertInstruction,
      description: "Confirm instructions to appropriate clinician.",
    });
  } else {
    const rehabReview = addMonths(now, 3);
    seeds.push({
      label: "Rehabilitation review",
      rule: "PI_REHAB_REVIEW",
      dueDate: rehabReview,
      description: "Check on rehabilitation and interim needs.",
    });
  }

  return seeds;
}

