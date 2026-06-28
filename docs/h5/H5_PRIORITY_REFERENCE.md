# H5 Priority Reference

Do not build H5 until H3 and H4 core gates are substantially complete.

Priority order:

1. Evidence Trace View
   - Highest trust value.
   - Lets solicitor click a line and see source, state, anchor, merged-from.

2. Defence Decision Board *(locked future — do not build yet)*
   - Solicitor-safe strategic options without outcome prediction.
   - Case theory options, move/risk/evidence table, charge-fit review, what would change advice, safe action plan.
   - Every option source-linked with sendability/confidence labels.
   - Full spec: `docs/h5/H5_DECISION_SUPPORT.md`

3. Advice Change Radar *(locked future — do not build yet)*
   - What new evidence would strengthen/weaken each pressure point (may weaken/strengthen — never certainty).
   - Pairs with Defence Decision Board; feeds Hearing Mode and Disclosure Timetable Builder.
   - Full spec: `docs/h5/H5_DECISION_SUPPORT.md`

4. 20-Minute Hearing Mode
   - Highest daily workflow value.
   - Safe court line, top missing items, don't-say items, next action.
   - Decision Board + Radar feed into this view.

5. Export Pack
   - Highest practical use value.
   - Chase letter, court note, client summary, evidence gap list.

6. Versioned Output
   - Highest debug/compliance value.
   - Commit/version, generated time, regeneration history.

7. Feedback Console
   - Turns user concerns into review queue items.

8. Audit Log
   - Tracks uploads, copies, exports, edits.

9. Re-run Diff
   - Shows what changed after new evidence arrives.

10. Confidence Dashboard
   - Matter-level and firm-level view of safe/provisional/blocked cases and recurring gaps.

Hard rule:

- H5 features must not bypass Guardian, source-state rules, or sendability gates.

Plan lock:

- Items 2–3 are locked H5 scope. No further H5 expansion until H3/H4 are done.
