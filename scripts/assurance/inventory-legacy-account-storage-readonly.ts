/**
 * READ-ONLY inventory of CaseBrain backend cases/docs/storage for a legacy email.
 * Uses SUPABASE_SERVICE_ROLE_KEY already present in .env.local.
 * Does NOT reset passwords, mutate rows, delete, or move objects.
 *
 *   npx tsx scripts/assurance/inventory-legacy-account-storage-readonly.ts
 */
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const EMAIL = "gduffy1993@gmail.com";
const OUT = path.join(
  ROOT,
  "artifacts/casebrain-qa/assurance/master-auditor-v2/master-3000-release-assurance",
);

function loadEnv(): void {
  for (const name of [".env.local", ".env"]) {
    const p = path.join(ROOT, name);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#") || !t.includes("=")) continue;
      const eq = t.indexOf("=");
      const k = t.slice(0, eq).trim();
      const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

async function main(): Promise<void> {
  loadEnv();
  mkdirSync(OUT, { recursive: true });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "documents";

  const accessGaps: string[] = [];
  if (!url) accessGaps.push("NEXT_PUBLIC_SUPABASE_URL missing");
  if (!service) accessGaps.push("SUPABASE_SERVICE_ROLE_KEY missing");
  if (accessGaps.length) {
    const stop = {
      verdict: "STOP_BACKEND_ACCESS_UNAVAILABLE",
      email: EMAIL,
      accessGaps,
      recordedAt: new Date().toISOString(),
    };
    writeFileSync(path.join(OUT, "legacy-account-storage-inventory.json"), JSON.stringify(stop, null, 2));
    console.log(JSON.stringify(stop, null, 2));
    process.exitCode = 2;
    return;
  }

  const admin = createClient(url!, service!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // --- Auth user lookup (Admin API) ---
  let user: { id: string; email?: string; created_at?: string; last_sign_in_at?: string | null } | null =
    null;
  const listErrs: string[] = [];
  // Prefer getUserByEmail if available; else paginate listUsers
  try {
    const anyAdmin = admin.auth.admin as any;
    if (typeof anyAdmin.getUserByEmail === "function") {
      const r = await anyAdmin.getUserByEmail(EMAIL);
      if (r.error) listErrs.push(r.error.message);
      else if (r.data?.user) user = r.data.user;
    }
  } catch (e) {
    listErrs.push(`getUserByEmail: ${(e as Error).message}`);
  }

  if (!user) {
    let page = 1;
    const perPage = 200;
    for (;;) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error) {
        listErrs.push(error.message);
        break;
      }
      const found = (data.users ?? []).find((u) => (u.email ?? "").toLowerCase() === EMAIL.toLowerCase());
      if (found) {
        user = found;
        break;
      }
      if (!data.users?.length || data.users.length < perPage) break;
      page += 1;
      if (page > 50) {
        listErrs.push("listUsers pagination exceeded safety cap");
        break;
      }
    }
  }

  if (!user) {
    const stop = {
      verdict: "ACCOUNT_NOT_FOUND_OR_UNLISTABLE",
      email: EMAIL,
      listErrs,
      recordedAt: new Date().toISOString(),
      note: "Service role could not locate this auth user. No password reset attempted.",
    };
    writeFileSync(path.join(OUT, "legacy-account-storage-inventory.json"), JSON.stringify(stop, null, 2));
    console.log(JSON.stringify(stop, null, 2));
    return;
  }

  const userId = user.id;

  // --- Organisation memberships ---
  const { data: memberships, error: memErr } = await admin
    .from("organisation_members")
    .select("organisation_id, org_id, role, user_id, created_at")
    .eq("user_id", userId);

  // Also organisations owned/linked via external_ref solo-user_* and APP_OWNER patterns
  const { data: orgsByExternal, error: extErr } = await admin
    .from("organisations")
    .select("id, name, external_ref, created_at")
    .or(`external_ref.eq.solo-user_${userId},external_ref.ilike.%${userId}%`);

  const orgIds = new Set<string>();
  for (const m of memberships ?? []) {
    const oid = (m as any).organisation_id ?? (m as any).org_id;
    if (oid) orgIds.add(oid);
  }
  for (const o of orgsByExternal ?? []) if (o.id) orgIds.add(o.id);

  // Fetch org rows for discovered ids
  let orgs: any[] = [];
  if (orgIds.size) {
    const { data, error } = await admin
      .from("organisations")
      .select("id, name, external_ref, created_at")
      .in("id", [...orgIds]);
    if (error) accessGaps.push(`organisations: ${error.message}`);
    orgs = data ?? [];
  }

  // --- Cases ---
  const caseRows: any[] = [];
  for (const orgId of orgIds) {
    let from = 0;
    const pageSize = 1000;
    for (;;) {
      const { data, error } = await admin
        .from("cases")
        .select("id, title, org_id, created_at, is_archived, practice_area, defendant_name")
        .eq("org_id", orgId)
        .range(from, from + pageSize - 1);
      if (error) {
        accessGaps.push(`cases org ${orgId}: ${error.message}`);
        break;
      }
      caseRows.push(...(data ?? []));
      if (!data || data.length < pageSize) break;
      from += pageSize;
    }
  }

  // Also cases created_by / uploaded linkage if columns exist — probe lightly
  const { data: casesByCreator, error: creatorErr } = await admin
    .from("cases")
    .select("id, title, org_id, created_at, is_archived")
    .eq("created_by", userId)
    .limit(5000);
  if (creatorErr && !/column/i.test(creatorErr.message)) {
    accessGaps.push(`cases.created_by: ${creatorErr.message}`);
  }
  for (const c of casesByCreator ?? []) {
    if (!caseRows.some((x) => x.id === c.id)) caseRows.push(c);
    if (c.org_id) orgIds.add(c.org_id);
  }

  const caseIds = caseRows.map((c) => c.id);

  // --- Documents ---
  const docRows: any[] = [];
  // Query by org_id and by case_id in chunks
  for (const orgId of orgIds) {
    let from = 0;
    const pageSize = 1000;
    for (;;) {
      const { data, error } = await admin
        .from("documents")
        .select(
          "id, case_id, org_id, filename, file_name, mime_type, content_type, storage_path, storage_url, uploaded_by, created_at, byte_size, size",
        )
        .eq("org_id", orgId)
        .range(from, from + pageSize - 1);
      if (error) {
        // retry with minimal columns if schema drift
        const { data: d2, error: e2 } = await admin
          .from("documents")
          .select("id, case_id, org_id, storage_path, storage_url, uploaded_by, created_at")
          .eq("org_id", orgId)
          .range(from, from + pageSize - 1);
        if (e2) {
          accessGaps.push(`documents org ${orgId}: ${error.message}; fallback: ${e2.message}`);
          break;
        }
        docRows.push(...(d2 ?? []));
        if (!d2 || d2.length < pageSize) break;
        from += pageSize;
        continue;
      }
      docRows.push(...(data ?? []));
      if (!data || data.length < pageSize) break;
      from += pageSize;
    }
  }

  // Documents for case ids not covered (legacy null org)
  for (let i = 0; i < caseIds.length; i += 200) {
    const chunk = caseIds.slice(i, i + 200);
    const { data, error } = await admin
      .from("documents")
      .select("id, case_id, org_id, storage_path, storage_url, uploaded_by, created_at")
      .in("case_id", chunk);
    if (error) {
      accessGaps.push(`documents by case chunk: ${error.message}`);
      break;
    }
    for (const d of data ?? []) {
      if (!docRows.some((x) => x.id === d.id)) docRows.push(d);
    }
  }

  // Also documents uploaded_by = email or user id
  const { data: docsByUploader, error: upErr } = await admin
    .from("documents")
    .select("id, case_id, org_id, storage_path, storage_url, uploaded_by, created_at")
    .or(`uploaded_by.eq.${userId},uploaded_by.eq.${EMAIL}`)
    .limit(5000);
  if (upErr && !/column/i.test(upErr.message)) accessGaps.push(`documents.uploaded_by: ${upErr.message}`);
  for (const d of docsByUploader ?? []) {
    if (!docRows.some((x) => x.id === d.id)) docRows.push(d);
  }

  // --- Storage listing ---
  const storageObjects: Array<{
    name: string;
    id?: string;
    updated_at?: string;
    metadata?: any;
    path: string;
  }> = [];

  async function listRecursive(prefix: string, depth = 0): Promise<void> {
    if (depth > 8) return;
    const { data, error } = await admin.storage.from(bucket).list(prefix, {
      limit: 1000,
      offset: 0,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) {
      accessGaps.push(`storage.list(${prefix || "/"}): ${error.message}`);
      return;
    }
    for (const item of data ?? []) {
      const child = prefix ? `${prefix}/${item.name}` : item.name;
      // folders often have null id / no metadata.mimetype
      const isFolder = !item.id || (item.metadata == null && !item.metadata?.mimetype);
      // Heuristic: if list returns children when we query as prefix
      if (item.id && (item.metadata?.mimetype || item.name.toLowerCase().endsWith(".pdf"))) {
        storageObjects.push({
          name: item.name,
          id: item.id,
          updated_at: item.updated_at,
          metadata: item.metadata,
          path: child,
        });
      } else {
        // try as folder
        await listRecursive(child, depth + 1);
      }
    }
  }

  // List common prefixes: org ids, user id, empty root
  await listRecursive("");
  for (const orgId of orgIds) {
    await listRecursive(orgId);
    await listRecursive(`org/${orgId}`);
    await listRecursive(`organisations/${orgId}`);
  }
  await listRecursive(userId);
  await listRecursive(`users/${userId}`);

  // Deduplicate storage by path
  const storageByPath = new Map<string, (typeof storageObjects)[0]>();
  for (const o of storageObjects) storageByPath.set(o.path, o);
  const uniqueStorage = [...storageByPath.values()];

  const pdfDocRecords = docRows.filter((d) => {
    const sp = String(d.storage_path ?? d.storage_url ?? "").toLowerCase();
    const fn = String(d.filename ?? d.file_name ?? "").toLowerCase();
    return sp.endsWith(".pdf") || fn.endsWith(".pdf") || sp.includes(".pdf");
  });

  // --- Optional read-only materialisation sample for hashing ---
  // Cap downloads to avoid accidental huge egress; hash all if ≤ 400, else first 400 + report remainder unhashed.
  const HASH_CAP = Number(process.env.CB_STORAGE_HASH_CAP ?? 400);
  const pathsToHash = [
    ...new Set(
      [
        ...pdfDocRecords.map((d) => d.storage_path).filter(Boolean),
        ...uniqueStorage.filter((o) => o.path.toLowerCase().endsWith(".pdf")).map((o) => o.path),
      ].map(String),
    ),
  ];

  const hashResults: Array<{
    storagePath: string;
    sha256: string | null;
    sizeBytes: number | null;
    error?: string;
  }> = [];

  let hashed = 0;
  for (const storagePath of pathsToHash) {
    if (hashed >= HASH_CAP) {
      hashResults.push({
        storagePath,
        sha256: null,
        sizeBytes: null,
        error: "skipped_over_hash_cap",
      });
      continue;
    }
    try {
      const { data, error } = await admin.storage.from(bucket).download(storagePath);
      if (error || !data) {
        hashResults.push({
          storagePath,
          sha256: null,
          sizeBytes: null,
          error: error?.message ?? "download returned empty",
        });
        continue;
      }
      const buf = Buffer.from(await data.arrayBuffer());
      hashResults.push({ storagePath, sha256: sha256(buf), sizeBytes: buf.length });
      hashed += 1;
    } catch (e) {
      hashResults.push({
        storagePath,
        sha256: null,
        sizeBytes: null,
        error: (e as Error).message,
      });
    }
  }

  const uniqueHashes = new Set(hashResults.map((h) => h.sha256).filter(Boolean) as string[]);
  const casesWithDocs = new Set(docRows.map((d) => d.case_id).filter(Boolean));

  const report = {
    programme: "legacy-account-storage-inventory",
    mode: "READ_ONLY",
    recordedAt: new Date().toISOString(),
    email: EMAIL,
    verdict: "INVENTORY_COMPLETE",
    mutationsPerformed: false,
    passwordResetAttempted: false,
    access: {
      supabaseUrlHost: (() => {
        try {
          return new URL(url!).host;
        } catch {
          return "(parse-failed)";
        }
      })(),
      bucket,
      serviceRolePresent: true,
      gaps: accessGaps,
      membershipQueryError: memErr?.message ?? null,
      externalOrgQueryError: extErr?.message ?? null,
      authListNotes: listErrs,
    },
    account: {
      found: true,
      userId,
      email: user.email ?? EMAIL,
      created_at: user.created_at ?? null,
      last_sign_in_at: user.last_sign_in_at ?? null,
    },
    organisations: {
      membershipCount: memberships?.length ?? 0,
      memberships: memberships ?? [],
      orgIds: [...orgIds],
      orgs,
    },
    cases: {
      count: caseRows.length,
      archived: caseRows.filter((c) => c.is_archived).length,
      withDocuments: casesWithDocs.size,
      sampleTitles: caseRows.slice(0, 25).map((c) => ({ id: c.id, title: c.title, org_id: c.org_id })),
    },
    documents: {
      count: docRows.length,
      withStoragePath: docRows.filter((d) => d.storage_path).length,
      pdfLikelyRecords: pdfDocRecords.length,
      sample: docRows.slice(0, 25).map((d) => ({
        id: d.id,
        case_id: d.case_id,
        storage_path: d.storage_path,
        uploaded_by: d.uploaded_by,
      })),
    },
    storage: {
      bucket,
      objectsListed: uniqueStorage.length,
      pdfObjectsListed: uniqueStorage.filter((o) => o.path.toLowerCase().endsWith(".pdf")).length,
      samplePaths: uniqueStorage.slice(0, 40).map((o) => o.path),
    },
    materialisation: {
      hashCap: HASH_CAP,
      pathsConsidered: pathsToHash.length,
      downloadedAndHashed: hashed,
      uniquePdfContentHashes: uniqueHashes.size,
      downloadErrors: hashResults.filter((h) => h.error && h.error !== "skipped_over_hash_cap").length,
      skippedOverCap: hashResults.filter((h) => h.error === "skipped_over_hash_cap").length,
      note: "Downloads were read-only via service role; objects were not deleted or moved. Full unique-hash census requires hashing all objects (raise CB_STORAGE_HASH_CAP).",
    },
    correspondenceToBelieved3000: {
      believedTarget: 3000,
      casesFound: caseRows.length,
      likelyMatch: caseRows.length >= 2500 ? "possible" : caseRows.length >= 500 ? "partial" : "unlikely_as_3000_corpus",
      note: "Compare case count and unique PDF hashes to the believed ~3000 corpus; do not equate with messy-v9 fictional identities.",
    },
    chain: {
      accountFound: true,
      cases: caseRows.length,
      documentRecords: docRows.length,
      pdfStorageObjectsListed: uniqueStorage.filter((o) => o.path.toLowerCase().endsWith(".pdf")).length,
      uniquePdfsHashedSoFar: uniqueHashes.size,
      uniqueBundlesApprox: casesWithDocs.size || caseRows.length,
    },
  };

  writeFileSync(path.join(OUT, "legacy-account-storage-inventory.json"), JSON.stringify(report, null, 2));
  writeFileSync(
    path.join(OUT, "legacy-account-storage-cases.ndjson"),
    caseRows.map((c) => JSON.stringify(c)).join("\n") + "\n",
  );
  writeFileSync(
    path.join(OUT, "legacy-account-storage-documents.ndjson"),
    docRows.map((d) => JSON.stringify(d)).join("\n") + "\n",
  );
  writeFileSync(
    path.join(OUT, "legacy-account-storage-objects.ndjson"),
    uniqueStorage.map((o) => JSON.stringify(o)).join("\n") + "\n",
  );
  writeFileSync(
    path.join(OUT, "legacy-account-storage-hashes.ndjson"),
    hashResults.map((h) => JSON.stringify(h)).join("\n") + "\n",
  );

  const md = `# Legacy account storage inventory (READ-ONLY)

Email: \`${EMAIL}\`  
User ID: \`${userId}\`  
Recorded: ${report.recordedAt}

## Chain

| Step | Count |
|------|------:|
| Account found | yes |
| Organisations | ${orgIds.size} |
| Cases | ${caseRows.length} |
| Document records | ${docRows.length} |
| PDF-likely document records | ${pdfDocRecords.length} |
| Storage objects listed | ${uniqueStorage.length} |
| PDF storage objects listed | ${report.storage.pdfObjectsListed} |
| Unique PDF content hashes (downloaded ≤${HASH_CAP}) | ${uniqueHashes.size} |
| Unique bundles (cases with docs) | ${casesWithDocs.size} |

## Believed ~3000 correspondence

${report.correspondenceToBelieved3000.likelyMatch} — cases=${caseRows.length}

## Access gaps

${accessGaps.length ? accessGaps.map((g) => `- ${g}`).join("\n") : "- none"}

No password reset. No mutations.
`;
  writeFileSync(path.join(OUT, "LEGACY-ACCOUNT-STORAGE-INVENTORY.md"), md);
  console.log(JSON.stringify(report.chain, null, 2));
  console.log(JSON.stringify(report.correspondenceToBelieved3000, null, 2));
  console.log("orgs", orgIds.size, "accessGaps", accessGaps.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
