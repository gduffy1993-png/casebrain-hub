/**
 * Generate Fictional bundle sources for CaseBrain.
 *
 * Produces:
 * - docs/fictional-cases-40/NS-CPS-2026-XXXX.txt for XXXX=0401..0440
 * - docs/fictional-cases-40/MASTER_CASES_01-40_ALL_IN_ONE.txt (combined)
 *
 * Notes:
 * - Test-data only (fictional Northshire-style).
 * - If a .txt already exists for a ref, we keep it (no overwrite).
 */
const fs = require("fs");
const path = require("path");

const DOCS_DIR = path.join(__dirname, "../docs/fictional-cases-40");
const MASTER_OUT = path.join(DOCS_DIR, "MASTER_CASES_01-40_ALL_IN_ONE.txt");

const CASES = [
  { ref: "NS-CPS-2026-0401", offence: "Robbery + s.47", stage: "First appearance / initial disclosure", messiness: "Messy", hook: "Weak ID; MG5 vs MG6 on 999" },
  { ref: "NS-CPS-2026-0402", offence: "s.20 GBH", stage: "PTPH-style", messiness: "Messy", hook: "One-punch vs self-defence; CCTV clock" },
  { ref: "NS-CPS-2026-0403", offence: "Common assault (domestic-flavoured) + CD", stage: "Initial disclosure", messiness: "Clean", hook: "BWV vs draft MG11; optional metadata" },
  { ref: "NS-CPS-2026-0404", offence: "Burglary dwelling + theft", stage: "Initial", messiness: "Messy", hook: "Bad index; continuity draft" },
  { ref: "NS-CPS-2026-0405", offence: "PWITS Class B lite", stage: "First appearance", messiness: "Messy", hook: "Stop search vs MG6 bad character tension" },
  { ref: "NS-CPS-2026-0406", offence: "s.4 POA", stage: "PTPH", messiness: "Clean-ish", hook: "Victim drunk; partial CAD" },
  { ref: "NS-CPS-2026-0407", offence: "Theft from shop + assault security", stage: "Initial", messiness: "Messy", hook: "OCR-style MG11" },
  { ref: "NS-CPS-2026-0408", offence: "Criminal damage", stage: "Initial", messiness: "Clean", hook: "Tidy MG6" },
  { ref: "NS-CPS-2026-0409", offence: "Assault PC + resist", stage: "PTPH", messiness: "Messy", hook: "BWV corrupted segment" },
  { ref: "NS-CPS-2026-0410", offence: "Robbery (attempted)", stage: "Initial", messiness: "Messy", hook: "Two MG6 dates contradict" },
  { ref: "NS-CPS-2026-0411", offence: "Fraud by false representation (low)", stage: "Initial", messiness: "Messy", hook: "Bank schedule incomplete" },
  { ref: "NS-CPS-2026-0412", offence: "s.18 GBH", stage: "Trial-ish (index extract)", messiness: "Messy", hook: "Alternative suspect; wrong index" },
  { ref: "NS-CPS-2026-0413", offence: "s.47 ABH", stage: "Initial", messiness: "Clean", hook: "Metadata optional" },
  { ref: "NS-CPS-2026-0414", offence: "Harassment / stalking (generic)", stage: "PTPH", messiness: "Messy", hook: "Draft MG11" },
  { ref: "NS-CPS-2026-0415", offence: "Burglary non-dwelling", stage: "Initial", messiness: "Messy", hook: "Third-party insurer line" },
  { ref: "NS-CPS-2026-0416", offence: "Bladed article", stage: "First appearance", messiness: "Clean-ish", hook: "ID lighting" },
  { ref: "NS-CPS-2026-0417", offence: "Careless driving + assault at scene", stage: "Initial", messiness: "Messy", hook: "Notebook vs CAD" },
  { ref: "NS-CPS-2026-0418", offence: "Affray", stage: "PTPH", messiness: "Messy", hook: "Joint enterprise" },
  { ref: "NS-CPS-2026-0419", offence: "Theft of motor vehicle", stage: "Initial", messiness: "Clean", hook: "Metadata optional" },
  { ref: "NS-CPS-2026-0420", offence: "s.5 POA", stage: "Initial", messiness: "Messy", hook: "999 tape gap" },
  { ref: "NS-CPS-2026-0421", offence: "Possession Class A lite", stage: "First appearance", messiness: "Messy", hook: "MG6 passenger ID" },
  { ref: "NS-CPS-2026-0422", offence: "Criminal damage + s.4A course", stage: "PTPH", messiness: "Messy", hook: "Wrong page index" },
  { ref: "NS-CPS-2026-0423", offence: "Robbery", stage: "Initial", messiness: "Clean-ish", hook: "ID parade" },
  { ref: "NS-CPS-2026-0424", offence: "Theft (pedal cycle)", stage: "Initial", messiness: "Clean", hook: "Metadata optional" },
  { ref: "NS-CPS-2026-0425", offence: "Common assault (pub)", stage: "First appearance", messiness: "Messy", hook: "Stills before ID procedure" },
  { ref: "NS-CPS-2026-0426", offence: "Dangerous driving", stage: "PTPH", messiness: "Messy", hook: "ANPR partial" },
  { ref: "NS-CPS-2026-0427", offence: "Aggravated vehicle taking (fictional label)", stage: "Initial", messiness: "Messy", hook: "Legal label mismatch" },
  { ref: "NS-CPS-2026-0428", offence: "s.20 GBH (glass)", stage: "Trial-ish (index)", messiness: "Messy", hook: "Unused schedule v3" },
  { ref: "NS-CPS-2026-0429", offence: "Communications Act / malicious comms (generic)", stage: "Initial", messiness: "Clean", hook: "Metadata optional" },
  { ref: "NS-CPS-2026-0430", offence: "Criminal damage (railway fiction)", stage: "PTPH", messiness: "Messy", hook: "CCTV clock fast" },
  { ref: "NS-CPS-2026-0431", offence: "Theft person (snatch)", stage: "Initial", messiness: "Messy", hook: "Victim timeline slip" },
  { ref: "NS-CPS-2026-0432", offence: "s.47 ABH domestic-flavoured", stage: "Initial", messiness: "Messy", hook: "Medical schedule only" },
  { ref: "NS-CPS-2026-0433", offence: "Possession offensive weapon (non-blade)", stage: "First appearance", messiness: "Clean-ish", hook: "Work tool defence" },
  { ref: "NS-CPS-2026-0434", offence: "Fraud retail refund", stage: "Initial", messiness: "Messy", hook: "MG5 £ vs MG11 £" },
  { ref: "NS-CPS-2026-0435", offence: "Public order s.4 + CD", stage: "PTPH", messiness: "Messy", hook: "Contradictory officer summaries" },
  { ref: "NS-CPS-2026-0436", offence: "Drug driving (fictional summary style)", stage: "Initial", messiness: "Clean", hook: "Metadata optional" },
  { ref: "NS-CPS-2026-0437", offence: "Burglary dwell + s.47", stage: "Initial", messiness: "Messy", hook: "Multi-victim order muddled" },
  { ref: "NS-CPS-2026-0438", offence: "Handling stolen goods", stage: "First appearance", messiness: "Messy", hook: "Third party 'Carl'" },
  { ref: "NS-CPS-2026-0439", offence: "Affray + assault PC", stage: "Trial-ish (index)", messiness: "Messy", hook: "Wrong name OCR on index" },
  { ref: "NS-CPS-2026-0440", offence: "Mixed counts: theft + blade + POA", stage: "PTPH", messiness: "Messy", hook: "Late email, forgot attachment" },
];

const FIRST = ["ALEX", "SAM", "TAYLOR", "MORGAN", "JORDAN", "ROWAN", "DANIEL", "EMMA", "OLIVER", "CHLOE", "MAYA", "LIAM", "KIAN", "CALLUM", "NEIL", "PAIGE", "ZARA", "VINCENT", "DECLAN", "AARON"];
const LAST = ["MORLEY", "REES", "FROST", "OKONKWO", "ELLIS", "THORNTON", "HASSAN", "MORGAN", "PRICE", "OSBORNE", "PATEL", "MURRAY", "REID", "FLETCHER", "MITCHELL", "SMITH", "OWEN", "WEST", "FOSTER", "DUNN", "MARTINEZ", "GRANT", "LEWIS", "BARNES", "MOORE", "CLARKE", "WRIGHT", "KEMP", "TURNER", "REEVES", "COLE", "PARKER", "BROOKS", "ADAMS", "MITCHELL2", "CLARK", "WRIGHT2", "COATES", "REES2", "ROSS"];

function refNum(ref) {
  const m = ref.match(/(\d{4})$/);
  return m ? parseInt(m[1], 10) : 0;
}

function pick(arr, n) {
  return arr[n % arr.length];
}

function mkDOB(n) {
  const year = 1980 + (n % 26); // 1980..2005
  const month = 1 + ((n >> 1) % 12); // 1..12
  const day = 1 + ((n >> 2) % 28); // 1..28
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}

function sectionHeading(title) {
  return `\n=== SECTION: ${title} ===\n`;
}

function buildBundle(c) {
  const n = refNum(c.ref);
  const accusedFirst = pick(FIRST, n);
  const accusedLast = pick(LAST, n);
  const otherFirst = pick(FIRST, n + 7);
  const otherLast = pick(LAST, n + 13);

  const accused = `${accusedFirst} ${accusedLast}`;
  const other = `${otherFirst} ${otherLast}`;
  const dobA = mkDOB(n);
  const dobB = mkDOB(n + 17);

  const messy = c.messiness.toLowerCase().includes("mess");
  const hasGBH = c.offence.toLowerCase().includes("gbh") || c.offence.includes("s.47") || c.offence.includes("s.18") || c.offence.includes("s.20");
  const hasRobbery = c.offence.toLowerCase().includes("robbery");
  const hasDrugs = c.offence.toLowerCase().includes("class a") || c.offence.toLowerCase().includes("drug driving") || c.offence.toLowerCase().includes("class b");

  const served999 = messy ? "served (extract)" : "served";
  const outstandingMaster999 = messy ? "full master audio outstanding" : "full audio served (with timestamp)";

  const cctvNote = messy ? "continuity issues flagged (draft / unsigned)" : "schedule tidy; continuity confirmed";
  const mg11Style = messy ? "draft statement (signature block pending)" : "signed statement";

  const chargeLine = `Offence(s) as tag: ${c.offence} (fictional charge drafting for test data).`;

  return [
    "================================================================================",
    "NORTHSHIRE CPS / POLICE — FICTIONAL BUNDLE (TEST DATA ONLY)",
    "================================================================================",
    `Reference: ${c.ref}`,
    `Short title: ${c.offence}`,
    `Accused: ${accused} (DOB ${dobA})`,
    `Other party / key witness: ${other} (DOB ${dobB})`,
    `Stage: ${c.stage} | Messiness: ${c.messiness}`,
    `Primary eval hook: ${c.hook}`,
    "================================================================================",
    "",
    "NOTE: This is fictional training data. It is not legal advice and not a real disclosure bundle.",
    "",
    sectionHeading("COVER_INDEX"),
    "INDEX (fictional)",
    "",
    "Document                                              | Note",
    "------------------------------------------------------|------------------------------",
    "Charge sheet extract                                  | Below",
    "MG5 — Case summary                                    | Draft narrative",
    "MG6(a) — Schedule of initial disclosure              | Served vs outstanding",
    "MG11 — Key witness statement                          | Served (possibly draft)",
    "CCTV / 999 / CAD / BWV                               | One or more items with tension",
    "Interview summary                                     | Fictional extract",
    "Disclosure chase note                                 | Fictional email / letter",
    "Exhibit list                                          | EX- style refs",
    "",
    sectionHeading("CHARGE"),
    "CHARGE SHEET — EXTRACT (FICTION)",
    "",
    `Defendant: ${accused}`,
    chargeLine,
    "",
    "Plea: Not guilty (fictional).",
    "",
    sectionHeading("MG5"),
    "MG5 — CASE SUMMARY (DRAFT)",
    "",
    `Allegation (fiction): At a Northshire location matching the offence tag, the Crown say events unfolded in a way consistent with ${c.offence}.`,
    `The defence account (fiction): denies the core allegation or disputes the precise mechanics (e.g. push vs punch, or intent vs recklessness).`,
    `Grounds for dispute / friction (fiction): ${c.hook}.`,
    "",
    hasRobbery ? "The Crown suggest force used in the course of the theft; the defence disputes intent and identification." : "",
    hasGBH ? "Injury narrative (fiction): medical category threshold is met; causation and sequence are argued." : "",
    hasDrugs ? "Drug narrative (fiction): possession/supply issue hinges on messages / context rather than only the bag in isolation." : "",
    "",
    messy ? "CCTV / tech: at least one timing, continuity, or extraction issue appears in the schedule." : "CCTV / tech: schedule appears consistent and served tidily.",
    "",
    sectionHeading("MG6"),
    "MG6(a) — SCHEDULE OF INITIAL DISCLOSURE (FICTION)",
    "",
    "Category                        | Served (initial)                        | Awaiting / Retained / Note",
    "--------------------------------|------------------------------------------|----------------------------------------",
    "MG5 case summary                | yes (draft)                             | final after reconciliation",
    "MG11 key witness                | yes (possibly draft)                   | signed copy if draft",
    "CCTV / footage list             | yes (partial / served)                  | continuity statement / engineer note",
    "999 calls                       | " + served999 + "                 | " + outstandingMaster999,
    "CAD / dispatch                  | partial print served                    | fuller narrative attachment",
    "Forensics / medical             | strategy note served                     | lab report / GP records",
    messy
      ? "Continuity / chain               | draft or unsigned                         | corrected continuity to be provided"
      : "Continuity / chain               | confirmed                                  | none",
    "",
    `Example “tension” note (fiction): ${c.hook}.`,
    "",
    sectionHeading("MG11"),
    "MG11 — KEY WITNESS STATEMENT (EXTRACT)",
    "",
    `Status marker (fiction): ${mg11Style}.`,
    "I describe what I saw / heard as best as I can. I am aware that some timing and detail may be uncertain.",
    "I mention that CCTV and/or 999 material exists but that the version served might be incomplete or extracted.",
    "",
    sectionHeading("CCTV_999_CAD"),
    "CCTV / 999 / CAD / BWV — EXTRACTS (FICTION)",
    "",
    `CCTV note: ${cctvNote}.`,
    "999 note: partial extract served; full master awaited or flagged for reconciliation.",
    "CAD note: dispatch line present; fuller log or narrative attachment listed on MG6.",
    "",
    sectionHeading("DISCLOSURE"),
    "DISCLOSURE CHASE — EXTRACT (FICTION)",
    "",
    "Email: “Please confirm outstanding items so we can update the MG5 narrative and reconcile the schedule before next hearing.”",
    "",
    sectionHeading("INTERVIEW"),
    "INTERVIEW SUMMARY — IR-### (FICTIONAL EXTRACT)",
    "",
    "Caution given. Defendant gives partial account: denies core allegation or claims alternative explanation.",
    "No comment on certain technical matters; requests full disclosure of the CCTV/999 scope.",
    "",
    sectionHeading("EXHIBITS"),
    "EXHIBIT LIST (FICTION)",
    "",
    `EX-CCTV-${String(n % 90 + 10).padStart(2, "0")} (served)`,
    `EX-999-TXT (extract; served)`,
    `EX-CAD-${(800000 + (n % 999999)).toString().slice(0, 6)} (partial print)`,
    `EX-MG6-EMAIL (chase)`,
    "",
    "================================================================================",
    `END OF FILE — ${c.ref}`,
    "================================================================================",
    "",
  ].join("\n");
}

function refToTitle(ref) {
  const c = CASES.find((x) => x.ref === ref);
  return c ? c.offence : ref;
}

function main() {
  fs.mkdirSync(DOCS_DIR, { recursive: true });

  // 1) Create/keep sources
  for (const c of CASES) {
    const out = path.join(DOCS_DIR, `${c.ref}.txt`);
    if (fs.existsSync(out)) continue;
    fs.writeFileSync(out, buildBundle(c), "utf8");
    console.log("Wrote", path.relative(process.cwd(), out));
  }

  // 2) Build combined master
  const outPieces = [];
  outPieces.push([
    "================================================================================",
    "CASEBRAIN — FICTIONAL BUNDLE (NORTHSHIRE STYLE) — CASES 1-40",
    "================================================================================",
    "Source of truth: docs/fictional-cases-40/NS-CPS-2026-XXXX.txt files",
    "Fictional only. Not legal advice.",
    "================================================================================",
    "",
  ].join("\n"));

  for (let i = 401; i <= 440; i++) {
    const ref = `NS-CPS-2026-${String(i).padStart(4, "0")}`;
    const f = path.join(DOCS_DIR, `${ref}.txt`);
    if (!fs.existsSync(f)) {
      // This should not happen (we attempt to generate all), but keep the master consistent.
      outPieces.push(`\n████ CASE MISSING: ${ref} — add source .txt ████\n`);
      continue;
    }
    const title = refToTitle(ref);
    outPieces.push(`\n████████████████████████████████████████████████████████████████████████████████\nCASE INDEX: ${ref} — ${title}\n████████████████████████████████████████████████████████████████████████████████\n\n<<< CASE START | ${ref} | ${title} >>>\n\n`);
    const content = fs.readFileSync(f, "utf8").trimEnd();
    outPieces.push(content);
    outPieces.push(`\n\n<<< CASE END | ${ref} >>>\n`);
  }

  outPieces.push("\n================================================================================\nEND OF FILE — CASES 1-40\n================================================================================\n");
  fs.writeFileSync(MASTER_OUT, outPieces.join(""), "utf8");
  console.log("Wrote", path.relative(process.cwd(), MASTER_OUT));
}

try {
  main();
} catch (e) {
  console.error(e);
  process.exit(1);
}

