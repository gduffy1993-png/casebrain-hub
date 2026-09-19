/**
 * Local Liam Parker proof: stored 233-char parser stub must become withheld, not quiet.
 *
 * Run: npx tsx scripts/ingestion-gate-liam-local-proof.ts
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

import { composeAuthenticatedBundleSourceWithCanonical } from "../lib/criminal/authenticated-matter-canonical";
import { getDocumentBodyText } from "../lib/bundle/bundle-document-text";
import { isParserDiagnosticPlaceholder } from "../lib/upload/ingestion-assessment";

const LIAM_CASE_ID = "883193c5-7eb2-433a-827d-d58c1b8874da";
const HALE_CASE_ID = "9b555b7b-d520-4c33-a661-9ed93acc0fe1";
const OUT = path.resolve(
  "artifacts/casebrain-qa/assurance/certified-claim-lineage-v1/slice1-ingestion-gate-v1",
);

function applyEnvFile(envPath: string, override = false): void {
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (override || !process.env[key]) process.env[key] = val;
  }
}

function loadEnv(): void {
  applyEnvFile(path.join(process.cwd(), ".env.local"));
  applyEnvFile("C:\\Users\\gduff\\casebrain-hub\\.env.local", true);
}

async function loadDocs(caseId: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from("documents")
    .select("id, name, type, raw_text, extracted_text, extracted_json")
    .eq("case_id", caseId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

function assess(caseId: string, docs: Awaited<ReturnType<typeof loadDocs>>) {
  const composed = composeAuthenticatedBundleSourceWithCanonical(docs, {
    caseId,
    withSurfaces: true,
  });
  return {
    caseId,
    documentCount: docs.length,
    storedLengths: docs.map((doc) => ({
      name: doc.name,
      raw: String(doc.raw_text ?? "").length,
      extracted: String(doc.extracted_text ?? "").length,
      diagnostic:
        isParserDiagnosticPlaceholder(doc.raw_text) ||
        isParserDiagnosticPlaceholder(doc.extracted_text),
      bodyTextLength: getDocumentBodyText(doc).length,
    })),
    decision: composed.canonical.ingestion.decision,
    reasonCodes: composed.canonical.ingestion.reasonCodes,
    withheld: composed.canonical.ingestion.substantiveOutputsWithheld,
    combinedTextLength: composed.combinedTextLength,
    units: composed.units.length,
    findings: composed.canonical.findings.length,
    chaseLabels: composed.canonical.chaseLabels.length,
    surfacesNull: composed.surfaces == null,
  };
}

async function main() {
  loadEnv();
  const liamDocs = await loadDocs(LIAM_CASE_ID);
  const haleDocs = await loadDocs(HALE_CASE_ID);
  const liam = assess(LIAM_CASE_ID, liamDocs);
  const hale = assess(HALE_CASE_ID, haleDocs);
  if (!liam.withheld) throw new Error("Liam Parker was not withheld");
  if (liam.combinedTextLength !== 0) throw new Error("Liam still has combined source text");
  if (liam.units !== 0) throw new Error("Liam still produced document units");
  if (liam.chaseLabels !== 0) throw new Error("Liam still produced chase labels");
  if (liam.storedLengths.some((row) => row.bodyTextLength > 0 && row.diagnostic)) {
    throw new Error("Liam parser diagnostic leaked into source body text");
  }
  if (hale.withheld) throw new Error("Leon Hale known-16 case was withheld");
  if (hale.combinedTextLength < 200) throw new Error("Leon Hale source text missing");

  mkdirSync(OUT, { recursive: true });
  writeFileSync(
    path.join(OUT, "LIAM-LOCAL.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), liam, hale }, null, 2),
  );
  console.log(
    `liam: ${liam.decision} withheld=${liam.withheld} units=${liam.units} chase=${liam.chaseLabels}`,
  );
  console.log(
    `hale: ${hale.decision} withheld=${hale.withheld} units=${hale.units} text=${hale.combinedTextLength}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
