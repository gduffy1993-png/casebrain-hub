/**
 * Verify criminal_law_chunks RLS migration SQL is present.
 * Run: npx tsx scripts/criminal-law-chunks-rls.test.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const migrationSql = fs.readFileSync(
  path.join(process.cwd(), "supabase/migrations/20260623120000_criminal_law_chunks_rls.sql"),
  "utf8",
);

assert.ok(migrationSql.includes("ENABLE ROW LEVEL SECURITY"), "migration enables RLS");
assert.ok(migrationSql.includes("deny_anon_criminal_law_chunks"), "migration denies anon");
assert.ok(migrationSql.includes("deny_authenticated_criminal_law_chunks"), "migration denies authenticated");
assert.ok(migrationSql.includes("REVOKE ALL ON FUNCTION public.match_criminal_law_chunks"), "RPC revoked from public");

console.log("criminal-law-chunks-rls.test.ts OK");
