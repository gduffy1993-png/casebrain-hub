/**
 * Deduplicated charge-wording inventory across the scale-3000 solicitor corpus.
 * Controlled/synthetic audit only — does NOT claim legal verification of all charges.
 *
 *   npx tsx scripts/integrity-programme/scale3000-charge-wording-inventory.ts
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { buildSolicitorChargeModel } from "@/lib/criminal/solicitor-charge-model";
import { OFFENCE_LABEL_REGISTRY } from "@/lib/criminal/offence-label-registry";

const ROOT = path.resolve(__dirname, "../..");
const RUN = path.join(
  ROOT,
  "artifacts/casebrain-qa/integrity-programme/scale3000-solicitor-materialisation/run-v9",
);
const OUT_DIR = path.join(
  ROOT,
  "artifacts/casebrain-qa/integrity-programme/scale3000-charge-wording-inventory",
);

type Identity = { caseId: string; sourceCaseId?: string; family?: string };
type Surface = {
  caseId: string;
  surfaceId: string;
  text: string;
  gateStatus?: string;
};

function sha(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function extractDisplayedCharge(text: string): string | null {
  const quoted = text.match(/Charge recorded on the papers:\s*\n[“"]([^”"]+)[”"]/i);
  if (quoted?.[1]?.trim()) return quoted[1].trim();
  const chargeLine = text.match(/^Charge:\s*(.+)$/im);
  if (chargeLine?.[1]?.trim()) return chargeLine[1].trim();
  const allegation = text.match(/^Allegation:\s*(.+)$/im);
  if (allegation?.[1]?.trim()) return allegation[1].trim();
  return null;
}

function extractStatutoryProvision(wording: string): string | null {
  const m = wording.match(
    /contrary\s+to\s+((?:section|s\.?)\s*[\d()]+(?:\s*\([^)]+\))*(?:\s*(?:and|,)\s*(?:section|s\.?)\s*[\d()]+(?:\s*\([^)]+\))*)*(?:\s+of\s+the\s+[^.,;\n]+)?)/i,
  );
  if (m?.[1]) return m[1].replace(/\s+/g, " ").trim();
  const bare = wording.match(
    /\b((?:section|s\.?)\s*[\d()]+(?:\s*\([^)]+\))+)\s+of\s+the\s+([A-Za-z0-9'’\-\s]+(?:Act|Order|Regulations)[^.,;\n]*)/i,
  );
  if (bare) return `${bare[1]} of the ${bare[2]}`.replace(/\s+/g, " ").trim();
  return null;
}

function guessAuthorityUrl(provision: string | null, wording: string): string | null {
  const hay = `${provision ?? ""} ${wording}`.toLowerCase();
  const map: Array<{ re: RegExp; url: string }> = [
    { re: /fraud\s+act\s+2006/, url: "https://www.legislation.gov.uk/ukpga/2006/35" },
    { re: /theft\s+act\s+1968/, url: "https://www.legislation.gov.uk/ukpga/1968/60" },
    { re: /misuse\s+of\s+drugs\s+act\s+1971/, url: "https://www.legislation.gov.uk/ukpga/1971/38" },
    { re: /criminal\s+law\s+act\s+1977/, url: "https://www.legislation.gov.uk/ukpga/1977/45" },
    { re: /criminal\s+justice\s+act\s+1988/, url: "https://www.legislation.gov.uk/ukpga/1988/33" },
    { re: /offences\s+against\s+the\s+person\s+act\s+1861/, url: "https://www.legislation.gov.uk/ukpga/Vict/24-25/100" },
    { re: /protection\s+from\s+harassment\s+act\s+1997/, url: "https://www.legislation.gov.uk/ukpga/1997/40" },
    { re: /bail\s+act\s+1976/, url: "https://www.legislation.gov.uk/ukpga/1976/63" },
    { re: /road\s+traffic\s+act\s+1988/, url: "https://www.legislation.gov.uk/ukpga/1988/52" },
    { re: /assaults\s+on\s+emergency\s+workers/, url: "https://www.legislation.gov.uk/ukpga/2018/23" },
    { re: /crime\s+and\s+security\s+act\s+2010/, url: "https://www.legislation.gov.uk/ukpga/2010/17" },
    { re: /sexual\s+offences\s+act\s+2003/, url: "https://www.legislation.gov.uk/ukpga/2003/42" },
    { re: /public\s+order\s+act\s+1986/, url: "https://www.legislation.gov.uk/ukpga/1986/64" },
    { re: /criminal\s+damage\s+act\s+1971/, url: "https://www.legislation.gov.uk/ukpga/1971/48" },
  ];
  for (const row of map) {
    if (row.re.test(hay)) return row.url;
  }
  for (const e of OFFENCE_LABEL_REGISTRY) {
    if (e.detect.test(wording) && e.authorityUrl) return e.authorityUrl;
  }
  return null;
}

function main() {
  const ids = new Map<string, Identity>();
  for (const line of fs.readFileSync(path.join(RUN, "identity-manifest.jsonl"), "utf8").split("\n")) {
    if (!line.trim()) continue;
    const row = JSON.parse(line) as Identity;
    ids.set(row.caseId, row);
  }

  type Acc = {
    exactDisplayedWording: string;
    wordingHash: string;
    caseIds: string[];
    sourceCaseIds: Record<string, number>;
    families: Record<string, number>;
    gateStatuses: Record<string, number>;
  };
  const byWording = new Map<string, Acc>();

  for (const line of fs.readFileSync(path.join(RUN, "surfaces.jsonl"), "utf8").split("\n")) {
    if (!line.trim()) continue;
    const s = JSON.parse(line) as Surface;
    if (s.surfaceId !== "case_header") continue;
    const wording = extractDisplayedCharge(s.text);
    if (!wording) continue;
    const key = wording;
    const id = ids.get(s.caseId);
    let acc = byWording.get(key);
    if (!acc) {
      acc = {
        exactDisplayedWording: wording,
        wordingHash: sha(wording),
        caseIds: [],
        sourceCaseIds: {},
        families: {},
        gateStatuses: {},
      };
      byWording.set(key, acc);
    }
    acc.caseIds.push(s.caseId);
    const src = id?.sourceCaseId || "(unknown)";
    acc.sourceCaseIds[src] = (acc.sourceCaseIds[src] || 0) + 1;
    const fam = id?.family || "(unknown)";
    acc.families[fam] = (acc.families[fam] || 0) + 1;
    const gs = (s.gateStatus || "unknown").toLowerCase();
    acc.gateStatuses[gs] = (acc.gateStatuses[gs] || 0) + 1;
  }

  const unique = [...byWording.values()]
    .map((acc) => {
      const model = buildSolicitorChargeModel({ sourceChargeText: acc.exactDisplayedWording });
      const provision =
        extractStatutoryProvision(acc.exactDisplayedWording) ||
        (model.verificationStatus === "verified" ? acc.exactDisplayedWording.match(/contrary to (.+)$/i)?.[1] ?? null : null);
      const authorityUrl = guessAuthorityUrl(provision, acc.exactDisplayedWording);
      const primarySource = Object.entries(acc.sourceCaseIds).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      const status = model.verificationStatus;
      const qualifiedLegalReviewStillRequired =
        status === "discrepancy" || status === "unresolved" || model.matchedRegistryIds.length > 0;
      return {
        exactDisplayedWording: acc.exactDisplayedWording,
        wordingHash: acc.wordingHash,
        statutoryProvision: provision,
        affectedCaseCount: acc.caseIds.length,
        primarySourceFixture: primarySource,
        sourceFixtureCounts: acc.sourceCaseIds,
        auditFamilyCounts: acc.families,
        verificationStatus: status,
        matchedRegistryIds: model.matchedRegistryIds,
        officialAuthorityUrl: authorityUrl,
        qualifiedLegalReviewStillRequired,
        note:
          status === "verified"
            ? "Corpus detector found no known citation discrepancy pattern — not a claim of full legal verification."
            : status === "discrepancy"
              ? "Known citation discrepancy pattern matched — qualified legal review required; source wording retained."
              : "Unresolved — qualified legal review required.",
      };
    })
    .sort((a, b) => b.affectedCaseCount - a.affectedCaseCount || a.exactDisplayedWording.localeCompare(b.exactDisplayedWording));

  const summary = {
    generatedAt: new Date().toISOString(),
    programmePassSupported: false,
    claimAll3000LegallyVerified: false,
    disclaimer:
      "Controlled/synthetic scale-3000 corpus inventory only. Does not claim that all 3,000 charges are legally verified. 'verified' means no known registry discrepancy pattern matched — not independent solicitor sign-off.",
    corpusRun: "run-v9",
    totalCasesScanned: ids.size,
    uniqueChargeWordings: unique.length,
    statusTotals: {
      verified: unique.filter((u) => u.verificationStatus === "verified").length,
      discrepancy: unique.filter((u) => u.verificationStatus === "discrepancy").length,
      unresolved: unique.filter((u) => u.verificationStatus === "unresolved").length,
    },
    affectedCaseRollup: {
      verified: unique.filter((u) => u.verificationStatus === "verified").reduce((n, u) => n + u.affectedCaseCount, 0),
      discrepancy: unique
        .filter((u) => u.verificationStatus === "discrepancy")
        .reduce((n, u) => n + u.affectedCaseCount, 0),
      unresolved: unique
        .filter((u) => u.verificationStatus === "unresolved")
        .reduce((n, u) => n + u.affectedCaseCount, 0),
    },
    charges: unique,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outJson = path.join(OUT_DIR, "CHARGE-WORDING-INVENTORY.json");
  const outMd = path.join(OUT_DIR, "CHARGE-WORDING-INVENTORY.md");
  fs.writeFileSync(outJson, JSON.stringify(summary, null, 2) + "\n");

  const md = [
    "# Scale-3000 charge wording inventory",
    "",
    "> Controlled/synthetic corpus only. **Does not claim that all 3,000 charges are legally verified.**",
    "",
    `- Generated: ${summary.generatedAt}`,
    `- Corpus run: ${summary.corpusRun}`,
    `- Cases scanned: ${summary.totalCasesScanned}`,
    `- Unique charge wordings: ${summary.uniqueChargeWordings}`,
    `- Unique by detector status: verified ${summary.statusTotals.verified} · discrepancy ${summary.statusTotals.discrepancy} · unresolved ${summary.statusTotals.unresolved}`,
    `- Affected cases by detector status: verified ${summary.affectedCaseRollup.verified} · discrepancy ${summary.affectedCaseRollup.discrepancy} · unresolved ${summary.affectedCaseRollup.unresolved}`,
    "",
    "| # | Cases | Status | Review req? | Statutory provision | Primary source | Wording (truncated) |",
    "|---|------:|--------|-------------|---------------------|----------------|-------------------|",
    ...unique.map((u, i) => {
      const w = u.exactDisplayedWording.replace(/\|/g, "\\|").slice(0, 120);
      const prov = (u.statutoryProvision || "—").replace(/\|/g, "\\|").slice(0, 80);
      return `| ${i + 1} | ${u.affectedCaseCount} | ${u.verificationStatus} | ${u.qualifiedLegalReviewStillRequired ? "yes" : "detector-clear*"} | ${prov} | \`${u.primarySourceFixture}\` | ${w} |`;
    }),
    "",
    "\\*detector-clear = no known registry discrepancy pattern; **not** independent legal verification.",
    "",
    "Full machine record: `CHARGE-WORDING-INVENTORY.json`.",
    "",
  ].join("\n");
  fs.writeFileSync(outMd, md);

  console.log(
    JSON.stringify(
      {
        ok: true,
        outJson,
        outMd,
        uniqueChargeWordings: unique.length,
        statusTotals: summary.statusTotals,
        affectedCaseRollup: summary.affectedCaseRollup,
        claimAll3000LegallyVerified: false,
      },
      null,
      2,
    ),
  );
}

main();
