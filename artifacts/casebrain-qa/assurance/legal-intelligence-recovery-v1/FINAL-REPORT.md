# FINAL REPORT — Legal Intelligence Recovery & Restoration V1

**Verdict:** `RESTORATION_READY_FOR_REVIEW`

**Not:** pilot ready · production ready · merge-to-release authorised · giant corpus complete

---

## Topology

| Item | Path / ref |
|------|------------|
| Recovery worktree | `C:\Users\gduff\casebrain-hub-wt-legal-intelligence-recovery-v1` |
| Recovery branch | `programme/legal-intelligence-recovery-v1` |
| Baseline (untouched release WT) | `C:\Users\gduff\casebrain-hub-wt-real-pdf-live-pilot` @ `programme/real-pdf-live-pilot-v1` / `170bfcee4` |
| Case Moves origin | `6de1c4c24` (`feature/case-moves-engine`) |
| Artefact root | `artifacts/casebrain-qa/assurance/legal-intelligence-recovery-v1/` |

---

## 1. Historical recovery

| Measure | Result |
|---------|--------|
| Components inventoried | 23 |
| PRESENT_ACTIVE | 9 |
| PRESENT_BUT_GATED | 4 |
| PRESENT_BUT_NEUTERED | 2 |
| PRESENT_BUT_BYPASSED | 2 |
| DELETED_BUT_RECOVERABLE (restored) | 1 (Case Moves) |
| REPLACED_BY_NEW_IMPLEMENTATION | 1 |
| DUPLICATE | 1 |
| UNSAFE_TRUTH_AUTHORITY (split, not re-enabled) | 3 |
| OBSOLETE | 0 |

**Useful knowledge recovered from the “missing” portion:** Case Moves engine; fight-engine attack-path templates as advisory; real-life strategies pack consumer; offence-family split considerations (self-defence / CAD / BWV / medical / clip-master / interview / ID).

Detail: `EXPANDED-COMPONENT-CLASSIFICATION-INVENTORY.md`

---

## 2. Case Moves

| | |
|--|--|
| Existed at `6de1c4c24` | Isolated ~1864-line deterministic tactical move library |
| Restored | Library + advisory adapter + surface attachment (`legalIntelligence`) |
| Deliberately NOT restored | Evidence-state authority; auto-chase; “self-defence live” from offence; media invent |

Detail: `CASE-MOVES-RESTORE-NOTES.md`

---

## 3. Behaviour (proof matters)

| Metric | Value |
|--------|------:|
| Cleverness truth-set size | 12 |
| Truth-safety pass | 12 |
| Solicitor-intelligence pass | 12 |
| Both pass | 12 |
| Patel established vs not-established vs considerations | PASS (regression wall) |
| Permanent regression tests | 7 PASS |

Detail: `CLEVERNESS-RECOVERY-TRUTH-SET-RESULTS.md`, `cleverness-recovery-truth-set-results.json`, `SIDE-BY-SIDE-BEHAVIOURAL-REPORT.md`

---

## 4. Architecture confirmation

- Canonical truth remains sole factual authority.
- Intelligence reasons **about** canonical/source facts; does not rewrite existence/served/missing/modality/identity/roles/charge/dates/provenance/totals.
- Safe promotion only with new source support (`attemptSafePromotion`).
- Surfaces: epistemic separation preserved; CPS chase does not auto-ingest advisory.
- No visual redesign performed.

---

## 5. Final verdict

### `RESTORATION_READY_FOR_REVIEW`

Restoration on the dedicated recovery branch is ready for **human / product review**:

- Old cleverness restored as typed `PRACTITIONER_CONSIDERATION` advisory
- Current truth discipline preserved
- Patel + 12-matter behavioural proof green
- Side-by-side report written

**Blocked items for later (not this verdict):** merge to release candidate; pilot declaration; Master 449/589 / full physical corpus.

---

## Artefact index

1. `EXPANDED-COMPONENT-CLASSIFICATION-INVENTORY.md`
2. `CASE-MOVES-RESTORE-NOTES.md`
3. `CLEVERNESS-RECOVERY-TRUTH-SET-RESULTS.md`
4. `cleverness-recovery-truth-set-results.json`
5. `SIDE-BY-SIDE-BEHAVIOURAL-REPORT.md`
6. `FINAL-REPORT.md` (this file)
7. `LEGAL-INTELLIGENCE-RECOVERY-V1.json` (machine summary)
