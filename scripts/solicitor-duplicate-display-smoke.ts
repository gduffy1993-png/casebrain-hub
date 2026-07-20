#!/usr/bin/env npx tsx
/**
 * Solicitor duplicate-display smoke — five pilot tabs + mobile overlap.
 * Run after local `next` is serving THIS branch's presentation code.
 *
 *   npx tsx scripts/solicitor-duplicate-display-smoke.ts
 *
 * Env:
 *   H5_SMOKE_BASE_URL (default http://localhost:3000)
 *   H5_SMOKE_CASE_ID
 *   H5_SMOKE_EMAIL / SMOKE_PASSWORD
 *   CB_FRESH_HEADLESS=0 for headed
 */
import fs from "node:fs";
import path from "node:path";
import { chromium, type BrowserContext, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "artifacts", "casebrain-qa", "solicitor-duplicate-display-smoke");
const BASE_URL = (process.env.H5_SMOKE_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const PASSWORD = process.env.SMOKE_PASSWORD ?? "ProdSmokeOnly!Jun2026";
const HEADLESS = process.env.CB_FRESH_HEADLESS !== "0";
const CASE_ID = process.env.H5_SMOKE_CASE_ID?.trim() || "4e22fb0f-8631-4cda-9aef-fea6a24f6163";
const EMAIL =
  process.env.H5_SMOKE_EMAIL?.trim() ||
  "demo.loom.taylor.1782877263@casebrain.qa.smoke";

type Step = { id: string; status: "pass" | "fail" | "warn"; detail?: string };

function loadLocalEnv(): void {
  for (const name of [".env.local", ".env"]) {
    const envPath = path.join(ROOT, name);
    if (!fs.existsSync(envPath)) continue;
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
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

function countMatches(body: string, re: RegExp): number {
  const flags = re.flags.includes("g") ? re.flags : `${re.flags}g`;
  return [...body.matchAll(new RegExp(re.source, flags))].length;
}

function findRepeatedLines(body: string, needles: RegExp[]): string[] {
  const hits: string[] = [];
  for (const re of needles) {
    const n = countMatches(body, re);
    if (n >= 2) hits.push(`${re.source} ×${n}`);
  }
  return hits;
}

function caseTabHref(caseId: string, tab: string): string {
  return `${BASE_URL}/cases/${caseId}?tab=${tab}`;
}

function courtTodayTabHref(caseId: string, tab: string): string {
  return `${BASE_URL}/court-today?case=${caseId}&tab=${tab}`;
}

function projectRef(supabaseUrl: string): string {
  return new URL(supabaseUrl).hostname.split(".")[0] ?? "project";
}

function authCookieForSession(
  supabaseUrl: string,
  session: {
    access_token: string;
    refresh_token: string;
    expires_in?: number;
    expires_at?: number;
    token_type?: string;
    user?: unknown;
  },
): { name: string; value: string } {
  const ref = projectRef(supabaseUrl);
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return { name: `sb-${ref}-auth-token`, value: `base64-${payload}` };
}

async function ensurePassword(email: string): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  for (let page = 1; page <= 10; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) {
      await admin.auth.admin.updateUserById(hit.id, { password: PASSWORD, email_confirm: true });
      return;
    }
    if (data.users.length < 200) break;
  }
}

async function signInWithSession(context: BrowserContext, email: string): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const anon = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const signIn = await anon.auth.signInWithPassword({ email, password: PASSWORD });
  if (signIn.error || !signIn.data.session) {
    throw signIn.error ?? new Error(`signInWithPassword failed for ${email}`);
  }
  const cookie = authCookieForSession(url, signIn.data.session);
  const host = new URL(BASE_URL).hostname;
  await context.addCookies([
    {
      name: cookie.name,
      value: cookie.value,
      domain: host,
      path: "/",
      httpOnly: false,
      secure: BASE_URL.startsWith("https"),
      sameSite: "Lax",
    },
  ]);
}

async function openTab(page: Page, caseId: string, tab: string, must: RegExp): Promise<string> {
  await page.goto(caseTabHref(caseId, tab), { waitUntil: "domcontentloaded", timeout: 180_000 });
  // Local first compile of case routes can exceed 60s; wait for pilot chrome.
  await page
    .locator(
      '[data-testid="case-workflow-shell"], [data-testid="five-answers-view"], [data-testid="pilot-today-dashboard"], [data-testid="disclosure-chase"], [data-testid="pilot-summary-view"], [data-testid="case-control-room"]',
    )
    .first()
    .waitFor({ state: "visible", timeout: 120_000 })
    .catch(() => undefined);
  await page.waitForTimeout(4000);
  let body = await page.locator("body").innerText();
  if (!must.test(body)) {
    await page.goto(courtTodayTabHref(caseId, tab), { waitUntil: "domcontentloaded", timeout: 180_000 });
    await page
      .locator(
        '[data-testid="case-workflow-shell"], [data-testid="pilot-matter-desk"], [data-testid="five-answers-view"], [data-testid="pilot-today-dashboard"]',
      )
      .first()
      .waitFor({ state: "visible", timeout: 120_000 })
      .catch(() => undefined);
    await page.waitForTimeout(4000);
    body = await page.locator("body").innerText();
  }
  return body;
}

async function mobileOverlap(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const vw = window.innerWidth;
    const panelIds = [
      "case-workflow-header-strip",
      "case-snapshot-panel",
      "overview-snapshot-boxes",
      "hearing-mode-panel",
      "five-answers-evidence-gaps",
      "pilot-today-dashboard",
      "disclosure-chase",
      "pilot-summary-view",
    ];
    const rects = panelIds
      .map((id) => {
        const el = document.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
        if (!el) return null;
        const r = el.getBoundingClientRect();
        if (r.height < 4 || r.width < 4) return null;
        return { id, el, top: r.top, bottom: r.bottom, left: r.left, right: r.right };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    for (const r of rects) {
      if (r.left < -4 || r.right > vw + 4) return `${r.id} overflows viewport (${Math.round(r.right)}px > ${vw}px)`;
    }
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i];
        const b = rects[j];
        if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
        const hOverlap = a.left < b.right - 8 && b.left < a.right - 8;
        const vOverlap = a.top < b.bottom - 8 && b.top < a.bottom - 8;
        if (hOverlap && vOverlap) {
          const overlapPx = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (overlapPx > 24) return `${a.id} overlaps ${b.id} by ${Math.round(overlapPx)}px`;
        }
      }
    }
    return null;
  });
}

async function main(): Promise<void> {
  loadLocalEnv();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const steps: Step[] = [];

  try {
    const ping = await fetch(`${BASE_URL}/`, { signal: AbortSignal.timeout(90_000) });
    if (!ping.ok && ping.status >= 500) throw new Error(`BASE_URL ${BASE_URL} returned ${ping.status}`);
  } catch (e) {
    const report = {
      generatedAt: new Date().toISOString(),
      overall: "SKIPPED",
      reason: `Live visual smoke not possible — ${BASE_URL} unreachable (${e instanceof Error ? e.message : String(e)}). Presentation unit tests only.`,
      baseUrl: BASE_URL,
      caseId: CASE_ID,
    };
    fs.writeFileSync(path.join(OUT_DIR, "report.json"), JSON.stringify(report, null, 2));
    console.error(report.reason);
    process.exit(2);
  }

  await ensurePassword(EMAIL);

  const browser = await chromium.launch({ headless: HEADLESS });
  const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const desktop = await desktopContext.newPage();
  const mobile = await mobileContext.newPage();

  try {
    await signInWithSession(desktopContext, EMAIL);
    await signInWithSession(mobileContext, EMAIL);
    steps.push({ id: "sign_in", status: "pass", detail: EMAIL });

    const tabs: { id: string; tab: string; must: RegExp; file: string; checks: RegExp[] }[] = [
      {
        id: "overview",
        tab: "overview",
        must: /main issue|court prep|case snapshot|evidence|provisional/i,
        file: "01-overview.png",
        checks: [
          /additional source[- ]material issues?\s*\(/gi,
          /disclosure chase\s*·\s*\d+\s*on file/gi,
          /case-wide court line/gi,
        ],
      },
      {
        id: "today",
        tab: "today",
        must: /before court|safe court|chase|provisional|open chase/i,
        file: "02-today.png",
        checks: [/open chase\s*\(\d+\)\s*→/gi],
      },
      {
        id: "papers",
        tab: "papers",
        must: /papers|control room|bundle|disclosure|readiness|stage/i,
        file: "03-papers.png",
        checks: [/stage:\s*pre ptph pre ptph/gi],
      },
      {
        id: "summary",
        tab: "summary",
        must: /client|summary|provisional|theory|risk/i,
        file: "04-summary.png",
        checks: [/additional source[- ]material issues?\s*\(/gi],
      },
      {
        id: "chase",
        tab: "disclosure-chase",
        must: /chase|disclosure|outstanding|source/i,
        file: "05-chase.png",
        checks: [/disclosure chase\s*·\s*\d+\s*on file/gi],
      },
    ];

    const dangerous = /\bBWV\s+(?:shows|confirms|proves)\b|\bdrug\s+continuity\b|\bsafeguards\s+were\s+followed\b/i;

    for (const t of tabs) {
      console.log(`[tab] ${t.id}…`);
      const body = await openTab(desktop, CASE_ID, t.tab, t.must);
      if (!t.must.test(body)) {
        steps.push({ id: `${t.id}_accessible`, status: "fail", detail: "Expected tab content missing" });
      } else {
        steps.push({ id: `${t.id}_accessible`, status: "pass" });
      }

      const dups = findRepeatedLines(body, t.checks);
      if (/pre\s+ptph\s+pre\s+ptph/i.test(body)) {
        dups.push("doubled stage token (pre ptph pre ptph)");
      }
      const courtCellDoubles = [...body.matchAll(/\b([A-Z][a-z]+(?:\s+[A-Z]?[a-z]+){0,3}\s+Court)\s+\1\b/g)];
      if (courtCellDoubles.length) dups.push(`doubled court cell ×${courtCellDoubles.length}`);

      if (t.id === "today") {
        const openChase = countMatches(body, /open chase\s*\(\d+\)\s*→/gi);
        if (openChase > 1) dups.push(`Open Chase CTA ×${openChase}`);
        steps.push({
          id: "today_open_chase_once",
          status: openChase <= 1 ? "pass" : "fail",
          detail: `Open Chase count=${openChase}`,
        });
      }

      if (t.id === "papers") {
        const stageDup = /pre\s+ptph\s+pre\s+ptph/i.test(body);
        steps.push({
          id: "papers_no_doubled_stage",
          status: stageDup ? "fail" : "pass",
          detail: stageDup ? "Stage: pre ptph pre ptph still visible" : undefined,
        });
      }

      if (t.id === "overview" || t.id === "summary" || t.id === "chase") {
        const mg11Blocks = countMatches(body, /complainant\s+mg11\s*\/\s*source material/gi);
        if (mg11Blocks >= 3) dups.push(`MG11/source-material block ×${mg11Blocks}`);
      }

      steps.push({
        id: `${t.id}_no_duplicate_chrome`,
        status: dups.length ? "fail" : "pass",
        detail: dups.length ? dups.join("; ") : undefined,
      });

      if (dangerous.test(body)) {
        steps.push({ id: `${t.id}_no_dangerous_wording`, status: "fail", detail: "Dangerous pattern" });
      } else {
        steps.push({ id: `${t.id}_no_dangerous_wording`, status: "pass" });
      }

      await desktop.screenshot({ path: path.join(OUT_DIR, t.file), fullPage: true });
    }

    console.log("[mobile] overview…");
    await mobile.goto(caseTabHref(CASE_ID, "overview"), { waitUntil: "domcontentloaded", timeout: 120_000 });
    await mobile.waitForTimeout(3000);
    let mobBody = await mobile.locator("body").innerText();
    if (!/case snapshot|court prep|main issue|evidence/i.test(mobBody)) {
      await mobile.goto(courtTodayTabHref(CASE_ID, "overview"), { waitUntil: "domcontentloaded", timeout: 120_000 });
      await mobile.waitForTimeout(3000);
      mobBody = await mobile.locator("body").innerText();
    }
    const overlap = await mobileOverlap(mobile);
    steps.push({
      id: "overview_mobile_no_overlap",
      status: overlap ? "fail" : "pass",
      detail: overlap ?? undefined,
    });
    if (dangerous.test(mobBody)) {
      steps.push({ id: "mobile_no_dangerous_wording", status: "fail" });
    } else {
      steps.push({ id: "mobile_no_dangerous_wording", status: "pass" });
    }
    await mobile.screenshot({ path: path.join(OUT_DIR, "06-overview-mobile.png"), fullPage: true });
  } finally {
    await browser.close();
  }

  const fails = steps.filter((s) => s.status === "fail");
  const warns = steps.filter((s) => s.status === "warn");
  const report = {
    generatedAt: new Date().toISOString(),
    level: "Solicitor duplicate-display smoke (5 tabs)",
    baseUrl: BASE_URL,
    email: EMAIL,
    caseId: CASE_ID,
    note:
      BASE_URL.includes("localhost") || BASE_URL.includes("127.0.0.1")
        ? "Local base URL — validates uncommitted presentation branch"
        : "Remote base URL — does NOT validate uncommitted local presentation fixes",
    pass: steps.filter((s) => s.status === "pass").length,
    warn: warns.length,
    fail: fails.length,
    steps,
    overall: fails.length === 0 ? (warns.length ? "PASS_WITH_WARNINGS" : "PASS") : "FAIL",
  };
  fs.writeFileSync(path.join(OUT_DIR, "report.json"), JSON.stringify(report, null, 2));
  console.log(`Overall: ${report.overall}`);
  console.log(`Steps: ${report.pass} pass / ${warns.length} warn / ${fails.length} fail`);
  for (const f of fails) console.log(`  FAIL ${f.id}: ${f.detail ?? ""}`);
  console.log("Report:", path.join(OUT_DIR, "report.json"));
  process.exit(fails.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
