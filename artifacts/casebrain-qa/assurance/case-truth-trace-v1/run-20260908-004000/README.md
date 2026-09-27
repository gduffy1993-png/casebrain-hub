# Case truth receipt

Purpose: every solicitor-facing factual output is audited as:
`output → output type → truth state → source document/page/ref → exact supporting text → transformation → source class → final wording`.

If no source supports the line, it must be one of:
`source_backed` / `derived_from_absence` / `user_entered` / `procedural_instruction` / `generated_from_missing_expected_material` / `unsupported`.
Factual-looking output with no source class fails the audit.

This does not edit product code, merge a PR, or deploy production.

Files:
- `trace-summary.json` - corpus + Gold 20 hard/soft counters.
- `output-lines.json` - every captured line with a receipt.
- `findings.json` - hard / soft / historical findings.
- `finding-clusters.json` - grouped roots.
- `NEXT-ROOTS.md` - next product fix, hard roots only.

Hard counters are truth failures. Soft counters are wording/furniture only.
