/**
 * READ-ONLY global CaseBrain PDF discovery.
 * Does not checkout, modify, delete, move, or regenerate PDFs.
 *
 *   npx tsx scripts/assurance/discover-casebrain-pdfs-readonly.ts
 */
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import {
  createReadStream,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";

const PRODUCT = process.cwd();
const OUT = path.join(
  PRODUCT,
  "artifacts/casebrain-qa/assurance/master-auditor-v2/master-3000-release-assurance",
);

type Worktree = { path: string; head: string; branch: string };

type PdfRecord = {
  absolutePath: string;
  filename: string;
  sha256: string;
  sizeBytes: number;
  pageCount: number | null;
  worktreePath: string | null;
  branch: string | null;
  head: string | null;
  originatingCorpusGuess: string | null;
  likelyCaseOrTemplateId: string | null;
  presence: "physical_now";
  duplicateGroupId: string;
};

type GitPdfRecord = {
  repo: string;
  ref: string;
  objectPath: string;
  blobSha: string;
  sizeBytes: number | null;
  presence: "git_recoverable";
  alsoPhysicalNow: boolean;
  physicalPaths: string[];
};

function listWorktrees(repoHint: string): Worktree[] {
  const out = execFileSync("git", ["worktree", "list", "--porcelain"], {
    cwd: repoHint,
    encoding: "utf8",
  });
  const rows: Worktree[] = [];
  let cur: Partial<Worktree> = {};
  for (const line of out.split(/\r?\n/)) {
    if (line.startsWith("worktree ")) {
      if (cur.path) rows.push(cur as Worktree);
      cur = { path: line.slice("worktree ".length).replace(/\//g, path.sep), branch: "(detached)", head: "" };
    } else if (line.startsWith("HEAD ")) cur.head = line.slice(5);
    else if (line.startsWith("branch ")) cur.branch = line.slice("branch ".length).replace("refs/heads/", "");
  }
  if (cur.path) rows.push(cur as Worktree);
  return rows;
}

function guessCorpus(abs: string): string | null {
  const p = abs.replace(/\\/g, "/").toLowerCase();
  if (p.includes("/messy-pdf")) return "messy-pdf";
  if (p.includes("/evidence-state-audit-local")) return "esa";
  if (p.includes("/diverse") || p.includes("stage3000-diverse")) return "diverse-second";
  if (p.includes("/gold") || p.includes("starter-gold")) return "gold";
  if (p.includes("holdout")) return "holdout";
  if (p.includes("/integrity-programme")) return "integrity-programme";
  if (p.includes("/solicitor-review")) return "solicitor-review";
  if (p.includes("/casebrain-proof")) return "casebrain-proof";
  if (p.includes("/artifacts/")) return "artifacts-other";
  if (p.includes("/fixtures") || p.includes("/testdata") || p.includes("/test/")) return "test-fixtures";
  return "other";
}

function guessCaseId(abs: string): string | null {
  const parts = abs.replace(/\\/g, "/").split("/");
  // .../cases/<id>/file.pdf
  const i = parts.lastIndexOf("cases");
  if (i >= 0 && parts[i + 1] && parts[i + 1] !== "cases") return parts[i + 1]!;
  const base = path.basename(abs, path.extname(abs));
  if (/^(demo-audit|messy-pdf|cb-|sim-|sc-|pilot-)/i.test(base)) return base;
  // parent dir often is case id
  const parent = parts[parts.length - 2];
  if (parent && /^(demo-audit|messy-pdf|cb-|sim-|sc-|pilot-|esa-)/i.test(parent)) return parent;
  return parent ?? null;
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

/** Cheap page estimate: count '/Type /Page' not '/Type /Pages' in first 8MB. */
function cheapPageCount(filePath: string): number | null {
  try {
    const st = statSync(filePath);
    const max = Math.min(st.size, 8 * 1024 * 1024);
    const fd = require("node:fs").openSync(filePath, "r");
    const buf = Buffer.alloc(max);
    require("node:fs").readSync(fd, buf, 0, max, 0);
    require("node:fs").closeSync(fd);
    const text = buf.toString("latin1");
    const pages = (text.match(/\/Type\s*\/Page(?![s])/g) || []).length;
    return pages > 0 ? pages : null;
  } catch {
    return null;
  }
}

function walkPdfs(root: string, acc: string[], inaccessible: string[]): void {
  let entries;
  try {
    entries = readdirSync(root, { withFileTypes: true });
  } catch (e) {
    inaccessible.push(`${root} (${(e as Error).message})`);
    return;
  }
  for (const ent of entries) {
    const full = path.join(root, ent.name);
    // Skip huge/irrelevant trees
    if (ent.name === "node_modules" || ent.name === ".git" || ent.name === "dist" || ent.name === ".next") {
      continue;
    }
    try {
      if (ent.isDirectory()) walkPdfs(full, acc, inaccessible);
      else if (ent.isFile() && ent.name.toLowerCase().endsWith(".pdf")) acc.push(full);
    } catch (e) {
      inaccessible.push(`${full} (${(e as Error).message})`);
    }
  }
}

function gitPdfPathsOnRef(repo: string, ref: string): Array<{ objectPath: string; blobSha: string }> {
  try {
    const out = execFileSync("git", ["ls-tree", "-r", "--full-tree", ref], {
      cwd: repo,
      encoding: "utf8",
      maxBuffer: 128 * 1024 * 1024,
    });
    const rows: Array<{ objectPath: string; blobSha: string }> = [];
    for (const line of out.split(/\r?\n/)) {
      // mode type sha\tpath
      const m = line.match(/^\d+\s+blob\s+([0-9a-f]+)\t(.+\.pdf)$/i);
      if (!m) continue;
      rows.push({ blobSha: m[1]!, objectPath: m[2]! });
    }
    return rows;
  } catch {
    return [];
  }
}

function listRefs(repo: string): string[] {
  try {
    const out = execFileSync("git", ["for-each-ref", "--format=%(refname)", "refs/heads", "refs/remotes"], {
      cwd: repo,
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
    });
    return out
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const startedAt = new Date().toISOString();
  const inaccessible: string[] = [];
  const searchedRoots: string[] = [];

  const worktrees = listWorktrees(PRODUCT);
  // Also include any sibling casebrain-* dirs under user home that aren't worktrees
  const home = "C:\\Users\\gduff";
  const extraRoots: string[] = [];
  try {
    for (const ent of readdirSync(home, { withFileTypes: true })) {
      if (!ent.isDirectory()) continue;
      if (!/casebrain/i.test(ent.name)) continue;
      const full = path.join(home, ent.name);
      if (!worktrees.some((w) => path.resolve(w.path).toLowerCase() === path.resolve(full).toLowerCase())) {
        extraRoots.push(full);
      }
    }
  } catch (e) {
    inaccessible.push(`${home} (${(e as Error).message})`);
  }

  const roots = [
    ...worktrees.map((w) => w.path),
    ...extraRoots,
  ];

  const pdfPaths: string[] = [];
  for (const root of roots) {
    searchedRoots.push(root);
    if (!existsSync(root)) {
      inaccessible.push(`${root} (missing)`);
      continue;
    }
    walkPdfs(root, pdfPaths, inaccessible);
  }

  // Map path → worktree metadata
  const wtByPath = worktrees
    .slice()
    .sort((a, b) => b.path.length - a.path.length);

  function wtFor(abs: string): Worktree | null {
    const norm = path.resolve(abs).toLowerCase();
    for (const w of wtByPath) {
      if (norm.startsWith(path.resolve(w.path).toLowerCase() + path.sep) || norm === path.resolve(w.path).toLowerCase()) {
        return w;
      }
    }
    return null;
  }

  const physical: PdfRecord[] = [];
  const byHash = new Map<string, string[]>();

  let i = 0;
  for (const abs of pdfPaths) {
    i += 1;
    if (i % 100 === 0) console.log(`hashing physical ${i}/${pdfPaths.length}`);
    let st;
    try {
      st = statSync(abs);
    } catch (e) {
      inaccessible.push(`${abs} (${(e as Error).message})`);
      continue;
    }
    const sha = await sha256File(abs);
    const wt = wtFor(abs);
    const rec: PdfRecord = {
      absolutePath: abs,
      filename: path.basename(abs),
      sha256: sha,
      sizeBytes: st.size,
      pageCount: cheapPageCount(abs),
      worktreePath: wt?.path ?? null,
      branch: wt?.branch ?? null,
      head: wt?.head ?? null,
      originatingCorpusGuess: guessCorpus(abs),
      likelyCaseOrTemplateId: guessCaseId(abs),
      presence: "physical_now",
      duplicateGroupId: sha,
    };
    physical.push(rec);
    if (!byHash.has(sha)) byHash.set(sha, []);
    byHash.get(sha)!.push(abs);
  }

  // Git-recoverable scan on primary repos (hub + product share objects via worktrees of same repo)
  // Use the main hub worktree as git cwd — all listed worktrees appear to be same repo family.
  const gitRepos = Array.from(new Set(worktrees.map((w) => w.path)));
  const gitRecoverable: GitPdfRecord[] = [];
  const seenBlob = new Set<string>();
  const physicalPathByBasename = new Map<string, string[]>();
  for (const p of physical) {
    const b = p.filename.toLowerCase();
    if (!physicalPathByBasename.has(b)) physicalPathByBasename.set(b, []);
    physicalPathByBasename.get(b)!.push(p.absolutePath);
  }

  // Prefer scanning refs from the integrity hub and the product WT (same object DB if linked)
  const gitScanRoots = [
    "C:\\Users\\gduff\\casebrain-hub",
    PRODUCT,
    "C:\\Users\\gduff\\casebrain-hub-wt-s3000-execution",
    "C:\\Users\\gduff\\casebrain-hub-wt-s3000-diverse",
  ].filter((p) => existsSync(path.join(p, ".git")) || existsSync(p));

  const scannedGitRoots: string[] = [];
  for (const repo of gitScanRoots) {
    // resolve common git dir
    let common = repo;
    try {
      common = execFileSync("git", ["rev-parse", "--git-common-dir"], { cwd: repo, encoding: "utf8" }).trim();
      if (!path.isAbsolute(common)) common = path.resolve(repo, common);
    } catch {
      inaccessible.push(`${repo} (not a git repo)`);
      continue;
    }
    if (scannedGitRoots.includes(common)) continue;
    scannedGitRoots.push(common);

    const refs = listRefs(repo);
    console.log(`git scan repo=${repo} refs=${refs.length}`);
    // Cap: scan all local heads; remotes can be large — include them but dedupe by blobSha+path
    for (const ref of refs) {
      const rows = gitPdfPathsOnRef(repo, ref);
      for (const r of rows) {
        const key = `${r.blobSha}|${r.objectPath}`;
        if (seenBlob.has(key)) continue;
        seenBlob.add(key);
        let sizeBytes: number | null = null;
        try {
          const sz = execFileSync("git", ["cat-file", "-s", r.blobSha], { cwd: repo, encoding: "utf8" }).trim();
          sizeBytes = Number(sz);
        } catch {
          /* ignore */
        }
        const base = path.basename(r.objectPath).toLowerCase();
        const physicalPaths = physicalPathByBasename.get(base) ?? [];
        gitRecoverable.push({
          repo,
          ref,
          objectPath: r.objectPath,
          blobSha: r.blobSha,
          sizeBytes,
          presence: "git_recoverable",
          alsoPhysicalNow: physicalPaths.length > 0,
          physicalPaths,
        });
      }
    }
  }

  // Unique physical by content hash
  const uniqueHashes = [...byHash.keys()];
  const uniqueGroups = uniqueHashes.map((sha) => {
    const paths = byHash.get(sha)!;
    const sample = physical.find((p) => p.sha256 === sha)!;
    return {
      sha256: sha,
      copyCount: paths.length,
      sizeBytes: sample.sizeBytes,
      pageCount: sample.pageCount,
      paths,
      originatingCorpusGuess: sample.originatingCorpusGuess,
      likelyCaseOrTemplateIds: [...new Set(paths.map((p) => guessCaseId(p)).filter(Boolean))],
      branches: [...new Set(paths.map((p) => wtFor(p)?.branch).filter(Boolean))],
      worktrees: [...new Set(paths.map((p) => wtFor(p)?.path).filter(Boolean))],
    };
  });

  // Case/bundle groups: prefer likelyCaseOrTemplateId when under .../cases/<id>/
  const caseGroups = new Map<string, Set<string>>();
  for (const g of uniqueGroups) {
    const key =
      (g.likelyCaseOrTemplateIds[0] as string | undefined) ||
      `hash:${g.sha256.slice(0, 12)}`;
    if (!caseGroups.has(key)) caseGroups.set(key, new Set());
    caseGroups.get(key)!.add(g.sha256);
  }

  // Git-only blobs (no physical file with same basename — approximate; better: hash blob)
  // Content-compare: for git blobs not alsoPhysicalNow, try to see if any physical sha matches by size+name
  const gitOnly = gitRecoverable.filter((g) => !g.alsoPhysicalNow);
  const gitUniquePaths = new Set(gitRecoverable.map((g) => g.objectPath));
  const gitUniqueBlobs = new Set(gitRecoverable.map((g) => g.blobSha));

  const summary = {
    programme: "casebrain-physical-pdf-discovery",
    mode: "READ_ONLY",
    recordedAt: new Date().toISOString(),
    startedAt,
    productWorktree: PRODUCT,
    productHead: execFileSync("git", ["rev-parse", "HEAD"], { cwd: PRODUCT, encoding: "utf8" }).trim(),
    locationsSearched: searchedRoots,
    worktreesEnumerated: worktrees,
    extraNonWorktreeRoots: extraRoots,
    inaccessible,
    totals: {
      pdfFilesPhysicallyLocated: physical.length,
      uniquePdfsByContentHash: uniqueHashes.length,
      uniqueCaseOrBundleGroups: caseGroups.size,
      duplicateCopiesExtra: physical.length - uniqueHashes.length,
      gitRecoverablePdfPathRefPairs: gitRecoverable.length,
      gitUniqueObjectPaths: gitUniquePaths.size,
      gitUniqueBlobs: gitUniqueBlobs.size,
      gitRecoverableNotPresentAsPhysicalBasename: gitOnly.length,
    },
    corpusGuessBreakdown: Object.fromEntries(
      Object.entries(
        physical.reduce<Record<string, number>>((acc, p) => {
          const k = p.originatingCorpusGuess ?? "unknown";
          acc[k] = (acc[k] ?? 0) + 1;
          return acc;
        }, {}),
      ),
    ),
    notes: [
      "Deduplication is by SHA-256 of full PDF file bytes.",
      "Page counts are cheap heuristic (/Type /Page in first 8MB) and may be null/approximate.",
      "Git-recoverable inventory lists blob paths on refs without checkout; content identity vs physical uses basename/size linkage unless blob extracted.",
      "No synthetic PDF regeneration was performed.",
      "No worktree checkout or filesystem mutation was performed.",
    ],
  };

  writeFileSync(path.join(OUT, "pdf-discovery-summary.json"), JSON.stringify(summary, null, 2));
  writeFileSync(
    path.join(OUT, "pdf-discovery-physical.ndjson"),
    physical.map((p) => JSON.stringify(p)).join("\n") + "\n",
  );
  writeFileSync(
    path.join(OUT, "pdf-discovery-unique-by-hash.json"),
    JSON.stringify(uniqueGroups.sort((a, b) => b.copyCount - a.copyCount || a.sha256.localeCompare(b.sha256)), null, 2),
  );
  writeFileSync(
    path.join(OUT, "pdf-discovery-git-recoverable.ndjson"),
    gitRecoverable.map((g) => JSON.stringify(g)).join("\n") + "\n",
  );
  writeFileSync(
    path.join(OUT, "pdf-discovery-case-groups.json"),
    JSON.stringify(
      [...caseGroups.entries()].map(([id, hashes]) => ({
        caseOrBundleGroupId: id,
        uniquePdfHashes: [...hashes],
        uniquePdfCount: hashes.size,
      })),
      null,
      2,
    ),
  );

  const md = `# CaseBrain physical PDF discovery (READ-ONLY)

Generated: ${summary.recordedAt}

## Totals

| Metric | Count |
|--------|------:|
| Physical .pdf files located | ${summary.totals.pdfFilesPhysicallyLocated} |
| Unique PDFs by content SHA-256 | ${summary.totals.uniquePdfsByContentHash} |
| Unique case/bundle groups | ${summary.totals.uniqueCaseOrBundleGroups} |
| Duplicate copies (extra beyond unique) | ${summary.totals.duplicateCopiesExtra} |
| Git recoverable path×ref pairs | ${summary.totals.gitRecoverablePdfPathRefPairs} |
| Git unique object paths | ${summary.totals.gitUniqueObjectPaths} |
| Git unique blobs | ${summary.totals.gitUniqueBlobs} |
| Git entries not present as physical basename | ${summary.totals.gitRecoverableNotPresentAsPhysicalBasename} |

## Locations searched

${searchedRoots.map((r) => `- ${r}`).join("\n")}

## Inaccessible / errors

${inaccessible.length ? inaccessible.map((x) => `- ${x}`).join("\n") : "- (none reported)"}

## Corpus guess (physical files)

${Object.entries(summary.corpusGuessBreakdown)
  .map(([k, v]) => `- ${k}: ${v}`)
  .join("\n")}

## Artefacts

- \`pdf-discovery-summary.json\`
- \`pdf-discovery-physical.ndjson\`
- \`pdf-discovery-unique-by-hash.json\`
- \`pdf-discovery-git-recoverable.ndjson\`
- \`pdf-discovery-case-groups.json\`
`;
  writeFileSync(path.join(OUT, "PDF-DISCOVERY-REPORT.md"), md);
  console.log(JSON.stringify(summary.totals, null, 2));
  console.log("wrote", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
