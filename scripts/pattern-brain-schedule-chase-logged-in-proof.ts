/**
 * Logged-in copy proof for schedule chase lab.
 *
 * Seeds owned cases (smoke org), uploads original PDFs to storage, starts the copy
 * with CASEBRAIN_SCHEDULE_CHASE_LAB=1, signs in (no auth bypass), and checks
 * Overview / Court (today) / Chase in a real browser with screenshots.
 *
 *   npx tsx scripts/pattern-brain-schedule-chase-logged-in-proof.ts
 *   npx tsx scripts/pattern-brain-schedule-chase-logged-in-proof.ts --skip-seed
 */
import crypto from "node:crypto";
import { execSync, spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { chromium, type BrowserContext, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { readOriginalPdfAsDocument } from "./pattern-brain-v2-pdf";

const ROOT = process.cwd();
const OUT =
  process.env.SCHEDULE_CHASE_PROOF_OUT?.trim() ||
  path.join(
    ROOT,
    "artifacts/casebrain-qa/assurance/pattern-brain-v2/frozen-lab-2026-10-08/logged-in-proof",
  );
const PORT = Number(process.env.SCHEDULE_CHASE_LOGGED_IN_PORT ?? "3020");
const BASE =
  process.env.SCHEDULE_CHASE_PROOF_BASE_URL?.trim().replace(/\/$/, "") ||
  `http://127.0.0.1:${PORT}`;
const HOSTED_PROOF = /^https:\/\//i.test(BASE);
const EMAIL =
  process.env.SCHEDULE_CHASE_PROOF_EMAIL?.trim() ||
  process.env.H5_SMOKE_EMAIL?.trim() ||
  "demo.loom.taylor.1782877263@casebrain.qa.smoke";
const PASSWORD =
  process.env.SCHEDULE_CHASE_PROOF_PASSWORD ??
  process.env.SMOKE_PASSWORD ??
  "ProdSmokeOnly!Jun2026";
const HEADLESS = process.env.CB_FRESH_HEADLESS !== "0";

type CaseExpect = {
  key: string;
  title: string;
  pdfPath: string;
  mustChase: readonly string[];
  mustNotChase: readonly string[];
  expectUpload: string | null;
  expectConflict: boolean;
  expectToFollow: boolean;
};

const CASES: readonly CaseExpect[] = [
  {
    key: "SIDDIQ",
    title: "Schedule chase lab — Siddiq",
    pdfPath: "C:/Users/gduff/Downloads/cb-tb-001-030-v4/pdfs/CB-TB-014_Siddiq.pdf",
    mustChase: ["BWV search footage", "scales continuity", "drug analysis certificate", "householder MG11"],
    mustNotChase: [],
    expectUpload: null,
    expectConflict: false,
    expectToFollow: false,
  },
  {
    key: "HUGHES",
    title: "Schedule chase lab — Hughes",
    pdfPath: "C:/Users/gduff/Downloads/cb-tb-1601-2200-v5-factory-run/pdfs/CB-TB-1606_Hughes.pdf",
    mustChase: ["BWV booking-in clip", "BWV PC Morris"],
    mustNotChase: [],
    expectUpload: null,
    expectConflict: false,
    expectToFollow: true,
  },
  {
    key: "VALE",
    title: "Schedule chase lab — Vale",
    pdfPath: "C:/Users/gduff/Downloads/cb-tb-1201-1300-v5/pdfs/CB-TB-1260_Vale.pdf",
    mustChase: ["phone extraction report", "medical report", "dashcam footage"],
    mustNotChase: ["999 audio"],
    expectUpload: "999 audio",
    expectConflict: true,
    expectToFollow: false,
  },
  {
    key: "ELLIS",
    title: "Schedule chase lab — Ellis 24pp",
    pdfPath: "C:/Users/gduff/Downloads/magistrates_first_hearing_test_bundle_24pp.pdf",
    mustChase: ["Body-worn video", "Photograph exhibit ML/1", "Property exhibit DH/1", "Repair estimate"],
    mustNotChase: ["Interview transcript", "MG11 - Maya Lewis"],
    expectUpload: "Interview transcript",
    expectConflict: false,
    expectToFollow: true,
  },
];

function loadEnv(): void {
  for (const envPath of [
    path.join(ROOT, ".env.local"),
    path.join(ROOT, ".env"),
    "C:/Users/gduff/casebrain-hub/.env.local",
  ]) {
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

function sha256File(file: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function compact(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function hasLabel(labels: string[], needle: string): boolean {
  const n = compact(needle);
  return labels.some((label) => compact(label).includes(n) || n.includes(compact(label)));
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

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url: string, attempts = 90): Promise<void> {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5_000) });
      if (res.status < 500) {
        console.log("server ready", url, "status", res.status);
        return;
      }
    } catch {
      // keep waiting
    }
    if (i % 10 === 9) console.log("waiting for server…", i + 1);
    await sleep(1000);
  }
  throw new Error(`Server did not start at ${url}`);
}

async function ensurePassword(email: string): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  for (let page = 1; page <= 10; page += 1) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) {
      await admin.auth.admin.updateUserById(hit.id, { password: PASSWORD, email_confirm: true });
      return;
    }
    if (data.users.length < 200) break;
  }
  throw new Error(`Smoke user not found: ${email}`);
}

async function resolveOrgForUser(userId: string): Promise<string> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: dbUser } = await admin.from("users").select("org_id").eq("id", userId).maybeSingle();
  if (dbUser?.org_id) return dbUser.org_id as string;
  const externalRef = `solo-user_${userId}`;
  const { data: org } = await admin
    .from("organisations")
    .select("id")
    .eq("external_ref", externalRef)
    .maybeSingle();
  if (org?.id) return org.id as string;
  const { data: created, error } = await admin
    .from("organisations")
    .insert({ external_ref: externalRef, name: "Solo Workspace" })
    .select("id")
    .single();
  if (error || !created?.id) throw error ?? new Error("org create failed");
  await admin.from("users").upsert({
    id: userId,
    org_id: created.id,
    email: EMAIL,
    role: "owner",
  });
  return created.id as string;
}

async function signIn(context: BrowserContext): Promise<{ userId: string; orgId: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!HOSTED_PROOF) await ensurePassword(EMAIL);
  const anon = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const signIn = await anon.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (signIn.error || !signIn.data.session || !signIn.data.user) {
    throw signIn.error ?? new Error("sign-in failed");
  }
  const cookie = authCookieForSession(url, signIn.data.session);
  await context.addCookies([
    {
      name: cookie.name,
      value: cookie.value,
      domain: new URL(BASE).hostname,
      path: "/",
      httpOnly: false,
      secure: HOSTED_PROOF,
      sameSite: "Lax",
    },
  ]);
  const orgId = await resolveOrgForUser(signIn.data.user.id);
  return { userId: signIn.data.user.id, orgId };
}

async function seedCase(opts: {
  orgId: string;
  userId: string;
  title: string;
  pdfPath: string;
  textOnly?: boolean;
}): Promise<{ caseId: string; documentId: string; pdfSha256: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "casebrain-documents";
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: caseRow, error: caseErr } = await admin
    .from("cases")
    .insert({
      org_id: opts.orgId,
      title: opts.title,
      practice_area: "criminal",
      created_by: opts.userId,
    })
    .select("id")
    .single();
  if (caseErr || !caseRow?.id) throw caseErr ?? new Error("case insert failed");
  const caseId = caseRow.id as string;
  try {
    await admin.from("criminal_cases").upsert({ id: caseId, org_id: opts.orgId }, { onConflict: "id" });
  } catch {
    // non-fatal
  }

  const pdfSha256 = sha256File(opts.pdfPath);
  const buffer = fs.readFileSync(opts.pdfPath);
  const fileName = path.basename(opts.pdfPath);
  const parsed = await readOriginalPdfAsDocument(opts.pdfPath, caseId);
  const extractedJson = {
    pageCount: parsed.document.pages.length,
    pages: parsed.document.pages.map((page) => ({
      text: page.text,
      pageNumber: page.pageNumber,
      compiledPage: page.compiledPage,
    })),
  };

  // textOnly: upload a non-PDF object so storage_url stays NOT NULL, but the
  // owned loader skips it (PDF-only) → unsupported / schedule-not-established path.
  const uploadName = opts.textOnly ? `flat-extract-${fileName}.txt` : fileName;
  const contentType = opts.textOnly ? "text/plain" : "application/pdf";
  const uploadBytes = opts.textOnly ? Buffer.from(parsed.text, "utf8") : buffer;
  const storagePath = `${opts.orgId}/${caseId}/${Date.now()}-${uploadName}`;
  const { error: upErr } = await admin.storage.from(bucket).upload(storagePath, uploadBytes, {
    contentType,
    upsert: false,
  });
  if (upErr) throw upErr;

  const { data: doc, error: docErr } = await admin
    .from("documents")
    .insert({
      case_id: caseId,
      org_id: opts.orgId,
      name: uploadName,
      type: contentType,
      storage_url: `${bucket}/${storagePath}`,
      raw_text: parsed.text,
      extracted_text: parsed.text,
      extracted_json: extractedJson,
      uploaded_by: opts.userId,
    })
    .select("id")
    .single();
  if (docErr || !doc?.id) throw docErr ?? new Error("document insert failed");

  return { caseId, documentId: doc.id as string, pdfSha256 };
}

async function fetchBundle(caseId: string, cookieHeader: string) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const res = await fetch(`${BASE}/api/criminal/${caseId}/bundle-source`, {
        headers: { cookie: cookieHeader },
        signal: AbortSignal.timeout(300_000),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        data?: {
          canonical?: {
            chaseLabels?: string[];
            scheduleChaseLab?: {
              enabled?: boolean;
              applied?: boolean;
              unsupportedInput?: boolean;
              unsupportedReason?: string | null;
              sourceDocumentId?: string | null;
              sourceDocumentName?: string | null;
              uploadLimitations?: Array<{ item: string }>;
              conflicts?: unknown[];
              cpsChaseHeld?: boolean;
            } | null;
          };
          surfaces?: {
            disclosureChase?: { items?: Array<{ label: string; whyItMatters?: string }> };
            composedProse?: { cpsChase?: string | null; limitations?: string[] };
          } | null;
        };
      };
      return { status: res.status, json };
    } catch (error) {
      lastError = error;
      await sleep(3000 * attempt);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("fetchBundle failed");
}

async function ensureReviewConfirmed(caseId: string, cookieHeader: string): Promise<void> {
  const headers = { cookie: cookieHeader, "content-type": "application/json" };
  await fetch(`${BASE}/api/criminal/${caseId}/phase1-detect`, {
    method: "POST",
    headers,
    signal: AbortSignal.timeout(180_000),
  }).catch(() => undefined);
  const getRes = await fetch(`${BASE}/api/criminal/${caseId}/phase1-detect`, {
    headers: { cookie: cookieHeader },
    signal: AbortSignal.timeout(180_000),
  });
  const getJson = (await getRes.json().catch(() => ({}))) as {
    ok?: boolean;
    data?: {
      offenceCode?: string | null;
      offenceLabel?: string | null;
      stance?: string | null;
      stage?: string | null;
      defencePlanDraft?: string | null;
      reviewConfirmedAt?: string | null;
    };
  };
  if (getJson.data?.reviewConfirmedAt) return;
  const d = getJson.data ?? {};
  const confirm = await fetch(`${BASE}/api/criminal/${caseId}/review-confirm`, {
    method: "POST",
    headers,
    signal: AbortSignal.timeout(180_000),
    body: JSON.stringify({
      offenceCode: d.offenceCode?.trim() || "unknown",
      offenceLabel: d.offenceLabel?.trim() || "Unknown offence — set below",
      stance: d.stance?.trim() || "Put to proof",
      stage: d.stage?.trim() || "First hearing",
      defencePlanText: typeof d.defencePlanDraft === "string" ? d.defencePlanDraft : "",
    }),
  });
  const confirmJson = (await confirm.json().catch(() => ({}))) as { ok?: boolean; error?: string };
  if (!confirm.ok || confirmJson.ok !== true) {
    throw new Error(
      `review-confirm failed for ${caseId}: status=${confirm.status} ${confirmJson.error ?? ""}`,
    );
  }
}

async function openTab(page: Page, caseId: string, tab: string): Promise<string> {
  const href = `${BASE}/cases/${caseId}?tab=${tab}&controlRoom=1`;
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await page.goto(href, { waitUntil: "domcontentloaded", timeout: 240_000 });
      // Prefer waiting after navigation so a failed attempt cannot leave a dangling waiter.
      await page
        .waitForResponse(
          (res) =>
            res.url().includes(`/api/criminal/${caseId}/bundle-source`) && res.status() === 200,
          { timeout: 300_000 },
        )
        .catch(() => undefined);
      await page.waitForLoadState("networkidle", { timeout: 120_000 }).catch(() => undefined);
      await page.waitForTimeout(5000);
      return href;
    } catch (error) {
      lastError = error;
      await page.waitForTimeout(2500 * attempt);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`openTab failed: ${href}`);
}

function leftWorkspaceBoot(body: string): boolean {
  return (
    body.trim().length > 80 &&
    !/Loading workspace/i.test(body) &&
    !/Analysing bundle for offence/i.test(body) &&
    !/Loading disclosure chase tracker/i.test(body)
  );
}

async function waitForScreenSignals(
  page: Page,
  opts: {
    mode: "applied" | "unsupported";
    tab: string;
    mustChase: readonly string[];
  },
): Promise<string> {
  const deadline = Date.now() + 240_000;
  let body = "";
  while (Date.now() < deadline) {
    body = await page.locator("body").innerText();
    if (!leftWorkspaceBoot(body)) {
      await sleep(2000);
      continue;
    }
    if (opts.mode === "unsupported") {
      // Every tab must carry the unsupported warning — not only Chase.
      if (/could not be read this way/i.test(body)) return body;
    } else if (opts.mustChase.every((label) => hasLabel([body], label))) {
      // Overview, Court (today), and Chase must each show the schedule chase labels.
      return body;
    }
    await sleep(2000);
  }
  throw new Error(
    `screen signals not visible for ${opts.tab} within timeout; bodyPreview=${body.slice(0, 800)}`,
  );
}

async function captureTabScreenshot(page: Page, shotPath: string): Promise<void> {
  await page.evaluate(() => {
    const style = document.createElement("style");
    style.textContent = "* { font-family: Arial, Helvetica, sans-serif !important; }";
    document.head.appendChild(style);
  }).catch(() => undefined);
  await page.evaluate(() => document.fonts.ready).catch(() => undefined);
  await page.screenshot({ path: shotPath, fullPage: true, timeout: 120_000 });
  if (!fs.existsSync(shotPath) || fs.statSync(shotPath).size < 1000) {
    throw new Error(`screenshot missing or too small: ${shotPath}`);
  }
}

function killDevServer(child: ChildProcess | null): void {
  if (!child?.pid) return;
  try {
    if (process.platform === "win32") {
      execSync(`taskkill /PID ${child.pid} /T /F`, { stdio: "ignore" });
    } else {
      process.kill(child.pid, "SIGTERM");
    }
  } catch {
    // ignore
  }
}

async function main() {
  loadEnv();
  const skipSeed = process.argv.includes("--skip-seed");
  const manifestPath = path.join(OUT, "CASES.json");
  fs.mkdirSync(OUT, { recursive: true });

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing Supabase env (load from hub .env.local)");
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  const gitHead = execSync("git rev-parse HEAD", { cwd: ROOT, encoding: "utf8" }).trim();

  let seeded: Array<{
    key: string;
    caseId: string;
    documentId: string;
    pdfPath: string;
    pdfSha256: string;
    mode: "applied" | "unsupported";
  }> = [];

  const browser = await chromium.launch({ headless: HEADLESS });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const { userId, orgId } = await signIn(context);

  if (!skipSeed || !fs.existsSync(manifestPath)) {
    for (const item of CASES) {
      if (!fs.existsSync(item.pdfPath)) throw new Error(`Missing PDF ${item.pdfPath}`);
      const row = await seedCase({
        orgId,
        userId,
        title: item.title,
        pdfPath: item.pdfPath,
      });
      seeded.push({
        key: item.key,
        caseId: row.caseId,
        documentId: row.documentId,
        pdfPath: item.pdfPath,
        pdfSha256: row.pdfSha256,
        mode: "applied",
      });
    }
    const unsupported = await seedCase({
      orgId,
      userId,
      title: "Schedule chase lab — unsupported flat text",
      pdfPath: CASES[0].pdfPath,
      textOnly: true,
    });
    seeded.push({
      key: "UNSUPPORTED",
      caseId: unsupported.caseId,
      documentId: unsupported.documentId,
      pdfPath: CASES[0].pdfPath,
      pdfSha256: unsupported.pdfSha256,
      mode: "unsupported",
    });
    fs.writeFileSync(manifestPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), seeded }, null, 2)}\n`);
  } else {
    seeded = (JSON.parse(fs.readFileSync(manifestPath, "utf8")) as { seeded: typeof seeded }).seeded;
  }

  const env = {
    ...process.env,
    CASEBRAIN_SCHEDULE_CHASE_LAB: "1",
    PORT: String(PORT),
    NODE_OPTIONS: [process.env.NODE_OPTIONS, "--max-old-space-size=8192"].filter(Boolean).join(" "),
    NEXT_PUBLIC_CRIMINAL_PILOT_MODE: process.env.NEXT_PUBLIC_CRIMINAL_PILOT_MODE ?? "1",
  };
  let child: ChildProcess | null = null;
  if (HOSTED_PROOF) {
    console.log("using hosted preview", BASE);
  } else {
    // Production server: avoids Next-dev compile stalls during PDF-heavy bundle-source.
    const skipBuild =
      process.argv.includes("--skip-build") && fs.existsSync(path.join(ROOT, ".next", "BUILD_ID"));
    if (!skipBuild) {
      console.log("building copy for logged-in proof…");
      execSync("npx next build", { cwd: ROOT, env, stdio: "inherit" });
    } else {
      console.log("reusing existing .next build (--skip-build)");
    }
    if (process.platform === "win32") {
      try {
        execSync(
          `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${PORT} -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"`,
          { stdio: "ignore" },
        );
      } catch {
        // ignore
      }
    }
    const serverLog = path.join(OUT, "next-start.log");
    const serverLogFd = fs.openSync(serverLog, "w");
    child = spawn(
      process.platform === "win32" ? "npx.cmd" : "npx",
      ["next", "start", "-H", "127.0.0.1", "-p", String(PORT)],
      {
        cwd: ROOT,
        env,
        stdio: ["ignore", serverLogFd, serverLogFd],
        shell: process.platform === "win32",
      },
    );
    child.on("exit", (code, signal) => {
      console.log("next start exited", { code, signal, serverLog });
    });
  }

  const results: Record<string, unknown>[] = [];
  try {
    await waitForServer(`${BASE}/`);
    // Re-sign after server up (cookies already on context)
    const page = await context.newPage();
    const cookies = await context.cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
    console.log("proof cases", seeded.length, "org", orgId, "email", EMAIL);

    for (const seededCase of seeded) {
      const expect = CASES.find((c) => c.key === seededCase.key);
      console.log("case start", seededCase.key, seededCase.caseId);
      let api: Awaited<ReturnType<typeof fetchBundle>>;
      try {
        api = await fetchBundle(seededCase.caseId, cookieHeader);
        console.log(
          "api ok",
          seededCase.key,
          "status",
          api.status,
          "chase",
          api.json.data?.surfaces?.disclosureChase?.items?.length ??
            api.json.data?.canonical?.chaseLabels?.length ??
            0,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(seededCase.key, "API_FAIL", message.slice(0, 200));
        results.push({
          key: seededCase.key,
          caseId: seededCase.caseId,
          mode: seededCase.mode,
          apiPass: false,
          browserTabsOk: false,
          apiError: message,
          proofKind: "authenticated-api-plus-browser",
        });
        await sleep(5000);
        continue;
      }
      await sleep(2000);
      try {
        await ensureReviewConfirmed(seededCase.caseId, cookieHeader);
        console.log("review confirmed", seededCase.key);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(seededCase.key, "REVIEW_FAIL", message.slice(0, 240));
        results.push({
          key: seededCase.key,
          caseId: seededCase.caseId,
          mode: seededCase.mode,
          apiPass: false,
          browserTabsOk: false,
          reviewError: message,
          proofKind: "authenticated-api-plus-browser",
        });
        await sleep(3000);
        continue;
      }
      const lab = api.json.data?.canonical?.scheduleChaseLab ?? null;
      const chaseLabels =
        api.json.data?.surfaces?.disclosureChase?.items?.map((i) => i.label) ??
        api.json.data?.canonical?.chaseLabels ??
        [];
      const limitations = api.json.data?.surfaces?.composedProse?.limitations ?? [];
      const cps = api.json.data?.surfaces?.composedProse?.cpsChase ?? null;

      const sourceId = lab?.sourceDocumentId ?? null;
      const sourceName = lab?.sourceDocumentName ?? null;
      const apiChecks = {
        httpOk: api.status === 200 && api.json.ok === true,
        labEnabled: lab?.enabled !== false && lab != null,
        applied:
          seededCase.mode === "applied"
            ? lab?.applied === true && lab.unsupportedInput === false
            : lab?.unsupportedInput === true && lab.applied === false,
        cpsHeld: cps == null && lab?.cpsChaseHeld === true,
        sourceReceiptOk:
          seededCase.mode !== "applied" ||
          (Boolean(sourceId) &&
            Boolean(sourceName) &&
            sourceId === seededCase.documentId),
        mustChaseOk:
          seededCase.mode !== "applied" ||
          !expect ||
          expect.mustChase.every((label) => hasLabel(chaseLabels, label)),
        mustNotChaseOk:
          seededCase.mode !== "applied" ||
          !expect ||
          expect.mustNotChase.every((label) => !hasLabel(chaseLabels, label)),
        uploadOk:
          seededCase.mode !== "applied" ||
          !expect?.expectUpload ||
          Boolean(lab?.uploadLimitations?.some((r) => hasLabel([r.item], expect.expectUpload!))) ||
          limitations.some((line) => hasLabel([line], expect.expectUpload!)),
        conflictOk:
          seededCase.mode !== "applied" ||
          !expect?.expectConflict ||
          (lab?.conflicts?.length ?? 0) >= 1 ||
          limitations.some((line) => /Unresolved schedule conflict/i.test(line)),
        unsupportedVisible:
          seededCase.mode !== "unsupported" ||
          Boolean(lab?.unsupportedReason?.includes("could not be read this way")),
        // Surfaces must actually carry chase items — canonical chaseLabels alone is not enough for UI.
        surfacesChaseOk:
          seededCase.mode !== "applied" ||
          ((api.json.data?.surfaces?.disclosureChase?.items?.length ?? 0) >=
            (expect?.mustChase.length ?? 1)),
        surfacesUnsupportedOk:
          seededCase.mode !== "unsupported" ||
          Boolean(api.json.data?.surfaces?.disclosureChase?.disclosureSummary),
      };

      const screens: Record<string, string> = {};
      const tabBodies: Record<string, string> = {};
      const tabErrors: Record<string, string> = {};
      const requiredTabs = ["overview", "today", "disclosure-chase"] as const;
      for (const tab of requiredTabs) {
        const href = `${BASE}/cases/${seededCase.caseId}?tab=${tab}&controlRoom=1`;
        try {
          await openTab(page, seededCase.caseId, tab);
          const mustChase = expect?.mustChase ?? [];
          const body = await waitForScreenSignals(page, {
            mode: seededCase.mode,
            tab,
            mustChase,
          });
          tabBodies[tab] = body.slice(0, 4000);
          const shot = path.join(OUT, `${seededCase.key}-${tab}.png`);
          await captureTabScreenshot(page, shot);
          screens[tab] = shot;

          // Overview + Court + Chase: same schedule labels / unsupported warning as the API.
          const visibleChase =
            seededCase.mode !== "applied" || mustChase.every((label) => hasLabel([body], label));
          const visibleUnsupported =
            seededCase.mode !== "unsupported" || /could not be read this way/i.test(body);
          if (!visibleChase) {
            throw new Error(`${seededCase.key}/${tab}: chase labels not visible on screen`);
          }
          if (!visibleUnsupported) {
            throw new Error(`${seededCase.key}/${tab}: unsupported warning not visible on screen`);
          }
          if (expect?.expectUpload) {
            if (!hasLabel([body], expect.expectUpload) || !/Upload limitation/i.test(body)) {
              throw new Error(
                `${seededCase.key}/${tab}: upload limitation not visible for ${expect.expectUpload}`,
              );
            }
          }
          if (expect?.expectConflict) {
            if (!/Unresolved schedule conflict/i.test(body)) {
              throw new Error(`${seededCase.key}/${tab}: schedule conflict not visible on screen`);
            }
          }
          if (expect?.mustNotChase?.length) {
            // Chase cards may not list suppressed items as outstanding; notes may still name them.
            const cardRegion = (body.split(/SCHEDULE CHASE NOTES|Schedule chase notes/i)[0] ?? body)
              .split(/GUARDRAILS|Do not overstate/i)[0] ?? body;
            for (const label of expect.mustNotChase) {
              if (
                hasLabel([cardRegion], label) &&
                /OUTSTANDING|Needs chase|TOP CHASE/i.test(cardRegion) &&
                !/Upload limitation|Unresolved schedule conflict/i.test(cardRegion)
              ) {
                throw new Error(
                  `${seededCase.key}/${tab}: must-not-chase item visible as outstanding chase: ${label}`,
                );
              }
            }
          }
          if (seededCase.mode === "unsupported") {
            if (!/could not be read this way/i.test(body)) {
              throw new Error(`${seededCase.key}/${tab}: unsupported schedule warning not visible`);
            }
            // Unsupported must never present a confirmed-clean board beside the warning.
            if (
              /No chase board needed|No outstanding attention items on this extract|does not state a named gap/i.test(
                body,
              )
            ) {
              throw new Error(
                `${seededCase.key}/${tab}: unsupported false-clear wording still visible on screen`,
              );
            }
            if (tab === "overview" && !/Schedule chase review required|review required/i.test(body)) {
              throw new Error(`${seededCase.key}/${tab}: unsupported review-required state not visible`);
            }
          }
          if (seededCase.key === "VALE" && expect) {
            // Schedule "phone extraction report" must not be broadened to full-download playbook wording.
            if (/Full phone download\s*\/\s*source extraction/i.test(body)) {
              throw new Error(
                `${seededCase.key}/${tab}: phone extraction report remapped to Full phone download / source extraction`,
              );
            }
            if (/phone extraction source material remains outstanding/i.test(body)) {
              throw new Error(
                `${seededCase.key}/${tab}: phone extraction report remapped to phone extraction source material`,
              );
            }
            if (tab === "disclosure-chase") {
              const phoneCard = body.includes("phone extraction report")
                ? body.slice(body.indexOf("phone extraction report"))
                : body;
              if (
                !/Please provide phone extraction report/i.test(phoneCard) ||
                !/court to record that phone extraction report remains outstanding/i.test(phoneCard)
              ) {
                throw new Error(
                  `${seededCase.key}/${tab}: phone extraction report missing from draft/court wording`,
                );
              }
            }
          }
          if (tab === "disclosure-chase" && !/CPS chase letter held/i.test(body)) {
            throw new Error(`${seededCase.key}/${tab}: CPS chase hold not visible`);
          }
          results.push({
            key: seededCase.key,
            caseId: seededCase.caseId,
            tab,
            href,
            screenshot: shot,
            screenshotBytes: fs.statSync(shot).size,
            visibleChase,
            visibleUnsupported,
            proofKind: "real-browser-playwright",
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          tabErrors[tab] = message;
          results.push({
            key: seededCase.key,
            caseId: seededCase.caseId,
            tab,
            href,
            screenshot: screens[tab] ?? null,
            visibleChase: false,
            visibleUnsupported: false,
            tabError: message,
            proofKind: "real-browser-playwright",
          });
          console.warn(seededCase.key, tab, "TAB_FAIL", message.slice(0, 240));
        }
        await sleep(4000);
      }

      const screensComplete = requiredTabs.every(
        (tab) => Boolean(screens[tab]) && fs.existsSync(screens[tab]!) && fs.statSync(screens[tab]!).size >= 1000,
      );
      const browserTabsOk = Object.keys(tabErrors).length === 0 && screensComplete;
      const apiPass = Object.values(apiChecks).every(Boolean);
      results.push({
        key: seededCase.key,
        caseId: seededCase.caseId,
        documentId: seededCase.documentId,
        mode: seededCase.mode,
        pdfSha256: seededCase.pdfSha256,
        ownership: { email: EMAIL, userId, orgId, caseId: seededCase.caseId },
        apiChecks,
        apiPass,
        chaseLabels,
        sourceDocumentId: sourceId,
        sourceDocumentName: sourceName,
        limitations: limitations.filter((line) =>
          /schedule|not in this copy|CPS chase|could not be read|Upload limitation|Unresolved/i.test(line),
        ),
        cpsChase: cps,
        lab,
        screens,
        tabBodyPreview: tabBodies,
        tabErrors,
        screensComplete,
        browserTabsOk,
        proofKind: "authenticated-api-plus-browser",
      });
      console.log(
        seededCase.key,
        apiPass && browserTabsOk ? "PASS" : "FAIL",
        "api",
        apiPass,
        "browser",
        browserTabsOk,
        "chase",
        chaseLabels.length,
        "unsupported",
        lab?.unsupportedInput,
      );
      await sleep(5000);
    }

    await page.close();
  } finally {
    killDevServer(child);
    child = null;
    await browser.close().catch(() => undefined);
  }

  const caseResults = results.filter((row) => "apiPass" in row);
  const pack = {
    generatedAt: new Date().toISOString(),
    copyRoot: ROOT,
    gitHead,
    baseUrl: BASE,
    email: EMAIL,
    orgId,
    labEnv: "CASEBRAIN_SCHEDULE_CHASE_LAB=1",
    proofKinds: {
      realBrowser: "Playwright against /cases/{id}?tab=overview|today|disclosure-chase with auth cookie",
      htmlFetchHarness:
        "Not this pack — see COPY-SCREEN-ACCEPTANCE.json (unauthenticated fixture HTML fetch)",
    },
    storeNote: "Learning stores were not modified by this proof.",
    summary: {
      cases: caseResults.length,
      passed: caseResults.filter((row) => row.apiPass === true && row.browserTabsOk === true)
        .length,
      failed: caseResults
        .filter((row) => row.apiPass !== true || row.browserTabsOk !== true)
        .map((row) => row.key),
      apiPassed: caseResults.filter((row) => row.apiPass === true).length,
      browserPassed: caseResults.filter((row) => row.browserTabsOk === true).length,
    },
    gate:
      caseResults.length > 0 &&
      caseResults.every((row) => row.apiPass === true && row.browserTabsOk === true)
        ? "logged-in-schedule-chase-holds"
        : "stop",
    results,
    startCopy: {
      command: `$env:CASEBRAIN_SCHEDULE_CHASE_LAB="1"; npm run dev -- --port ${PORT}`,
      casesManifest: manifestPath,
    },
  };
  const outFile = path.join(OUT, "LOGGED-IN-ACCEPTANCE.json");
  fs.writeFileSync(outFile, `${JSON.stringify(pack, null, 2)}\n`, "utf8");

  const hashTargets = [
    "scripts/pattern-brain-schedule-chase-logged-in-proof.ts",
    "lib/criminal/schedule-chase-owned-column-pages.ts",
    "lib/criminal/schedule-chase-lab.ts",
    "lib/criminal/schedule-chase-lab-types.ts",
    "lib/criminal/authenticated-matter-canonical.ts",
    "lib/criminal/canonical-live-surface-adapter.ts",
    "lib/criminal/schedule-chase-client.ts",
    "lib/criminal/demo-presentation-polish.ts",
    "lib/criminal/disclosure-chase-finalize.ts",
    "app/api/criminal/[caseId]/bundle-source/route.ts",
    "components/criminal/disclosure-chase/DisclosureChase.tsx",
    "components/criminal/hearing-war-room/HearingWarRoom.tsx",
    "components/criminal/workflow/PilotTodayDashboard.tsx",
    "components/criminal/workflow/PilotSummaryView.tsx",
    "components/criminal/demo-shell/DemoOverviewView.tsx",
    "components/criminal/demo-shell/DemoOverviewCanvas.tsx",
    "components/criminal/workflow/useMatterBrief.ts",
    outFile,
    manifestPath,
  ];
  const codeHashes: Record<string, string> = {};
  for (const rel of hashTargets) {
    const abs = path.isAbsolute(rel) ? rel : path.join(ROOT, rel);
    if (fs.existsSync(abs)) codeHashes[path.relative(ROOT, abs).replace(/\\/g, "/")] = sha256File(abs);
  }
  const shotHashes: Record<string, string> = {};
  for (const row of caseResults) {
    const screens = (row.screens ?? {}) as Record<string, string>;
    for (const [tab, shot] of Object.entries(screens)) {
      if (shot && fs.existsSync(shot)) {
        shotHashes[`${row.key}-${tab}.png`] = sha256File(shot);
      }
    }
  }
  const evidence = {
    generatedAt: new Date().toISOString(),
    gate: pack.gate,
    gitHead,
    email: EMAIL,
    orgId,
    userId,
    storeNote: "Learning stores were not modified by this proof.",
    codeHashes,
    screenshotHashes: shotHashes,
    acceptance: outFile,
    replay: [
      `cd ${ROOT}`,
      `$env:CASEBRAIN_SCHEDULE_CHASE_LAB="1"`,
      `npx tsx scripts/pattern-brain-schedule-chase-logged-in-proof.ts`,
      `# or reuse seeded cases: npx tsx scripts/pattern-brain-schedule-chase-logged-in-proof.ts --skip-seed`,
    ],
  };
  const evidenceFile = path.join(OUT, "LOGGED-IN-EVIDENCE.json");
  fs.writeFileSync(evidenceFile, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");

  console.log(JSON.stringify(pack.summary, null, 2));
  console.log(outFile);
  console.log(evidenceFile);
  if (pack.gate !== "logged-in-schedule-chase-holds") process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
