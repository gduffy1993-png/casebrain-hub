#!/usr/bin/env python3
"""Rasterize every PDF page to PNG and emit a JSON visual-metrics report on stdout."""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

import fitz


def sha256_bytes(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def analyse_pixmap(pix: fitz.Pixmap) -> dict:
    samples = pix.samples
    n = pix.n  # components per pixel
    total = pix.width * pix.height
    if total == 0:
        return {
            "blankOrNearEmpty": True,
            "meanLuma": 0,
            "nonWhiteRatio": 0,
            "edgeContentRatio": 0,
        }
    # Use stride sampling for speed
    step = max(1, n * 8)
    lumas = []
    non_white = 0
    edge_non_white = 0
    edge_count = 0
    w, h = pix.width, pix.height
    margin = max(4, min(w, h) // 40)
    for i in range(0, len(samples) - n + 1, step):
        px = i // n
        x = px % w
        y = px // w
        if n >= 3:
            r, g, b = samples[i], samples[i + 1], samples[i + 2]
            luma = (r + g + b) / 3
        else:
            luma = samples[i]
            r = g = b = samples[i]
        lumas.append(luma)
        if luma < 245:
            non_white += 1
            if x < margin or y < margin or x >= w - margin or y >= h - margin:
                edge_non_white += 1
        if x < margin or y < margin or x >= w - margin or y >= h - margin:
            edge_count += 1
    mean = sum(lumas) / max(1, len(lumas))
    non_white_ratio = non_white / max(1, len(lumas))
    edge_ratio = edge_non_white / max(1, edge_count)
    blank = mean > 250 and non_white_ratio < 0.01
    near_empty = non_white_ratio < 0.02
    margin_tight = edge_ratio > 0.15 and not blank
    return {
        "blankOrNearEmpty": blank or near_empty,
        "meanLuma": round(mean, 2),
        "nonWhiteRatio": round(non_white_ratio, 4),
        "edgeContentRatio": round(edge_ratio, 4),
        "marginTight": margin_tight,
    }


def main() -> int:
    if len(sys.argv) < 3:
        print("usage: rasterize-pdf-pages.py <pdf> <out_dir>", file=sys.stderr)
        return 2
    pdf_path = Path(sys.argv[1])
    out_dir = Path(sys.argv[2])
    out_dir.mkdir(parents=True, exist_ok=True)
    doc = fitz.open(pdf_path)
    pages = []
    contact_pixmaps = []
    for i, page in enumerate(doc):
        page_no = i + 1
        pix = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5), alpha=False)
        png_name = f"page-{page_no:03d}.png"
        png_path = out_dir / png_name
        png_bytes = pix.tobytes("png")
        png_path.write_bytes(png_bytes)
        metrics = analyse_pixmap(pix)
        text = page.get_text("text") or ""
        disposition = "pass"
        fails = []
        if metrics["blankOrNearEmpty"] and len(text.strip()) < 80:
            fails.append("blank_or_near_empty")
        elif metrics["blankOrNearEmpty"] and len(text.strip()) >= 80:
            # Sparse ink but substantive extractable text — flag density, not blank
            fails.append("low_ink_density")
        if metrics.get("marginTight") and len(text.strip()) < 80:
            fails.append("margin_tight_or_edge_overflow_risk")
        elif metrics.get("marginTight"):
            fails.append("margin_content_near_edge_note")
        if len(text.strip()) < 40:
            fails.append("extracted_text_thin")
        if "Continuation page" in text and text.count("\n") < 8:
            fails.append("artificial_continuation_page")
        # Treat low_ink_density alone as warn (pass_with_density_note) so fitted text pages can pass
        hard = [f for f in fails if f not in ("low_ink_density", "margin_content_near_edge_note")]
        if hard:
            disposition = "fail:" + ",".join(fails)
        elif fails:
            disposition = "pass_with_notes:" + ",".join(fails)
        else:
            disposition = "pass"
        pages.append(
            {
                "pdfPageNumber": page_no,
                "pngPath": str(png_path).replace("\\", "/"),
                "pngSha256": sha256_bytes(png_bytes),
                "width": pix.width,
                "height": pix.height,
                "extractedTextLen": len(text),
                "metrics": metrics,
                "visualDisposition": disposition,
                "footerIdentityPresent": "pageIdentity=" in text or f"pdfPage={page_no}" in text,
            }
        )
        # thumbnail for contact sheet
        thumb = page.get_pixmap(matrix=fitz.Matrix(0.25, 0.25), alpha=False)
        contact_pixmaps.append(thumb)

    # Contact sheet via raw RGB buffer (avoid Pixmap.set_rect alpha mismatch)
    if contact_pixmaps:
        cols = 5
        tw = max(t.width for t in contact_pixmaps)
        th = max(t.height for t in contact_pixmaps)
        rows_n = (len(contact_pixmaps) + cols - 1) // cols
        sheet_w, sheet_h = cols * tw, rows_n * th
        buf = bytearray([255, 255, 255]) * (sheet_w * sheet_h)
        for idx, t in enumerate(contact_pixmaps):
            if t.n != 3:
                t = fitz.Pixmap(fitz.csRGB, t)
            r = idx // cols
            c = idx % cols
            ox, oy = c * tw, r * th
            src = t.samples
            for y in range(t.height):
                for x in range(t.width):
                    si = (y * t.width + x) * 3
                    di = ((oy + y) * sheet_w + (ox + x)) * 3
                    buf[di : di + 3] = src[si : si + 3]
        sheet = fitz.Pixmap(fitz.csRGB, sheet_w, sheet_h, buf, False)
        sheet_path = out_dir / "contact-sheet.png"
        sheet_path.write_bytes(sheet.tobytes("png"))
        contact_sha = sha256_bytes(sheet_path.read_bytes())
    else:
        sheet_path = None
        contact_sha = None

    # duplicate detection by png hash
    by_hash = {}
    for p in pages:
        by_hash.setdefault(p["pngSha256"], []).append(p["pdfPageNumber"])
    duplicates = {h: v for h, v in by_hash.items() if len(v) > 1}

    report = {
        "pdf": str(pdf_path).replace("\\", "/"),
        "pageCount": len(pages),
        "pages": pages,
        "contactSheet": str(sheet_path).replace("\\", "/") if sheet_path else None,
        "contactSheetSha256": contact_sha,
        "duplicatePngHashes": duplicates,
        "failedPages": [p["pdfPageNumber"] for p in pages if str(p["visualDisposition"]).startswith("fail")],
    }
    (out_dir / "visual-qa-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
