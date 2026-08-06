/**
 * Real-PDF Live Pilot v1 — frozen 20-entry pilot definition.
 *
 * Source of truth for id/pageCount/expectedSha256/primaryTest is
 * `C:\Users\gduff\Documents\Codex\pdf-corpus-audit\REAL-PDF-PILOT-20.md` (already
 * SHA-256 reverified there — 20 checked, 0 mismatches). This file freezes that
 * selection into a typed, importable list plus the exact verified absolute source
 * paths supplied for this programme. It does not itself compute or assert any hash;
 * `freeze-membership.ts` performs the independent verification.
 *
 * DO NOT modify original PDFs. DO NOT edit expectedSha256/pageCount here without
 * re-reading REAL-PDF-PILOT-20.md — they must stay byte-identical to that record.
 */

/** Artefact root (relative to repo root) for every file this programme produces. */
export const ARTEFACT_ROOT =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/real-pdf-live-pilot-v1";

export type PilotEntry = {
  /** RP-01 .. RP-20, in the frozen membership order. */
  id: string;
  /** Original file name (for display only — never used to re-derive a path). */
  fileName: string;
  /** Exact absolute path verified for this programme run. */
  absoluteSourcePath: string;
  /** Full 64-hex-char SHA-256 from REAL-PDF-PILOT-20.md. */
  expectedSha256: string;
  /** Page count recorded in REAL-PDF-PILOT-20.md. */
  pageCount: number;
  /** Primary test description from REAL-PDF-PILOT-20.md (verbatim). */
  primaryTest: string;
  /** Strata tags derived mechanically from primaryTest + pageCount (see deriveStrata). */
  strata: string[];
};

function slug(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Size-class strata bucketed from the frozen pageCount. Boundaries are arbitrary but fixed. */
function sizeClassFor(pageCount: number): string {
  if (pageCount <= 5) return "size_xs_le5";
  if (pageCount <= 15) return "size_s_le15";
  if (pageCount <= 30) return "size_m_le30";
  if (pageCount <= 100) return "size_l_le100";
  return "size_xl_gt100";
}

/** Tags derived deterministically from the semicolon-separated primaryTest description. */
function deriveStrata(pageCount: number, primaryTest: string): string[] {
  const fromDescription = primaryTest
    .split(";")
    .map((p) => slug(p))
    .filter(Boolean);
  return [sizeClassFor(pageCount), ...fromDescription];
}

type RawPilotEntry = {
  id: string;
  fileName: string;
  absoluteSourcePath: string;
  expectedSha256: string;
  pageCount: number;
  primaryTest: string;
};

/**
 * Raw rows transcribed verbatim from REAL-PDF-PILOT-20.md (hashes + pageCount) and
 * from the verified absolute paths supplied for this programme run.
 */
const RAW_PILOT_20: RawPilotEntry[] = [
  {
    id: "RP-01",
    fileName: "CB-MURDER-TEST-0001_criminal_defence_bundle.pdf",
    absoluteSourcePath:
      "C:\\Users\\gduff\\Downloads\\CB-MURDER-TEST-0001_criminal_defence_bundle.pdf",
    expectedSha256: "d30e3f83d5866f31282fe9b4d9e6716489922c3d879598a81d27c920fc5f451b",
    pageCount: 137,
    primaryTest: "homicide; full evidence mix; amendment",
  },
  {
    id: "RP-02",
    fileName: "CB-TB-1681_Grant.pdf",
    absoluteSourcePath:
      "C:\\Users\\gduff\\Downloads\\cb-tb-1601-1700-v5-chaos\\pdfs\\CB-TB-1681_Grant.pdf",
    expectedSha256: "cccf70b339ec74c4ff839c7d982b3306570cf6abfa843abf5f6dcae95bc650a0",
    pageCount: 8,
    primaryTest: "chaos layout; drugs; missing material",
  },
  {
    id: "RP-03",
    fileName: "CB-TB-1925_Tobin.pdf",
    absoluteSourcePath:
      "C:\\Users\\gduff\\Downloads\\cb-tb-1601-2200-v5-factory-run\\pdfs\\CB-TB-1925_Tobin.pdf",
    expectedSha256: "555a899704fa7c7f77d39dd39f724af3fc187eff5452e1c54bbbed959251d457",
    pageCount: 22,
    primaryTest: "violence; interview; medical; hearing",
  },
  {
    id: "RP-04",
    fileName: "CB-TB-039_Vale.pdf",
    absoluteSourcePath: "C:\\Users\\gduff\\Downloads\\cb-tb-001-050-v3\\pdfs\\CB-TB-039_Vale.pdf",
    expectedSha256: "060c72f60892540944d75ef146121c003f0f10d506297126c51b09bf253f5c14",
    pageCount: 13,
    primaryTest: "theft/robbery; version-3 layout",
  },
  {
    id: "RP-05",
    fileName: "CB-CHARGE-2026-0039.pdf",
    absoluteSourcePath:
      "C:\\Users\\gduff\\Downloads\\CaseBrain_Monster_and_Charge_Coverage_2026\\casebrain_monster_charge\\Charge_Coverage_Smoke_Pack\\pdfs\\CB-CHARGE-2026-0039.pdf",
    expectedSha256: "1ef4c384db0f0f36273e3416c3d1e1db30b9ed1f7460bd21169830c60f8b6a6c",
    pageCount: 5,
    primaryTest: "road traffic; charge-coverage smoke layout",
  },
  {
    id: "RP-06",
    fileName: "CB-LEVERAGE-2026-0001.pdf",
    absoluteSourcePath:
      "C:\\Users\\gduff\\Downloads\\CaseBrain_Packs_V_W_X_2026\\CaseBrain_Packs_V_W_X_2026\\Pack_V_CB_LEVERAGE_2026\\pdfs\\CB-LEVERAGE-2026-0001.pdf",
    expectedSha256: "5bcd36e1ef8c3611e43e76cef64bbef75056bc76a812d2857977e8e6cfcd42d9",
    pageCount: 5,
    primaryTest: "leverage pack; amendment/missing disclosure",
  },
  {
    id: "RP-07",
    fileName: "CB-Z-500-ABH-0007_ABH_s.47_500_page_bundle.pdf",
    absoluteSourcePath:
      "C:\\Users\\gduff\\Downloads\\CaseBrain_Pack_Z_40x500_large_criminal_bundle_stress_pack\\CaseBrain_Pack_Z_40x500\\pdfs z\\CB-Z-500-ABH-0007_ABH_s.47_500_page_bundle.pdf",
    expectedSha256: "94541fb543b06ca93f7cfc4964d527c900574e7c279e49225ec62af8d4e93871",
    pageCount: 500,
    primaryTest: "heavy bundle; ABH; pagination",
  },
  {
    id: "RP-08",
    fileName: "CB-OCR-2026-0013.pdf",
    absoluteSourcePath:
      "C:\\Users\\gduff\\Downloads\\CaseBrain_Pack_U_CB_OCR_2026_AUDITED_UPGRADED\\CaseBrain_Pack_U_CB_OCR_2026_AUDITED_UPGRADED\\pdfs\\CB-OCR-2026-0013.pdf",
    expectedSha256: "d4ed1db9a7268273d7c33cad61b5a296068ce7f2c5d60955815700e659933b37",
    pageCount: 5,
    primaryTest: "OCR degradation; phone/medical",
  },
  {
    id: "RP-09",
    fileName: "CB-TRAP-2026-0030.pdf",
    absoluteSourcePath:
      "C:\\Users\\gduff\\Downloads\\CaseBrain_Eval_Regression_Packs_C_D\\CaseBrain_Eval_Regression_Packs_C_D\\Pack_C_Hallucination_Trap\\PDFs\\CB-TRAP-2026-0030.pdf",
    expectedSha256: "cbc1d8d5da2238bb4124df1af92745ae1823be2b491273906e1d03e2f703e7be",
    pageCount: 3,
    primaryTest: "hallucination trap; incomplete material",
  },
  {
    id: "RP-10",
    fileName: "CB-TB-014_James_Patterson.pdf",
    absoluteSourcePath:
      "C:\\Users\\gduff\\Downloads\\CaseBrain_Blind_Bundle_Factory_v2_30_bundles (1)\\pdfs\\CB-TB-014_James_Patterson.pdf",
    expectedSha256: "c172b0138636b21984c81193f9975383be2525e6b5eddf325023423aae7600ec",
    pageCount: 8,
    primaryTest: "blind-bundle layout; weapons; hearing",
  },
  {
    id: "RP-11",
    fileName: "gauntlet-08-kitchen-sink.pdf",
    absoluteSourcePath: "C:\\Users\\gduff\\Downloads\\test casess\\gauntlet-08-kitchen-sink.pdf",
    expectedSha256: "650f87da03a510f75c0eb201b94c194fb76a1482d588442d939d8b5b872ff7ea",
    pageCount: 86,
    primaryTest: "multi-defendant; kitchen-sink complexity",
  },
  {
    id: "RP-12",
    fileName: "CB-MONSTER-2026-0001.pdf",
    absoluteSourcePath:
      "C:\\Users\\gduff\\Downloads\\CaseBrain_Monster_and_Charge_Coverage_2026\\casebrain_monster_charge\\Monster_Bundle_Load_Pack\\pdfs\\CB-MONSTER-2026-0001.pdf",
    expectedSha256: "0b966f3d6296a8359519de929cd2dd558a4b6bdd47b17f6924d0c11b27f4c69f",
    pageCount: 300,
    primaryTest: "monster load; robbery; long pagination",
  },
  {
    id: "RP-13",
    fileName: "CB-TB-343_Dunn.pdf",
    absoluteSourcePath: "C:\\Users\\gduff\\Downloads\\cb-tb-301-400-v4\\pdfs\\CB-TB-343_Dunn.pdf",
    expectedSha256: "be29ed51ee8c478a7d3af98ae1d4ecdc79e9561d00113b7ced5de3b9daeb8388",
    pageCount: 15,
    primaryTest: "burglary; multi-defendant; digital evidence",
  },
  {
    id: "RP-14",
    fileName: "CB-TB-546_Patel.pdf",
    absoluteSourcePath: "C:\\Users\\gduff\\Downloads\\cb-tb-501-600-v5\\pdfs\\CB-TB-546_Patel.pdf",
    expectedSha256: "bc5d732fa9306133c0c7d7fe2ea85a8e7d65a5d1b30a823ac491495839e0a6ef",
    pageCount: 27,
    primaryTest: "public order; amended version",
  },
  {
    id: "RP-15",
    fileName: "CB-TB-439_Davies.pdf",
    absoluteSourcePath:
      "C:\\Users\\gduff\\Downloads\\cb-tb-401-500-v5\\pdfs\\CB-TB-439_Davies.pdf",
    expectedSha256: "adb988b033c4130a577b8a07b3090b5145515d8ff67f6eb7184222c2eb8d0dcd",
    pageCount: 19,
    primaryTest: "proceeds; defence statement; co-defendant",
  },
  {
    id: "RP-16",
    fileName: "CB-TB-1573_Ahmed.pdf",
    absoluteSourcePath:
      "C:\\Users\\gduff\\Downloads\\cb-tb-1501-1600-v5-factory-run\\pdfs\\CB-TB-1573_Ahmed.pdf",
    expectedSha256: "b7b5f5756a0d6f5bb7877ec996f5e39ead4825bc4f7d2ae891a3ededba8883a6",
    pageCount: 21,
    primaryTest: "firearms; expert; medical; hearing",
  },
  {
    id: "RP-17",
    fileName: "CB-FRESH-001_Taylor_Brookes_Digital_Attribution.pdf",
    absoluteSourcePath:
      "C:\\Users\\gduff\\Downloads\\CB-FRESH-001_Taylor_Brookes_Digital_Attribution.pdf",
    expectedSha256: "c5808d92030c0eb2005b40da003e8be027b09daae1f5844e1aea4b1fede24cd6",
    pageCount: 10,
    primaryTest: "communications; device attribution",
  },
  {
    id: "RP-18",
    fileName: "108.pdf",
    absoluteSourcePath: "C:\\Users\\gduff\\Downloads\\108.pdf",
    expectedSha256: "4436b9884a71e433dfb73625429625a70501f77565d4b3fdc1a99cd076a31ef6",
    pageCount: 9,
    primaryTest: "standalone CCTV-heavy homicide material",
  },
  {
    id: "RP-19",
    fileName: "police station.pdf",
    absoluteSourcePath: "C:\\Users\\gduff\\Downloads\\police station.pdf",
    expectedSha256: "169d3636cf2229bf1c7aedccf48074f682a29e2b64ff705e4c75ad08722c473b",
    pageCount: 2,
    primaryTest: "short standalone police/forensic input",
  },
  {
    id: "RP-20",
    fileName: "Untitled document (14).pdf",
    absoluteSourcePath: "C:\\Users\\gduff\\Downloads\\Untitled document (14).pdf",
    expectedSha256: "d33ffbce9e3e461792fa219091544af96d45dbd233ddde14fd1ed535e6d6a199",
    pageCount: 11,
    primaryTest: "explicit fictional consolidated test bundle",
  },
];

export const PILOT_20: PilotEntry[] = RAW_PILOT_20.map((r) => ({
  ...r,
  strata: deriveStrata(r.pageCount, r.primaryTest),
}));

export function pilotEntryById(id: string): PilotEntry | undefined {
  return PILOT_20.find((e) => e.id === id);
}

/** The five-case preflight order, exactly as specified for this programme. */
export const FIVE_CASE_PREFLIGHT_IDS = ["RP-08", "RP-09", "RP-03", "RP-11", "RP-07"];

/** Two deterministic-sample-rerun cases (small + already-preflighted, for a cheap rerun). */
export const DETERMINISTIC_RERUN_IDS = ["RP-09", "RP-05"];
