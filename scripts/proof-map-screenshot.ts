/**
 * Screenshot proof-map HTML previews (no auth required).
 * Run: npx tsx scripts/proof-map-screenshot.ts
 */
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";

const OUT = path.resolve(__dirname, "../artifacts/casebrain-qa/proof-map-product");
const files = ["marcus-vale", "kian-doyle", "leon-marsh"] as const;

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 820, height: 1100 } });
  for (const f of files) {
    const html = path.join(OUT, `${f}.html`);
    await page.goto(pathToFileURL(html).href, { waitUntil: "load" });
    await page.screenshot({ path: path.join(OUT, `${f}.png`), fullPage: true });
    console.log("screenshot", f);
  }
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
