/**
 * Capture every input the live chase builder receives, not just the bundle text.
 *
 * The earlier replay fed only `frontMatterScan`, which is what `DisclosureChase.tsx` passes as
 * `bundleText` — so the text was never the difference. What the replay lacked was the rest:
 * canonical evidence rows, canonical findings, the battleboard and the matter. `canonicalEvidenceRows`
 * in particular drives a served-alias suppression filter, so a row can survive offline and be
 * dropped live. Saving the whole payload is what makes offline and live comparable.
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const base = (process.env.F167_PREVIEW || "").replace(/\/$/, "");
const out = process.env.F167_OUT;
const email = process.env.F167_EMAIL || "gduffy1993+casebrain@gmail.com";
const password = process.env.SMOKE_PASSWORD?.trim() || "";
const caseIds = (process.env.F167_CASE_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (!base) throw new Error("F167_PREVIEW required");
if (!out) throw new Error("F167_OUT required");
if (!password) throw new Error("password required");
if (!caseIds.length) throw new Error("F167_CASE_IDS required");

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(base + "/sign-in", { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(800);
  await page.locator('input[type="email"], #email, input[name="email"]').first().fill(email);
  await page.locator('input[type="password"], #password, input[name="password"]').first().fill(password);
  await page.locator('button[type="submit"]').first().click();
  for (let i = 0; i < 25; i++) {
    if (!page.url().includes("sign-in")) break;
    await page.waitForTimeout(1000);
  }
  if (page.url().includes("sign-in")) throw new Error("sign-in failed");

  const index = [];
  for (const id of caseIds) {
    const payload = await page.evaluate(async (caseId) => {
      const get = async (suffix) => {
        try {
          const res = await fetch(`/api/criminal/${caseId}/${suffix}`, {
            cache: "no-store",
            credentials: "include",
          });
          const json = await res.json().catch(() => null);
          return { status: res.status, data: json?.data ?? json ?? null };
        } catch (e) {
          return { status: 0, data: null, error: String(e) };
        }
      };
      const [bundleSource, battleboard, matter, position] = await Promise.all([
        get("bundle-source"),
        get("strategy-battleboard"),
        get("matter"),
        get("position"),
      ]);
      return { bundleSource, battleboard, matter, position };
    }, id);

    fs.writeFileSync(
      path.join(out, `${id}.builder-inputs.json`),
      JSON.stringify(payload, null, 2),
      "utf8",
    );

    const bs = payload.bundleSource?.data ?? null;
    const row = {
      caseId: id,
      bundleSourceStatus: payload.bundleSource?.status ?? 0,
      scanChars: (bs?.frontMatterScan ?? "").length,
      combinedTextLength: bs?.combinedTextLength ?? null,
      canonicalEvidenceRows: bs?.canonical?.evidenceRows?.length ?? 0,
      canonicalFindings: bs?.canonical?.findingSummaries?.length ?? 0,
      canonicalCharges: bs?.canonical?.charges?.length ?? 0,
      battleboardStatus: payload.battleboard?.status ?? 0,
      matterStatus: payload.matter?.status ?? 0,
    };
    index.push(row);
    console.log(JSON.stringify(row));
  }
  fs.writeFileSync(path.join(out, "BUILDER-INPUTS-INDEX.json"), JSON.stringify(index, null, 2));
  await browser.close();
})().catch((e) => {
  console.error("RUN_FAIL", e && e.message ? e.message : e);
  process.exit(1);
});
