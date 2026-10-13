"""Turn a practice PDF into column-aware page text. Lab only."""
import json
import sys

import fitz

doc = fitz.open(sys.argv[1])
pages = []
for page in doc:
    buckets: dict[int, list] = {}
    for word in page.get_text("words"):
        buckets.setdefault(round(word[1]), []).append(word)
    lines = []
    for key in sorted(buckets):
        words = sorted(buckets[key], key=lambda item: item[0])
        xs = [item[0] for item in words]
        if len(xs) < 4:
            lines.append(" ".join(item[4] for item in words))
            continue
        gap = 0
        split_at = None
        for index in range(len(xs) - 1):
            size = xs[index + 1] - xs[index]
            if size > gap:
                gap = size
                split_at = xs[index + 1]
        if split_at is not None and gap > 40:
            left = " ".join(item[4] for item in words if item[0] < split_at).strip()
            right = " ".join(item[4] for item in words if item[0] >= split_at).strip()
            lines.append(" | ".join(part for part in (left, right) if part))
        else:
            lines.append(" ".join(item[4] for item in words))
    pages.append("\n".join(lines))
print(json.dumps(pages))
