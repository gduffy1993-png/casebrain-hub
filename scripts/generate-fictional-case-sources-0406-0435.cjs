/**
 * One-off generator: writes Tier B fictional bundle .txt files for NS-CPS-2026-0406 … 0435.
 * Run: node scripts/generate-fictional-case-sources-0406-0435.cjs
 */
const fs = require("fs");
const path = require("path");

const DOCS_DIR = path.join(__dirname, "../docs/fictional-cases-40");

/** @type {Array<{ n: number, short: string, acc: string, comp?: string, charges: string, stage: string, messy: string, hook: string, body: string }>} */
const CASES = [
  {
    n: 406,
    short: "Market Square POA (s.4)",
    acc: "Liam THORNTON (DOB 11/02/1996)",
    comp: "Marcus BELL (DOB 04/08/1993)",
    charges: "Section 4 Public Order Act 1986 — fear or provoke violence (fiction).",
    stage: "PTPH-style",
    messy: "clean-ish",
    hook: "Complainant heavily intoxicated; partial CAD; witness credibility.",
    body: `INCIDENT (FICTION): Argument outside The Copper Kettle, Market Square, Eastmere, 19/10/2025 ~23:40. Bell alleges Thornton shouted threats and raised fists; Thornton says Bell was aggressive first.

MG5 — Crown say Bell called 999; Thornton left before arrival. Partial CAD print served — full narrative attachment listed as outstanding on MG6.

MG11 — Marcus Bell — states fear of violence; admits "several pints and shorts"; timeline approximate.

MG11 — PC 6612 Reed — attendance only; no independent witness to opening words.

MG6 — CAD partial **served**; full CAD PDF **awaiting**; CCTV from pub **not retained** (camera U/S that week per schedule).

999 — **Served** — call fragmented; background noise noted.

Interview — IR-090 — partial comment; denies intending fear; self-defence of words disputed.`,
  },
  {
    n: 407,
    short: "SuperSave — theft + assault security",
    acc: "Aisha KHAN (DOB 30/01/2001)",
    comp: "Security: Dean FROST (fiction)",
    charges: "Theft from shop; common assault (on security) — fiction.",
    stage: "Initial disclosure",
    messy: "messy",
    hook: "OCR-style MG11 — line breaks and suspect DOB typo on scan.",
    body: `MG11 — Dean Frost — **scan quality poor** — footer reads "suspect DOB 30/01/1001" — obvious OCR error; body text refers to "concealment of spirits" then line break mid-sentence.

MG5 — Summary references item codes SS-7781/82; MG6 row "till roll" **awaiting**; defence chase expected.

CCTV — **Served** — blind spot at aisle 4 noted on continuity draft.

MG6 — two versions on disk — use **v2** dated 14/11/2025 only.`,
  },
  {
    n: 408,
    short: "Criminal damage — vehicle mirror",
    acc: "Jordan ELLIS (DOB 07/12/1999)",
    comp: "Taylor MORGAN (fiction)",
    charges: "Criminal Damage Act 1971 — damage to wing mirror.",
    stage: "Initial",
    messy: "clean",
    hook: "Tidy MG6; straightforward schedule.",
    body: `MG5 — Single incident 02/12/2025 car park Riverdale; mirror kicked; value under threshold for separate count (fiction).

MG6(a) — **Neat table** — witness, photos, CAD, MG11 all **served**; third-party dashcam **not retained** (not relevant).

MG11 — Taylor Morgan — short statement; photo ID of damage served.

Photos — EX-PHOTO-01 to 03 — indexed.`,
  },
  {
    n: 409,
    short: "Assault police + resist",
    acc: "Connor PRICE (DOB 18/05/1994)",
    comp: "PC 9021 Walsh / PC 9034 Nkrumah",
    charges: "Assault PC; resist arrest — fiction.",
    stage: "PTPH",
    messy: "messy",
    hook: "BWV segment corrupted / missing key seconds.",
    body: `MG5 — Street stop 08/01/2026; struggle; handcuffs applied; minor injury to PC Walsh forearm.

BODY-WORN — Log lists file BWV-WALSH-0801-**SEG-A** — **technical note**: "container checksum fail — re-export requested" — **key 12 seconds between restraint and ground not recovered** on served copy.

MG6 — BWV **partially served**; re-export **awaiting**; custody CCTV **served**.

MG11 — PCs Walsh & Nkrumah — use of force proportionality disputed by defence.`,
  },
  {
    n: 410,
    short: "Attempted robbery — late ATM",
    acc: "Ryan OSBORNE (DOB 22/09/1998)",
    comp: "Priya DEV (fiction)",
    charges: "Attempted robbery s.8 Theft Act 1968 (fiction).",
    stage: "Initial",
    messy: "messy",
    hook: "Two MG6 schedules bear different disclosure completion dates — which is current?",
    body: `MG6(a) v1 dated **03/12/2025** — row "phone download" **outstanding**.
MG6(a) v2 dated **10/12/2025** — same row marked **served** — **OIC email** says v2 supersedes; v1 still in defence drop by error — **reconcile**.

MG5 — ATM forecourt; demand for cash; complainant retained card; no injury charged beyond assault if added (fiction).

CCTV — **Served** — partial plate read.`,
  },
  {
    n: 411,
    short: "Fraud — false representation (low value)",
    acc: "Nina PATEL (DOB 14/03/1988)",
    charges: "Fraud by false representation, Fraud Act 2006 (fiction).",
    stage: "Initial",
    messy: "messy",
    hook: "Bank schedule incomplete — pages missing from pack.",
    body: `MG5 — Online purchase using card details; retailer chargeback; bank statements **partially served** — **pages 4–6 missing** from PDF bundle; MG6 notes **full statement awaiting**.

MG11 — Fraud investigator (fiction) — summary only; spreadsheet annex **password protected** on disc — password chase open.

Email CPS→bank 20/11/2025 — request complete schedule.`,
  },
  {
    n: 412,
    short: "s.18 GBH — alternative suspect",
    acc: "Kyle MURRAY (DOB 03/11/1992)",
    comp: "Owen HUGHES (fiction)",
    charges: "s.18 OAPA 1861 — fiction.",
    stage: "Trial-prep index extract",
    messy: "messy",
    hook: "Wrong name on index OCR; third-party suspect named in unused.",
    body: `INDEX — Page header OCR: "R v **Mursey**" — typo for Murray.

MG5 — Nightclub glassing; alternative suspect "Lee T" named in unused material summary — **not** in main MG11 pack initially — MG6 row **unused schedule v2 served under separate cover**.

MG6 — Used / unused split; defence request full unused schedule — **partially served**.`,
  },
  {
    n: 413,
    short: "s.47 ABH — pub scuffle",
    acc: "Scott REID (DOB 29/06/1997)",
    comp: "Jamie COATES (fiction)",
    charges: "s.47 OAPA — ABH.",
    stage: "Initial",
    messy: "clean",
    hook: "Optional clean harness — minimal contradiction.",
    body: `MG5 — Pool table dispute; punch; split lip; A&E glue.

MG6 — Straightforward — MG11s, CCTV, medical **served**.

CASEBRAIN_BUNDLE_METADATA may be used on this file for clean tests — fictional flag true.`,
  },
  {
    n: 414,
    short: "Harassment / stalking (generic)",
    acc: "Ben FLETCHER (DOB 09/01/1990)",
    comp: "Emma VAUGHAN (fiction)",
    charges: "Harassment contrary to Protection from Harassment Act 1997 (fiction).",
    stage: "PTPH",
    messy: "messy",
    hook: "MG11 complainant — draft; signature awaited.",
    body: `MG11 — Emma Vaughan — **DRAFT** — typed name; signature line blank.

MG5 — Repeated messages and drive-past allegations; phone download **served** in part; full download log **awaiting**.

MG6 — Schedule notes **final signed MG11 awaited** before PTPH.`,
  },
  {
    n: 415,
    short: "Burglary non-dwelling — builder's yard",
    acc: "Tariq HASSAN (DOB 16/04/1999)",
    charges: "Burglary non-dwelling s.9 Theft Act 1968 (fiction).",
    stage: "Initial",
    messy: "messy",
    hook: "Third-party insurer schedule — civil — disclosure tension.",
    body: `MG5 — Tools taken from locked container; value disputed.

MG6 — **Insurer schedule** — third party — **not in prosecution control** — summary line only; full schedule **awaiting** consent.

MG11 — Site manager — continuity of container lock **draft** statement.`,
  },
  {
    n: 416,
    short: "Bladed article — public place",
    acc: "Jay SMITH (DOB 02/02/2003)",
    charges: "s.139 Criminal Justice Act 1988 — bladed article (fiction).",
    stage: "First appearance",
    messy: "clean-ish",
    hook: "ID from poor lighting; single officer MG11.",
    body: `MG5 — Stop on footbridge 21:10; knife in bag; accused says forgot after work.

MG11 — PC 4451 Dean — lighting described as "orange sodium"; **distance 8m** when object seen.

MG6 — Photographs of scene lighting **served**; defence may argue mistaken observation.

Custody — booking only; interview summary served.`,
  },
  {
    n: 417,
    short: "Careless driving + assault at scene",
    acc: "Melissa OWEN (DOB 11/11/1987)",
    comp: "Other driver: Greg Pike (fiction)",
    charges: "Careless driving; common assault — fiction.",
    stage: "Initial",
    messy: "messy",
    hook: "Notebook times vs CAD dispatch.",
    body: `MG11 — PC 2201 Shaw — pocket notebook **22:14** first note.

CAD — Dispatch log **22:09** — **discrepancy** flagged in officer commentary box — explanation "clock not synced" — jury issue.

MG5 — Minor RTC; alleged slap to face at roadside.

MG6 — CAD **served**; officer notebook **full scan awaiting** (pages 2–3).`,
  },
  {
    n: 418,
    short: "Affray — car park",
    acc: "Dylan WEST (DOB 08/08/1995)",
    charges: "Affray — Public Order Act 1986 (fiction).",
    stage: "PTPH",
    messy: "messy",
    hook: "Joint enterprise narrative; multiple MG11s conflict on who threw first punch.",
    body: `MG5 — Group fight; three arrested; West identified from clothing.

MG11 — Witness A says West threw first; Witness B says unknown male in grey hoodie.

MG6 — Unused material references **third co-acc** — schedule **partially served** — tension.

CCTV — **Served** — faces obscured.`,
  },
  {
    n: 419,
    short: "Theft of motor vehicle",
    acc: "Luke FOSTER (DOB 19/12/2000)",
    charges: "Theft of motor vehicle — fiction.",
    stage: "Initial",
    messy: "clean",
    hook: "Metadata optional clean case.",
    body: `MG5 — Vehicle taken from driveway; recovered ANPR; keys allegedly not taken with consent.

MG6 — Tidy — tracker data **served**; MG11 owner **served**.

CASEBRAIN optional metadata: clean_test true.`,
  },
  {
    n: 420,
    short: "s.5 POA — disorderly in residential street",
    acc: "Harvey DUNN (DOB 25/03/1993)",
    charges: "Section 5 Public Order Act 1986 (fiction).",
    stage: "Initial",
    messy: "messy",
    hook: "999 recording gap — middle of call missing on served copy.",
    body: `999 — **Served extract** — metadata shows **45s gap** mid-call — MG6 notes **master tape requested**; defence letter asks for continuity.

MG5 — Loud shouting; residents; no injury.

MG11 — Neighbour — hears only; no visual ID.`,
  },
  {
    n: 421,
    short: "Possession Class A — passenger",
    acc: "Sofia MARTINEZ (DOB 06/06/1998)",
    charges: "Possession Class A — fiction.",
    stage: "First appearance",
    messy: "messy",
    hook: "MG6 suggests passenger ID from glovebox disputed vs driver.",
    body: `MG5 — Vehicle stop; drugs in centre console; two occupants; Crown say Martinez knew.

MG6 — Row "occupant statements" — **MG11 driver served**; **passenger MG11** listed **draft** — **who had knowledge** live issue.

Interview — Martinez — no comment.`,
  },
  {
    n: 422,
    short: "Criminal damage + s.4A course of conduct",
    acc: "Oliver GRANT (DOB 01/01/1991)",
    charges: "Criminal damage; s.4A POA — fiction.",
    stage: "PTPH",
    messy: "messy",
    hook: "Bundle index page numbers wrong — page 12 of 9 style error.",
    body: `COVER INDEX — Footer: "Page 0012 of 0009" — bundle assembly error.

MG5 — Two incidents; window then vehicle scratch; course alleged.

MG6 — Same index problem on schedule PDF — use **filename** not footer for pagination.`,
  },
  {
    n: 423,
    short: "Robbery — shop till",
    acc: "Marcus LEWIS (DOB 13/07/1997)",
    charges: "Robbery s.8 Theft Act 1968 (fiction).",
    stage: "Initial",
    messy: "clean-ish",
    hook: "ID parade conducted — MG11 officer describes procedure.",
    body: `MG5 — Till snatch; minor injury to cashier.

MG11 — ID officer — parade procedure; **served**; defence reserve on fairness.

CCTV — **Served** — full chain.

MG6 — **Complete** initial tranche.`,
  },
  {
    n: 424,
    short: "Theft — pedal cycle",
    acc: "Theo BARNES (DOB 28/04/2002)",
    charges: "Theft — pedal cycle — fiction.",
    stage: "Initial",
    messy: "clean",
    hook: "Metadata optional.",
    body: `MG5 — Bike locked to rack; cut lock; recovered at second-hand stall.

MG6 — Straightforward; photos **served**.

CASEBRAIN optional metadata: clean_test true.`,
  },
  {
    n: 425,
    short: "Common assault — pub",
    acc: "Gareth MOORE (DOB 15/07/1989)",
    comp: "Bar staff / victim — fiction",
    charges: "Common assault — fiction.",
    stage: "First appearance",
    messy: "messy",
    hook: "Stills shown before formal ID procedure — defence challenge.",
    body: `MG5 — Pool cue argument; push; no medical.

Disclosure — **Still image** from CCTV shown to complainant **before** VIPER — MG6 row "ID procedure" — **sequence challenge** noted in defence letter.

MG11 — Complainant — picked from still then attended procedure — timeline on disclosure letter.`,
  },
  {
    n: 426,
    short: "Dangerous driving",
    acc: "Imogen CLARKE (DOB 03/03/1994)",
    charges: "Dangerous driving — Road Traffic Act 1988 (fiction).",
    stage: "PTPH",
    messy: "messy",
    hook: "ANPR hit partial — wrong plate variant on first read.",
    body: `MG5 — High-speed overtakes; undertaking; no collision.

MG6 — ANPR log **served** — first line **partial plate** — second line full match — officer explanation on MG11.

Dashcam — third party — **awaiting** consent.`,
  },
  {
    n: 427,
    short: "Aggravated vehicle taking (fiction label)",
    acc: "Caleb WRIGHT (DOB 20/08/2001)",
    charges: "Theft of motor vehicle; TWOC-style counts — fiction labels.",
    stage: "Initial",
    messy: "messy",
    hook: "Charge wording vs MG5 legal label mismatch — clerical.",
    body: `CHARGE — Wording references **s.12A** style label — MG5 uses colloquial "joyriding" — **clerk to confirm** indictment drafting.

MG5 — Car found abandoned; damage to clutch.

MG6 — Recovery invoice **awaiting**; photos **served**.`,
  },
  {
    n: 428,
    short: "s.20 GBH — glass in nightclub",
    acc: "Aaron KEMP (DOB 12/05/1990)",
    comp: "Victim: fictional",
    charges: "s.20 OAPA — fiction.",
    stage: "Trial index",
    messy: "messy",
    hook: "Unused material schedule v3 — multiple versions on file.",
    body: `MG6 — **Unused schedule v1** — superseded.
MG6 — **Unused schedule v2** — superseded.
MG6 — **Unused schedule v3** — **current** — defence says v2 served by mistake — **which schedule for trial?**

MG5 — Facial laceration; glass; self-defence raised.`,
  },
  {
    n: 429,
    short: "Malicious communications (generic)",
    acc: "Paige TURNER (DOB 30/09/1996)",
    charges: "Malicious communications — fiction.",
    stage: "Initial",
    messy: "clean",
    hook: "Metadata optional.",
    body: `MG5 — Social messages; threats language; recipient alarm.

MG6 — Screenshots **served**; IP data **served**; device download **clean**.

CASEBRAIN optional metadata: clean_test true.`,
  },
  {
    n: 430,
    short: "Criminal damage — railway footbridge (fiction)",
    acc: "Declan REES (DOB 04/04/1988)",
    charges: "Criminal damage — fiction.",
    stage: "PTPH",
    messy: "messy",
    hook: "CCTV clock fast vs engineer sheet.",
    body: `CCTV — Engineer note: **+33 seconds** fast on camera RFB-02 for week of offence.

MG5 — Graffiti / panel damage; cost estimate.

MG6 — Engineer report **served**; correction sheet **must** be applied to MG11 times.`,
  },
  {
    n: 431,
    short: "Theft from person — snatch",
    acc: "Vincent COLE (DOB 17/11/1999)",
    comp: "Elena ROSS (fiction)",
    charges: "Theft from person — fiction.",
    stage: "Initial",
    messy: "messy",
    hook: "Victim timeline slip — phone time vs CCTV stamp.",
    body: `MG11 — Elena Ross — says phone taken **22:05** "by her watch".

CCTV — On-screen stamp **22:07** after correction — **two-minute slip** — officer note reconciles.

MG5 — Bag snatch; no injury beyond scratch.`,
  },
  {
    n: 432,
    short: "s.47 ABH — domestic-flavoured",
    acc: "Neil PARKER (DOB 08/02/1985)",
    comp: "Faye PARKER (fiction)",
    charges: "s.47 ABH — fiction.",
    stage: "Initial",
    messy: "messy",
    hook: "Medical evidence schedule only — GP summary; hospital not used.",
    body: `MG5 — Bruising; photograph; **no hospital admission**.

MG6 — **Medical** — GP summary **served**; hospital records **not obtained** — relevance disputed — defence asks for full records.

MG11 — Faye Parker — draft finalised version served.`,
  },
  {
    n: 433,
    short: "Offensive weapon — non-blade",
    acc: "Evan BROOKS (DOB 26/12/1997)",
    charges: "Possession offensive weapon — fiction.",
    stage: "First appearance",
    messy: "clean-ish",
    hook: "Work tool — legitimate purpose defence.",
    body: `MG5 — Extendable baton in rucksack; accused says electrician's kit; late job.

MG11 — PC — search powers; item photographed.

MG6 — Photographs **served**; purchase receipt **awaiting** from employer.`,
  },
  {
    n: 434,
    short: "Fraud — retail refund",
    acc: "Chloe ADAMS (DOB 10/10/1992)",
    charges: "Fraud — fiction.",
    stage: "Initial",
    messy: "messy",
    hook: "MG5 loss £ vs MG11 £ — different figures.",
    body: `MG5 — Summary states **£214.99** retailer loss.

MG11 — Store manager — refund fraud — states **£219.00** in paragraph 4 — **discrepancy** flagged internally; CPS note: **amend MG5** or clarify.

Spreadsheet annex — third figure **£215.50** — **reconcile** before trial.`,
  },
  {
    n: 435,
    short: "s.4 POA + criminal damage",
    acc: "Zara MITCHELL (DOB 31/07/1994)",
    charges: "s.4 POA; criminal damage — fiction.",
    stage: "PTPH",
    messy: "messy",
    hook: "Two officers — contradictory summary boxes on BWV reviewer sheet.",
    body: `MG5 — Neighbour dispute; plant pot thrown; shouting.

BWV — Reviewer sheet: PC A summary "single throw"; PC B summary "two throws" — **internal contradiction** — MG6 notes **clarification sought**.

MG11 — Both officers — full statements **served**.

MG6 — BWV **served**; reviewer sheet **served** as part of technical pack.`,
  },
];

function ref(n) {
  return `NS-CPS-2026-${String(n).padStart(4, "0")}`;
}

function build(c) {
  const r = ref(c.n);
  return `================================================================================
NORTHSHIRE CPS / POLICE — FICTIONAL BUNDLE (TEST DATA ONLY — NOT REAL)
================================================================================
Reference: ${r}
Short title: ${c.short}
Accused: ${c.acc}
${c.comp ? "Other party / witness: " + c.comp + "\n" : ""}Stage: ${c.stage} | Messiness: ${c.messy}
Primary eval hook: ${c.hook}
================================================================================

=== SECTION: COVER_INDEX ===

INDEX (fictional)

Document                              | Note
--------------------------------------|----------------------------------
Charge extract                        | Below
MG5 — Case summary                    | Draft
MG6(a) — Schedule                     | Initial / revised as marked
Witness statements (MG11)             | As listed in body
Disclosure notes                      | See MG6
Interview summary                     | Where applicable
Exhibit list                          | Inline / annex


=== SECTION: CHARGE ===

CHARGE SHEET — EXTRACT (FICTION)

Defendant: ${c.acc.split("(")[0].trim()}

${c.charges}

Plea: Not guilty (fictional).


=== SECTION: MG5 ===

MG5 — CASE SUMMARY (DRAFT)

${c.body}


=== SECTION: MG6 ===

MG6(a) — SCHEDULE OF INITIAL DISCLOSURE (FICTION)

The schedule is consistent with the narrative hooks above. Where "awaiting" appears, defence chase is expected. Fictional Northshire CPS references only.


=== SECTION: EXHIBITS ===

EXHIBIT LIST — v1 (FICTION)

Refs prefixed EX-${r.replace(/[^0-9]/g, "").slice(-4)}-* — schedule aligns with OIC log (fiction).


================================================================================
END — ${r} — FICTIONAL TEST DATA ONLY
================================================================================
`;
}

function main() {
  if (!fs.existsSync(DOCS_DIR)) {
    fs.mkdirSync(DOCS_DIR, { recursive: true });
  }
  for (const c of CASES) {
    const r = ref(c.n);
    const out = path.join(DOCS_DIR, `${r}.txt`);
    fs.writeFileSync(out, build(c), "utf8");
    console.log("Wrote", path.relative(process.cwd(), out));
  }
  console.log("Done:", CASES.length, "files");
}

main();
