#!/usr/bin/env npx tsx
/**
 * H5 Overview smoke — fresh account, Taylor upload, Overview default + tab walkthrough.
 * Run: npx tsx scripts/h5-overview-smoke.ts
 * Env: H5_SMOKE_BASE_URL (default http://localhost:3000), CB_FRESH_HEADLESS=0 for headed
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
  const existing = await findUserByEmail(admin, email);
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

async function uploadTaylor(page: Page): Promise<string> {
  const pdfPath = path.join(PDF_DIR, TAYLOR.pdfFile);
  await page.goto(`${BASE_URL}/upload`, { waitUntil: "domcontentloaded" });
  await page.getByText(/drop documents|new upload/i).first().waitFor({ timeout: 60_000 });
  await page.locator("select").first().selectOption("criminal");
  await page.locator('input[type="file"]').setInputFiles(pdfPath);
  await page.getByPlaceholder(/R v Smith/i).fill(TAYLOR.caseTitle);
  const uploadResponse = page.waitForResponse(
    (r) => r.url().includes("/api/upload") && r.status() === 201,
    { timeout: 180_000 },
  );
  await page.getByRole("button", { name: /upload and extract/i }).click();
  const uploadRes = await uploadResponse;
  const uploadJson = (await uploadRes.json()) as { caseId?: string; case_id?: string; id?: string };
  let caseId = uploadJson.caseId ?? uploadJson.case_id ?? uploadJson.id ?? null;
  if (!caseId) {
    await page.waitForURL(/\/cases\/[0-9a-f-]{36}/i, { timeout: 120_000 }).catch(() => undefined);
    const m = page.url().match(/\/cases\/([0-9a-f-]{36})/i);
    caseId = m?.[1] ?? null;
  }
  if (!caseId) throw new Error("Upload failed — no caseId");
  await page.waitForURL(/\/cases\/|\/court-today/, { timeout: 120_000 }).catch(() => undefined);
  await page.waitForTimeout(5000);
  return caseId;
}

async function waitShell(page: Page): Promise<void> {
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.waitForTimeout(3000);
}

async function waitForOverview(page: Page): Promise<boolean> {
  try {
    await page.getByTestId("five-answers-view").waitFor({ timeout: 90_000 });
    return true;
  } catch {
    try {
      await page.getByTestId("five-answers-case-saying").waitFor({ timeout: 15_000 });
      return true;
    } catch {
      return false;
    }
  }
}

function caseOverviewHref(caseId: string, tab = "overview"): string {
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

  const userId = await ensureUser(email);
  const browser = await chromium.launch({ headless: HEADLESS });
  const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const desktop = await desktopContext.newPage();
  const mobile = await mobileContext.newPage();

  async function checkOverviewPass(page: Page, stepId: string): Promise<boolean> {
    if (!caseId) return false;
    await page.goto(caseOverviewHref(caseId, "overview"), { waitUntil: "domcontentloaded" });
    await waitShell(page);
    const overviewOk = await waitForOverview(page);
    if (overviewOk) {
      steps.push({ id: stepId, status: "pass" });
      return true;
    }
    const body = await page.locator("body").innerText();
    if (/what is this case saying|evidence truth rules|source-backed court note|defence decision board/i.test(body)) {
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

    caseId = await uploadTaylor(desktop);
    steps.push({ id: "taylor_upload", status: "pass", detail: caseId });

    const landingUrl = desktop.url();
    if (/tab=overview/.test(landingUrl) || /\/cases\/[0-9a-f-]{36}/.test(landingUrl) || /court-today\?.*case=/.test(landingUrl)) {
      steps.push({ id: "post_upload_landing", status: "pass", detail: landingUrl });
    } else {
      steps.push({ id: "post_upload_landing", status: "warn", detail: landingUrl });
    }

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
      { id: "chase", tab: "disclosure-chase", file: "04-chase.png", must: /chase|disclosure|outstanding|CPS|priority/i },
      { id: "summary", tab: "summary", file: "05-summary.png", must: /summary|matter|provisional|case|theory/i },
    ];
    for (const t of navTabs) {
      await desktop.goto(caseOverviewHref(caseId, t.tab), { waitUntil: "domcontentloaded" });
      await waitShell(desktop);
      const body = await desktop.locator("body").innerText();
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

    await mobile.goto(caseOverviewHref(caseId, "overview"), { waitUntil: "domcontentloaded" });
    await waitShell(mobile);
    const mobileOk = await waitForOverview(mobile);
    const mobileBody = await mobile.locator("body").innerText();
    if (mobileOk || /what is this case saying|evidence truth|defence decision board/i.test(mobileBody)) {
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
