#!/usr/bin/env npx tsx
/**
 * Warm five-tab pilot cockpit walkthrough after solicitor dedupe commit.
 * Requires local Next with NEXT_PUBLIC_CRIMINAL_PILOT_MODE and warmed routes.
 *
 *   npx tsx scripts/solicitor-warmup-five-tab-walkthrough.ts
 */
import fs from "node:fs";
import path from "node:path";
import { chromium, type BrowserContext, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "artifacts", "casebrain-qa", "solicitor-warmup-five-tab");
const BASE_URL = (process.env.H5_SMOKE_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const PASSWORD = process.env.SMOKE_PASSWORD ?? "ProdSmokeOnly!Jun2026";
const HEADLESS = process.env.CB_FRESH_HEADLESS !== "0";
const CASE_ID = process.env.H5_SMOKE_CASE_ID?.trim() || "4e22fb0f-8631-4cda-9aef-fea6a24f6163";
const EMAIL =
  process.env.H5_SMOKE_EMAIL?.trim() ||
  "demo.loom.taylor.1782877263@casebrain.qa.smoke";

type Step = { id: string; status: "pass" | "fail" | "warn"; detail?: string };
type TabNote = {
  id: string;
  rendered: boolean;
  bodyPreview: string;
  duplicates: string[];
  overcrowding: string[];
  dangerous: boolean;
  wrongFamily: boolean;
  screenshot: string;
};

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

function projectRef(supabaseUrl: string): string {
  return new URL(supabaseUrl).hostname.split(".")[0] ?? "project";
}

function authCookieForSession(
  supabaseUrl: string,
  session: {
    access_token: string;
    refresh_token: string;
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
  if (!url || !anonKey) throw new Error("Missing supabase env");
  const anon = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const signIn = await anon.auth.signInWithPassword({ email, password: PASSWORD });
  if (signIn.error || !signIn.data.session) {
    throw signIn.error ?? new Error(`signIn failed for ${email}`);
  }
  const cookie = authCookieForSession(url, signIn.data.session);
  await context.addCookies([
    {
      name: cookie.name,
      value: cookie.value,
      domain: new URL(BASE_URL).hostname,
      path: "/",
      httpOnly: false,
      secure: BASE_URL.startsWith("https"),
      sameSite: "Lax",
    },
  ]);
}

function caseTabHref(caseId: string, tab: string): string {
  return `${BASE_URL}/cases/${caseId}?tab=${tab}&controlRoom=1`;
}

function courtTodayTabHref(caseId: string, tab: string): string {
  return `${BASE_URL}/court-today?case=${caseId}&tab=${tab}`;
}

const TAB_READY: Record<string, string[]> = {
  overview: ["five-answers-view", "case-workflow-shell", "overview-snapshot-boxes", "hearing-mode-panel"],
  today: ["pilot-today-dashboard", "case-workflow-shell", "hearing-war-room"],
  papers: ["case-workflow-shell", "case-control-room"],
  summary: ["pilot-summary-view", "case-workflow-shell"],
  chase: ["disclosure-chase", "case-workflow-shell"],
};

async function waitReady(page: Page, tabId: string, timeoutMs = 120_000): Promise<boolean> {
  const ids = TAB_READY[tabId] ?? ["case-workflow-shell"];
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    for (const id of ids) {
      const visible = await page.getByTestId(id).first().isVisible().catch(() => false);
      if (visible) {
        // Wait for loading copy to clear when possible
        await page.waitForTimeout(1500);
        const body = await page.locator("body").innerText();
        if (/loading (court-prep|disclosure chase|matter|papers|workspace)/i.test(body)) {
          await page.waitForTimeout(2500);
          continue;
        }
        return true;
      }
    }
    await page.waitForTimeout(1500);
  }
  return false;
}

async function openPilotTab(page: Page, caseId: string, tab: string, tabId: string): Promise<{ ok: boolean; href: string }> {
  const primary = caseTabHref(caseId, tab);
  await page.goto(primary, { waitUntil: "domcontentloaded", timeout: 180_000 });
  if (await waitReady(page, tabId, 90_000)) return { ok: true, href: primary };
  const fallback = courtTodayTabHref(caseId, tab);
  await page.goto(fallback, { waitUntil: "domcontentloaded", timeout: 180_000 });
  const ok = await waitReady(page, tabId, 90_000);
  return { ok, href: fallback };
}

function analyzeDuplicates(tabId: string, body: string): string[] {
  const dups: string[] = [];
  if (/pre\s+ptph\s+pre\s+ptph/i.test(body)) dups.push("stage doubled: pre ptph pre ptph");
  if (countMatches(body, /open chase\s*\(\d+\)\s*→/gi) > 1) dups.push("Open Chase CTA repeated");
  if (countMatches(body, /disclosure chase\s*·\s*\d+\s*on file/gi) > 1) dups.push("Disclosure chase · N on file repeated");
  if (countMatches(body, /additional source[- ]material issues?\s*\(/gi) > 1) {
    dups.push("Additional source-material issues repeated");
  }
  if (countMatches(body, /case-wide court line/gi) > 1) dups.push("Case-wide court line repeated");
  if (countMatches(body, /complainant\s+mg11\s*\/\s*source material/gi) >= 3) {
    dups.push("MG11/source-material block ≥3");
  }
  // Court cell doubles like "Foo Court Foo Court"
  if ([...body.matchAll(/\b([A-Z][a-zA-Z]+(?:\s+[A-Za-z]+){0,3}\s+Court)\s+\1\b/g)].length) {
    dups.push("doubled court cell");
  }
  if (tabId === "today") {
    // KPI safe line + body full reprint of same long line is what we fixed; look for exact long repeat
    const safeHits = countMatches(body, /provisional — review served papers before relying/gi);
    if (safeHits > 1) dups.push("safe court boilerplate repeated");
  }
  if (tabId === "overview") {
    // Accordion chrome should not appear on Overview
    if (/additional source[- ]material issues?\s*\(/i.test(body)) {
      dups.push("Overview shows Additional source-material accordion chrome");
    }
    if (/disclosure chase\s*·\s*\d+\s*on file/i.test(body)) {
      dups.push("Overview shows Disclosure chase · N on file");
    }
  }
  return dups;
}

function analyzeOvercrowding(tabId: string, body: string): string[] {
  const issues: string[] = [];
  if (tabId === "overview") {
    // Above-fold should not re-list proof packet refused + gaps in drawer language simultaneously as full dump
    const refused = countMatches(body, /refused to overstate/gi);
    if (refused >= 3) issues.push("Refused to overstate appears ≥3 times (possible drawer dump)");
  }
  return issues;
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
      "five-answers-view",
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
      if (r.left < -4 || r.right > vw + 4) return `${r.id} overflows (${Math.round(r.right)}>${vw})`;
    }
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i];
        const b = rects[j];
        if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
        const h = a.left < b.right - 8 && b.left < a.right - 8;
        const v = a.top < b.bottom - 8 && b.top < a.bottom - 8;
        if (h && v) {
          const px = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (px > 24) return `${a.id} overlaps ${b.id} by ${Math.round(px)}px`;
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
  const tabsOut: TabNote[] = [];

  const pilotOn = /^(1|true|yes|on)$/i.test((process.env.NEXT_PUBLIC_CRIMINAL_PILOT_MODE ?? "").trim());
  if (!pilotOn) {
    console.warn("WARN: NEXT_PUBLIC_CRIMINAL_PILOT_MODE is not enabled in env — pilot cockpit may not render.");
  }

  await ensurePassword(EMAIL);
  const browser = await chromium.launch({ headless: HEADLESS });
  const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const desktop = await desktopContext.newPage();
  const mobile = await mobileContext.newPage();

  const dangerousRe =
    /\bBWV\s+(?:shows|confirms|proves)\b|\bdrug\s+continuity\b|\bsafeguards\s+were\s+followed\b/i;
  const wrongFamilyRe =
    /do not import bwv|custody safeguard|drug continuity|drugs continuity|motoring calibration|intoxilyser/i;
  const liveClaimRe = /solicitor[- ]validated live|live solicitor validation|soc\s*2|iso\s*27001/i;

  try {
    await signInWithSession(desktopContext, EMAIL);
    await signInWithSession(mobileContext, EMAIL);
    steps.push({ id: "sign_in", status: "pass", detail: EMAIL });

    // Warm routes once
    console.log("[warm] overview…");
    await desktop.goto(caseTabHref(CASE_ID, "overview"), { waitUntil: "domcontentloaded", timeout: 180_000 });
    await waitReady(desktop, "overview", 120_000);

    const tabs: { id: string; tab: string; file: string }[] = [
      { id: "overview", tab: "overview", file: "01-overview.png" },
      { id: "today", tab: "today", file: "02-today.png" },
      { id: "papers", tab: "papers", file: "03-papers.png" },
      { id: "summary", tab: "summary", file: "04-summary.png" },
      { id: "chase", tab: "disclosure-chase", file: "05-chase.png" },
    ];

    for (const t of tabs) {
      console.log(`[tab] ${t.id}…`);
      const opened = await openPilotTab(desktop, CASE_ID, t.tab, t.id);
      const body = await desktop.locator("body").innerText();
      const rendered = opened.ok && !/loading (court-prep|disclosure chase|matter dashboard|papers|workspace)/i.test(body);
      const duplicates = analyzeDuplicates(t.id, body);
      const overcrowding = analyzeOvercrowding(t.id, body);
      const dangerous = dangerousRe.test(body);
      const wrongFamily = wrongFamilyRe.test(body);
      const liveClaim = liveClaimRe.test(body);

      steps.push({
        id: `${t.id}_rendered`,
        status: rendered ? "pass" : "fail",
        detail: rendered ? opened.href : `pilot content missing @ ${opened.href}; preview=${body.slice(0, 160)}`,
      });
      steps.push({
        id: `${t.id}_no_duplicates`,
        status: duplicates.length ? "fail" : "pass",
        detail: duplicates.join("; ") || undefined,
      });
      steps.push({
        id: `${t.id}_no_overcrowd`,
        status: overcrowding.length ? "warn" : "pass",
        detail: overcrowding.join("; ") || undefined,
      });
      steps.push({
        id: `${t.id}_no_dangerous`,
        status: dangerous || liveClaim ? "fail" : "pass",
        detail: dangerous ? "dangerous wording" : liveClaim ? "live validation claim" : undefined,
      });
      steps.push({
        id: `${t.id}_no_wrong_family`,
        status: wrongFamily ? "fail" : "pass",
        detail: wrongFamily ? "wrong-family bleed" : undefined,
      });

      const shot = path.join(OUT_DIR, t.file);
      await desktop.screenshot({ path: shot, fullPage: true });
      tabsOut.push({
        id: t.id,
        rendered,
        bodyPreview: body.replace(/\s+/g, " ").slice(0, 320),
        duplicates,
        overcrowding,
        dangerous: dangerous || liveClaim,
        wrongFamily,
        screenshot: shot,
      });
    }

    // Overview proof drawer — expand and check it does not re-dump gaps/refused thrice
    console.log("[overview] expand proof drawer…");
    await openPilotTab(desktop, CASE_ID, "overview", "overview");
    const toggle = desktop.getByTestId("overview-proof-depth-toggle");
    if (await toggle.isVisible().catch(() => false)) {
      await toggle.click();
      await desktop.waitForTimeout(1000);
      const after = await desktop.locator("body").innerText();
      const refused = countMatches(after, /refused to overstate/gi);
      const stillNeeds = countMatches(after, /still needs review/gi);
      steps.push({
        id: "overview_drawer_not_dump",
        status: refused <= 2 && stillNeeds <= 1 ? "pass" : "warn",
        detail: `refused×${refused}, stillNeeds×${stillNeeds}`,
      });
      await desktop.screenshot({ path: path.join(OUT_DIR, "01b-overview-drawer.png"), fullPage: true });
    } else {
      steps.push({ id: "overview_drawer_not_dump", status: "warn", detail: "drawer toggle not found" });
    }

    console.log("[mobile] overview…");
    await mobile.goto(caseTabHref(CASE_ID, "overview"), { waitUntil: "domcontentloaded", timeout: 180_000 });
    let mobileOk = await waitReady(mobile, "overview", 90_000);
    if (!mobileOk) {
      await mobile.goto(courtTodayTabHref(CASE_ID, "overview"), { waitUntil: "domcontentloaded", timeout: 180_000 });
      mobileOk = await waitReady(mobile, "overview", 90_000);
    }
    const mobBody = await mobile.locator("body").innerText();
    const overlap = await mobileOverlap(mobile);
    steps.push({
      id: "mobile_overview_rendered",
      status: mobileOk ? "pass" : "fail",
      detail: mobileOk ? undefined : mobBody.slice(0, 200),
    });
    steps.push({
      id: "mobile_no_overlap",
      status: overlap ? "fail" : "pass",
      detail: overlap ?? undefined,
    });
    steps.push({
      id: "mobile_no_dangerous",
      status: dangerousRe.test(mobBody) ? "fail" : "pass",
    });
    await mobile.screenshot({ path: path.join(OUT_DIR, "06-overview-mobile.png"), fullPage: true });
  } finally {
    await browser.close();
  }

  const fails = steps.filter((s) => s.status === "fail");
  const warns = steps.filter((s) => s.status === "warn");
  const anyDup = tabsOut.some((t) => t.duplicates.length > 0);
  const anyOvercrowd = tabsOut.some((t) => t.overcrowding.length > 0);
  const allRendered = tabsOut.every((t) => t.rendered);
  const report = {
    generatedAt: new Date().toISOString(),
    commitHint: "59d76aeb4",
    baseUrl: BASE_URL,
    email: EMAIL,
    caseId: CASE_ID,
    pilotModeEnv: process.env.NEXT_PUBLIC_CRIMINAL_PILOT_MODE ?? null,
    tabs: tabsOut,
    steps,
    pass: steps.filter((s) => s.status === "pass").length,
    warn: warns.length,
    fail: fails.length,
    duplicatesFound: anyDup,
    overcrowdingFound: anyOvercrowd,
    allPilotTabsRendered: allRendered,
    safeToDemo: fails.length === 0 && allRendered && !anyDup,
    safeToMerge: false,
    overall: fails.length === 0 ? (warns.length ? "PASS_WITH_WARNINGS" : "PASS") : "FAIL",
  };
  fs.writeFileSync(path.join(OUT_DIR, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ overall: report.overall, duplicatesFound: anyDup, overcrowdingFound: anyOvercrowd, safeToDemo: report.safeToDemo, fail: fails.length }, null, 2));
  for (const f of fails) console.log(`FAIL ${f.id}: ${f.detail ?? ""}`);
  process.exit(fails.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
