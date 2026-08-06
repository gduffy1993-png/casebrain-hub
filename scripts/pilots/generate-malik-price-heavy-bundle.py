from __future__ import annotations

import hashlib
import json
import math
import os
import shutil
from datetime import date
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw, ImageFont
from pypdf import PdfReader, PdfWriter
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph


ROOT = Path(__file__).resolve().parents[2]
BLUEPRINT = ROOT / "docs" / "controlled-pdf-pilots" / "malik-price-150-page"
OUT = ROOT / "output" / "pdf" / "malik-price-150-page"
SOURCES = OUT / "source-documents"
INGESTION = OUT / "ingestion"
TMP = ROOT / "tmp" / "pdfs" / "malik-price-150-page"
ACCESS_DATE = "2026-07-23"
EXPECTED_FREEZE = "75b4df080358baa20bd44a80344dff181e6cb623981bed69f192d133e992773e"
CASE_REF = "T202600417"
POLICE_REF = "NG/4417/26"


DOCS = [
    ("DOC-COVER", "Bundle cover", "01-bundle-cover.pdf", 1, 1, "court"),
    ("DOC-INDEX", "Bundle index", "02-bundle-index.pdf", 2, 6, "court"),
    ("DOC-MG5-V1", "MG5 case summary - version 1", "03-mg5-version-1.pdf", 7, 13, "police"),
    ("DOC-MG5-REVISED", "MG5 case summary - revised", "04-mg5-revised.pdf", 14, 19, "police"),
    ("DOC-INDICTMENT-ORIGINAL", "Original indictment", "05-indictment-original.pdf", 20, 22, "court"),
    ("DOC-INDICTMENT-AMENDED", "Amended indictment", "06-indictment-amended.pdf", 23, 25, "court"),
    ("DOC-MG6", "Disclosure record and schedule", "07-mg6-disclosure-record.pdf", 26, 37, "disclosure"),
    ("DOC-MG6C", "Non-sensitive unused material schedule", "08-mg6c-unused-material.pdf", 38, 55, "disclosure"),
    ("DOC-MG11-DRAFT-C1", "Draft witness account - Daniel Okeke", "09-draft-account-daniel-okeke.pdf", 56, 62, "statement"),
    ("DOC-MG11-SIGNED-C1", "Signed witness statement - Daniel Okeke", "10-signed-statement-daniel-okeke.pdf", 63, 69, "statement"),
    ("DOC-MG11-W1", "Witness statement - Priya Shah", "11-witness-statement-priya-shah.pdf", 70, 74, "statement"),
    ("DOC-MG11-W2", "Witness statement - Callum Briggs", "12-witness-statement-callum-briggs.pdf", 75, 79, "statement"),
    ("DOC-POLICE-STATEMENTS", "Police statements and exhibit continuity", "13-police-statements-and-continuity.pdf", 80, 91, "police"),
    ("DOC-INTERVIEW-MALIK", "PACE interview record - Malik Hassan", "14-pace-interview-malik-hassan.pdf", 92, 100, "interview"),
    ("DOC-INTERVIEW-PRICE", "PACE interview record - Jordan Price", "15-pace-interview-jordan-price.pdf", 101, 109, "interview"),
    ("DOC-CUSTODY-PACE", "Custody and PACE records", "16-custody-and-pace-records.pdf", 110, 119, "custody"),
    ("DOC-CCTV-BWV-CAD", "CCTV, body-worn video, CAD and 999 records", "17-cctv-bwv-cad-999.pdf", 120, 129, "media"),
    ("DOC-MEDICAL-FORENSIC", "Medical and forensic evidence", "18-medical-and-forensic-evidence.pdf", 130, 137, "medical"),
    ("DOC-PHONE-ATTRIBUTION", "Telephone extraction and attribution", "19-telephone-extraction-attribution.pdf", 138, 144, "digital"),
    ("DOC-DISCLOSURE-CORRESPONDENCE", "Disclosure correspondence", "20-disclosure-correspondence.pdf", 145, 148, "correspondence"),
    ("DOC-HEARING-NOTICE-PTPH", "PTPH notice and case-management directions", "21-ptph-notice.pdf", 149, 150, "court"),
]


REFERENCES = {
    "court": [
        ("Criminal Procedure Rules 2025 and Criminal Practice Directions 2023", "https://www.gov.uk/guidance/criminal-procedure-rules-2025-and-criminal-practice-directions-2023"),
        ("Criminal Procedure Rules forms - Crown Court, indictment and PTPH forms", "https://www.gov.uk/guidance/criminal-procedure-rules-forms"),
    ],
    "police": [
        ("Criminal Procedure Rules forms - written witness statements and case management", "https://www.gov.uk/guidance/criminal-procedure-rules-forms"),
        ("CPS Disclosure Manual - examples of unused material", "https://www.cps.gov.uk/prosecution-guidance/disclosure-manual-annex-examples-unused-material"),
    ],
    "disclosure": [
        ("CPS Disclosure Manual - scheduling", "https://www.cps.gov.uk/prosecution-guidance/disclosure-manual-chapter-6-scheduling"),
        ("CPS Disclosure Manual - non-sensitive material schedule", "https://www.cps.gov.uk/prosecution-guidance/disclosure-manual-chapter-7-non-sensitive-material-schedule"),
        ("CPS Disclosure Manual - applying the disclosure test", "https://www.cps.gov.uk/prosecution-guidance/disclosure-manual-chapter-12-applying-disclosure-test"),
    ],
    "statement": [
        ("Criminal Procedure Rules forms - written witness statement", "https://www.gov.uk/guidance/criminal-procedure-rules-forms"),
    ],
    "interview": [
        ("PACE Code C 2023", "https://www.gov.uk/government/publications/pace-code-c-2023/pace-code-c-2023-accessible"),
        ("PACE codes of practice - Codes C, E and F", "https://www.gov.uk/guidance/police-and-criminal-evidence-act-1984-pace-codes-of-practice"),
    ],
    "custody": [
        ("PACE Code C 2023", "https://www.gov.uk/government/publications/pace-code-c-2023/pace-code-c-2023-accessible"),
        ("PACE codes of practice", "https://www.gov.uk/guidance/police-and-criminal-evidence-act-1984-pace-codes-of-practice"),
    ],
    "media": [
        ("CPS Disclosure Manual - examples of unused material", "https://www.cps.gov.uk/prosecution-guidance/disclosure-manual-annex-examples-unused-material"),
        ("CPS Expert Evidence guidance", "https://www.cps.gov.uk/prosecution-guidance/expert-evidence"),
    ],
    "medical": [
        ("CPS Expert Evidence guidance", "https://www.cps.gov.uk/prosecution-guidance/expert-evidence"),
        ("Criminal Procedure Rules forms - medical report directions", "https://www.gov.uk/guidance/criminal-procedure-rules-forms"),
    ],
    "digital": [
        ("CPS Expert Evidence guidance", "https://www.cps.gov.uk/prosecution-guidance/expert-evidence"),
        ("CPS Disclosure Manual - applying the disclosure test", "https://www.cps.gov.uk/prosecution-guidance/disclosure-manual-chapter-12-applying-disclosure-test"),
    ],
    "correspondence": [
        ("CPS Disclosure Manual - applying the disclosure test", "https://www.cps.gov.uk/prosecution-guidance/disclosure-manual-chapter-12-applying-disclosure-test"),
        ("CPS Disclosure Manual - revelation to the prosecutor", "https://www.cps.gov.uk/prosecution-guidance/disclosure-manual-chapter-11-revelation-prosecutor"),
    ],
}


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def reset_output() -> None:
    # The target is exact and validated under the workspace. Preserve the frozen blueprint.
    if OUT.exists():
        shutil.rmtree(OUT)
    if TMP.exists():
        shutil.rmtree(TMP)
    SOURCES.mkdir(parents=True)
    INGESTION.mkdir(parents=True)
    TMP.mkdir(parents=True)


def verify_blueprint() -> dict:
    stamp = (BLUEPRINT / "FREEZE-HASH.txt").read_text(encoding="utf-8")
    stop = json.loads((BLUEPRINT / "STOP-FOR-REVIEW.json").read_text(encoding="utf-8"))
    if EXPECTED_FREEZE not in stamp or stop["freezeHashSha256"] != EXPECTED_FREEZE:
        raise RuntimeError("Malik-Price v1.1 freeze stamp mismatch")
    truth = json.loads((BLUEPRINT / "truth-key.json").read_text(encoding="utf-8"))
    page_register = json.loads((BLUEPRINT / "page-register.json").read_text(encoding="utf-8"))
    if truth["version"] != "design-freeze-v1.1" or page_register["totalPages"] != 150:
        raise RuntimeError("Frozen version/page total mismatch")
    frozen_files = {}
    for name in ["README.md", "matter-skeleton.json", "page-register.json", "truth-key.json", "conflict-table.json", "acceptance-matrix.json", "STOP-FOR-REVIEW.json", "FREEZE-HASH.txt"]:
        frozen_files[name] = sha256(BLUEPRINT / name)
    return {"truth": truth, "page_register": page_register, "frozen_hashes": frozen_files}


def page_size_for(doc_id: str, local_page: int):
    if doc_id in {"DOC-MG6", "DOC-MG6C"} and local_page >= 2:
        return landscape(A4)
    return A4


def wrap_lines(text: str, font: str, size: float, width: float) -> list[str]:
    out: list[str] = []
    for paragraph in text.split("\n"):
        words = paragraph.split()
        if not words:
            out.append("")
            continue
        line = words[0]
        for word in words[1:]:
            trial = f"{line} {word}"
            if stringWidth(trial, font, size) <= width:
                line = trial
            else:
                out.append(line)
                line = word
        out.append(line)
    return out


def paragraph(c: canvas.Canvas, text: str, x: float, y: float, width: float, size=9.2, leading=12.0, font="Helvetica", color=colors.HexColor("#17202A")) -> float:
    c.setFillColor(color)
    c.setFont(font, size)
    for line in wrap_lines(text, font, size, width):
        if y < 18 * mm:
            break
        c.drawString(x, y, line)
        y -= leading
    return y


def header(c: canvas.Canvas, title: str, compiled: int, local: int, total_local: int, org: str, pagesize) -> float:
    w, h = pagesize
    c.setFillColor(colors.HexColor("#F7F4EC"))
    c.rect(0, 0, w, h, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#19324A"))
    c.rect(0, h - 18 * mm, w, 18 * mm, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 9)
    label = {
        "court": "NORTHGATE CROWN COURT",
        "police": "NORTHGATE CONSTABULARY",
        "disclosure": "NORTHGATE CONSTABULARY - DISCLOSURE",
        "statement": "WITNESS EVIDENCE",
        "interview": "PACE INTERVIEW RECORD",
        "custody": "NORTHGATE CENTRAL CUSTODY",
        "media": "DIGITAL MEDIA AND INCIDENT RECORDS",
        "medical": "NORTHGATE UNIVERSITY HOSPITAL / FORENSIC SERVICES",
        "digital": "DIGITAL FORENSICS UNIT",
        "correspondence": "DISCLOSURE CORRESPONDENCE",
    }.get(org, "R v HASSAN AND PRICE")
    c.drawString(15 * mm, h - 8 * mm, label)
    c.setFont("Helvetica", 7.5)
    c.drawRightString(w - 15 * mm, h - 8 * mm, f"Case {CASE_REF} | Police {POLICE_REF}")
    c.setFillColor(colors.HexColor("#17202A"))
    c.setFont("Helvetica-Bold", 13)
    c.drawString(15 * mm, h - 27 * mm, title)
    c.setStrokeColor(colors.HexColor("#8A99A8"))
    c.line(15 * mm, h - 30 * mm, w - 15 * mm, h - 30 * mm)
    c.setFillColor(colors.HexColor("#4C5967"))
    c.setFont("Helvetica", 7)
    c.drawString(15 * mm, 9 * mm, f"R v Malik Hassan and Jordan Price | source page {local} of {total_local}")
    c.drawRightString(w - 15 * mm, 9 * mm, f"COMPILED PAGE {compiled} OF 150")
    return h - 37 * mm


def section(c: canvas.Canvas, text: str, x: float, y: float, width: float, color="#D9E4EC") -> float:
    c.setFillColor(colors.HexColor(color))
    c.roundRect(x, y - 5 * mm, width, 7 * mm, 1.5 * mm, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#19324A"))
    c.setFont("Helvetica-Bold", 9.5)
    c.drawString(x + 2.5 * mm, y - 2.5 * mm, text)
    return y - 10 * mm


def table(c: canvas.Canvas, rows: list[list[str]], x: float, y: float, widths: list[float], font_size=7.2, row_h=8 * mm, header_row=True) -> float:
    for ridx, row in enumerate(rows):
        if y - row_h < 16 * mm:
            break
        fill = colors.HexColor("#D9E4EC") if ridx == 0 and header_row else (colors.white if ridx % 2 else colors.HexColor("#F0F3F5"))
        c.setFillColor(fill)
        c.rect(x, y - row_h, sum(widths), row_h, fill=1, stroke=0)
        cx = x
        for col, width in zip(row, widths):
            c.setStrokeColor(colors.HexColor("#AEB8C2"))
            c.rect(cx, y - row_h, width, row_h, fill=0, stroke=1)
            c.setFillColor(colors.HexColor("#17202A"))
            c.setFont("Helvetica-Bold" if ridx == 0 and header_row else "Helvetica", font_size)
            lines = wrap_lines(str(col), "Helvetica", font_size, width - 3 * mm)[:3]
            ty = y - 3.1 * mm
            for line in lines:
                c.drawString(cx + 1.5 * mm, ty, line)
                ty -= font_size + 1
            cx += width
        y -= row_h
    return y


def signature(c: canvas.Canvas, x: float, y: float, name: str) -> None:
    c.setStrokeColor(colors.HexColor("#244C8A"))
    c.setLineWidth(1.2)
    c.bezier(x, y, x + 11 * mm, y + 8 * mm, x + 18 * mm, y - 5 * mm, x + 35 * mm, y + 4 * mm)
    c.bezier(x + 8 * mm, y + 1 * mm, x + 21 * mm, y + 12 * mm, x + 28 * mm, y - 4 * mm, x + 46 * mm, y + 2 * mm)
    c.setFillColor(colors.HexColor("#244C8A"))
    c.setFont("Helvetica-Oblique", 7)
    c.drawString(x, y - 4 * mm, name)


def stamp(c: canvas.Canvas, x: float, y: float, text: str, angle=-7) -> None:
    c.saveState()
    c.translate(x, y)
    c.rotate(angle)
    c.setStrokeColor(colors.HexColor("#8D2E2E"))
    c.setFillColor(colors.HexColor("#8D2E2E"))
    c.setLineWidth(1)
    width = max(35 * mm, stringWidth(text, "Helvetica-Bold", 10) + 8 * mm)
    c.rect(0, 0, width, 10 * mm, fill=0, stroke=1)
    c.setFont("Helvetica-Bold", 10)
    c.drawCentredString(width / 2, 3.2 * mm, text)
    c.restoreState()


def redaction(c: canvas.Canvas, x: float, y: float, width: float, label="CONTACT DETAILS REDACTED") -> None:
    c.setFillColor(colors.black)
    c.rect(x, y, width, 5 * mm, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#4C5967"))
    c.setFont("Helvetica", 6.5)
    c.drawString(x, y - 3 * mm, label)


def cctv_frame(c: canvas.Canvas, x: float, y: float, width: float, height: float, timestamp: str, caption: str) -> None:
    c.setFillColor(colors.HexColor("#242A2E"))
    c.rect(x, y, width, height, fill=1, stroke=0)
    c.setStrokeColor(colors.HexColor("#58636B"))
    for i in range(8):
        c.line(x, y + i * height / 8, x + width, y + i * height / 8)
    c.setFillColor(colors.HexColor("#6E777D"))
    c.rect(x + width * 0.08, y + height * 0.12, width * 0.25, height * 0.58, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#15191C"))
    c.circle(x + width * 0.58, y + height * 0.58, height * 0.08, fill=1, stroke=0)
    c.rect(x + width * 0.55, y + height * 0.22, width * 0.07, height * 0.34, fill=1, stroke=0)
    c.circle(x + width * 0.72, y + height * 0.55, height * 0.075, fill=1, stroke=0)
    c.rect(x + width * 0.69, y + height * 0.20, width * 0.07, height * 0.33, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Courier-Bold", 8)
    c.drawString(x + 3 * mm, y + height - 5 * mm, timestamp)
    c.setFont("Helvetica", 7)
    c.drawString(x, y - 4 * mm, caption)


def exhibit_bag(c: canvas.Canvas, x: float, y: float, width: float, height: float) -> None:
    c.setFillColor(colors.HexColor("#E9ECE8"))
    c.setStrokeColor(colors.HexColor("#53636D"))
    c.roundRect(x, y, width, height, 2 * mm, fill=1, stroke=1)
    c.setFillColor(colors.HexColor("#C8D3D8"))
    c.rect(x, y + height - 14 * mm, width, 14 * mm, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#17202A"))
    c.setFont("Helvetica-Bold", 8)
    c.drawString(x + 3 * mm, y + height - 6 * mm, "NORTHGATE POLICE - TAMPER EVIDENT PROPERTY BAG")
    c.setFont("Helvetica", 7)
    c.drawString(x + 3 * mm, y + height - 11 * mm, "Label recorded as NJ/1 | seal 884216")
    c.setStrokeColor(colors.HexColor("#252525"))
    c.setLineWidth(3)
    c.line(x + width * .30, y + height * .33, x + width * .68, y + height * .53)
    c.setLineWidth(1)
    c.line(x + width * .68, y + height * .53, x + width * .78, y + height * .58)
    redaction(c, x + 3 * mm, y + 5 * mm, width * .42)


def injury_diagram(c: canvas.Canvas, x: float, y: float, width: float, height: float) -> None:
    c.setStrokeColor(colors.HexColor("#4B5963"))
    c.setLineWidth(1.2)
    cx = x + width / 2
    c.circle(cx, y + height * .82, height * .08, fill=0, stroke=1)
    c.line(cx, y + height * .74, cx, y + height * .37)
    c.line(cx, y + height * .65, cx - width * .24, y + height * .48)
    c.line(cx, y + height * .65, cx + width * .24, y + height * .48)
    c.line(cx, y + height * .37, cx - width * .18, y + height * .08)
    c.line(cx, y + height * .37, cx + width * .18, y + height * .08)
    c.setFillColor(colors.HexColor("#A33E3E"))
    c.circle(cx + width * .10, y + height * .57, 3.5 * mm, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#17202A"))
    c.setFont("Helvetica", 7)
    c.drawString(x, y, "Diagram marks left upper abdomen injury site; not to scale.")


def page_text_blocks(doc_id: str, local: int) -> tuple[str, list[tuple[str, str]]]:
    # Every page has a distinct evidential or procedural purpose. Text intentionally
    # reflects only source-document propositions, never the external scoring key.
    if doc_id == "DOC-MG5-V1":
        heads = [
            ("Administrative record", "Prepared by PC Leah Morton on 9 June 2026. This first case summary predates later disclosure and the amended indictment. It is a prosecution summary and not a substitute for the source material."),
            ("Allegation summary", "The prosecution alleges that Malik Hassan and Jordan Price approached Daniel Okeke outside 14 Merton Parade at about 21:40, demanded property and left with a telephone and cash. Okeke sustained a wound during the incident."),
            ("Defendant positions", "Malik denies taking property or wounding Okeke. Price denies participating in a robbery and gives a separate account of why he was in Merton Parade. Each interview must be read on its own terms."),
            ("Witness and exhibit map", "Okeke, Priya Shah and Callum Briggs give accounts from different positions. Their observations are not identical. Police exhibits include clips, still images, property records and later forensic material."),
            ("Prosecution media narrative", "This version states that the CCTV depicts Malik stabbing Okeke and both defendants leaving together. The summary does not identify the obstructed frames or the limits recorded in the media schedule."),
            ("Disclosure position at version date", "Initial schedules refer to CCTV, custody, phone and forensic material. Several items were still being processed. The schedule records service position, not proof of the underlying allegation."),
            ("Listing information in this version", "PTPH shown here as 28 August 2026 at 14:00. This entry was copied from an early listing email and is later superseded by a court notice."),
        ]
        return heads[local - 1][0], [heads[local - 1]]
    if doc_id == "DOC-MG5-REVISED":
        heads = [
            ("Revision control", "Revised by PC Leah Morton on 30 June 2026 after receipt of signed witness material and initial media schedules. Changes are recorded rather than overwriting the earlier summary."),
            ("Revised allegation narrative", "The prosecution case remains that both defendants participated in the taking of property and that Malik caused the wound. The direct moment of contact is partially obscured in the available clips."),
            ("Evidence by defendant", "Joint evidence concerns approach, property and departure. The wounding allegation is recorded against Malik only. The recovered locking knife and its continuity issue concern Price only."),
            ("Media and timing", "The summary says CCTV confirms the sequence of attack and departure. The technical schedule separately records that the critical contact is not clear and that the camera clock is seven minutes fast."),
            ("Outstanding and later material", "The master CCTV export is not in the served material. Clips and stills are present. Telephone material is served under one title, while later correspondence uses an alternative label."),
            ("Current procedural position", "The amended indictment and later court notice must be used for operative counts and listing. Older versions remain available to explain changes."),
        ]
        return heads[local - 1][0], [heads[local - 1]]
    return "", []


def schedule_rows(doc_id: str, local: int) -> list[list[str]]:
    if doc_id == "DOC-MG6":
        base = (local - 1) * 8
        items = [
            ("CCTV clips C1-C4", "Served 25 Jun", "Clips only; master not included"),
            ("CCTV master export", "Not served", "Requested from premises"),
            ("BWV clips LM/2 and RK/4", "Part served", "One referenced segment pending"),
            ("CAD incident log", "Served 18 Jun", "Native print and certified extract"),
            ("999 audio and transcript", "Served 18 Jun", "Audio is primary"),
            ("Malik interview audio", "Served 12 Jun", "Complete recording"),
            ("Malik interview transcript", "Part served", "One transcript page absent"),
            ("Price interview audio/transcript", "Served 12 Jun", "Both present"),
            ("Phone extraction report", "Served 27 Jun", "Account association limits"),
            ("Downloaded handset data report", "Alias title", "Reconcile with served phone report"),
            ("Knife property bag record", "Served 24 Jun", "Continuity entry absent"),
            ("Medical notes and statement", "Served 29 Jun", "Injury evidence"),
            ("Draft Okeke account", "Disclosed", "Earlier clothing description"),
            ("Signed Okeke statement", "Served", "Later account; inconsistency retained"),
            ("PTPH court notice", "Served 3 Jul", "Latest listing source"),
            ("Disclosure email attachment", "Absent", "Email refers to file not enclosed"),
        ]
        rows = [["Item", "Status", "Recorded note"]]
        for i in range(8):
            item = items[(base + i) % len(items)]
            rows.append([f"{base+i+1:03d} {item[0]}", item[1], item[2]])
        return rows
    base = (local - 1) * 10
    categories = [
        ("Officer pocket notebook entry", "PC Leah Morton", "Joint chronology; unused"),
        ("Unedited premises clip request email", "Business security", "Master requested; no attachment"),
        ("Post-arrest image sheet", "Custody imaging", "Price only; no knife-use inference"),
        ("Draft witness contact note", "Witness care", "Okeke clothing description differs"),
        ("Unused call log", "OIC communications", "Administrative"),
        ("Forensic submission worksheet", "Property unit", "Price knife; continuity gap visible"),
        ("Interview preparation note", "DC Amir Khan", "Malik only; not evidence"),
        ("Interview preparation note", "DC Amir Khan", "Price only; not evidence"),
        ("Telephone extraction audit log", "Digital unit", "Malik-associated device/account"),
        ("Alternate-suspect elimination note", "Investigation team", "Uncharged person"),
        ("CCTV still selection sheet", "Media unit", "Derivative; critical act obscured"),
        ("Medical liaison email", "OIC / hospital", "Administrative; contact redacted"),
        ("BWV viewing note", "Disclosure officer", "Joint incident context"),
        ("Property bag movement sheet", "Evidence store", "Missing transfer between 4 and 6 June"),
        ("Early listing email", "CPS admin", "Superseded hearing date"),
        ("Duplicate witness index entry", "Bundle preparation", "Priya Shah repeated under two refs"),
        ("Custody clock print", "Custody system", "Conflicts with Malik interview times"),
        ("Phone report service receipt", "Defence secure email", "Served under primary title"),
    ]
    rows = [["Item", "Description / holder", "Scope", "Disclosure officer note"]]
    for i in range(10):
        desc, holder, note = categories[(base + i) % len(categories)]
        scope = ["Joint", "Malik only", "Price only", "Unclear"][(base + i) % 4]
        if local == 7 and i == 4:
            desc, holder, scope, note = ("Malik interview note - property bag observation", "Custody unit", "Malik only", "Text concerns Price's sealed knife bag; scope label requires correction")
        rows.append([f"{base+i+1:03d} {desc}", holder, scope, note])
    return rows


def statement_sections(doc_id: str, local: int) -> tuple[str, list[tuple[str, str]]]:
    names = {
        "DOC-MG11-DRAFT-C1": ("Daniel Okeke - draft account", [
            "I left the late shop shortly before quarter to ten. I had my telephone in my right hand and cash from the till envelope in my inside pocket.",
            "Two men came from the direction of the bus shelter. I first described one as wearing a grey hooded top and the other as having a red baseball cap with a dark jacket.",
            "The man in the grey top demanded my phone. I felt a blow and then a sharp pain. I could not see what caused it and I did not see a blade enter my body.",
            "My telephone and cash were gone when I was on the pavement. I remember voices but cannot now attribute each phrase to one man.",
            "A woman came from the café doorway and called for help. Another man used a cloth against my side until the ambulance arrived.",
            "I was frightened and in pain when I first spoke with police. Timings in this account are approximate and I had received medication before a fuller conversation.",
            "This document is an unsigned working account prepared from notes. I have been asked to read it before making a formal statement."
        ]),
        "DOC-MG11-SIGNED-C1": ("Daniel Okeke - signed statement", [
            "I make this statement after reviewing the officer's notes and my earlier draft. The incident was on 3 June 2026 outside 14 Merton Parade.",
            "I now recall the man who demanded the telephone as wearing a navy jacket with a light stripe on one sleeve. The other man wore a black hooded top. This differs from my first clothing description.",
            "I heard a demand for the telephone and cash. I cannot safely say which man spoke every word because the two voices overlapped and I turned away.",
            "I felt pressure and pain at my left side. I did not obtain a clear view of the object that caused the wound and cannot identify it from sight.",
            "After I fell, I saw two figures move towards Bridge Street. I cannot say from my own observation what either carried at that point.",
            "At hospital I was told I had a penetrating injury. The medical staff did not identify who caused it or what any person intended.",
            "I have checked this statement. The differences from the earlier draft have not been removed. I sign this as my present recollection."
        ]),
        "DOC-MG11-W1": ("Priya Shah - signed statement", [
            "I work at the Moonleaf Café opposite Merton Parade. At about 21:40 I was stacking chairs near the glass door.",
            "I saw two men approach a third man. A street sign and a parked delivery van blocked parts of my view.",
            "I heard raised voices and saw a quick movement. I did not see a knife or the point at which the complainant was injured.",
            "One man had a lighter mark on a sleeve; I cannot be certain whether it was clothing or reflected light. I saw both men leave towards Bridge Street.",
            "I called 999 from the café telephone. I later viewed no identification procedure and have not been shown social-media images."
        ]),
        "DOC-MG11-W2": ("Callum Briggs - signed statement", [
            "I was walking from the tram stop and reached Merton Parade after hearing someone shout.",
            "I saw a man on the pavement and two figures already moving away. I did not see the taking of property or the injury occur.",
            "I used a clean bar towel provided by the café and applied pressure while Priya Shah spoke to the emergency operator.",
            "The injured man said his phone had gone. He was distressed; I cannot recall his exact words and did not ask him to identify anyone.",
            "I remained until paramedics arrived and showed PC Morton where I had placed the towel. My observation concerns the aftermath only."
        ]),
    }
    supplements = {
        "DOC-MG11-DRAFT-C1": [
            "I had finished work at about 21:30 and walked east along Merton Parade. The shop shutters were down except at the late shop, and traffic was light. I did not know either man before that evening. My first description was given while I was lying down and before I had been shown any recording or photograph.",
            "The two men were close together when I first noticed them. I cannot give an exact distance because I was looking down at my telephone. The street lighting came from shop fronts and a lamp near the bus shelter. My description of colours was an immediate impression and I did not inspect either man's clothing.",
            "The movement and pain occurred very quickly. I turned my upper body and raised my left arm. I cannot put the demand, the loss of property and the injury into a precise second-by-second order. I did not handle or inspect any object afterwards and cannot link an object later recovered by police to what happened to me.",
            "I remember more than one voice, but I cannot reliably assign every word. I had not made notes before speaking to the officer. Where this account uses a quotation, it records the sense of what I remember rather than a guaranteed verbatim phrase. I did not see either man search my pockets.",
            "The café was opposite and slightly behind me. The woman who came out could have seen the pavement from a different angle. The man who helped applied pressure with a cloth. I did not discuss clothing descriptions or identity with either helper before the ambulance arrived.",
            "At hospital I received pain relief and answered preliminary questions. I understood that the officer's document was an early account to be checked later. I was tired and cannot now separate every hospital conversation from what I had already told police at the scene.",
            "I have not signed this draft and have not adopted it as a formal witness statement. It contains the officer's record of an early conversation and remains relevant because it preserves the description and uncertainty recorded at that stage.",
        ],
        "DOC-MG11-SIGNED-C1": [
            "Before making this statement I was told to give my own recollection and not to treat the earlier draft as necessarily correct. I have identified changes where I remember matters differently. I have not viewed the CCTV clips, any police image of the defendants or the recovered property.",
            "My present clothing recollection is based on a lighter strip I associate with the sleeve of the man nearest me. I accept that street lighting and movement may have affected colour. I cannot explain with certainty why this differs from the grey top and red cap recorded in the early draft.",
            "The demand was made while both men were near me. I recall the words 'phone' and 'cash', but I cannot safely attribute each word. I did not have an uninterrupted view of both faces and I make no identification from the material in this statement.",
            "I felt contact on my left side after turning. I saw no blade enter my body and saw no recovered knife at the scene. My description is of sensation and sequence only; it is not an opinion about the mechanism of injury or which person caused it.",
            "When I looked towards Bridge Street I saw two figures leaving. I was on the ground and my attention moved between them and the people helping me. I cannot say whether either figure carried my property, a weapon or any bag at that moment.",
            "The clinical explanation given to me concerned treatment. I do not rely on it to identify an assailant or to describe anyone's intention. My own knowledge is limited to the incident, the loss I discovered and what I personally perceived.",
            "I have read all pages of this statement. I understand that the earlier draft remains a separate document and that the changes between them can be considered. The signature confirms this statement as my present account; it does not certify the accuracy of any other record.",
        ],
        "DOC-MG11-W1": [
            "The café door faces the parade at an angle. A freestanding street sign and a delivery van were between me and part of the pavement. Interior lighting reflected on the glass. I moved towards the open doorway only after hearing raised voices.",
            "I could see general movement and relative positions, but the van obscured the lower bodies for part of the incident. I cannot give a reliable facial identification. I had never met Daniel Okeke or either of the two men before that evening.",
            "The quick movement lasted only a moment. I saw no object clearly and cannot say whether a hand held anything. My account should not be read as showing the cause of the injury; I realised Daniel was hurt when he bent and then went down.",
            "The lighter mark appeared briefly as a figure turned. It might have been fabric, a stripe or reflected light. I did not record its colour in a contemporaneous note and I cannot say which garment description in another account is correct.",
            "During the emergency call I described two people leaving and an injured man. I said that I had not seen what caused the injury. The call recording is the better source for the exact words and times; this statement is my later recollection.",
        ],
        "DOC-MG11-W2": [
            "My route brought me from Bridge Street towards the café. By the time I had a clear view, the confrontation itself was over. My attention was drawn first to the injured man rather than to the people moving away.",
            "The two figures were seen from behind and at a distance. Street furniture interrupted my view. I cannot identify them, describe what they carried or say whether they had acted together before I arrived.",
            "I asked the café worker for something clean and kept pressure on the wound until paramedics took over. I did not search Daniel's clothing or move any property other than the towel. I saw no knife or other suspected weapon.",
            "Daniel was speaking in short phrases and appeared distressed. I remember a reference to his phone, but the precise wording is uncertain. I did not hear him name either person and I did not ask questions intended to obtain an identification.",
            "I pointed out the used towel and the approximate positions to the first officer. I later gave my details away from the other witnesses. My statement concerns the aftermath and first aid; it does not provide direct evidence of the taking or wounding.",
        ],
    }
    title, pages = names[doc_id]
    text = pages[local - 1]
    return title, [
        ("Account", text),
        ("Further detail and observation limits", supplements[doc_id][local - 1]),
        ("Source and limits", f"This is page {local} of the {title.lower()}. Dates and descriptions are recorded as the maker gives them; uncertainty is not resolved by the document compiler."),
    ]


def custody_rows(local: int) -> list[list[str]]:
    page_events = {
        1: [("23:24", "Arrival recorded", "PC Rowe"), ("23:27", "Search authorised", "Sgt Rowe"), ("23:31", "Property receipt MH/1 opened", "PC Patel"), ("23:34", "Rights and entitlements explained", "PC Patel"), ("23:36", "Solicitor requested", "Sgt Rowe"), ("23:39", "Detention authorised", "Sgt Rowe")],
        2: [("23:31", "Arrival recorded", "PC Morton"), ("23:34", "Search authorised", "Sgt Rowe"), ("23:38", "Personal property separated", "PC Morton"), ("23:41", "Rights and entitlements explained", "PC Morton"), ("23:43", "Solicitor requested", "Sgt Rowe"), ("23:46", "Detention authorised", "Sgt Rowe")],
        3: [("23:42", "Risk questions completed", "PC Patel"), ("23:47", "Healthcare question: no acute concern", "PC Patel"), ("23:53", "Belts and laces bagged", "PC Patel"), ("00:06", "Drink provided", "PC Rowe"), ("00:24", "Cell observation", "PC Rowe"), ("00:52", "Rest check recorded", "PC Patel")],
        4: [("23:49", "Risk questions completed", "PC Morton"), ("23:55", "Shoulder bag sealed as separate exhibit", "PC Morton"), ("00:02", "Personal cash counted", "PC Morton"), ("00:18", "Drink provided", "PC Rowe"), ("00:41", "Cell observation", "PC Patel"), ("01:09", "Rest check recorded", "PC Rowe")],
        5: [("00:12", "Duty solicitor contacted", "Custody staff"), ("00:39", "Elise Ward arrival logged", "PC Patel"), ("00:46", "Private consultation began", "PC Patel"), ("01:02", "Private consultation ended", "PC Patel"), ("01:54", "Further private consultation began", "PC Rowe"), ("02:00", "Further private consultation ended", "PC Rowe")],
        6: [("01:08", "Custody record: delivered to interview", "PC Patel"), ("01:11", "Interview-room arrival acknowledged", "DC Khan"), ("01:14", "Audio interview start", "DC Khan"), ("01:43", "Custody record: return entered", "PC Patel"), ("01:52", "Audio interview end", "DC Khan"), ("01:58", "Cell return observed", "PC Rowe")],
        7: [("02:02", "Delivered to interview room", "PC Morton"), ("02:06", "Room and recording check", "DC Khan"), ("02:08", "Audio interview start", "DC Khan"), ("02:44", "Audio interview end", "DC Khan"), ("02:49", "Returned to custody area", "PC Morton"), ("02:56", "Cell return observed", "PC Rowe")],
        8: [("08:14", "Charging authority recorded", "Custody officer"), ("08:22", "Count 1 read to Malik", "Sgt Rowe"), ("08:24", "Reply to Count 1 recorded", "Sgt Rowe"), ("08:27", "Count 2 read to Malik", "Sgt Rowe"), ("08:29", "Reply to Count 2 recorded", "Sgt Rowe"), ("08:36", "Remand reasons entered", "Sgt Rowe")],
        9: [("08:41", "Charging authority recorded", "Custody officer"), ("08:48", "Count 1 read to Price", "Sgt Rowe"), ("08:50", "Reply to Count 1 recorded", "Sgt Rowe"), ("08:53", "Count 3 read to Price", "Sgt Rowe"), ("08:55", "Reply to Count 3 recorded", "Sgt Rowe"), ("09:03", "Bail position entered", "Sgt Rowe")],
        10: [("10:12", "Malik remand record completed", "Sgt Rowe"), ("10:20", "Malik property transfer receipt", "PC Patel"), ("10:34", "Price bail notice prepared", "Custody officer"), ("10:41", "Price conditions explained", "Sgt Rowe"), ("10:47", "Price property returned", "PC Morton"), ("10:52", "Price release time recorded", "PC Morton")],
    }
    return [["Time", "Entry", "Officer / source", "Source state"]] + [
        [time, entry, officer, "Custody system entry"] for time, entry, officer in page_events[local]
    ]


def media_rows(local: int) -> list[list[str]]:
    rows = {
        1: [("CCTV C1-C4", "Derivative MP4 set", "Served", "No premises master"), ("Premises master", "Native export", "Not supplied", "Requested 6 June"), ("BWV LM/2", "Officer camera", "Served", "Begins after incident"), ("BWV RK/4", "Officer camera", "Part set", "Later street search")],
        2: [("C1 frame 0031", "21:46:18 display", "Served still", "Hands not resolved"), ("Camera 2 clock", "+7 minutes approx.", "Metadata note", "Not silently corrected"), ("C1 clip hash", "SHA-256 register", "Verified", "Derivative clip only"), ("View line A", "Bus shelter approach", "Analyst note", "No facial identification")],
        3: [("C2 frame 0084", "21:47:03 display", "Served still", "Van blocks contact"), ("Street sign", "Fixed obstruction", "Scene plan", "Lower bodies obscured"), ("C2 clip hash", "SHA-256 register", "Verified", "Derivative clip only"), ("View line B", "Café doorway angle", "Analyst note", "No weapon visible")],
        4: [("C3 frame 0117", "21:47:29 display", "Served still", "Figure separates"), ("Contact area", "Behind van edge", "Obscured", "No act clearly shown"), ("C3 clip hash", "SHA-256 register", "Verified", "Derivative clip only"), ("Motion blur", "Three-frame sequence", "Present", "Limits fine detail")],
        5: [("C4 frame 0162", "21:48:11 display", "Served still", "Two figures depart"), ("Bridge Street route", "Camera edge", "Partial view", "Identity unresolved"), ("C4 clip hash", "SHA-256 register", "Verified", "Derivative clip only"), ("Final frame", "21:48:19 display", "End of clip", "No property detail")],
        6: [("CAD event 0001", "21:40:12", "Call created", "CAD timebase"), ("CAD event 0004", "21:42:02", "Units dispatched", "CAD timebase"), ("CAD event 0011", "21:47:06", "First unit arrived", "CAD timebase"), ("CAD event 0017", "22:03:44", "Ambulance update", "Operator entry")],
        7: [("999 audio", "21:39:58 start", "Served WAV", "Primary audio"), ("Transcript line 12", "Two people leaving", "Listening aid", "Speaker attribution only"), ("Transcript line 19", "Cause not seen", "Listening aid", "Caller uncertainty"), ("Audio hash", "SHA-256 register", "Verified", "No enhancement applied")],
        8: [("BWV LM/2", "21:47:22 start", "Served", "First aid and scene"), ("BWV LM/2 marker", "21:51:08", "Bookmark", "Witness names audible"), ("BWV RK/4", "23:02:14 start", "Part set", "Street search"), ("Referenced segment", "RK/4 00:18-00:26", "Not supplied", "Schedule exception")],
        9: [("CCTV display", "21:47:03", "Unadjusted", "Approx. +7 min"), ("CAD comparison", "21:40:12", "Recorded", "Different system"), ("Working comparison", "21:40 approx.", "Analyst calculation", "Not a corrected native time"), ("Tolerance", "±45 seconds", "Analyst note", "Clock drift unknown")],
        10: [("Derivative clips", "C1-C4", "Served", "Playable"), ("Still sheets", "Selected frames", "Served", "Not continuous footage"), ("Premises master", "Native export", "Missing", "Completeness issue"), ("Critical contact", "C2-C3 interval", "Obscured", "No clear stabbing")],
    }
    return [["Source / item", "Time or format", "State", "Limit / provenance"]] + [list(row) for row in rows[local]]


def medical_rows(local: int) -> list[list[str]]:
    rows = {
        1: [("3 Jun 22:18", "Triage nurse", "Initial observations", "Clinical fact"), ("3 Jun 22:23", "Triage nurse", "Pain score and history", "Patient report"), ("3 Jun 22:31", "Dr Venn", "Abdominal examination", "Clinical fact"), ("3 Jun 22:38", "Medication chart", "Analgesia given", "Treatment record")],
        2: [("3 Jun 22:46", "Dr Venn", "Bloods requested", "Clinical action"), ("3 Jun 22:58", "Radiology", "Imaging request received", "System timestamp"), ("3 Jun 23:21", "Radiology", "Imaging completed", "Report follows"), ("3 Jun 23:44", "Surgical team", "Referral accepted", "Clinical action")],
        3: [("4 Jun 00:18", "Operating team", "Procedure commenced", "Operation record"), ("4 Jun 00:31", "Surgeon", "Wound track described", "Anatomical finding"), ("4 Jun 00:52", "Surgeon", "Repair completed", "Treatment record"), ("4 Jun 01:06", "Recovery", "Transferred from theatre", "Clinical fact")],
        4: [("4 Jun 02:10", "Recovery nurse", "Post-operative observations", "Clinical fact"), ("4 Jun 09:15", "Ward doctor", "Review and plan", "Clinical record"), ("5 Jun 11:40", "Ward team", "Mobilising and eating", "Clinical record"), ("6 Jun 14:05", "Discharge team", "Advice and follow-up", "Clinical record")],
        5: [("18 Jun", "Dr Venn", "Notes reviewed", "Factual statement"), ("18 Jun", "Dr Venn", "Examination recorded", "Factual statement"), ("18 Jun", "Dr Venn", "Treatment chronology", "From clinical notes"), ("18 Jun", "Dr Venn", "Identity not addressed", "Express boundary")],
        6: [("24 Jun", "Forensic clinician", "Records and images reviewed", "Opinion basis"), ("24 Jun", "Forensic clinician", "Sharp implement compatibility", "Qualified opinion"), ("24 Jun", "Forensic clinician", "Specific item not identified", "Express limitation"), ("24 Jun", "Forensic clinician", "No intent opinion", "Outside expertise")],
        7: [("24 Jun", "Forensic report", "Injury supported", "Medical question"), ("24 Jun", "Forensic report", "Assailant not identified", "Identity question separate"), ("24 Jun", "Forensic report", "Intent not determined", "Legal/factual question"), ("24 Jun", "Forensic report", "Weapon attribution not made", "Item-specific limitation")],
        8: [("MED/1", "ED extract", "Served 29 Jun", "Redacted contact data"), ("MED/2", "Imaging report", "Served 29 Jun", "Clinical report"), ("MV/1", "Dr Venn statement", "Served 29 Jun", "Signed source"), ("FM/1", "Forensic report", "Served 30 Jun", "Opinion and limits")],
    }
    return [["Date / ref", "Author / source", "Clinical or opinion entry", "Boundary / state"]] + [list(row) for row in rows[local]]


def interview_rows(person: str, local: int) -> list[list[str]]:
    if person == "Malik":
        pages = [
            [
                ("01:14:02", "KHAN", "Confirm your full name and date of birth.", "Malik Hassan; the details you read are correct."),
                ("01:14:41", "KHAN", "Do you understand the caution?", "Yes."),
                ("01:15:10", "KHAN", "Why were you in Merton Parade?", "I was meeting someone near the tram stop."),
                ("01:15:48", "KHAN", "Who were you meeting?", "A person I know as Jay; I do not have his full details."),
                ("01:16:27", "KHAN", "When did you arrange that meeting?", "Earlier that evening by message."),
                ("01:17:05", "KHAN", "Which device or account did you use?", "The account on the black phone, but other people also used it."),
            ],
            [
                ("01:17:42", "KHAN", "How did you travel to the parade?", "I walked from Northgate tram stop."),
                ("01:18:19", "KHAN", "Were you with Jordan Price then?", "I saw him near the shops; we had not travelled together."),
                ("01:18:58", "KHAN", "How well do you know Price?", "I know him locally."),
                ("01:19:36", "KHAN", "Did you plan to meet him?", "No."),
                ("01:20:14", "KHAN", "Where did you first see Daniel Okeke?", "Near the late shop."),
                ("01:20:51", "KHAN", "Had you met him before?", "No."),
            ],
            [
                ("01:21:17", "KHAN", "Did you demand Daniel Okeke's phone?", "No."),
                ("01:21:55", "KHAN", "Did you ask him for cash?", "No."),
                ("01:22:33", "KHAN", "Did you take either item?", "No."),
                ("01:23:10", "KHAN", "Were you close enough to touch him?", "People moved around; I did not attack him."),
                ("01:23:48", "KHAN", "Did Price make a demand?", "I did not hear him demand property."),
                ("01:24:25", "KHAN", "Why does Okeke say two men approached?", "I cannot explain what he thought."),
            ],
            [
                ("01:24:48", "KHAN", "The case summary says CCTV shows an attack. What do you say?", "It does not show me stabbing anyone."),
                ("01:25:27", "KHAN", "Have you seen the complete premises recording?", "No."),
                ("01:26:05", "KHAN", "Do you accept you are one figure in the clips?", "I cannot identify every figure from those images."),
                ("01:26:43", "KHAN", "Were you wearing a jacket with a light stripe?", "I had a dark jacket; I do not call it a stripe."),
                ("01:27:20", "KHAN", "Did you move towards Bridge Street?", "Yes, after people started shouting."),
                ("01:27:58", "KHAN", "Why did you move away?", "I did not want to be involved in trouble."),
            ],
            [
                ("01:28:06", "KHAN", "Whose account is shown in the phone report?", "I used that account sometimes; other people had the handset."),
                ("01:28:45", "KHAN", "Was the black handset yours?", "It was in a coat I used, but it was shared."),
                ("01:29:23", "KHAN", "Who else had access?", "Friends at the flat; I am not naming someone without seeing the messages."),
                ("01:30:01", "KHAN", "Did you send a message about Merton Parade?", "I may have discussed meeting there."),
                ("01:30:38", "KHAN", "Did you write the phrase highlighted by the officer?", "I do not accept that you can attribute it to me."),
                ("01:31:16", "SOLICITOR", "Please distinguish device possession, account use and authorship.", "The question will be put on that basis."),
            ],
            [
                ("01:31:41", "KHAN", "Did you write each scheduled message?", "No. You cannot say that from an account name."),
                ("01:32:19", "KHAN", "Did you delete any message after the incident?", "No."),
                ("01:32:57", "KHAN", "Was the device with you throughout?", "Not throughout the evening."),
                ("01:33:34", "KHAN", "When did you last personally use it?", "I cannot give an exact time."),
                ("01:34:12", "KHAN", "Do location records place you at the parade?", "They may place a phone in the area, not show who held it."),
                ("01:34:50", "KHAN", "Is that your final answer on authorship?", "Yes; check the source data."),
            ],
            [
                ("01:35:20", "KHAN", "Did you have a weapon?", "No."),
                ("01:35:58", "KHAN", "Did you see any blade?", "No."),
                ("01:36:36", "KHAN", "Did you make contact with Okeke's left side?", "No."),
                ("01:37:13", "KHAN", "How do you explain his injury?", "I cannot; I did not cause it."),
                ("01:37:51", "KHAN", "Were you aware he was injured before he fell?", "No."),
                ("01:38:29", "KHAN", "Did you intend anyone to be seriously hurt?", "No."),
            ],
            [
                ("01:38:57", "KHAN", "Did Price have a knife?", "I did not see what was in his bag."),
                ("01:39:35", "KHAN", "Did you see Price open a shoulder bag?", "No."),
                ("01:40:13", "KHAN", "Did Price tell you about a knife?", "No."),
                ("01:40:50", "KHAN", "Did you know anyone was armed?", "No."),
                ("01:41:28", "SOLICITOR", "The answer concerns what the interviewee says he saw, not possession.", "Understood."),
                ("01:42:06", "KHAN", "Did you encourage Price to use force?", "No."),
            ],
            [
                ("01:45:32", "KHAN", "Why did you leave towards Bridge Street?", "People were shouting and I walked away."),
                ("01:46:10", "KHAN", "Did you leave with Price?", "We were going in the same direction for part of the way."),
                ("01:46:48", "KHAN", "Did you divide any property?", "No."),
                ("01:47:25", "KHAN", "Where did you go next?", "Towards the tram stop."),
                ("01:49:09", "KHAN", "Is there anything else you wish to say?", "I did not rob or wound him."),
                ("01:52:04", "KHAN", "Interview concluded.", "No further reply."),
            ],
        ]
    else:
        pages = [
            [
                ("02:08:03", "KHAN", "Confirm your full name and date of birth.", "Jordan Price; the personal details are correct."),
                ("02:08:41", "KHAN", "Do you understand the caution?", "Yes."),
                ("02:09:18", "KHAN", "Why were you in Merton Parade?", "I was going home by Bridge Street."),
                ("02:09:56", "KHAN", "Where had you come from?", "A friend's flat near Northgate Road."),
                ("02:10:34", "KHAN", "Were you expected at Merton Parade?", "No."),
                ("02:11:12", "KHAN", "Were you carrying a shoulder bag?", "Yes."),
            ],
            [
                ("02:11:49", "KHAN", "When did you see Malik Hassan?", "Near the shops."),
                ("02:12:27", "KHAN", "Had you arranged to meet him?", "No."),
                ("02:12:44", "KHAN", "Did you take Daniel Okeke's property?", "No."),
                ("02:13:22", "KHAN", "Did you demand his phone?", "No."),
                ("02:14:00", "KHAN", "Did you demand cash?", "No."),
                ("02:14:38", "KHAN", "Did you see anyone take those items?", "No."),
            ],
            [
                ("02:15:16", "KHAN", "How close were you to Okeke?", "A few steps away at the nearest point."),
                ("02:15:53", "KHAN", "Did you touch or restrain him?", "No."),
                ("02:16:20", "KHAN", "Did you act with Malik Hassan?", "No, I knew him but we were not robbing anyone."),
                ("02:16:58", "KHAN", "Did you hear Malik make a demand?", "No."),
                ("02:17:36", "KHAN", "Did you encourage any use of force?", "No."),
                ("02:18:14", "KHAN", "Why might witnesses describe two men?", "We were both nearby; that does not mean we acted together."),
            ],
            [
                ("02:18:51", "KHAN", "What did you see immediately before Okeke fell?", "Movement, but the van and people blocked my view."),
                ("02:19:29", "KHAN", "Did you see a wound being caused?", "No."),
                ("02:20:07", "KHAN", "A locking knife was recovered in a bag associated with you.", "I had put a locking knife in my bag earlier."),
                ("02:20:45", "KHAN", "Where in the bag was it?", "Inside a zipped pocket."),
                ("02:21:23", "KHAN", "When had you last handled it?", "Earlier, before I went to the parade."),
                ("02:22:01", "KHAN", "Did you remove it at Merton Parade?", "No."),
            ],
            [
                ("02:22:38", "KHAN", "Was the locking knife used against Okeke?", "No. I did not take it out."),
                ("02:23:16", "KHAN", "Did Malik know it was in the bag?", "I had not told him."),
                ("02:23:54", "KHAN", "Did anyone ask you to bring it?", "No."),
                ("02:24:32", "KHAN", "Was the bag continuously with you?", "It was with me until police took it."),
                ("02:25:10", "KHAN", "Did you see the police open the evidential seal?", "No."),
                ("02:25:48", "KHAN", "Can you identify the exhibit photograph?", "It looks like the item, but I cannot speak to police handling."),
            ],
            [
                ("02:26:25", "KHAN", "Did the knife have a locking mechanism?", "Yes."),
                ("02:27:03", "KHAN", "Was its blade exposed in public?", "No."),
                ("02:27:41", "KHAN", "Did you threaten anyone with it?", "No."),
                ("02:27:55", "KHAN", "Did you see another weapon?", "No."),
                ("02:28:33", "KHAN", "Did you see anything in Malik's hands?", "Nothing I could identify as a weapon."),
                ("02:29:11", "KHAN", "Did you know anyone was armed?", "No."),
            ],
            [
                ("02:29:48", "KHAN", "When did you first realise Okeke was injured?", "When he bent over and people called out."),
                ("02:30:26", "KHAN", "Did you go to help?", "No; I panicked."),
                ("02:31:09", "KHAN", "Did you know anyone intended to wound him?", "No."),
                ("02:31:47", "KHAN", "Had you discussed using force?", "No."),
                ("02:32:25", "KHAN", "Had you discussed taking property?", "No."),
                ("02:33:03", "KHAN", "Did you share any proceeds?", "There were no proceeds to share."),
            ],
            [
                ("02:33:40", "KHAN", "Do you accept being shown leaving in the same direction as Malik?", "I may be one figure; the images are unclear."),
                ("02:34:18", "KHAN", "Why did you leave?", "I was scared when he fell."),
                ("02:34:56", "KHAN", "Did you run?", "I walked quickly, then ran when I heard shouting."),
                ("02:35:34", "KHAN", "Where did you go?", "Along Bridge Street."),
                ("02:36:12", "KHAN", "Did you discard anything?", "No."),
                ("02:36:50", "KHAN", "Did you contact Malik afterwards?", "No."),
            ],
            [
                ("02:37:27", "KHAN", "The exhibit log has been summarised to you. Any comment?", "I cannot comment on a gap after police took the bag."),
                ("02:38:15", "SOLICITOR", "The exhibit continuity has not been put in full.", "The matter will be recorded."),
                ("02:38:53", "KHAN", "Do you accept the item was in your bag before seizure?", "Yes, but it was not used on anyone."),
                ("02:39:31", "KHAN", "Do you accept taking part in a robbery?", "No."),
                ("02:41:30", "KHAN", "Is there anything else you wish to say?", "The knife in my bag was not used on anyone."),
                ("02:44:02", "KHAN", "Interview concluded.", "No further reply."),
            ],
        ]
    return [["Time", "Speaker", "Question / intervention", "Answer"]] + [list(row) for row in pages[local - 1]]


def render_page(c: canvas.Canvas, doc, local: int, truth: dict) -> None:
    doc_id, title, filename, start, end, org = doc
    compiled = start + local - 1
    total_local = end - start + 1
    pagesize = page_size_for(doc_id, local)
    w, h = pagesize
    y = header(c, title, compiled, local, total_local, org, pagesize)
    x = 15 * mm
    width = w - 30 * mm

    if doc_id == "DOC-COVER":
        c.setFillColor(colors.HexColor("#19324A"))
        c.setFont("Helvetica-Bold", 22)
        c.drawCentredString(w / 2, h - 72 * mm, "IN THE CROWN COURT AT NORTHGATE")
        c.setFont("Helvetica-Bold", 18)
        c.drawCentredString(w / 2, h - 92 * mm, "R")
        c.drawCentredString(w / 2, h - 105 * mm, "- v -")
        c.drawCentredString(w / 2, h - 118 * mm, "MALIK HASSAN")
        c.drawCentredString(w / 2, h - 131 * mm, "JORDAN PRICE")
        c.setFont("Helvetica-Bold", 15)
        c.drawCentredString(w / 2, h - 155 * mm, "PROSECUTION CASE PAPERS")
        c.setFont("Helvetica", 11)
        c.drawCentredString(w / 2, h - 170 * mm, "Plea and Trial Preparation Hearing")
        c.drawCentredString(w / 2, h - 178 * mm, "14 September 2026 at 10:00 - Court 3")
        c.drawCentredString(w / 2, h - 190 * mm, f"Case number {CASE_REF}")
        c.setFont("Helvetica-Bold", 10)
        c.drawCentredString(w / 2, h - 215 * mm, "Compiled pagination: 1-150")
        c.setFont("Helvetica", 8)
        c.drawCentredString(w / 2, h - 224 * mm, "Personal data in this bundle is restricted to authorised criminal proceedings users.")
        return

    if doc_id == "DOC-INDEX":
        y = section(c, f"Index section {local} of 5", x, y, width)
        entries = []
        for idx, d in enumerate(DOCS):
            _, dt, _, ds, de, _ = d
            entries.append([str(idx + 1), dt, f"{ds}-{de}"])
        chunk = entries[(local - 1) * 5 : local * 5]
        if local == 1:
            chunk.append(["M1", "Master CCTV footage - served", "120-129"])
        if local == 3:
            chunk.append(["11A", "Priya Shah witness statement - duplicate index reference", "70-74"])
        y = table(c, [["Ref", "Document", "Compiled pages"]] + chunk, x, y, [18 * mm, width - 48 * mm, 30 * mm], 8, 10 * mm)
        if local == 1:
            y -= 8 * mm
            y = paragraph(c, "Index status entry M1 records the bundle-preparation entry as received. Service and completeness must be checked against the underlying media register.", x, y, width)
        return

    if doc_id in {"DOC-MG5-V1", "DOC-MG5-REVISED"}:
        heading, blocks = page_text_blocks(doc_id, local)
        y = section(c, heading, x, y, width)
        for label, text in blocks:
            y = paragraph(c, text, x, y, width, 10, 14)
            y -= 8 * mm
        y = section(c, "Key entries at this version date", x, y, width)
        rows = [["Field", "Entry"], ["Prepared", "PC Leah Morton / Northgate Constabulary"], ["Incident", "3 June 2026, approximately 21:40"], ["Defendants", "Malik Hassan; Jordan Price"], ["Status", "Prosecution summary - source evidence must be consulted"]]
        if doc_id == "DOC-MG5-V1" and local == 7:
            rows.append(["PTPH", "28 August 2026 at 14:00 - early listing entry"])
        y = table(c, rows, x, y, [38 * mm, width - 38 * mm], 8, 10 * mm)
        return

    if doc_id in {"DOC-INDICTMENT-ORIGINAL", "DOC-INDICTMENT-AMENDED"}:
        original = doc_id.endswith("ORIGINAL")
        if local == 1:
            c.setFont("Helvetica-Bold", 14)
            c.drawCentredString(w / 2, y, "INDICTMENT")
            y -= 12 * mm
            y = table(c, [["Court", "Case number", "Status"], ["Northgate Crown Court", CASE_REF, "ORIGINAL - SUPERSEDED" if original else "AMENDED - OPERATIVE SOURCE"]], x, y, [width * .38, width * .25, width * .37], 8, 11 * mm)
            if original:
                stamp(c, w - 75 * mm, y - 20 * mm, "SUPERSEDED")
            else:
                stamp(c, w - 70 * mm, y - 20 * mm, "AMENDED")
        charge = truth["specimenCharges"]["counts"][local - 1]
        wording = charge["specimenWording"]
        if original:
            wording = wording.replace("on 3 June 2026", "on 1 June 2026")
        statement, particulars = wording.split(" PARTICULARS OF OFFENCE ")
        y -= 18 * mm
        y = section(c, f"COUNT {local}", x, y, width)
        y = paragraph(c, statement, x, y, width, 11, 15, "Helvetica-Bold")
        y -= 8 * mm
        y = paragraph(c, "PARTICULARS OF OFFENCE", x, y, width, 10, 14, "Helvetica-Bold")
        y = paragraph(c, particulars, x, y, width, 11, 15)
        y -= 15 * mm
        y = paragraph(c, f"Defendant allocation: {', '.join(charge['defendants'])}", x, y, width, 9.5, 13, "Helvetica-Bold")
        if local == 3:
            y = paragraph(c, "The article described in this count is a locking knife. This count is recorded against Jordan Price only.", x, y - 5 * mm, width, 9.5, 13)
        return

    if doc_id in {"DOC-MG6", "DOC-MG6C"}:
        y = section(c, "Disclosure record" if doc_id == "DOC-MG6" else "Non-sensitive unused material schedule", x, y, width)
        if local == 1:
            intro = "This schedule records item descriptions and service/review states. It is not evidence that an underlying allegation is true."
            y = paragraph(c, intro, x, y, width, 9.5, 13)
            y -= 5 * mm
        widths = [52 * mm, 42 * mm, width - 94 * mm] if doc_id == "DOC-MG6" else [66 * mm, 40 * mm, 28 * mm, width - 134 * mm]
        y = table(c, schedule_rows(doc_id, local), x, y, widths, 6.8 if doc_id == "DOC-MG6C" else 7.2, 9 * mm)
        if local == (end - start + 1):
            y -= 5 * mm
            y = paragraph(c, "Prepared by DC Amelia Frost, Disclosure Officer. Prosecutor endorsements and continuing review remain item-specific.", x, y, width, 8.5, 12)
            signature(c, x, y - 12 * mm, "A. Frost")
        return

    if doc_id in {"DOC-MG11-DRAFT-C1", "DOC-MG11-SIGNED-C1", "DOC-MG11-W1", "DOC-MG11-W2"}:
        shead, blocks = statement_sections(doc_id, local)
        y = section(c, shead, x, y, width)
        fields = [["Statement reference", f"{POLICE_REF}/W{compiled}"], ["Maker", shead.split(" - ")[0]], ["Date", "18 June 2026" if "draft" not in shead.lower() else "5 June 2026"], ["Pages", f"{local} of {total_local}"]]
        y = table(c, [["Field", "Entry"]] + fields, x, y, [38 * mm, width - 38 * mm], 8, 8.5 * mm)
        y -= 5 * mm
        for label, text in blocks:
            y = section(c, label, x, y, width)
            y = paragraph(c, text, x, y, width, 9.6, 13)
            y -= 4 * mm
        if local == total_local and "draft" not in shead.lower():
            y -= 4 * mm
            c.setFont("Helvetica", 8)
            c.drawString(x, y, "I believe that the facts stated in this witness statement are true.")
            signature(c, x, y - 12 * mm, shead.split(" - ")[0])
            redaction(c, x + 90 * mm, y - 10 * mm, 65 * mm)
        elif "draft" in shead.lower() and local == total_local:
            stamp(c, x + 70 * mm, y - 15 * mm, "UNSIGNED DRAFT")
        return

    if doc_id == "DOC-POLICE-STATEMENTS":
        page_topics = [
            ("PC Leah Morton - first response", "Arrival at 21:47; ambulance requested; complainant on pavement; no officer witnessed the incident."),
            ("PC Leah Morton - scene log", "Café doorway, bus shelter and delivery-van sightline recorded. Property positions photographed before collection."),
            ("PC Rowan King - arrest of Malik Hassan", "Arrest at 23:06 near Northgate tram stop; grounds, caution and property list recorded."),
            ("PC Naomi Jones - arrest of Jordan Price", "Arrest at 23:18 on Bridge Street; shoulder bag retained and sealed."),
            ("Property bag opening record", "Bag seal 884216 opened at 00:42 on 4 June. A locking knife was photographed and rebagged."),
            ("Knife photograph exhibit", "Photograph marked NJ/1. The image shows an item in a property bag; it does not establish use."),
            ("Property-bag continuity log", "Log also marked NJ/1. The repeated label is a collision between two records, not a complete chain."),
            ("Evidence-store movements", "Entry from seizure to temporary locker is present. Transfer between 4 and 6 June is not recorded."),
            ("Forensic submission", "Laboratory receipt on 6 June records seal 884216A. The intervening handler field is blank."),
            ("CCTV collection statement", "Four clips copied on 5 June. The premises master export was requested but not supplied."),
            ("BWV continuity", "Two officer clips hashed and scheduled; one referenced segment remains outside the bundle."),
            ("Reconciliation statement", "Separate defendant and count scope is maintained. No officer concludes the recovered knife caused the wound."),
        ]
        topic, text = page_topics[local - 1]
        y = section(c, topic, x, y, width)
        y = paragraph(c, text, x, y, width, 9.8, 13.5)
        y -= 8 * mm
        if local in {5, 6, 7, 8, 9}:
            exhibit_bag(c, x + 15 * mm, y - 70 * mm, 130 * mm, 62 * mm)
            y -= 82 * mm
        rows = [["Time/date", "Actor", "Record", "Limit / status"]]
        for i in range(7):
            rows.append([f"{3+i:02d} Jun {2026} {21+i:02d}:{(local*7+i*3)%60:02d}", ["Morton","Jones","King","Evidence store"][i%4], f"Entry {local:02d}.{i+1}", ["Observed","Reported","Gap noted","Awaiting reconciliation"][i%4]])
        y = table(c, rows, x, y, [35 * mm, 32 * mm, 38 * mm, width - 105 * mm], 7.2, 8.5 * mm)
        if local in {1, 3, 4, 10, 11, 12}:
            signature(c, x, 25 * mm, page_topics[local - 1][0].split(" - ")[0])
        return

    if doc_id in {"DOC-INTERVIEW-MALIK", "DOC-INTERVIEW-PRICE"}:
        person = "Malik" if doc_id.endswith("MALIK") else "Price"
        if person == "Malik" and compiled == 97:
            c.setFillColor(colors.HexColor("#F3E5C8"))
            c.roundRect(x, h / 2 - 35 * mm, width, 70 * mm, 3 * mm, fill=1, stroke=0)
            c.setFillColor(colors.HexColor("#7A4D00"))
            c.setFont("Helvetica-Bold", 15)
            c.drawCentredString(w / 2, h / 2 + 18 * mm, "TRANSCRIPT PAGE NOT INCLUDED IN SERVED SET")
            c.setFont("Helvetica", 11)
            c.drawCentredString(w / 2, h / 2 + 4 * mm, "The complete audio recording is listed as served.")
            c.drawCentredString(w / 2, h / 2 - 6 * mm, "The transcript sequence moves from source page 5 to source page 7.")
            c.setFont("Helvetica-Bold", 11)
            c.drawCentredString(w / 2, h / 2 - 21 * mm, "Recording served / transcript incomplete")
            return
        y = section(c, f"Interview of {person} {'Hassan' if person == 'Malik' else 'Price'}", x, y, width)
        times = "01:14-01:52" if person == "Malik" else "02:08-02:44"
        rows = [["Location", "Interviewer", "Solicitor", "Recorded"], ["Northgate Central - Room 2", "DC Amir Khan", "Ms Elise Ward", f"4 June 2026 {times}"]]
        y = table(c, rows, x, y, [45 * mm, 42 * mm, 42 * mm, width - 129 * mm], 7.4, 11 * mm)
        y -= 5 * mm
        y = table(c, interview_rows(person, local), x, y, [24 * mm, 24 * mm, 74 * mm, width - 122 * mm], 7.0, 11 * mm)
        if local == total_local:
            y -= 6 * mm
            y = paragraph(c, "Audio media is retained separately under the interview reference. Transcript is an aid to listening; the recording is primary where they differ.", x, y, width, 8.5, 12)
            signature(c, x, y - 12 * mm, "DC Amir Khan")
        return

    if doc_id == "DOC-CUSTODY-PACE":
        topics = [
            ("Custody front sheet - Malik Hassan", "Arrival 23:24; detention authorised 23:39; rights and legal advice recorded."),
            ("Custody front sheet - Jordan Price", "Arrival 23:31; detention authorised 23:46; rights and legal advice recorded."),
            ("Malik risk and property", "No acute healthcare concern recorded; property sealed separately from case exhibits."),
            ("Price risk and property", "Shoulder bag and personal property listed; evidential bag managed under separate exhibit record."),
            ("Legal advice and rest", "Elise Ward attended. Private consultation occurrence recorded without content."),
            ("Malik movement log", "Custody system says delivered to interview at 01:08 and returned at 01:43."),
            ("Price movement log", "Delivered at 02:02 and returned at 02:49."),
            ("Charging record - Malik", "Charge decision and response fields; counts 1 and 2 allocated to Malik."),
            ("Charging record - Price", "Charge decision and response fields; counts 1 and 3 allocated to Price."),
            ("Release/remand summary", "Malik remanded; Price conditional bail record referenced. This page does not replace a court order."),
        ]
        head, text = topics[local - 1]
        y = section(c, head, x, y, width)
        y = paragraph(c, text, x, y, width, 9.8, 13)
        y = table(c, custody_rows(local), x, y - 5 * mm, [24 * mm, 70 * mm, 39 * mm, width - 133 * mm], 7.2, 10 * mm)
        if local in {1, 2, 8, 9, 10}:
            signature(c, x, 25 * mm, "Sgt Helen Rowe")
        return

    if doc_id == "DOC-CCTV-BWV-CAD":
        topics = [
            ("Media register", "Four derivative CCTV clips are served. The premises master export is not supplied. CCTV device clock is recorded as seven minutes fast."),
            ("CCTV clip C1 - approach", "Camera display 21:46:18. Two figures approach from the bus shelter; faces and hands are not clear."),
            ("CCTV clip C2 - obstruction", "Camera display 21:47:03. Delivery van and sign obstruct the area of close contact."),
            ("CCTV clip C3 - separation", "Camera display 21:47:29. A figure moves back; no blade or wound-causing act is visible clearly."),
            ("CCTV clip C4 - departure", "Camera display 21:48:11. Two figures move towards Bridge Street; identity cannot be determined from the frame alone."),
            ("CAD incident log", "First call logged 21:40:12 on the CAD timebase. Units dispatched 21:42:02; first officer arrival 21:47:06."),
            ("999 audio transcript", "Caller identifies an injured man and two people leaving. Caller says she did not see what caused the injury."),
            ("Body-worn video register", "LM/2 begins after arrival and records first aid and initial scene. RK/4 records later street search."),
            ("Timebase reconciliation", "CCTV displayed time is approximately seven minutes ahead of CAD. Both displayed and comparative times are retained."),
            ("Completeness and limitations", "The served set has clips and stills, not the master export. Critical contact is obscured; media does not clearly show the stabbing."),
        ]
        head, text = topics[local - 1]
        y = section(c, head, x, y, width)
        y = paragraph(c, text, x, y, width, 9.5, 13)
        y -= 5 * mm
        if local in {2, 3, 4, 5}:
            ts = ["03/06/2026 21:46:18","03/06/2026 21:47:03","03/06/2026 21:47:29","03/06/2026 21:48:11"][local-2]
            cctv_frame(c, x + 10 * mm, y - 90 * mm, width - 20 * mm, 80 * mm, ts, "Premises camera 2 - derivative still; displayed clock not silently corrected.")
            y -= 105 * mm
        y = table(c, media_rows(local), x, y, [38 * mm, 42 * mm, 35 * mm, width - 115 * mm], 7.2, 10 * mm)
        return

    if doc_id == "DOC-MEDICAL-FORENSIC":
        topics = [
            ("Emergency department triage", "Daniel Okeke attended at 22:18 on 3 June 2026 with a penetrating injury to the left upper abdomen. Observations and analgesia are recorded."),
            ("Emergency treatment chronology", "Assessment, imaging, antibiotics and surgical referral are time-stamped. The record does not identify an assailant."),
            ("Operation note extract", "Wound exploration and repair are described. The note records anatomy and treatment, not the intention of any other person."),
            ("Inpatient and discharge record", "Recovery observations, advice and follow-up are limited to clinically relevant entries."),
            ("Dr Maya Venn - factual statement", "Dr Venn records examination and treatment from clinical notes. She does not express an opinion on who caused the injury."),
            ("Forensic medical report", "The injury is compatible with a sharp implement but no specific recovered item can be identified from the wound alone."),
            ("Forensic limitations", "Medical findings support injury. They do not establish identity, participation, message authorship or intent."),
            ("Medical exhibit and source index", "Clinical extracts, imaging report and statement references are reconciled with service dates and redactions."),
        ]
        head, text = topics[local - 1]
        y = section(c, head, x, y, width)
        y = paragraph(c, text, x, y, width, 9.8, 13)
        if local in {1, 3, 5, 6, 7}:
            injury_diagram(c, x + 25 * mm, y - 105 * mm, 75 * mm, 90 * mm)
            y -= 115 * mm
        y = table(c, medical_rows(local), x, y, [36 * mm, 38 * mm, 50 * mm, width - 124 * mm], 7.0, 10 * mm)
        if local in {5, 6, 7}:
            signature(c, x, 24 * mm, "Dr Maya Venn")
        return

    if doc_id == "DOC-PHONE-ATTRIBUTION":
        topics = [
            ("Instruction and device receipt", "A black handset was seized from a coat associated with Malik Hassan. Exhibit and device ownership remain separate propositions."),
            ("Acquisition and integrity", "Read-only extraction completed with tool version 9.4. Native container and report hashes are recorded."),
            ("Handset and SIM attribution", "Subscriber and device records show mixed identifiers. Registration does not establish the user at each event."),
            ("Account association", "The account name 'northline_mh' appears on the device and has prior association material. Association is not authorship."),
            ("Message schedule", "Selected messages concern meeting near Merton Parade. The schedule records account and device source, not the human author."),
            ("Location and time", "Cell and application timestamps are reported with timezone. They place a device in an area, not necessarily a person at a precise point."),
            ("Limitations and service reconciliation", "Handset ownership, account association and message authorship are separately stated. This report was served; a later chase uses an alias title."),
        ]
        head, text = topics[local - 1]
        y = section(c, head, x, y, width)
        y = paragraph(c, text, x, y, width, 9.5, 13)
        rows = [["Event / item", "Source", "Time / ID", "Attribution state"]]
        for i in range(9):
            rows.append([f"{head.split()[0]}-{local:02d}-{i+1:02d}", ["Handset","SIM","Account","Message","Cell event"][i%5], f"2026-06-03 21:{25+i*2:02d}" if i < 9 else "", ["Device record","Subscriber record","Associated account","Author unknown","Area-level"][i%5]])
        y = table(c, rows, x, y - 5 * mm, [40 * mm, 32 * mm, 52 * mm, width - 124 * mm], 7.0, 8.5 * mm)
        y -= 5 * mm
        y = paragraph(c, "Caution: the material does not by itself establish that Malik Hassan authored each message.", x, y, width, 9, 12, "Helvetica-Bold", colors.HexColor("#8D2E2E"))
        return

    if doc_id == "DOC-DISCLOSURE-CORRESPONDENCE":
        topics = [
            ("Secure email - CPS to defence, 27 June 2026", "Subject: Further disclosure. The email says 'Please find attached the premises CCTV master export and updated schedule.' No attachment accompanies the email in the served bundle."),
            ("Defence chase - 29 June 2026", "The defence requests the attachment referred to in the 27 June email and confirmation whether the master export has ever been supplied."),
            ("Defence chase - 1 July 2026", "The defence asks for the 'downloaded handset data report'. The served telephone extraction and attribution report appears to be the same material under a different title and requires reconciliation."),
            ("CPS response - 3 July 2026", "CPS confirms that CCTV clips were served but the master export remains awaited. It identifies the handset alias and provides a service receipt for the existing phone report."),
        ]
        head, text = topics[local - 1]
        y = section(c, head, x, y, width)
        y = table(c, [["From", "secure.caseworker@northgate-cps.invalid"], ["To", "defence.team@ward-solicitors.invalid"], ["Matter", f"R v Hassan and Price / {CASE_REF}"], ["Classification", "OFFICIAL - LEGALLY PRIVILEGED WHERE MARKED"]], x, y, [38 * mm, width - 38 * mm], 8, 9 * mm)
        y -= 8 * mm
        y = paragraph(c, text, x, y, width, 10, 14)
        y -= 12 * mm
        if local == 1:
            c.setFillColor(colors.HexColor("#F3E5C8"))
            c.roundRect(x, y - 18 * mm, width, 18 * mm, 2 * mm, fill=1, stroke=0)
            c.setFillColor(colors.HexColor("#7A4D00"))
            c.setFont("Helvetica-Bold", 10)
            c.drawString(x + 4 * mm, y - 8 * mm, "Attachment panel: no file present in this served copy")
        if local == 3:
            stamp(c, x + 70 * mm, y - 25 * mm, "ALIAS REQUIRES RECONCILIATION")
        return

    if doc_id == "DOC-HEARING-NOTICE-PTPH":
        if local == 1:
            y = section(c, "Notice of Plea and Trial Preparation Hearing", x, y, width)
            rows = [["Case", CASE_REF], ["Defendants", "Malik Hassan; Jordan Price"], ["Hearing", "Plea and Trial Preparation Hearing"], ["Date", "14 September 2026"], ["Time", "10:00"], ["Courtroom", "Court 3 - Northgate Crown Court"], ["Attendance", "Defendants and representatives as directed"], ["Issued", "3 July 2026 by Northgate Crown Court"]]
            y = table(c, [["Field", "Court record"]] + rows, x, y, [42 * mm, width - 42 * mm], 8.5, 10 * mm)
            stamp(c, w - 78 * mm, y - 18 * mm, "COURT NOTICE - LATEST")
        else:
            y = section(c, "Case-management directions accompanying notice", x, y, width)
            rows = [["Direction", "Responsible party", "Date / state"], ["Confirm pleas and count positions", "Both defence teams", "At PTPH"], ["Identify witness requirements", "All parties", "7 Sep 2026"], ["Identify disclosure issues", "CPS / defence", "Before PTPH"], ["Confirm media playback needs", "CPS", "7 Sep 2026"], ["Serve expert issue note", "Parties if relied upon", "As directed"], ["Earlier listing entry", "Case record", "28 Aug 2026 at 14:00 superseded"]]
            y = table(c, rows, x, y, [width * .45, width * .28, width * .27], 8, 10 * mm)
            y -= 8 * mm
            y = paragraph(c, "This court notice is the latest listing source in the served papers. The older MG5 entry remains in the bundle to explain the discrepancy.", x, y, width, 9.5, 13)
            signature(c, x, y - 15 * mm, "Court Officer")
        return

    raise RuntimeError(f"Unhandled document page: {doc_id}")


def generate_source_documents(truth: dict) -> list[dict]:
    manifest = []
    for doc in DOCS:
        doc_id, title, filename, start, end, org = doc
        path = SOURCES / filename
        first_size = page_size_for(doc_id, 1)
        c = canvas.Canvas(str(path), pagesize=first_size, pageCompression=1)
        c.setTitle(title)
        c.setAuthor("Northgate case papers")
        c.setSubject(f"R v Hassan and Price - {CASE_REF}")
        c.setCreator("Controlled document preparation")
        for local in range(1, end - start + 2):
            size = page_size_for(doc_id, local)
            c.setPageSize(size)
            render_page(c, doc, local, truth)
            c.showPage()
        c.save()
        pages = len(PdfReader(str(path)).pages)
        expected = end - start + 1
        if pages != expected:
            raise RuntimeError(f"{filename} pages={pages}, expected={expected}")
        manifest.append({
            "sourceDocumentId": doc_id,
            "title": title,
            "filename": filename,
            "compiledStart": start,
            "compiledEnd": end,
            "pageCount": pages,
            "sha256": sha256(path),
        })
    return manifest


def compile_bundle(source_manifest: list[dict]) -> Path:
    out = OUT / "malik-price-compiled-150-page-bundle.pdf"
    writer = PdfWriter()
    for item in source_manifest:
        reader = PdfReader(str(SOURCES / item["filename"]))
        for page in reader.pages:
            writer.add_page(page)
    writer.add_metadata({
        "/Title": "R v Malik Hassan and Jordan Price - Prosecution Case Papers",
        "/Author": "Northgate case papers",
        "/Subject": "Plea and Trial Preparation Hearing",
        "/Keywords": "criminal case papers; Crown Court; disclosure",
    })
    with out.open("wb") as f:
        writer.write(f)
    if len(PdfReader(str(out)).pages) != 150:
        raise RuntimeError("Compiled PDF is not 150 pages")
    return out


def write_reference_register() -> None:
    records = []
    for doc_id, title, filename, start, end, org in DOCS:
        records.append({
            "sourceDocumentId": doc_id,
            "title": title,
            "filename": filename,
            "structureReferenceCategory": org,
            "references": [{"title": t, "url": u, "accessDate": ACCESS_DATE} for t, u in REFERENCES[org]],
            "useBoundary": "Public structure and field conventions only; no real-case facts or copyrighted narrative copied.",
        })
    (OUT / "public-template-reference-register.json").write_text(json.dumps({"accessDate": ACCESS_DATE, "documents": records}, indent=2), encoding="utf-8")


def leakage_scan(pdf: Path) -> dict:
    reader = PdfReader(str(pdf))
    text = "\n".join((page.extract_text() or "") for page in reader.pages)
    metadata_text = " ".join(str(v) for v in (reader.metadata or {}).values())
    blocked = [
        "TRAP-", "RF-", "COUNT_", "DOC-", "truth key", "truth-key", "expected answer",
        "forbidden conclusion", "hard fail", "fixture", "developer", "programme pass",
        "Brain 1", "Guardian", "Phase 11", "holdout", "gold key", "scoring material",
    ]
    hits = []
    hay = (text + "\n" + metadata_text).lower()
    for term in blocked:
        if term.lower() in hay:
            hits.append(term)
    return {
        "pdf": pdf.name,
        "pageCount": len(reader.pages),
        "extractedCharacters": len(text),
        "blockedMarkers": blocked,
        "hits": hits,
        "passed": not hits,
        "chargeWordingAllowlistNote": "Names, dates, charge wording and ordinary case facts legitimately overlap with the external truth material and are not internal-marker leakage.",
        "hiddenTextControl": "All page text was generated as visible page content. No annotations, attachments, JavaScript, layers or invisible scoring text were added.",
    }


def main() -> None:
    state = verify_blueprint()
    reset_output()
    source_manifest = generate_source_documents(state["truth"])
    compiled = compile_bundle(source_manifest)
    blinded = INGESTION / "malik-price-blinded-ingestion.pdf"
    shutil.copyfile(compiled, blinded)
    write_reference_register()

    register = {
        "pilot": "rank-1 Malik-Price heavy-bundle engineering pilot",
        "blueprintVersion": "v1.1",
        "blueprintFreezeSha256": EXPECTED_FREEZE,
        "authoritativePagination": "compiled PDF pages",
        "compiledPageCount": 150,
        "continuousFrom": 1,
        "continuousTo": 150,
        "noGaps": True,
        "noOverlaps": True,
        "sources": source_manifest,
    }
    (OUT / "source-document-to-compiled-page-register.json").write_text(json.dumps(register, indent=2), encoding="utf-8")

    hashes = [{"path": str((SOURCES / x["filename"]).relative_to(ROOT)).replace("\\", "/"), "sha256": x["sha256"], "bytes": (SOURCES / x["filename"]).stat().st_size} for x in source_manifest]
    for path in [compiled, blinded]:
        hashes.append({"path": str(path.relative_to(ROOT)).replace("\\", "/"), "sha256": sha256(path), "bytes": path.stat().st_size})
    (OUT / "hash-manifest.json").write_text(json.dumps({"algorithm": "SHA-256", "files": hashes}, indent=2), encoding="utf-8")

    blind = leakage_scan(blinded)
    (OUT / "blinding-and-leakage-scan-report.json").write_text(json.dumps(blind, indent=2), encoding="utf-8")
    ingestion_manifest = {
        "files": [{"filename": blinded.name, "sha256": sha256(blinded), "bytes": blinded.stat().st_size, "pages": 150}],
        "excluded": ["frozen blueprint", "truth key", "conflict table", "acceptance matrix", "expected findings", "scoring material", "sealed holdouts", "generation and QA reports"],
        "scanPassed": blind["passed"],
    }
    (OUT / "blinded-ingestion-manifest.json").write_text(json.dumps(ingestion_manifest, indent=2), encoding="utf-8")

    generation = {
        "generatedAt": f"{ACCESS_DATE} Europe/London",
        "blueprintFreeze": EXPECTED_FREEZE,
        "frozenBlueprintFileHashesBeforeGeneration": state["frozen_hashes"],
        "sourceDocuments": len(source_manifest),
        "compiledPages": 150,
        "chargePolicy": "Exact frozen specimen wording used in amended indictment; original indictment differs only by the defined 1 June date conflict.",
        "countAllocation": {"robbery": ["Malik Hassan", "Jordan Price"], "section18": ["Malik Hassan"], "section139": ["Jordan Price"]},
        "count3Controls": ["locking knife retained", "no 'without good reason or lawful authority' text added to particulars"],
        "messyVariantControlsNotIntroduced": ["OCR deterioration", "page disorder", "hidden-text injection", "password/corrupt/polyglot/archive/parser attacks"],
        "legalApprovalClaimed": False,
        "programmePassClaimed": False,
    }
    (OUT / "generation-manifest.json").write_text(json.dumps(generation, indent=2), encoding="utf-8")
    print(json.dumps({"output": str(OUT), "sources": len(source_manifest), "pages": 150, "compiledSha256": sha256(compiled), "blindingPassed": blind["passed"]}, indent=2))


if __name__ == "__main__":
    main()
