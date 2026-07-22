# GOLD-11-021 — solicitor-visible render (v4)

> Solicitor-facing text only. No stratum, selection reason, review focus, hypothesis, or prediction metadata.
> Blocked ≠ repaired. Human judgments belong only in the blank workbook.
> Review eligibility: **substantive**

## Controlled source context

Source evidence: controlled redacted context included

```text
Controlled evidence reference: SYN-TRUNC-01
Controlled synthetic technical control — independent expected-truth source (test-harness design, not the probe's own rendered output).
Probe design: Controlled mid-word truncation at copy exit
Controlled input construction: Test harness supplies a deliberately truncated fragment ending mid-word, independent of any real client bundle.
Expected behaviour under test: Truncated fragment must fail closed: canCopy=false. A truncated fragment reaching solicitor copy would be a false negative.
```

## Copy preview

Source evidence: controlled redacted context included

```text
Item: Evidence-status wording (1)
Status: Copy unavailable
Reason: Text appears truncated or incomplete and must not be copied.
```
