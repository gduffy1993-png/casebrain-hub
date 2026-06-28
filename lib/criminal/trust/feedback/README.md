# H3 trust feedback — solicitor marks

**Status:** Chunk 3 foundation — capture only; does **not** alter Brain output or live wording.

**Surfaces:** Today, Chase, Summary tabs (pilot workflow).

**Persistence:** When `?persistence=1` or pilot default, attempts `POST /api/criminal/[caseId]/trust-feedback`. Always mirrors to localStorage fallback.

**Kill switch:** `localStorage: casebrain:persistence:trustFeedback=false`

**Feedback kinds:** wrong · unclear · unsafe · useful · missing issue · bad source

**Stored fields:** case, tab, line snippet, context label, source state, sendability, output version/commit, note, timestamp — never bundle or evidence text.

**Bad Output Memory:** wrong / unsafe / bad source / missing issue records are flagged for future review queue — no live output change.

**Tests:** `npx tsx scripts/trust-feedback.test.ts`
