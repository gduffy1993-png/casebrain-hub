/* eslint-disable no-console */

/**
 * Scheduled worker that refreshes PI risk assessments across all active PI cases.
 * Intended to be invoked daily (or via the provided PowerShell helper).
 */
import { getSupabaseAdminClient } from "@/lib/supabase";
import { evaluatePiRisks } from "@/lib/pi/risk";

const WORKER_NAME = "pi-risk";

async function run() {
  console.log(`[worker:${WORKER_NAME}] Started ${new Date().toISOString()}`);
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("pi_cases")
    .select("id, org_id, stage")
    .neq("stage", "closed");

  if (error) {
    console.error(`[worker:${WORKER_NAME}] Failed to load PI cases`, error);
    process.exitCode = 1;
    return;
  }

  if (!data?.length) {
    console.log(`[worker:${WORKER_NAME}] No open PI cases found.`);
    return;
  }

  for (const piCase of data) {
    if (!piCase.org_id) {
      console.log(
        `[worker:${WORKER_NAME}] Skipping case ${piCase.id} because it has no org_id.`,
      );
      continue;
    }

    try {
      await evaluatePiRisks({
        caseId: piCase.id,
        orgId: piCase.org_id,
        trigger: "worker_pi_daily",
      });
      console.log(
        `[worker:${WORKER_NAME}] Evaluated PI risks for case ${piCase.id} (org ${piCase.org_id}).`,
      );
    } catch (workerError) {
      console.error(
        `[worker:${WORKER_NAME}] Failed to evaluate PI risks for case ${piCase.id}`,
        workerError,
      );
      process.exitCode = 1;
    }
  }
}

run()
  .catch((error) => {
    console.error(`[worker:${WORKER_NAME}] Unhandled error`, error);
    process.exitCode = 1;
  })
  .finally(() => {
    console.log(`[worker:${WORKER_NAME}] Completed ${new Date().toISOString()}`);
  });


