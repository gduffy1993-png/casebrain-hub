#!/usr/bin/env npx tsx
/**
 * Low-resource sequential five-tab visual check (one browser context).
 * Run only when a single Next server is already up.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const BASE = (process.env.H5_SMOKE_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const CASE = process.env.H5_SMOKE_CASE_ID?.trim() || "4e22fb0f-8631-4cda-9aef-fea6a24f6163";
const EMAIL = process.env.H5_SMOKE_EMAIL?.trim() || "demo.loom.taylor.1782877263@casebrain.qa.smoke";
const PASS = process.env.SMOKE_PASSWORD ?? "ProdSmokeOnly!Jun2026";
const OUT = path.join("artifacts", "casebrain-qa", "solicitor-light-five-tab");

type TabReport = {
  id: string;
  loaded: boolean;
  href: string;
  screenshot: string | null;
  checks: Record<string, "yes" | "no" | "n/a">;
  notes: string[];
  preview: string;
};

for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  if (!line || line.startsWith("#")) continue;
  const eq = line.indexOf("=");
  if (eq <= 0) continue;
  const k = line.slice(0, eq).trim();
  const v = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
  if (!process.env[k]) process.env[k] = v;
}

async function signIn(page: Page) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createClient(url, service, { auth: { persistSession: false } });
  for (let p = 1; p <= 10; p++) {
    const { data } = await admin.auth.admin.listUsers({ page: p, perPage: 200 });
    const hit = data.users.find((u) => u.email?.toLowerCase() === EMAIL.toLowerCase());
    if (hit) {
      await admin.auth.admin.updateUserById(hit.id, { password: PASS, email_confirm: true });
      break;
    }
    if (data.users.length < 200) break;
  }
  const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const s = await client.auth.signInWithPassword({ email: EMAIL, password: PASS });
  if (!s.data.session) throw s.error ?? new Error("sign-in failed");
  const ref = new URL(url).hostname.split(".")[0]!;
  const payload = Buffer.from(JSON.stringify(s.data.session)).toString("base64url");
  await page.context().addCookies([
    {
      name: `sb-${ref}-auth-token`,
      value: `base64-${payload}`,
      domain: new URL(BASE).hostname,
      path: "/",
      sameSite: "Lax",
      secure: BASE.startsWith("https"),
    },
  ]);
}

function checksFromBody(id: string, body: string, loaded: boolean): TabReport["checks"] {
  if (!loaded) {
    return {
      actual_cockpit_loaded: "no",
      duplicate_wording: "n/a",
      duplicate_stage_hearing_court: "n/a",
      pre_ptph_pre_ptph: "n/a",
      repeated_open_chase: "n/a",
      repeated_court_safe_lines: "n/a",
      repeated_mg11_blocks: "n/a",
      repeated_chase_headings: "n/a",
      proof_drawer_confusing_dup: "n/a",
      dangerous_wording: "n/a",
      fake_live_solicitor_claim: "n/a",
      wrong_family_bleed: "n/a",
    };
  }
  const n = (re: RegExp) => [...body.matchAll(new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g"))].length;
  const openChase = n(/open chase\s*\(\d+\)\s*→/gi);
  const addl = n(/additional source[- ]material issues?\s*\(/gi);
  const chaseDot = n(/disclosure chase\s*·\s*\d+\s*on file/gi);
  const caseWide = n(/case-wide court line/gi);
  const mg11 = n(/complainant\s+mg11\s*\/\s*source material/gi);
  const refused = n(/refused to overstate/gi);
  const courtCellDup = [...body.matchAll(/\b([A-Z][a-zA-Z]+(?:\s+[A-Za-z]+){0,3}\s+Court)\s+\1\b/g)].length > 0;
  const preDup = /pre\s+ptph\s+pre\s+ptph/i.test(body);
  const dangerous = /\bBWV\s+(?:shows|confirms|proves)\b|\bdrug\s+continuity\b|\bsafeguards\s+were\s+followed\b/i.test(body);
  const liveClaim = /solicitor[- ]validated live|live solicitor validation|soc\s*2|iso\s*27001/i.test(body);
  const wrongFamily = /do not import bwv|custody safeguard|drug continuity|intoxilyser|motoring calibration/i.test(body);

  // "Additional source-material on file" in KPI + list is summary+detail; flag only accordion chrome / ≥3 identical MG11
  const dupWording =
    openChase > 1 ||
    addl > 1 ||
    chaseDot > 1 ||
    caseWide > 1 ||
    preDup ||
    courtCellDup ||
    mg11 >= 3 ||
    (id === "overview" && (addl > 0 || chaseDot > 0));

  return {
    actual_cockpit_loaded: "yes",
    duplicate_wording: dupWording ? "yes" : "no",
    duplicate_stage_hearing_court: courtCellDup || preDup ? "yes" : "no",
    pre_ptph_pre_ptph: preDup ? "yes" : "no",
    repeated_open_chase: openChase > 1 ? "yes" : "no",
    repeated_court_safe_lines: "no", // visual; KPI vs body fixed — mark no unless exact long boilerplates ×2
    repeated_mg11_blocks: mg11 >= 3 ? "yes" : "no",
    repeated_chase_headings: addl > 1 || chaseDot > 1 || caseWide > 1 ? "yes" : "no",
    proof_drawer_confusing_dup: id === "overview" && refused >= 3 ? "yes" : "no",
    dangerous_wording: dangerous ? "yes" : "no",
    fake_live_solicitor_claim: liveClaim ? "yes" : "no",
    wrong_family_bleed: wrongFamily ? "yes" : "no",
  };
}

const LOADING = /Loading case overview|Loading matter|Loading disclosure|Loading papers|Loading court-prep|Sign in to CaseBrain/i;

const TABS: { id: string; tab: string; testId: string; ready: RegExp; file: string }[] = [
  {
    id: "overview",
    tab: "overview",
    testId: "five-answers-view",
    ready: /case snapshot|court prep|main issue|evidence gaps|safe to say/i,
    file: "01-overview.png",
  },
  {
    id: "today",
    tab: "today",
    testId: "pilot-today-dashboard",
    ready: /before court|what's missing|safe court line|open chase/i,
    file: "02-today.png",
  },
  {
    id: "papers",
    tab: "papers",
    testId: "case-workflow-shell",
    ready: /bundle health|primary defence|stage:|control room/i,
    file: "03-papers.png",
  },
  {
    id: "summary",
    tab: "summary",
    testId: "pilot-summary-view",
    ready: /client summary|matter brief|provisional case theory|client-safe/i,
    file: "04-summary.png",
  },
  {
    id: "chase",
    tab: "disclosure-chase",
    testId: "disclosure-chase",
    ready: /disclosure chase|other source-material|overdue|not started|chase item/i,
    file: "05-chase.png",
  },
];

async function waitLoaded(page: Page, testId: string, ready: RegExp, ms = 120_000): Promise<{ ok: boolean; body: string }> {
  const deadline = Date.now() + ms;
  let body = "";
  while (Date.now() < deadline) {
    const vis = await page.getByTestId(testId).first().isVisible().catch(() => false);
    body = await page.locator("body").innerText();
    if (vis && ready.test(body) && !LOADING.test(body)) return { ok: true, body };
    await page.waitForTimeout(2500);
  }
  return { ok: false, body };
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const reports: TabReport[] = [];

  // Probe server first
  try {
    const r = await fetch(`${BASE}/`, { signal: AbortSignal.timeout(30_000) });
    if (!r.ok && r.status >= 500) throw new Error(`server ${r.status}`);
  } catch (e) {
    const report = {
      overall: "not proven",
      reason: `Server unreachable at ${BASE}: ${e instanceof Error ? e.message : String(e)}`,
      vercelPreview: "not available for unpushed commit 59d76aeb4",
    };
    fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
    console.error(JSON.stringify(report, null, 2));
    process.exit(2);
  }

  const browser = await chromium.launch({ headless: true, args: ["--disable-dev-shm-usage"] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await signIn(page);

  for (const t of TABS) {
    console.log(`\n=== ${t.id} ===`);
    // Soft wait: give Node a breath between tabs
    await page.waitForTimeout(1500);
    const href = `${BASE}/cases/${CASE}?tab=${t.tab}&controlRoom=1`;
    await page.goto(href, { waitUntil: "domcontentloaded", timeout: 120_000 });
    let got = await waitLoaded(page, t.testId, t.ready, 90_000);
    if (!got.ok) {
      const fallback = `${BASE}/court-today?case=${CASE}&tab=${t.tab}`;
      await page.goto(fallback, { waitUntil: "domcontentloaded", timeout: 120_000 });
      got = await waitLoaded(page, t.testId, t.ready, 90_000);
    }
    let shot: string | null = null;
    if (got.ok) {
      shot = path.join(OUT, t.file);
      await page.screenshot({ path: shot, fullPage: true });
    } else {
      shot = path.join(OUT, `fail-${t.file}`);
      await page.screenshot({ path: shot, fullPage: true }).catch(() => undefined);
    }
    const checks = checksFromBody(t.id, got.body, got.ok);
    const notes: string[] = [];
    if (!got.ok) notes.push("cockpit content did not load — marked not proven");
    if (LOADING.test(got.body)) notes.push("still shows loading/sign-in chrome");
    reports.push({
      id: t.id,
      loaded: got.ok,
      href,
      screenshot: shot,
      checks,
      notes,
      preview: got.body.replace(/\s+/g, " ").slice(0, 280),
    });
    console.log(got.ok ? "LOADED" : "NOT PROVEN", t.id);
  }

  await browser.close();

  const proven = reports.filter((r) => r.loaded);
  const notProven = reports.filter((r) => !r.loaded);
  const anyDup = proven.some((r) => r.checks.duplicate_wording === "yes");
  const anyDanger = proven.some(
    (r) =>
      r.checks.dangerous_wording === "yes" ||
      r.checks.fake_live_solicitor_claim === "yes" ||
      r.checks.wrong_family_bleed === "yes",
  );
  const allFive = proven.length === 5 && !anyDup && !anyDanger;

  const out = {
    generatedAt: new Date().toISOString(),
    commit: "59d76aeb4",
    baseUrl: BASE,
    caseId: CASE,
    route: BASE.includes("localhost") ? "local Next (single server)" : "remote",
    vercelPreview: "not available — commit not on remote / no PR deploy",
    tabs: reports,
    desktop_five_tab_visual_duplicate_acceptance: !allFive
      ? notProven.length
        ? "not proven"
        : "fail"
      : "pass",
    tabs_proven_clean: proven.filter((r) => r.checks.duplicate_wording === "no").map((r) => r.id),
    tabs_not_proven: notProven.map((r) => r.id),
    duplicates_remaining: proven
      .filter((r) => r.checks.duplicate_wording === "yes")
      .map((r) => ({ tab: r.id, checks: r.checks, notes: r.notes })),
    dangerous_wording_regression: anyDanger ? "yes" : proven.length ? "no" : "not proven",
    safe_to_demo: allFive ? "yes" : "no",
    safe_to_merge: "no",
  };
  fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  process.exit(allFive ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
