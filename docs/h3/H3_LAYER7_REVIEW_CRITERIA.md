# H3 Layer 7 Review Criteria

Use after H3 chunk 1 deploy. Review real captured tab text/screenshots as a supervising criminal solicitor. Do not review architecture.

## Review Question

Would a solicitor understand what they can safely rely on, what needs review, and what must not be sent?

## Trust Signals

The H3 UI earns trust if:

- the matter status is clear in the first screen;
- source-state badges are visible near important lines;
- `Safe to send` is only used where the line has a source state;
- CPS chase wording is clearly separate from court line wording;
- thin or missing bundles are visibly provisional;
- warnings are labelled as warnings;
- copy buttons are unambiguous;
- Today, Chase, and Summary tell the same case story.

## Distrust Signals

The H3 UI loses trust if:

- a solicitor cannot tell served vs referred vs missing;
- a confident label appears on uncertain material;
- court wording appears in CPS chase copy;
- warnings look like facts;
- the header says safe while tabs say provisional;
- badges conflict across tabs;
- raw source fragments are visible in copy-ready output;
- the app hides that the output needs solicitor review.

## Blocking Issues

Mark `FAIL` if any of these appear:

- wrong offence family bleed in positive output;
- referred-only material stated or implied as proved;
- `Safe to send` with no source state;
- CPS chase copy contains `The defence asks the court`;
- unsafe outcome language, for example `case collapses`, `guaranteed`, `will win`;
- client summary contains unsupported factual assertions;
- the UI makes a thin bundle look safely complete;
- firm/account data leakage.

## Warnings / Polish

Mark `PASS WITH WARNINGS` if only these remain:

- safe but slightly generic labels;
- duplicate wording outside copy/send paths;
- cautious/provisional wording repeated;
- badge placement could be cleaner;
- header status is conservative but not misleading;
- copy output is safe but could be shorter.

## Per-Case Review Format

```text
CASE: [name]
VERDICT: PASS | PASS WITH WARNINGS | FAIL
HEADER: [does confidence/status match the tabs?]
BADGES: [served/referred/missing understandable?]
CHASE COPY: [safe to send / needs review / blocked]
COURT COPY: [separate and safe?]
SUMMARY: [client-safe and source-aware?]
DANGEROUS: [list or none]
POLISH: [list or none]
WOULD USE WITH 20 MINUTES BEFORE HEARING: YES / MAYBE / NO
ONE FIX IF FAIL: [single highest-impact fix]
```

## CB-FRESH Layer 7 Expectations

Taylor:

- PASS or PASS WITH WARNINGS only if harassment/attribution story remains clear.
- Fail if drugs/PWITS/custody/BWV becomes a positive route.
- Chase can need review, but must not contain raw MG6 junk in sendable copy.

Jordan:

- PASS or PASS WITH WARNINGS only if AEW/BWV/custody story remains clear.
- Fail if BWV is treated as served/proved when only referred.
- Fail if court line enters CPS chase copy.
