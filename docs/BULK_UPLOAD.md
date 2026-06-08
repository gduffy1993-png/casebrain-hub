# Bulk upload — zip and one-case-per-file

## Behaviour

| Mode | When | Result |
|------|------|--------|
| **One case** (`single_case`) | Default | Same as before: one case (match by title or create), all files attached to it. **PDFs unchanged.** |
| **One case per file** (`one_case_per_file`) | Upload page only (no `caseId`) | Each PDF/DOCX/TXT creates a **new** case. Title = `{prefix} — {filename stem}`. Prefix comes from the title field. |
| **Zip: folder = case** (`zip_by_folder`) | Upload page + at least one `.zip` | Each **top-level folder** inside the zip(s) becomes one case; files in that folder are attached. Root-level files in the zip are grouped as `(root files)`. Multiple zips prefix folder keys with the zip filename stem to avoid collisions. Non-zip files selected alongside zips go to a separate case: `{prefix} — (files outside zip)`. |
| **Up to 5 cases (boxes)** (`multi_slot`) | Upload page UI only | **Five side-by-side slots.** Each slot has its own label (default `Case 1` … `Case 5`) and file picker. Only slots with files create cases. Case title = optional `{prefix} — {slot label}` or just `{slot label}`. Each request uses normal `single_case` upload (multiple files in one slot = one case). **PDFs supported** per slot. |

Uploading to an **existing** case (`caseId` in the form) **always** uses single-case behaviour; bulk modes are ignored.

## API

`POST /api/upload` accepts optional form field:

- `uploadMode`: `single_case` | `one_case_per_file` | `zip_by_folder`

Response additions:

- `caseIds` — all case UUIDs touched
- `casesCreated` — length of `caseIds`
- `caseId` — first case (backwards compatible for navigation)

## Zip structure example

```
batch.zip
  pike-NS00452/
    bundle.pdf
  lewis-NS01001/
    bundle.pdf
```

Creates cases titled `{prefix} — pike-NS00452` and `{prefix} — lewis-NS01001` (prefix defaults to `Import` if empty).

Only `.pdf`, `.docx`, and `.txt` inside zips are imported; other extensions are skipped.

## UI

On the main upload form, choose **Upload layout** before submitting. After creating multiple cases, the app redirects to **`/cases`** with a toast summarising how many cases were created.
