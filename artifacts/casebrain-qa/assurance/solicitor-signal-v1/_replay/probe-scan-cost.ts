/**
 * What reading the whole bundle costs.
 *
 * Raising the cap fixed what the app sees. This measures what it now pays for it, because a board
 * nobody waits for is no more use than a board that was never read.
 */
import fs from "node:fs";
import path from "node:path";

import { normaliseBundleMaterials } from "../../../../../lib/criminal/bundle-material-normalizer";

const dir = path.join(__dirname, "builder-inputs");
const cases = [
  "687cf5a6-6898-4257-baef-33e33ace08df",
  "14823d9e-1f0f-4cfc-af01-e6595d1cdfc4",
  "f57a2750-d24e-42a2-9f73-92384db565dc",
];

for (const caseId of cases) {
  const captured = JSON.parse(
    fs.readFileSync(path.join(dir, `${caseId}.builder-inputs.json`), "utf8"),
  );
  const text: string = captured.bundleSource?.data?.frontMatterScan ?? "";
  const started = Date.now();
  const rows = normaliseBundleMaterials(text);
  const ms = Date.now() - started;
  console.log(
    `${caseId.slice(0, 8)}  chars=${String(text.length).padStart(9)}  rows=${String(rows.length).padStart(5)}  ledger=${String(ms).padStart(7)}ms`,
  );
}
