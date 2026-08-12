#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createServerClient } from "@supabase/ssr";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.split("=");
    return [key.replace(/^--/, ""), rest.join("=")];
  }),
);

const baseUrl = String(args.get("base-url") ?? "").replace(/\/$/, "");
const outputPath = resolve(String(args.get("output") ?? "artifacts/authenticated-preview-smoke.json"));
const supabaseUrl = process.env.CASEBRAIN_QA_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.CASEBRAIN_QA_SUPABASE_ANON_KEY?.trim();
const email = process.env.CASEBRAIN_QA_EMAIL?.trim();
const password = process.env.CASEBRAIN_QA_PASSWORD;

if (!baseUrl.startsWith("https://")) throw new Error("--base-url must be an https URL");
if (!supabaseUrl || !supabaseAnonKey || !email || !password) {
  throw new Error(
    "Set CASEBRAIN_QA_SUPABASE_URL, CASEBRAIN_QA_SUPABASE_ANON_KEY, CASEBRAIN_QA_EMAIL and CASEBRAIN_QA_PASSWORD",
  );
}

const sha256 = (value) => createHash("sha256").update(String(value)).digest("hex");
const cookieJar = new Map();
const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
  cookies: {
    getAll() {
      return [...cookieJar.entries()].map(([name, value]) => ({ name, value }));
    },
    setAll(cookies) {
      for (const cookie of cookies) {
        if (!cookie.value || cookie.options?.maxAge === 0) cookieJar.delete(cookie.name);
        else cookieJar.set(cookie.name, cookie.value);
      }
    },
  },
});

const signIn = await supabase.auth.signInWithPassword({ email, password });
if (signIn.error || !signIn.data.user || !signIn.data.session) {
  throw new Error(`QA sign-in failed: ${signIn.error?.message ?? "session unavailable"}`);
}

const cookieHeader = () =>
  [...cookieJar.entries()].map(([name, value]) => `${name}=${value}`).join("; ");

async function fetchReceipt(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    redirect: "manual",
    ...options,
    headers: {
      Cookie: cookieHeader(),
      Accept: "application/json,text/html;q=0.9,*/*;q=0.8",
      ...(options.headers ?? {}),
    },
  });
  const contentType = response.headers.get("content-type") ?? "";
  const body = await response.text();
  const location = response.headers.get("location");
  return {
    path,
    status: response.status,
    ok: response.ok,
    contentType: contentType.split(";")[0],
    redirectedToSignIn: Boolean(location?.includes("/sign-in")),
    bodyBytes: Buffer.byteLength(body),
    bodySha256: sha256(body),
    parsed: contentType.includes("application/json") && body ? JSON.parse(body) : null,
  };
}

const trial = await fetchReceipt("/api/trial-status");
const casesResponse = await fetchReceipt("/api/cases");
const cases = Array.isArray(casesResponse.parsed?.cases) ? casesResponse.parsed.cases : [];

const caseReceipts = [];
for (const caseRow of cases) {
  const caseId = String(caseRow?.id ?? "");
  if (!caseId) continue;
  const [page, detail, documents, analysis, bundleOverview] = await Promise.all([
    fetchReceipt(`/cases/${encodeURIComponent(caseId)}?tab=overview&controlRoom=1`),
    fetchReceipt(`/api/cases/${encodeURIComponent(caseId)}`),
    fetchReceipt(`/api/cases/${encodeURIComponent(caseId)}/documents`),
    fetchReceipt(`/api/cases/${encodeURIComponent(caseId)}/analysis/version/latest`),
    fetchReceipt(`/api/cases/${encodeURIComponent(caseId)}/bundle/overview`),
  ]);
  const documentsRows = Array.isArray(documents.parsed?.documents)
    ? documents.parsed.documents
    : Array.isArray(documents.parsed)
      ? documents.parsed
      : [];
  caseReceipts.push({
    caseIdSha256: sha256(caseId),
    caseListRowSha256: sha256(JSON.stringify(caseRow)),
    documentCount: documentsRows.length,
    endpoints: [page, detail, documents, analysis, bundleOverview].map(
      ({ parsed: _parsed, ...receipt }) => receipt,
    ),
  });
}

const trialPublic = trial.parsed && typeof trial.parsed === "object"
  ? {
      isBlocked: Boolean(trial.parsed.isBlocked),
      reason: trial.parsed.reason ?? null,
      docsUsed: Number.isFinite(trial.parsed.docsUsed) ? trial.parsed.docsUsed : null,
      docsLimit: Number.isFinite(trial.parsed.docsLimit) ? trial.parsed.docsLimit : null,
      casesUsed: Number.isFinite(trial.parsed.casesUsed) ? trial.parsed.casesUsed : null,
      casesLimit: Number.isFinite(trial.parsed.casesLimit) ? trial.parsed.casesLimit : null,
      plan: trial.parsed.plan ?? null,
      daysLeft: Number.isFinite(trial.parsed.daysLeft) ? trial.parsed.daysLeft : null,
    }
  : null;

const endpointRows = caseReceipts.flatMap((row) => row.endpoints);
const receipt = {
  schemaVersion: "casebrain-authenticated-preview-smoke@1.0.0",
  generatedAt: new Date().toISOString(),
  baseUrl,
  authenticated: signIn.data.user.email?.toLowerCase() === email.toLowerCase(),
  authenticatedUserSha256: sha256(signIn.data.user.id),
  sessionSecretsPersisted: false,
  sourceMutationAttempted: false,
  qaWorkspaceOnly: true,
  trial: {
    ...trialPublic,
    endpoint: (({ parsed: _parsed, ...value }) => value)(trial),
  },
  caseList: {
    count: cases.length,
    endpoint: (({ parsed: _parsed, ...value }) => value)(casesResponse),
  },
  caseReceipts,
  aggregate: {
    casesChecked: caseReceipts.length,
    totalDocumentsObserved: caseReceipts.reduce((sum, row) => sum + row.documentCount, 0),
    endpointChecks: endpointRows.length,
    endpoint2xx: endpointRows.filter((row) => row.ok).length,
    endpointRedirectedToSignIn: endpointRows.filter((row) => row.redirectedToSignIn).length,
    endpointNon2xx: endpointRows.filter((row) => !row.ok).length,
  },
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
console.log(
  JSON.stringify({
    outputPath,
    authenticated: receipt.authenticated,
    caseCount: receipt.caseList.count,
    trial: trialPublic,
    aggregate: receipt.aggregate,
  }),
);
