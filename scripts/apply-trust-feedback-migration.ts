#!/usr/bin/env npx tsx
/**
 * Apply trust_feedback migration to linked Supabase project.
 *
 * Preferred (linked CLI):
 *   Get-Content supabase/migrations/20260628120000_trust_feedback.sql | npx supabase db query --linked
 *
 * Run: npx tsx scripts/apply-trust-feedback-migration.ts
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const MIGRATION = path.join(
  process.cwd(),
  "supabase/migrations/20260628120000_trust_feedback.sql",
);

function main(): void {
  if (!fs.existsSync(MIGRATION)) {
    throw new Error(`Migration not found: ${MIGRATION}`);
  }

  const sql = fs.readFileSync(MIGRATION, "utf8");
  const result = spawnSync("npx", ["supabase", "db", "query", "--linked"], {
    input: sql,
    encoding: "utf8",
    shell: process.platform === "win32",
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    throw new Error(`supabase db query failed (exit ${result.status})`);
  }

  console.log("apply-trust-feedback-migration: OK");
}

main();
