/** Self-time per function from a V8 .cpuprofile, worst first — which function is costing the board. */
const fs = require("node:fs");
const path = require("node:path");

const dir = path.join(__dirname, "prof");
const file =
  process.argv[2] ??
  fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".cpuprofile"))
    .map((f) => path.join(dir, f))
    .sort((a, b) => fs.statSync(b).size - fs.statSync(a).size)[0];

const prof = JSON.parse(fs.readFileSync(file, "utf8"));
const byId = new Map(prof.nodes.map((n) => [n.id, n]));
const self = new Map();
for (let i = 0; i < prof.samples.length; i += 1) {
  const delta = prof.timeDeltas[i] ?? 0;
  const node = byId.get(prof.samples[i]);
  if (!node) continue;
  const cf = node.callFrame;
  const key = `${cf.functionName || "(anonymous)"}  ${path.basename(cf.url || "")}:${cf.lineNumber + 1}`;
  self.set(key, (self.get(key) ?? 0) + delta / 1000);
}
console.log(path.basename(file));
[...self.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 25)
  .forEach(([key, ms]) => console.log(`${String(Math.round(ms)).padStart(7)}ms  ${key}`));
