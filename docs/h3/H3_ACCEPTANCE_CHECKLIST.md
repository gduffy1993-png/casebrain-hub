# CaseBrain H3 Trust Layer Acceptance Checklist

Purpose: H3 must make the output easier for a solicitor to trust, copy, and challenge without changing Brain 1 or frozen cores.

## Hard Rules

- If a line cannot show a source state, it cannot be marked `Safe to send`.
- CPS chase wording and court wording must stay separate.
- Safety warnings must never read like alleged case facts.
- Thin or unclear bundles must show `Provisional`, `Needs review`, or `Blocked`; never fake certainty.
- H3 must not weaken Guardian, Weirdness, source-truth, or existing H1/H2 gates.

## Matter Confidence Header

The matter header should answer, at a glance:

- `Status`: `SAFE`, `PROVISIONAL`, `NEEDS REVIEW`, or `BLOCKED`
- `Main issue`: short human issue, for example `Attribution / message source material`
- `Evidence coverage`: `Good`, `Partial`, `Thin`, or `Unclear`
- `Next best action`: one practical action, for example `Chase CPS for full BWV export`
- `Do-not-rely-yet reason`: why the output remains provisional
- `Safe court line`: `Available`, `Needs review`, or `Not safely generated`
- `Chase readiness`: `Safe to send`, `Needs solicitor review`, or `Blocked`
- `Summary readiness`: `Client-safe`, `Needs review`, or `Blocked`

### Header Pass

- Header uses plain solicitor language.
- Header matches the case story in Today, Chase, and Summary.
- Thin bundles visibly show provisional status.
- No header field overstates evidence that is missing or referred only.

### Header Fail

- Header says `Safe` while key source material is missing or source state is unclear.
- Header gives the wrong offence family or main issue.
- Header hides a blocking source problem.
- Header suggests a solicitor can send or rely on output where source state is not known.

### Header Polish

- Wording is cautious or repetitive but safe.
- `Main issue` is broad but still correct.
- `Next best action` is useful but could be more specific.

## Source-State Badges

Use consistent labels:

- `SERVED`: material is safely on the file.
- `REFERRED ONLY`: material is mentioned but not safely served.
- `MISSING`: material appears absent and should be chased if relevant.
- `NOT SAFELY CONFIRMED`: the app cannot safely classify it as served.
- `PROVISIONAL`: output depends on disclosure/instructions.
- `NEEDS REVIEW`: solicitor must check before relying/sending.

### Badge Pass

- Important Today, Chase, and Summary lines have visible source state where possible.
- BWV/custody/message/device material is never treated as served merely because mentioned.
- Referred-only material is clearly marked as not safely served.
- Missing material links naturally to Chase or review.

### Badge Fail

- A line says or implies evidence proves something while badge/source state says `REFERRED ONLY`, `MISSING`, or `NOT SAFELY CONFIRMED`.
- A Chase item is marked `Safe to send` with no source state.
- Badges conflict across tabs for the same material.
- Badge wording is so unclear that a solicitor cannot tell whether material is served.

### Badge Polish

- Badge placement is visually noisy but understandable.
- Some low-risk repeated lines lack badges, provided copy/send paths are protected.

## Copy-Safe Rules

Separate copy paths:

- `Copy CPS chase`: material request only.
- `Copy court line`: court/order wording only.
- `Copy client-safe summary`: client explanation only.

### CPS Chase Must

- Start as a request for material or confirmation.
- Avoid court-order language in the draft box.
- Include source/provisional footer where needed.
- Avoid outcome guarantees.

### Court Line Must

- Ask the court to record missing/outstanding material or set a timetable.
- Stay provisional where source state is unclear.

### Client Summary Must

- Use plain, non-alarming language.
- Avoid tactical overstatement.
- Explain that advice is provisional where disclosure is incomplete.

### Copy-Safe Fail

- CPS chase copy includes `The defence asks the court...`.
- Court line is copied into CPS chase area.
- Client summary includes unsafe tactical language or unsupported allegations.
- Copy output removes necessary provisional/source warnings.

### Copy-Safe Polish

- Copy text is safe but slightly long.
- Footer wording is repetitive but protective.

## Sendability Labels

Allowed labels:

- `Safe to send`
- `Needs solicitor review`
- `Blocked: source state unclear`
- `Provisional: check source before sending`

### Sendability Pass

- `Safe to send` appears only when source state is visible and wording is CPS-appropriate.
- Thin, missing, referred-only, or unclear materials default to review/provisional/blocked.
- User can tell whether a line is safe in under 10 seconds.

### Sendability Fail

- `Safe to send` appears with no source state.
- `Safe to send` appears on court wording inside a CPS chase.
- `Safe to send` appears where evidence is only referred to and the request implies it is proved.

## Don't Say / Unsafe To Say Box

Purpose: make safety warnings visible without making them look like case facts.

### Must Include

- Warnings framed as `Do not say... unless served evidence supports it`.
- Wrong-family warnings where relevant.
- Referred-only warnings, for example `Do not say BWV shows the incident unless the BWV is served and reviewed`.

### Fail

- Warning appears as if it is a prosecution fact.
- Warning is copied into client/court output without context.
- Warning reintroduces wrong-family bleed as a positive case issue.

## CB-FRESH H3 Acceptance

Taylor must show:

- Harassment / messages / attribution story.
- No PWITS/drug/custody/BWV bleed except clearly framed safety warnings.
- Source-state caution around message/account/source material.
- Chase not marked fully safe if source state remains unclear.
- No raw MG6 fragments in primary send/copy text.

Jordan must show:

- AEW / BWV / custody/PACE story.
- BWV marked `REFERRED ONLY` or `NOT SAFELY CONFIRMED` unless served.
- Custody/PACE source state clear or marked review/provisional.
- No ABE/drugs/fraud bleed except safety warnings.
- No `case collapses`, `win`, or guarantee language.
- CPS chase and court line separate.

## Golden 102 H3 Acceptance

Blocking fail if any golden case shows:

- wrong-family bleed in positive output;
- referred-only evidence treated as served/proved;
- CPS chase containing court-line wording;
- unsafe win/outcome guarantee;
- `Safe to send` without source state;
- confidence header contradicting source state.

Polish only if:

- duplicate label appears but send/copy path is protected;
- wording is cautious or repetitive;
- source badge placement could be cleaner;
- case remains provisional but safely explains why.

## Gate Result Language

- `PASS`: no blocking issues; warnings are minor.
- `PASS WITH WARNINGS`: safe for continued hardening; polish remains.
- `FAIL`: solicitor could copy/send/rely on unsafe, misleading, or unsupported output.
