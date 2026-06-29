#!/usr/bin/env npx tsx
/**
 * H4 step 4 — account / permission smoke (prod-safe QA accounts).
 *
 * Two isolated orgs: upload, tabs, feedback, API isolation, export surface checks.
 *
 * Run: npx tsx scripts/h4-account-permission-smoke.ts
 */
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer";
import { chromium, type BrowserContext, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "artifacts", "casebrain-qa", "h4-account-permission");
const PDF_DIR = path.join(ROOT, "docs", "cb-fresh-adversarial", "pdfs");
const PDF_A = path.join(PDF_DIR, "CB-FRESH-001_Taylor_Brookes.pdf");
const PDF_B = path.join(PDF_DIR, "CB-FRESH-002_Jordan_Hale.pdf");
const SRC_A = path.join(ROOT, "docs", "cb-fresh-adversarial", "sources", "CB-FRESH-001_Taylor_Brookes.txt");
const SRC_B = path.join(ROOT, "docs", "cb-fresh-adversarial", "sources", "CB-FRESH-002_Jordan_Hale.txt");
const BASE_URL = (process.env.H4_SMOKE_BASE_URL ?? "https://www.casebrain.co.uk").replace(/\/$/, "");
const PASSWORD = process.env.SMOKE_PASSWORD ?? "ProdSmokeOnly!Jun2026";
const HEADLESS = process.env.H4_SMOKE_HEADLESS !== "0";

type StepResult = {
  id: string;
  status: "pass" | "fail" | "warn" | "skip";
  detail?: string;
};

type Account = {
  label: string;
  email: string;
  userId: string;
  orgId: string;
  caseId?: string;
  caseTitle: string;
  clientMarker: string;
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

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function ensurePdf(srcPath: string, pdfPath: string): Promise<void> {
  if (fs.existsSync(pdfPath)) return;
  if (!fs.existsSync(srcPath)) throw new Error(`Missing source text: ${srcPath}`);
  fs.mkdirSync(path.dirname(pdfPath), { recursive: true });
  const text = fs.readFileSync(srcPath, "utf8");
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8" /><style>body{font-family:'Times New Roman',serif;font-size:11pt;line-height:1.4;margin:0}pre{white-space:pre-wrap;font-family:inherit;margin:0}</style></head><body><pre>${escapeHtml(text)}</pre></body></html>`;
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
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

async function ensureUploadPdfs(): Promise<void> {
  await ensurePdf(SRC_A, PDF_A);
  await ensurePdf(SRC_B, PDF_B);
}

async function findUserByEmail(admin: SupabaseClient, email: string) {
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
    if (hit) return hit;
    if (data.users.length < 200) break;
  }
  return null;
}

async function provisionAccount(label: string, stamp: number): Promise<Account> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Missing Supabase env");

  const email = `h4perm.${label}.${stamp}@casebrain.qa.smoke`;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  let userId: string;
  const existing = await findUserByEmail(admin, email);
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
      .insert({
        name: `H4 permission smoke ${label}`,
        email_domain: null,
        external_ref: externalRef,
        plan: "pro",
      })
      .select("id")
      .single();
    if (ins.error || !ins.data?.id) throw ins.error ?? new Error("org insert failed");
    orgId = ins.data.id as string;
    await admin.from("organisation_members").insert({
      organisation_id: orgId,
      user_id: userId,
      role: "owner",
    });
  }

  return {
    label,
    email,
    userId,
    orgId,
    caseTitle: label === "a" ? "H4-PERM-A Taylor Brookes" : "H4-PERM-B Jordan Hale",
    clientMarker: label === "a" ? "Taylor Brookes" : "Jordan Hale",
  };
}

async function signIn(page: Page, email: string): Promise<void> {
  await page.goto(`${BASE_URL}/sign-in`, { waitUntil: "domcontentloaded" });
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(PASSWORD);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.includes("/sign-in"), { timeout: 60_000 }),
    page.getByRole("button", { name: /^sign in$/i }).click(),
  ]);
  await page.waitForLoadState("networkidle").catch(() => undefined);
}

async function uploadCase(page: Page, pdfPath: string, caseTitle: string): Promise<string> {
  if (!fs.existsSync(pdfPath)) throw new Error(`Missing PDF: ${pdfPath}`);
  await page.goto(`${BASE_URL}/upload`, { waitUntil: "domcontentloaded" });
  await page.getByText(/drop documents|new upload/i).first().waitFor({ timeout: 60_000 });
  await page.locator("select").first().selectOption("criminal");
  await page.locator('input[type="file"]').setInputFiles(pdfPath);
  await page.getByPlaceholder(/R v Smith/i).fill(caseTitle);
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
  await page.waitForTimeout(2000);
  return caseId;
}

function isJsonApiResponse(status: number, json: unknown): boolean {
  return status !== 404 || json !== null;
}

async function checkTabs(page: Page, caseId: string, steps: StepResult[], prefix: string): Promise<Record<string, string>> {
  const tabs = [
    { id: "today", tab: "today" },
    { id: "chase", tab: "disclosure-chase" },
    { id: "summary", tab: "summary" },
  ];
  const texts: Record<string, string> = {};
  for (const t of tabs) {
    await page.goto(`${BASE_URL}/cases/${caseId}?tab=${t.tab}&controlRoom=1&persistence=1`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForLoadState("networkidle").catch(() => undefined);
    if (t.id === "today") {
      await page
        .locator('[data-testid="pilot-today-dashboard"]')
        .waitFor({ state: "visible", timeout: 120_000 })
        .catch(() => undefined);
    } else {
      await page.waitForTimeout(1500);
    }
    if (t.id === "today") {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
    }
    texts[t.id] = await page.locator("body").innerText();
    steps.push({ id: `${prefix}_${t.id}_loaded`, status: "pass" });
    const feedback = page.locator(`[data-testid="trust-feedback-${t.id}"]`);
    try {
      await feedback.first().waitFor({ state: "attached", timeout: 10_000 });
      steps.push({ id: `${prefix}_${t.id}_feedback_panel`, status: "pass" });
    } catch {
      steps.push({ id: `${prefix}_${t.id}_feedback_panel`, status: "warn", detail: "Trust feedback panel not found" });
    }
  }
  return texts;
}

async function apiGetJson(
  ctx: BrowserContext,
  path: string,
): Promise<{ status: number; json: unknown }> {
  const res = await ctx.request.get(`${BASE_URL}${path}`);
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status(), json };
}

async function apiPostJson(
  ctx: BrowserContext,
  path: string,
  body: unknown,
): Promise<{ status: number; json: unknown }> {
  const res = await ctx.request.post(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    data: body,
  });
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status(), json };
}

function caseIdsFromList(json: unknown): string[] {
  if (!json || typeof json !== "object") return [];
  const cases = (json as { cases?: Array<{ id?: string }> }).cases ?? [];
  return cases.map((c) => c.id).filter((id): id is string => Boolean(id));
}

async function main(): Promise<void> {
  loadLocalEnv();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  await ensureUploadPdfs();

  const stamp = Date.now();
  const accountA = await provisionAccount("a", stamp);
  const accountB = await provisionAccount("b", stamp);
  const steps: StepResult[] = [];

  console.log(`H4 account/permission smoke → ${BASE_URL}`);
  console.log(`Account A: ${accountA.email}`);
  console.log(`Account B: ${accountB.email}`);

  const browser = await chromium.launch({ headless: HEADLESS });
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  let textsA: Record<string, string> = {};

  try {
    await signIn(pageA, accountA.email);
    steps.push({ id: "a_sign_in", status: "pass" });

    const meA = await apiGetJson(ctxA, "/api/user/me");
    if (meA.status === 200) {
      steps.push({ id: "a_user_me", status: "pass" });
      const orgId = (meA.json as { orgId?: string })?.orgId;
      if (orgId && orgId !== accountA.orgId) {
        steps.push({ id: "a_org_match", status: "warn", detail: "me org differs from provisioned" });
      }
    } else {
      steps.push({ id: "a_user_me", status: "fail", detail: `status ${meA.status}` });
    }

    accountA.caseId = await uploadCase(pageA, PDF_A, accountA.caseTitle);
    steps.push({ id: "a_upload", status: "pass", detail: accountA.caseId });

    textsA = await checkTabs(pageA, accountA.caseId, steps, "a");

    const fbPost = await apiPostJson(ctxA, `/api/criminal/${accountA.caseId}/trust-feedback`, {
      tab: "chase",
      feedbackKind: "useful",
      lineSnippet: "H4 permission smoke A",
      contextLabel: "Chase tab",
      sourceState: "missing",
      sendability: "provisional_check_source",
      note: "H4 step 4 isolation test",
    });
    if (fbPost.status === 200 && (fbPost.json as { ok?: boolean })?.ok) {
      steps.push({ id: "a_feedback_post", status: "pass" });
    } else if (fbPost.status === 404 && !isJsonApiResponse(fbPost.status, fbPost.json)) {
      steps.push({
        id: "a_feedback_post",
        status: "fail",
        detail: "trust-feedback route not deployed (HTML 404) — run against master preview or promote prod",
      });
    } else {
      steps.push({
        id: "a_feedback_post",
        status: "fail",
        detail: `status ${fbPost.status} ${JSON.stringify(fbPost.json).slice(0, 120)}`,
      });
    }

    const fbGetA = await apiGetJson(ctxA, `/api/criminal/${accountA.caseId}/trust-feedback`);
    const recordsA = (fbGetA.json as { records?: unknown[] })?.records ?? [];
    if (fbGetA.status === 200 && recordsA.length >= 1) {
      steps.push({ id: "a_feedback_read", status: "pass", detail: `${recordsA.length} record(s)` });
    } else if (fbGetA.status === 404 && !isJsonApiResponse(fbGetA.status, fbGetA.json)) {
      steps.push({
        id: "a_feedback_read",
        status: "fail",
        detail: "trust-feedback route not deployed (HTML 404) — run against master preview or promote prod",
      });
    } else {
      steps.push({ id: "a_feedback_read", status: "fail", detail: `status ${fbGetA.status}` });
    }

    await signIn(pageB, accountB.email);
    steps.push({ id: "b_sign_in", status: "pass" });

    accountB.caseId = await uploadCase(pageB, PDF_B, accountB.caseTitle);
    steps.push({ id: "b_upload", status: "pass", detail: accountB.caseId });

    await checkTabs(pageB, accountB.caseId, steps, "b");

    const crossCase = await apiGetJson(ctxB, `/api/cases/${accountA.caseId}`);
    if (crossCase.status === 403 || crossCase.status === 404) {
      steps.push({ id: "b_cross_case_blocked", status: "pass", detail: `status ${crossCase.status}` });
    } else {
      steps.push({ id: "b_cross_case_blocked", status: "fail", detail: `status ${crossCase.status}` });
    }

    const crossFb = await apiGetJson(ctxB, `/api/criminal/${accountA.caseId}/trust-feedback`);
    if (crossFb.status === 403 || crossFb.status === 404) {
      steps.push({ id: "b_cross_feedback_blocked", status: "pass", detail: `status ${crossFb.status}` });
    } else {
      const recs = (crossFb.json as { records?: unknown[] })?.records ?? [];
      if (recs.length === 0) {
        steps.push({ id: "b_cross_feedback_blocked", status: "pass", detail: "empty records" });
      } else {
        steps.push({ id: "b_cross_feedback_blocked", status: "fail", detail: "leaked feedback records" });
      }
    }

    const crossFbPost = await apiPostJson(ctxB, `/api/criminal/${accountA.caseId}/trust-feedback`, {
      tab: "today",
      feedbackKind: "wrong",
      note: "should not land",
    });
    if (crossFbPost.status === 403 || crossFbPost.status === 404) {
      steps.push({ id: "b_cross_feedback_post_blocked", status: "pass", detail: `status ${crossFbPost.status}` });
    } else {
      steps.push({ id: "b_cross_feedback_post_blocked", status: "fail", detail: `status ${crossFbPost.status}` });
    }

    const listB = await apiGetJson(ctxB, "/api/cases");
    const idsB = caseIdsFromList(listB.json);
    if (!idsB.includes(accountA.caseId!)) {
      steps.push({ id: "b_cases_list_no_a", status: "pass" });
    } else {
      steps.push({ id: "b_cases_list_no_a", status: "fail", detail: "A case visible in B list" });
    }

    const listA = await apiGetJson(ctxA, "/api/cases");
    const idsA = caseIdsFromList(listA.json);
    if (!idsA.includes(accountB.caseId!)) {
      steps.push({ id: "a_cases_list_no_b", status: "pass" });
    } else {
      steps.push({ id: "a_cases_list_no_b", status: "fail", detail: "B case visible in A list" });
    }

    const archiveCross = await ctxB.request.post(`${BASE_URL}/api/cases/${accountA.caseId}/archive`);
    if (archiveCross.status() === 403 || archiveCross.status() === 404) {
      steps.push({ id: "b_cross_archive_blocked", status: "pass", detail: `status ${archiveCross.status()}` });
    } else {
      steps.push({ id: "b_cross_archive_blocked", status: "fail", detail: `status ${archiveCross.status()}` });
    }

    const chaseTextA = textsA.chase ?? "";
    if (chaseTextA.includes(accountB.clientMarker)) {
      steps.push({ id: "a_export_surface_no_b_leak", status: "fail", detail: "B client on A chase" });
    } else {
      steps.push({ id: "a_export_surface_no_b_leak", status: "pass" });
    }
    if (/ask the court to record/i.test(chaseTextA) && /please provide/i.test(chaseTextA)) {
      const cpsLike = chaseTextA.match(/please provide[\s\S]{0,200}/i)?.[0] ?? "";
      if (cpsLike && /ask the court/i.test(cpsLike)) {
        steps.push({ id: "a_copy_cps_court_separated", status: "fail", detail: "court in CPS-like block" });
      } else {
        steps.push({ id: "a_copy_cps_court_separated", status: "pass" });
      }
    } else {
      steps.push({ id: "a_copy_cps_court_separated", status: "pass" });
    }

    steps.push({
      id: "invited_user_role",
      status: "skip",
      detail: "Org invite / role flow not exposed in API yet",
    });
  } finally {
    await browser.close();
  }

  const fails = steps.filter((s) => s.status === "fail");
  const warns = steps.filter((s) => s.status === "warn");
  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    accounts: {
      a: { ...accountA, password: "[redacted]" },
      b: { ...accountB, password: "[redacted]" },
    },
    pass: steps.filter((s) => s.status === "pass").length,
    warn: warns.length,
    fail: fails.length,
    skip: steps.filter((s) => s.status === "skip").length,
    status: fails.length > 0 ? "fail" : warns.length > 0 ? "warning" : "pass",
    steps,
  };

  fs.writeFileSync(path.join(OUT_DIR, "report.json"), `${JSON.stringify(report, null, 2)}\n`);

  console.log("");
  console.log(`Overall: ${report.status.toUpperCase()}`);
  console.log(`Steps: ${report.pass} pass / ${report.warn} warn / ${report.fail} fail / ${report.skip} skip`);
  console.log(`Report: ${path.join(OUT_DIR, "report.json")}`);

  if (fails.length > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
