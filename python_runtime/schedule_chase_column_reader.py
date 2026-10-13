"""Column-aware PDF text extraction shared by local and hosted readers."""

from collections import defaultdict

import fitz


def _pages_from_document(doc: fitz.Document) -> list[str]:
    pages: list[str] = []
    for page in doc:
        buckets: dict[int, list] = defaultdict(list)
        for word in page.get_text("words"):
            buckets[round(word[1])].append(word)

        lines: list[str] = []
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
    return pages


def column_pages_from_path(pdf_path: str) -> list[str]:
    with fitz.open(pdf_path) as doc:
        return _pages_from_document(doc)


def column_pages_from_bytes(pdf_bytes: bytes) -> list[str]:
    with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
        return _pages_from_document(doc)
