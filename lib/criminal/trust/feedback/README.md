# H3 trust feedback — solicitor marks

**Status:** Chunk 3 foundation — capture only; does **not** alter Brain output or live wording.

**Surfaces:** Today, Chase, Summary tabs (pilot workflow). H5 Overview panels via Feedback Console (`H5FeedbackFlag`).

**Persistence:** When `?persistence=1` or pilot default, attempts `POST /api/criminal/[caseId]/trust-feedback`. Always mirrors to localStorage fallback.

**Kill switch:** `localStorage: casebrain:persistence:trustFeedback=false`

**Feedback kinds:** legacy six on pilot tabs; H5 adds missing evidence, overstated, needs rewrite, good-for-court/CPS/client.

**Stored fields:** case, surface/tab, section, line snippet, context label, source state, sendability, severity, export id, output version/commit, note, timestamp — never bundle or evidence text.

**Bad Output Memory:** wrong / unsafe / bad source / missing issue records are flagged for future review queue — no live output change. Regression catalog: `lib/criminal/trust/bad-output-memory/` · gate `scripts/h4-bad-output-memory-gate.ts`.

**Tests:** `npx tsx scripts/trust-feedback.test.ts`
