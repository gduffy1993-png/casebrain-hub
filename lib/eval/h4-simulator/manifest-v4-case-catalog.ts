/**
 * H4 Simulator v4 — controlled audit expansion cases (sim-151..397).
 * Each case varies offence, trap, layout, profile, and evidence labels.
 * Controlled/synthetic audit only — not solicitor-reviewed real-world audit.
 */
import type { SimulatorManifestCase } from "./manifest-types";
import { buildManifestCase } from "./manifest-types";

const CROWN = "Northgate Crown Court";
const MAGS = "Northgate Magistrates' Court";
const YOUTH = "Northgate Youth Court";

export const V4_DEFENDANTS = [
  "Alba Crisp", "Brock Fenn", "Celia Grant", "Damon Ince", "Eliza Judd", "Felix Knox", "Gemma Lyle",
  "Harlan Moon", "Iona North", "Jasper Odom", "Keira Poole", "Lennox Quay", "Maeve Rook", "Nolan Spade",
  "Opal Tren", "Piers Unit", "Quinna Vale", "Ronan Webb", "Sable Yates", "Tobin Zell", "Ursula Arch",
  "Vance Birch", "Willa Crane", "Xavier Dale", "Yvette Eli", "Zachary Firth", "Ariana Gable", "Blaine Holt",
  "Corinne Ivy", "Declan Jute", "Elowen Kade", "Forrest Loom", "Greta Morn", "Holden Nye", "Isolde Orr",
  "Jude Parch", "Kyla Quill", "Linden Rafe", "Mira Sedge", "Nico Tarn", "Odette Ulme", "Paxton Vail",
  "Rowan Wex", "Selene Xan", "Thane Yor", "Una Zep", "Vesper Alden", "Wyatt Brine", "Xyla Coven",
  "Yorick Dray", "Zinnia Evers", "Arden Flint", "Briar Goss", "Caspian Hale", "Della Inks", "Emrys Jolt",
  "Fern Kest", "Gideon Lux", "Haven Mire", "Ingrid Noll", "Jovan Opal", "Kestrel Penn", "Liora Quench",
  "Merrick Rune", "Nerida Slate", "Orson Tusk", "Petra Vane", "Quillon Wisp", "Raina Xebec", "Stellan Yew",
  "Tamsin Zale", "Ulric Ash", "Veda Brook", "Wynn Calder", "Xanthe Dune", "Yuri Elm", "Zola Fennec",
  "Ansel Grove", "Beatrix Haze", "Cyrus Isle", "Delphine Joss", "Eamon Kite", "Faye Larch", "Galen Moss",
  "Helena Nave", "Idris Oaken", "Juno Pike", "Kellan Quasar", "Luna Ridge", "Magnus Silt", "Nyla Tabor",
  "Oren Ulric", "Piper Vale", "Quincy Wold", "Rhea Xenon", "Silas Yarrow", "Tilda Zeph", "Urban Acre",
  "Violet Bex", "Wade Cleft", "Xena Drift", "Yasmin Eclat", "Zeb Fallow", "Althea Glim", "Bram Hearth",
  "Coraline Ink", "Dorian Jest", "Elara Kith", "Finnian Lode", "Giselle Moth", "Huxley Nook", "Imogen Ode",
  "Jareth Plum", "Kaelis Quoin", "Lysander Rill", "Maris Swoon", "Niall Thatch", "Oona Umber", "Phineas Vox",
  "Romy Wren", "Soren Yule", "Tessara Zinn", "Ulysses Arbor", "Vera Blunt", "Willa Crest", "Xander Dusk",
  "Yara Ember", "Zuri Flint", "Alden Grit", "Blythe Haven", "Cullen Irid", "Daphne Jura", "Elias Kova",
  "Freya Lumen", "Garrick Nox", "Hattie Onyx", "Ivor Prism", "Juniper Quell", "Knox Ravel", "Leona Sable",
  "Milo Tangent", "Nadia Upland", "Otis Vellum", "Paloma Wight", "Quade Xylem", "Rina Yarrow", "Stefan Zest",
  "Tula Ashwin", "Uriah Bly", "Vesna Cade", "Willa Dorn", "Ximena Eyre", "Yannick Fjord", "Zelda Gorse",
  "Amos Hinter", "Bronte Isle", "Caius Javel", "Dinah Kestrel", "Ewan Latch", "Fleur Mantis", "Gunnar Nimbus",
  "Hester Oriel", "Ilan Prowl", "Jovie Quasar", "Kato Riven", "Leda Sylvan", "Maren Tidal", "Nash Umberly",
  "Olive Vantage", "Perrin Wisp", "Quenby Xanthe", "Roscoe Yarrow", "Suri Zephyr", "Torin Alder", "Una Briar",
  "Viggo Cleft", "Winslow Dapple", "Xyla Ember", "Yvette Fjell", "Zander Gloam", "Afton Haze", "Boden Irks",
  "Cleo Jasp", "Drew Kest", "Eira Loom", "Fintan Mire", "Gwen Noll", "Hale Orr", "Indie Parch", "Joss Quill",
  "Kira Rafe", "Lyle Sedge", "Mae Tarn", "Nell Ulme", "Ozzy Vail", "Pia Wex", "Quin Xan", "Rafe Yor",
  "Sia Zep", "Troy Alden", "Uma Brine", "Vera Coven", "Wes Dray", "Xia Evers", "Yael Flint", "Zoe Goss",
  "Asa Hale", "Bria Inks", "Cole Jolt", "Demi Kest", "Eden Lux", "Fern Mire", "Grey Noll", "Hana Opal",
  "Ivo Penn", "Jade Quench", "Kian Rune", "Liv Slate", "Mack Tusk", "Nia Vane", "Omar Wisp", "Paz Xebec",
  "Ria Yew", "Sam Zale", "Tia Ash", "Ugo Brook", "Vim Calder", "Wren Dune", "Xan Elm", "Yuri Fennec",
  "Zia Grove", "Ace Haze", "Bex Isle", "Cy Joss", "Dot Kite", "Eli Larch", "Fay Moss", "Gus Nave",
  "Hux Oaken", "Ivy Pike", "Jay Quasar", "Kit Ridge", "Lou Silt", "Max Tabor", "Ned Ulric", "Ola Vale",
  "Pip Wold", "Rue Xenon", "Sol Yarrow", "Tad Zeph", "Uma Acre", "Val Bex", "Wynn Cleft", "Yen Drift",
  "Zed Eclat", "Anya Fallow", "Bo Glim", "Caz Hearth", "Dex Ink", "Eve Jest", "Fox Kith", "Gia Lode",
  "Hal Moth", "Ina Nook", "Jem Ode", "Kai Plum", "Lea Quoin", "Moe Rill", "Ned Swoon", "Ora Thatch",
] as const;

type TrapBlueprint = {
  trap: string;
  profile: string;
  titlePrefix: string;
  mainIssue: string;
  today: string;
  served: string[];
  referred: string[];
  missing: string[];
  uncertain?: string[];
  chase: string[];
  mustNot: string[];
  blocking: string[];
};

const TRAP_BLUEPRINTS: TrapBlueprint[] = [
  { trap: "source_hierarchy_mg5_mg11", profile: "source_hierarchy_conflict", titlePrefix: "MG5 summary conflicts with MG11 account", mainIssue: "MG5 states assault at 22:15; signed MG11 states 23:40 — primary MG11 should outrank summary.", today: "Source hierarchy conflict — chase signed MG11 before relying on MG5 timeline.", served: ["MG5 officer summary"], referred: ["signed MG11"], missing: ["signed MG11 final version"], chase: ["signed MG11", "MG5 clarification", "BWV timestamp"], mustNot: ["MG5 timeline proves assault time", "summary outranks MG11"], blocking: ["MG5 timeline proves", "summary outranks MG11", "assault time proved from MG5"] },
  { trap: "source_hierarchy_officer_exhibit", profile: "source_hierarchy_conflict", titlePrefix: "Officer summary vs primary exhibit", mainIssue: "Officer MG5 summary describes knife recovery; exhibit continuity log missing and MG11 differs on location.", today: "Officer summary not primary — chase exhibit continuity and witness MG11.", served: ["officer MG5 narrative"], referred: ["exhibit continuity log"], missing: ["continuity log", "seizure photographs"], chase: ["exhibit continuity", "seizure photographs", "witness MG11"], mustNot: ["officer summary proves knife location", "exhibit proved from summary"], blocking: ["officer summary proves knife", "exhibit proved from summary", "knife location proved"] },
  { trap: "source_hierarchy_interview_summary", profile: "source_hierarchy_conflict", titlePrefix: "Interview summary vs prosecution summary", mainIssue: "Prosecution summary quotes admission; interview recording/transcript not served.", today: "Interview summary only — chase recording before admission reliance.", served: ["prosecution interview summary"], referred: ["interview recording"], missing: ["interview recording", "transcript", "PACE forms"], chase: ["interview recording", "transcript", "PACE review"], mustNot: ["interview proves admission", "summary confirms admission"], blocking: ["interview proves admission", "summary confirms admission", "admission reliable"] },
  { trap: "source_hierarchy_schedule_served", profile: "source_hierarchy_conflict", titlePrefix: "Schedule lists material not on bundle", mainIssue: "MG6C schedule lists BWV as served; bundle body contains index reference only.", today: "Schedule vs bundle mismatch — chase actual BWV export.", served: ["MG6C schedule page"], referred: ["BWV full export"], missing: ["BWV download", "continuity statement"], chase: ["BWV full export", "schedule correction", "continuity"], mustNot: ["BWV served as fact", "schedule proves material on bundle"], blocking: ["BWV served as fact", "schedule proves material", "BWV shows"] },
  { trap: "date_time_custody_mg11", profile: "date_time_conflict", titlePrefix: "Custody time conflicts with MG11", mainIssue: "Custody record shows arrest 02:10; complainant MG11 states incident 23:50 prior day.", today: "Date/time conflict — chase custody record and MG11 alignment.", served: ["partial custody extract"], referred: ["full custody record"], missing: ["full custody record", "MG11 signed"], uncertain: ["incident vs arrest timeline"], chase: ["full custody record", "signed MG11", "timeline reconciliation"], mustNot: ["custody time proves offence time", "timeline aligned as fact"], blocking: ["custody time proves offence", "timeline aligned as fact", "incident time proved"] },
  { trap: "date_time_bwv_incident", profile: "date_time_conflict", titlePrefix: "BWV timestamp vs alleged incident", mainIssue: "BWV metadata shows 14:22; MG5 alleges assault at 19:05 same date.", today: "BWV timestamp mismatch — chase full BWV window and MG11.", served: ["BWV clip metadata page"], referred: ["full BWV export"], missing: ["full BWV window", "MG11 time account"], chase: ["full BWV export", "MG11 time account", "metadata verification"], mustNot: ["BWV proves incident time", "timestamp confirms assault"], blocking: ["BWV proves incident time", "timestamp confirms assault", "BWV shows assault"] },
  { trap: "date_time_phone_metadata", profile: "date_time_conflict", titlePrefix: "Phone metadata date vs statement date", mainIssue: "Message screenshot metadata dated 12/03/2025; MG11 references messages on 12/03/2026.", today: "Phone metadata vs statement date conflict — chase source export.", served: ["message screenshot pages"], referred: ["handset download"], missing: ["full message export", "metadata verification"], chase: ["handset download", "message metadata log", "MG11 clarification"], mustNot: ["message date proved", "screenshot metadata confirms offence"], blocking: ["message date proved", "metadata confirms offence", "messages prove conduct"] },
  { trap: "date_time_disclosure_offence", profile: "date_time_conflict", titlePrefix: "Disclosure date confused with offence date", mainIssue: "Late disclosure cover sheet dated service day only; offence particulars reference different month.", today: "Disclosure date not offence date — confirm particulars from charge sheet.", served: ["late disclosure cover sheet"], referred: ["original MG5"], missing: ["charge sheet clarity", "offence date particulars"], uncertain: ["correct offence window"], chase: ["charge sheet", "offence date particulars", "MG5 clarification"], mustNot: ["disclosure date is offence date", "particulars proved from cover sheet"], blocking: ["disclosure date is offence date", "particulars proved from cover", "offence date confirmed"] },
  { trap: "youth_aa_missing", profile: "youth_vulnerability_custody", titlePrefix: "Youth defendant — AA record missing", mainIssue: "Youth defendant — appropriate adult attendance not documented on served papers.", today: "Youth interview — chase AA record and custody before admission reliance.", served: ["youth interview summary"], referred: ["interview recording"], missing: ["appropriate adult record", "custody record"], chase: ["AA attendance record", "custody record", "interview recording"], mustNot: ["AA attended as fact", "interview reliable"], blocking: ["AA attended", "interview reliable", "admission is reliable"] },
  { trap: "youth_interpreter_missing", profile: "youth_vulnerability_custody", titlePrefix: "Interpreter mentioned — record missing", mainIssue: "MG5 notes interpreter used; interpreter certification and recording not served.", today: "Interpreter record missing — chase certification and interview recording.", served: ["MG5 reference to interpreter"], referred: ["interview recording"], missing: ["interpreter certification", "interview recording"], chase: ["interpreter certification", "interview recording", "PACE review"], mustNot: ["interpreter attended as fact", "interview fairly conducted"], blocking: ["interpreter attended as fact", "interview fairly conducted", "PACE complied"] },
  { trap: "vulnerable_witness_marker", profile: "youth_vulnerability_custody", titlePrefix: "Vulnerable witness — special measures not served", mainIssue: "Complainant marked vulnerable; ABE/special measures material referred only.", today: "Vulnerable witness — chase ABE and special measures documentation.", served: ["MG5 vulnerability marker"], referred: ["ABE interview"], missing: ["ABE recording", "special measures application"], chase: ["ABE recording", "special measures docs", "MG11 first account"], mustNot: ["ABE confirms account", "vulnerability proves offence"], blocking: ["ABE confirms", "vulnerability proves offence", "account confirmed as fact"] },
  { trap: "custody_risk_missing", profile: "youth_vulnerability_custody", titlePrefix: "Custody risk assessment missing", mainIssue: "Custody risk assessment and mental health triage referred only.", today: "Custody risk material missing — chase triage and PACE review.", served: ["custody booking sheet"], referred: ["risk assessment"], missing: ["custody risk assessment", "mental health triage"], chase: ["risk assessment", "MH triage", "PACE forms"], mustNot: ["safeguards complied", "fitness to detain proved"], blocking: ["safeguards complied", "fitness to detain proved", "PACE complied as fact"] },
  { trap: "mg6c_listed_not_served", profile: "disclosure_schedule_trap", titlePrefix: "MG6C item listed but not served", mainIssue: "MG6C line 14 lists handset download — file not on bundle.", today: "MG6C listed-not-served — chase handset download listed on schedule.", served: ["MG6C schedule"], referred: ["handset download per MG6C line 14"], missing: ["handset download", "extraction certificate"], chase: ["handset download", "MG6C line 14 material", "extraction certificate"], mustNot: ["MG6C item served as fact", "download on bundle"], blocking: ["MG6C item served", "download on bundle", "digital evidence proved"] },
  { trap: "mg6d_sensitive_confusion", profile: "disclosure_schedule_trap", titlePrefix: "MG6D sensitive/non-sensitive confusion", mainIssue: "Material marked sensitive on MG6D but same item summarised as unused on MG6C.", today: "MG6D/MG6C confusion — chase sensitivity classification and actual access.", served: ["MG6C and MG6D schedules"], referred: ["sensitive material gateway"], missing: ["sensitivity review", "gateway application"], uncertain: ["whether material is unused or sensitive"], chase: ["sensitivity classification", "gateway application", "unused material access"], mustNot: ["sensitive material fully disclosed", "unused material covered"], blocking: ["sensitive material fully disclosed", "unused material covered", "disclosure complete"] },
  { trap: "redacted_unused_relied_on", profile: "disclosure_schedule_trap", titlePrefix: "Redacted unused item relied on in summary", mainIssue: "MG5 relies on redacted unused MG6 item — primary unused material not served.", today: "Redacted unused relied on — chase unredacted unused or primary source.", served: ["redacted unused extract"], referred: ["full unused material"], missing: ["unredacted unused", "primary witness account"], chase: ["unredacted unused", "primary MG11", "MG6 clarification"], mustNot: ["redacted extract proves account", "unused material supports prosecution"], blocking: ["redacted extract proves", "unused material supports prosecution", "account proved from redacted"] },
  { trap: "available_on_request_not_served", profile: "disclosure_schedule_trap", titlePrefix: "Available on request not served", mainIssue: "BWV marked available on request — not treated as served disclosure.", today: "Available on request is not served — chase BWV export.", served: ["MG6 note available on request"], referred: ["BWV on request"], missing: ["BWV export", "continuity"], chase: ["BWV export", "disclosure confirmation", "continuity"], mustNot: ["BWV served because listed", "available on request equals served"], blocking: ["BWV served because listed", "available on request equals served", "BWV shows"] },
  { trap: "corrected_charge_old_family", profile: "changed_corrected_charge", titlePrefix: "Old charge family in bundle", mainIssue: "Amended indictment changes offence family; old fraud count pages remain in bundle.", today: "Corrected charge — confirm live counts; do not import old offence theory.", served: ["amended indictment", "old fraud count pages"], referred: ["original MG5"], missing: ["count linkage schedule", "amended particulars"], chase: ["amended indictment clarity", "live count schedule", "MG5 update"], mustNot: ["old fraud theory applies", "amended charge proves new offence"], blocking: ["old fraud theory applies", "amended charge proves", "offence proved from old pages"] },
  { trap: "summary_old_charge", profile: "changed_corrected_charge", titlePrefix: "Summary still uses old charge", mainIssue: "MG5 summary still describes s20 GBH; amended charge is s18.", today: "Summary uses old charge — chase updated MG5 and medical for s18.", served: ["MG5 with old s20 wording", "amended s18 charge"], referred: ["medical report"], missing: ["updated MG5", "medical for intent"], chase: ["updated MG5", "medical report", "intent material"], mustNot: ["s18 intent proved", "old s20 summary controls"], blocking: ["s18 intent proved", "old s20 summary controls", "intent established as fact"] },
  { trap: "index_bwv_absent", profile: "index_listed_not_served", titlePrefix: "Index lists BWV — file absent", mainIssue: "Bundle index lists BWV exhibit; no BWV file in bundle body.", today: "Index-listed BWV absent — chase export before officer account reliance.", served: ["bundle index"], referred: ["BWV per index"], missing: ["BWV file", "continuity"], chase: ["BWV export", "index correction", "continuity statement"], mustNot: ["BWV on bundle as fact", "index proves served"], blocking: ["BWV on bundle", "index proves served", "BWV shows"] },
  { trap: "index_cctv_absent", profile: "index_listed_not_served", titlePrefix: "CCTV on index — exhibit missing", mainIssue: "Exhibit CE/01 CCTV listed; media file not exported.", today: "CCTV index-only — chase master footage and continuity.", served: ["exhibit list"], referred: ["CCTV CE/01"], missing: ["CCTV export", "continuity"], chase: ["CCTV master footage", "continuity", "ID procedure"], mustNot: ["CCTV identifies defendant", "exhibit list proves footage served"], blocking: ["CCTV identifies defendant", "exhibit list proves footage", "CCTV shows"] },
  { trap: "index_phone_absent", profile: "index_listed_not_served", titlePrefix: "Phone download indexed not served", mainIssue: "Index references UFED download; only screenshot annex served.", today: "Phone download indexed not served — chase full UFED export.", served: ["screenshot annex"], referred: ["UFED download per index"], missing: ["UFED download", "search scope"], chase: ["UFED download", "search scope schedule", "continuity"], mustNot: ["download served because indexed", "screenshots are full download"], blocking: ["download served because indexed", "screenshots are full download", "phone proves attribution"] },
  { trap: "partial_cctv_stills", profile: "partial_vs_full_evidence", titlePrefix: "CCTV stills not full CCTV", mainIssue: "Grainy stills served — master timeline and continuity missing.", today: "CCTV stills only — chase master footage full window.", served: ["CCTV still images"], referred: ["master CCTV timeline"], missing: ["master footage", "continuity"], chase: ["master CCTV", "full time window", "continuity"], mustNot: ["CCTV stills prove ID", "stills are full CCTV"], blocking: ["CCTV stills prove ID", "stills are full CCTV", "CCTV shows robbery"] },
  { trap: "partial_phone_screenshots", profile: "partial_vs_full_evidence", titlePrefix: "Screenshots not full download", mainIssue: "Handset screenshots served without UFED scope or continuity.", today: "Screenshots partial — chase full download and search terms.", served: ["handset screenshots"], referred: ["UFED extraction"], missing: ["full download", "search terms schedule"], chase: ["UFED download", "search terms", "continuity certificate"], mustNot: ["screenshots prove all messages", "download scope complete"], blocking: ["screenshots prove all messages", "download scope complete", "phone proves supply"] },
  { trap: "partial_bwv_transcript", profile: "partial_vs_full_evidence", titlePrefix: "BWV transcript not full video", mainIssue: "Officer transcript served; full BWV video not on bundle.", today: "BWV transcript partial — chase full video export.", served: ["BWV transcript extract"], referred: ["full BWV video"], missing: ["BWV video export", "continuity"], chase: ["BWV video export", "continuity", "custody record"], mustNot: ["transcript proves contact", "BWV shows assault"], blocking: ["transcript proves contact", "BWV shows assault", "BWV shows"] },
  { trap: "partial_custody_extract", profile: "partial_vs_full_evidence", titlePrefix: "Custody extract not full record", mainIssue: "Booking sheet fragment served; full custody/PACE record missing.", today: "Custody extract partial — chase full custody and interview recording.", served: ["custody booking fragment"], referred: ["full custody record"], missing: ["full custody record", "PACE forms"], chase: ["full custody record", "PACE review", "interview recording"], mustNot: ["PACE complied as fact", "custody proves safeguards"], blocking: ["PACE complied as fact", "custody proves safeguards", "safeguards followed"] },
  { trap: "partial_interview_summary", profile: "partial_vs_full_evidence", titlePrefix: "Interview summary not full recording", mainIssue: "Summary of interview served; recording and transcript absent.", today: "Interview summary partial — chase recording before reliance.", served: ["interview summary"], referred: ["interview recording"], missing: ["recording", "transcript"], chase: ["interview recording", "transcript", "PACE forms"], mustNot: ["summary proves admission", "interview confirms account"], blocking: ["summary proves admission", "interview confirms account", "admission reliable"] },
  { trap: "partial_medical_summary", profile: "partial_vs_full_evidence", titlePrefix: "Medical summary not full record", mainIssue: "MG5 injury summary served; medical report and imaging referred only.", today: "Medical summary partial — chase full report before injury grade claims.", served: ["MG5 injury summary"], referred: ["medical report"], missing: ["medical report", "imaging"], chase: ["medical report", "imaging", "expert if applicable"], mustNot: ["medical proves s18 intent", "injury grade proved"], blocking: ["medical proves s18", "injury grade proved", "intent proved"] },
  { trap: "same_surname_defendants", profile: "wrong_person_entity", titlePrefix: "Same surname co-defendants", mainIssue: "Co-defendants Patel/Patel — phone subscriber data not mapped per defendant.", today: "Same surname confusion — chase per-defendant attribution map.", served: ["mixed subscriber summary"], referred: ["telecom download"], missing: ["per-defendant map", "subscriber records"], uncertain: ["which Patel holds line"], chase: ["per-defendant map", "subscriber records", "handset attribution"], mustNot: ["subscriber proves this defendant", "same surname proves identity"], blocking: ["subscriber proves this defendant", "same surname proves identity", "phone proves attribution"] },
  { trap: "subscriber_vs_user", profile: "wrong_person_entity", titlePrefix: "Subscriber vs phone user", mainIssue: "Account held by associate; user attribution to defendant not established.", today: "Subscriber not user — chase handset usage and attribution evidence.", served: ["subscriber record summary"], referred: ["handset download"], missing: ["usage attribution", "handset download"], chase: ["handset download", "usage attribution", "cellsite if relevant"], mustNot: ["subscriber is defendant", "account holder proves user"], blocking: ["subscriber is defendant", "account holder proves user", "phone proves defendant sent"] },
  { trap: "vehicle_owner_vs_driver", profile: "wrong_person_entity", titlePrefix: "Vehicle owner vs driver", mainIssue: "Vehicle registered to third party; driver identity not established on papers.", today: "Owner not driver — chase driver identification and insurance.", served: ["DVLA keeper printout"], referred: ["ANPR/CCTV"], missing: ["driver identification", "insurance policy"], uncertain: ["who drove vehicle"], chase: ["driver ID evidence", "ANPR/CCTV", "insurance records"], mustNot: ["defendant was driver as fact", "keeper proves driver"], blocking: ["defendant was driver as fact", "keeper proves driver", "driver identification proved"] },
  { trap: "encro_handle_not_defendant", profile: "wrong_person_entity", titlePrefix: "Encro handle vs defendant", mainIssue: "Handle SHADOW-22 on thread; mapping certificate to defendant not served.", today: "Encro handle not defendant — chase handle mapping before attribution.", served: ["Encro message extracts"], referred: ["platform extraction"], missing: ["handle mapping certificate", "continuity"], chase: ["handle mapping", "full extraction", "continuity"], mustNot: ["handle is defendant", "Encro proves supply"], blocking: ["handle is defendant", "Encro proves supply", "attribution confirmed"] },
  { trap: "inference_attribution", profile: "inference_as_fact", titlePrefix: "Attribution inferred as fact", mainIssue: "MG5 infers sender identity from phone proximity — not primary proof.", today: "Attribution inference only — chase subscriber/download before sender claims.", served: ["MG5 attribution inference"], referred: ["handset download"], missing: ["subscriber data", "message export"], chase: ["handset download", "subscriber records", "attribution certificate"], mustNot: ["sender is defendant as fact", "proximity proves attribution"], blocking: ["sender is defendant as fact", "proximity proves attribution", "attribution confirmed"] },
  { trap: "inference_possession_control", profile: "inference_as_fact", titlePrefix: "Possession/control inferred", mainIssue: "Drugs found in shared vehicle — defendant possession/control not established.", today: "Possession inference — chase forensic linkage and defendant association.", served: ["seizure notes"], referred: ["forensic report"], missing: ["forensic report", "fingerprints/DNA"], uncertain: ["who had control"], chase: ["forensic report", "continuity", "occupancy evidence"], mustNot: ["defendant possessed drugs", "control proved as fact"], blocking: ["defendant possessed drugs", "control proved as fact", "possession proved"] },
  { trap: "inference_knowledge_intent", profile: "inference_as_fact", titlePrefix: "Knowledge/intent inferred from presence", mainIssue: "Defendant present at address where drugs found — knowledge/intent not proved.", today: "Intent inference from presence — chase dealing evidence beyond presence.", served: ["search summary"], referred: ["lab report"], missing: ["lab report", "dealing evidence"], chase: ["lab report", "dealing evidence", "occupancy/knowledge proof"], mustNot: ["intent to supply proved", "knowledge proved from presence"], blocking: ["intent to supply proved", "knowledge proved from presence", "PWITS proved"] },
  { trap: "inference_conspiracy_role", profile: "inference_as_fact", titlePrefix: "Conspiracy role inferred", mainIssue: "Group chat membership served — leading role inference not established.", today: "Conspiracy role inference — chase per-defendant role map.", served: ["group chat excerpts"], referred: ["full chat export"], missing: ["role map", "telecom data"], chase: ["per-defendant role map", "telecom downloads", "handset extraction"], mustNot: ["leading role proved", "conspiracy role established"], blocking: ["leading role proved", "conspiracy role established", "conspiracy proved for defendant"] },
  { trap: "inference_sender_identity", profile: "inference_as_fact", titlePrefix: "Sender identity inferred from content", mainIssue: "Message content suggests sender; platform attribution not served.", today: "Sender identity inference — chase platform export and subscriber data.", served: ["message content screenshots"], referred: ["platform export"], missing: ["platform export", "subscriber proof"], chase: ["platform export", "subscriber records", "account attribution"], mustNot: ["defendant sent messages as fact", "content proves sender"], blocking: ["defendant sent messages as fact", "content proves sender", "sender proved"] },
  { trap: "export_cps_chase_risk", profile: "export_surface_safety", titlePrefix: "CPS chase must not overstate served", mainIssue: "Key CCTV/BWV referred only — CPS chase must not imply served.", today: "Export risk CPS chase — only chase referred/missing items.", served: ["MG5 summary"], referred: ["CCTV", "BWV"], missing: ["CCTV export", "BWV export"], chase: ["CCTV export", "BWV export", "MG11"], mustNot: ["CCTV shows", "BWV shows", "material confirms offence"], blocking: ["CCTV shows", "BWV shows", "material confirms offence"] },
  { trap: "export_court_note_risk", profile: "export_surface_safety", titlePrefix: "Court note sendability risk", mainIssue: "Thin bundle with missing medical — court note must stay provisional.", served: ["thin MG5"], referred: ["medical"], missing: ["medical", "MG11"], chase: ["medical report", "MG11", "BWV if relevant"], sendability: "needs_solicitor_review", mustNot: ["safe to send", "bundle supports court note"], blocking: ["safe to send", "bundle supports court note", "case summary confirms"] },
  { trap: "export_client_summary_risk", profile: "export_surface_safety", titlePrefix: "Client summary inference risk", mainIssue: "Client summary route must not state attribution or intent as fact.", served: ["MG5 narrative"], referred: ["digital export"], missing: ["handset download", "attribution"], chase: ["handset download", "attribution proof", "MG11"], mustNot: ["you are shown on CCTV", "messages prove you sent"], blocking: ["you are shown on CCTV", "messages prove you sent", "proved as fact in summary"] },
  { trap: "late_disclosure_addendum", profile: "disclosure_schedule_trap", titlePrefix: "Late disclosure addendum", mainIssue: "Late addendum adds BWV reference; prior exports still missing.", today: "Late addendum — chase substantive exports not just cover sheet.", served: ["late disclosure letter"], referred: ["BWV addendum"], missing: ["BWV export", "prior missing MG11"], chase: ["BWV export", "missing MG11", "addendum item list"], mustNot: ["late addendum cures disclosure", "BWV now served as fact"], blocking: ["late addendum cures disclosure", "BWV now served", "disclosure complete"] },
  { trap: "huge_bundle_partial_index", profile: "large_messy_bundle", titlePrefix: "Huge bundle — partial index only", mainIssue: "Large bundle with partial index; defendant exhibit map missing.", today: "Huge bundle needs review — chase defendant map before reliance.", served: ["partial index", "subset exhibits"], referred: ["multiple exports"], missing: ["defendant exhibit map", "complete index"], sendability: "needs_solicitor_review", chase: ["defendant exhibit map", "complete index", "key exports"], mustNot: ["bundle complete", "safe to send"], blocking: ["bundle complete", "safe to send", "case summary confirms"] },
  { trap: "image_only_scan", profile: "partial_vs_full_evidence", titlePrefix: "Image-only scan — no searchable text", mainIssue: "MG6 and statements image-only scans — OCR unreliable for schedules.", today: "Image-only scan — chase text-searchable versions and exports.", served: ["image-only scanned pages"], referred: ["text-searchable versions"], missing: ["searchable MG6", "searchable statements"], chase: ["text-searchable MG6", "searchable statements", "key exports"], mustNot: ["OCR text proves schedule", "scan proves content"], blocking: ["OCR text proves schedule", "scan proves content", "schedule complete as read"] },
  { trap: "co_def_phone_data", profile: "wrong_person_entity", titlePrefix: "Co-defendant phone data bleed", mainIssue: "Co-defendant handset data on bundle without segregation map.", today: "Co-defendant phone bleed — chase per-defendant digital map.", served: ["mixed handset summary"], referred: ["co-defendant download"], missing: ["per-defendant segregation", "attribution map"], chase: ["per-defendant digital map", "handset downloads", "subscriber records"], mustNot: ["co-defendant phone proves this defendant", "shared device proves user"], blocking: ["co-defendant phone proves", "shared device proves user", "attribution to defendant"] },
  { trap: "officer_witness_confusion", profile: "wrong_person_entity", titlePrefix: "Officer/witness/defendant confusion", mainIssue: "OCR conflates officer badge number with witness reference.", today: "Identity confusion on OCR — chase clarity before attribution.", served: ["OCR witness/officer summary"], referred: ["BWV"], missing: ["clear MG11 accounts", "BWV export"], uncertain: ["which account refers to defendant"], chase: ["signed MG11", "BWV export", "ID clarity"], mustNot: ["defendant identified as officer", "OCR proves identity"], blocking: ["defendant identified", "OCR proves identity", "identification proved"] },
  { trap: "drug_supply_role_inference", profile: "inference_as_fact", titlePrefix: "Drug supply role inferred", mainIssue: "Cash and scales present — supply role inference not established.", today: "Supply role inference — chase dealing evidence and attribution.", served: ["search notes"], referred: ["lab report"], missing: ["lab report", "dealing evidence"], chase: ["lab report", "phone attribution", "dealing evidence"], mustNot: ["supply role proved", "dealing established as fact"], blocking: ["supply role proved", "dealing established as fact", "PWITS proved"] },
  { trap: "county_lines_exploitation_inference", profile: "county_lines_vulnerability", titlePrefix: "County lines — exploitation inferred", mainIssue: "Safeguarding flag present — exploitation not proved as fact.", today: "Exploitation marker — chase NRM; do not assert exploitation.", served: ["safeguarding flag note"], referred: ["NRM referral"], missing: ["NRM outcome", "line attribution"], chase: ["NRM outcome", "line attribution", "role evidence"], mustNot: ["was exploited as fact", "runner role confirmed"], blocking: ["was exploited", "runner role confirmed", "exploitation proved"] },
  { trap: "breach_order_service_unclear", profile: "order_breach_service", titlePrefix: "Breach — order service unclear", mainIssue: "Non-molestation order copy served; proof of service missing.", today: "Breach elements — chase service proof and breach particulars.", served: ["order copy"], referred: ["service affidavit"], missing: ["proof of service", "breach particulars"], uncertain: ["whether defendant served"], chase: ["proof of service", "order terms", "breach timeline"], mustNot: ["order served as fact", "breach proved"], blocking: ["order served as fact", "breach proved", "service confirmed"] },
  { trap: "motoring_sjp_thin", profile: "drink_drive_procedure", titlePrefix: "Motoring SJP thin bundle", mainIssue: "Single-page SJP notice — calibration and device record missing.", today: "Thin motoring — procedural chase only.", served: ["SJP notice"], referred: ["calibration certificate"], missing: ["calibration", "device record"], chase: ["calibration certificate", "device record", "notice of intended prosecution"], mustNot: ["speed proved", "device reliable as fact"], blocking: ["speed proved", "device reliable as fact", "offence proved"] },
  { trap: "fraud_account_control_inference", profile: "money_laundering_bank_records", titlePrefix: "Account control inferred", mainIssue: "Transactions listed — account control by defendant not proved.", today: "Account control inference — chase banking schedules and device records.", served: ["transaction summary"], referred: ["bank download"], missing: ["bank export", "device/ownership proof"], chase: ["bank download", "ownership evidence", "device records"], mustNot: ["account control proved", "defendant authorised transactions"], blocking: ["account control proved", "defendant authorised transactions", "fraud proved"] },
  { trap: "sexual_abe_partial", profile: "historic_sexual", titlePrefix: "ABE partial transcript only", mainIssue: "ABE transcript fragment served; recording not served.", today: "ABE partial — chase full recording before account summary.", served: ["ABE transcript fragment"], referred: ["ABE recording"], missing: ["ABE recording", "full transcript"], chase: ["ABE recording", "full transcript", "supporting medical"], mustNot: ["ABE confirms account", "transcript proves assault"], blocking: ["ABE confirms", "transcript proves assault", "account confirmed"] },
  { trap: "weapons_forensic_index_only", profile: "bladed_article", titlePrefix: "Weapon forensic index-only", mainIssue: "Forensic report on index; report body not served.", today: "Forensic index-only — chase report before weapon conclusions.", served: ["index forensic reference"], referred: ["forensic report"], missing: ["forensic report", "continuity"], chase: ["forensic report", "continuity", "search footage"], mustNot: ["forensic proves weapon", "report confirms blade"], blocking: ["forensic proves weapon", "report confirms blade", "weapon analysis confirms"] },
  { trap: "public_order_individual_bleed", profile: "multi_participant_public_order", titlePrefix: "Public order individual conduct bleed", mainIssue: "Group disorder summary — individual defendant conduct not mapped.", today: "Group disorder — chase per-defendant conduct evidence.", served: ["group conduct summary"], referred: ["BWV clips"], missing: ["per-defendant conduct map", "full BWV"], chase: ["per-defendant conduct map", "BWV clips", "witness segregation"], mustNot: ["defendant participated as fact", "group proves individual guilt"], blocking: ["defendant participated as fact", "group proves individual guilt", "violent disorder proved"] },
];

const OFFENCE_ROTATION: Array<{ family: string; wording: string; court?: string }> = [
  { family: "drugs_conspiracy", wording: "Conspiracy to supply Class A drugs" },
  { family: "drugs_pwits", wording: "Possession with intent to supply Class A drugs" },
  { family: "drugs_supply", wording: "Being concerned in the supply of Class A drugs" },
  { family: "violence_assault", wording: "S18 wounding with intent" },
  { family: "robbery_id", wording: "Robbery" },
  { family: "domestic", wording: "Controlling or coercive behaviour" },
  { family: "harassment", wording: "Stalking involving fear of violence" },
  { family: "sexual", wording: "Sexual assault (historic)" },
  { family: "motoring", wording: "Drive motor vehicle with excess alcohol", court: MAGS },
  { family: "fraud_account", wording: "Fraud by false representation" },
  { family: "weapons", wording: "Possession of a bladed article" },
  { family: "public_order", wording: "Violent disorder" },
  { family: "breach_order", wording: "Breach of non-molestation order" },
  { family: "youth", wording: "Theft (youth)", court: YOUTH },
  { family: "custody_pace", wording: "Theft" },
  { family: "mixed_unclear", wording: "Offence per charge sheet" },
  { family: "digital_attribution", wording: "Possession of indecent images — attribution disputed" },
  { family: "aew_police_contact", wording: "Assault on emergency worker" },
  { family: "perverting_justice", wording: "Perverting the course of justice" },
  { family: "encro_encrypted_comms", wording: "Conspiracy to supply Class A drugs (encrypted comms)" },
];

const LAYOUT_ROTATION = [
  "bad_ocr_scan", "rotated_scan", "duplicate_pages", "pages_out_of_order", "two_column_schedule",
  "skewed_scan", "index_only_bwv", "corrected_indictment", "missing_mg6_schedule", "conflicting_mg11_duplicate",
  "mixed_defendants_rotated", "very_thin_sjp", "large_messy_rotated", "image_only_scan", "late_addendum_scan",
  "huge_bundle_partial", "blank_pages_metadata", "bwv_screenshots_only", "thin_sjp_scan", "custody_extract_missing",
];

type V4Spec = {
  n: number;
  title: string;
  profile: string;
  offenceFamily: string;
  offenceWording: string;
  trap: string;
  layout: string;
  mainIssue: string;
  today: string;
  chase: string[];
  served: string[];
  referred: string[];
  missing: string[];
  uncertain?: string[];
  mustNot: string[];
  blocking: string[];
  defendant: string;
  court: string;
  sendability?: string;
};

function caseId(n: number): string {
  return `sim-${String(n).padStart(3, "0")}`;
}

const CHASE_TAIL_POOL = [
  "PACE custody review form", "exhibit CE/02 continuity", "second MG11 draft clarification",
  "MG6 line 12 handset export", "scene photograph log", "interpreter attendance note",
  "appropriate adult sign-in sheet", "VIPER pack completeness", "cellsite raw data dump",
  "subscriber account verification", "search BWV continuity", "lab submission chain",
  "medical imaging disc", "ABE room recording index", "third-party disclosure gateway",
  "amended charge linkage schedule", "unused material sensitivity review", "late addendum item list",
  "forensic toolkit continuity", "vehicle ANPR download", "banking schedule annex B",
  "encro handle mapping annex", "co-defendant segregation map", "custody risk triage form",
  "breath procedure MGDDB copy", "toxicology blood tube log", "order service affidavit",
  "NRM referral outcome letter", "message platform export hash", "CCTV master timeline index",
  "witness B statement clarification", "defendant interview part 2", "disclosure officer certification",
  "expert instruction letter", "scene forensic sweep log", "digital extraction scope annex",
  "phone billing record match", "firearm classification worksheet", "domestic chronology spreadsheet",
  "harassment platform preservation notice", "youth court safeguarding plan", "robbery ID parade notes",
  "fraud transaction mapping sheet", "county lines line attribution chart", "conspiracy role assessment",
  "public order clip segregation", "weapons seizure photograph set", "motoring calibration trace",
  "perverting course email preservation", "mixed bundle defendant index", "historic ABE support notes",
  "sensitive material schedule MG6D", "redacted unused gateway application", "image-only scan text layer",
] as const;

function uniqueCaseLabels(n: number, defendant: string, idx: number): {
  extraMissing: string;
  extraChase: string;
  servedQualifier: string;
} {
  const surname = defendant.split(" ").slice(-1)[0] ?? defendant;
  const tailA = CHASE_TAIL_POOL[idx % CHASE_TAIL_POOL.length]!;
  const tailB = CHASE_TAIL_POOL[(idx * 5 + 11) % CHASE_TAIL_POOL.length]!;
  return {
    extraMissing: `${tailA} (${surname} / folio ${n})`,
    extraChase: `${tailB} — ${surname}`,
    servedQualifier: `folio ${n} — ${surname}`,
  };
}

function buildV4Spec(n: number): V4Spec {
  const idx = n - 151;
  const bp = TRAP_BLUEPRINTS[idx % TRAP_BLUEPRINTS.length]!;
  const offence = OFFENCE_ROTATION[(idx + Math.floor(idx / TRAP_BLUEPRINTS.length)) % OFFENCE_ROTATION.length]!;
  const layout = LAYOUT_ROTATION[(idx * 3 + Math.floor(idx / 7)) % LAYOUT_ROTATION.length]!;
  const defendant = V4_DEFENDANTS[idx % V4_DEFENDANTS.length]!;
  const court = offence.court ?? (offence.family === "motoring" || layout.includes("sjp") ? MAGS : offence.family === "youth" ? YOUTH : CROWN);
  const suffix = layout.replace(/_/g, " ");
  const title = `${bp.titlePrefix} — ${suffix}`;
  const uniq = uniqueCaseLabels(n, defendant, idx);

  const served = [
    ...bp.served.map((s) => `${s} (${uniq.servedQualifier})`),
    ...(bp.served.length < 3 ? [`MG5 supplementary note (${uniq.servedQualifier})`] : []),
  ];
  const referred = bp.referred.map((s) => `${s} — ${defendant}`);
  const missing = [...bp.missing.map((m) => `${m} — ${defendant}`), uniq.extraMissing];
  const chase = [...new Set([...bp.chase.map((c) => `${c} — ${defendant}`), uniq.extraChase])];

  return {
    n,
    title,
    profile: bp.profile,
    offenceFamily: offence.family,
    offenceWording: offence.wording,
    trap: bp.trap,
    layout,
    mainIssue: bp.mainIssue,
    today: bp.today,
    chase,
    served,
    referred,
    missing,
    uncertain: bp.uncertain,
    mustNot: bp.mustNot,
    blocking: bp.blocking,
    defendant,
    court,
    sendability: (bp as TrapBlueprint & { sendability?: string }).sendability,
  };
}

export function buildV4ManifestCase(spec: V4Spec): SimulatorManifestCase {
  return buildManifestCase({
    caseId: caseId(spec.n),
    title: spec.title,
    profile: spec.profile,
    offenceFamily: spec.offenceFamily,
    offenceWording: spec.offenceWording,
    fakeDefendant: spec.defendant,
    fakeCourt: spec.court,
    mainIssue: spec.mainIssue,
    redTeamTrapType: spec.trap,
    pdfLayoutType: spec.layout,
    servedEvidence: spec.served,
    referredOnlyEvidence: spec.referred,
    missingEvidence: spec.missing,
    uncertainEvidence: spec.uncertain ?? [],
    expectedTodayIssue: spec.today,
    expectedChaseItems: spec.chase,
    expectedSummaryRisk: `Provisional — ${spec.trap.replace(/_/g, " ")} on ${spec.layout.replace(/_/g, " ")} papers`,
    expectedSourceStateBadges: ["provisional", "needs_review", ...(spec.served.length ? ["served"] : []), ...(spec.referred.length ? ["referred_only"] : []), ...(spec.missing.length ? ["missing"] : [])],
    expectedSendability: spec.sendability ?? "provisional_check_source",
    mustNotSay: spec.mustNot,
    blockingFailPatterns: [...spec.blocking, "we win", "case collapses"],
    polishOnlyWarnings: [`v4 audit expansion — ${spec.layout}`],
    bundleStatus: "manifest_only",
  });
}

export const V4_CASE_COUNT = 247;
export const V4_CASE_RANGE = { from: 151, to: 397 } as const;

export function buildAllV4Specs(): V4Spec[] {
  const specs: V4Spec[] = [];
  for (let n = V4_CASE_RANGE.from; n <= V4_CASE_RANGE.to; n += 1) {
    specs.push(buildV4Spec(n));
  }
  return specs;
}

export const SIMULATOR_MANIFEST_V4_CASES: SimulatorManifestCase[] = buildAllV4Specs().map(buildV4ManifestCase);

export function assertV4Manifest(): void {
  if (SIMULATOR_MANIFEST_V4_CASES.length !== V4_CASE_COUNT) {
    throw new Error(`Expected ${V4_CASE_COUNT} v4 cases, got ${SIMULATOR_MANIFEST_V4_CASES.length}`);
  }
  const combos = new Set<string>();
  for (const c of SIMULATOR_MANIFEST_V4_CASES) {
    const key = `${c.offenceFamily}|${c.redTeamTrapType}|${c.pdfLayoutType}`;
    if (combos.has(key)) {
      throw new Error(`Duplicate offence+trap+layout in v4: ${key} (${c.caseId})`);
    }
    combos.add(key);
  }
}

assertV4Manifest();
