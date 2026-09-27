import { inflateSync } from "node:zlib";

/**
 * Recover selectable text from PDF content streams when the xref table is unreadable.
 *
 * pdf-parse's bundled pdf.js throws `bad XRef entry` on many pdfkit files. The bytes
 * still contain the BT/ET operators a viewer would draw. This path inflates those
 * streams and decodes hex / literal strings. It is a last resort after parse throws —
 * not a second reader for PDFs that already parsed, and not a substitute for OCR.
 */
const MIN_LETTERS = 12;

function decodeLiteral(raw: string): string {
  return raw
    .slice(1, -1)
    .replace(/\\([0-7]{1,3})/g, (_m, oct: string) => String.fromCharCode(parseInt(oct, 8)))
    .replace(/\\([()\\])/g, "$1");
}

function decodeHex(raw: string): string {
  const hex = raw.slice(1, -1).replace(/\s+/g, "");
  let out = "";
  for (let i = 0; i + 1 < hex.length; i += 2) {
    out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
  }
  return out;
}

function textOfContentStream(content: string): string {
  const blocks = content.match(/BT[\s\S]*?ET/g) ?? [];
  const lines: string[] = [];
  for (const block of blocks) {
    const parts: string[] = [];
    const re = /<[0-9a-fA-F\s]*>|\((?:\\.|[^()\\])*\)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(block)) !== null) {
      parts.push(m[0].startsWith("<") ? decodeHex(m[0]) : decodeLiteral(m[0]));
    }
    const line = parts.join("").replace(/\s+/g, " ").trim();
    if (line) lines.push(line);
  }
  return lines.join("\n");
}

function inflateOrRaw(bytes: Buffer): string {
  try {
    return inflateSync(bytes).toString("latin1");
  } catch {
    return bytes.toString("latin1");
  }
}

function collectContentStreams(buffer: Buffer): string[] {
  const streams: string[] = [];
  const startMarker = Buffer.from("stream");
  const endMarker = Buffer.from("endstream");
  let idx = 0;
  while ((idx = buffer.indexOf(startMarker, idx)) !== -1) {
    let start = idx + startMarker.length;
    if (buffer[start] === 0x0d) start += 1;
    if (buffer[start] === 0x0a) start += 1;
    const end = buffer.indexOf(endMarker, start);
    if (end === -1) break;
    streams.push(inflateOrRaw(buffer.subarray(start, end)));
    idx = end + endMarker.length;
  }
  return streams;
}

export function looksLikeReadablePdfStreamText(text: string): boolean {
  const letters = (text.match(/[A-Za-z]/g) ?? []).length;
  return letters >= MIN_LETTERS && /[A-Za-z]{3}/.test(text);
}

export function countPdfPageObjects(buffer: Buffer): number | null {
  const n = (buffer.toString("latin1").match(/\/Type\s*\/Page(?![s/])/g) ?? []).length;
  return n > 0 ? n : null;
}

/** Drawn text from content streams, or null when nothing readable was recovered. */
export function extractPdfTextFromContentStreams(buffer: Buffer): string | null {
  const pages = collectContentStreams(buffer)
    .filter((s) => s.includes("BT"))
    .map(textOfContentStream)
    .filter(Boolean);
  const text = pages.join("\n").trim();
  if (!looksLikeReadablePdfStreamText(text)) return null;
  return text;
}
