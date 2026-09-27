import fs from "node:fs";
import { normaliseBundleMaterials } from "../../../../../lib/criminal/bundle-material-normalizer";

const captured = JSON.parse(
  fs.readFileSync(
    "artifacts/casebrain-qa/assurance/solicitor-signal-v1/_replay/big-inputs/f57a2750-d24e-42a2-9f73-92384db565dc.builder-inputs.json",
    "utf8",
  ),
);
const text: string = captured.bundleSource?.data?.frontMatterScan ?? "";
for (const n of [80_000, 250_000, 500_000, 1_000_000, text.length]) {
  const slice = text.slice(0, n);
  const t0 = Date.now();
  const rows = normaliseBundleMaterials(slice);
  const refs = rows.filter((r) => r.scheduleRef);
  const stated = rows.filter(
    (r) => r.scheduleRef && (r.status === "outstanding" || r.status === "absent"),
  );
  console.log(
    `cap=${String(n).padStart(8)} rows=${String(rows.length).padStart(5)} refs=${String(refs.length).padStart(4)} stated=${String(stated.length).padStart(3)} ms=${Date.now() - t0}`,
  );
}
