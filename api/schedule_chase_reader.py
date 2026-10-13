"""Secret-protected Vercel Python function for the existing PyMuPDF reader."""

import hmac
import json
import os
from http.server import BaseHTTPRequestHandler

import fitz

from python_runtime.schedule_chase_column_reader import column_pages_from_bytes


MAX_PDF_BYTES = 4 * 1024 * 1024


class handler(BaseHTTPRequestHandler):
    def _json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self) -> None:
        expected = os.environ.get("SCHEDULE_CHASE_READER_SECRET", "")
        supplied = self.headers.get("Authorization", "")
        if not expected or not hmac.compare_digest(supplied, f"Bearer {expected}"):
            self._json(401, {"ok": False, "error": "Unauthorized"})
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            content_length = 0
        if content_length <= 0 or content_length > MAX_PDF_BYTES:
            self._json(413, {"ok": False, "error": "PDF payload must be between 1 byte and 4 MiB"})
            return

        pdf_bytes = self.rfile.read(content_length)
        if not pdf_bytes.startswith(b"%PDF"):
            self._json(415, {"ok": False, "error": "Expected application/pdf bytes"})
            return

        try:
            pages = column_pages_from_bytes(pdf_bytes)
        except Exception:
            self._json(422, {"ok": False, "error": "PDF could not be read"})
            return

        self._json(
            200,
            {
                "ok": True,
                "pages": pages,
                "pageCount": len(pages),
                "reader": "PyMuPDF",
                "readerVersion": fitz.VersionBind,
            },
        )
