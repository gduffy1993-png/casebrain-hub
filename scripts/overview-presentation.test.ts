#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { buildFamilyProofCards } from "../lib/criminal/proof-receipt/build-family-cards";
import {
  dedupePresentationLines,
  filterFamilyProofCardsForBundle,
  sanitizeSolicitorVisibleText,
} from "../lib/criminal/overview-presentation";
import type { FiveAnswersEvidenceRow } from "../lib/criminal/five-answers/types";

const taylorHay =
  "Harassment screenshot phone message whatsapp subscriber attribution MG6 MG11 extraction device download outstanding";
const taylorRows: FiveAnswersEvidenceRow[] = [
  {
    label: "MG6C/003 — Subscriber data — outstanding.",
    existence: "missing",
    reliability: "needs_review",
    note: "Outstanding on bundle",
  },
  {
    label: "Screenshot pack (served)",
    existence: "incomplete",
    reliability: "needs_review",
    note: "Partial media",
  },
];

const taylorCards = buildFamilyProofCards(taylorRows, taylorHay, "Harassment");
const filteredTaylor = filterFamilyProofCardsForBundle(taylorCards, taylorHay, "Harassment");

assert.ok(
  filteredTaylor.some((c) => c.id === "phone_attribution"),
  "phone harassment bundle should keep phone attribution card",
);
assert.ok(
  !filteredTaylor.some((c) => c.id === "motoring_calibration"),
  "phone harassment bundle should drop motoring card",
);

const motoringHay = "Dangerous driving breath specimen intoxilyser calibration certificate speed camera";
const motoringCards = buildFamilyProofCards([], motoringHay, "Dangerous driving");
const filteredMotoring = filterFamilyProofCardsForBundle(motoringCards, motoringHay, "Dangerous driving");
assert.ok(
  filteredMotoring.some((c) => c.id === "motoring_calibration"),
  "motoring bundle should keep motoring card",
);

assert.equal(
  sanitizeSolicitorVisibleText("Support: Weak — needs_review copy gate"),
  "Support: Limited on papers — solicitor review wording guard",
);

assert.equal(dedupePresentationLines(["Line A", "line a", "Line B"]).length, 2);

console.log("overview-presentation.test.ts: PASS");
