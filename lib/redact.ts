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
    /\b(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}\b/g,
  nino: /\b([A-CEGHJ-PR-TW-Z]{2}\d{6}[A-D])\b/gi,
  iban: /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/g,
  sortcode: /\b\d{2}-\d{2}-\d{2}\b/g,
  account: /\b\d{8}\b/g,
};

export function redact(text: string, secret: string): RedactionResult {
  const map: RedactionHit[] = [];
  let redactedText = text;

  (Object.keys(patterns) as RedactionType[]).forEach((type) => {
    redactedText = redactedText.replace(patterns[type], (match) => {
      const token = mask(type, match, secret);
      map.push({ type, value: match, token });
      return token;
    });
  });

  return { redactedText, map };
}

