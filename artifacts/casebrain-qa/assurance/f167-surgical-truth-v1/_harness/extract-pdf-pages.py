#!/usr/bin/env python3
"""Extract key pages from CB-MONSTER-2026-0001.pdf for source index."""
from __future__ import annotations

import json
import os
import re
import sys

import fitz

PDF = r"C:\Users\gduff\casebrain-hub-wt-f167-surgical-truth-v1\artifacts\casebrain-qa\assurance\f167-surgical-truth-v1\_source\CB-MONSTER-2026-0001.pdf"
OUT = r"C:\Users\gduff\casebrain-hub-wt-f167-surgical-truth-v1\artifacts\casebrain-qa\assurance\f167-surgical-truth-v1\_source"
# Key pages from pack index + sampling for high-priority checks
KEY_PAGES = [1, 2, 5, 37, 88, 89, 90, 91, 92, 93, 94, 201, 202, 203, 204, 205, 206, 260, 261, 262]


def main() -> int:
    os.makedirs(OUT, exist_ok=True)
    doc = fitz.open(PDF)
    print("pages", doc.page_count, "size", os.path.getsize(PDF))
    full_parts = []
    key = {}
    for i in range(doc.page_count):
        text = doc.load_page(i).get_text("text")
        full_parts.append(f"\n\n===== PAGE {i+1} =====\n{text}")
        if (i + 1) in KEY_PAGES:
            key[str(i + 1)] = text
    full_path = os.path.join(OUT, "arden-full-extract.txt")
    open(full_path, "w", encoding="utf-8").write("".join(full_parts))
    open(os.path.join(OUT, "arden-key-pages.json"), "w", encoding="utf-8").write(
        json.dumps(key, indent=2, ensure_ascii=False)
    )
    blob = "".join(full_parts)
    terms = [
        "CCTV",
        "master",
        "continuity",
        "export",
        "999",
        "CAD",
        "audio",
        "interview",
        "transcript",
        "recording",
        "MG6",
        "MG6C",
        "MG11",
        "unused",
        "subscriber",
        "phone download",
        "extraction",
        "identification",
        "outstanding",
        "served",
        "incomplete",
    ]
    hits = {}
    for t in terms:
        hits[t] = len(re.findall(re.escape(t), blob, flags=re.I))
    open(os.path.join(OUT, "arden-term-hits.json"), "w", encoding="utf-8").write(
        json.dumps(hits, indent=2)
    )
    print("wrote", full_path, "chars", len(blob))
    print("term_hits", json.dumps(hits))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
