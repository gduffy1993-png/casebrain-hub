# H5 Priority Reference

**Prerequisite:** H4 simulator 150 + Bad Output Memory + export/copy gates green.

**Front door (Ged, 2026-06):** `docs/h5/H5_FIVE_ANSWERS_FRONT_DOOR.md` — Five Answers default screen, Evidence Trace two axes, safer UI language, contradiction surfacing (existing modules only).

Do not build H5 until H4 core gates are substantially complete.

Priority order:

1. **Five Answers / Evidence Truth View** *(default first screen)*
   - What case is saying · served/referred/missing · must-not-overstate · chase · source-backed court note.
   - See `H5_FIVE_ANSWERS_FRONT_DOOR.md`.

2. **Evidence Trace View** *(two axes: existence + reliability)*
   - Highest trust value.
   - Lets solicitor click a line and see source, state, anchor, merged-from.

3. **Safer UI language pass**
   - Source-backed court note · copy suggestion · solicitor review required · not for sending until reviewed.

4. **Defence Decision Board** *(H5 chunk 3 — on Overview)*
   - Solicitor-safe strategic options without outcome prediction.
   - Source-linked review prompts from brief plan, trace, chase, contradictions.
   - Full spec: `docs/h5/H5_DECISION_SUPPORT.md`

5. Advice Change Radar *(locked — next after chunk 3)*
   - What new evidence would strengthen/weaken each pressure point (may weaken/strengthen — never certainty).
   - Pairs with Defence Decision Board; feeds Hearing Mode and Disclosure Timetable Builder.
   - Full spec: `docs/h5/H5_DECISION_SUPPORT.md`

6. 20-Minute Hearing Mode
   - Highest daily workflow value.
   - Source-backed court note, top missing items, don't-say items, next action.
   - Decision Board + Radar feed into this view.

7. Export Pack
   - Highest practical use value.
   - Chase letter, court note, client summary, evidence gap list.

8. Versioned Output
   - Highest debug/compliance value.
   - Commit/version, generated time, regeneration history.

9. Feedback Console
   - Turns user concerns into review queue items.

10. Audit Log
   - Tracks uploads, copies, exports, edits.

11. Re-run Diff
   - Shows what changed after new evidence arrives.

12. Confidence Dashboard
   - Matter-level and firm-level view of safe/provisional/blocked cases and recurring gaps.

Hard rule:

- H5 features must not bypass Guardian, source-state rules, or sendability gates.

Plan lock:

- Five Answers front door is H5 item 1. Defence Decision Board + Advice Radar remain locked until front door ships.
