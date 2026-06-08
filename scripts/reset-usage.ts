#!/usr/bin/env tsx
/**
 * Reset usage counters for an organization
 * Usage: npx tsx scripts/reset-usage.ts <orgId> [--all]
 */

import { getSupabaseAdminClient } from "../lib/supabase";

async function main() {
  const orgId = process.argv[2];
  const resetAll = process.argv.includes("--all");

  if (!orgId) {
    console.error("Usage: npx tsx scripts/reset-usage.ts <orgId> [--all]");
    console.error("  --all: Reset all counters (uploads, analysis, exports)");
    console.error("  Without --all: Only reset upload_count");
    process.exit(1);
  }

  const supabase = getSupabaseAdminClient();

  const updates: Record<string, number> = {};
  if (resetAll) {
    updates.upload_count = 0;
    updates.analysis_count = 0;
    updates.export_count = 0;
    console.log("Resetting all usage counters...");
  } else {
    updates.upload_count = 0;
    console.log("Resetting upload_count only...");
  }

  const { error } = await supabase
    .from("organisations")
    .update(updates)
    .eq("id", orgId);

  if (error) {
    console.error("Failed to reset usage:", error);
    process.exit(1);
  }

  console.log("✅ Usage counters reset successfully!");
  console.log("Reset:", updates);
}

main().catch(console.error);

