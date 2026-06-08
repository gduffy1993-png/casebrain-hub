import fs from "node:fs";
import path from "node:path";
import { peekCaseMetadata } from "@/lib/eval/casebrain-auditor/production-deep-pass";
import {
  inferAuditorFamilyFromOffence,
  mergeOffenceSignals,
} from "@/lib/eval/casebrain-auditor/real-case-collector";

function loadLocalEnv(): void {
  for (const name of [".env.local", ".env"]) {
    const envPath = path.join(process.cwd(), name);
    if (!fs.existsSync(envPath)) continue;
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  }
}

async function main() {
  loadLocalEnv();
  const orgId = process.env.EVAL_ORG_ID?.trim();
  if (!orgId) throw new Error("EVAL_ORG_ID missing");

  const ids = process.argv.slice(2);
  if (ids.length === 0) {
    console.error("Usage: npx tsx scripts/investigate-case-ids.ts <caseId>...");
    process.exit(1);
  }

  const meta = await peekCaseMetadata(ids, orgId);
  for (const id of ids) {
    const c = meta.cases.find((x) => x.id === id);
    const cr = meta.criminal.find((x) => x.id === id);
    const ch = meta.charges.filter((x) => x.case_id === id);
    const charges = ch.map((x) => [x.offence, x.section].filter(Boolean).join(" ").trim()).filter(Boolean);
    const alleged =
      (typeof cr?.offence_override === "string" && cr.offence_override.trim()) ||
      (typeof cr?.alleged_offence === "string" && cr.alleged_offence.trim()) ||
      null;
    const { inferenceText } = mergeOffenceSignals(alleged, charges);
    console.log(
      JSON.stringify(
        {
          caseId: id,
          title: c?.title,
          practiceArea: c?.practice_area,
          allegedOffence: alleged,
          charges,
          inferenceText,
          inferredFamily: inferAuditorFamilyFromOffence(inferenceText),
        },
        null,
        2,
      ),
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
