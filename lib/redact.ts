import crypto from "node:crypto";

type RedactionType =
  | "email"
  | "phone"
  | "nino"
  | "iban"
  | "sortcode"
  | "account";

export type RedactionHit = {
  type: RedactionType;
  value: string;
  token: string;
};

export type RedactionResult = {
  redactedText: string;
  map: RedactionHit[];
};

const mask = (type: RedactionType, value: string, secret: string) => {
  const digest = crypto
    .createHmac("sha256", secret)
    .update(`${type}:${value}`)
    .digest("hex")
    .slice(0, 10);

  return `[${type.toUpperCase()}#${digest}]`;
};

const patterns: Record<RedactionType, RegExp> = {
  email: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  phone:
    /(?<![A-Z0-9-])(?:\+?\d[\d\s().-]{7,}\d)(?![A-Z0-9-])/gi,
  nino: /\b([A-CEGHJ-PR-TW-Z]{2}\d{6}[A-D])\b/gi,
  iban: /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/g,
  sortcode: /\b\d{2}-\d{2}-\d{2}\b/g,
  account: /\b\d{8}\b/g,
};

const LEGAL_IDENTIFIER_PATTERNS = [
  /\bNS-CPS-\d{4}-\d+\b/i,
  /\bEX-[A-Z0-9]+(?:-[A-Z0-9]+)*\b/i,
  /\b\d{6,}\b/,
];

function isProtectedLegalIdentifier(value: string): boolean {
  return LEGAL_IDENTIFIER_PATTERNS.some((pattern) => pattern.test(value));
}

export function redact(text: string, secret: string): RedactionResult {
  const map: RedactionHit[] = [];
  let redactedText = text;

  (Object.keys(patterns) as RedactionType[]).forEach((type) => {
    redactedText = redactedText.replace(patterns[type], (match) => {
      if (isProtectedLegalIdentifier(match)) {
        return match;
      }

      // Keep numbers used in legal references and other non-PII numeric labels.
      if (type === "phone" && match.replace(/\D/g, "").length < 10) {
        return match;
      }

      const token = mask(type, match, secret);
      map.push({ type, value: match, token });
      return token;
    });
  });

  return { redactedText, map };
}

