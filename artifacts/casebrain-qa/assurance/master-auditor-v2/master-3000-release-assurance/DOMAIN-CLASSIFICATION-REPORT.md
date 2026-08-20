# Legal domain classification (READ-ONLY)

Generated: 2026-08-20T03:16:18.843Z

## Per-PDF domains

| Domain | Unique PDFs |
|--------|------------:|
| CRIMINAL_DEFENCE | 198 |
| HOUSING | 0 |
| OTHER_LEGAL | 0 |
| NON_LEGAL | 0 |
| UNKNOWN_REQUIRES_REVIEW | 2502 |
| **Total** | **2700** |

## Per-bundle domains

| Domain | Bundles |
|--------|--------:|
| CRIMINAL_DEFENCE | 173 |
| HOUSING | 0 |
| OTHER_LEGAL | 0 |
| NON_LEGAL | 0 |
| UNKNOWN_REQUIRES_REVIEW | 691 |

## Criminal assurance feed (deduped)

| Metric | Count |
|--------|------:|
| Criminal bundles (raw) | 173 |
| **Unique criminal case/bundle count (hash-set deduped)** | **172** |
| Unique criminal + source-audit-eligible | 170 |

## Global corpus (preserved)

| Metric | Count |
|--------|------:|
| Local PDF copies | 4548 |
| Unique local PDFs | 2408 |
| Cloud PDF objects | 1120 |
| Unique cloud PDFs | 292 |
| Local∩cloud hashes | 0 |
| Cloud-only | 292 |
| Global unique PDFs | 2700 |
| Global unique bundles | 864 |
| Synthetic-likely bundles | 248 |
| Inaccessible cloud | 828 |

## Notes
- Classification uses content samples + case metadata; filename alone is never decisive.
- Ambiguous / mixed housing+criminal → UNKNOWN_REQUIRES_REVIEW (excluded from criminal assurance).
- Master assurance was NOT run by this script.
