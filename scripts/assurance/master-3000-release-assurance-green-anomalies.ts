/**
 * Stratified green-case source review + anomaly distributions for release assurance.
 *   npx tsx scripts/assurance/master-3000-release-assurance-green-anomalies.ts
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildCriminalBriefPlan } from "../../lib/criminal/brief-plan/build-brief-plan";
import { workflowDisclosureChaseLabels } from "../../lib/criminal/pilot-workflow";

process.env.NEXT_PUBLIC_CRIMINAL_PILOT_MODE = "1";

const ROOT = process.cwd();
const OUT = path.join(
  ROOT,
  "artifacts/casebrain-qa/assurance/master-auditor-v2/master-3000-release-assurance",
);
const CASE_ROOT = path.join(ROOT, "artifacts/evidence-state-audit-local/cases");

function head(): string {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
}

function readNdjson(p: string): any[] {
  if (!existsSync(p)) return [];
  return readFileSync(p, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

function seededPick<T>(items: T[], n: number, seed: string): T[] {
  const scored = items.map((item, i) => {
    const h = createHash("sha256").update(`${seed}:${i}`).digest("hex");
    return { item, h };
  });
  scored.sort((a, b) => a.h.localeCompare(b.h));
  return scored.slice(0, n).map((s) => s.item);
}

function main(): void {
  mkdirSync(OUT, { recursive: true });
  const h = head();
  const claims = [
    ...readNdjson(path.join(OUT, "claims-gold40.ndjson")),
    ...readNdjson(path.join(OUT, "claims-rep150.ndjson")),
    ...readNdjson(path.join(OUT, "claims-full3000.ndjson")),
  ];

  const supportDist: Record<string, number> = {};
  const kindDist: Record<string, number> = {};
  const surfaceDist: Record<string, number> = {};
  const phraseHits: Record<string, number> = {
    bwvOutstanding: 0,
    cad999Compound: 0,
    selfDefenceLive: 0,
    transcriptServed: 0,
    hearingDeadline: 0,
    genericProvenance: 0,
  };
  for (const c of claims) {
    supportDist[c.supportClass] = (supportDist[c.supportClass] ?? 0) + 1;
    kindDist[c.claimKind] = (kindDist[c.claimKind] ?? 0) + 1;
    surfaceDist[c.surface] = (surfaceDist[c.surface] ?? 0) + 1;
    const t = String(c.text ?? "");
    if (/\bBWV\b.{0,40}(outstanding|missing)/i.test(t)) phraseHits.bwvOutstanding += 1;
    if (/CAD\s*\/\s*999\s+audio\s*\/\s*control-room/i.test(t)) phraseHits.cad999Compound += 1;
    if (/self-defence[^\n.]{0,40}remains live/i.test(t)) phraseHits.selfDefenceLive += 1;
    if (/transcript[^\n.]{0,40}served/i.test(t)) phraseHits.transcriptServed += 1;
    if (/Deadline[^\n.]{0,40}hearing|hearing[^\n.]{0,40}Deadline/i.test(t)) phraseHits.hearingDeadline += 1;
    if (/Crown\s*\/\s*disclosure officer/i.test(t)) phraseHits.genericProvenance += 1;
  }

  const fullManifest = JSON.parse(
    readFileSync(path.join(OUT, "corpus-manifest-full3000.json"), "utf8"),
  ) as { caseIds: string[] };

  // Stratify by offence family from truth keys where possible
  const byFamily = new Map<string, string[]>();
  for (const caseId of fullManifest.caseIds) {
    const tkPath = path.join(CASE_ROOT, caseId, "truth-key.json");
    let fam = "unknown";
    if (existsSync(tkPath)) {
      try {
        fam = JSON.parse(readFileSync(tkPath, "utf8")).offenceFamily ?? "unknown";
      } catch {
        /* ignore */
      }
    }
    if (!byFamily.has(fam)) byFamily.set(fam, []);
    byFamily.get(fam)!.push(caseId);
  }

  const sample: string[] = [];
  for (const [, ids] of [...byFamily.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const take = Math.max(1, Math.min(4, Math.ceil(ids.length / 20)));
    sample.push(...seededPick(ids, take, `${h}:green`));
  }
  const greenIds = seededPick([...new Set(sample)], 40, `${h}:green40`);

  const reviews = [];
  let blindSpots = 0;
  for (const caseId of greenIds) {
    const bundlePath = path.join(CASE_ROOT, caseId, "bundle-text.md");
    const tkPath = path.join(CASE_ROOT, caseId, "truth-key.json");
    if (!existsSync(bundlePath) || !existsSync(tkPath)) continue;
    const bundleText = readFileSync(bundlePath, "utf8");
    const tk = JSON.parse(readFileSync(tkPath, "utf8")) as {
      offenceWording?: string;
      title?: string;
      evidenceItems?: { evidence_item?: string; correct_evidence_state?: string }[];
    };
    const chase = workflowDisclosureChaseLabels({
      caseTitle: tk.title ?? caseId,
      allegation: tk.offenceWording ?? tk.title ?? caseId,
      bundleText,
    }) ?? [];
    const brief = buildCriminalBriefPlan({
      allegation: tk.offenceWording ?? tk.title ?? caseId,
      bundleText,
    });
    const issues: string[] = [];
    const visible = `${chase.join("\n")}\n${brief.chaseAngle}\n${brief.summaryAngle}\n${brief.mainIssue}`;
    if (/CAD\s*\/\s*999\s+audio\s*\/\s*control-room/i.test(visible) && !/\b999\b/i.test(bundleText)) {
      issues.push("CAD_COMPOUND_WITHOUT_999");
    }
    if (/\bBWV\b.{0,40}(outstanding|missing|remain)/i.test(visible) && !/\bbwv\b|body[-\s]?worn/i.test(bundleText)) {
      issues.push("BWV_WITHOUT_SOURCE");
    }
    if (/self-defence[^\n.]{0,40}remains live/i.test(visible) && !/self-defence|self defense/i.test(bundleText)) {
      issues.push("DEFENCE_THEORY_WITHOUT_SOURCE");
    }
    // Truth-key served item contradicted by chase missing same family (light)
    for (const item of tk.evidenceItems ?? []) {
      const name = item.evidence_item ?? "";
      if (!name || item.correct_evidence_state !== "served") continue;
      if (chase.some((l) => l.toLowerCase().includes(name.toLowerCase().slice(0, 12)))) {
        issues.push(`CHASE_CONTRADICTS_TRUTH_SERVED:${name.slice(0, 40)}`);
      }
    }
    if (issues.length) blindSpots += 1;
    reviews.push({
      caseId,
      offenceFamily: (tk as any).offenceFamily ?? "unknown",
      issues,
      chaseCount: chase.length,
      status: issues.length ? "BLIND_SPOT_CANDIDATE" : "GREEN_OK",
    });
  }

  const anomalies = {
    recordedAt: new Date().toISOString(),
    head: h,
    claimCount: claims.length,
    supportDist,
    kindDist,
    surfaceDist,
    phraseHits,
    notes: [
      "phraseHits are distribution signals, not automatic defects",
      "Zero confirmed defects in tier runner requires green review to defend against auditor blindness",
    ],
  };

  const green = {
    recordedAt: new Date().toISOString(),
    head: h,
    sampleSize: reviews.length,
    blindSpotCandidates: blindSpots,
    reviews,
  };

  writeFileSync(path.join(OUT, "anomalies.json"), JSON.stringify(anomalies, null, 2), "utf8");
  writeFileSync(path.join(OUT, "green-review.json"), JSON.stringify(green, null, 2), "utf8");
  writeFileSync(
    path.join(OUT, "coverage.json"),
    JSON.stringify(
      {
        recordedAt: new Date().toISOString(),
        head: h,
        note: "Tier runner exercises claim-truth Phase1 controls on production builders; 361 map not fully re-emitted in this overnight pass.",
        tiers: {
          gold40: JSON.parse(readFileSync(path.join(OUT, "run-summary-gold40.json"), "utf8")),
          rep150: JSON.parse(readFileSync(path.join(OUT, "run-summary-rep150.json"), "utf8")),
          highrisk500: JSON.parse(readFileSync(path.join(OUT, "run-summary-highrisk500.json"), "utf8")),
          full3000: JSON.parse(readFileSync(path.join(OUT, "run-summary-full3000.json"), "utf8")),
        },
        greenBlindSpots: blindSpots,
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log(JSON.stringify({ anomalies: phraseHits, green: { sample: reviews.length, blindSpots } }, null, 2));
}

main();
