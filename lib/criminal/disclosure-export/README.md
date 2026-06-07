# Disclosure / Export Builder (slices 1–2)

**Status:** Client-side draft text only — not legal advice, not automatic send.

**Flags:** `?reasoningV2=1` **and** `?exports=1`. `localStorage: casebrain:exports=true`.

**Export types:** Disclosure chase draft · Hearing prep note · **Case handover summary**.

**Slice 4 (shipped):** Optional export review metadata behind `?persistence=1`. POST/GET `/api/criminal/[caseId]/export-review`. On generate/copy/review, metadata mirrored to `localStorage` key `casebrain:exportReviews`. Kill switch: `casebrain:persistence:exports=false`.

**Not stored:** export text (unless user copies manually), bundle/evidence/client text, paths, IDs.

**DB strategy:** Append-only rows in `export_reviews`. Latest per case/type: `ORDER BY created_at DESC LIMIT 1`. Hash only when derived from draft — never the body.

**Not in slice 4:** audit events, supervisor multi-case queue, PDF download hook — see master plan §9.6.2.
