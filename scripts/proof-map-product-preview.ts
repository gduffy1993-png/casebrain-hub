/**
 * Generate proof-map HTML previews for pilot browser sign-off pack.
 * Run: npx tsx scripts/proof-map-product-preview.ts
 */
import fs from "node:fs";
import path from "node:path";
import { buildProductProofMap } from "../lib/criminal/proof-map/build-product-proof-map";
import type { ProductProofMapViewModel } from "../lib/criminal/proof-map/product-proof-map-types";

const OUT = path.resolve(__dirname, "../artifacts/casebrain-qa/proof-map-product");
const GOLD = path.resolve(__dirname, "../docs/bundle-fidelity-set/gold/pilot-3");

const CASES = [
  { slug: "marcus-vale", label: "Marcus Vale", allegation: "Fraud by false representation" },
  { slug: "kian-doyle", label: "Kian Doyle", allegation: "Possession with intent to supply" },
  { slug: "leon-marsh", label: "Leon Marsh", allegation: "Robbery" },
] as const;

function renderHtml(name: string, vm: ProductProofMapViewModel): string {
  const points = vm.proofPoints
    .map(
      (p) => `<li><strong>${esc(p.label)}</strong><br>${esc(p.crownMustProve)}<br><em>${esc(p.sourceBasis ?? "Provisional — not safely on papers")}</em></li>`,
    )
    .join("");
  const chase = vm.disclosureChaseLinks
    .slice(0, 6)
    .map((l) => `<li>${esc(l.label)}${l.disclosureChase ? ` — ${esc(l.disclosureChase)}` : ""}</li>`)
    .join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${esc(name)} proof map</title>
<style>body{font-family:system-ui,sans-serif;max-width:720px;margin:24px auto;padding:0 16px;color:#0f172a}
h1{font-size:18px}h2{font-size:13px;color:#475569;margin-top:20px}ul{font-size:12px;line-height:1.5}
.badge{display:inline-block;background:#e0e7ff;color:#312e81;padding:2px 8px;border-radius:4px;font-size:11px;margin-right:6px}
.warn{background:#fffbeb;border:1px solid #fde68a;padding:10px;border-radius:6px;font-size:11px;margin-top:12px}</style></head>
<body><h1>Proof map — ${esc(name)}</h1>
<p><span class="badge">${esc(vm.offenceLensLabel)}</span><span class="badge">${esc(vm.tierLabel)}</span></p>
<p><strong>Charge:</strong> ${esc(vm.charge)}</p>
<div class="warn">${esc(vm.doNotRelyWarning)}</div>
<h2>What the Crown must prove</h2><ul>${points}</ul>
<h2>Disclosure chase linked to proof issues</h2><ul>${chase || "<li>None on current papers.</li>"}</ul>
</body></html>`;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

fs.mkdirSync(OUT, { recursive: true });

for (const c of CASES) {
  const bundle = fs.readFileSync(path.join(GOLD, c.slug, "bundle-export.md"), "utf8");
  const result = buildProductProofMap({
    frontMatterScan: bundle,
    combinedTextLength: bundle.length,
    matterLabel: c.label,
    allegation: c.allegation,
  });
  if (!result.available) {
    console.warn(`${c.label}: unavailable — ${result.message}`);
    continue;
  }
  const html = renderHtml(c.label, result);
  const outFile = path.join(OUT, `${c.slug}.html`);
  fs.writeFileSync(outFile, html);
  fs.writeFileSync(path.join(OUT, `${c.slug}.json`), JSON.stringify(result, null, 2));
  console.log("wrote", outFile);
}

console.log("proof-map previews →", OUT);
