#!/usr/bin/env npx tsx
/**
 * Sealed held-out proof: original PDF bytes → POST /api/upload → bundle-source
 * surfaces / Overview identity. Expected answers stay in truth/ and are opened
 * only after candidate freeze.
 *
 * This does not seed extracted_text. It does not restore template text.
 * Hosted preview is used when SEALED_PROOF_BASE_URL is set; otherwise local next.
 *
 * Run from the isolated worktree:
 *   npx tsx scripts/sealed-heldout-upload-to-screen.ts
 */
import { createHash, randomUUID } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { PDFDocument, StandardFonts } from "pdf-lib";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "artifacts", "sealed-heldout");
const SOURCE = path.join(OUT, "source");
const TRUTH = path.join(OUT, "truth");
const OUTPUT = path.join(OUT, "output");
const CONTROL = path.join(OUT, "control");
const PORT = Number(process.env.SEALED_PROOF_PORT ?? "3017");
const BASE = (process.env.SEALED_PROOF_BASE_URL ?? `http://127.0.0.1:${PORT}`).replace(/\/$/, "");
const PASSWORD = process.env.SMOKE_PASSWORD ?? "ProdSmokeOnly!Jun2026";
const EMAIL =
  process.env.SEALED_PROOF_EMAIL ??
  `sealed-heldout-${randomUUID().slice(0, 8)}@casebrain.qa.smoke`;
const START_LOCAL = !process.env.SEALED_PROOF_BASE_URL;

type SourceManifest = {
  files: Array<{ name: string; sha256: string }>;
};
type TruthRow = {
  file: string;
  kind: "synthetic-original-pdf" | "original-pdf";
  defendant?: string;
  requireSurfaces: true;
};
type FrozenCase = {
  file: string;
  pdfSha256: string;
  caseId: string;
  documentIds: string[];
  extractSha256: string | null;
  surfacesPresent: boolean;
  defendantObserved: string | null;
  chargeObserved: string | null;
  withheld: boolean;
  route: "upload";
};

function loadEnvFrom(file: string) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

function sha256Bytes(bytes: Buffer | string) {
  return createHash("sha256").update(bytes).digest("hex");
}

function waitForHttp(url: string, timeoutMs: number) {
  const start = Date.now();
  return new Promise<void>((resolve, reject) => {
    const tick = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", () => {
        if (Date.now() - start > timeoutMs) reject(new Error(`Server not reachable: ${url}`));
        else setTimeout(tick, 1000);
      });
    };
    tick();
  });
}

async function originalPdfBytes(defendant: string, extraPage: boolean) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const page = pdf.addPage([595, 842]);
  const lines = [
    "Original criminal source paper for extraction review.",
    `R v ${defendant}`,
    `Defendant: ${defendant}`,
    "Charge: Theft",
    "Court: Northchester Magistrates' Court",
    "Next hearing: 22 May 2026 10:00",
    "These papers record identity only. No plea is established.",
  ];
  let y = 780;
  for (const line of lines) {
    page.drawText(line, { x: 48, y, size: 12, font });
    y -= 22;
  }
  if (extraPage) {
    const two = pdf.addPage([595, 842]);
    two.drawText("Continuation page. The original document remains available for review.", {
      x: 48,
      y: 780,
      size: 12,
      font,
    });
  }
  return Buffer.from(await pdf.save());
}

async function prepareSourceAndTruth() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(SOURCE, { recursive: true });
  fs.mkdirSync(TRUTH, { recursive: true });
  fs.mkdirSync(OUTPUT, { recursive: true });
  fs.mkdirSync(CONTROL, { recursive: true });

  const names = ["Person Alpha", "Person Bravo", "Person Charlie", "Person Delta", "Person Echo", "Person Foxtrot"];
  const truth: TruthRow[] = [];
  const manifest: SourceManifest = { files: [] };

  for (let i = 0; i < names.length; i++) {
    const file = `heldout-${i + 1}.pdf`;
    const bytes = await originalPdfBytes(names[i]!, i % 2 === 1);
    fs.writeFileSync(path.join(SOURCE, file), bytes);
    manifest.files.push({ name: file, sha256: sha256Bytes(bytes) });
    truth.push({ file, kind: "synthetic-original-pdf", defendant: names[i], requireSurfaces: true });
  }

  const monster = path.join(
    ROOT,
    "artifacts",
    "casebrain-qa",
    "assurance",
    "f167-surgical-truth-v1",
    "_source",
    "CB-MONSTER-2026-0001.pdf",
  );
  if (fs.existsSync(monster)) {
    const file = "CB-MONSTER-2026-0001.pdf";
    const bytes = fs.readFileSync(monster);
    fs.writeFileSync(path.join(SOURCE, file), bytes);
    manifest.files.push({ name: file, sha256: sha256Bytes(bytes) });
    truth.push({ file, kind: "original-pdf", requireSurfaces: true });
  }

  fs.writeFileSync(path.join(SOURCE, "manifest.json"), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(TRUTH, "expected.json"), JSON.stringify({ cases: truth }, null, 2));
  return { manifest, truthCount: truth.length };
}

async function ensureUser(email: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const created = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  let userId: string;
  if (created.error || !created.data.user) {
    const listed = await admin.auth.admin.listUsers({ perPage: 200 });
    const existing = listed.data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!existing) throw created.error ?? new Error("createUser failed");
    await admin.auth.admin.updateUserById(existing.id, { password: PASSWORD, email_confirm: true });
    userId = existing.id;
  } else {
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
      .insert({ name: "Sealed held-out QA", email_domain: null, external_ref: externalRef, plan: "pro" })
      .select("id")
      .single();
    if (ins.error || !ins.data?.id) throw ins.error ?? new Error("org insert failed");
    orgId = ins.data.id as string;
    await admin.from("organisation_members").insert({ organisation_id: orgId, user_id: userId, role: "owner" });
  } else {
    await admin.from("organisations").update({ plan: "pro" }).eq("id", orgId);
  }
  return userId;
}

function projectRef(supabaseUrl: string) {
  return new URL(supabaseUrl).hostname.split(".")[0] ?? "project";
}

async function signInCookie(email: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const anon = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const signIn = await anon.auth.signInWithPassword({ email, password: PASSWORD });
  if (signIn.error || !signIn.data.session) throw signIn.error ?? new Error("signIn failed");
  const payload = Buffer.from(JSON.stringify(signIn.data.session)).toString("base64url");
  return `sb-${projectRef(url)}-auth-token=base64-${payload}`;
}

async function uploadPdf(cookie: string, pdfPath: string, title: string) {
  const bytes = fs.readFileSync(pdfPath);
  const form = new FormData();
  form.append(
    "files",
    new File([new Uint8Array(bytes)], path.basename(pdfPath), { type: "application/pdf" }),
  );
  form.append("practiceArea", "criminal");
  form.append("caseTitle", title);
  form.append("uploadMode", "single_case");
  const res = await fetch(`${BASE}/api/upload`, {
    method: "POST",
    headers: { cookie },
    body: form,
  });
  const json = (await res.json()) as {
    caseId?: string;
    documentIds?: string[];
    error?: string;
  };
  if (!res.ok || !json.caseId) {
    throw new Error(`upload failed ${res.status}: ${json.error ?? JSON.stringify(json)}`);
  }
  return json;
}

async function bundleSource(cookie: string, caseId: string) {
  const res = await fetch(`${BASE}/api/criminal/${caseId}/bundle-source`, {
    headers: { cookie, cache: "no-store" },
  });
  const json = (await res.json()) as {
    ok?: boolean;
    data?: {
      combinedTextLength?: number;
      caseMetadata?: { defendantName?: string | null; offenceDisplay?: string | null } | null;
      canonical?: {
        ingestion?: { substantiveOutputsWithheld?: boolean };
        charges?: Array<{ offence?: string | null; particulars?: string | null }>;
      } | null;
      surfaces?: { disclosureChase?: unknown; warRoom?: unknown } | null;
    };
  };
  if (!res.ok || !json.ok || !json.data) {
    throw new Error(`bundle-source failed ${res.status}`);
  }
  return json.data;
}

function startLocalServer(): ChildProcess {
  const envFile = fs.existsSync(path.join(ROOT, ".env.local"))
    ? path.join(ROOT, ".env.local")
    : path.join("C:\\Users\\gduff\\casebrain-hub", ".env.local");
  loadEnvFrom(envFile);
  const child = spawn("npx", ["next", "dev", "--port", String(PORT)], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(PORT),
      // Local sealed proof only: trial CASE_LIMIT is 2 and is independent of plan.
      PAYWALL_MODE: "off",
    },
    stdio: "pipe",
    shell: true,
  });
  child.stdout?.on("data", (chunk) => process.stdout.write(chunk));
  child.stderr?.on("data", (chunk) => process.stderr.write(chunk));
  return child;
}

async function runUploadOnly(): Promise<FrozenCase[]> {
  const manifest = JSON.parse(fs.readFileSync(path.join(SOURCE, "manifest.json"), "utf8")) as SourceManifest;
  const cookie = await signInCookie(EMAIL);
  const frozen: FrozenCase[] = [];
  for (const file of manifest.files) {
    const pdfPath = path.join(SOURCE, file.name);
    const bytes = fs.readFileSync(pdfPath);
    if (sha256Bytes(bytes) !== file.sha256) throw new Error(`source hash mismatch: ${file.name}`);
    const uploaded = await uploadPdf(cookie, pdfPath, `Sealed held-out ${file.name}`);
    const bundle = await bundleSource(cookie, uploaded.caseId!);
    const defendantObserved = bundle.caseMetadata?.defendantName ?? null;
    const chargeObserved =
      bundle.canonical?.charges?.[0]?.offence ?? bundle.caseMetadata?.offenceDisplay ?? null;
    frozen.push({
      file: file.name,
      pdfSha256: file.sha256,
      caseId: uploaded.caseId!,
      documentIds: uploaded.documentIds ?? [],
      extractSha256: bundle.combinedTextLength ? sha256Bytes(String(bundle.combinedTextLength)) : null,
      surfacesPresent: Boolean(bundle.surfaces?.disclosureChase && bundle.surfaces?.warRoom),
      defendantObserved,
      chargeObserved,
      withheld: Boolean(bundle.canonical?.ingestion?.substantiveOutputsWithheld),
      route: "upload",
    });
  }
  fs.writeFileSync(path.join(OUTPUT, "candidates.json"), JSON.stringify(frozen, null, 2));
  return frozen;
}

function freeze(frozen: FrozenCase[]) {
  const freezeReceipt = {
    frozenAt: new Date().toISOString(),
    candidateContentSha256: sha256Bytes(JSON.stringify(frozen)),
    baseUrl: BASE,
    email: EMAIL,
    route: "upload",
    cases: frozen.length,
  };
  fs.writeFileSync(path.join(CONTROL, "freeze.json"), JSON.stringify(freezeReceipt, null, 2));
  return freezeReceipt;
}

function score(frozen: FrozenCase[]) {
  const freezePath = path.join(CONTROL, "freeze.json");
  if (!fs.existsSync(freezePath)) throw new Error("cannot open truth: freeze receipt missing");
  const expected = JSON.parse(fs.readFileSync(path.join(TRUTH, "expected.json"), "utf8")) as {
    cases: TruthRow[];
  };
  const results = expected.cases.map((row) => {
    const got = frozen.find((c) => c.file === row.file);
    const fail: string[] = [];
    if (!got) fail.push("missing_output");
    else {
      if (got.route !== "upload") fail.push("not_upload_route");
      if (got.withheld) fail.push("substantive_withheld");
      if (row.requireSurfaces && !got.surfacesPresent) fail.push("surfaces_missing");
      if (row.defendant) {
        const observed = (got.defendantObserved ?? "").toLowerCase();
        const want = row.defendant.toLowerCase();
        if (!observed || (observed !== want && !observed.includes(want))) {
          fail.push(`defendant_mismatch:${got.defendantObserved ?? "missing"}`);
        }
      }
    }
    return { file: row.file, fail, pass: fail.length === 0 };
  });
  const blocking = results.filter((r) => !r.pass);
  const report = {
    gate: blocking.length === 0 ? "sealed-heldout-upload-to-screen-holds" : "sealed-heldout-upload-to-screen-fails",
    tested: results.length,
    passed: results.filter((r) => r.pass).length,
    failed: blocking.length,
    results,
  };
  fs.writeFileSync(path.join(CONTROL, "SCORE.json"), JSON.stringify(report, null, 2));
  return report;
}

async function main() {
  loadEnvFrom(path.join(ROOT, ".env.local"));
  loadEnvFrom(path.join("C:\\Users\\gduff\\casebrain-hub", ".env.local"));
  if (process.env.SEALED_PROOF_MODE && process.env.SEALED_PROOF_MODE !== "upload-route-only") {
    throw new Error("SEALED_PROOF_MODE must be upload-route-only");
  }
  process.env.SEALED_PROOF_MODE = "upload-route-only";

  const prepared = await prepareSourceAndTruth();
  console.log(`prepared ${prepared.manifest.files.length} original PDFs; truth sealed in ${TRUTH}`);

  let child: ChildProcess | null = null;
  try {
    await ensureUser(EMAIL);
    if (START_LOCAL) {
      child = startLocalServer();
      await waitForHttp(BASE, 180_000);
    }
    const frozen = await runUploadOnly();
    const receipt = freeze(frozen);
    const report = score(frozen);
    const evidence = {
      hostedProof: !START_LOCAL,
      localProof: START_LOCAL,
      baseUrl: BASE,
      freeze: receipt,
      score: report,
      codeHashes: {
        uploadRoute: sha256Bytes(fs.readFileSync(path.join(ROOT, "app/api/upload/route.ts"))),
        bundleSource: sha256Bytes(fs.readFileSync(path.join(ROOT, "app/api/criminal/[caseId]/bundle-source/route.ts"))),
        script: sha256Bytes(fs.readFileSync(path.join(ROOT, "scripts/sealed-heldout-upload-to-screen.ts"))),
      },
    };
    fs.writeFileSync(path.join(CONTROL, "EVIDENCE.json"), JSON.stringify(evidence, null, 2));
    console.log(JSON.stringify(report, null, 2));
    if (report.gate !== "sealed-heldout-upload-to-screen-holds") process.exitCode = 1;
  } finally {
    if (child?.pid) child.kill();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
