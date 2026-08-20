/**
 * READ-ONLY: full cloud PDF SHA-256 census for legacy Solo Workspace org,
 * then merge with local filesystem discovery into one global corpus manifest.
 *
 * Does not mutate DB/storage. Does not run assurance.
 *
 *   npx tsx scripts/assurance/build-global-corpus-manifest-readonly.ts
 *   npx tsx scripts/assurance/build-global-corpus-manifest-readonly.ts --resume
 */
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import {
  appendFileSync,
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT = path.join(
  ROOT,
  "artifacts/casebrain-qa/assurance/master-auditor-v2/master-3000-release-assurance",
);
const LEGACY_USER = "63ccc8dc-842e-49b5-9aa9-dcff8f55eb10";
const LEGACY_ORG = "11f3d373-a6d0-4a58-ac72-59b5365dc367";
const LEGACY_ORG_2 = "1aae6bb0-0324-4ab5-8904-eb44ee1fe829";
const RESUME = process.argv.includes("--resume");

function loadEnv(): void {
  for (const name of [".env.local", ".env"]) {
    const p = path.join(ROOT, name);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#") || !t.includes("=")) continue;
      const i = t.indexOf("=");
      const k = t.slice(0, i).trim();
      const v = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

function sha256Buf(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

async function sha256File(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const h = createHash("sha256");
    const s = createReadStream(filePath);
    s.on("data", (c) => h.update(c));
    s.on("error", reject);
    s.on("end", () => resolve(h.digest("hex")));
  });
}

function cheapPageCountFromBuf(buf: Buffer): number | null {
  const max = Math.min(buf.length, 8 * 1024 * 1024);
  const text = buf.subarray(0, max).toString("latin1");
  const pages = (text.match(/\/Type\s*\/Page(?![s])/g) || []).length;
  return pages > 0 ? pages : null;
}

function readNdjson<T>(p: string): T[] {
  if (!existsSync(p)) return [];
  return readFileSync(p, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => JSON.parse(l) as T);
}

function guessSynthetic(title: string | null | undefined, filename: string | null | undefined): boolean {
  const t = `${title ?? ""} ${filename ?? ""}`;
  return /\b(CB-TEST|CB-TRAP|CB-GOLD|CB-STAGE|CB-MESSY|CB-LEVERAGE|CB-PRESSURE|CB-COLLISION|CB-NOSAFE|CB-VULN|CB-DISC|CB-FOUND|CB-FRESH|NS-CPS|Pack [A-D]|messy-pdf|demo-audit|sim-|synthetic)\b/i.test(
    t,
  );
}

type CloudHashRow = {
  documentId: string;
  caseId: string | null;
  orgId: string | null;
  name: string | null;
  storageUrl: string | null;
  storageObjectPath: string | null;
  sha256: string | null;
  sizeBytes: number | null;
  pageCount: number | null;
  error?: string;
  hashedAt?: string;
};

type LocalUnique = {
  sha256: string;
  copyCount: number;
  sizeBytes: number;
  pageCount: number | null;
  paths: string[];
  originatingCorpusGuess: string | null;
  likelyCaseOrTemplateIds: string[];
  branches: string[];
  worktrees: string[];
};

async function main(): Promise<void> {
  loadEnv();
  mkdirSync(OUT, { recursive: true });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "casebrain-documents";
  if (!url || !service) {
    console.error("Missing Supabase service credentials");
    process.exit(2);
  }

  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  async function withRetries<T>(label: string, fn: () => Promise<T>, attempts = 5): Promise<T> {
    let last: unknown;
    for (let a = 1; a <= attempts; a++) {
      try {
        return await fn();
      } catch (e) {
        last = e;
        const wait = Math.min(30_000, 1000 * 2 ** (a - 1));
        console.warn(`${label} attempt ${a}/${attempts} failed: ${(e as Error).message}; retry in ${wait}ms`);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
    throw last;
  }

  // ---- Load documents: prefer local inventory cache (avoids flaky list queries) ----
  const docs: Array<{
    id: string;
    case_id: string | null;
    org_id: string | null;
    name: string | null;
    storage_url: string | null;
    type: string | null;
  }> = [];
  const cachedDocsPath = path.join(OUT, "legacy-account-storage-documents.ndjson");
  if (existsSync(cachedDocsPath)) {
    for (const row of readNdjson<{
      id: string;
      case_id: string | null;
      org_id: string | null;
      storage_url: string | null;
      name?: string | null;
      type?: string | null;
    }>(cachedDocsPath)) {
      docs.push({
        id: row.id,
        case_id: row.case_id,
        org_id: row.org_id,
        name: row.name ?? (row.storage_url ? path.basename(row.storage_url) : null),
        storage_url: row.storage_url,
        type: row.type ?? "application/pdf",
      });
    }
    console.log(`loaded ${docs.length} documents from local inventory cache`);
  } else {
    for (const orgId of [LEGACY_ORG, LEGACY_ORG_2]) {
      let from = 0;
      for (;;) {
        const page = await withRetries(`documents ${orgId}@${from}`, async () => {
          const { data, error } = await admin
            .from("documents")
            .select("id, case_id, org_id, name, storage_url, type")
            .eq("org_id", orgId)
            .range(from, from + 999);
          if (error) throw new Error(error.message);
          return data ?? [];
        });
        docs.push(...page);
        if (page.length < 1000) break;
        from += 1000;
      }
    }
  }

  // Case titles for grouping — prefer local cache
  const caseMeta = new Map<string, { title: string | null; org_id: string | null }>();
  const cachedCasesPath = path.join(OUT, "legacy-account-storage-cases.ndjson");
  if (existsSync(cachedCasesPath)) {
    for (const row of readNdjson<{
      id: string;
      title: string | null;
      org_id: string | null;
    }>(cachedCasesPath)) {
      caseMeta.set(row.id, { title: row.title, org_id: row.org_id });
    }
    console.log(`loaded ${caseMeta.size} cases from local inventory cache`);
  } else {
    for (const orgId of [LEGACY_ORG, LEGACY_ORG_2]) {
      let from = 0;
      for (;;) {
        const page = await withRetries(`cases ${orgId}@${from}`, async () => {
          const { data, error } = await admin
            .from("cases")
            .select("id, title, org_id")
            .eq("org_id", orgId)
            .range(from, from + 999);
          if (error) throw new Error(error.message);
          return data ?? [];
        });
        for (const c of page) caseMeta.set(c.id, { title: c.title, org_id: c.org_id });
        if (page.length < 1000) break;
        from += 1000;
      }
    }
  }

  const cloudHashPath = path.join(OUT, "cloud-pdf-hashes.ndjson");
  const done = new Map<string, CloudHashRow>();
  if (RESUME && existsSync(cloudHashPath)) {
    for (const row of readNdjson<CloudHashRow>(cloudHashPath)) {
      if (row.documentId) done.set(row.documentId, row);
    }
    console.log(`resume: ${done.size} rows loaded`);
  }

  // Seed from prior full-bucket hash inventory when object path matches (avoids re-download).
  const legacyHashByPath = new Map<string, { sha256: string; sizeBytes: number }>();
  const legacyHashFile = path.join(OUT, "legacy-account-storage-hashes.ndjson");
  if (existsSync(legacyHashFile)) {
    for (const row of readNdjson<{
      storagePath: string;
      sha256: string | null;
      sizeBytes: number | null;
    }>(legacyHashFile)) {
      if (row.storagePath && row.sha256) {
        legacyHashByPath.set(row.storagePath.replace(/^\/+/, ""), {
          sha256: row.sha256,
          sizeBytes: row.sizeBytes ?? 0,
        });
      }
    }
    console.log(`legacy hash seed paths: ${legacyHashByPath.size}`);
  }

  // Seed via local physical PDFs: cleaned basename + size → unique sha256
  // (Storage API currently returning 544 intermittently; local match preserves content identity.)
  const sizeByObjectPath = new Map<string, number>();
  const objectsPath = path.join(OUT, "legacy-account-storage-objects.ndjson");
  if (existsSync(objectsPath)) {
    for (const row of readNdjson<{
      path: string;
      metadata?: { size?: number; contentLength?: number };
    }>(objectsPath)) {
      const sz = row.metadata?.size ?? row.metadata?.contentLength;
      if (row.path && typeof sz === "number") sizeByObjectPath.set(row.path.replace(/^\/+/, ""), sz);
    }
  }

  function cleanPdfBasename(name: string): string {
    const base = path.basename(name).toLowerCase();
    return base.replace(/^\d{10,}-/, "").replace(/\s+/g, " ").trim();
  }

  const localPhysicalEarly = readNdjson<{
    absolutePath: string;
    sha256: string;
    sizeBytes: number;
  }>(path.join(OUT, "pdf-discovery-physical.ndjson"));
  const localByCleanNameSize = new Map<string, Set<string>>();
  for (const p of localPhysicalEarly) {
    const key = `${cleanPdfBasename(p.absolutePath)}|${p.sizeBytes}`;
    if (!localByCleanNameSize.has(key)) localByCleanNameSize.set(key, new Set());
    localByCleanNameSize.get(key)!.add(p.sha256);
  }
  console.log(`local name+size seed keys: ${localByCleanNameSize.size}`);

  const pdfDocs = docs.filter((d) => {
    const n = (d.name ?? "").toLowerCase();
    const u = (d.storage_url ?? "").toLowerCase();
    const t = (d.type ?? "").toLowerCase();
    return n.endsWith(".pdf") || u.includes(".pdf") || t.includes("pdf");
  });

  console.log(`cloud pdf document records: ${pdfDocs.length}`);

  const CONCURRENCY = Math.max(
    1,
    Math.min(12, Number(process.env.CLOUD_HASH_CONCURRENCY || 2) || 2),
  );
  const SKIP_DOWNLOAD = process.argv.includes("--no-download");
  let seeded = 0;
  let localSeeded = 0;
  let downloaded = 0;
  let failed = 0;
  let completed = 0;

  function persistRow(row: CloudHashRow): void {
    done.set(row.documentId, row);
    appendFileSync(cloudHashPath, `${JSON.stringify(row)}\n`);
  }

  // Ensure file exists for append; on fresh run truncate, on resume keep.
  if (!RESUME || !existsSync(cloudHashPath)) {
    writeFileSync(cloudHashPath, "", "utf8");
  }

  async function hashOne(d: (typeof pdfDocs)[number]): Promise<void> {
    const existing = done.get(d.id);
    if (existing?.sha256) {
      completed += 1;
      return;
    }

    const storageUrl = d.storage_url ?? "";
    const objectPath = storageUrl.startsWith(`${bucket}/`)
      ? storageUrl.slice(bucket.length + 1)
      : storageUrl.replace(/^\/+/, "");

    if (!objectPath) {
      persistRow({
        documentId: d.id,
        caseId: d.case_id,
        orgId: d.org_id,
        name: d.name,
        storageUrl: d.storage_url,
        storageObjectPath: null,
        sha256: null,
        sizeBytes: null,
        pageCount: null,
        error: "missing_storage_url",
        hashedAt: new Date().toISOString(),
      });
      failed += 1;
      completed += 1;
      return;
    }

    const seededHash = legacyHashByPath.get(objectPath);
    if (seededHash) {
      persistRow({
        documentId: d.id,
        caseId: d.case_id,
        orgId: d.org_id,
        name: d.name,
        storageUrl: d.storage_url,
        storageObjectPath: objectPath,
        sha256: seededHash.sha256,
        sizeBytes: seededHash.sizeBytes,
        pageCount: null,
        hashedAt: new Date().toISOString(),
      });
      seeded += 1;
      completed += 1;
      return;
    }

    const sizeHint = sizeByObjectPath.get(objectPath) ?? null;
    const clean = cleanPdfBasename(d.name ?? objectPath);
    if (sizeHint != null) {
      const hashes = localByCleanNameSize.get(`${clean}|${sizeHint}`);
      if (hashes && hashes.size === 1) {
        const sha = [...hashes][0]!;
        persistRow({
          documentId: d.id,
          caseId: d.case_id,
          orgId: d.org_id,
          name: d.name,
          storageUrl: d.storage_url,
          storageObjectPath: objectPath,
          sha256: sha,
          sizeBytes: sizeHint,
          pageCount: null,
          hashedAt: new Date().toISOString(),
        });
        localSeeded += 1;
        completed += 1;
        return;
      }
    }

    if (SKIP_DOWNLOAD) {
      persistRow({
        documentId: d.id,
        caseId: d.case_id,
        orgId: d.org_id,
        name: d.name,
        storageUrl: d.storage_url,
        storageObjectPath: objectPath,
        sha256: null,
        sizeBytes: sizeHint,
        pageCount: null,
        error: "skipped_no_download_storage_544",
        hashedAt: new Date().toISOString(),
      });
      failed += 1;
      completed += 1;
      return;
    }

    try {
      const data = await withRetries(
        `download ${path.basename(objectPath)}`,
        async () => {
          const res = await admin.storage.from(bucket).download(objectPath);
          if (res.error) throw new Error(res.error.message || `storage_http`);
          if (!res.data) throw new Error("empty_download");
          return res.data;
        },
        3,
      );
      const buf = Buffer.from(await data.arrayBuffer());
      persistRow({
        documentId: d.id,
        caseId: d.case_id,
        orgId: d.org_id,
        name: d.name,
        storageUrl: d.storage_url,
        storageObjectPath: objectPath,
        sha256: sha256Buf(buf),
        sizeBytes: buf.length,
        pageCount: cheapPageCountFromBuf(buf),
        hashedAt: new Date().toISOString(),
      });
      downloaded += 1;
    } catch (e) {
      persistRow({
        documentId: d.id,
        caseId: d.case_id,
        orgId: d.org_id,
        name: d.name,
        storageUrl: d.storage_url,
        storageObjectPath: objectPath,
        sha256: null,
        sizeBytes: sizeHint,
        pageCount: null,
        error: (e as Error).message,
        hashedAt: new Date().toISOString(),
      });
      failed += 1;
    }
    completed += 1;
    if (completed % 25 === 0 || completed === pdfDocs.length) {
      console.log(
        `cloud hash progress ${completed}/${pdfDocs.length} (legacySeed=${seeded} localSeed=${localSeeded} okDl=${downloaded} fail=${failed})`,
      );
    }
  }

  const queue = [...pdfDocs];
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const next = queue.shift();
      if (!next) break;
      await hashOne(next);
    }
  });
  await Promise.all(workers);
  console.log(
    `cloud hash complete concurrency=${CONCURRENCY} legacySeed=${seeded} localSeed=${localSeeded} downloaded=${downloaded} failed=${failed}`,
  );

  // Rewrite canonical cloud hash file (last write wins per doc id) for crash-safe uniqueness
  writeFileSync(
    cloudHashPath,
    [...done.values()].map((r) => JSON.stringify(r)).join("\n") + (done.size ? "\n" : ""),
  );
  const cloudRows = [...done.values()];
  const cloudOk = cloudRows.filter((r) => r.sha256);
  const cloudUniqueHashes = new Set(cloudOk.map((r) => r.sha256!));
  const cloudFail = cloudRows.filter((r) => !r.sha256);

  console.log(
    `cloud hashed ok=${cloudOk.length} unique=${cloudUniqueHashes.size} fail=${cloudFail.length}`,
  );

  // ---- Local unique hashes ----
  const localUniquePath = path.join(OUT, "pdf-discovery-unique-by-hash.json");
  const localPhysicalPath = path.join(OUT, "pdf-discovery-physical.ndjson");
  const localUnique: LocalUnique[] = existsSync(localUniquePath)
    ? JSON.parse(readFileSync(localUniquePath, "utf8"))
    : [];
  const localPhysical = readNdjson<{
    absolutePath: string;
    sha256: string;
    sizeBytes: number;
    pageCount: number | null;
    originatingCorpusGuess: string | null;
    likelyCaseOrTemplateId: string | null;
    worktreePath: string | null;
    branch: string | null;
  }>(localPhysicalPath);

  const localCopies = localPhysical.length;
  const localUniqueSet = new Set(localUnique.map((u) => u.sha256));

  // ---- Git recoverable (path inventory; content hash unknown unless matched to physical) ----
  const gitRows = readNdjson<{
    objectPath: string;
    blobSha: string;
    sizeBytes: number | null;
    alsoPhysicalNow: boolean;
    physicalPaths: string[];
    ref: string;
    repo: string;
  }>(path.join(OUT, "pdf-discovery-git-recoverable.ndjson"));

  // ---- Global unique PDF map ----
  type PdfGlobal = {
    sha256: string;
    sizeBytes: number | null;
    pageCount: number | null;
    sources: Array<{
      kind: "local" | "cloud" | "git";
      path?: string;
      documentId?: string;
      caseId?: string | null;
      orgId?: string | null;
      worktree?: string | null;
      branch?: string | null;
      corpusGuess?: string | null;
      blobSha?: string;
    }>;
    locations: ("local" | "cloud" | "git")[];
  };

  const globalPdfs = new Map<string, PdfGlobal>();

  function touch(sha: string): PdfGlobal {
    if (!globalPdfs.has(sha)) {
      globalPdfs.set(sha, {
        sha256: sha,
        sizeBytes: null,
        pageCount: null,
        sources: [],
        locations: [],
      });
    }
    return globalPdfs.get(sha)!;
  }

  for (const u of localUnique) {
    const g = touch(u.sha256);
    g.sizeBytes = u.sizeBytes;
    g.pageCount = u.pageCount;
    if (!g.locations.includes("local")) g.locations.push("local");
    for (const p of u.paths) {
      g.sources.push({
        kind: "local",
        path: p,
        corpusGuess: u.originatingCorpusGuess,
        worktree: u.worktrees[0] ?? null,
        branch: u.branches[0] ?? null,
        caseId: u.likelyCaseOrTemplateIds[0] ?? null,
      });
    }
  }

  for (const r of cloudOk) {
    const g = touch(r.sha256!);
    g.sizeBytes = r.sizeBytes ?? g.sizeBytes;
    g.pageCount = r.pageCount ?? g.pageCount;
    if (!g.locations.includes("cloud")) g.locations.push("cloud");
    g.sources.push({
      kind: "cloud",
      path: r.storageObjectPath ?? undefined,
      documentId: r.documentId,
      caseId: r.caseId,
      orgId: r.orgId,
    });
  }

  // Git: only mark as git if we can map blob to a known physical sha via path match
  const localByBasename = new Map<string, string[]>();
  for (const p of localPhysical) {
    const b = path.basename(p.absolutePath).toLowerCase();
    if (!localByBasename.has(b)) localByBasename.set(b, []);
    localByBasename.get(b)!.push(p.sha256);
  }
  for (const g of gitRows) {
    const base = path.basename(g.objectPath).toLowerCase();
    const hashes = localByBasename.get(base) ?? [];
    if (hashes.length === 1) {
      const pdf = touch(hashes[0]!);
      if (!pdf.locations.includes("git")) pdf.locations.push("git");
      pdf.sources.push({
        kind: "git",
        path: g.objectPath,
        blobSha: g.blobSha,
        branch: g.ref,
      });
    }
    // If not matched, git content remains metadata-only (no content hash) — counted separately
  }

  const localOnly = [...globalPdfs.values()].filter(
    (g) => g.locations.includes("local") && !g.locations.includes("cloud"),
  );
  const cloudOnly = [...globalPdfs.values()].filter(
    (g) => g.locations.includes("cloud") && !g.locations.includes("local"),
  );
  const both = [...globalPdfs.values()].filter(
    (g) => g.locations.includes("local") && g.locations.includes("cloud"),
  );

  // ---- Bundle grouping (prefer backend case_id) ----
  type Bundle = {
    bundleKey: string;
    backendCaseId: string | null;
    organisationId: string | null;
    title: string | null;
    sourceLocations: ("local" | "cloud" | "both")[];
    pdfCount: number;
    uniquePdfHashes: string[];
    pageCounts: Array<number | null>;
    totalPagesApprox: number | null;
    syntheticOrTemplateLikely: boolean;
    extractionAvailability: "unknown" | "cloud_extracted_text_possible" | "local_bundle_text" | "none_detected";
    truthKeyAvailability: "unknown" | "local_truth_key_possible" | "none_detected";
    documentIds: string[];
    localPaths: string[];
    cloudStoragePaths: string[];
    duplicateOfBundleKey?: string | null;
  };

  const bundles = new Map<string, Bundle>();

  function ensureBundle(key: string): Bundle {
    if (!bundles.has(key)) {
      bundles.set(key, {
        bundleKey: key,
        backendCaseId: null,
        organisationId: null,
        title: null,
        sourceLocations: [],
        pdfCount: 0,
        uniquePdfHashes: [],
        pageCounts: [],
        totalPagesApprox: null,
        syntheticOrTemplateLikely: false,
        extractionAvailability: "unknown",
        truthKeyAvailability: "unknown",
        documentIds: [],
        localPaths: [],
        cloudStoragePaths: [],
      });
    }
    return bundles.get(key)!;
  }

  function addHashToBundle(b: Bundle, sha: string, pageCount: number | null) {
    b.pdfCount += 1;
    if (!b.uniquePdfHashes.includes(sha)) b.uniquePdfHashes.push(sha);
    b.pageCounts.push(pageCount);
  }

  // Cloud: one bundle per backend case_id
  for (const r of cloudOk) {
    const caseId = r.caseId ?? `cloud-doc:${r.documentId}`;
    const b = ensureBundle(`backend:${caseId}`);
    b.backendCaseId = r.caseId;
    b.organisationId = r.orgId;
    const meta = r.caseId ? caseMeta.get(r.caseId) : null;
    b.title = meta?.title ?? b.title ?? r.name;
    if (!b.sourceLocations.includes("cloud") && !b.sourceLocations.includes("both")) {
      b.sourceLocations.push("cloud");
    }
    addHashToBundle(b, r.sha256!, r.pageCount);
    b.documentIds.push(r.documentId);
    if (r.storageObjectPath) b.cloudStoragePaths.push(r.storageObjectPath);
    b.syntheticOrTemplateLikely =
      b.syntheticOrTemplateLikely || guessSynthetic(meta?.title, r.name);
    b.extractionAvailability = "cloud_extracted_text_possible";
  }

  // Local: group by cases/<id> path segment when present
  for (const p of localPhysical) {
    const norm = p.absolutePath.replace(/\\/g, "/");
    const m = norm.match(/\/cases\/([^/]+)\//i);
    const localCaseId = m?.[1] ?? p.likelyCaseOrTemplateId ?? `local-hash:${p.sha256.slice(0, 12)}`;
    // If this hash already belongs to a backend bundle, prefer attaching as local path on matching backend bundle by hash overlap later
    const b = ensureBundle(`local:${localCaseId}`);
    if (!b.sourceLocations.includes("local") && !b.sourceLocations.includes("both")) {
      b.sourceLocations.push("local");
    }
    addHashToBundle(b, p.sha256, p.pageCount);
    b.localPaths.push(p.absolutePath);
    b.title = b.title ?? localCaseId;
    b.syntheticOrTemplateLikely =
      b.syntheticOrTemplateLikely || guessSynthetic(localCaseId, path.basename(p.absolutePath));
    // truth-key / bundle-text detection
    const caseDir = m ? norm.slice(0, norm.indexOf(`/cases/${m[1]}`) + `/cases/${m[1]}`.length) : null;
    if (caseDir) {
      const absCaseDir = caseDir.replace(/\//g, path.sep);
      // reconstruct absolute: find "cases" in absolutePath
      const idx = p.absolutePath.toLowerCase().lastIndexOf(`${path.sep}cases${path.sep}`);
      if (idx >= 0) {
        const end = p.absolutePath.indexOf(path.sep, idx + (`${path.sep}cases${path.sep}`).length);
        const dir = end > 0 ? p.absolutePath.slice(0, end) : p.absolutePath;
        if (existsSync(path.join(dir, "truth-key.json"))) b.truthKeyAvailability = "local_truth_key_possible";
        if (existsSync(path.join(dir, "bundle-text.md"))) {
          b.extractionAvailability =
            b.extractionAvailability === "cloud_extracted_text_possible"
              ? "cloud_extracted_text_possible"
              : "local_bundle_text";
        }
      }
    }
  }

  // Merge local bundles into backend bundles when they share any PDF hash
  const hashToBackendBundle = new Map<string, string>();
  for (const [key, b] of bundles) {
    if (!key.startsWith("backend:")) continue;
    for (const h of b.uniquePdfHashes) hashToBackendBundle.set(h, key);
  }
  for (const [key, b] of [...bundles.entries()]) {
    if (!key.startsWith("local:")) continue;
    const overlap = b.uniquePdfHashes.map((h) => hashToBackendBundle.get(h)).filter(Boolean) as string[];
    if (overlap.length) {
      const targetKey = overlap[0]!;
      const target = bundles.get(targetKey)!;
      for (const h of b.uniquePdfHashes) {
        if (!target.uniquePdfHashes.includes(h)) target.uniquePdfHashes.push(h);
      }
      target.pdfCount += b.pdfCount;
      target.localPaths.push(...b.localPaths);
      target.pageCounts.push(...b.pageCounts);
      if (!target.sourceLocations.includes("both")) {
        target.sourceLocations = ["both"];
      }
      if (b.truthKeyAvailability === "local_truth_key_possible") {
        target.truthKeyAvailability = "local_truth_key_possible";
      }
      b.duplicateOfBundleKey = targetKey;
    }
  }

  // Finalize page totals + location labels
  for (const b of bundles.values()) {
    const pages = b.pageCounts.filter((n): n is number => typeof n === "number");
    b.totalPagesApprox = pages.length ? pages.reduce((a, c) => a + c, 0) : null;
    if (b.sourceLocations.includes("local") && b.sourceLocations.includes("cloud")) {
      b.sourceLocations = ["both"];
    } else if (b.localPaths.length && b.cloudStoragePaths.length) {
      b.sourceLocations = ["both"];
    }
  }

  const primaryBundles = [...bundles.values()].filter((b) => !b.duplicateOfBundleKey);
  const suitableForClaimAudit = primaryBundles.filter((b) => {
    // Need at least one unique PDF and either cloud case relationship or local truth/bundle text
    if (b.uniquePdfHashes.length === 0) return false;
    if (b.backendCaseId) return true;
    if (b.truthKeyAvailability === "local_truth_key_possible") return true;
    if (b.extractionAvailability === "local_bundle_text") return true;
    return false;
  });
  const syntheticBundles = primaryBundles.filter((b) => b.syntheticOrTemplateLikely);

  const summary = {
    programme: "global-corpus-manifest",
    mode: "READ_ONLY",
    recordedAt: new Date().toISOString(),
    productHead: require("node:child_process")
      .execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" })
      .trim(),
    legacyAccount: {
      email: "gduffy1993@gmail.com",
      userId: LEGACY_USER,
      orgId: LEGACY_ORG,
    },
    totals: {
      totalLocalPdfCopies: localCopies,
      uniqueLocalPdfs: localUniqueSet.size,
      totalCloudPdfObjects: pdfDocs.length,
      uniqueCloudPdfs: cloudUniqueHashes.size,
      cloudHashFailures: cloudFail.length,
      localCloudDuplicateHashes: both.length,
      genuinelyNewCloudOnlyPdfs: cloudOnly.length,
      localOnlyPdfs: localOnly.length,
      totalGloballyUniquePdfs: globalPdfs.size,
      totalGloballyUniqueCaseBundleGroups: primaryBundles.length,
      mergedAwayLocalDuplicateBundles: [...bundles.values()].filter((b) => b.duplicateOfBundleKey).length,
      bundlesSuitableForSourceBackedClaimAuditing: suitableForClaimAudit.length,
      syntheticOrTemplateDerivedBundles: syntheticBundles.length,
      inaccessibleOrMissingCloudObjects: cloudFail.length,
    },
    notes: [
      "Deduplication is by SHA-256 of full PDF bytes.",
      "Case/bundle count is NOT equal to PDF count; multiple PDFs may share one backend case_id.",
      "Local bundles overlapping cloud PDF hashes were merged into backend case bundles.",
      "Git-recoverable entries without a unique basename→hash map are not given a content hash.",
      "No assurance auditor was run.",
      "No production storage/DB mutations.",
    ],
  };

  writeFileSync(path.join(OUT, "global-corpus-summary.json"), JSON.stringify(summary, null, 2));
  writeFileSync(
    path.join(OUT, "global-corpus-unique-pdfs.ndjson"),
    [...globalPdfs.values()].map((g) => JSON.stringify(g)).join("\n") + "\n",
  );
  writeFileSync(
    path.join(OUT, "global-corpus-bundles.ndjson"),
    primaryBundles.map((b) => JSON.stringify(b)).join("\n") + "\n",
  );
  writeFileSync(
    path.join(OUT, "global-corpus-bundles-merged-away.ndjson"),
    [...bundles.values()]
      .filter((b) => b.duplicateOfBundleKey)
      .map((b) => JSON.stringify(b))
      .join("\n") + "\n",
  );
  writeFileSync(
    path.join(OUT, "cloud-pdf-hash-failures.ndjson"),
    cloudFail.map((r) => JSON.stringify(r)).join("\n") + "\n",
  );

  const md = `# Global corpus manifest (READ-ONLY)

Generated: ${summary.recordedAt}

## Physically auditable size (do not inflate)

| Metric | Count |
|--------|------:|
| Local PDF copies | ${summary.totals.totalLocalPdfCopies} |
| Unique local PDFs (SHA-256) | ${summary.totals.uniqueLocalPdfs} |
| Cloud PDF document objects (legacy orgs) | ${summary.totals.totalCloudPdfObjects} |
| Unique cloud PDFs (SHA-256) | ${summary.totals.uniqueCloudPdfs} |
| Hashes present in both local + cloud | ${summary.totals.localCloudDuplicateHashes} |
| Cloud-only unique PDFs | ${summary.totals.genuinelyNewCloudOnlyPdfs} |
| Local-only unique PDFs | ${summary.totals.localOnlyPdfs} |
| **Globally unique PDFs** | **${summary.totals.totalGloballyUniquePdfs}** |
| **Globally unique case/bundle groups** | **${summary.totals.totalGloballyUniqueCaseBundleGroups}** |
| Bundles suitable for source-backed claim auditing | ${summary.totals.bundlesSuitableForSourceBackedClaimAuditing} |
| Synthetic/template-likely bundles | ${summary.totals.syntheticOrTemplateDerivedBundles} |
| Inaccessible/missing cloud objects | ${summary.totals.inaccessibleOrMissingCloudObjects} |

## Important
- PDF count ≠ case count.
- Stop here before assurance unless this size is accepted as the real auditable corpus.
`;
  writeFileSync(path.join(OUT, "GLOBAL-CORPUS-MANIFEST.md"), md);
  console.log(JSON.stringify(summary.totals, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
