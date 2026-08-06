from __future__ import annotations

import hashlib
import json
import re
from collections import Counter
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageStat
from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "output" / "pdf" / "malik-price-150-page"
PDF = OUT / "malik-price-compiled-150-page-bundle.pdf"
BLINDED = OUT / "ingestion" / "malik-price-blinded-ingestion.pdf"
RENDERS = OUT / "qa" / "page-renders"
CONTACTS = OUT / "qa" / "contact-sheets"
REGISTER = OUT / "source-document-to-compiled-page-register.json"
HASHES = OUT / "hash-manifest.json"
BLUEPRINT = ROOT / "docs" / "controlled-pdf-pilots" / "malik-price-150-page"
EXPECTED_FREEZE = "75b4df080358baa20bd44a80344dff181e6cb623981bed69f192d133e992773e"


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def normalized(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def inspect_pdf() -> tuple[list[dict], list[str]]:
    errors: list[str] = []
    reader = PdfReader(str(PDF))
    blind_reader = PdfReader(str(BLINDED))
    if len(reader.pages) != 150 or len(blind_reader.pages) != 150:
        errors.append("compiled or blinded page count is not 150")
    if sha256(PDF) != sha256(BLINDED):
        errors.append("blinded ingestion PDF differs from QA-reviewed compiled PDF")

    register = json.loads(REGISTER.read_text(encoding="utf-8"))
    if len(register["sources"]) != 21:
        errors.append("source register does not contain 21 documents")
    expected_page = 1
    for source in register["sources"]:
        if source["compiledStart"] != expected_page:
            errors.append(f"gap/overlap before {source['filename']}")
        if source["compiledEnd"] - source["compiledStart"] + 1 != source["pageCount"]:
            errors.append(f"page-count mismatch for {source['filename']}")
        expected_page = source["compiledEnd"] + 1
        path = OUT / "source-documents" / source["filename"]
        if not path.exists() or sha256(path) != source["sha256"]:
            errors.append(f"source hash mismatch for {source['filename']}")
    if expected_page != 151:
        errors.append("source page register does not end at 150")

    hash_manifest = json.loads(HASHES.read_text(encoding="utf-8"))
    for item in hash_manifest["files"]:
        path = ROOT / item["path"]
        if not path.exists() or sha256(path) != item["sha256"] or path.stat().st_size != item["bytes"]:
            errors.append(f"hash manifest mismatch: {item['path']}")

    renders = sorted(RENDERS.glob("page-*.png"))
    if len(renders) != 150:
        errors.append(f"render count {len(renders)} is not 150")
    render_hashes: set[str] = set()
    text_hashes: Counter[str] = Counter()
    pages: list[dict] = []
    full_text: list[str] = []
    for i, page in enumerate(reader.pages, 1):
        text = page.extract_text() or ""
        full_text.append(text)
        ntext = normalized(text)
        text_hash = hashlib.sha256(ntext.encode("utf-8")).hexdigest()
        text_hashes[text_hash] += 1
        expected_footer = f"COMPILED PAGE {i} OF 150"
        footer_ok = expected_footer in ntext
        if not footer_ok:
            errors.append(f"page {i}: compiled footer missing")
        if i == 97 and "Recording served / transcript incomplete" not in ntext:
            errors.append("page 97: transcript-incomplete control missing")

        render = renders[i - 1] if i <= len(renders) else None
        if render is None:
            continue
        rhash = sha256(render)
        if rhash in render_hashes:
            errors.append(f"page {i}: exact duplicate render")
        render_hashes.add(rhash)
        with Image.open(render) as im:
            rgb = im.convert("RGB")
            gray = rgb.convert("L")
            hist = gray.histogram()
            dark = sum(hist[:220])
            total = rgb.width * rgb.height
            dark_ratio = dark / total
            # Inspect side and bottom edges for unintended dark clipping. The top
            # edge intentionally carries a full-width professional header.
            px = gray.load()
            # Ignore the top professional header, which deliberately reaches both
            # side edges. Body content must retain side margins below it.
            # Header height is a fixed physical band; in landscape renders it
            # occupies a larger percentage of image height than in portrait.
            header_cutoff = int(gray.height * (0.095 if gray.width > gray.height else 0.075))
            side_dark = sum(1 for y in range(header_cutoff, gray.height) if px[0, y] < 150 or px[gray.width - 1, y] < 150)
            bottom_dark = sum(1 for x in range(gray.width) if px[x, gray.height - 1] < 150)
            edge_ok = side_dark == 0 and bottom_dark == 0
            if not edge_ok:
                errors.append(f"page {i}: dark content touches side/bottom edge")
            density_ok = 0.003 <= dark_ratio <= 0.38
            if not density_ok:
                errors.append(f"page {i}: render density outside controlled range ({dark_ratio:.4f})")
            text_ok = len(ntext) >= (100 if i in {1, 97} else 180)
            if not text_ok:
                errors.append(f"page {i}: extracted text unexpectedly sparse ({len(ntext)})")
            pages.append({
                "compiledPage": i,
                "render": str(render.relative_to(ROOT)).replace("\\", "/"),
                "renderSha256": rhash,
                "pixels": [rgb.width, rgb.height],
                "renderSuccess": True,
                "textCharacters": len(ntext),
                "darkPixelRatio": round(dark_ratio, 6),
                "footerPresent": footer_ok,
                "edgeClippingDetected": not edge_ok,
                "densityInRange": density_ok,
            })

    joined = normalized("\n".join(full_text))
    truth = json.loads((BLUEPRINT / "truth-key.json").read_text(encoding="utf-8"))
    for charge in truth["specimenCharges"]["counts"]:
        if normalized(charge["specimenWording"]) not in joined:
            errors.append(f"exact amended charge wording not found: {charge['countId']}")
    if "locking knife" not in joined:
        errors.append("locking knife wording missing")
    if "without good reason or lawful authority" in joined.lower():
        errors.append("forbidden Count 3 defence phrase appears in generated PDF")
    if "Malik Hassan and Jordan Price" not in joined:
        errors.append("joint robbery defendant allocation missing")
    if "Wounding with intent" not in joined or "Malik Hassan" not in joined:
        errors.append("Malik section 18 presentation missing")
    if "Jordan Price" not in joined or "Having an article with a blade or point" not in joined:
        errors.append("Price section 139 presentation missing")
    if "28 August 2026" not in joined or "14 September 2026" not in joined:
        errors.append("hearing-date conflict not represented")
    if "1 June 2026" not in joined or "3 June 2026" not in joined:
        errors.append("indictment date conflict not represented")
    blocked = ["TRAP-", "RF-", "COUNT_", "DOC-", "truth key", "truth-key", "expected answer", "fixture", "developer", "hard fail", "forbidden conclusion", "Brain 1", "Guardian", "Phase 11", "holdout"]
    for marker in blocked:
        if marker.lower() in joined.lower():
            errors.append(f"internal marker leaked: {marker}")
    if any(count > 1 for count in text_hashes.values()):
        errors.append("exact duplicate extracted page text detected")
    return pages, errors


def build_contact_sheets(pages: list[dict]) -> list[str]:
    CONTACTS.mkdir(parents=True, exist_ok=True)
    for old in CONTACTS.glob("*.png"):
        old.unlink()
    render_paths = [ROOT / p["render"] for p in pages]
    out_paths: list[str] = []
    per_sheet = 15
    thumb_w, thumb_h = 240, 340
    margin, label_h = 18, 24
    cols, rows = 5, 3
    font = ImageFont.load_default()
    for sheet_no in range((len(render_paths) + per_sheet - 1) // per_sheet):
        sheet = Image.new("RGB", (cols * (thumb_w + margin) + margin, rows * (thumb_h + label_h + margin) + margin), "white")
        draw = ImageDraw.Draw(sheet)
        subset = render_paths[sheet_no * per_sheet:(sheet_no + 1) * per_sheet]
        for j, path in enumerate(subset):
            with Image.open(path) as src:
                page = src.convert("RGB")
                page.thumbnail((thumb_w, thumb_h))
                x = margin + (j % cols) * (thumb_w + margin)
                y = margin + (j // cols) * (thumb_h + label_h + margin)
                sheet.paste(page, (x + (thumb_w - page.width) // 2, y))
                compiled = sheet_no * per_sheet + j + 1
                draw.rectangle((x, y, x + thumb_w, y + thumb_h), outline="#455A64", width=1)
                draw.text((x, y + thumb_h + 4), f"Compiled page {compiled}", fill="black", font=font)
        path = CONTACTS / f"contact-sheet-{sheet_no+1:02d}-pages-{sheet_no*per_sheet+1:03d}-{sheet_no*per_sheet+len(subset):03d}.png"
        sheet.save(path, optimize=True)
        out_paths.append(str(path.relative_to(ROOT)).replace("\\", "/"))
    return out_paths


def main() -> None:
    pages, errors = inspect_pdf()
    contacts = build_contact_sheets(pages)
    report = {
        "pilot": "rank-1 Malik-Price heavy-bundle engineering pilot",
        "blueprintFreezeSha256": EXPECTED_FREEZE,
        "inspectionType": "automated page-level render/content QA plus contact-sheet visual inspection pending",
        "compiledPdf": str(PDF.relative_to(ROOT)).replace("\\", "/"),
        "compiledPdfSha256": sha256(PDF),
        "pageCount": len(pages),
        "sourceCount": 21,
        "checks": {
            "renderSuccessEveryPage": len(pages) == 150 and all(p["renderSuccess"] for p in pages),
            "continuousPagination": not any("gap/overlap" in e for e in errors),
            "compiledFooterEveryPage": all(p["footerPresent"] for p in pages),
            "noSideOrBottomClipping": all(not p["edgeClippingDetected"] for p in pages),
            "densityInRangeEveryPage": all(p["densityInRange"] for p in pages),
            "noExactDuplicatePages": not any("duplicate" in e for e in errors),
            "chargeLockChecks": not any("charge" in e.lower() or "count 3" in e.lower() for e in errors),
            "internalLanguageLeakage": not any("internal marker" in e for e in errors),
        },
        "errors": errors,
        "automatedPass": not errors,
        "contactSheets": contacts,
        "pages": pages,
        "humanSolicitorReviewClaimed": False,
    }
    (OUT / "page-level-visual-qa-report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    summary = [
        "# Malik-Price page-level visual QA",
        "",
        f"- Compiled PDF: `{report['compiledPdf']}`",
        f"- SHA-256: `{report['compiledPdfSha256']}`",
        f"- Pages rendered and checked: **{len(pages)} / 150**",
        f"- Contact sheets: **{len(contacts)}**",
        f"- Automated errors: **{len(errors)}**",
        f"- Automated pass before visual contact-sheet review: **{report['automatedPass']}**",
        "- This is engineering QA, not human solicitor or qualified legal review.",
        "",
        "## Checks",
    ]
    for key, value in report["checks"].items():
        summary.append(f"- {key}: **{value}**")
    if errors:
        summary.extend(["", "## Errors", *[f"- {e}" for e in errors]])
    (OUT / "page-level-visual-qa-report.md").write_text("\n".join(summary) + "\n", encoding="utf-8")
    print(json.dumps({"pages": len(pages), "errors": errors[:30], "errorCount": len(errors), "contactSheets": len(contacts)}, indent=2))


if __name__ == "__main__":
    main()
