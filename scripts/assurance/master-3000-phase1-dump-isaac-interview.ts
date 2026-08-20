/**
 * Dump Isaac Patel interview/transcript canonical rows (auth via env).
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
function loadLocalEnv(): void {
  for (const name of [".env.local", ".env"]) {
    const envPath = path.join(ROOT, name);
    if (!existsSync(envPath)) continue;
    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

async function main() {
  loadLocalEnv();
  const base = (process.env.CB_PREVIEW_BASE_URL ?? "").replace(/\/$/, "");
  const caseId = process.env.CB_ISAAC_CASE_ID!;
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
  const signIn = await sb.auth.signInWithPassword({
    email: process.env.CB_QA_EMAIL!,
    password: process.env.CB_QA_PASSWORD!,
  });
  if (signIn.error || !signIn.data.session) throw signIn.error ?? new Error("no session");
  const res = await fetch(`${base}/api/criminal/${caseId}/bundle-source`, {
    headers: { Authorization: `Bearer ${signIn.data.session.access_token}` },
  });
  const j = await res.json();
  const outDir = path.join(
    ROOT,
    "artifacts/casebrain-qa/assurance/master-auditor-v2/master-3000-release-assurance",
  );
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, "PHASE1-ISAAC-BUNDLE-SOURCE.json"), JSON.stringify(j, null, 2));
  const items =
    j?.canonical?.evidenceState?.items ??
    j?.canonical?.evidenceState?.rows ??
    j?.evidenceState?.items ??
    [];
  const interview = (Array.isArray(items) ? items : []).filter((r: any) =>
    /interview|transcript|recording/i.test(JSON.stringify(r)),
  );
  writeFileSync(
    path.join(outDir, "PHASE1-ISAAC-INTERVIEW-ROWS.json"),
    JSON.stringify({ status: res.status, interview, count: items.length }, null, 2),
  );
  console.log("status", res.status, "items", items.length, "interviewish", interview.length);
  for (const r of interview) {
    console.log("-", r.label ?? r.title, "|", r.existence ?? r.state, "|", r.modality, "|", r.id);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
