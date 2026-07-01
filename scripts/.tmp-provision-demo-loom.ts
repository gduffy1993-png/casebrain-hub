#!/usr/bin/env npx tsx
/**
 * Provision solicitor demo account — Taylor Brookes digital/harassment case (richer than Jordan).
 * Run: npx tsx scripts/.tmp-provision-demo-loom.ts
 */
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer";
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "docs", "cb-fresh-adversarial", "sources", "CB-FRESH-001_Taylor_Brookes.txt");
const PDF_DIR = path.join(ROOT, "docs", "cb-fresh-adversarial", "pdfs");
const PDF = path.join(PDF_DIR, "CB-FRESH-001_Taylor_Brookes.pdf");
const OUT_DIR = path.join(ROOT, "artifacts", "casebrain-qa", "demo-loom");
const OUT = path.join(OUT_DIR, "latest-account.json");
const SNAPSHOT = path.join(OUT_DIR, "cockpit-snapshot.txt");
const BASE_URL = (process.env.DEMO_BASE_URL ?? "https://www.casebrain.co.uk").replace(/\/$/, "");
const PASSWORD = process.env.SMOKE_PASSWORD ?? "ProdSmokeOnly!Jun2026";
const CASE_TITLE = "CB-FRESH-001 Taylor Brookes";

function loadEnv(): void {
  for (const name of [".env.local", ".env", ".env.vercel.prod"]) {
    const p = path.join(ROOT, name);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq <= 0) continue;
      const k = t.slice(0, eq).trim();
      const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function ensureTaylorPdf(): Promise<void> {
  fs.mkdirSync(PDF_DIR, { recursive: true });
  if (fs.existsSync(PDF)) return;
  if (!fs.existsSync(SRC)) throw new Error(`Missing ${SRC}`);
  const text = fs.readFileSync(SRC, "utf8");
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8" /><style>body{font-family:'Times New Roman',serif;font-size:11pt;line-height:1.4;margin:0}pre{white-space:pre-wrap;font-family:inherit;margin:0}</style></head><body><pre>${escapeHtml(text)}</pre></body></html>`;
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.pdf({ path: PDF, format: "A4", printBackground: true, margin: { top: "16mm", bottom: "16mm", left: "16mm", right: "16mm" } });
  } finally {
    await browser.close();
  }
}

async function findUserByEmail(admin: ReturnType<typeof createClient>, email: string) {
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
    if (hit) return hit;
    if (data.users.length < 200) break;
  }
  return null;
}

async function provision(email: string): Promise<{ userId: string; orgId: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
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
    const ins = await admin
      .from("organisations")
      .insert({ name: "CaseBrain Solicitor Demo", email_domain: null, external_ref: externalRef, plan: "pro" })
      .select("id")
      .single();
    if (ins.error || !ins.data?.id) throw ins.error ?? new Error("org insert failed");
    orgId = ins.data.id as string;
    await admin.from("organisation_members").insert({ organisation_id: orgId, user_id: userId, role: "owner" });
  }
  return { userId, orgId: orgId! };
}

function authCookie(session: {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  expires_at?: number;
  token_type?: string;
  user?: unknown;
}): { name: string; value: string } {
  const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0];
  return { name: `sb-${ref}-auth-token`, value: `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}` };
}

async function uploadTaylor(page: import("@playwright/test").Page): Promise<string> {
  await page.goto(`${BASE_URL}/upload`, { waitUntil: "domcontentloaded" });
  await page.getByText(/drop documents|new upload/i).first().waitFor({ timeout: 30_000 });
  await page.locator("select").first().selectOption("criminal");
  await page.locator('input[type="file"]').setInputFiles(PDF);
  await page.getByPlaceholder(/R v Smith/i).fill(CASE_TITLE);
  const uploadResponse = page.waitForResponse((r) => r.url().includes("/api/upload") && r.status() === 201, { timeout: 120_000 });
  await page.getByRole("button", { name: /upload and extract/i }).click();
  const uploadRes = await uploadResponse;
  const uploadJson = (await uploadRes.json()) as { caseId?: string; case_id?: string; id?: string };
  const caseId = uploadJson.caseId ?? uploadJson.case_id ?? uploadJson.id;
  if (!caseId) throw new Error("Upload failed — no caseId");
  await page.waitForURL(/\/cases\/[0-9a-f-]{36}/i, { timeout: 60_000 }).catch(() => undefined);
  await page.waitForTimeout(45_000);
  return caseId;
}

async function captureCockpitSnapshot(page: import("@playwright/test").Page): Promise<string> {
  await page.locator('[data-testid="case-snapshot-panel"]').scrollIntoViewIfNeeded({ timeout: 30_000 }).catch(() => undefined);
  await page.locator('[data-testid="evidence-truth-map-panel"]').scrollIntoViewIfNeeded({ timeout: 15_000 }).catch(() => undefined);
  await page.locator('[data-testid="proof-packet-preview-panel"]').scrollIntoViewIfNeeded({ timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(1500);

  const blocks = [
    "case-workflow-header-strip",
    "case-snapshot-panel",
    "evidence-truth-map-panel",
    "proof-packet-preview-panel",
    "five-answers-compact-section",
  ];
  const parts: string[] = [];
  for (const id of blocks) {
    const el = page.locator(`[data-testid="${id}"]`).first();
    if (await el.isVisible().catch(() => false)) {
      parts.push(`--- ${id} ---\n${(await el.innerText()).trim()}`);
    }
  }
  return parts.join("\n\n");
}

type Probe = { id: string; ok: boolean; detail?: string };

async function probeTab(page: import("@playwright/test").Page, caseId: string, tab: string, must: RegExp): Promise<Probe> {
  const url = `${BASE_URL}/cases/${caseId}?tab=${tab}&controlRoom=1`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(8000);
  const body = await page.locator("body").innerText();
  const banned = /\bsimulator case\b|\bsynthetic bundle\b|\bfake case\b|\bproof pack\b|\bred team\b|\bgenerated by ai\b/i.test(body);
  return {
    id: tab,
    ok: must.test(body) && !banned,
    detail: banned ? "banned phrase in UI" : must.test(body) ? "ok" : body.slice(0, 200),
  };
}

async function main(): Promise<void> {
  loadEnv();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  await ensureTaylorPdf();

  const stamp = Date.now();
  const email = process.env.DEMO_LOOM_EMAIL ?? `demo.loom.${stamp}@casebrain.qa.smoke`;
  console.log("Provisioning demo account:", email);
  const { userId, orgId } = await provision(email);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const anon = createClient(url, anonKey, { auth: { persistSession: false } });
  const signIn = await anon.auth.signInWithPassword({ email, password: PASSWORD });
  if (signIn.error || !signIn.data.session) throw signIn.error ?? new Error("sign in failed");

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const cookie = authCookie(signIn.data.session);
  await ctx.addCookies([
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
  const page = await ctx.newPage();

  console.log("Uploading Taylor Brookes bundle…");
  const caseId = await uploadTaylor(page);
  console.log("Case ID:", caseId);

  const probes: Probe[] = [];
  probes.push(await probeTab(page, caseId, "overview", /case cockpit|evidence truth map|proof packet|screenshot|phone|harassment/i));
  probes.push(await probeTab(page, caseId, "overview", /served|referred|missing|do not overstate|refused/i));
  probes.push(await probeTab(page, caseId, "chase", /phone|screenshot|subscriber|chase|disclosure/i));
  probes.push(await probeTab(page, caseId, "summary", /client|Taylor|provisional|harassment/i));
  probes.push(await probeTab(page, caseId, "today", /court|provisional|do not/i));

  await page.goto(`${BASE_URL}/cases/${caseId}?tab=overview&controlRoom=1`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(20_000);
  const overviewBody = await page.locator("body").innerText();
  const cockpitSnapshot = await captureCockpitSnapshot(page);
  fs.writeFileSync(SNAPSHOT, `${cockpitSnapshot}\n`);

  const hasServed = /served/i.test(overviewBody);
  const hasGap = /referred|missing|outstanding/i.test(overviewBody);
  const hasChase = /chase|outstanding|subscriber|phone download/i.test(overviewBody);
  const hasDno = /do not|refused to overstate|overstate/i.test(overviewBody);
  const hasGotRight = /got right|screenshot|served on file|correctly flagged/i.test(overviewBody);

  await page.screenshot({ path: path.join(OUT_DIR, "overview.png"), fullPage: true });

  const fails = probes.filter((p) => !p.ok);
  const demoRich =
    hasServed && hasGap && hasChase && hasDno && hasGotRight;
  const verdict =
    fails.length === 0 && demoRich ? "READY" : fails.length <= 1 && demoRich ? "READY WITH WARNINGS" : "NOT READY";

  const account = {
    createdAt: new Date().toISOString(),
    verdict,
    signInUrl: `${BASE_URL}/sign-in`,
    appUrl: BASE_URL,
    email,
    password: PASSWORD,
    userId,
    orgId,
    caseId,
    caseTitle: CASE_TITLE,
    caseUrl: `${BASE_URL}/cases/${caseId}?tab=overview&controlRoom=1`,
    chosenBecause:
      "Taylor Brookes — screenshot pack served, phone download outstanding, subscriber data gap, harassment/digital shape, clear chase + do-not-overstate, stronger proof-packet got-right than thin Jordan.",
    cockpitChecks: { hasServed, hasGap, hasChase, hasDno, hasGotRight },
    cockpitSnapshotPath: SNAPSHOT,
    probes,
    caveats: [
      "Trial banner hidden for @casebrain.qa.smoke demo accounts after UX polish deploy.",
      "Sidebar hidden on case desk for demo accounts — workflow tabs are primary nav.",
      "Do not claim real-world or solicitor-reviewed proof in the video.",
    ],
    videoScriptHints: {
      opening: "CaseBrain is built for criminal defence bundles where the risk is relying on something the papers do not actually prove.",
      proofLine:
        "Before solicitor review, CaseBrain has been run across 500 controlled/anonymised criminal bundle scenarios covering 3,500+ evidence items, with 0 false-served and 0 blocking failures. The next step is independent solicitor-reviewed audit.",
    },
  };

  fs.writeFileSync(OUT, `${JSON.stringify(account, null, 2)}\n`);
  await browser.close();

  console.log("\nDemo account ready");
  console.log("==================");
  console.log("Verdict:", verdict);
  console.log("Email:", email);
  console.log("Password:", PASSWORD);
  console.log("Case URL:", account.caseUrl);
  console.log("Saved:", OUT);
  if (fails.length) {
    console.log("\nProbe failures:");
    for (const f of fails) console.log(`  ${f.id}: ${f.detail}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
