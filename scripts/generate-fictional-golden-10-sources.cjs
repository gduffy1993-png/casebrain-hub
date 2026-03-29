/**
 * Generate a curated "golden 10" fictional bundle set for regression.
 *
 * Produces:
 * - docs/fictional-golden-10/NS-CPS-2026-XXXX.txt (10 files)
 * - docs/fictional-golden-10/GOLDEN_10_INDEX.md
 * - docs/fictional-golden-10/GOLDEN_10_QUESTION_PACK.md
 */
const fs = require("fs");
const path = require("path");

const OUT_DIR = path.join(__dirname, "../docs/fictional-golden-10");

const CASES = [
  {
    ref: "NS-CPS-2026-0431",
    title: "Theft person (snatch)",
    stage: "Initial",
    messiness: "Messy",
    hook: "Victim timeline slip",
    accused: "JORDAN MORLEY",
    accusedDob: "11/04/2001",
    witness: "EMMA PRICE",
    witnessDob: "03/01/1995",
    mg11Status: "draft statement (signature block pending)",
    cctvNote: "continuity issue flagged; one camera clock offset noted in schedule",
    n999Served: "served (extract)",
    n999Awaited: "full master audio outstanding",
    continuityServed: "draft or unsigned",
    continuityAwaited: "corrected continuity to be provided",
    exhibits: ["EX-CCTV-81 (served)", "EX-999-TXT (extract; served)", "EX-CAD-800431 (partial print)", "EX-MG6-EMAIL (chase)"],
  },
  {
    ref: "NS-CPS-2026-0432",
    title: "s.47 ABH domestic-flavoured",
    stage: "Initial",
    messiness: "Messy",
    hook: "Medical schedule only",
    accused: "PAIGE THORNTON",
    accusedDob: "25/02/1999",
    witness: "TAYLOR FLETCHER",
    witnessDob: "02/11/1990",
    mg11Status: "draft statement (signature block pending)",
    cctvNote: "continuity issue flagged; extract timestamp notes pending",
    n999Served: "served (extract)",
    n999Awaited: "full master audio outstanding",
    continuityServed: "draft or unsigned",
    continuityAwaited: "corrected continuity to be provided",
    exhibits: ["EX-CCTV-82 (served)", "EX-999-TXT (extract; served)", "EX-CAD-800432 (partial print)", "EX-MG6-EMAIL (chase)"],
  },
  {
    ref: "NS-CPS-2026-0433",
    title: "Possession offensive weapon (non-blade)",
    stage: "First appearance",
    messiness: "Clean-ish",
    hook: "Work tool defence",
    accused: "DECLAN REES",
    accusedDob: "26/04/2002",
    witness: "DANIEL REID",
    witnessDob: "03/01/1994",
    mg11Status: "signed statement",
    cctvNote: "continuity confirmed by engineer note",
    n999Served: "served (extract)",
    n999Awaited: "full master audio outstanding",
    continuityServed: "confirmed",
    continuityAwaited: "none",
    exhibits: ["EX-CCTV-83 (served)", "EX-999-TXT (extract; served)", "EX-CAD-800433 (partial print)", "EX-MG6-EMAIL (chase)"],
  },
  {
    ref: "NS-CPS-2026-0434",
    title: "Fraud retail refund",
    stage: "Initial",
    messiness: "Messy",
    hook: "MG5 amount vs MG11 amount",
    accused: "NEIL MITCHELL",
    accusedDob: "12/08/1998",
    witness: "CHLOE MORGAN",
    witnessDob: "14/06/1992",
    mg11Status: "draft statement (signature block pending)",
    cctvNote: "continuity issue flagged; till-camera extraction note pending",
    n999Served: "served (extract)",
    n999Awaited: "full master audio outstanding",
    continuityServed: "draft or unsigned",
    continuityAwaited: "corrected continuity to be provided",
    exhibits: ["EX-CCTV-84 (served)", "EX-999-TXT (extract; served)", "EX-CAD-800434 (partial print)", "EX-MG6-EMAIL (chase)"],
    extraMg5: [
      "Amount tension (fiction): MG5 records alleged loss at £420; MG11 witness account refers to £460.",
      "Reconciliation note (fiction): CPS email requests schedule update confirming which amount is relied on.",
    ],
  },
  {
    ref: "NS-CPS-2026-0435",
    title: "Public order s.4 + criminal damage",
    stage: "PTPH",
    messiness: "Messy",
    hook: "Contradictory officer summaries",
    accused: "PAIGE CLARK",
    accusedDob: "25/02/1999",
    witness: "TAYLOR PRICE",
    witnessDob: "02/11/1990",
    mg11Status: "draft statement (signature block pending)",
    cctvNote: "continuity issue flagged (draft / unsigned)",
    n999Served: "served (extract)",
    n999Awaited: "full master audio outstanding",
    continuityServed: "draft or unsigned",
    continuityAwaited: "corrected continuity to be provided",
    exhibits: ["EX-CCTV-85 (served)", "EX-999-TXT (extract; served)", "EX-CAD-800435 (partial print)", "EX-MG6-EMAIL (chase)"],
  },
  {
    ref: "NS-CPS-2026-0436",
    title: "Drug driving",
    stage: "Initial",
    messiness: "Clean",
    hook: "Metadata optional",
    accused: "ZARA WRIGHT",
    accusedDob: "01/03/2000",
    witness: "ROWAN MURRAY",
    witnessDob: "02/12/1993",
    mg11Status: "signed statement",
    cctvNote: "schedule tidy; continuity confirmed",
    n999Served: "served",
    n999Awaited: "full audio served (with timestamp)",
    continuityServed: "confirmed",
    continuityAwaited: "none",
    exhibits: ["EX-CCTV-86 (served)", "EX-999-TXT (extract; served)", "EX-CAD-800436 (partial print)", "EX-MG6-EMAIL (chase)"],
    extraMg5: [
      "Drug-driving detail (fiction): issue turns on roadside signs, timing, and toxicology continuity, not possession/supply allegations.",
    ],
  },
  {
    ref: "NS-CPS-2026-0437",
    title: "Burglary dwelling + s.47",
    stage: "Initial",
    messiness: "Messy",
    hook: "Multi-victim order muddled",
    accused: "VINCENT COATES",
    accusedDob: "18/09/1997",
    witness: "EMMA FLETCHER",
    witnessDob: "03/01/1995",
    mg11Status: "draft statement (signature block pending)",
    cctvNote: "continuity issue flagged; hallway camera segment pending",
    n999Served: "served (extract)",
    n999Awaited: "full master audio outstanding",
    continuityServed: "draft or unsigned",
    continuityAwaited: "corrected continuity to be provided",
    exhibits: ["EX-CCTV-87 (served)", "EX-999-TXT (extract; served)", "EX-CAD-800437 (partial print)", "EX-MG6-EMAIL (chase)"],
    extraMg5: [
      "Victim order note (fiction): witness sequence appears inconsistent between first account and later summary; schedule marks for reconciliation.",
    ],
  },
  {
    ref: "NS-CPS-2026-0438",
    title: "Handling stolen goods",
    stage: "First appearance",
    messiness: "Messy",
    hook: "Third party Carl",
    accused: "DECLAN REES",
    accusedDob: "26/04/2002",
    witness: "ROWAN MURRAY",
    witnessDob: "02/12/1993",
    mg11Status: "draft statement (signature block pending)",
    cctvNote: "continuity issues flagged (draft / unsigned)",
    n999Served: "served (extract)",
    n999Awaited: "full master audio outstanding",
    continuityServed: "draft or unsigned",
    continuityAwaited: "corrected continuity to be provided",
    exhibits: ["EX-CCTV-88 (served)", "EX-999-TXT (extract; served)", "EX-CAD-800438 (partial print)", "EX-MG6-EMAIL (chase)"],
  },
  {
    ref: "NS-CPS-2026-0439",
    title: "Affray + assault PC",
    stage: "Trial-ish (index)",
    messiness: "Messy",
    hook: "Wrong name OCR on index",
    accused: "AARON ROSS",
    accusedDob: "26/04/2003",
    witness: "DANIEL REID",
    witnessDob: "03/01/1994",
    mg11Status: "draft statement (signature block pending)",
    cctvNote: "continuity issues flagged (draft / unsigned)",
    n999Served: "served (extract)",
    n999Awaited: "full master audio outstanding",
    continuityServed: "draft or unsigned",
    continuityAwaited: "corrected continuity to be provided",
    exhibits: ["EX-CCTV-89 (served)", "EX-999-TXT (extract; served)", "EX-CAD-800439 (partial print)", "EX-MG6-EMAIL (chase)"],
  },
  {
    ref: "NS-CPS-2026-0440",
    title: "Mixed counts: theft + blade + POA",
    stage: "PTPH",
    messiness: "Messy",
    hook: "Late email, forgot attachment",
    accused: "ALEX MORLEY",
    accusedDob: "27/05/2004",
    witness: "EMMA FLETCHER",
    witnessDob: "03/01/1995",
    mg11Status: "draft statement (signature block pending)",
    cctvNote: "continuity issues flagged (draft / unsigned)",
    n999Served: "served (extract)",
    n999Awaited: "full master audio outstanding",
    continuityServed: "draft or unsigned",
    continuityAwaited: "corrected continuity to be provided",
    exhibits: ["EX-CCTV-90 (served)", "EX-999-TXT (extract; served)", "EX-CAD-800440 (partial print)", "EX-MG6-EMAIL (chase)"],
  },
];

function heading(title) {
  return `\n=== SECTION: ${title} ===\n`;
}

function buildBundle(c) {
  const mg5Lines = [
    `Allegation (fiction): At a Northshire location, the Crown allege conduct consistent with ${c.title}.`,
    "The defence account (fiction): denies the core allegation or disputes the precise mechanics where relevant.",
    `Grounds for dispute / friction (fiction): ${c.hook}.`,
    "CCTV / tech: see MG6 and extracts for served vs outstanding detail.",
    ...(c.extraMg5 || []),
  ];

  return [
    "===============================================================================",
    "NORTHSHIRE CPS / POLICE — FICTIONAL BUNDLE (TEST DATA ONLY)",
    "===============================================================================",
    `Reference: ${c.ref}`,
    `Short title: ${c.title}`,
    `Accused: ${c.accused} (DOB ${c.accusedDob})`,
    `Other party / key witness: ${c.witness} (DOB ${c.witnessDob})`,
    `Stage: ${c.stage} | Messiness: ${c.messiness}`,
    `Primary eval hook: ${c.hook}`,
    "===============================================================================",
    "",
    "NOTE: This is fictional training data. It is not legal advice and not a real disclosure bundle.",
    heading("COVER_INDEX"),
    "INDEX (fictional)",
    "",
    "Document                                              | Note",
    "------------------------------------------------------|------------------------------",
    "Charge sheet extract                                  | Below",
    "MG5 — Case summary                                    | Draft narrative",
    "MG6(a) — Schedule of initial disclosure              | Served vs outstanding",
    "MG11 — Key witness statement                          | Status marker included",
    "CCTV / 999 / CAD / BWV                               | Extract notes",
    "Interview summary                                     | Fictional extract",
    "Disclosure chase note                                 | Fictional email / letter",
    "Exhibit list                                          | Verbatim EX- refs",
    heading("CHARGE"),
    "CHARGE SHEET — EXTRACT (FICTION)",
    `Defendant: ${c.accused}`,
    `Offence(s) as tag: ${c.title} (fictional charge drafting for test data).`,
    "Plea: Not guilty (fictional).",
    heading("MG5"),
    "MG5 — CASE SUMMARY (DRAFT)",
    ...mg5Lines,
    heading("MG6"),
    "MG6(a) — SCHEDULE OF INITIAL DISCLOSURE (FICTION)",
    "Category                        | Served (initial)                        | Awaiting / Retained / Note",
    "--------------------------------|------------------------------------------|----------------------------------------",
    "MG5 case summary                | yes (draft)                             | final after reconciliation",
    `MG11 key witness                | ${c.mg11Status.includes("signed") ? "yes (signed)" : "yes (possibly draft)"}                      | ${c.mg11Status.includes("signed") ? "none" : "signed copy if draft"}`,
    "CCTV / footage list             | yes (partial / served)                  | continuity statement / engineer note",
    `999 calls                       | ${c.n999Served}                               | ${c.n999Awaited}`,
    "CAD / dispatch                  | partial print served                    | fuller narrative attachment",
    "Forensics / medical             | strategy note served                    | lab report / GP records",
    `Continuity / chain               | ${c.continuityServed}                           | ${c.continuityAwaited}`,
    `Example “tension” note (fiction): ${c.hook}.`,
    heading("MG11"),
    "MG11 — KEY WITNESS STATEMENT (EXTRACT)",
    `Status marker (fiction): ${c.mg11Status}.`,
    "I describe what I saw / heard as best as I can. I am aware that some timing and detail may be uncertain.",
    "I mention that CCTV and/or 999 material exists but that the version served might be incomplete or extracted.",
    heading("CCTV_999_CAD"),
    "CCTV / 999 / CAD / BWV — EXTRACTS (FICTION)",
    `CCTV note: ${c.cctvNote}.`,
    "999 note: partial extract served; full master awaited or flagged for reconciliation.",
    "CAD note: dispatch line present; fuller log or narrative attachment listed on MG6.",
    heading("DISCLOSURE"),
    "DISCLOSURE CHASE — EXTRACT (FICTION)",
    "Email: “Please confirm outstanding items so we can update the MG5 narrative and reconcile the schedule before next hearing.”",
    heading("INTERVIEW"),
    "INTERVIEW SUMMARY — IR-### (FICTIONAL EXTRACT)",
    "Caution given. Defendant gives partial account: denies core allegation or claims alternative explanation.",
    "No comment on certain technical matters; requests full disclosure of the CCTV/999 scope.",
    heading("EXHIBITS"),
    "EXHIBIT LIST (FICTION)",
    ...c.exhibits,
    "===============================================================================",
    `END OF FILE — ${c.ref}`,
    "===============================================================================",
    "",
  ].join("\n");
}

function buildIndex() {
  const rows = CASES.map(
    (c, i) =>
      `| ${i + 1} | ${c.ref} | ${c.title} | ${c.hook} | ${c.stage} | ${c.messiness} |`
  );
  return [
    "# Golden 10 Fictional Bundles",
    "",
    "Use this set for rapid regression after prompt/app changes.",
    "",
    "| # | Ref | Offence tag | Primary eval hook | Stage | Messiness |",
    "|---|-----|-------------|-------------------|-------|-----------|",
    ...rows,
    "",
    "## Notes",
    "- All bundles use the same section structure so question batteries are reusable.",
    "- Each case has one explicit hook for targeted checks.",
    "- Exhibit refs are fixed verbatim to support strict grounding tests.",
    "",
  ].join("\n");
}

function buildQuestionPack() {
  return [
    "# Golden 10 Question Pack",
    "",
    "Run in two batches (Q1-5, then Q6-10) to reduce truncation risk.",
    "",
    "## Core 10",
    "1. Served / outstanding — From MG6 + CCTV/999/CAD only, list served vs partial/extract vs draft/unsigned vs awaited.",
    "2. Charge — State offence tag(s) and plea from charge extract.",
    "3. Hook — Where does the hook appear (MG5/MG6/both), and is it defined or only flagged?",
    "4. Offence fit — Does MG5 wording actually fit this offence/count structure, or is any line generic boilerplate?",
    "5. MG11 — Exact status and what witness says about uncertainty / CCTV-999 completeness.",
    "6. CCTV/999/CAD — Three separate short paragraphs (no flattening).",
    "7. Interview — Admit/deny/leave open + CCTV/999 scope from interview summary only.",
    "8. Chase — What is being requested and why, tied to MG5 vs schedule reconciliation.",
    "9. Exhibits — List every EX- ref verbatim with one-line descriptor; no placeholders.",
    "10. Client-safe — <=8 sentence plain-English summary: allegation, disclosure gaps, one priority next step.",
    "",
    "## Pass/Fail Quick Checks",
    "- No invented exhibit IDs.",
    "- No dropped MG6 rows.",
    "- Interview answer matches summary lines.",
    "- Distinguishes CCTV vs 999 vs CAD tension.",
    "",
  ].join("\n");
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const c of CASES) {
    const out = path.join(OUT_DIR, `${c.ref}.txt`);
    fs.writeFileSync(out, buildBundle(c), "utf8");
    console.log("Wrote", path.relative(process.cwd(), out));
  }

  fs.writeFileSync(path.join(OUT_DIR, "GOLDEN_10_INDEX.md"), buildIndex(), "utf8");
  console.log("Wrote", path.relative(process.cwd(), path.join(OUT_DIR, "GOLDEN_10_INDEX.md")));

  fs.writeFileSync(path.join(OUT_DIR, "GOLDEN_10_QUESTION_PACK.md"), buildQuestionPack(), "utf8");
  console.log("Wrote", path.relative(process.cwd(), path.join(OUT_DIR, "GOLDEN_10_QUESTION_PACK.md")));
}

try {
  main();
} catch (err) {
  console.error(err);
  process.exit(1);
}
