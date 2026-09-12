/** What the advisory stripper costs on the real captured bundle, and what in that text makes it cost. */
import fs from "node:fs";
import path from "node:path";

import { stripDoNotInventAdvisory } from "../../../../../lib/criminal/chase-source-gate";

const caseId = process.env.CASE ?? "14823d9e-1f0f-4cfc-af01-e6595d1cdfc4";
const dir = path.join(__dirname, process.env.INPUTS === "big" ? "big-inputs" : "builder-inputs");
const captured = JSON.parse(
  fs.readFileSync(path.join(dir, `${caseId}.builder-inputs.json`), "utf8"),
);
const text: string = captured.bundleSource?.data?.frontMatterScan ?? "";

const sentences = text.split(/(?<=[.!?\n])/);
const longest = sentences.reduce((a, b) => (b.length > a.length ? b : a), "");
console.log(
  `chars=${text.length} clauses=${sentences.length} longestClause=${longest.length}` +
    ` doNot=${(text.match(/\b(?:do\s+not|should\s+not)\b/gi) ?? []).length}`,
);

const started = Date.now();
const out = stripDoNotInventAdvisory(text);
console.log(`strip=${Date.now() - started}ms changed=${out.length !== text.length}`);
