/**
 * Gold 20 visible receipt audit for PR #101.
 *
 * Opens the live preview like a user, expands every "Why / source receipt",
 * captures the receipt rows, saves tab screenshots, and checks receipt quotes
 * against the local source PDFs where available.
 *
 * Output only. No product code changes.
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const here = __dirname;
const repoRoot = path.resolve(here, "../../../..");
const qaPackName = process.env.F167_QA_PACK || "gold20";
const goldDir = process.env.F167_QA_DIR
  ? path.resolve(process.env.F167_QA_DIR)
  : path.join(repoRoot, "artifacts/casebrain-qa", qaPackName);
const signInPath = process.env.F167_SIGNIN_PATH || path.join(goldDir, "sign-in.local.json");
const uploadsPath = process.env.F167_UPLOADS_PATH || path.join(goldDir, "upload-results.json");

const signIn = JSON.parse(fs.readFileSync(signInPath, "utf8"));
const uploads = JSON.parse(fs.readFileSync(uploadsPath, "utf8")).uploads.filter((u) => u.ok && u.caseId);

const preview = (process.env.F167_PREVIEW || signIn.previewUrl).replace(/\/$/, "");
const email = process.env.F167_EMAIL || signIn.email;
const password = process.env.SMOKE_PASSWORD || process.env.CB_QA_PASSWORD || signIn.password;
const limit = Number(process.env.F167_LIMIT || 20);
const startAt = Math.max(1, Number(process.env.F167_START || 1));
const fullPageScreenshots = process.env.F167_FULL_PAGE !== "0";
const head = process.env.F167_HEAD || "7fffb0733";
const out = process.env.F167_OUT || path.join(here, `${qaPackName}-run-${new Date().toISOString().replace(/[:.]/g, "-")}`);
const failOnHard = process.env.F167_FAIL_ON_HARD !== "0";
const failOnReview = process.env.F167_FAIL_ON_REVIEW === "1";

const tabs = [
  ["overview", "Overview"],
  ["today", "Court Position"],
  ["papers", "Papers & Evidence"],
  ["summary", "Client Summary"],
  ["disclosure-chase", "CPS Chase"],
  ["file", "File & Preparation"],
];

fs.mkdirSync(out, { recursive: true });

function log(...args) {
  console.log(new Date().toISOString().slice(11, 19), ...args);
}

function safeName(input) {
  return String(input || "case")
    .replace(/\.pdf$/i, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 54)
    .toLowerCase();
}

function normalize(input) {
  return String(input || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compact(input) {
  return String(input || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

const REF_TOKEN_RE = /\b(?:MG\d+[A-Z]?(?:\/\d+)?|EX[-/][A-Z0-9-]+|O\d{2}|TEL\/\d+|BWV\/\d+|CCTV\/\d+)\b/gi;
const WEAK_TOKENS = new Set([
  "and",
  "the",
  "this",
  "that",
  "with",
  "from",
  "only",
  "file",
  "page",
  "pages",
  "compiled",
  "source",
  "schedule",
  "mg6",
  "mg6c",
  "to",
]);

function sourceRefsFrom(...inputs) {
  return [
    ...new Set(
      inputs
        .flatMap((input) => String(input || "").match(REF_TOKEN_RE) || [])
        .map((ref) => ref.toLowerCase()),
    ),
  ];
}

function strongTokens(input) {
  return [
    ...new Set(
      normalize(input)
        .split(" ")
        .filter((token) => token.length >= 4 && !WEAK_TOKENS.has(token) && !/^\d+$/.test(token)),
    ),
  ];
}

function stripReceiptPagePrefix(input) {
  return String(input || "")
    .replace(/^\s*p(?:age)?\.?\s*\d{1,4}\s*\|\s*/i, "")
    .replace(/^\s*compiled\s+p(?:age)?\.?\s*\d{1,4}\s*\|\s*/i, "")
    .trim();
}

function nearbyRefAndWordsMatch(quotePart, pdfText, sourceRef) {
  const refs = sourceRefsFrom(quotePart, sourceRef);
  if (!refs.length) return false;
  const compactPdf = compact(pdfText);
  const normalizedPdf = normalize(pdfText);
  const tokens = strongTokens(String(quotePart).replace(REF_TOKEN_RE, " "));
  if (tokens.length < 2) return false;

  for (const ref of refs) {
    const refNeedle = compact(ref);
    let searchFrom = 0;
    while (refNeedle && searchFrom < compactPdf.length) {
      const compactIndex = compactPdf.indexOf(refNeedle, searchFrom);
      if (compactIndex < 0) break;
      searchFrom = compactIndex + refNeedle.length;

      // Compact and normalized offsets are not identical after whitespace/punctuation removal,
      // so use a generous local window. This keeps the match anchored to the ref while
      // allowing table cells to be reordered/welded by pdf text extraction.
      const approxStart = Math.max(0, compactIndex - 1600);
      const approxEnd = Math.min(normalizedPdf.length, compactIndex + 1600);
      const window = normalizedPdf.slice(approxStart, approxEnd);
      const hits = tokens.filter((token) => window.includes(token));
      const needed = Math.max(2, Math.ceil(tokens.length * 0.6));
      if (hits.length >= needed) return true;
    }
  }
  return false;
}

function quotePartMatchesPdf(quotePart, pdfText, sourceRef = "") {
  quotePart = stripReceiptPagePrefix(quotePart);
  const normalizedPdf = normalize(pdfText);
  const normalizedQuote = normalize(quotePart);
  if (!normalizedQuote || !normalizedPdf) return null;
  if (normalizedPdf.includes(normalizedQuote)) return true;

  const firstWords = normalizedQuote.split(" ").filter(Boolean).slice(0, 12).join(" ");
  if (firstWords.length > 20 && normalizedPdf.includes(firstWords)) return true;

  // pdf-parse often welds table cells together, e.g. "noteMaster" or
  // "outstandingEX-MUR-009". Compact matching keeps the audit honest without
  // turning those harmless spacing differences into review noise.
  const compactPdf = compact(pdfText);
  const compactQuote = compact(quotePart);
  if (compactQuote.length > 20 && compactPdf.includes(compactQuote)) return true;
  const compactFirst = compact(firstWords);
  if (compactFirst.length > 20 && compactPdf.includes(compactFirst)) return true;
  if (nearbyRefAndWordsMatch(quotePart, pdfText, sourceRef)) return true;

  return false;
}

function quoteMatchesPdf(quote, pdfText, sourceRef = "") {
  if (!quote || !pdfText) return null;
  const parts = stripReceiptPagePrefix(String(quote))
    .split("|")
    .map((part) => stripReceiptPagePrefix(part.trim()))
    .filter((part) => part && !/^(?:compiled\s+)?p(?:age)?\.?\s*\d{1,4}$/i.test(part));
  if (!parts.length) return null;
  const refs = sourceRefsFrom(quote, sourceRef);
  const fallbackRefs = refs.length === parts.length ? refs : [];
  const results = parts.map((part, index) => quotePartMatchesPdf(part, pdfText, fallbackRefs[index] || sourceRef));
  if (results.some((result) => result === null)) return null;
  return results.every(Boolean);
}

async function extractPdfText(pdfPath) {
  if (!pdfPath || !fs.existsSync(pdfPath)) return "";
  try {
    const pdfParse = require("pdf-parse");
    const data = await pdfParse(fs.readFileSync(pdfPath));
    return data.text || "";
  } catch (err) {
    return "";
  }
}

async function signInPreview(page) {
  await page.goto(`${preview}/sign-in`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(1000);
  await page.locator("input[type=email], #email, input[name=email]").first().fill(email);
  await page.locator("input[type=password], #password, input[name=password]").first().fill(password);
  await page.locator("button[type=submit]").first().click();
  await page.waitForTimeout(4500);
  if (page.url().includes("sign-in")) throw new Error(`sign-in failed at ${page.url()}`);
}

async function waitForUsefulBody(page) {
  const deadline = Date.now() + 120000;
  let last = "";
  const notReadyRe =
    /Loading (case overview|workspace|matter dashboard|disclosure chase tracker)|Building matter brief|Overview not ready yet|still checking the uploaded papers/i;
  while (Date.now() < deadline) {
    last = await page.locator("body").innerText({ timeout: 15000 }).catch(() => "");
    const compact = last.replace(/\s+/g, " ").trim();
    if (compact.length > 180 && !notReadyRe.test(compact)) {
      return last;
    }
    await page.waitForTimeout(1200);
  }
  return last || (await page.locator("body").innerText({ timeout: 15000 }).catch(() => ""));
}

function isNotReadyBody(body) {
  return /Loading (case overview|workspace|matter dashboard|disclosure chase tracker)|Building matter brief|Overview not ready yet|still checking the uploaded papers/i.test(
    body || "",
  );
}

async function collectReceipts(page) {
  return page.evaluate(() => {
    const details = Array.from(document.querySelectorAll("details")).filter((node) => {
      const text = (node.textContent || "").replace(/\s+/g, " ");
      return /Why\s*\/\s*source receipt/i.test(text);
    });
    for (const detail of details) detail.open = true;
    return details.map((detail, index) => {
      const rows = {};
      for (const dt of Array.from(detail.querySelectorAll("dt"))) {
        const label = (dt.textContent || "").replace(/\s+/g, " ").trim();
        const dd = dt.nextElementSibling;
        if (label && dd) rows[label] = (dd.textContent || "").replace(/\s+/g, " ").trim();
      }
      const children = Array.from(detail.querySelectorAll('[data-testid="output-receipt-children"] li')).map(
        (li) => (li.textContent || "").replace(/\s+/g, " ").trim(),
      );
      return {
        index,
        sourceClassAttr: detail.getAttribute("data-source-class"),
        familyAttr: detail.getAttribute("data-family"),
        rows,
        children,
        text: (detail.textContent || "").replace(/\s+/g, " ").trim(),
      };
    });
  });
}

function classifyReceipt(receipt, pdfText) {
  const rows = receipt.rows || {};
  const sourceClass = rows["Source class"] || receipt.sourceClassAttr || "";
  const sourceRef = rows.Ref || "";
  const sourcePage = rows.Page || "";
  const quote = rows["File quote"] || "";
  const output = rows.Output || "";
  const truthState = rows["Truth state"] || "";
  const guard = rows.Guard || "";
  const normalizedQuote = normalize(quote);
  const noQuoteNeeded =
    /derived_from_absence|procedural_instruction|user_entered|generated_from_missing_expected_material/i.test(
      sourceClass,
    );
  const hasRealQuote =
    normalizedQuote &&
    !/no supporting file pdf quote available|unavailable/.test(normalizedQuote) &&
    normalizedQuote.length > 10;
  const quoteInPdf = !hasRealQuote || !pdfText ? null : quoteMatchesPdf(quote, pdfText, sourceRef);

  const flags = [];
  if (/unsupported/i.test(sourceClass)) flags.push("UNSUPPORTED");
  if (/fail/i.test(guard)) flags.push("GUARD_FAIL");
  if (!noQuoteNeeded && !hasRealQuote) flags.push("NO_SUPPORTING_QUOTE");
  if (!noQuoteNeeded && /ref unavailable/i.test(sourceRef)) flags.push("REF_UNAVAILABLE");
  if (!noQuoteNeeded && /page unavailable/i.test(sourcePage)) flags.push("PAGE_UNAVAILABLE");
  if (quoteInPdf === false) flags.push("QUOTE_NOT_FOUND_IN_LOCAL_PDF_TEXT");
  if (
    /\bserved\b/i.test(output) &&
    !/\bnot\s+(?:yet\s+)?served\b/i.test(output) &&
    !/\b(?:pending|until|conditional on)\s+served\b/i.test(output) &&
    /outstanding|missing/i.test(output)
  ) {
    flags.push("SERVED_AND_GAP_WORDS");
  }
  if (/served/i.test(truthState) && /outstanding|not served|missing/i.test(quote)) flags.push("SERVED_STATE_ON_GAP_QUOTE");

  return {
    sourceClass,
    sourceRef,
    sourcePage,
    output,
    truthState,
    guard,
    quote,
    childCount: receipt.children.length,
    quoteInPdf,
    flags,
  };
}

function receiptQuality(finding) {
  if (finding.severity === "HARD") return "RED";
  if (finding.flag === "PAGE_UNAVAILABLE" || finding.flag === "REF_UNAVAILABLE") return "AMBER_PROVENANCE";
  if (finding.flag === "QUOTE_NOT_FOUND_IN_LOCAL_PDF_TEXT") return "AMBER_QUOTE_CHECK";
  return "AMBER_REVIEW";
}

function buildReceiptQualityGaps(findings) {
  return findings.map((finding) => ({
    quality: receiptQuality(finding),
    severity: finding.severity,
    flag: finding.flag,
    caseIndex: finding.caseIndex,
    file: finding.file,
    caseId: finding.caseId,
    tab: finding.tab,
    output: finding.output,
    sourceClass: finding.sourceClass,
    sourceRef: finding.sourceRef,
    sourcePage: finding.sourcePage,
    quote: finding.quote,
  }));
}

(async () => {
  const selected = uploads.slice(startAt - 1, startAt - 1 + limit);
  const pdfTextByPath = new Map();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1500, height: 1800 } });
  let page = await context.newPage();

  await signInPreview(page);

  const cases = [];
  const allReceipts = [];
  const findings = [];

  for (let caseIndex = 0; caseIndex < selected.length; caseIndex++) {
    const upload = selected[caseIndex];
    const displayCaseIndex = startAt + caseIndex;
    const folder = `${String(displayCaseIndex).padStart(2, "0")}-${safeName(upload.file || upload.titleRequested)}`;
    const caseDir = path.join(out, folder);
    fs.mkdirSync(caseDir, { recursive: true });
    log("case", displayCaseIndex, upload.file, upload.caseId);

    let pdfText = "";
    if (upload.path && fs.existsSync(upload.path)) {
      if (!pdfTextByPath.has(upload.path)) {
        pdfTextByPath.set(upload.path, await extractPdfText(upload.path));
      }
      pdfText = pdfTextByPath.get(upload.path);
    }

    const caseRow = {
      caseIndex: displayCaseIndex,
      file: upload.file,
      sourcePath: upload.path,
      localPdfExists: Boolean(upload.path && fs.existsSync(upload.path)),
      localPdfTextChars: pdfText.length,
      caseId: upload.caseId,
      titleRequested: upload.titleRequested,
      note: upload.note,
      tabs: [],
      receiptCount: 0,
      hardFindingCount: 0,
      screenshotFolder: folder,
    };

    for (const [tab, label] of tabs) {
      const url = `${preview}/cases/${upload.caseId}?tab=${tab}&controlRoom=1&demoShell=1`;
      log("  tab", tab);
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
      const body = await waitForUsefulBody(page);
      const receipts = await collectReceipts(page);
      const screenshot = `${tab}.png`;
      await page.screenshot({ path: path.join(caseDir, screenshot), fullPage: fullPageScreenshots, timeout: 30000 }).catch(() => null);
      const finalBody =
        (await page.locator("body").innerText({ timeout: 15000 }).catch(() => "")) || body;

      const analyzed = receipts.map((receipt) => ({
        ...receipt,
        analysis: classifyReceipt(receipt, pdfText),
      }));

      for (const receipt of analyzed) {
        const row = {
          caseIndex: caseRow.caseIndex,
          caseId: upload.caseId,
          file: upload.file,
          tab,
          tabLabel: label,
          receiptIndex: receipt.index,
          analysis: receipt.analysis,
          rows: receipt.rows,
          children: receipt.children,
        };
        allReceipts.push(row);
        for (const flag of receipt.analysis.flags) {
          const finding = {
            severity:
              flag === "UNSUPPORTED" || flag === "GUARD_FAIL" || flag === "SERVED_STATE_ON_GAP_QUOTE"
                ? "HARD"
                : "REVIEW",
            flag,
            caseIndex: caseRow.caseIndex,
            file: upload.file,
            caseId: upload.caseId,
            tab,
            output: receipt.analysis.output,
            sourceClass: receipt.analysis.sourceClass,
            sourceRef: receipt.analysis.sourceRef,
            sourcePage: receipt.analysis.sourcePage,
            quote: receipt.analysis.quote,
          };
          findings.push(finding);
        }
      }

      caseRow.tabs.push({
        tab,
        label,
        url,
        chars: finalBody.length,
        screenshot,
        notReadyCapture: isNotReadyBody(finalBody),
        receiptCount: analyzed.length,
        receiptFlags: analyzed.flatMap((r) => r.analysis.flags),
        unsupported: analyzed.filter((r) => /unsupported/i.test(r.analysis.sourceClass)).length,
        multiSource: analyzed.filter((r) => /multi_source_backed/i.test(r.analysis.sourceClass)).length,
        derivedAbsence: analyzed.filter((r) => /derived_from_absence/i.test(r.analysis.sourceClass)).length,
      });

      fs.writeFileSync(
        path.join(caseDir, `${tab}.receipts.json`),
        JSON.stringify({ url, label, bodyPreview: finalBody.slice(0, 4000), receipts: analyzed }, null, 2),
      );
    }

    caseRow.receiptCount = caseRow.tabs.reduce((sum, tab) => sum + tab.receiptCount, 0);
    caseRow.findingCount = findings.filter((f) => f.caseId === upload.caseId).length;
    cases.push(caseRow);

    if ((caseIndex + 1) % 3 === 0 && caseIndex + 1 < selected.length) {
      await page.close().catch(() => null);
      page = await context.newPage();
    }
  }

  await browser.close();

  const summary = {
    at: new Date().toISOString(),
    preview,
    head,
    casesChecked: cases.length,
    tabsChecked: cases.reduce((sum, c) => sum + c.tabs.length, 0),
    receiptsChecked: allReceipts.length,
    notReadyCaptures: cases.flatMap((c) =>
      c.tabs
        .filter((tab) => tab.notReadyCapture)
        .map((tab) => ({ file: c.file, caseId: c.caseId, tab: tab.tab, url: tab.url })),
    ),
    sourceClassCounts: allReceipts.reduce((acc, r) => {
      const key = r.analysis.sourceClass || "(blank)";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {}),
    flags: findings.reduce((acc, f) => {
      acc[f.flag] = (acc[f.flag] || 0) + 1;
      return acc;
    }, {}),
    hardFindings: findings.filter((f) => f.severity === "HARD").length,
    reviewFindings: findings.filter((f) => f.severity === "REVIEW").length,
    gate: {
      failOnHard,
      failOnReview,
      pass:
        cases.every((c) => c.tabs.every((tab) => !tab.notReadyCapture)) &&
        findings.filter((f) => f.severity === "HARD").length === 0 &&
        (!failOnReview || findings.filter((f) => f.severity === "REVIEW").length === 0),
    },
    cases,
  };
  const receiptQualityGaps = buildReceiptQualityGaps(findings);

  fs.writeFileSync(path.join(out, "summary.json"), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(out, "all-receipts.json"), JSON.stringify(allReceipts, null, 2));
  fs.writeFileSync(path.join(out, "findings.json"), JSON.stringify(findings, null, 2));
  fs.writeFileSync(path.join(out, "receipt-quality-gaps.json"), JSON.stringify(receiptQualityGaps, null, 2));

  const lines = [
    "# Gold 20 visible receipt audit",
    "",
    `- Preview: ${preview}`,
    `- Head: \`${head}\``,
    `- Run: ${summary.at}`,
    `- Cases checked: ${summary.casesChecked}`,
    `- Tabs checked: ${summary.tabsChecked}`,
    `- Receipts checked: ${summary.receiptsChecked}`,
    `- Not-ready captures: ${summary.notReadyCaptures.length}`,
    `- Hard findings: ${summary.hardFindings}`,
    `- Review findings: ${summary.reviewFindings}`,
    `- Gate: ${summary.gate.pass ? "PASS" : "FAIL"}`,
    "",
    "## Source class counts",
    "",
    ...Object.entries(summary.sourceClassCounts).map(([k, v]) => `- ${k}: ${v}`),
    "",
    "## Flags",
    "",
    ...(Object.keys(summary.flags).length
      ? Object.entries(summary.flags).map(([k, v]) => `- ${k}: ${v}`)
      : ["- None"]),
    "",
    "## Case rollup",
    "",
    "| # | File | PDF text chars | Receipts | Flags |",
    "|---|------|----------------|----------|-------|",
    ...cases.map((c) => {
      const flags = c.tabs.flatMap((t) => t.receiptFlags);
      const readiness = c.tabs.some((t) => t.notReadyCapture) ? "NOT_READY_CAPTURE" : null;
      const top = [...new Set([readiness, ...flags].filter(Boolean))].slice(0, 6).join(", ") || "none";
      return `| ${c.caseIndex} | ${String(c.file).replace(/\|/g, "/")} | ${c.localPdfTextChars} | ${c.receiptCount} | ${top} |`;
    }),
    "",
    "## Notes",
    "",
    "- The default gate fails the run on hard receipt failures or not-ready captures.",
    "- Set `F167_FAIL_ON_HARD=0` only when deliberately collecting a broken baseline.",
    "- Set `F167_FAIL_ON_REVIEW=1` when you want page/ref/quote review flags to block the run too.",
    "- `PAGE_UNAVAILABLE` means the visible receipt is honest but not yet page-pinpointed.",
    "- `QUOTE_NOT_FOUND_IN_LOCAL_PDF_TEXT` can be a real problem or a PDF text-extraction mismatch; inspect the screenshot/receipt JSON before fixing.",
    "- `receipt-quality-gaps.json` lists every non-green receipt with the output, tab, quote, ref and page.",
    "- Screenshots sit inside each case folder beside the receipt JSON.",
    "",
  ];
  fs.writeFileSync(path.join(out, "REPORT.md"), lines.join("\n"));

  console.log(JSON.stringify(summary, null, 2));
  const notReadyCount = summary.notReadyCaptures.length;
  const shouldFail =
    (failOnHard && (summary.hardFindings > 0 || notReadyCount > 0)) ||
    (failOnReview && summary.reviewFindings > 0);
  if (shouldFail) {
    console.error(
      `Visible receipt gate failed: hard=${summary.hardFindings}, review=${summary.reviewFindings}, notReady=${notReadyCount}`,
    );
    process.exit(2);
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
