/**
 * Live PR #101 preview capture: Leverage File-named Overview/Chase gaps.
 * Gold20 only. Does not write the password into artefacts.
 *
 *   node artifacts/casebrain-qa/assurance/leverage-file-named-gaps-v1/run-capture.cjs
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = (
  process.env.GOLD20_PREVIEW ||
  "https://casebrain-hub-git-ui-demo-overv-5aa27b-gduffy1993-pngs-projects.vercel.app"
).replace(/\/$/, "");
const EMAIL = "gduffy1993+casebrain-gold20@gmail.com";
const OUT = path.resolve("artifacts/casebrain-qa/assurance/leverage-file-named-gaps-v1");
const secret = JSON.parse(
  fs.readFileSync(path.resolve("artifacts/casebrain-qa/gold20/sign-in.local.json"), "utf8"),
);
const PASSWORD = String(secret.password || "");

const CASES = [
  {
    id: "leverage",
    caseId: "17e21c53-5635-481e-a189-c8116d56c3d6",
    tabs: ["overview", "chase"],
    extraOk: (t) => /Alden Vale|What needs attention|DISCLOSURE CHASE|CCTV master|No outstanding attention/i.test(t),
  },
  {
    id: "ahmed",
    caseId: "ff92431f-fd4b-4adb-992e-abfdb5c80faa",
    tabs: ["overview"],
    extraOk: (t) => /Holly Ahmed|What needs attention/i.test(t),
  },
  {
    id: "patel",
    caseId: "ffddc1a8-b837-4bde-bb50-bc55be0e7626",
    tabs: ["overview"],
    extraOk: (t) => /Isaac Patel|What needs attention/i.test(t),
  },
  {
    id: "gauntlet",
    caseId: "280e487c-3680-4eca-97f1-988828f448e2",
    tabs: ["overview"],
    extraOk: (t) => /Riley North|What needs attention/i.test(t),
  },
  {
    id: "brookes-fresh",
    caseId: "95a2746e-d1d3-4f55-aad6-4fb41a7b428b",
    tabs: ["overview"],
    extraOk: (t) => /Taylor Brookes|Intimidating a witness/i.test(t),
  },
  {
    id: "vale-bell",
    caseId: "b6d8ed78-b475-4d78-bc44-a7ec1e5475f0",
    tabs: ["overview"],
    extraOk: (t) => /Vale Bell|driver identity/i.test(t),
  },
];

const TAB_QUERY = {
  overview: "overview",
  chase: "disclosure-chase",
};

function log(line) {
  fs.writeSync(1, String(line) + "\n");
}

function stillLoading(t) {
  return /Loading (matter dashboard|disclosure chase tracker|papers|workspace|case overview)|Building matter brief/i.test(
    t,
  );
}

async function signIn(page) {
  await page.goto(`${BASE}/sign-in`, { waitUntil: "networkidle", timeout: 90000 });
  await page.locator('input[type="email"]').first().fill(EMAIL);
  await page.locator('input[type="password"]').first().fill(PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).first().click();
  for (let i = 0; i < 25; i++) {
    if (!page.url().includes("sign-in")) return true;
    await page.waitForTimeout(800);
  }
  return !page.url().includes("sign-in");
}

async function waitBody(page, { extraOk, timeoutMs }) {
  const deadline = Date.now() + timeoutMs;
  let last = "";
  while (Date.now() < deadline) {
    last = (await page.locator("body").innerText().catch(() => "")) || "";
    const okLen = last.length > 400;
    const extra = extraOk ? extraOk(last) : true;
    if (okLen && extra && !stillLoading(last) && !/Sign in to CaseBrain/i.test(last)) {
      return last;
    }
    await page.waitForTimeout(1500);
  }
  return last;
}

async function openReceipts(page) {
  const why = page.getByText(/Why \/ source receipt/i).first();
  if (await why.count()) {
    await why.click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(600);
  }
}

(async () => {
  if (!PASSWORD) throw new Error("password missing");
  fs.mkdirSync(path.join(OUT, "receipts"), { recursive: true });
  fs.mkdirSync(path.join(OUT, "screenshots"), { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const report = {
    signedIn: false,
    recaptured: [],
    errors: [],
    base: BASE,
    email: EMAIL,
    sha: process.env.PROOF_SHA || "bf13248a71d6bd30c7dae97b462781e2a0d29db9",
  };
  try {
    report.signedIn = await signIn(page);
    log("SIGNED_IN=" + report.signedIn);
    for (const spec of CASES) {
      const row = { id: spec.id, caseId: spec.caseId, tabs: {} };
      for (const tab of spec.tabs) {
        const query = TAB_QUERY[tab];
        const url = `${BASE}/cases/${spec.caseId}?tab=${query}&controlRoom=1&demoShell=1`;
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
        let body = await waitBody(page, { timeoutMs: 50000, extraOk: spec.extraOk });
        if (tab === "overview" || tab === "chase") {
          await openReceipts(page);
          body = (await page.locator("body").innerText().catch(() => body)) || body;
        }
        const dir = path.join(OUT, "receipts", spec.id);
        const shotDir = path.join(OUT, "screenshots", spec.id);
        fs.mkdirSync(dir, { recursive: true });
        fs.mkdirSync(shotDir, { recursive: true });
        fs.writeFileSync(path.join(dir, `${tab}.txt`), body, "utf8");
        await page.screenshot({ path: path.join(shotDir, `${tab}.png`), fullPage: true }).catch((e) => {
          report.errors.push(`${spec.id}/${tab}-shot:${e.message}`);
        });
        row.tabs[tab] = {
          len: body.length,
          loading: stillLoading(body),
          flags: {
            cctvMaster: /CCTV master/i.test(body),
            continuity: /continuity/i.test(body),
            idNotes: /ID procedure notes/i.test(body),
            emptyBoard: /0 items|No source-material chase items safely detected/i.test(body),
            reasonableExcuse: /reasonable excuse/i.test(body),
            emailTail: /not included with the email/i.test(body),
            officerNote: /officer note says/i.test(body),
            settledFragment: /treated as a settled/i.test(body),
            intimidating: /intimidating a witness/i.test(body),
            valePressure: /driver identity and toxicology/i.test(body),
          },
        };
        log(`${spec.id}/${tab} len=${body.length} loading=${stillLoading(body)}`);
      }
      report.recaptured.push(row);
    }
  } catch (e) {
    report.errors.push(String(e && e.stack ? e.stack : e));
  } finally {
    fs.writeFileSync(path.join(OUT, "CAPTURE.json"), JSON.stringify(report, null, 2));
    await browser.close();
  }
  log("DONE errors=" + report.errors.length);
  if (report.errors.length) process.exit(1);
})();
