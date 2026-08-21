#!/usr/bin/env python3
"""Extract Arden Vale front_text from prior MCP SQL dump (source-backed, not CaseBrain UI)."""
import json
import os
import re
import sys

DUMP = r"C:\Users\gduff\.cursor\projects\c-Users-gduff-casebrain-hub\agent-tools\d95f61d2-a1fa-4c1b-9ae3-9cd811e507ad.txt"
OUT = r"C:\Users\gduff\casebrain-hub-wt-f167-surgical-truth-v1\artifacts\casebrain-qa\assurance\f167-surgical-truth-v1\_source"


def main() -> int:
    os.makedirs(OUT, exist_ok=True)
    raw = open(DUMP, encoding="utf-8").read()
    # File may be either raw MCP wrapper JSON or already the result string.
    try:
        outer = json.loads(raw)
        inner = outer["result"] if isinstance(outer, dict) and "result" in outer else raw
    except json.JSONDecodeError:
        inner = raw
    open_tag = re.search(r"<untrusted-data-[^>]+>", inner)
    close_tag = re.search(r"</untrusted-data-[^>]+>", inner)
    if not open_tag or not close_tag:
        print("NO_UNTRUSTED", file=sys.stderr)
        return 1
    payload = inner[open_tag.end() : close_tag.start()].strip()
    print("payload_head", repr(payload[:60]))
    data = json.loads(payload)
    print("rows", len(data))
    found = 0
    for row in data:
        cid = str(row.get("case_id", ""))
        text = str(row.get("front_text", ""))
        hit = ("99090" in cid) or ("Arden Vale" in text) or ("CB-MONSTER-2026-0001" in text)
        print(
            row.get("case_title"),
            cid[:8],
            row.get("doc_name"),
            row.get("full_len"),
            "HIT" if hit else "",
        )
        if hit:
            found += 1
            open(os.path.join(OUT, "arden-front-12k.txt"), "w", encoding="utf-8").write(text)
            meta = {k: v for k, v in row.items() if k != "front_text"}
            open(os.path.join(OUT, "arden-meta.json"), "w", encoding="utf-8").write(
                json.dumps(meta, indent=2)
            )
            print("WROTE", len(text))
    return 0 if found else 2


if __name__ == "__main__":
    raise SystemExit(main())
