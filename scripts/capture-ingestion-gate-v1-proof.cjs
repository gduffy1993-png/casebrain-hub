const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const BASE = (process.env.INGESTION_PROOF_BASE || "http://127.0.0.1:3100").replace(/\/$/, "");
const EMAIL = process.env.GOLD20_EMAIL || "gduffy1993+casebrain-gold20@gmail.com";
const OUT = path.resolve(
  "artifacts/casebrain-qa/assurance/certified-claim-lineage-v1/slice1-ingestion-gate-v1",
);

const CASES = [
  {
    id: "liam-parker",
    caseId: "883193c5-7eb2-433a-827d-d58c1b8874da",
    expected: "withheld",
    tabs: ["overview", "file", "disclosure-chase", "today"],
  },
  {
    id: "known16-leon-hale",
    caseId: "9b555b7b-d520-4c33-a661-9ed93acc0fe1",
    expected: "healthy",
    tabs: ["overview", "file"],
  },
];

function password() {
  if (process.env.GOLD20_PASSWORD?.trim()) return process.env.GOLD20_PASSWORD.trim();
  const local = path.resolve("artifacts/casebrain-qa/gold20/sign-in.local.json");
  if (!fs.existsSync(local)) return "";
  return String(JSON.parse(fs.readFileSync(local, "utf8")).password || "").trim();
}

function ensure(directory) {
  fs.mkdirSync(directory, { recursive: true });
}

async function signIn(page, secret) {
  await page.goto(`${BASE}/sign-in`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.locator('input[type="email"], input[name="email"]').first().fill(EMAIL);
  await page.locator('input[type="password"], input[name="password"]').first().fill(secret);
  await page.getByRole("button", { name: /sign in/i }).first().click();
  await page.waitForURL((url) => !url.pathname.includes("sign-in"), { timeout: 45_000 });
}

async function capture(page, spec, tab) {
  const url = `${BASE}/cases/${spec.caseId}?tab=${tab}&controlRoom=1&demoShell=1`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForFunction(
    () => {
      const body = document.body.innerText;
      return !/Loading workspace/i.test(body) && body.length > 250;
    },
    undefined,
    { timeout: 45_000 },
  );
  await page.waitForTimeout(1_200);
  const text = await page.locator("body").innerText();
  const caseDir = path.join(OUT, spec.id);
  ensure(caseDir);
  fs.writeFileSync(path.join(caseDir, `${tab}.txt`), text, "utf8");
  await page.screenshot({
    path: path.join(caseDir, `${tab}.png`),
    fullPage: false,
  });

  const withheld =
    /Source extraction incomplete/i.test(text) &&
    /Substantive outputs withheld/i.test(text);
  const parserDiagnosticVisible = /bad XRef entry|PDF parsing failed:/i.test(text);
  const quietConclusionVisible =
    /\b0 items\b|no chase needed|No source-material chase items safely detected/i.test(text);
  return {
    tab,
    url,
    withheld,
    parserDiagnosticVisible,
    quietConclusionVisible,
    textLength: text.length,
  };
}

(async () => {
  const secret = password();
  if (!secret) throw new Error("Gold20 proof password is unavailable");
  ensure(OUT);
  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE,
    loginEmail: EMAIL,
    cases: [],
  };
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    await signIn(page, secret);
    for (const spec of CASES) {
      const tabs = [];
      for (const tab of spec.tabs) tabs.push(await capture(page, spec, tab));
      const pass =
        spec.expected === "withheld"
          ? tabs.every(
              (entry) =>
                entry.withheld &&
                !entry.parserDiagnosticVisible &&
                !entry.quietConclusionVisible,
            )
          : tabs.every((entry) => !entry.withheld && entry.textLength > 250);
      report.cases.push({ ...spec, tabs, pass });
      console.log(`${spec.id}: ${pass ? "PASS" : "FAIL"}`);
    }
  } finally {
    await browser.close();
  }
  const output = JSON.stringify(report, null, 2);
  if (output.includes(secret)) throw new Error("Refusing to persist proof password");
  fs.writeFileSync(path.join(OUT, "CAPTURE.json"), output);
  if (!report.cases.every((entry) => entry.pass)) process.exitCode = 1;
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
