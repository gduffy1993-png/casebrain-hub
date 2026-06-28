# H4 Export / Copy Test Matrix

Purpose: prove copied and exported output remains clean outside CaseBrain.

## Outputs To Test

1. CPS Chase
2. Court Note / Court Line
3. Client-Safe Summary
4. Evidence Gap List
5. Full Export Pack, if available

## Shared Requirements

- Includes case name/offence where appropriate.
- Includes source/provisional footer where needed.
- No raw MG fragments in sendable text.
- No broken formatting.
- No hidden app navigation text.
- No unsupported outcome language.
- No wrong-family bleed.
- Output version/commit included once versioning exists.

## CPS Chase Copy

Must:

- request material or written confirmation;
- say why the material matters in plain terms;
- preserve source uncertainty;
- avoid court-order wording.

Must not contain:

- `The defence asks the court`;
- `case collapses`;
- `guaranteed`;
- unsupported factual claims from missing/referred material;
- raw index fragments.

Pass example:

```text
Please provide the full body-worn video export referred to on the disclosure schedule, or confirm in writing why it is not available. The defence cannot safely finalise the hearing position until the source material is served and reviewed.
```

## Court Note / Court Line

Must:

- ask court to record outstanding material;
- ask for timetable where appropriate;
- stay provisional;
- not pretend material proves a fact.

Must not:

- become a CPS chase request;
- include client-facing advice;
- guarantee outcome.

## Client-Safe Summary

Must:

- use plain language;
- explain provisional status;
- avoid tactical admissions or guarantees;
- avoid unsupported allegations.

Must not:

- reveal privileged strategy as final fact;
- say evidence proves something unless served and reviewed;
- sound alarming or overconfident.

## Evidence Gap List

Must show:

- material name;
- source state;
- why it matters;
- chase/status;
- next action.

Required states:

- `served`
- `referred only`
- `missing`
- `not safely confirmed`
- `needs review`

## Fail Conditions

Any export/copy gate fails if:

- CPS chase includes court line wording;
- material is marked safe/sendable without source state;
- referred-only material is described as served/proved;
- client summary contains unsafe factual conclusion;
- export omits necessary provisional warning;
- another firm/user's data appears;
- formatting makes the output unusable.

## Pass With Warnings

Allowed warnings:

- safe but long;
- repetitive provisional footer;
- broad label but correct material family;
- minor formatting issue that does not change meaning.
