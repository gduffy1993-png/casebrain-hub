/**
 * Snapshot current V2.1 readiness artefacts before extending to v2.2 every-word foundation.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const DIR = path.join(
  process.cwd(),
  "artifacts/casebrain-qa/assurance/master-auditor-v2",
);
const SNAP = path.join(DIR, "v2.1-snapshot");

function main() {
  fs.mkdirSync(SNAP, { recursive: true });
  const files = fs
    .readdirSync(DIR)
    .filter((f) => fs.statSync(path.join(DIR, f)).isFile());
  const inventory: Array<{
    file: string;
    bytes: number;
    sha256: string;
    retainedAs: string;
  }> = [];
  for (const f of files) {
    const p = path.join(DIR, f);
    const buf = fs.readFileSync(p);
    const sha256 = crypto.createHash("sha256").update(buf).digest("hex");
    fs.copyFileSync(p, path.join(SNAP, f));
    inventory.push({
      file: f,
      bytes: buf.length,
      sha256,
      retainedAs: `v2.1-snapshot/${f}`,
    });
  }
  const reg = JSON.parse(
    fs.readFileSync(path.join(DIR, "auditor-control-registry-v2.json"), "utf8"),
  ) as { registryVersion: string; schemaVersion: string };
  const registryHash = inventory.find((i) => i.file === "auditor-control-registry-v2.json")!.sha256;
  const lineage = {
    schemaVersion: "maa-v2.1-lineage-manifest@1.0.0",
    createdAt: new Date().toISOString(),
    baselineCommit: "7066cb6fe740ef43c98cc0b683ef04f8a7d0b127",
    parentRegistryVersion: reg.registryVersion,
    parentSchemaVersion: reg.schemaVersion,
    migrationReason:
      "Extend V2.1 execution-readiness into every-word Stage-150 foundation (v2.2) without forking a second registry. Cursor hardening addendum accepted.",
    nextRegistryVersion: "2.2.0",
    nextSchemaVersion: "maa-control-registry@v2.2.0",
    v21RegistryHash: registryHash,
    artifactInventory: inventory,
    dispositionPolicy: {
      superseded:
        "Live files under master-auditor-v2/ will be extended by v2.2 artefacts; V2.1 meaning preserved in v2.1-snapshot/",
      retained: "v2.1-snapshot/* immutable copy",
      extended: "control IDs retained; fields added; no silent meaning rewrite",
    },
    stage150RemainsBlocked: true,
    hardeningAddendumAccepted: true,
  };
  fs.writeFileSync(
    path.join(DIR, "v2.1-lineage-manifest.json"),
    JSON.stringify(lineage, null, 2) + "\n",
    "utf8",
  );
  console.log(
    JSON.stringify(
      {
        ok: true,
        files: inventory.length,
        parent: reg.registryVersion,
        registryHash16: registryHash.slice(0, 16),
      },
      null,
      2,
    ),
  );
}

main();
