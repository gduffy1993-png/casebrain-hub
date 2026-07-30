/**
 * Batch 3 — freeze FID-10 output ledger then source-review the 19 candidates.
 * Does not modify CaseBrain. Does not open truth keys for verdicts.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const BASELINE = "d92e28c25a1dcc239f3c0d434174cc45851fd908";
const OUT_DIR = path.join(
  ROOT,
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch3",
);
const CORPUS = path.join(ROOT, "artifacts/evidence-state-audit-local/cases");

function sha(b: Buffer | string): string {
  return crypto.createHash("sha256").update(b).digest("hex");
}

function readPtr(obj: unknown, ref: string): unknown {
  const parts = ref.replace(/^\//, "").split("/");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    if (Array.isArray(cur)) cur = cur[Number(p)];
    else if (typeof cur === "object") cur = (cur as Record<string, unknown>)[p];
    else return undefined;
  }
  return cur;
}

type Disposition =
  | "source_supported_but_provenance_binding_missing"
  | "output_not_supported_by_source"
  | "safe_qualified_paraphrase"
  | "duplicate_occurrence"
  | "genuinely_unresolved";

function normalizeForSearch(s: string): string {
  return s
    .toLowerCase()
    .replace(/[“”"']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractSearchKeys(text: string): string[] {
  const raw = text.replace(/^[*"\[\],\s]+|[*"\[\],\s]+$/g, "").trim();
  const keys: string[] = [];
  if (raw.length >= 12) keys.push(raw);
  // pull distinctive substrings
  const m = raw.match(
    /(?:no comment|CCTV requested|partial 999|MG5|MG6|PC Vale|clock drift|medical records|friend witness|footage awaiting|BWV|continuity outstanding)/gi,
  );
  if (m) for (const x of m) keys.push(x);
  // quoted spans
  const q = [...raw.matchAll(/[“"]([^“"]{6,})[”"]/g)].map((x) => x[1]);
  keys.push(...q);
  return [...new Set(keys.map((k) => k.trim()).filter((k) => k.length >= 6))];
}

function findSourceHits(bundle: string, text: string): Array<{ snippet: string; index: number; key: string }> {
  const hits: Array<{ snippet: string; index: number; key: string }> = [];
  const bundleNorm = normalizeForSearch(bundle);
  for (const key of extractSearchKeys(text)) {
    const kn = normalizeForSearch(key);
    if (kn.length < 6) continue;
    const idx = bundleNorm.indexOf(kn);
    if (idx >= 0) {
      // approximate original index via lowercase search of first 40 chars of key
      const probe = key.slice(0, Math.min(40, key.length));
      const oi = bundle.toLowerCase().indexOf(probe.toLowerCase());
      const at = oi >= 0 ? oi : Math.min(idx, bundle.length - 1);
      hits.push({
        key,
        index: at,
        snippet: bundle.slice(Math.max(0, at - 40), Math.min(bundle.length, at + probe.length + 80)),
      });
    }
  }
  return hits;
}

function classify(args: {
  text: string;
  hits: Array<{ snippet: string; key: string }>;
  isDuplicateOfEarlier: boolean;
  duplicateOf?: string;
}): { disposition: Disposition; reason: string; rootCauseFamily: string } {
  if (args.isDuplicateOfEarlier) {
    return {
      disposition: "duplicate_occurrence",
      reason: `Duplicate of earlier occurrence ${args.duplicateOf ?? ""}`.trim(),
      rootCauseFamily: "duplicate_surface_repetition",
    };
  }
  const t = args.text;
  const isDoNotInvent = /\bdo not invent\b/i.test(t);
  const isStatusLabel =
    /requested not (in bundle|served)|partial 999|awaiting service|continuity outstanding|not served/i.test(t) &&
    t.replace(/[^“”"]/g, "").length <= 4 &&
    t.length < 120;
  const isFriendWitness = /^["“]?friend witness["”]?,?$/i.test(t.trim());
  const hasHits = args.hits.length > 0;

  if (isDoNotInvent && hasHits) {
    return {
      disposition: "safe_qualified_paraphrase",
      reason: "Hard-rule / do-not-invent qualified paraphrase aligned to source MG6/list status language.",
      rootCauseFamily: "qualified_do_not_overstate_paraphrase",
    };
  }
  if (isFriendWitness && !hasHits) {
    return {
      disposition: "genuinely_unresolved",
      reason: "Short quoted label without recoverable source support or provenance binding.",
      rootCauseFamily: "short_quoted_label_without_source_or_binding",
    };
  }
  if (hasHits) {
    // Source contains supporting language but structured provenance binding absent on output row
    if (/\b(MG5|MG6|CCTV|999|PC Vale|clock drift|medical|no comment)\b/i.test(t)) {
      return {
        disposition: "source_supported_but_provenance_binding_missing",
        reason:
          "Bundle text supports the quoted/status content, but the output row lacks independent structured sourceEvidenceId/documentId+page binding.",
        rootCauseFamily: "missing_structured_provenance_binding_on_supported_quote",
      };
    }
    return {
      disposition: "source_supported_but_provenance_binding_missing",
      reason: "Source support found; structured provenance binding missing on the output surface.",
      rootCauseFamily: "missing_structured_provenance_binding_on_supported_quote",
    };
  }
  if (isStatusLabel) {
    return {
      disposition: "genuinely_unresolved",
      reason: "Status-like quoted fragment without located source support in bundle-text.md.",
      rootCauseFamily: "quoted_status_fragment_source_not_located",
    };
  }
  // no-comment interview claims — if no hit, may be unsupported
  if (/\bno comment\b/i.test(t)) {
    return {
      disposition: "output_not_supported_by_source",
      reason: "No-comment interview quotation not located in bundle-text.md under this review.",
      rootCauseFamily: "interview_quote_not_located_in_bundle",
    };
  }
  return {
    disposition: "genuinely_unresolved",
    reason: "No clear source support or safe paraphrase classification after bundle review.",
    rootCauseFamily: "residual_unresolved_after_source_review",
  };
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const remaining = JSON.parse(
    fs.readFileSync(
      path.join(
        ROOT,
        "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch2/stage150-fid10-remaining-unresolved.json",
      ),
      "utf8",
    ),
  ) as {
    candidates: Array<{ caseId: string; ref: string; family: string; textPreview: string }>;
  };

  const frozenAt = new Date().toISOString();
  const caseIds = [...new Set(remaining.candidates.map((c) => c.caseId))];
  const casePacks = new Map<
    string,
    { output: Record<string, unknown>; bundle: string; outHash: string; bundleHash: string; packetRel: string }
  >();

  for (const caseId of caseIds) {
    const packet = path.join(CORPUS, caseId);
    const outBuf = fs.readFileSync(path.join(packet, "casebrain-output.json"));
    const bundleBuf = fs.readFileSync(path.join(packet, "bundle-text.md"));
    casePacks.set(caseId, {
      output: JSON.parse(outBuf.toString("utf8")) as Record<string, unknown>,
      bundle: bundleBuf.toString("utf8"),
      outHash: sha(outBuf),
      bundleHash: sha(bundleBuf),
      packetRel: path.relative(ROOT, packet).split(path.sep).join("/"),
    });
  }

  const freezeOccurrences = remaining.candidates.map((c) => {
    const pack = casePacks.get(c.caseId)!;
    const text = String(readPtr(pack.output, c.ref) ?? "");
    return {
      caseId: c.caseId,
      surfaceReference: c.ref,
      priorFamily: c.family,
      exactText: text,
      exactTextSha256: sha(text),
      textPreview: text.slice(0, 180),
    };
  });

  const freeze = {
    schemaVersion: "stage150-fid10-output-freeze-receipt@1.0.0",
    purpose:
      "Prove solicitor-visible output ledger was frozen before FID-10 source-packet review for Batch 3.",
    baselineCommit: BASELINE,
    frozenAt,
    sourceCandidateList:
      "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch2/stage150-fid10-remaining-unresolved.json",
    occurrenceTotal: freezeOccurrences.length,
    caseTotal: caseIds.length,
    rule: "No CaseBrain repair; no case-specific patches; source review uses frozen output hashes + bundle-text.md only; truth keys not opened for verdicts.",
    cases: caseIds.map((caseId) => {
      const pack = casePacks.get(caseId)!;
      const occs = freezeOccurrences.filter((o) => o.caseId === caseId);
      return {
        caseId,
        packetPath: pack.packetRel,
        casebrainOutputSha256: pack.outHash,
        bundleTextSha256: pack.bundleHash,
        occurrenceCount: occs.length,
        occurrences: occs,
      };
    }),
    freezeDigestSha256: "",
  };
  freeze.freezeDigestSha256 = sha(JSON.stringify(freeze.cases));
  fs.writeFileSync(
    path.join(OUT_DIR, "stage150-fid10-output-freeze-receipt.json"),
    JSON.stringify(freeze, null, 2) + "\n",
  );

  // Source review AFTER freeze written
  // Retain EVERY occurrence. Duplicates link to owner via duplicateOfFindingId/groupId — never delete.
  const reviewedAt = new Date().toISOString();
  const ownerByKey = new Map<string, string>(); // case|norm -> owner occurrenceId
  const dispositions = remaining.candidates.map((c, i) => {
    const occurrenceId = `fid10-b3-${String(i + 1).padStart(2, "0")}`;
    const pack = casePacks.get(c.caseId)!;
    const text = String(readPtr(pack.output, c.ref) ?? "");
    const textHash = sha(text);
    const norm = normalizeForSearch(text);
    const key = `${c.caseId}|${norm}`;
    const ownerId = ownerByKey.get(key);
    const isDup = ownerId != null;
    if (!isDup) ownerByKey.set(key, occurrenceId);
    const groupId = `fid10-group-${isDup ? ownerId : occurrenceId}`;
    // Always search source for exposure honesty — duplicates retain source hits too.
    const hits = findSourceHits(pack.bundle, text);
    const cls = classify({
      text,
      hits,
      isDuplicateOfEarlier: isDup,
      duplicateOf: ownerId,
    });
    return {
      occurrenceId,
      caseId: c.caseId,
      surfaceReference: c.ref,
      exactTextSha256: textHash,
      uniqueStringKey: key,
      textPreview: text.slice(0, 180),
      outputFrozenSha256: pack.outHash,
      bundleTextSha256: pack.bundleHash,
      disposition: cls.disposition,
      rootCauseFamily: cls.rootCauseFamily,
      reason: cls.reason,
      duplicateOfFindingId: isDup ? ownerId! : null,
      groupId,
      retainedSurfaceOccurrence: true,
      sourceHitCount: hits.length,
      sourceHitSamples: hits.slice(0, 3).map((h) => ({
        key: h.key.slice(0, 80),
        snippet: h.snippet.replace(/\s+/g, " ").slice(0, 160),
      })),
      units: {
        occurrence: `${c.caseId}:${c.ref}`,
        uniqueString: textHash,
        case: c.caseId,
        sourceDocument: `${pack.packetRel}/bundle-text.md`,
      },
    };
  });

  const byDisposition: Record<string, number> = {};
  const byFamily: Record<string, number> = {};
  for (const d of dispositions) {
    byDisposition[d.disposition] = (byDisposition[d.disposition] ?? 0) + 1;
    byFamily[d.rootCauseFamily] = (byFamily[d.rootCauseFamily] ?? 0) + 1;
  }

  const uniqueStrings = [...new Set(dispositions.map((d) => d.exactTextSha256))];
  const remediationRegister = {
    schemaVersion: "stage150-fid10-remediation-register@1.1.0",
    baselineCommit: BASELINE,
    reviewedAt,
    freezeReceipt: "stage150-fid10-output-freeze-receipt.json",
    freezeDigestSha256: freeze.freezeDigestSha256,
    caseBrainRepaired: false,
    caseSpecificPatches: false,
    duplicatePolicy:
      "Retain every solicitor-visible surface occurrence. Link duplicates to one owner finding via duplicateOfFindingId/groupId. Never delete duplicates from occurrence denominators.",
    units: {
      occurrenceCount: dispositions.length,
      uniqueStringCount: uniqueStrings.length,
      caseCount: caseIds.length,
      sourceDocumentCount: caseIds.length,
      duplicateLinkedCount: dispositions.filter((d) => d.duplicateOfFindingId != null).length,
      ownerFindingCount: dispositions.filter((d) => d.duplicateOfFindingId == null).length,
    },
    dispositionCounts: byDisposition,
    rootCauseFamilies: Object.entries(byFamily).map(([family, count]) => ({
      family,
      occurrenceCount: count,
      sharedRemediation:
        family === "missing_structured_provenance_binding_on_supported_quote"
          ? "Shared: emit/bind sourceEvidenceId or documentId+page on quotation rows when source text is known; never self-certify from quote wording."
          : family === "duplicate_surface_repetition"
            ? "Shared: retain all duplicate surface occurrences; link via duplicateOfFindingId/groupId to one owner finding; preserve occurrence count and exit exposure."
            : family === "qualified_do_not_overstate_paraphrase"
              ? "Shared: treat do-not-invent / hard-rule paraphrases citing MG6/list status as safe_qualified_paraphrase when source-supported."
              : family === "interview_quote_not_located_in_bundle"
                ? "Shared: interview no-comment claims require transcript/source support or must remain unresolved/not_supported — no case-specific patch."
                : "Shared: retain as genuinely_unresolved until structured provenance or source support adapters exist.",
    })),
    occurrences: dispositions,
  };

  fs.writeFileSync(
    path.join(OUT_DIR, "stage150-fid10-source-dispositions.json"),
    JSON.stringify(remediationRegister, null, 2) + "\n",
  );
  fs.writeFileSync(
    path.join(OUT_DIR, "stage150-fid10-source-dispositions.jsonl"),
    dispositions.map((d) => JSON.stringify(d)).join("\n") + "\n",
  );

  console.log(
    JSON.stringify(
      {
        freezeDigest: freeze.freezeDigestSha256,
        frozenAt,
        reviewedAt,
        dispositionCounts: byDisposition,
        uniqueStrings: uniqueStrings.length,
        families: byFamily,
      },
      null,
      2,
    ),
  );
}

main();
