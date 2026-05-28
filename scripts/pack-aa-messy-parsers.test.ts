/**
 * Pack AA Q1/Q2 deterministic parser smoke test.
 * Run: npx tsx scripts/pack-aa-messy-parsers.test.ts
 */
import assert from "node:assert/strict";
import { isEvalWeakAnswer } from "../lib/eval-run-metadata";
import {
  assertPackAAServedLineHasNoForbiddenPhrases,
  buildPackAAStrictMg6DisclosureAnswer,
  buildPackAAStrictMg6DisclosureAnswerWithMeta,
  buildPackAAStrictPrimaryAllegation,
  extractPackAAServedLineBody,
  isPackAAMessyBundle,
  sanitizePackAAMg6Buckets,
} from "../lib/criminal/pack-aa-messy-parsers";

const BUNDLE = `
CB-AA-MESSY-2026-0007
Pack AA - Real-World Messy Criminal Bundle Stress
Defendant: Priya Vale DOB 08/10/1995
Charge: OLD VERSION
Corrected indictment: Assault occasioning actual bodily harm, section 47 OAPA 1861
Particulars: On a date in 2026 at or near Westbridge Parade, Priya Vale struck Eli Rook.

MG6 DISCLOSURE POSITION
MG6 row: CCTV served (extract only)
MG6 row: 999 audio to follow
MG6 row: CAD not served
MG6 row: continuity draft only
MG6 row: sensitive schedule exists; requires OIC check
Case admin email: old page ref wrong
Appendix line duplicate corrected later
`;

const BUNDLE_FRONT_NOTE_FIRST = `
CB-AA-MESSY-2026-0011
Pack AA - Real-World Messy Criminal Bundle Stress
Email chain excerpt: internal team note only.
Live issues identified on papers: chronology and route pressure.
Crown route relies on early-account wording.
No conclusion is drawn from the charge wording in this front note.
This front note is not complete and should not be used as the schedule.
Key disputed issues are listed for hearing prep.
MG5 states that CCTV supports the allegation.
MG5 CASE SUMMARY - DRAFT / SUMMARY ONLY VERSION

MG6 DISCLOSURE SCHEDULE
CCTV served: till-camera export served.
BWV served: scene BWV clip served.
999 audio outstanding: to follow from call handling.
CAD log not served: awaited from control room export.
Scene photos served: upload bundle served.
Forensic continuity draft only: requires OIC check.
Unused material schedule summary only: sensitive schedule exists.
Witness first account served: signed first account served.
OIC email chain outstanding: to follow.
Source file export log served.
Case admin emails old page ref wrong duplicate.
`;

assert.equal(isPackAAMessyBundle(BUNDLE), true);

const q1 = buildPackAAStrictPrimaryAllegation(BUNDLE);
assert.ok(q1);
assert.match(q1!, /Priya Vale is charged with Assault occasioning actual bodily harm/i);
assert.match(q1!, /particulars state that/i);
assert.ok(!/OLD VERSION|DRAFT ONLY|DUPLICATE|CORRECTED LATER|PAGE REF WRONG|SUMMARY ONLY|TO FOLLOW|MISSING SOURCE/i.test(q1!));

const q2 = buildPackAAStrictMg6DisclosureAnswer(BUNDLE);
assert.ok(q2);
assert.match(q2!, /MG6 \/ disclosure schedule position/i);
assert.match(q2!, /Served \/ apparently served/i);
assert.match(q2!, /Outstanding \/ awaited \/ not served \/ to follow/i);
assert.match(q2!, /Draft \/ partial \/ summary-only \/ status review/i);
assert.match(q2!, /Reliability warning:.*MG6\/disclosure/i);
assert.match(q2!, /to follow|not served|draft only|requires OIC check|sensitive schedule exists/i);
assert.ok(!/case admin email|appendix|old page ref wrong|duplicate corrected later/i.test(q2!));
assert.ok(!/\bunclear\b/i.test(q2!), "Q2 answer must not contain weak-trigger substring 'unclear'");
assert.equal(isEvalWeakAnswer(q2!, { route_tag: "strict_mg6_eval_file" }), false);

const q2FrontNote = buildPackAAStrictMg6DisclosureAnswer(BUNDLE_FRONT_NOTE_FIRST);
assert.ok(q2FrontNote);
assert.match(q2FrontNote!, /Served \/ apparently served:/i);
assert.match(q2FrontNote!, /CCTV served|BWV served|999 audio outstanding|CAD log not served/i);
assert.ok(
  !/Email chain excerpt|Live issues identified|Crown route relies on|No conclusion is drawn from the charge wording|This front note is not complete|Key disputed issues|MG5 states|MG5 CASE SUMMARY/i.test(
    q2FrontNote!
  )
);
assert.equal(isEvalWeakAnswer(q2FrontNote!, { route_tag: "strict_mg6_eval_file" }), false);

const BUNDLE_CLASSIFICATION = `
CB-AA-MESSY-2026-0020
Pack AA - Real-World Messy Criminal Bundle Stress
MG6 DISCLOSURE SCHEDULE
forensic continuity: not yet served
08. witness first account - not yet served
scene photos: extract served only
CCTV master: served
CAD log: served? unclear
One page says CCTV/source served; later note suggests only screenshots/summary were
`;

const q2Class = buildPackAAStrictMg6DisclosureAnswer(BUNDLE_CLASSIFICATION);
assert.ok(q2Class);
const servedSection = q2Class!.split(/\n/).find((l) => /Served \/ apparently served:/i.test(l)) ?? "";
const outstandingSection =
  q2Class!.split(/\n/).find((l) => /Outstanding \/ awaited \/ not served \/ to follow:/i.test(l)) ?? "";
const draftSection =
  q2Class!.split(/\n/).find((l) => /Draft \/ partial \/ summary-only \/ status review:/i.test(l)) ?? "";

assert.match(servedSection, /CCTV master/i);
assert.match(outstandingSection, /forensic continuity/i);
assert.match(outstandingSection, /witness first account/i);
assert.match(draftSection, /scene photos|later note suggests/i);
assert.match(draftSection, /served\?\s*status not confirmed|status not confirmed/i);
assert.ok(!/not yet served/i.test(servedSection));
assert.ok(!/extract served only/i.test(servedSection));
assert.ok(!/\bunclear\b/i.test(q2Class!));

const sanitizerOnly = sanitizePackAAMg6Buckets({
  served: [
    "forensic continuity: not yet served",
    "08. witness first account - not yet served",
    "scene photos: extract served only",
    "CCTV master: served",
    "One page says CCTV/source served; later note suggests only screenshots/summary were",
  ],
  outstanding: [],
  draft: [],
});
assert.equal(sanitizerOnly.stats.served_before_sanitize, 5);
assert.equal(sanitizerOnly.stats.served_after_sanitize, 1);
assert.ok(sanitizerOnly.stats.moved_from_served_to_outstanding >= 2);
assert.ok(sanitizerOnly.stats.moved_from_served_to_draft >= 2);
assert.deepEqual(sanitizerOnly.buckets.served, ["CCTV master: served"]);

const BUNDLE_EVAL_BRIEF = `
CB-AA-MESSY-2026-0099
Pack AA - Real-World Messy Criminal Bundle Stress
MG6 DISCLOSURE SCHEDULE
Source material behind this extract is not fully served; check full MG11 / BWV / first
CCTV master: served
BWV: defence request outstanding
scene photos: extract served only
One page says CCTV/source served; later note suggests only screenshots/summary were
`;

const q2Brief = buildPackAAStrictMg6DisclosureAnswer(BUNDLE_EVAL_BRIEF);
assert.ok(q2Brief);
const servedBrief = extractPackAAServedLineBody(q2Brief!);
const outstandingBrief =
  q2Brief!.split(/\n/).find((l) => /Outstanding \/ awaited \/ not served \/ to follow:/i.test(l)) ?? "";
const draftBrief =
  q2Brief!.split(/\n/).find((l) => /Draft \/ partial \/ summary-only \/ status review:/i.test(l)) ?? "";

assert.match(servedBrief, /CCTV master:\s*served/i);
assert.ok(!/not fully served|check full MG11|extract served only|later note suggests/i.test(servedBrief));
assert.match(outstandingBrief, /BWV.*defence request outstanding|defence request outstanding/i);
assert.match(draftBrief, /scene photos|later note suggests|extract served only/i);
assertPackAAServedLineHasNoForbiddenPhrases(servedBrief);
assert.equal(isEvalWeakAnswer(q2Brief!, { route_tag: "strict_mg6_eval_file" }), false);

const q2Meta = buildPackAAStrictMg6DisclosureAnswerWithMeta(BUNDLE_EVAL_BRIEF);
assert.ok(q2Meta);
assert.equal(q2Meta!.meta.parser_version, "served-sanitizer-v2");
assert.equal(q2Meta!.meta.answer_shape, "mg6_served_outstanding_unclear");
assert.equal(q2Meta!.meta.served_count, 1);
assert.ok(q2Meta!.meta.outstanding_count >= 1);
assert.ok(q2Meta!.meta.draft_unclear_count >= 1);

console.log("pack-aa-messy-parsers.test.ts: ok");
