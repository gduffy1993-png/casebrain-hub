const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const base = (process.env.F167_PREVIEW || "").replace(/\/$/, "");
const out = process.env.F167_OUT;
const email = process.env.F167_EMAIL || "gduffy1993+casebrain@gmail.com";
const password = process.env.SMOKE_PASSWORD || process.env.CB_QA_PASSWORD || "";
const targets = ["Brookes", "Dunn", "Ahmed", "Patel", "Tobin", "Grant"];

if (!base) throw new Error("F167_PREVIEW required");
if (!out) throw new Error("F167_OUT required");
if (!password) throw new Error("password required");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(base + "/sign-in", { waitUntil: "networkidle", timeout: 90000 });
  await page.locator("input[type=email], #email, input[name=email]").first().fill(email);
  await page.locator("input[type=password], #password, input[name=password]").first().fill(password);
  await page.locator("button[type=submit]").first().click();
  await page.waitForTimeout(5000);
  if (page.url().includes("sign-in")) throw new Error("sign-in failed");

  await page.goto(base + "/cases", { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(2500);
  const links = await page.locator('a[href*="/cases/"]').evaluateAll((as) =>
    as
      .map((a) => ({
        href: a.getAttribute("href"),
        text: (a.innerText || "").replace(/\s+/g, " ").trim(),
      }))
      .filter((x) => x.href),
  );

  const found = {};
  for (const t of targets) {
    const hit = links.find((l) => new RegExp(t, "i").test(l.text));
    if (hit) {
      const m = hit.href.match(/cases\/([0-9a-f-]{36})/i);
      found[t] = { caseId: m ? m[1] : null, href: hit.href, label: hit.text.slice(0, 120) };
    } else {
      found[t] = null;
    }
  }
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, "canary-case-ids.json"), JSON.stringify({ preview: base, found, linkCount: links.length }, null, 2));
  console.log(JSON.stringify(found, null, 2));

  for (const [name, info] of Object.entries(found)) {
    if (!info?.caseId) {
      console.log("SKIP", name);
      continue;
    }
    const dir = path.join(out, name.toLowerCase());
    fs.mkdirSync(dir, { recursive: true });
    for (const tab of ["court", "papers", "overview", "disclosure-chase"]) {
      const url = `${base}/cases/${info.caseId}?tab=${tab}&controlRoom=1`;
      await page.goto(url, { waitUntil: "networkidle", timeout: 120000 });
      await page.waitForTimeout(2500);
      const body = await page.locator("body").innerText();
      fs.writeFileSync(path.join(dir, `${tab}.txt`), body);
      const exportHit = /\bexport\s+log\b/i.test(body);
      const downloadHit = /phone download|source export|original download/i.test(body);
      const cadHit = /\bCAD\b|999 audio/i.test(body);
      console.log(name, tab, `exportLog=${exportHit}`, `download=${downloadHit}`, `cad999=${cadHit}`);
    }
  }
  await browser.close();
  console.log("CANARIES_DONE");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
