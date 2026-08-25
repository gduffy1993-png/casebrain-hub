/** Ledger probe: what does the truth ledger see in the text the chase builder is handed? */
import fs from "node:fs";
import path from "node:path";

import { buildBundleTruthLedger, ledgerMaterialsNeedingChase } from "@/lib/criminal/bundle-truth-ledger";

const dir = path.join(__dirname, "app-source");
const cases = [
  ["Davies", "687cf5a6-6898-4257-baef-33e33ace08df"],
  ["Patel", "7e763777-94a8-4958-a190-a35ef6ddb259"],
  ["Hale", "14823d9e-1f0f-4cfc-af01-e6595d1cdfc4"],
];

for (const [name, id] of cases) {
  const text = fs.readFileSync(path.join(dir, `${id}.app-source.txt`), "utf8");
  const ledger = buildBundleTruthLedger({ bundleText: text });
  const counts: Record<string, number> = {};
  for (const m of ledger.materials) counts[m.status] = (counts[m.status] ?? 0) + 1;

  console.log(`\n### ${name}  (text ${text.length} chars)`);
  console.log(`    ledger materials : ${ledger.materials.length}`);
  console.log(`    status counts    : ${JSON.stringify(counts)}`);
  console.log(`    needing chase    : ${ledgerMaterialsNeedingChase(ledger).length}`);
  for (const m of ledger.materials.slice(0, 10)) {
    console.log(`      [${m.status}] ${m.displayLine.slice(0, 76)}`);
  }
}
