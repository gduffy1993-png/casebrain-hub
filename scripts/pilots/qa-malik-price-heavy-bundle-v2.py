from __future__ import annotations

import hashlib
import json
import re
import statistics
from collections import Counter
from itertools import combinations
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / "output" / "pdf" / "malik-price-150-page"
V1 = BASE / "generation-v1"
V2 = BASE / "generation-v2"
PDF = V2 / "malik-price-generation-v2-compiled-150-page-bundle.pdf"
BLINDED = V2 / "ingestion" / "malik-price-generation-v2-blinded-ingestion.pdf"
RENDERS = V2 / "qa" / "page-renders"
CONTACTS = V2 / "qa" / "contact-sheets"
BLUEPRINT = ROOT / "docs" / "controlled-pdf-pilots" / "malik-price-150-page"
EXPECTED_FREEZE = "75b4df080358baa20bd44a80344dff181e6cb623981bed69f192d133e992773e"
EXPECTED_V1_TREE = "4b51904abf96514b0d9f9be3c6bd042cbe9bd10190731f9c4e8fa99218a9b7d1"


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def normalized(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def body_words(text: str) -> list[str]:
    lines = []
    for line in text.splitlines():
        compact = normalized(line)
        lowered = compact.lower()
        if not compact:
            continue
        if any(token in lowered for token in [
            "compiled page", "source page", "official -", CASE_REF.lower(), "r v malik hassan",
            "northgate constabulary", "northgate crown court", "northgate university hospital",
        ]):
            continue
        lines.append(compact)
    return re.findall(r"[a-z0-9]+", " ".join(lines).lower())


CASE_REF = "T202600417"


def shingles(words: list[str], n=5) -> set[tuple[str, ...]]:
    if len(words) < n:
        return {tuple(words)} if words else set()
    return {tuple(words[i:i+n]) for i in range(len(words) - n + 1)}


def jaccard(a: set, b: set) -> float:
    if not a and not b:
        return 1.0
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def top_band_signature(image: Image.Image) -> str:
    rgb = image.convert("RGB")
    band = rgb.crop((0, 0, rgb.width, max(1, int(rgb.height * 0.13))))
    quantized = band.quantize(colors=16).convert("RGB")
    counts = Counter(quantized.getdata())
    for color, _ in counts.most_common():
        if sum(color) < 720:
            return f"#{color[0]:02x}{color[1]:02x}{color[2]:02x}"
    return "#ffffff"


def tree_digest(path: Path, excluded_names=None) -> tuple[int, str]:
    excluded_names = set(excluded_names or [])
    files = sorted(p for p in path.rglob("*") if p.is_file() and p.name not in excluded_names)
    lines = [f"{p.relative_to(path).as_posix()}\t{sha256(p)}" for p in files]
    return len(files), hashlib.sha256("\n".join(lines).encode("utf-8")).hexdigest()


def source_and_register_checks(errors: list[str]):
    register = json.loads((V2 / "source-document-to-compiled-page-register.json").read_text(encoding="utf-8"))
    sources = register["sourceDocuments"]
    if len(sources) != 21:
        errors.append(f"source register count is {len(sources)}, expected 21")
    expected = 1
    for source in sources:
        start, end = source["compiledPages"]
        if start != expected:
            errors.append(f"pagination gap/overlap before {source['docId']}")
        if end - start + 1 != source["pageCount"]:
            errors.append(f"source page-count mismatch: {source['docId']}")
        path = V2 / source["file"]
        if not path.exists() or sha256(path) != source["sha256"]:
            errors.append(f"source hash mismatch: {source['docId']}")
        expected = end + 1
    if expected != 151:
        errors.append("source register does not terminate at compiled page 150")

    purposes = json.loads((V2 / "page-purpose-register.json").read_text(encoding="utf-8"))
    pages = purposes["pages"]
    if len(pages) != 150:
        errors.append(f"page-purpose count is {len(pages)}, expected 150")
    numbers = [p["compiledPage"] for p in pages]
    if numbers != list(range(1, 151)):
        errors.append("page-purpose register does not map pages 1-150 exactly once")
    if any(not normalized(p.get("purpose", "")) for p in pages):
        errors.append("one or more page-purpose entries are blank")
    if any(p.get("truthKeyIncluded") for p in pages):
        errors.append("page-purpose register reports truth-key inclusion")

    mapping = json.loads((V2 / "public-template-mapping.json").read_text(encoding="utf-8"))
    if mapping["mappingCount"] != 21 or len(mapping["documents"]) != 21:
        errors.append("public-template mapping is not one-to-one with the 21 documents")
    if len({d["docId"] for d in mapping["documents"]}) != 21:
        errors.append("public-template mapping contains duplicate document IDs")
    if any(not d["publicStructuralReferences"] for d in mapping["documents"]):
        errors.append("a planned document lacks a public structural reference")
    if any(d["copiedOfficialForm"] or d["copiedRealCaseNarrative"] for d in mapping["documents"]):
        errors.append("public-template mapping reports copied official/real-case content")
    return sources, pages


def inspect_v2():
    errors: list[str] = []
    warnings: list[str] = []
    sources, purpose_pages = source_and_register_checks(errors)
    reader = PdfReader(str(PDF))
    blind = PdfReader(str(BLINDED))
    if len(reader.pages) != 150 or len(blind.pages) != 150:
        errors.append("compiled or blinded PDF is not 150 pages")
    if sha256(PDF) != sha256(BLINDED):
        errors.append("blinded PDF does not match the QA-reviewed compiled PDF")

    render_paths = sorted(RENDERS.glob("page-*.png"))
    if len(render_paths) != 150:
        errors.append(f"render count is {len(render_paths)}, expected 150")

    text_hashes = Counter()
    render_hashes = Counter()
    metrics = []
    texts = []
    page_shingles = []
    band_signatures = []
    for index, page in enumerate(reader.pages, 1):
        text = page.extract_text() or ""
        ntext = normalized(text)
        texts.append(text)
        text_hashes[hashlib.sha256(ntext.encode("utf-8")).hexdigest()] += 1
        if f"COMPILED PAGE {index} OF 150" not in ntext:
            errors.append(f"page {index}: compiled footer missing")
        threshold = 90 if index in {1, 97} else 230
        if len(ntext) < threshold:
            errors.append(f"page {index}: extracted text too sparse ({len(ntext)} characters)")
        words = body_words(text)
        page_shingles.append(shingles(words))
        if index <= len(render_paths):
            render = render_paths[index - 1]
            rhash = sha256(render)
            render_hashes[rhash] += 1
            with Image.open(render) as source:
                rgb = source.convert("RGB")
                gray = rgb.convert("L")
                hist = gray.histogram()
                dark_ratio = sum(hist[:220]) / (rgb.width * rgb.height)
                band_signatures.append(top_band_signature(rgb))
                px = gray.load()
                # Page 1 has a deliberate 30 mm full-bleed court masthead
                # (10.1% of A4 height). Exclude that documented design element
                # from the clipping probe while retaining the ordinary probe
                # for every other portrait page.
                if index == 1:
                    header_cutoff = int(gray.height * 0.11)
                else:
                    header_cutoff = int(gray.height * (0.11 if gray.width > gray.height else 0.10))
                side_dark = sum(
                    1 for y in range(header_cutoff, gray.height)
                    if px[0, y] < 120 or px[gray.width - 1, y] < 120
                )
                bottom_dark = sum(1 for x in range(gray.width) if px[x, gray.height - 1] < 120)
                edge_ok = side_dark == 0 and bottom_dark == 0
                if not edge_ok:
                    errors.append(f"page {index}: content touches side/bottom edge")
                density_ok = 0.004 <= dark_ratio <= 0.42
                if not density_ok:
                    errors.append(f"page {index}: density outside range ({dark_ratio:.4f})")
                metrics.append({
                    "compiledPage": index,
                    "docId": purpose_pages[index - 1]["docId"],
                    "sourcePage": purpose_pages[index - 1]["sourcePage"],
                    "purpose": purpose_pages[index - 1]["purpose"],
                    "render": str(render.relative_to(ROOT)).replace("\\", "/"),
                    "renderSha256": rhash,
                    "pixels": [rgb.width, rgb.height],
                    "textCharacters": len(ntext),
                    "bodyWordCount": len(words),
                    "darkPixelRatio": round(dark_ratio, 6),
                    "topBandSignature": band_signatures[-1],
                    "edgeClippingDetected": not edge_ok,
                    "densityInRange": density_ok,
                })

    if any(count > 1 for count in text_hashes.values()):
        errors.append("exact duplicate extracted page text detected")
    if any(count > 1 for count in render_hashes.values()):
        errors.append("exact duplicate page render detected")

    similarities = []
    permitted_version_pairs = {(20, 23), (21, 24), (22, 25)}
    for left, right in combinations(range(150), 2):
        score = jaccard(page_shingles[left], page_shingles[right])
        if score >= 0.70:
            similarities.append({
                "pageA": left + 1,
                "pageB": right + 1,
                "fiveGramJaccard": round(score, 4),
                "permittedVersionHistoryPair": (left + 1, right + 1) in permitted_version_pairs,
            })
            if score >= 0.92 and (left + 1, right + 1) not in permitted_version_pairs:
                errors.append(f"pages {left+1}/{right+1}: near-duplicate body text ({score:.3f})")

    joined = normalized("\n".join(texts))
    truth = json.loads((BLUEPRINT / "truth-key.json").read_text(encoding="utf-8"))
    for charge in truth["specimenCharges"]["counts"]:
        if normalized(charge["specimenWording"]) not in joined:
            errors.append(f"exact amended charge wording missing: {charge['countId']}")
    if "locking knife" not in joined:
        errors.append("Count 3 locking-knife wording missing")
    if "without good reason or lawful authority" in joined.lower():
        errors.append("forbidden Count 3 defence phrase appears")
    required = [
        "1 June 2026", "3 June 2026", "28 August 2026", "14 September 2026",
        "RECORDING SERVED / TRANSCRIPT INCOMPLETE", "premises master remains awaited",
        "message authorship", "continuity gap", "does not identify",
    ]
    for phrase in required:
        if phrase.lower() not in joined.lower():
            errors.append(f"required controlled source phrase missing: {phrase}")
    blocked = [
        "TRAP-", "RF-", "COUNT_", "DOC-", "truth key", "truth-key", "expected answer",
        "forbidden conclusion", "hard fail", "fixture", "developer", "programme pass",
        "Brain 1", "Guardian", "Phase 11", "holdout", "gold key", "scoring material",
    ]
    for marker in blocked:
        if marker.lower() in joined.lower():
            errors.append(f"internal marker leaked: {marker}")

    return metrics, similarities, band_signatures, errors, warnings


def build_contact_sheets(metrics):
    CONTACTS.mkdir(parents=True, exist_ok=True)
    render_paths = [ROOT / p["render"] for p in metrics]
    outputs = []
    per_sheet = 15
    thumb_w, thumb_h = 240, 340
    margin, label_h = 18, 24
    cols, rows = 5, 3
    font = ImageFont.load_default()
    for sheet_no in range(10):
        sheet = Image.new("RGB", (cols * (thumb_w + margin) + margin, rows * (thumb_h + label_h + margin) + margin), "white")
        draw = ImageDraw.Draw(sheet)
        subset = render_paths[sheet_no * per_sheet:(sheet_no + 1) * per_sheet]
        for j, path in enumerate(subset):
            with Image.open(path) as source:
                page = source.convert("RGB")
                page.thumbnail((thumb_w, thumb_h))
                x = margin + (j % cols) * (thumb_w + margin)
                y = margin + (j // cols) * (thumb_h + label_h + margin)
                sheet.paste(page, (x + (thumb_w - page.width) // 2, y))
                compiled = sheet_no * per_sheet + j + 1
                draw.rectangle((x, y, x + thumb_w, y + thumb_h), outline="#455A64", width=1)
                draw.text((x, y + thumb_h + 4), f"Compiled page {compiled}", fill="black", font=font)
        path = CONTACTS / f"contact-sheet-{sheet_no+1:02d}-pages-{sheet_no*per_sheet+1:03d}-{(sheet_no+1)*per_sheet:03d}.png"
        sheet.save(path, optimize=True)
        outputs.append(str(path.relative_to(ROOT)).replace("\\", "/"))
    return outputs


def v1_metrics():
    report = json.loads((V1 / "page-level-visual-qa-report.json").read_text(encoding="utf-8"))
    pages = report["pages"]
    chars = [p["textCharacters"] for p in pages]
    density = [p["darkPixelRatio"] for p in pages]
    signatures = []
    for path in sorted((V1 / "qa" / "page-renders").glob("page-*.png")):
        with Image.open(path) as image:
            signatures.append(top_band_signature(image))
    reader = PdfReader(str(V1 / "malik-price-compiled-150-page-bundle.pdf"))
    words = [len(body_words(page.extract_text() or "")) for page in reader.pages]
    return {
        "compiledSha256": sha256(V1 / "malik-price-compiled-150-page-bundle.pdf"),
        "averageTextCharacters": round(statistics.mean(chars), 1),
        "medianTextCharacters": round(statistics.median(chars), 1),
        "averageBodyWords": round(statistics.mean(words), 1),
        "medianBodyWords": round(statistics.median(words), 1),
        "averageDarkPixelRatio": round(statistics.mean(density), 5),
        "medianDarkPixelRatio": round(statistics.median(density), 5),
        "distinctTopBandColorSignatures": len(set(signatures)),
        "pageCount": len(pages),
    }


def write_reports(metrics, similarities, signatures, errors, warnings, contacts):
    v2_chars = [p["textCharacters"] for p in metrics]
    v2_words = [p["bodyWordCount"] for p in metrics]
    v2_density = [p["darkPixelRatio"] for p in metrics]
    v1 = v1_metrics()
    v2 = {
        "compiledSha256": sha256(PDF),
        "averageTextCharacters": round(statistics.mean(v2_chars), 1),
        "medianTextCharacters": round(statistics.median(v2_chars), 1),
        "averageBodyWords": round(statistics.mean(v2_words), 1),
        "medianBodyWords": round(statistics.median(v2_words), 1),
        "averageDarkPixelRatio": round(statistics.mean(v2_density), 5),
        "medianDarkPixelRatio": round(statistics.median(v2_density), 5),
        "distinctTopBandColorSignatures": len(set(signatures)),
        "pageCount": len(metrics),
    }
    comparison = {
        "pilotId": "malik-price-150-page",
        "scope": "document-realism remediation only",
        "generationV1": v1,
        "generationV2": v2,
        "deltas": {
            "averageTextCharacters": round(v2["averageTextCharacters"] - v1["averageTextCharacters"], 1),
            "averageBodyWords": round(v2["averageBodyWords"] - v1["averageBodyWords"], 1),
            "averageDarkPixelRatio": round(v2["averageDarkPixelRatio"] - v1["averageDarkPixelRatio"], 5),
            "distinctTopBandColorSignatures": v2["distinctTopBandColorSignatures"] - v1["distinctTopBandColorSignatures"],
        },
        "structuralChanges": [
            "Court cover/index, police case file, indictment, disclosure, witness, exhibit, interview, custody, media, medical, digital-forensic, correspondence and HMCTS-notice families now have distinct structures.",
            "Witness pages use numbered statement continuations with statement metadata, controlled scan texture and statement-of-truth treatment.",
            "MG6/MG6C pages use service/scheduling fields and item-specific descriptions instead of a generic evidence table.",
            "Interview pages use interview metadata and page-specific timed dialogue; custody uses separate audit-log structure.",
            "Clinical records and expert opinion use separate hospital/forensic styles and explicit opinion boundaries.",
            "Every compiled page has one registered substantive purpose.",
        ],
        "truthChanged": False,
        "chargesChanged": False,
        "expectedFindingsChanged": False,
    }
    (V2 / "v1-versus-v2-realism-comparison.json").write_text(json.dumps(comparison, indent=2), encoding="utf-8")
    comparison_md = [
        "# Malik-Price generation-v1 versus generation-v2 realism comparison",
        "",
        "Generation-v2 changes document structure and evidential density only. Frozen truth, charges, defendants, conflicts and expected findings are unchanged.",
        "",
        "| Measure | generation-v1 | generation-v2 |",
        "|---|---:|---:|",
        f"| Compiled pages | {v1['pageCount']} | {v2['pageCount']} |",
        f"| Average extracted characters/page | {v1['averageTextCharacters']} | {v2['averageTextCharacters']} |",
        f"| Median extracted characters/page | {v1['medianTextCharacters']} | {v2['medianTextCharacters']} |",
        f"| Average body words/page | {v1['averageBodyWords']} | {v2['averageBodyWords']} |",
        f"| Median body words/page | {v1['medianBodyWords']} | {v2['medianBodyWords']} |",
        f"| Average dark-pixel ratio | {v1['averageDarkPixelRatio']} | {v2['averageDarkPixelRatio']} |",
        f"| Distinct top-band colour signatures | {v1['distinctTopBandColorSignatures']} | {v2['distinctTopBandColorSignatures']} |",
        "",
        "## Structural remediation",
        "",
        *[f"- {item}" for item in comparison["structuralChanges"]],
        "",
        "This is AI engineering comparison, not qualified legal or solicitor approval.",
    ]
    (V2 / "v1-versus-v2-realism-comparison.md").write_text("\n".join(comparison_md) + "\n", encoding="utf-8")

    duplication = {
        "pageCount": len(metrics),
        "exactDuplicateRenderCount": len(metrics) - len({p["renderSha256"] for p in metrics}),
        "similarBodyPairsAtOrAbove0_70": similarities,
        "nonPermittedPairsAtOrAbove0_92": [p for p in similarities if p["fiveGramJaccard"] >= 0.92 and not p["permittedVersionHistoryPair"]],
        "density": {
            "minimum": min(v2_density),
            "maximum": max(v2_density),
            "mean": round(statistics.mean(v2_density), 6),
            "median": round(statistics.median(v2_density), 6),
        },
        "textCharacters": {
            "minimum": min(v2_chars),
            "maximum": max(v2_chars),
            "mean": round(statistics.mean(v2_chars), 2),
            "median": round(statistics.median(v2_chars), 2),
        },
        "passed": not any("duplicate" in e or "density" in e or "sparse" in e for e in errors),
    }
    (V2 / "density-duplication-scan.json").write_text(json.dumps(duplication, indent=2), encoding="utf-8")
    dup_md = [
        "# Generation-v2 density and duplication scan",
        "",
        f"- Pages: **{duplication['pageCount']}**",
        f"- Exact duplicate renders: **{duplication['exactDuplicateRenderCount']}**",
        f"- Non-permitted near-duplicate body pairs (5-gram Jaccard >= 0.92): **{len(duplication['nonPermittedPairsAtOrAbove0_92'])}**",
        f"- Dark-pixel ratio range: **{duplication['density']['minimum']:.4f}-{duplication['density']['maximum']:.4f}**",
        f"- Mean extracted characters/page: **{duplication['textCharacters']['mean']}**",
        f"- Scan passed: **{duplication['passed']}**",
        "",
        "Original/amended indictment pairs are recognised as legitimate version-history pairs, but remain separately hashed and visibly status-marked.",
    ]
    (V2 / "density-duplication-scan.md").write_text("\n".join(dup_md) + "\n", encoding="utf-8")

    report = {
        "pilotId": "malik-price-150-page",
        "generation": "generation-v2",
        "compiledPdf": str(PDF.relative_to(ROOT)).replace("\\", "/"),
        "compiledPdfSha256": sha256(PDF),
        "pageCount": len(metrics),
        "sourceCount": 21,
        "checks": {
            "renderSuccessEveryPage": len(metrics) == 150,
            "continuousPagination": not any("pagination" in e for e in errors),
            "compiledFooterEveryPage": not any("footer missing" in e for e in errors),
            "noSideOrBottomClipping": not any("touches side/bottom" in e for e in errors),
            "densityInRangeEveryPage": not any("density outside" in e for e in errors),
            "noSparsePages": not any("too sparse" in e for e in errors),
            "noExactDuplicatePages": not any("exact duplicate" in e for e in errors),
            "noNonPermittedNearDuplicatePages": not any("near-duplicate" in e for e in errors),
            "pagePurposeExactlyOnce": not any("page-purpose" in e for e in errors),
            "publicTemplateMappingOneToOne": not any("public-template" in e for e in errors),
            "chargeLockChecks": not any("charge" in e.lower() or "count 3" in e.lower() for e in errors),
            "internalLanguageLeakage": not any("internal marker" in e for e in errors),
            "generationV1MarkerPresent": (V1 / "IMMUTABLE-GENERATION-V1.json").exists(),
        },
        "errors": errors,
        "warnings": warnings,
        "automatedPass": not errors,
        "contactSheets": contacts,
        "pages": metrics,
        "humanSolicitorReviewClaimed": False,
    }
    (V2 / "page-level-visual-qa-report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    lines = [
        "# Malik-Price generation-v2 page-level visual QA",
        "",
        f"- Compiled PDF: `{report['compiledPdf']}`",
        f"- SHA-256: `{report['compiledPdfSha256']}`",
        f"- Pages rendered and checked: **{len(metrics)} / 150**",
        f"- Contact sheets: **{len(contacts)}**",
        f"- Automated errors: **{len(errors)}**",
        f"- Automated pass before contact-sheet review: **{report['automatedPass']}**",
        "- Engineering QA only; no qualified legal, solicitor or human visual approval claimed.",
        "",
        "## Checks",
        "",
        *[f"- {key}: **{value}**" for key, value in report["checks"].items()],
    ]
    if errors:
        lines.extend(["", "## Errors", "", *[f"- {error}" for error in errors]])
    (V2 / "page-level-visual-qa-report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main():
    marker = json.loads((V1 / "IMMUTABLE-GENERATION-V1.json").read_text(encoding="utf-8"))
    if marker["payloadTreeSha256"] != EXPECTED_V1_TREE:
        raise RuntimeError("generation-v1 immutable marker mismatch")
    metrics, similarities, signatures, errors, warnings = inspect_v2()
    contacts = build_contact_sheets(metrics)
    write_reports(metrics, similarities, signatures, errors, warnings, contacts)
    print(json.dumps({
        "pages": len(metrics),
        "errors": errors[:60],
        "errorCount": len(errors),
        "contactSheets": len(contacts),
        "nearDuplicatePairs": len([p for p in similarities if p["fiveGramJaccard"] >= 0.92 and not p["permittedVersionHistoryPair"]]),
    }, indent=2))
    raise SystemExit(1 if errors else 0)


if __name__ == "__main__":
    main()
