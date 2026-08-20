#!/usr/bin/env npx tsx
/**
 * Authenticated Chromium live proof of restored Overview LI on recovery preview.
 * Run:
 *   npx tsx scripts/assurance/legal-intelligence-recovery-v1/restored-overview-authenticated-live-proof.ts
 *
 * Env:
 *   H5_SMOKE_BASE_URL — preview base (required for live)
 *   H5_SMOKE_EMAIL / SMOKE_PASSWORD — defaults to QA email + product smoke password pattern
 *   CB_FRESH_HEADLESS=0 for headed
 */
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer";
import { chromium, type BrowserContext, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { PATEL_SOURCE_BUNDLE } from "@/lib/criminal/legal-intelligence/fixtures/patel-source";
import {
  buildLegalIntelligence,
  considerationsForSurface,
} from "@/lib/criminal/legal-intelligence";
import { evidenceMentionStatus } from "@/lib/criminal/legal-intelligence/evidence-mention";

const ROOT = process.cwd();
const OUT_DIR = path.join(
  ROOT,
  "artifacts",
  "casebrain-qa",
  "assurance",
  "legal-intelligence-recovery-v1",
);
const PDF_DIR = path.join(OUT_DIR, "live-proof-pdfs");
const BASE_URL = (
  process.env.H5_SMOKE_BASE_URL ??
  process.env.CB_PREVIEW_BASE_URL ??
  ""
).replace(/\/$/, "");
const EMAIL =
  process.env.H5_SMOKE_EMAIL?.trim() ||
  process.env.CB_QA_EMAIL?.trim() ||
  process.env.QA_EMAIL?.trim() ||
  "gduffy1993+casebrain@gmail.com";
const PASSWORD =
  process.env.SMOKE_PASSWORD?.trim() ||
  process.env.CB_QA_PASSWORD?.trim() ||
  process.env.QA_PASSWORD?.trim() ||
  "ProdSmokeOnly!Jun2026";
const HEADLESS = process.env.CB_FRESH_HEADLESS !== "0";
const UPLOAD_TIMEOUT_MS = Number(process.env.UPLOAD_TIMEOUT_MS ?? 180_000);
const PRESET_CASES_JSON = process.env.LIVE_PROOF_CASE_IDS_JSON?.trim() || "";
const PRESET_CASES: Record<string, string> = PRESET_CASES_JSON
  ? (JSON.parse(PRESET_CASES_JSON) as Record<string, string>)
  : {};

type MatterSpec = {
  id: string;
  label: string;
  offence: string;
  caseTitle: string;
  bundleText: string;
  expect: {
    mustSeeOverview?: RegExp[];
    mustNotSeeOverview?: RegExp[];
    families: { bwv: string; cctv: string; interview: string };
  };
};

const MATTERS: MatterSpec[] = [
  {
    id: "LIVE-01-patel",
    label: "Patel affray",
    offence: "Affray",
    caseTitle: "LIVE-01 Isaac Patel Affray Recovery Proof",
    bundleText: PATEL_SOURCE_BUNDLE,
    expect: {
      mustSeeOverview: [/interview|recording|transcript/i, /CCTV|clip|master|export/i, /PACE|custody|self-defence|first-contact|CAD/i],
      mustNotSeeOverview: [],
      families: { bwv: "absent", cctv: "mentioned", interview: "mentioned" },
    },
  },
  {
    id: "LIVE-02-phone",
    label: "Digital/phone harassment",
    offence: "Harassment",
    caseTitle: "LIVE-02 Taylor Reed Phone Negation Recovery Proof",
    bundleText: [
      "Taylor Reed",
      "Charge: Harassment",
      "Screenshots of WhatsApp messages served.",
      "Full phone download / subscriber mapping outstanding.",
      "No BWV. No CCTV.",
    ].join("\n"),
    expect: {
      mustSeeOverview: [/attribution|download|subscriber/i],
      mustNotSeeOverview: [/Consider whether BWV exists|distinguishing CCTV|BWV will be used|Confirm(?:ing)? BWV status/i],
      families: { bwv: "negated", cctv: "negated", interview: "absent" },
    },
  },
  {
    id: "LIVE-03-bwv-cctv",
    label: "Violence BWV/CCTV",
    offence: "Assault on emergency worker",
    caseTitle: "LIVE-03 Jordan Hale BWV Recovery Proof",
    bundleText: [
      "Jordan Hale",
      "Charge: Assault on emergency worker",
      "Custody extract served (PACE clock summary).",
      "BWV referred on schedule but not served — outstanding.",
      "Interview recording not mentioned.",
    ].join("\n"),
    expect: {
      mustSeeOverview: [/BWV/i, /PACE|custody/i],
      mustNotSeeOverview: [/interview summary vs full recording|disclosure-interview|Interview recording outstanding as consideration invent/i],
      families: { bwv: "mentioned", cctv: "absent", interview: "absent" },
    },
  },
  {
    id: "LIVE-04-order-breach",
    label: "Order breach thin",
    offence: "Breach of restraining order",
    caseTitle: "LIVE-04 Elena Marsh Order Breach Recovery Proof",
    bundleText: [
      "Elena Marsh",
      "Charge: Breach of restraining order",
      "Order extract served.",
      "Sealed order / proof of service outstanding.",
      "Complainant MG11 outstanding.",
    ].join("\n"),
    expect: {
      mustSeeOverview: [/order|service|MG11|restraining/i],
      mustNotSeeOverview: [],
      families: { bwv: "absent", cctv: "absent", interview: "absent" },
    },
  },
  {
    id: "LIVE-05-motoring",
    label: "Motoring / mixed thin",
    offence: "Dangerous driving",
    caseTitle: "LIVE-05 Ella Shaw Motoring Recovery Proof",
    bundleText: [
      "Ella Shaw",
      "Charge: Dangerous driving",
      "NIP / s.172 notice served.",
      "Dashcam clip referred; full export outstanding.",
    ].join("\n"),
    expect: {
      mustSeeOverview: [/NIP|s\.?172|driving|dashcam|export/i],
      mustNotSeeOverview: [/interview summary vs full recording/i],
      families: { bwv: "absent", cctv: "mentioned", interview: "absent" },
    },
  },
];

function loadLocalEnv(): void {
  for (const name of [".env.runtime.local", ".env.local", ".env"]) {
    const envPath = path.join(ROOT, name);
    if (!fs.existsSync(envPath)) continue;
    let raw = fs.readFileSync(envPath, "utf8");
    if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      // `vercel env pull` on Windows has appended literal \r\n into values.
      val = val.replace(/(?:\\r\\n|\\n|\\r|\r|\n)+$/g, "");
      val = val.replace(/\\r/g, "").replace(/\\n/g, "");
      // Prefer cleaned file values over polluted process env (Windows pull).
      const existing = process.env[key];
      const existingPolluted =
        Boolean(existing) &&
        (/\\r|\\n|\r|\n/.test(existing!) ||
          (key.includes("SUPABASE") && existing!.length < val.length));
      if (!existing || existingPolluted) process.env[key] = val;
    }
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function writePdf(fileName: string, text: string): Promise<string> {
  fs.mkdirSync(PDF_DIR, { recursive: true });
  const pdfPath = path.join(PDF_DIR, fileName);
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8" /><style>body{font-family:'Times New Roman',serif;font-size:11pt;line-height:1.45;margin:0}pre{white-space:pre-wrap;font-family:inherit;margin:0}</style></head><body><pre>${escapeHtml(text)}</pre></body></html>`;
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
  return pdfPath;
}

function projectRef(supabaseUrl: string): string {
  return new URL(supabaseUrl).hostname.split(".")[0] ?? "project";
}

function authCookieForSession(
  supabaseUrl: string,
  session: { access_token: string; refresh_token: string },
): { name: string; value: string } {
  const ref = projectRef(supabaseUrl);
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return { name: `sb-${ref}-auth-token`, value: `base64-${payload}` };
}

async function ensureQaUser(email: string): Promise<"password-signin" | "admin-ensured"> {
  // Prefer direct sign-in with existing QA credentials (no password invention).
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const anon = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const probe = await anon.auth.signInWithPassword({ email, password: PASSWORD });
  if (!probe.error && probe.data.session) {
    await anon.auth.signOut().catch(() => undefined);
    return "password-signin";
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error(
      `QA sign-in failed (${probe.error?.message ?? "no session"}) and SUPABASE_SERVICE_ROLE_KEY unavailable for reset`,
    );
  }
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  let userId: string | null = null;
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      throw new Error(
        `QA sign-in failed (${probe.error?.message ?? "no session"}); admin listUsers also failed: ${error.message}`,
      );
    }
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) {
      userId = hit.id;
      break;
    }
    if (data.users.length < 200) break;
  }
  if (!userId) {
    const created = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
    if (created.error || !created.data.user) throw created.error ?? new Error("createUser failed");
    userId = created.data.user.id;
  } else {
    await admin.auth.admin.updateUserById(userId, { password: PASSWORD, email_confirm: true });
  }
  return "admin-ensured";
}

async function signIn(context: BrowserContext): Promise<string> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");

  // Prefer real UI sign-in so @supabase/ssr cookies match the preview app exactly.
  const page = await context.newPage();
  try {
    await page.goto(`${BASE_URL}/sign-in`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.locator("#email").fill(EMAIL);
    await page.locator("#password").fill(PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL((u) => !u.pathname.includes("/sign-in"), { timeout: 60_000 }).catch(() => undefined);
    await page.waitForTimeout(2000);
    const landed = page.url();
    if (/\/sign-in/i.test(landed)) {
      const body = (await page.locator("body").innerText().catch(() => "")) || "";
      throw new Error(`UI sign-in stayed on sign-in page: ${body.slice(0, 240)}`);
    }
  } finally {
    await page.close();
  }

  // Also keep a bearer-capable session for diagnostics (not used by app APIs).
  const anon = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const signInRes = await anon.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (signInRes.error || !signInRes.data.session) {
    throw signInRes.error ?? new Error(`signInWithPassword failed for ${EMAIL}`);
  }
  return signInRes.data.session.access_token;
}

async function uploadMatter(page: Page, pdfPath: string, caseTitle: string): Promise<string> {
  await page.goto(`${BASE_URL}/upload`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByText(/drop documents|new upload/i).first().waitFor({ timeout: 45_000 });
  await page.locator("select").first().selectOption("criminal");
  await page.locator('input[type="file"]').setInputFiles(pdfPath);
  await page.getByPlaceholder(/R v Smith/i).fill(caseTitle);
  const uploadResponse = page.waitForResponse(
    (r) => r.url().includes("/api/upload") && (r.status() === 201 || r.status() === 200),
    { timeout: UPLOAD_TIMEOUT_MS },
  );
  await page.getByRole("button", { name: /upload and extract/i }).click();
  const uploadRes = await uploadResponse;
  const uploadJson = (await uploadRes.json()) as { caseId?: string; case_id?: string; id?: string };
  let caseId = uploadJson.caseId ?? uploadJson.case_id ?? uploadJson.id ?? null;
  if (!caseId) {
    await page.waitForURL(/\/cases\/[0-9a-f-]{36}/i, { timeout: 45_000 }).catch(() => undefined);
    const m = page.url().match(/\/cases\/([0-9a-f-]{36})/i);
    caseId = m?.[1] ?? null;
  }
  if (!caseId) throw new Error(`Upload failed for ${caseTitle}`);
  return caseId;
}

async function readSurface(page: Page, caseId: string, tab: string): Promise<{
  url: string;
  bodyText: string;
  liText: string;
  attentionText: string;
  hasLiCard: boolean;
  hasWorkspace: boolean;
  epistemicLabels: string[];
  productLabels: string[];
  shellReady: boolean;
}> {
  const urlTab = tab === "cps-chase" || tab === "chase" ? "disclosure-chase" : tab;
  const candidates = [
    `${BASE_URL}/cases/${caseId}?tab=${urlTab}&controlRoom=1`,
    `${BASE_URL}/court-today?case=${caseId}&tab=${urlTab}`,
  ];
  let usedUrl = candidates[0];
  let shellReady = false;

  for (const url of candidates) {
    usedUrl = url;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 });
    const deadline = Date.now() + 120_000;
    while (Date.now() < deadline) {
      const body = ((await page.locator("body").innerText().catch(() => "")) || "").toLowerCase();
      // Auto-confirm review gate when present
      const confirmBtn = page.getByRole("button", { name: /confirm|continue|start|open matter|i confirm/i }).first();
      if (await confirmBtn.isVisible().catch(() => false)) {
        await confirmBtn.click().catch(() => undefined);
        await page.waitForTimeout(1500);
      }
      const hasShell =
        (await page.getByTestId("five-answers-view").count().catch(() => 0)) > 0 ||
        (await page.getByTestId("overview-what-needs-attention").count().catch(() => 0)) > 0 ||
        (await page.getByTestId("case-workflow-shell").count().catch(() => 0)) > 0 ||
        (await page.getByTestId("pilot-matter-desk").count().catch(() => 0)) > 0 ||
        (await page.getByTestId("disclosure-chase").count().catch(() => 0)) > 0;
      if (hasShell && !/loading workspace/.test(body)) {
        shellReady = true;
        break;
      }
      await page.waitForTimeout(2000);
    }
    if (shellReady) break;
  }

  await page.waitForTimeout(2000);

  // Product workspace (default Overview)
  const attention = page.getByTestId("overview-what-needs-attention");
  const hasAttention = (await attention.count().catch(() => 0)) > 0;
  const hasHeader = (await page.getByTestId("overview-workspace-header").count().catch(() => 0)) > 0;
  const hasSelected = (await page.getByTestId("overview-selected-issue").count().catch(() => 0)) > 0;
  // Require attention list + at least one of header/selected (tolerate transient hydration).
  const hasWorkspace = hasAttention && (hasHeader || hasSelected);

  // Expand Advanced review to confirm LI audit card still present (not default dump)
  if (urlTab === "overview") {
    const toggle = page.getByTestId("overview-advanced-toggle");
    if ((await toggle.count().catch(() => 0)) > 0) {
      await toggle.click().catch(() => undefined);
      await page.waitForTimeout(1000);
    }
  }

  const li = page.getByTestId("overview-legal-intelligence-card");
  let hasLiCardFinal = (await li.count().catch(() => 0)) > 0;
  if (!hasLiCardFinal && urlTab === "overview" && shellReady) {
    const liDeadline = Date.now() + 30_000;
    while (Date.now() < liDeadline) {
      if ((await page.getByTestId("overview-legal-intelligence-card").count()) > 0) {
        hasLiCardFinal = true;
        break;
      }
      await page.waitForTimeout(2000);
    }
  }
  const liText = hasLiCardFinal
    ? ((await page.getByTestId("overview-legal-intelligence-card").first().innerText().catch(() => "")) || "")
    : "";
  const attentionText =
    (await attention.count().catch(() => 0)) > 0
      ? ((await attention.first().innerText().catch(() => "")) || "")
      : "";
  const bodyText = (await page.locator("main, body").first().innerText().catch(() => "")) || "";
  const epistemicLabels: string[] = [];
  for (const label of ["FACT", "SAFE ANALYSIS", "PRACTITIONER CONSIDERATION", "Not established as fact"]) {
    if (new RegExp(label, "i").test(liText)) epistemicLabels.push(label);
  }
  const productLabels: string[] = [];
  for (const label of [
    "What Needs Attention",
    "OUTSTANDING",
    "INCOMPLETE",
    "CONSIDER",
    "NOT ESTABLISHED",
    "Safe Court Line",
    "Case Readiness",
  ]) {
    if (new RegExp(label, "i").test(`${attentionText}\n${bodyText}`)) productLabels.push(label);
  }
  return {
    url: usedUrl,
    bodyText,
    liText,
    attentionText,
    hasLiCard: hasLiCardFinal,
    hasWorkspace,
    epistemicLabels,
    productLabels,
    shellReady,
  };
}

function engineExpect(m: MatterSpec) {
  const li = buildLegalIntelligence({
    caseId: m.id,
    allegation: m.offence,
    offenceType: m.offence,
    bundleText: m.bundleText,
  });
  const overview = considerationsForSurface(li, "overview");
  const chase = considerationsForSurface(li, "cps_chase");
  return {
    families: {
      bwv: evidenceMentionStatus("bwv", m.bundleText),
      cctv: evidenceMentionStatus("cctv", m.bundleText),
      interview: evidenceMentionStatus("interview", m.bundleText),
    },
    overviewWhats: overview.map((c) => c.what),
    cpsChaseAdvisoryCount: chase.length,
    establishedSample: li.established.slice(0, 6).map((f) => f.value),
    notEstablishedSample: li.notEstablished.map((n) => n.label),
  };
}

async function main() {
  loadLocalEnv();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  if (!BASE_URL) throw new Error("Set H5_SMOKE_BASE_URL or CB_PREVIEW_BASE_URL to recovery preview");

  const startedAt = new Date().toISOString();
  console.log(`BASE=${BASE_URL}`);
  console.log(`EMAIL=${EMAIL}`);
  console.log(`HEADLESS=${HEADLESS}`);

  let authMode: string = "ui-signin-only";
  try {
    authMode = await ensureQaUser(EMAIL);
  } catch (e) {
    console.warn(`ensureQaUser skipped: ${(e as Error).message}`);
  }
  console.log(`authMode=${authMode}`);

  const browser = await chromium.launch({ headless: HEADLESS });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  let accessToken = "";
  try {
    accessToken = await signIn(context);
  } catch (e) {
    await browser.close();
    const dump = {
      startedAt,
      baseUrl: BASE_URL,
      email: EMAIL,
      authOk: false,
      error: (e as Error).message,
      verdict: "BLOCKED_BY_DEPLOYMENT_OR_AUTH",
    };
    fs.writeFileSync(path.join(OUT_DIR, "RESTORED-OVERVIEW-AUTHENTICATED-LIVE-PROOF.json"), JSON.stringify(dump, null, 2));
    throw e;
  }

  // Confirm authenticated shell
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/cases`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(2000);
  const casesBody = (await page.locator("body").innerText().catch(() => "")) || "";
  const authOk =
    !/sign in|missing env|NEXT_PUBLIC_SUPABASE_URL/i.test(casesBody) ||
    /cases|matters|upload|criminal/i.test(casesBody);
  if (!authOk) {
    await page.screenshot({ path: path.join(OUT_DIR, "auth-fail.png"), fullPage: true }).catch(() => undefined);
    await browser.close();
    throw new Error("Authenticated /cases shell did not look signed-in");
  }

  const results: Array<Record<string, unknown>> = [];
  let allPass = true;

  for (const matter of MATTERS) {
    console.log(`\n=== ${matter.id} ${matter.label} ===`);
    const engine = engineExpect(matter);
    const pdfPath = await writePdf(`${matter.id}.pdf`, matter.bundleText);
    let caseId = "";
    let overview: Awaited<ReturnType<typeof readSurface>> | null = null;
    let chase: Awaited<ReturnType<typeof readSurface>> | null = null;
    const checks: Array<{ id: string; pass: boolean; detail: string }> = [];
    try {
      caseId = PRESET_CASES[matter.id] || (await uploadMatter(page, pdfPath, matter.caseTitle));
      console.log(`  caseId=${caseId}${PRESET_CASES[matter.id] ? " (preset)" : ""}`);
      // allow brief extraction settle
      await page.waitForTimeout(PRESET_CASES[matter.id] ? 1000 : 8000);
      overview = await readSurface(page, caseId, "overview");
      chase = await readSurface(page, caseId, "disclosure-chase");
      await page.screenshot({
        path: path.join(OUT_DIR, `${matter.id}-overview.png`),
        fullPage: true,
      }).catch(() => undefined);

      checks.push({
        id: "shell-ready",
        pass: Boolean(overview?.shellReady),
        detail: overview?.shellReady ? "overview shell ready" : "overview shell not ready",
      });
      checks.push({
        id: "product-workspace",
        pass: Boolean(overview?.hasWorkspace),
        detail: overview?.hasWorkspace
          ? "header + What Needs Attention + selected issue"
          : "product workspace missing",
      });
      checks.push({
        id: "li-still-present",
        pass: Boolean(overview?.hasLiCard) || /CONSIDER|NOT ESTABLISHED|OUTSTANDING/i.test(overview?.attentionText ?? ""),
        detail: overview?.hasLiCard
          ? "LI audit card in Advanced review"
          : `attention product labels present; productLabels=${(overview?.productLabels ?? []).join("|")}`,
      });
      checks.push({
        id: "no-default-raw-dump",
        pass: !/SAFE ANALYSIS/i.test(overview?.attentionText ?? ""),
        detail: "default attention list must not dump SAFE ANALYSIS column",
      });

      const hay = `${overview.attentionText}\n${overview.liText}\n${overview.bodyText}`;
      for (const re of matter.expect.mustSeeOverview ?? []) {
        const pass = re.test(hay);
        checks.push({ id: `must-see:${re.source}`, pass, detail: pass ? "matched" : "missing in Overview" });
      }
      for (const re of matter.expect.mustNotSeeOverview ?? []) {
        const pass = !re.test(`${overview.attentionText}\n${overview.liText}`);
        checks.push({
          id: `must-not-see:${re.source}`,
          pass,
          detail: pass ? "absent from Overview intelligence" : "unexpected in Overview intelligence",
        });
      }

      // CPS Chase firewall: no LI advisory card / consideration lane on chase
      const chaseHasLiCard = chase.hasLiCard;
      const chaseHasConsiderLabel = /PRACTITIONER CONSIDERATION/i.test(chase.liText);
      const chaseHasAttentionWorkspace =
        (await page.getByTestId("overview-what-needs-attention").count().catch(() => 0)) > 0 &&
        /What Needs Attention/i.test(chase.bodyText);
      checks.push({
        id: "cps-chase-firewall",
        pass:
          !chaseHasLiCard &&
          !chaseHasConsiderLabel &&
          !chaseHasAttentionWorkspace &&
          engine.cpsChaseAdvisoryCount === 0,
        detail: `chaseLiCard=${chaseHasLiCard} engineChaseAdv=${engine.cpsChaseAdvisoryCount} chaseShell=${chase.shellReady}`,
      });

      // family status engine vs expect (source truth for negation/interview)
      checks.push({
        id: "family-bwv",
        pass: engine.families.bwv === matter.expect.families.bwv,
        detail: `engine=${engine.families.bwv} expect=${matter.expect.families.bwv}`,
      });
      checks.push({
        id: "family-cctv",
        pass: engine.families.cctv === matter.expect.families.cctv,
        detail: `engine=${engine.families.cctv} expect=${matter.expect.families.cctv}`,
      });
      checks.push({
        id: "family-interview",
        pass: engine.families.interview === matter.expect.families.interview,
        detail: `engine=${engine.families.interview} expect=${matter.expect.families.interview}`,
      });
    } catch (e) {
      allPass = false;
      checks.push({ id: "run", pass: false, detail: (e as Error).message });
    }

    const matterPass = checks.every((c) => c.pass);
    if (!matterPass) allPass = false;
    results.push({
      id: matter.id,
      label: matter.label,
      caseId,
      pass: matterPass,
      checks,
      engine,
      overviewQuote: (overview?.attentionText || overview?.liText || "").slice(0, 1800),
      chaseSnippet: (chase?.bodyText || "").slice(0, 600),
      epistemicLabels: overview?.epistemicLabels ?? [],
      productLabels: overview?.productLabels ?? [],
      hasWorkspace: overview?.hasWorkspace ?? false,
      urls: { overview: overview?.url, chase: chase?.url },
    });
    console.log(`  pass=${matterPass} checks=${checks.filter((c) => c.pass).length}/${checks.length}`);
  }

  await browser.close();

  const verdict = allPass
    ? "RESTORED_OVERVIEW_LIVE_PROOF_PASS"
    : "RESTORED_OVERVIEW_LIVE_PROOF_NEEDS_FIXES";

  const payload = {
    startedAt,
    finishedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    email: EMAIL,
    authOk: true,
    accessTokenPresent: Boolean(accessToken),
    headShaHint: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    results,
    verdict,
  };
  fs.writeFileSync(
    path.join(OUT_DIR, "RESTORED-OVERVIEW-AUTHENTICATED-LIVE-PROOF.json"),
    JSON.stringify(payload, null, 2),
  );
  console.log(`\nVERDICT=${verdict}`);
  console.log(`Wrote ${path.join(OUT_DIR, "RESTORED-OVERVIEW-AUTHENTICATED-LIVE-PROOF.json")}`);
  if (!allPass) process.exitCode = 2;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
