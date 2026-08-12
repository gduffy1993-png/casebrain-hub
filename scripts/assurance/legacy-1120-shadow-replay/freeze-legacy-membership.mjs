import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";

const REPO_ROOT = process.cwd();
const ENV_FILE = process.env.CASEBRAIN_ENV_FILE || "C:/Users/gduff/casebrain-hub/.env.local";
const ARTEFACT_ROOT = path.join(
  REPO_ROOT,
  "artifacts/casebrain-qa/assurance/master-auditor-v2/legacy-1120-shadow-replay",
);
const FULL_MANIFEST = path.join(ARTEFACT_ROOT, "local-private-frozen-membership.json");
const PUBLIC_SUMMARY = path.join(ARTEFACT_ROOT, "FROZEN-MEMBERSHIP-SUMMARY.json");
const USER_ID = "63ccc8dc-842e-49b5-9aa9-dcff8f55eb10";
const USER_EMAIL = "gduffy1993@gmail.com";
const CHECKPOINTS = new Set([5, 20, 100, 300, 600, 1000, 1120]);

const requireFromRepo = createRequire("C:/Users/gduff/casebrain-hub/package.json");
const { createClient } = requireFromRepo("@supabase/supabase-js");

function loadEnv(file) {
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (!(match[1] in process.env)) process.env[match[1]] = value;
  }
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function chunks(values, size) {
  const out = [];
  for (let index = 0; index < values.length; index += size) out.push(values.slice(index, index + size));
  return out;
}

function parseStorageRef(storageUrl) {
  const raw = String(storageUrl || "").replace(/^\/+/, "");
  const slash = raw.indexOf("/");
  if (slash <= 0 || slash === raw.length - 1) return null;
  return { bucket: raw.slice(0, slash), objectPath: raw.slice(slash + 1) };
}

async function paged(queryFactory, pageSize = 500) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await queryFactory(from, from + pageSize - 1);
    if (error) throw new Error(error.message || "Supabase query failed");
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

async function downloadAndHash(ref) {
  if (!ref) return { status: "invalid_storage_reference", httpStatus: null, bytes: 0, sha256: null, pdfMagic: false };
  const encodedPath = ref.objectPath.split("/").map(encodeURIComponent).join("/");
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/authenticated/${encodeURIComponent(ref.bucket)}/${encodedPath}`;
  const response = await fetch(url, {
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  if (!response.ok || !response.body) {
    return { status: "unavailable", httpStatus: response.status, bytes: 0, sha256: null, pdfMagic: false };
  }
  const hash = crypto.createHash("sha256");
  let bytes = 0;
  let prefix = Buffer.alloc(0);
  for await (const chunk of response.body) {
    const buffer = Buffer.from(chunk);
    if (prefix.length < 5) prefix = Buffer.concat([prefix, buffer.subarray(0, 5 - prefix.length)]);
    hash.update(buffer);
    bytes += buffer.length;
  }
  return {
    status: "retrieved",
    httpStatus: response.status,
    bytes,
    sha256: hash.digest("hex"),
    pdfMagic: prefix.toString("ascii") === "%PDF-",
  };
}

loadEnv(ENV_FILE);
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Supabase admin environment is unavailable");
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const cases = await paged((from, to) => supabase
  .from("cases")
  .select("id,org_id,title,practice_area,created_at,is_archived,eval_pack_id,eval_pack_name,eval_case_no")
  .eq("created_by", USER_ID)
  .order("created_at", { ascending: true })
  .range(from, to));

const documents = [];
for (const caseChunk of chunks(cases.map((row) => row.id), 25)) {
  const { data, error } = await supabase
    .from("documents")
    .select("id,case_id,org_id,name,type,storage_url,storage_path,raw_text,extracted_text,created_at")
    .in("case_id", caseChunk);
  if (error) throw new Error(error.message || "Document query failed");
  documents.push(...(data || []));
}

const docsByCase = new Map();
for (const doc of documents) {
  if (!docsByCase.has(doc.case_id)) docsByCase.set(doc.case_id, []);
  docsByCase.get(doc.case_id).push(doc);
}

fs.mkdirSync(ARTEFACT_ROOT, { recursive: true });
const rows = [];
let nextIndex = 0;
const concurrency = 4;

async function worker() {
  while (true) {
    const index = nextIndex++;
    if (index >= cases.length) return;
    const caseRow = cases[index];
    const caseDocuments = docsByCase.get(caseRow.id) || [];
    const docRows = [];
    for (const doc of caseDocuments) {
      const sourceText = doc.raw_text || doc.extracted_text || "";
      const storageRef = parseStorageRef(doc.storage_path || doc.storage_url);
      const object = await downloadAndHash(storageRef);
      docRows.push({
        documentId: doc.id,
        name: doc.name,
        type: doc.type,
        storageRef,
        storedSourceTextBytes: Buffer.byteLength(sourceText),
        storedSourceTextSha256: sha256(sourceText),
        object,
      });
    }
    rows[index] = {
      sequence: index + 1,
      caseId: caseRow.id,
      organisationId: caseRow.org_id,
      title: caseRow.title,
      practiceArea: caseRow.practice_area,
      createdAt: caseRow.created_at,
      archived: !!caseRow.is_archived,
      evalPackId: caseRow.eval_pack_id,
      evalPackName: caseRow.eval_pack_name,
      evalCaseNo: caseRow.eval_case_no,
      documents: docRows,
    };
    const completed = rows.filter(Boolean).length;
    if (CHECKPOINTS.has(completed)) process.stdout.write(`${JSON.stringify({ checkpoint: completed, total: cases.length })}\n`);
  }
}

await Promise.all(Array.from({ length: concurrency }, () => worker()));

const orderedMembershipRows = rows.map((row) => ({
  sequence: row.sequence,
  caseId: row.caseId,
  organisationId: row.organisationId,
  documents: row.documents.map((doc) => ({
    documentId: doc.documentId,
    storedSourceTextSha256: doc.storedSourceTextSha256,
    objectSha256: doc.object.sha256,
    objectBytes: doc.object.bytes,
    objectStatus: doc.object.status,
  })),
}));
const orderedMembershipSha256 = sha256(stableJson(orderedMembershipRows));
const retrieved = rows.flatMap((row) => row.documents).filter((doc) => doc.object.status === "retrieved");
const pdfMagicOk = retrieved.filter((doc) => doc.object.pdfMagic);
const unavailable = rows.flatMap((row) => row.documents).filter((doc) => doc.object.status !== "retrieved");
const uniqueObjectHashes = new Set(retrieved.map((doc) => doc.object.sha256));
const totalBytes = retrieved.reduce((sum, doc) => sum + doc.object.bytes, 0);
const generatedAt = new Date().toISOString();

const fullManifest = {
  schemaVersion: "legacy-1120-frozen-membership@1.0.0",
  generatedAt,
  authority: {
    userId: USER_ID,
    email: USER_EMAIL,
    readOnly: true,
    passwordAccessed: false,
    databaseRowsChanged: false,
  },
  orderedMembershipSha256,
  rows,
};
fs.writeFileSync(FULL_MANIFEST, `${JSON.stringify(fullManifest, null, 2)}\n`);

const summary = {
  schemaVersion: "legacy-1120-frozen-membership-summary@1.0.0",
  generatedAt,
  accountEmail: USER_EMAIL,
  caseCount: rows.length,
  uniqueCaseIds: new Set(rows.map((row) => row.caseId)).size,
  documentCount: rows.flatMap((row) => row.documents).length,
  retrievedObjectCount: retrieved.length,
  unavailableObjectCount: unavailable.length,
  pdfMagicOkCount: pdfMagicOk.length,
  totalRetrievedBytes: totalBytes,
  uniqueObjectHashes: uniqueObjectHashes.size,
  exactDuplicateObjectCount: retrieved.length - uniqueObjectHashes.size,
  orderedMembershipSha256,
  privateManifestSha256: sha256(fs.readFileSync(FULL_MANIFEST)),
  unavailable: unavailable.map((doc) => ({ documentId: doc.documentId, status: doc.object.status, httpStatus: doc.object.httpStatus })),
  claims: {
    originalStorageObjectsRetrievedAndHashed: unavailable.length === 0,
    pdfMagicVerified: retrieved.length > 0 && retrieved.length === pdfMagicOk.length,
    applicationReplayExecuted: false,
    programmePass: false,
  },
};
fs.writeFileSync(PUBLIC_SUMMARY, `${JSON.stringify(summary, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
