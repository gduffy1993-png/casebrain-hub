# Stage-300 Authority Repair — Acceptance Decision Card

**Status:** ACCEPTANCE PREP — evidence-label correction applied; stop for commit/push  
**Current committed HEAD:** `bda75a83dcc061d6ed7bbdb21f976015d1b16535`  
**Protected baseline:** `a831a631f3050e096b89633176f023bee2fd6a5f`  
**Nature of Stage-3000 (if later authorised):** evidence-gathering / calibration — **not** completion or programme PASS.

## Gates

| Gate | Value |
|---|---|
| stage300FreezeAuthorityOk | **true** |
| stage300ProtectedCoreAuthorityOk | **true** (working-tree / proposed post-commit matches protected baseline) |
| stage3000SampleSelectionAllowed | **true** |
| stage3000CalibrationExecutionAllowed | **true** |
| stage3000CompletionAllowed | **false** |
| programmePassSupported | **false** |

## A — Freeze authority (preserved)

- `frozen-membership-v2.json` sha256 `11f350bc9ee73125b3cd512d3acf6ab745aa2ee56cac8dc0f24de1456757a7f7`
- orderedMembershipSha256V2 `23ae1b9df0a09b80b9ab51e3f597aad9103360f5f11c26606e1633b2c82c3c5a`
- Population **300** / production **270** / projection **30**
- Stage-150 pins preserved

## B — Protected core (terminology-corrected)

Do **not** describe the restored battleboard blob as HEAD until committed.

| Field | strategy-battleboard.ts |
|---|---|
| protectedBaselineBlobId | `7d1391a81281f735c27e9e28edbb5058c0a95ecb` |
| committedHeadBlobId (current) | `855e7048cfb1302d44b3da2deb3c7dcb911b593a` |
| workingTreeBlobId | `7d1391a81281f735c27e9e28edbb5058c0a95ecb` |
| proposedPostCommitBlobId | `7d1391a81281f735c27e9e28edbb5058c0a95ecb` |

- All 7 Brain1 + 4 Guardian **working-tree / proposed post-commit** blobs match protected baseline
- Current committed HEAD still has drifted battleboard (`855e7048cfb1302d44b3da2deb3c7dcb911b593a`) until this acceptance commit
- Solicitor expansion remains outside Brain1 in `solicitor-visible-sanitization.ts`

## C — Open limitations preserved (completion blockers)

Essential-43 not closed · specialty-6 harness-only · legal-2 · ownership-20 · authenticated browser deferred. Emit `not_exercised` / `unresolved` — never PASS.

## D — Selection policy

`stage3000-selection-policy-proposed.json` is **PROPOSED / non-operative** — not the final locked 3,000-case selection contract. Do not select/freeze/run.

## Hard nots

No Stage-3000 run · no 3000 freeze · no programme PASS · no merge/deploy.
