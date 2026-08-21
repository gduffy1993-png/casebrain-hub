# CHUNK E0.5/E1 — FILE HEADER CHROME ARMOUR

**Verdict:** `E1_FILE_CHROME_ARMOUR`  
**Branch:** `fix/f167-surgical-truth-v1`  
**Product tip (pre):** `eaeddc839` / E0 find-only  
**Armour:** shared-root extract in `lib/criminal/extract-bundle-case-metadata.ts`  
**Tip sample:** `file-criminal-sweep-v1/tip-sample-e1-chrome.json` — **21/28 cleared**  
**Opposite:** `f167-surgical-truth-opposite-direction` **PASS** · bundle-shape regression **PASS**  
**Captured:** 2026-08-21

---

## E0.5 triage (PDF spotcheck)

| Family | E0 N | Spotcheck | Class |
|--------|-----:|-----------|-------|
| `invent_court_header` | 43 | `CourtCrown Court at ManchesterHearing24 June…` → header `… Manchester Hearing` | **REAL** — trailing Hearing glued into venue |
| `mute_hearing_despite_pdf` | 62 | Trap `StatusremandNext hearing18/08/2026` muted | **REAL** (Trap) + soft detector noise (Arden/charge packs with no date) |
| `mute_defendant_despite_pdf` | 23 | `DefendantAlex MorleyDate of birth…` muted | **REAL** — Date-of-birth glue |
| `date_role_hearing_passed_*` | ~1980 | Soft asOf chrome | **WATCH** — not this hop |

---

## E1 armour (shared root)

1. **Court** — `scrubGluedCourt` strips trailing `Hearing`; crown venue match excludes `Hearing`/`Next`/`Stage` tokens  
2. **Hearing** — `normalizeGluedHearingScan` splits `…remandNext hearing18/08…`; slash-date after `Next hearing`  
3. **Defendant** — `trimPersonCapture` strips `Date of birth` before/after camelCase split  

Regression fixtures in `scripts/bundle-shape-regression.test.ts` (Neil Mitchell / Trap / Alex Morley shapes).

---

## Tip sample

| Family | Cleared | Residual |
|--------|--------:|---------:|
| invent_court_header | **12/12** | 0 |
| mute_hearing_despite_pdf | ~partial | Arden + charge packs (no hearing on papers — detector soft) |
| mute_defendant_despite_pdf | most | thin `custody.pdf` |

**Overall:** **21/28 cleared**

---

## Residual WATCH

- Trap **court string mash** (`days Police station… Northshire Magistrates Court`) — separate extract hop  
- `mute_hearing` on Arden/charge smokes where PDF truly lacks listing date  
- Date-role “Hearing date passed” ops chrome volume  

## Next

1. Optional full File tip re-sweep invent_court 43→0 proof  
2. Live AUTH canaries  
3. Merge **only on explicit ask**
