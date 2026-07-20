import assert from "node:assert/strict";
import {
  dedupePilotCourtRecordLines,
  sanitizePilotCourtRecordLine,
} from "../lib/criminal/pilot-matter-display-polish";

const nested = sanitizePilotCourtRecordLine(
  "Ask the court to record that prepare hearing line on outstanding disclosure; set a timetable. remains outstanding and should be disclosed on a timetable.",
);
assert.ok(nested);
assert.equal(
  nested,
  "Ask the court to record that the defence position remains provisional pending service of the outstanding material.",
);
assert.doesNotMatch(nested!, /prepare hearing line on outstanding disclosure/i);
assert.doesNotMatch(nested!, /provisional pending service\.\s*remains outstanding/i);

const provisionalHybrid = sanitizePilotCourtRecordLine(
  "Ask the court to record that the defence position remains provisional pending service. remains outstanding and should be disclosed on a timetable.",
);
assert.equal(
  provisionalHybrid,
  "Ask the court to record that the defence position remains provisional pending service of the outstanding material.",
);

const rawMg6 = sanitizePilotCourtRecordLine(
  "Ask the court to record that mG6C/003 — Subscriber data — outstanding. remains outstanding and should be disclosed on a timetable.",
);
assert.ok(rawMg6);
assert.doesNotMatch(rawMg6!, /mg6c\/003/i);
assert.match(rawMg6!, /subscriber/i);

const deduped = dedupePilotCourtRecordLines([
  "Ask the court to record that BWV/incident footage appears outstanding and should be disclosed on a timetable.",
  "Ask the court to record that BWV/incident footage appears outstanding and should be disclosed on a timetable.",
  "Ask the court to record that ask for full MG11/source material and unused schedule detail. remains outstanding and should be disclosed on a timetable.",
]);
assert.equal(deduped.length, 2, "exact duplicates should collapse; nested ask line should sanitize");
assert.doesNotMatch(deduped.join(" "), /ask the court to record that ask/i);
assert.doesNotMatch(deduped.join(" "), /mg6c\/003/i);

console.log("pilot-matter-display-polish.test.ts: all assertions passed");
