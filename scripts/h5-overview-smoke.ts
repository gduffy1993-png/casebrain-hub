#!/usr/bin/env npx tsx
/**
 * H5 Overview smoke — fresh account, Taylor upload, Overview default + tab walkthrough.
 * Run: npx tsx scripts/h5-overview-smoke.ts
 * Env: H5_SMOKE_BASE_URL (default http://localhost:3000), CB_FRESH_HEADLESS=0 for headed
 *      H5_SMOKE_CASE_ID — skip upload, use existing case
 *      H5_SMOKE_SKIP_UPLOAD=1 — same as providing H5_SMOKE_CASE_ID
 */
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer";
import { chromium, type BrowserContext, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "docs", "cb-fresh-adversarial", "sources");
const PDF_DIR = path.join(ROOT, "docs", "cb-fresh-adversarial", "pdfs");
const OUT_DIR = path.join(ROOT, "artifacts", "casebrain-qa", "h5-overview-smoke");
const BASE_URL = (process.env.H5_SMOKE_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const PASSWORD = process.env.SMOKE_PASSWORD ?? "ProdSmokeOnly!Jun2026";
const HEADLESS = process.env.CB_FRESH_HEADLESS !== "0";
const SKIP_UPLOAD = process.env.H5_SMOKE_SKIP_UPLOAD === "1" || Boolean(process.env.H5_SMOKE_CASE_ID?.trim());
const PRESET_CASE_ID = process.env.H5_SMOKE_CASE_ID?.trim() || null;
const UPLOAD_API_TIMEOUT_MS = Number(process.env.H5_SMOKE_UPLOAD_TIMEOUT_MS ?? "120000");
const SHELL_TIMEOUT_MS = Number(process.env.H5_SMOKE_SHELL_TIMEOUT_MS ?? "45000");
const OVERVIEW_ATTEMPTS = Number(process.env.H5_SMOKE_OVERVIEW_ATTEMPTS ?? "12");

const TAYLOR = {
  sourceFile: "CB-FRESH-001_Taylor_Brookes.txt",
  pdfFile: "CB-FRESH-001_Taylor_Brookes.pdf",
  caseTitle: "CB-FRESH-001 Taylor Brookes",
};

type StepResult = { id: string; status: "pass" | "fail" | "warn"; detail?: string };

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

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function ensurePdf(): Promise<void> {
  fs.mkdirSync(PDF_DIR, { recursive: true });
  const pdfPath = path.join(PDF_DIR, TAYLOR.pdfFile);
  if (fs.existsSync(pdfPath)) return;
  const srcPath = path.join(SRC_DIR, TAYLOR.sourceFile);
  if (!fs.existsSync(srcPath)) throw new Error(`Missing source: ${srcPath}`);
  const text = fs.readFileSync(srcPath, "utf8");
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8" /><style>body{font-family:'Times New Roman',serif;font-size:11pt;line-height:1.4;margin:0}pre{white-space:pre-wrap;font-family:inherit;margin:0}</style></head><body><pre>${escapeHtml(text)}</pre></body></html>`;
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
      margin: { top: "16mm", bottom: "16mm", left: "16mm", right: "16mm" },
    });
  } finally {
    await browser.close();
  }
}

async function findUserByEmail(admin: ReturnType<typeof createClient<any>>, email: string) {
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
    if (hit) return hit;
    if (data.users.length < 200) break;
  }
  return null;
}

async function ensureUser(email: string): Promise<string> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const freshSmokeAccount = /@casebrain\.qa\.smoke$/i.test(email) && !process.env.H5_SMOKE_EMAIL;
  const existing = freshSmokeAccount ? null : await findUserByEmail(admin, email);
  let userId: string;
  if (existing) {
    userId = existing.id;
    await admin.auth.admin.updateUserById(userId, { password: PASSWORD, email_confirm: true });
  } else {
    const created = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
    if (created.error || !created.data.user) throw created.error ?? new Error("createUser failed");
    userId = created.data.user.id;
  }
  const externalRef = `solo-user_${userId}`;
  let orgId: string | null = null;
  const { data: orgByRef } = await admin.from("organisations").select("id").eq("external_ref", externalRef).maybeSingle();
  if (orgByRef?.id) orgId = orgByRef.id as string;
  if (!orgId) {
    const { data: membership } = await admin
      .from("organisation_members")
      .select("organisation_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    if (membership?.organisation_id) orgId = membership.organisation_id as string;
  }
  if (!orgId) {
    const ins = await admin
      .from("organisations")
      .insert({ name: "H5 Overview QA", email_domain: null, external_ref: externalRef, plan: "pro" })
      .select("id")
      .single();
    if (ins.error || !ins.data?.id) throw ins.error ?? new Error("org insert failed");
    orgId = ins.data.id as string;
    await admin.from("organisation_members").insert({ organisation_id: orgId, user_id: userId, role: "owner" });
  }
  return userId;
}

function projectRef(supabaseUrl: string): string {
  return new URL(supabaseUrl).hostname.split(".")[0] ?? "project";
}

function authCookieForSession(
  supabaseUrl: string,
  session: { access_token: string; refresh_token: string; expires_in?: number; expires_at?: number; token_type?: string; user?: unknown },
): { name: string; value: string } {
  const ref = projectRef(supabaseUrl);
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return { name: `sb-${ref}-auth-token`, value: `base64-${payload}` };
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

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: path.join(OUT_DIR, name), fullPage: true }).catch(() => undefined);
}

async function uploadTaylor(page: Page): Promise<string> {
  const pdfPath = path.join(PDF_DIR, TAYLOR.pdfFile);
  console.log("  → opening upload page…");
  await page.goto(`${BASE_URL}/upload`, { waitUntil: "domcontentloaded" });
  await page.getByText(/drop documents|new upload/i).first().waitFor({ timeout: 30_000 });
  await page.locator("select").first().selectOption("criminal");
  await page.locator('input[type="file"]').setInputFiles(pdfPath);
  await page.getByPlaceholder(/R v Smith/i).fill(TAYLOR.caseTitle);
  console.log(`  → posting bundle to /api/upload (timeout ${UPLOAD_API_TIMEOUT_MS}ms)…`);
  const uploadResponse = page.waitForResponse(
    (r) => r.url().includes("/api/upload") && r.status() === 201,
    { timeout: UPLOAD_API_TIMEOUT_MS },
  );
  await page.getByRole("button", { name: /upload and extract/i }).click();
  const uploadRes = await uploadResponse;
  const uploadJson = (await uploadRes.json()) as { caseId?: string; case_id?: string; id?: string };
  let caseId = uploadJson.caseId ?? uploadJson.case_id ?? uploadJson.id ?? null;
  if (!caseId) {
    await page.waitForURL(/\/cases\/[0-9a-f-]{36}/i, { timeout: 30_000 }).catch(() => undefined);
    const m = page.url().match(/\/cases\/([0-9a-f-]{36})/i);
    caseId = m?.[1] ?? null;
  }
  if (!caseId) {
    await shot(page, "fail-upload-no-caseid.png");
    throw new Error("Upload failed — no caseId");
  }
  console.log(`  → upload ok (caseId=${caseId}), waiting for redirect…`);
  const redirectDeadline = Date.now() + 45_000;
  while (Date.now() < redirectDeadline) {
    const url = page.url();
    if (/\/cases\/[0-9a-f-]{36}/i.test(url) || /court-today\?.*case=/i.test(url)) break;
    await page.waitForTimeout(500);
  }
  const landingUrl = page.url();
  console.log(`  → landed ${landingUrl}`);
  if (!/\/cases\/[0-9a-f-]{36}.*tab=overview/i.test(landingUrl)) {
    await shot(page, "warn-upload-landing-not-overview.png");
    console.log("  ⚠ expected /cases/{id}?tab=overview&controlRoom=1");
  }
  return caseId;
}

async function waitShell(page: Page, label: string): Promise<void> {
  console.log(`  → waitShell: ${label}`);
  await page.waitForLoadState("domcontentloaded").catch(() => undefined);
  const ok = await page
    .locator(
      '[data-testid="pilot-matter-desk"], [data-testid="case-workflow-shell"], [data-testid="court-today-pilot-split"]',
    )
    .first()
    .waitFor({ timeout: SHELL_TIMEOUT_MS })
    .then(() => true)
    .catch(() => false);
  if (!ok) {
    await shot(page, `fail-shell-${label.replace(/\s+/g, "-")}.png`);
    console.log(`  ⚠ shell not visible after ${SHELL_TIMEOUT_MS}ms (${label})`);
  }
  await page.waitForTimeout(500);
}

const OVERVIEW_TEXT =
  /what is this case saying|evidence truth rules|source-backed court note|defence decision board|case overview will appear|loading case overview/i;

async function waitForOverview(page: Page, label: string): Promise<boolean> {
  console.log(`  → waitForOverview: ${label}`);
  for (let attempt = 0; attempt < OVERVIEW_ATTEMPTS; attempt++) {
    try {
      await page.getByTestId("five-answers-view").waitFor({ timeout: 2_000 });
      return true;
    } catch {
      try {
        await page.getByTestId("five-answers-case-saying").waitFor({ timeout: 1_500 });
        return true;
      } catch {
        const body = await page.locator("body").innerText();
        if (OVERVIEW_TEXT.test(body)) return true;
        await page.waitForTimeout(1_000);
      }
    }
  }
  await shot(page, `fail-overview-${label.replace(/\s+/g, "-")}.png`);
  return false;
}

function caseOverviewHref(caseId: string): string {
  return `${BASE_URL}/cases/${caseId}?tab=overview&controlRoom=1`;
}

function caseTabHref(caseId: string, tab: string): string {
  return `${BASE_URL}/cases/${caseId}?tab=${tab}&controlRoom=1`;
}

function courtTodayTabHref(caseId: string, tab: string): string {
  return `${BASE_URL}/court-today?case=${caseId}&tab=${tab}`;
}

async function main(): Promise<void> {
  loadLocalEnv();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  await ensurePdf();

  const email = process.env.H5_SMOKE_EMAIL ?? `h5overview.${Date.now()}@casebrain.qa.smoke`;
  const steps: StepResult[] = [];
  let caseId: string | null = null;

  console.log(`H5 Overview smoke → ${BASE_URL}`);
  console.log(`Account: ${email}`);

  console.log("Provisioning account…");
  const userId = await ensureUser(email);
  console.log("Launching browser…");
  const browser = await chromium.launch({ headless: HEADLESS });
  const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const desktop = await desktopContext.newPage();
  const mobile = await mobileContext.newPage();

  async function checkOverviewPass(page: Page, stepId: string): Promise<boolean> {
    if (!caseId) return false;
    console.log(`[${stepId}] navigate → cases overview`);
    await page.goto(caseOverviewHref(caseId), { waitUntil: "domcontentloaded" });
    await waitShell(page, stepId);
    let overviewOk = await waitForOverview(page, stepId);
    if (!overviewOk) {
      console.log(`[${stepId}] fallback → court-today overview`);
      await page.goto(courtTodayTabHref(caseId, "overview"), { waitUntil: "domcontentloaded" });
      await waitShell(page, `${stepId}-court-today`);
      overviewOk = await waitForOverview(page, `${stepId}-court-today`);
    }
    if (overviewOk) {
      steps.push({ id: stepId, status: "pass" });
      return true;
    }
    const body = await page.locator("body").innerText();
    if (OVERVIEW_TEXT.test(body)) {
      steps.push({ id: stepId, status: "pass", detail: "content without testid" });
      return true;
    }
    steps.push({ id: stepId, status: "fail", detail: body.slice(0, 280) });
    return false;
  }

  try {
    await signInWithSession(desktopContext, email);
    await signInWithSession(mobileContext, email);
    steps.push({ id: "sign_in", status: "pass" });

    if (SKIP_UPLOAD && PRESET_CASE_ID) {
      caseId = PRESET_CASE_ID;
      console.log(`Skipping upload — using H5_SMOKE_CASE_ID=${caseId}`);
      steps.push({ id: "taylor_upload", status: "pass", detail: `skipped:${caseId}` });
    } else {
      console.log("Uploading Taylor bundle…");
      caseId = await uploadTaylor(desktop);
      steps.push({ id: "taylor_upload", status: "pass", detail: caseId });
      await waitShell(desktop, "post-upload");

      const landingUrl = desktop.url();
      if (/\/cases\/[0-9a-f-]{36}.*tab=overview/i.test(landingUrl)) {
        steps.push({ id: "post_upload_landing", status: "pass", detail: landingUrl });
        steps.push({ id: "post_upload_overview_default", status: "pass", detail: landingUrl });
      } else if (/\/cases\/[0-9a-f-]{36}/i.test(landingUrl)) {
        steps.push({ id: "post_upload_landing", status: "warn", detail: landingUrl });
        steps.push({ id: "post_upload_overview_default", status: "warn", detail: "On /cases but not tab=overview" });
      } else if (/court-today\?.*case=/i.test(landingUrl)) {
        steps.push({ id: "post_upload_landing", status: "fail", detail: landingUrl });
        steps.push({ id: "post_upload_overview_default", status: "fail", detail: `Expected /cases overview, got ${landingUrl}` });
      } else {
        steps.push({ id: "post_upload_landing", status: "warn", detail: landingUrl });
      }
    }

    console.log("[five_answers_renders] checking overview…");
    await checkOverviewPass(desktop, "five_answers_renders");
    await desktop.screenshot({ path: path.join(OUT_DIR, "01-post-upload-landing.png"), fullPage: true });

    const traceBtn = desktop.getByTestId("evidence-trace-allegation").getByRole("button", { name: /evidence trace/i });
    if (await traceBtn.isVisible().catch(() => false)) {
      await traceBtn.click();
      steps.push({ id: "evidence_trace_visible", status: "pass" });
    } else {
      steps.push({ id: "evidence_trace_visible", status: "warn", detail: "Trace panel not found" });
    }

    if (await desktop.getByTestId("defence-decision-board").isVisible().catch(() => false)) {
      steps.push({ id: "decision_board_visible", status: "pass" });
    } else {
      const body = await desktop.locator("body").innerText();
      if (/defence decision board|requires solicitor review/i.test(body)) {
        steps.push({ id: "decision_board_visible", status: "pass", detail: "content without testid" });
      } else {
        steps.push({ id: "decision_board_visible", status: "warn", detail: "Decision board not on page" });
      }
    }

    const dangerous = /\bBWV\s+(?:shows|confirms|proves)\b|\bdrug\s+continuity\b|\bsafeguards\s+were\s+followed\b/i;
    const overviewBody = await desktop.locator("body").innerText();
    if (dangerous.test(overviewBody)) {
      steps.push({ id: "no_dangerous_patterns", status: "fail", detail: "Dangerous pattern on overview" });
    } else {
      steps.push({ id: "no_dangerous_patterns", status: "pass" });
    }

    await desktop.screenshot({ path: path.join(OUT_DIR, "02-overview-desktop.png"), fullPage: true });

    const navTabs = [
      { id: "today", tab: "today", file: "03-today.png", must: /today|hearing|provisional|war room|do not/i },
      { id: "chase", tab: "disclosure-chase", file: "04-chase.png", must: /chase|disclosure|outstanding|CPS|priority|missing/i },
      { id: "summary", tab: "summary", file: "05-summary.png", must: /summary|matter|provisional|case|theory/i },
    ];
    for (const t of navTabs) {
      await desktop.goto(caseTabHref(caseId, t.tab), { waitUntil: "domcontentloaded" });
      await waitShell(desktop, `tab-${t.id}`);
      let body = await desktop.locator("body").innerText();
      if (!t.must.test(body)) {
        await desktop.goto(courtTodayTabHref(caseId, t.tab), { waitUntil: "domcontentloaded" });
        await waitShell(desktop, `tab-${t.id}-court-today`);
        body = await desktop.locator("body").innerText();
      }
      if (!t.must.test(body)) {
        steps.push({ id: `${t.id}_accessible`, status: "fail", detail: "Expected tab content missing" });
      } else {
        steps.push({ id: `${t.id}_accessible`, status: "pass" });
      }
      await desktop.screenshot({ path: path.join(OUT_DIR, t.file), fullPage: true });
    }

    const nav = desktop.getByTestId("case-workflow-nav");
    if (await nav.isVisible().catch(() => false)) {
      steps.push({ id: "workflow_nav_visible", status: "pass" });
    } else {
      steps.push({ id: "workflow_nav_visible", status: "warn" });
    }

    await checkOverviewPass(desktop, "five_answers_after_tabs");

    console.log("[overview_mobile_layout] checking mobile…");
    await mobile.goto(caseOverviewHref(caseId), { waitUntil: "domcontentloaded" });
    await waitShell(mobile, "mobile-overview");
    let mobileOk = await waitForOverview(mobile, "mobile");
    let mobileBody = await mobile.locator("body").innerText();
    if (!mobileOk && !OVERVIEW_TEXT.test(mobileBody)) {
      await mobile.goto(courtTodayTabHref(caseId, "overview"), { waitUntil: "domcontentloaded" });
      await waitShell(mobile, "mobile-overview-court-today");
      mobileOk = await waitForOverview(mobile, "mobile-court-today");
      mobileBody = await mobile.locator("body").innerText();
    }
    if (mobileOk || OVERVIEW_TEXT.test(mobileBody)) {
      steps.push({ id: "overview_mobile_layout", status: "pass" });
    } else {
      steps.push({ id: "overview_mobile_layout", status: "fail", detail: mobileBody.slice(0, 200) });
    }
    await mobile.screenshot({ path: path.join(OUT_DIR, "06-overview-mobile.png"), fullPage: true });
  } finally {
    await browser.close();
  }

  const fails = steps.filter((s) => s.status === "fail");
  const warns = steps.filter((s) => s.status === "warn");
  const overviewPass = steps.some(
    (s) => (s.id === "five_answers_renders" || s.id === "five_answers_after_tabs") && s.status === "pass",
  );
  const report = {
    generatedAt: new Date().toISOString(),
    level: "H5 chunks 1-3 — Overview smoke",
    baseUrl: BASE_URL,
    email,
    userId,
    caseId,
    pass: steps.filter((s) => s.status === "pass").length,
    warn: warns.length,
    fail: fails.length,
    steps,
    overall: fails.length === 0 ? (warns.length ? "PASS_WITH_WARNINGS" : "PASS") : "FAIL",
  };

  fs.writeFileSync(path.join(OUT_DIR, "report.json"), JSON.stringify(report, null, 2));
  fs.writeFileSync(
    path.join(OUT_DIR, "latest-account.json"),
    JSON.stringify({ email, password: PASSWORD, userId, appUrl: BASE_URL }, null, 2),
  );

  console.log("");
  console.log(`Overall: ${report.overall}`);
  console.log(`Steps: ${report.pass} pass / ${warns.length} warn / ${fails.length} fail`);
  for (const f of fails) console.log(`  FAIL ${f.id}: ${f.detail ?? ""}`);
  console.log("Report:", path.join(OUT_DIR, "report.json"));

  process.exit(fails.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
