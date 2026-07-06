#!/usr/bin/env npx tsx
/**
 * Write canonical-bundle.md and truth-key.json for demo-audit cases 06–30.
 * Run: npx tsx scripts/scaffold-demo-audit-thirty-cases.ts
 */
import fs from "node:fs";
import path from "node:path";

import { caseDirForId } from "../lib/eval/demo-audit-packs/case-specs";
import { DEMO_AUDIT_GENERATED_CASES } from "../lib/eval/demo-audit-packs/thirty-case-catalog";

const ROOT = process.cwd();
const BANNED = /\b(synthetic|simulator|test bundle|fake bundle|ai generated)\b/i;

function main() {
  for (const pack of DEMO_AUDIT_GENERATED_CASES) {
    const caseDir = path.join(ROOT, caseDirForId(pack.spec.id));
    fs.mkdirSync(caseDir, { recursive: true });

    if (BANNED.test(pack.canonicalBundle)) {
      throw new Error(`Banned wording in bundle for ${pack.spec.id}`);
    }

    fs.writeFileSync(path.join(caseDir, "canonical-bundle.md"), pack.canonicalBundle);
    fs.writeFileSync(path.join(caseDir, "truth-key.json"), JSON.stringify(pack.truthKey, null, 2));
    console.log(`Scaffolded ${pack.spec.id}`);
  }
  console.log(`\nDone — ${DEMO_AUDIT_GENERATED_CASES.length} cases scaffolded.`);
}

main();
