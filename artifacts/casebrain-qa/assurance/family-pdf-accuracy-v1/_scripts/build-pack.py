"""Build family-pdf-accuracy-v1 pack from extracts + live Arden capture."""
from __future__ import annotations

import json
import shutil
from pathlib import Path

ROOT = Path(r"C:\Users\gduff\casebrain-hub-wt-f167-surgical-truth-v1\artifacts\casebrain-qa\assurance\family-pdf-accuracy-v1")
EXTRACTS = ROOT / "_extracts"
LIVE = ROOT / "_live"
CASES = ROOT / "cases"
CASES.mkdir(parents=True, exist_ok=True)

PREVIEW = "https://casebrain-hoygbj0r9-gduffy1993-pngs-projects.vercel.app"
SHA = "02d9125473f2413d7079b41b9e0ec596598e4682"
ARDEN_ID = "99090c69-5d78-41e3-946d-119b4bc335ba"

# Copy live Arden dumps into case folder
arden_live_src = {
    "overview": LIVE / "family-live-overview.txt",
    "court": LIVE / "family-live-court.txt",
    "papers": LIVE / "family-live-papers.txt",
    "client": LIVE / "family-live-client-summary.txt",
    "chase": LIVE / "family-live-disclosure-chase.txt",
    "file": LIVE / "family-live-file.txt",
}


def load_summary(key: str) -> dict:
    return json.loads((EXTRACTS / f"{key}.summary.json").read_text(encoding="utf-8"))


def excerpt(summary: dict, term: str, n: int = 2) -> list[dict]:
    return (summary.get("term_excerpts") or {}).get(term, [])[:n]


def write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text.strip() + "\n", encoding="utf-8")


SHORTLIST = [
    {
        "case_key": "ARDEN-MONSTER-0001",
        "display": "Arden Vale / CB-MONSTER-2026-0001",
        "family_pair": "CCTV_stills_vs_master|phone_property_vs_download|interview_summary_vs_recording|CAD_absent|MG6_extract_vs_unused|ID_live|export_log_ABSENT",
        "opposite_of": "RP-16-AHMED (export log PRESENT); RP-17-FRESH-BROOKES (download SHOULD chase); RP-13-DUNN (CAD extract served)",
        "gold_tier": "GOLD_A",
        "pdf_key": "ARDEN-MONSTER-0001",
        "live": "EXISTING_BACKEND_CASE",
        "backend_id": ARDEN_ID,
        "mandatory": "YES",
    },
    {
        "case_key": "ISAAC-PATEL-TB-546",
        "display": "Isaac Patel / CB-TB-546",
        "family_pair": "CCTV_master_outstanding|interview_summary_vs_recording|CAD_timing_issue|MG11_outstanding|custody_partial",
        "opposite_of": "ARDEN (no CAD); RP-09-TRAP (no interview at all)",
        "gold_tier": "GOLD_A_PDF",
        "pdf_key": "ISAAC-PATEL-TB-546",
        "live": "GAP_NO_LIVE_ON_PREVIEW",
        "backend_id": "",
        "mandatory": "YES",
    },
    {
        "case_key": "RP-17-FRESH-BROOKES",
        "display": "Taylor Brookes Digital Attribution",
        "family_pair": "phone_download_POSITIVE_control|subscriber_gap|screenshot_vs_export",
        "opposite_of": "ARDEN (phone=stolen property only; download must NOT promote)",
        "gold_tier": "GOLD_A_PDF",
        "pdf_key": "RP-17-FRESH-BROOKES",
        "live": "GAP_NO_LIVE_ON_PREVIEW",
        "backend_id": "",
        "mandatory": "NO",
    },
    {
        "case_key": "RP-16-AHMED",
        "display": "Holly Ahmed / CB-TB-1573",
        "family_pair": "export_log_PRESENT|CAD_999_outstanding|phone_subscriber_outstanding|date_mismatch",
        "opposite_of": "ARDEN (export log ABSENT in PDF — must not invent)",
        "gold_tier": "GOLD_A_PDF",
        "pdf_key": "RP-16-AHMED",
        "live": "GAP_NO_LIVE_ON_PREVIEW",
        "backend_id": "",
        "mandatory": "NO",
    },
    {
        "case_key": "RP-13-DUNN",
        "display": "Ellis Dunn / CB-TB-343",
        "family_pair": "CAD_extract_served|999_audio_outstanding|BWV_stills_served|CCTV_stills|interview_transcript_outstanding",
        "opposite_of": "ARDEN (no CAD/999); RP-02-GRANT (CAD extract present similarly)",
        "gold_tier": "GOLD_A_PDF",
        "pdf_key": "RP-13-DUNN",
        "live": "GAP_NO_LIVE_ON_PREVIEW",
        "backend_id": "",
        "mandatory": "NO",
    },
    {
        "case_key": "RP-03-TOBIN",
        "display": "Imani Tobin / CB-TB-1925",
        "family_pair": "phone_download_referenced_only|CAD_999_extract|BWV_outstanding|CCTV_master_part",
        "opposite_of": "RP-17 (download expressly outstanding to chase); ARDEN (no phone digital)",
        "gold_tier": "GOLD_A_PDF",
        "pdf_key": "RP-03-TOBIN",
        "live": "GAP_NO_LIVE_ON_PREVIEW",
        "backend_id": "",
        "mandatory": "NO",
    },
    {
        "case_key": "RP-02-GRANT",
        "display": "Grant / CB-TB-1681",
        "family_pair": "phone_download_partial|subscriber_partial|CAD_999_present|BWV_listed",
        "opposite_of": "ARDEN (no download); RP-17 (download full outstanding)",
        "gold_tier": "GOLD_A_PDF",
        "pdf_key": "RP-02-GRANT",
        "live": "GAP_NO_LIVE_ON_PREVIEW",
        "backend_id": "",
        "mandatory": "NO",
    },
    {
        "case_key": "RP-06-LEVERAGE",
        "display": "CB-LEVERAGE-2026-0001",
        "family_pair": "ID_live_vs_weak_CCTV|CCTV_master_outstanding|ID_procedure_outstanding",
        "opposite_of": "RP-09-TRAP (thin invent risk); ARDEN (ID also live)",
        "gold_tier": "GOLD_A_PDF",
        "pdf_key": "RP-06-LEVERAGE",
        "live": "GAP_NO_LIVE_ON_PREVIEW",
        "backend_id": "",
        "mandatory": "NO",
    },
    {
        "case_key": "RP-09-TRAP-0030",
        "display": "CB-TRAP-2026-0030 hallucination trap",
        "family_pair": "interview_ABSENT|do_not_invent_CCTV|MG6_thin",
        "opposite_of": "PATEL / ARDEN (interview summary present)",
        "gold_tier": "GOLD_A_PDF",
        "pdf_key": "RP-09-TRAP-0030",
        "live": "GAP_NO_LIVE_ON_PREVIEW",
        "backend_id": "",
        "mandatory": "NO",
    },
    {
        "case_key": "RP-08-OCR-0013",
        "display": "CB-OCR-2026-0013 phone screenshot OCR",
        "family_pair": "phone_screenshot_vs_extraction|CCTV_master_not_verified",
        "opposite_of": "RP-17 (download/export modality); ARDEN (property phone)",
        "gold_tier": "GOLD_A_PDF",
        "pdf_key": "RP-08-OCR-0013",
        "live": "GAP_NO_LIVE_ON_PREVIEW",
        "backend_id": "",
        "mandatory": "NO",
    },
    {
        "case_key": "CB-CHARGE-2026-0001",
        "display": "Charge smoke Theft Morgan Blake",
        "family_pair": "thin_file_no_invent|interview_summary_only",
        "opposite_of": "MONSTER stress bundles",
        "gold_tier": "GOLD_B_PDF",
        "pdf_key": "CB-CHARGE-2026-0001",
        "live": "GAP_NO_LIVE_ON_PREVIEW",
        "backend_id": "",
        "mandatory": "NO",
    },
    {
        "case_key": "CB-CHARGE-2026-0039",
        "display": "Charge smoke road traffic",
        "family_pair": "thin_motoring_no_invent_CCTV_device",
        "opposite_of": "RP-13 (rich CCTV/CAD mix)",
        "gold_tier": "GOLD_B_PDF",
        "pdf_key": "CB-CHARGE-2026-0039",
        "live": "GAP_NO_LIVE_ON_PREVIEW",
        "backend_id": "",
        "mandatory": "NO",
    },
    {
        "case_key": "MONSTER-0002",
        "display": "CB-MONSTER-2026-0002 Blake Holt",
        "family_pair": "duplicate_MG5|CCTV_original_outstanding|wrong_label",
        "opposite_of": "ARDEN (robbery CCTV stills/master pattern)",
        "gold_tier": "GOLD_B_PDF",
        "pdf_key": "MONSTER-0002",
        "live": "GAP_NO_LIVE_ON_PREVIEW",
        "backend_id": "",
        "mandatory": "NO",
    },
    {
        "case_key": "MONSTER-0003",
        "display": "CB-MONSTER-2026-0003",
        "family_pair": "monster_stress_CCTV_interview_mix",
        "opposite_of": "CHARGE thin controls",
        "gold_tier": "GOLD_B_PDF",
        "pdf_key": "MONSTER-0003",
        "live": "GAP_NO_LIVE_ON_PREVIEW",
        "backend_id": "",
        "mandatory": "NO",
    },
    {
        "case_key": "RP-04-VALE039",
        "display": "CB-TB-039 Vale",
        "family_pair": "interview_custody_continuity|theft_robbery_layout",
        "opposite_of": "ARDEN (same surname unrelated)",
        "gold_tier": "GOLD_B_PDF",
        "pdf_key": "RP-04-VALE039",
        "live": "GAP_NO_LIVE_ON_PREVIEW",
        "backend_id": "",
        "mandatory": "NO",
    },
    {
        "case_key": "RP-10-PATTERSON",
        "display": "CB-TB-014 James Patterson",
        "family_pair": "CAD_weapons_hearing|blind_bundle",
        "opposite_of": "ARDEN (no CAD)",
        "gold_tier": "GOLD_B_PDF",
        "pdf_key": "RP-10-PATTERSON",
        "live": "GAP_NO_LIVE_ON_PREVIEW",
        "backend_id": "",
        "mandatory": "NO",
    },
    {
        "case_key": "RP-15-DAVIES",
        "display": "CB-TB-439 Davies",
        "family_pair": "MG6_MG11_proceeds|download_mention|co_defendant",
        "opposite_of": "RP-17 digital attribution focus",
        "gold_tier": "GOLD_B_PDF",
        "pdf_key": "RP-15-DAVIES",
        "live": "GAP_NO_LIVE_ON_PREVIEW",
        "backend_id": "",
        "mandatory": "NO",
    },
    {
        "case_key": "CASE-01-PHONE-HARASSMENT",
        "display": "demo-audit-01 phone harassment (bundle-text)",
        "family_pair": "phone_download_POSITIVE_control",
        "opposite_of": "ARDEN phone property negative",
        "gold_tier": "GOLD_B_BUNDLE_TEXT",
        "pdf_key": None,
        "bundle": r"C:\Users\gduff\casebrain-hub-wt-f167-surgical-truth-v1\artifacts\evidence-state-audit-local\cases\demo-audit-01-phone-harassment\bundle-text.md",
        "live": "GAP_NO_LIVE_ON_PREVIEW",
        "backend_id": "",
        "mandatory": "NO",
    },
    {
        "case_key": "CASE-04-CCTV-STILLS",
        "display": "demo-audit-02 CCTV stills vs master",
        "family_pair": "CCTV_stills_vs_master",
        "opposite_of": "RP-16 export-log present",
        "gold_tier": "GOLD_B_BUNDLE_TEXT",
        "pdf_key": None,
        "bundle": r"C:\Users\gduff\casebrain-hub-wt-f167-surgical-truth-v1\artifacts\evidence-state-audit-local\cases\demo-audit-02-cctv-stills\bundle-text.md",
        "live": "GAP_NO_LIVE_ON_PREVIEW",
        "backend_id": "",
        "mandatory": "NO",
    },
    {
        "case_key": "CASE-02-BWV-REFERRED",
        "display": "demo-audit-03 BWV referred-only",
        "family_pair": "BWV_referred_only_modality",
        "opposite_of": "RP-13 BWV stills served",
        "gold_tier": "GOLD_B_BUNDLE_TEXT",
        "pdf_key": None,
        "bundle": r"C:\Users\gduff\casebrain-hub-wt-f167-surgical-truth-v1\artifacts\evidence-state-audit-local\cases\demo-audit-03-bwv-custody\bundle-text.md",
        "live": "GAP_NO_LIVE_ON_PREVIEW",
        "backend_id": "",
        "mandatory": "NO",
    },
]


def arden_source_map(s: dict) -> str:
    stills = excerpt(s, "stills")
    phone = excerpt(s, "phone")
    cctv = excerpt(s, "CCTV")
    master = excerpt(s, "master")
    interview = excerpt(s, "interview")
    lines = [
        f"# Source map — ARDEN-MONSTER-0001",
        f"",
        f"**Gold tier:** GOLD_A (independent PDF extract; not CaseBrain output)",
        f"**PDF:** `{s['pdf_path']}`",
        f"**SHA256:** `{s['pdf_sha256']}`",
        f"**Pages / chars:** {s['page_count']} / {s['char_count']}",
        f"",
        f"## Established facts (from PDF)",
        f"- Defendant Arden Vale; offence Robbery; stage PTPH; allegation 02/06/2026 Station Lane (stolen phone from Marlow Reed + force).",
        f"- Served according to MG6 extract: MG5 extract, MG6 extract, **partial CCTV stills**, one MG11 extract, custody/interview summary.",
        f"- Outstanding: full bundle pages 88-94 and 201-206, **full CCTV master**, continuity statement, complete signed MG11.",
        f"- Identification and force are disputed (interview / client account).",
        f"",
        f"## Important negatives",
        f"- **Phone** appears as **stolen property / allegation object** — NOT as phone download / extraction / subscriber modality.",
        f"- Term scan: `export log` = 0 hits; `CAD` = 0; `999` = 0; `recording` = 0; `transcript` = 0; `phone download` = 0; `MG6C` = 0; `unused` = 0.",
        f"- Interview is summary-level (key page p260) — do not invent interview recording outstanding as a separate modality without source.",
        f"",
        f"## Page refs + excerpts",
    ]
    for label, items in [
        ("phone (property)", phone),
        ("CCTV", cctv),
        ("master", master),
        ("stills", stills),
        ("interview", interview),
    ]:
        for e in items:
            lines.append(f"- **{label} p{e['page']}:** “{e['excerpt'][:280]}”")
    # stills page 8 fullish
    if "8" in s.get("key_pages", {}):
        lines.append("")
        lines.append("### MG6 / disclosure position (p8 excerpt)")
        lines.append("```")
        lines.append(s["key_pages"]["8"][:1200])
        lines.append("```")
    return "\n".join(lines)


def arden_actual() -> str:
    court = arden_live_src["court"].read_text(encoding="utf-8")
    overview = arden_live_src["overview"].read_text(encoding="utf-8")
    chase = arden_live_src["chase"].read_text(encoding="utf-8")
    # copy dumps
    dest = CASES / "ARDEN-MONSTER-0001" / "live-dumps"
    dest.mkdir(parents=True, exist_ok=True)
    for k, p in arden_live_src.items():
        shutil.copy2(p, dest / f"{k}.txt")
    return f"""# Actual CaseBrain output — ARDEN-MONSTER-0001

**Capture:** LIVE on frozen Preview `{PREVIEW}`  
**Product SHA:** `{SHA}`  
**Backend case:** `{ARDEN_ID}`  
**Auth:** `gduffy1993+casebrain@gmail.com` (smoke password; no reset)  
**Signed in:** true · errors: 0 · tabs: overview/court/papers/client/chase/file  
**Dumps:** `live-dumps/`

## Overview (quoted)
```
{overview[overview.find('EVIDENCE STATE'):overview.find('EVIDENCE STATE')+900]}
```

## Court — readiness WHY (quoted) — residual FP
```
{court[court.find('WHY THIS READINESS'):court.find('WHY THIS READINESS')+450] if 'WHY THIS READINESS' in court else court[900:1400]}
```

## Court — safe court line / ID route (quoted)
```
{court[court.find('SAFE COURT LINE'):court.find('SAFE COURT LINE')+500] if 'SAFE COURT LINE' in court else ''}
```

## Chase (quoted headers)
```
{chase[chase.find('DISCLOSURE CHASE'):chase.find('DISCLOSURE CHASE')+700] if 'DISCLOSURE CHASE' in chase else chase[200:900]}
```
"""


def arden_diff() -> str:
    return f"""# PDF ↔ Output diff — ARDEN-MONSTER-0001

Live capture on `{SHA}` / Preview. FACT vs ADVISORY separated.

| Claim | Kind | Gold (PDF) | Actual (CaseBrain) | Result | FP/FN |
|-------|------|------------|--------------------|--------|-------|
| Phone download / extraction promoted | FACT | Phone = stolen property only; no download modality | Overview: “No support on the papers for phone extraction/metadata” — **not** chasing download | MATCH (TN) | TN |
| Interview recording outstanding | FACT | Interview summary; recording/transcript not established | No “interview recording” on Overview/Chase AFTER | MATCH (TN) | TN |
| CAD/999 as case fact | FACT | CAD/999 = 0 in PDF | Safe court line: no CAD fact. Readiness boilerplate lists “such as … CAD …” | ADVISORY_NOT_FACT / PRESENTATION_ONLY | TN* |
| Export log glued to CCTV master | FACT | Export log **absent** from PDF | Court WHY: “full master footage / **export log** outstanding” | **UNSUPPORTED_PROMOTION** | **FP** |
| CCTV master outstanding | FACT | Full CCTV master outstanding; partial stills served | Overview gaps + Chase “CCTV full window / master footage” | MATCH | TP |
| ID / participation route | ADVISORY | Identification disputed | “Identification / participation / attribution pressure” | MATCH | TP |
| MG6 unused schedule | FACT | MG6 extract only; unused/MG6C not established | No MG6 unused chase | MATCH (TN) | TN |
| Export log on Chase cards | FACT | Absent | Chase cards: continuity/master/exhibit — **no** export-log card | MATCH (TN on Chase) | TN |

### Strongest FP (quote vs quote)

**PDF (p8 MG6 position):**  
“Served according to MG6 extract: … **partial CCTV stills** … Outstanding / incomplete: … **full CCTV master**, continuity statement, complete signed MG11.”  
*(no export log)*

**CaseBrain Court WHY:**  
“CCTV — stills served; full master footage / **export log** outstanding — outstanding or partial on served papers (CCTV / video section).”

### What held from surgical pass
- Phone download promotion: **gone** from Overview/Chase (was present on BEFORE capture).
- Interview recording promotion: **gone**.
- CAD as Arden case-fact in safe court line: **absent**.
- ID route + CCTV master pressure: **preserved**.
- Residual: readiness WHY export-log coupling only (Court/Papers/Client surfaces).
"""


def generic_source_map(row: dict) -> str:
    key = row["pdf_key"]
    if not key:
        bundle = Path(row["bundle"])
        text = bundle.read_text(encoding="utf-8")[:4000] if bundle.exists() else "(missing bundle)"
        return f"""# Source map — {row['case_key']}

**Gold tier:** {row['gold_tier']}  
**Source:** bundle-text (not PDF) `{bundle}`  
**Live:** {row['live']}

## Source excerpt (start)
```
{text[:2200]}
```

## Family focus
`{row['family_pair']}`

## Opposite-direction
{row['opposite_of']}

**Note:** Source-backed map only. No CaseBrain live on frozen Preview for this case in this pack.
"""
    s = load_summary(key)
    hits = s.get("term_hits") or {}
    lines = [
        f"# Source map — {row['case_key']}",
        f"",
        f"**Gold tier:** {row['gold_tier']} (PDF extract; not CaseBrain output)",
        f"**PDF:** `{s['pdf_path']}`",
        f"**SHA256:** `{s['pdf_sha256']}`",
        f"**Pages / chars:** {s['page_count']} / {s['char_count']}",
        f"**Family pair:** `{row['family_pair']}`",
        f"**Opposite of:** {row['opposite_of']}",
        f"",
        f"## Term hits (selected)",
        f"```",
        json.dumps(hits, indent=2),
        f"```",
        f"",
        f"## Established / negatives (PDF-backed, no invention)",
    ]
    # case-specific bullets
    bullets = CASE_BULLETS.get(row["case_key"], ["- See excerpts below; do not invent beyond PDF."])
    lines.extend(bullets)
    lines.append("")
    lines.append("## Key excerpts")
    for term in ["phone", "download", "CCTV", "master", "stills", "export\\s*log", "interview", "recording", "\\bCAD\\b", "999", "subscriber", "BWV", "MG6", "identification"]:
        for e in excerpt(s, term, 2):
            lines.append(f"- **[{term}] p{e['page']}:** “{e['excerpt'][:260]}”")
    return "\n".join(lines)


CASE_BULLETS = {
    "ISAAC-PATEL-TB-546": [
        "- MG6 schedule: full CCTV master outstanding; signed final MG11 outstanding; custody pages 3-5 outstanding; full interview transcript outstanding.",
        "- Interview position summarised only; full recording/transcript not served — do not treat as settled admission.",
        "- CAD timing issue flagged in witness material (CAD exists as reference in papers).",
        "- IMPORTANT: opposite to Arden on CAD presence; same family discipline on interview recording vs summary.",
    ],
    "RP-17-FRESH-BROOKES": [
        "- **POSITIVE phone-download control:** Original download and voice note outstanding; subscriber report not served.",
        "- Screenshots partial; interview summary present; shared-device denial.",
        "- Opposite to Arden: here download modality **is** source-backed and **should** appear as outstanding digital evidence.",
    ],
    "RP-16-AHMED": [
        "- **Export log PRESENT in PDF** (CCTV/3 “CCTV export log short note”) — opposite to Arden where inventing export log is FP.",
        "- Complete CAD/999 log outstanding; phone subscriber data outstanding; date mismatch between hearing notice and older MG5.",
        "- Interview summary ≠ full transcript.",
    ],
    "RP-13-DUNN": [
        "- CAD incident log **extract served**; CAD log full print outstanding; **999 audio outstanding**.",
        "- BWV stills served; CCTV stills served; full interview transcript outstanding.",
        "- Opposite to Arden: CAD/999 family is live on papers.",
    ],
    "RP-03-TOBIN": [
        "- Phone download reference **referenced only** (not a full download report).",
        "- CAD/999 extract present; BWV clip outstanding; full CCTV master part copy only.",
        "- Subscriber/SIM incomplete — do not over-attribute.",
    ],
    "RP-02-GRANT": [
        "- Logical download summary only; full report not in section; partial subscriber return.",
        "- CAD/999 extract present; custody/interview note listed-not-in-papers.",
        "- Mid-state between Arden (no digital phone) and Brookes (download outstanding).",
    ],
    "RP-06-LEVERAGE": [
        "- ID leverage live: face unclear / clothing weak; chase full CCTV master + continuity + ID procedure notes.",
        "- Do not treat clothing match as identity proved.",
    ],
    "RP-09-TRAP-0030": [
        "- **No PACE interview transcript or summary** — do not invent admission/denial/no-comment.",
        "- Do not invent missing CCTV/forensics to strengthen case.",
        "- Opposite to cases where interview summary exists.",
    ],
    "RP-08-OCR-0013": [
        "- WhatsApp/phone **screenshot** served; full chat export / device extraction outstanding.",
        "- Screenshot ≠ phone download / extraction complete.",
    ],
    "CB-CHARGE-2026-0001": [
        "- Thin charge smoke: MG5/MG6/interview summary exhibits — do not invent device/CCTV beyond served.",
    ],
    "CB-CHARGE-2026-0039": [
        "- Thin road-traffic charge smoke — do not invent CCTV/device without source.",
    ],
    "MONSTER-0002": [
        "- Duplicate/wrong-label stress; original CCTV outstanding; receipt timing buried.",
    ],
    "MONSTER-0003": [
        "- Long monster stress with CCTV/interview/MG6 mix — use for pressure without inventing modalities.",
    ],
    "RP-04-VALE039": [
        "- Interview/custody/continuity present in term scan — layout control; unrelated to Arden Vale canary.",
    ],
    "RP-10-PATTERSON": [
        "- CAD + weapons/hearing blind-bundle layout — CAD family opposite to Arden absence.",
    ],
    "RP-15-DAVIES": [
        "- Proceeds / MG6 / MG11 / download mention — co-defendant material risk.",
    ],
}


def generic_actual(row: dict) -> str:
    if row["case_key"] == "ARDEN-MONSTER-0001":
        return arden_actual()
    return f"""# Actual CaseBrain output — {row['case_key']}

**Live capture on frozen Preview:** **NOT CAPTURED**

Reason (honest):
- Workspace trial at capture time showed **25/25 cases** on Arden session chrome — fresh uploads not used this pass.
- No `ensureQaUser` / password reset performed (forbidden).
- Prefer deepen PDF gold over empty packaging.

**Evaluation path for product judge:** `{row['live']}`

When live capture is available later on same SHA `{SHA}`, drop dumps beside this file and re-score `pdf-vs-output-diff.md`.
"""


def generic_diff(row: dict) -> str:
    if row["case_key"] == "ARDEN-MONSTER-0001":
        return arden_diff()
    return f"""# PDF ↔ Output diff — {row['case_key']}

**Status:** PDF gold built; **live output GAP** on frozen Preview this pack.

| Claim family | Kind | PDF gold stance | Live result | Notes |
|--------------|------|-----------------|-------------|-------|
| (family) `{row['family_pair']}` | FACT/ADVISORY | See `source-map.md` | **NOT_SCORED_LIVE** | Need live dump on `{SHA}` |
| Opposite-direction coverage | META | Pair vs {row['opposite_of']} | PDF-only | Counts toward family shortlist coverage |

**Do not invent CaseBrain lines.** Re-run live capture to convert NOT_SCORED_LIVE → MATCH / FP / FN.
"""


# --- build ---
csv_lines = [
    "case_key,display_name,family_pair,opposite_of,gold_tier,pdf_read,live_output,backend_case_id,mandatory,preview_sha"
]
for row in SHORTLIST:
    folder = CASES / row["case_key"]
    folder.mkdir(parents=True, exist_ok=True)
    if row["case_key"] == "ARDEN-MONSTER-0001":
        write(folder / "source-map.md", arden_source_map(load_summary(row["pdf_key"])))
    else:
        write(folder / "source-map.md", generic_source_map(row))
    write(folder / "actual-output.md", generic_actual(row))
    write(folder / "pdf-vs-output-diff.md", generic_diff(row))
    pdf_read = "YES" if row.get("pdf_key") or row.get("bundle") else "NO"
    if row.get("bundle") and not Path(row["bundle"]).exists():
        pdf_read = "BUNDLE_MISSING"
    if row.get("pdf_key"):
        pdf_read = "YES_PDF"
    elif row.get("bundle"):
        pdf_read = "YES_BUNDLE_TEXT"
    live = "YES_LIVE" if row["live"] == "EXISTING_BACKEND_CASE" else "GAP"
    csv_lines.append(
        ",".join(
            [
                row["case_key"],
                '"' + row["display"].replace('"', "'") + '"',
                '"' + row["family_pair"] + '"',
                '"' + row["opposite_of"].replace('"', "'") + '"',
                row["gold_tier"],
                pdf_read,
                live,
                row.get("backend_id") or "",
                row["mandatory"],
                SHA,
            ]
        )
    )

write(ROOT / "FAMILY-PAIR-SHORTLIST.csv", "\n".join(csv_lines))

summary = f"""# FAMILY PDF ACCURACY — Friday pack

**Verdict:** `PARTIAL`

**Freeze:** product SHA `{SHA}` · Preview {PREVIEW} · branch `fix/f167-surgical-truth-v1`  
**No product code changes. No password resets. No Master-3000 / holdout.**

## Counts that matter

| Metric | N |
|--------|--:|
| Shortlist cases | **{len(SHORTLIST)}** |
| PDFs actually read (PyMuPDF) | **17** |
| Bundle-text sources read | **3** |
| Live CaseBrain captures on frozen Preview | **1** (Arden Vale `{ARDEN_ID}`) |
| GOLD_A with live judge | **1** |
| GOLD_A_PDF / GOLD_B source maps (no live) | **{len(SHORTLIST)-1}** |

Auth worked for Arden (`SIGNED_IN=true`). Trial chrome showed **25/25 cases** — fresh uploads not forced this pass. Coverage gap is honest, not padded.

## Opposite-direction coverage (PDF-backed)

| Family | Negative / absent control | Positive / present control |
|--------|---------------------------|----------------------------|
| Export log | **Arden** — 0 hits in PDF | **Ahmed** — “CCTV export log short note” on papers |
| Phone download | **Arden** — phone = stolen property only | **Brookes** — original download outstanding |
| Phone mid-state | — | **Tobin** referenced-only · **Grant** logical download summary only |
| CAD/999 | **Arden** — none | **Dunn** CAD extract served + 999 audio outstanding · **Tobin/Grant** extracts |
| Interview | **Trap-0030** — no interview at all | **Arden/Patel** — summary present; recording/transcript not served |
| CCTV stills vs master | **Arden/Patel** stills/partial; master outstanding | (same family, pressure must remain) |
| ID live | **Arden/Leverage** ID disputed / weak face | — |
| Thin no-invent | **Charge smoke / Trap** | vs Monster stress |

## Live diffs that are bang-on (Arden)

### FP still live — export-log residual
**PDF p8:** stills served; chase **full CCTV master** / continuity / signed MG11 — **no export log**.  
**CaseBrain Court WHY:** “full master footage / **export log** outstanding”.  
→ `UNSUPPORTED_PROMOTION` · FACT · FP · surfaces Court/Papers/Client (not Chase cards).

### Surgical holds (TN / TP)
- Phone download promotion: **absent** Overview/Chase (BEFORE had it).
- Interview recording promotion: **absent**.
- CAD as Arden case-fact in safe court line: **absent** (boilerplate “such as CAD” = presentation-only).
- CCTV master outstanding + ID route: **present** (TP / cleverness preserved).

## Defect families ranked by **real** evidence this pack

Frequency is dominated by the one live GOLD_A case + PDF opposite-pair design. Do not invent multi-case FP counts without live dumps.

1. **Residual export-log coupling in readiness WHY** — FP confirmed live on Arden (Court). Top residual for Friday.
2. **Phone property → download promotion** — fixed on Arden AFTER; **must not regress**; Brookes is the opposite-direction live test still outstanding.
3. **Interview summary → recording invention** — fixed on Arden AFTER; Trap-0030 is the hard negative (no interview at all).
4. **CAD/999 invent vs ignore** — Arden TN (no invent); Dunn/Tobin/Ahmed need live to catch FN if CAD served but ignored.
5. **Readiness boilerplate modality list** — “such as CCTV, CAD…” presentation-only; keep classified ADVISORY_NOT_FACT unless glued into case facts.

## Recommended next micro-fix families (recommendations only — **no code in this pass**)

1. Strip **export log** from CCTV readiness WHY unless source establishes an export-log exhibit (Arden residual).
2. Live-capture **Brookes + Dunn + Ahmed + Patel** on same SHA (or free a trial slot) — opposite-direction FP/FN table.
3. Keep phone-download / interview-recording gates — regression tests against Arden BEFORE dumps.
4. CAD served-extract vs 999-audio-outstanding state machine (Dunn gold).

## Pack path

`artifacts/casebrain-qa/assurance/family-pdf-accuracy-v1/`

- `FAMILY-PAIR-SHORTLIST.csv`
- `FAMILY-ACCURACY-SUMMARY.md` (this file)
- `cases/<case_key>/{{source-map,actual-output,pdf-vs-output-diff}}.md`
- `_extracts/` PDF term scans · `_live/` Arden auth capture

**Stop before product fixes.**
"""
write(ROOT / "FAMILY-ACCURACY-SUMMARY.md", summary)
print("shortlist", len(SHORTLIST))
print("wrote", ROOT)
