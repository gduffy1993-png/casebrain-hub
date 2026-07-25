/**
 * run-v4 → run-v5 disposition + all-exit family invariant evidence.
 *
 *   npx tsx scripts/integrity-programme/scale3000-run-v5-disposition.ts
 */
import fs from "node:fs";
import path from "node:path";
import { containsAbsoluteProofWording } from "@/lib/criminal/absolute-proof-wording";
import { assessOffenceLabelWording } from "@/lib/criminal/offence-label-registry";
import {
  classifyMatterFamily,
  containsDrinkDriveDeviceWording,
  violatesDrinkDriveCopyInvariant,
} from "@/lib/criminal/solicitor-family-provenance";
import { assessYouthVenueWording } from "@/lib/criminal/solicitor-youth-venue";

const ROOT = path.resolve(__dirname, "../..");
const BASE = path.join(
  ROOT,
  "artifacts/casebrain-qa/integrity-programme/scale3000-solicitor-materialisation",
);

type SurfaceRow = {
  caseId: string;
  surfaceId: string;
  text: string;
  textHash: string;
  canCopy: boolean;
  gateStatus?: string;
};
type Identity = { caseId: string; sourceCaseId: string; allegation?: string };

function* surfaces(run: string): Generator<SurfaceRow> {
  for (const line of fs.readFileSync(path.join(BASE, run, "surfaces.jsonl"), "utf8").split("\n")) {
    if (!line.trim()) continue;
    yield JSON.parse(line) as SurfaceRow;
  }
}

function loadIdentities(run: string): Map<string, Identity> {
  const m = new Map<string, Identity>();
  for (const line of fs.readFileSync(path.join(BASE, run, "identity-manifest.jsonl"), "utf8").split("\n")) {
    if (!line.trim()) continue;
    const row = JSON.parse(line) as Identity;
    m.set(row.caseId, row);
  }
  return m;
}

function loadStringHashes(run: string): Set<string> {
  const raw = JSON.parse(fs.readFileSync(path.join(BASE, run, "string-index.json"), "utf8")) as Record<
    string,
    unknown
  >;
  return new Set(Object.keys(raw));
}

function loadSourceContextAllegations(run: string): Map<string, string> {
  const m = new Map<string, string>();
  for (const s of surfaces(run)) {
    if (s.surfaceId !== "source_context") continue;
    const match = s.text.match(/Allegation:\s*(.+)/);
    if (match) m.set(s.caseId, match[1]!.trim());
  }
  return m;
}

function main() {
  const ids = loadIdentities("run-v5");
  const allegations = loadSourceContextAllegations("run-v5");
  const s172Ids = new Set(
    [...ids.values()]
      .filter((i) => i.sourceCaseId === "demo-audit-18-motoring-sjp-thin")
      .map((i) => i.caseId),
  );

  // Disposition of the 279 v4 wrong-family copyable surfaces
  const v4Wrong: Array<{ caseId: string; surfaceId: string; textHash: string; preview: string }> = [];
  for (const s of surfaces("run-v4")) {
    if (!s172Ids.has(s.caseId) || !s.canCopy) continue;
    if (
      (s.surfaceId === "truth_map" && containsDrinkDriveDeviceWording(s.text)) ||
      (s.surfaceId === "chase_brief" && /CCTV|medical|expert/i.test(s.text)) ||
      (s.surfaceId === "copy_preview" && /medical|expert/i.test(s.text))
    ) {
      v4Wrong.push({
        caseId: s.caseId,
        surfaceId: s.surfaceId,
        textHash: s.textHash,
        preview: s.text.slice(0, 160),
      });
    }
  }

  const v5Disposition = {
    truth_map: { copyable: 0, blocked: 0 },
    chase_brief: { copyable: 0, blocked: 0 },
    copy_preview: { copyable: 0, blocked: 0 },
  };
  for (const s of surfaces("run-v5")) {
    if (!s172Ids.has(s.caseId)) continue;
    if (s.surfaceId === "truth_map" || s.surfaceId === "chase_brief" || s.surfaceId === "copy_preview") {
      const bucket = v5Disposition[s.surfaceId];
      if (s.canCopy) bucket.copyable += 1;
      else bucket.blocked += 1;
    }
  }

  // All-exit drink-drive invariant on non-drink-driving matters
  let copyableDrinkOnNonDrink = 0;
  const drinkLeakExamples: Array<{ caseId: string; surfaceId: string; preview: string }> = [];
  for (const s of surfaces("run-v5")) {
    const id = ids.get(s.caseId);
    const alg =
      id?.sourceCaseId === "demo-audit-18-motoring-sjp-thin"
        ? "Fail to provide driver details, contrary to section 172(2) of the Road Traffic Act 1988"
        : allegations.get(s.caseId) ?? "";
    if (
      violatesDrinkDriveCopyInvariant({
        allegation: alg,
        auditFamily: id?.sourceCaseId ?? "",
        text: s.text,
        canCopy: s.canCopy,
      })
    ) {
      copyableDrinkOnNonDrink += 1;
      if (drinkLeakExamples.length < 10) {
        drinkLeakExamples.push({ caseId: s.caseId, surfaceId: s.surfaceId, preview: s.text.slice(0, 140) });
      }
    }
  }

  // Absolute proof
  let absCopyable = 0;
  for (const s of surfaces("run-v5")) {
    if (s.canCopy && containsAbsoluteProofWording(s.text)) absCopyable += 1;
  }

  // Citations remain fail-closed
  let citeCopyable = 0;
  let citeBlocked = 0;
  for (const s of surfaces("run-v5")) {
    if (s.surfaceId !== "case_header") continue;
    const a = assessOffenceLabelWording(s.text);
    // case_header blocked text may not match registry detect — count gateStatus
    if (s.gateStatus === "charge_verification_required" || (!s.canCopy && /solicitor verification/i.test(s.text))) {
      citeBlocked += 1;
    } else if (s.canCopy && a.conflictsWithRegistry) {
      citeCopyable += 1;
    }
  }

  // Youth venue
  let youthUnsafeCopyable = 0;
  let youthQualified = 0;
  let youthSourceBackedOk = 0;
  for (const s of surfaces("run-v5")) {
    if (s.surfaceId !== "client_summary") continue;
    const a = assessYouthVenueWording({
      prose: s.text,
      bundleHay: "", // evaluate display text itself
    });
    if (/your case is in the youth court|you are in the youth court/i.test(s.text)) {
      if (s.canCopy) youthUnsafeCopyable += 1;
    }
    if (/recorded as 17|venue must be confirmed from the papers/i.test(s.text)) youthQualified += 1;
    if (/youth court/i.test(s.text) && s.canCopy && !a.unsafeYouthCourtAssertion) {
      // May still assert if we re-assess without hay — count source-backed separately below
    }
  }
  // Re-check youth with source hay for demo-audit-22 / 29
  for (const s of surfaces("run-v5")) {
    if (s.surfaceId !== "client_summary" || !s.canCopy) continue;
    const id = ids.get(s.caseId);
    if (!id?.sourceCaseId?.includes("youth")) continue;
    if (/venue must be confirmed from the papers|recorded as 17/i.test(s.text)) youthQualified += 0; // already
    if (/your case is in the youth court/i.test(s.text)) {
      // Should only remain when venue was source-backed at render time
      youthSourceBackedOk += 1;
    }
  }

  // Compatibility matrix (surface × mode concept)
  const matrixSurfaces = [
    "truth_map",
    "overview_counts",
    "chase_brief",
    "cps_chase_draft",
    "copy_preview",
    "export_preview",
    "api_consumer_preview",
    "client_summary",
    "court_line",
  ] as const;
  const matrix: Record<string, { copyableDrinkLeaks: number; totalCopyable: number }> = {};
  for (const sid of matrixSurfaces) {
    matrix[sid] = { copyableDrinkLeaks: 0, totalCopyable: 0 };
  }
  for (const s of surfaces("run-v5")) {
    if (!(s.surfaceId in matrix)) continue;
    if (!s.canCopy) continue;
    matrix[s.surfaceId]!.totalCopyable += 1;
    const id = ids.get(s.caseId);
    const alg =
      id?.sourceCaseId === "demo-audit-18-motoring-sjp-thin"
        ? "Fail to provide driver details, contrary to section 172(2)"
        : allegations.get(s.caseId) ?? "";
    if (violatesDrinkDriveCopyInvariant({ allegation: alg, text: s.text, canCopy: true })) {
      matrix[s.surfaceId]!.copyableDrinkLeaks += 1;
    }
  }

  const v4Hashes = loadStringHashes("run-v4");
  const v5Hashes = loadStringHashes("run-v5");
  const added = [...v5Hashes].filter((h) => !v4Hashes.has(h));
  const removed = [...v4Hashes].filter((h) => !v5Hashes.has(h));

  const report = {
    generatedAt: new Date().toISOString(),
    programmePassSupported: false,
    note: "run-v5 disposition — not programme PASS. Citation conflicts remain blocked≠repaired.",
    stringDelta: {
      runV4ExactUnique: v4Hashes.size,
      runV5ExactUnique: v5Hashes.size,
      added: added.length,
      removed: removed.length,
      changed: added.length + removed.length,
    },
    blockerSurfaceIncompleteFamilyGate: {
      demoAudit18Identities: s172Ids.size,
      v4WrongFamilyCopyableSurfaces: v4Wrong.length,
      v4BySurface: v4Wrong.reduce(
        (acc, x) => {
          acc[x.surfaceId] = (acc[x.surfaceId] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
      v5DemoAudit18Disposition: v5Disposition,
      v4WrongFamilyCopyableCount: v4Wrong.length,
      v5WrongFamilyCopyableRemaining: (() => {
        let n = 0;
        for (const s of surfaces("run-v5")) {
          if (!s172Ids.has(s.caseId) || !s.canCopy) continue;
          if (
            (s.surfaceId === "truth_map" && containsDrinkDriveDeviceWording(s.text)) ||
            (s.surfaceId === "chase_brief" && /CCTV|medical|expert/i.test(s.text)) ||
            (s.surfaceId === "copy_preview" && /medical|expert|CCTV|intoxilyser|calibration|breath/i.test(s.text))
          ) {
            n += 1;
          }
        }
        return n;
      })(),
      dispositionNote:
        "Compatible charge/MG rows may remain copyable; drink-device/CCTV/medical wrong-family content must be zero on copyable exits.",
      disposition: "fixed_zero_wrong_family_copyable",
    },
    allExitDrinkDriveInvariant: {
      copyableDrinkDeviceOnNonDrinkDriveMatters: copyableDrinkOnNonDrink,
      ok: copyableDrinkOnNonDrink === 0,
      examples: drinkLeakExamples,
      matrix,
    },
    absoluteProof: { copyableOccurrences: absCopyable, ok: absCopyable === 0 },
    citations: {
      caseHeaderBlockedVerification: citeBlocked,
      caseHeaderCopyableConflicts: citeCopyable,
      blockedNotRepaired: true,
      note: "Fail-closed retention only — not substantive legal correction until qualified review.",
    },
    youthVenue: {
      note: "demo-audit-22/29 bundles include Court: Youth Court — assertions kept when source-backed. Unit contracts cover age/YJS-only fail path.",
      copyableHardYouthCourtAssertionsWithoutReassessment: youthUnsafeCopyable,
      qualifiedWordingOccurrences: youthQualified,
      youthSourceCasesStillAssertingYouthCourt: youthSourceBackedOk,
    },
  };

  // Patch disposition using remaining wrong-family count already computed inline above
  const remaining = (report.blockerSurfaceIncompleteFamilyGate as { v5WrongFamilyCopyableRemaining: number })
    .v5WrongFamilyCopyableRemaining;
  (report.blockerSurfaceIncompleteFamilyGate as { disposition: string }).disposition =
    remaining === 0 && copyableDrinkOnNonDrink === 0
      ? "fixed_zero_wrong_family_copyable"
      : "REGRESSION";

  const out = path.join(BASE, "run-v5", "v4-to-v5-blocker-disposition.json");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify(report, null, 2));
  console.log(`wrote ${path.relative(ROOT, out)}`);
}

main();
