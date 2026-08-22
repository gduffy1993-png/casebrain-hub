# CHUNK H1 — HEARING TIME + ELAPSED WORDING

**Verdict:** `H1_HEARING_LISTING_ELAPSED_WORDING`  
**Root:** `lib/criminal/solicitor-hearing-status.ts`  
**Why:** Dunn/Copilot false “invent” — PDF lists `07 July 2026 at 14:15`; as-of clock after that date is elapsed, not a court outcome.

---

## Change

| Before | After |
|--------|--------|
| `Hearing date passed · 7 Jul 2026` | `Listing on papers · 7 Jul 2026 at 14:15 (elapsed)` when time on listing raw |
| `Upcoming · …` / `Listed · …` | `Upcoming listing · …` / `Listed on papers · …` (+ time when present) |
| Chase ops: `Listing date passed — …` | `Listing on papers elapsed — confirm next listing / …` |

Time is taken from **listing raw only** (`nextHearingRaw` / explicit `hearingTimeLiteral`) — not full-bundle scan (avoids CDR/interview times).

---

## Tests

- `scripts/phase8-hearing-time.test.ts` — elapsed + 14:15 from raw  
- Opposite suite PASS  

Protected invent canaries unchanged. Not a mute-everything / full PDF dump hop.
