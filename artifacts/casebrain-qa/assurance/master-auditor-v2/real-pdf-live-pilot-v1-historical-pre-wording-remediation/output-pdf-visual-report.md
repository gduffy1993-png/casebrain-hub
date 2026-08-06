# Output-PDF visual report

Simple structural checks only: page count > 0, buffer starts with `%PDF-`, non-zero byte length.
No full-raster page render was performed (pdf.js/canvas not wired into this pilot), so pixel-level
clipping/overflow is honestly **unknown** for every case below, not claimed to be fine.

| Case | Generated | Bytes | Pages | Starts %PDF- | Non-zero | Page-render lane | Notes |
|---|---|---:|---:|---|---|---|---|
| RP-01 | true | 3307 | - | true | true | NOT_EXERCISED | Output page count could not be confirmed as > 0. |
| RP-02 | true | 3191 | - | true | true | NOT_EXERCISED | Output page count could not be confirmed as > 0. |
| RP-03 | true | 3099 | 1 | true | true | NOT_EXERCISED |  |
| RP-04 | true | 2951 | 1 | true | true | NOT_EXERCISED |  |
| RP-05 | true | 2955 | 1 | true | true | NOT_EXERCISED |  |
| RP-06 | true | 3077 | 1 | true | true | NOT_EXERCISED |  |
| RP-07 | true | 3201 | - | true | true | NOT_EXERCISED | Output page count could not be confirmed as > 0. |
| RP-08 | true | 3064 | 1 | true | true | NOT_EXERCISED |  |
| RP-09 | true | 3092 | 1 | true | true | NOT_EXERCISED |  |
| RP-10 | true | 3011 | 1 | true | true | NOT_EXERCISED |  |
| RP-11 | true | 2967 | 1 | true | true | NOT_EXERCISED |  |
| RP-12 | true | 2963 | 1 | true | true | NOT_EXERCISED |  |
| RP-13 | true | 3060 | 1 | true | true | NOT_EXERCISED |  |
| RP-14 | true | 3191 | - | true | true | NOT_EXERCISED | Output page count could not be confirmed as > 0. |
| RP-15 | true | 3071 | 1 | true | true | NOT_EXERCISED |  |
| RP-16 | true | 3118 | - | true | true | NOT_EXERCISED | Output page count could not be confirmed as > 0. |
| RP-17 | true | 3338 | - | true | true | NOT_EXERCISED | Output page count could not be confirmed as > 0. |
| RP-18 | true | 3063 | 1 | true | true | NOT_EXERCISED |  |
| RP-19 | true | 3054 | 1 | true | true | NOT_EXERCISED |  |
| RP-20 | true | 3077 | 1 | true | true | NOT_EXERCISED |  |

Clipping/overflow at the pixel level: **NOT_EXERCISED for all 20 cases** — honestly unknown.
