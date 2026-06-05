import type { RealLayoutStressSampleManifest } from "./real-layout-stress-types";

export type StressBundlePage = {
  pageId: string;
  title: string;
  body: string;
  markers: string[];
};

function applyOcrNoise(text: string): string {
  return text
    .replace(/\bthe\b/gi, "th3")
    .replace(/\band\b/gi, "a.nd")
    .replace(/offence/gi, "offenc3")
    .replace(/defendant/gi, "defend@nt");
}

function fictionalBanner(m: RealLayoutStressSampleManifest): string {
  return [
    "FICTIONAL CROWN BUNDLE — SYNTHETIC LAYOUT STRESS TEST ONLY",
    "NOT REAL CLIENT MATERIAL — NOT FOR COURT USE",
    `Sample: ${m.sampleId} | Seed: ${m.seed} | Family: ${m.offenceFamily}`,
    "",
  ].join("\n");
}

function indexPage(m: RealLayoutStressSampleManifest): StressBundlePage {
  const wrongNums = m.layoutTags.includes("wrong_page_numbers");
  const bad = m.layoutTags.includes("bad_index");
  const missing = m.layoutTags.includes("missing_page");
  const lines = [
    "BUNDLE INDEX (Fictional)",
    "",
    wrongNums ? "NOTE: Page numbers below do not match PDF pagination." : "",
    bad ? "WARNING: Index order does not follow standard Crown bundle layout." : "",
    "",
    `${wrongNums ? "Page 99" : "Page 1"} — Email screenshot (Exhibit EM-1)`,
    `${wrongNums ? "Page 2" : "Page 3"} — MG11 witness statement (weird placement)`,
    `${wrongNums ? "Page 4" : "Page 2"} — Charge sheet`,
    `${wrongNums ? "Page 7" : "Page 5"} — MG6 disclosure schedule (incomplete)`,
    missing ? "Page 8 — [MISSING PAGE — referenced but not in bundle]" : "",
    `${wrongNums ? "Page 12" : "Page 9"} — MG5 case summary`,
    "",
    "Defendant:",
    m.expectedDefendant,
  ];
  if (m.coDefendants?.length) {
    lines.push(`Co-defendants: ${m.coDefendants.join("; ")}`);
  }
  return {
    pageId: "index",
    title: "Bundle Index",
    body: lines.filter(Boolean).join("\n"),
    markers: bad ? ["bad_index"] : [],
  };
}

function chargePage(m: RealLayoutStressSampleManifest, corrected = false): StressBundlePage {
  const charge = corrected
    ? `${m.expectedCharge} (CORRECTED PARTICULARS — refiled)`
    : m.expectedCharge;
  const counts = m.extraCounts?.length
    ? `\nAdditional count(s): ${m.extraCounts.join("; ")}`
    : "";
  return {
    pageId: corrected ? "charge_corrected" : "charge_sheet",
    title: corrected ? "Corrected Charge Sheet" : "Charge Sheet",
    body: [
      "CROWN PROSECUTION SERVICE — CHARGE SHEET (Fictional)",
      "",
      `Defendant: ${m.expectedDefendant}`,
      `Charge: ${charge}`,
      counts,
      `Stage: ${m.expectedStage}`,
      corrected
        ? "NOTE: This corrected charge sheet supersedes the earlier charge sheet in this bundle."
        : "NOTE: Original charge sheet — see later corrected sheet if present.",
      "",
      "Court: Fictional Magistrates / Crown Court",
      "URN: FICTIONAL-RLPDF-" + m.seed,
    ].join("\n"),
    markers: corrected ? ["corrected_charge_sheet"] : ["charge_sheet"],
  };
}

function mg5Page(m: RealLayoutStressSampleManifest): StressBundlePage {
  return {
    pageId: "mg5",
    title: "MG5 — Case Summary",
    body: [
      "MG5 CASE SUMMARY (Fictional)",
      "",
      `Defendant: ${m.expectedDefendant}`,
      `Offence: ${m.expectedCharge}`,
      "",
      "Prosecution summary:",
      "On the papers currently available, the Crown summary describes the incident in provisional terms.",
      "Further material is outstanding before the position can be finalised.",
      "",
      ...m.expectedMissingMaterial.map(
        (miss) => `Outstanding / not yet served: ${miss} — chase disclosure.`,
      ),
      "",
      ...m.expectedContradictions.map((c) => `Unresolved on papers: ${c}`),
    ].join("\n"),
    markers: ["mg5"],
  };
}

function mg6Page(m: RealLayoutStressSampleManifest): StressBundlePage {
  const incomplete = m.layoutTags.includes("mg6_incomplete");
  return {
    pageId: "mg6",
    title: "MG6 — Disclosure Schedule",
    body: [
      "MG6 DISCLOSURE SCHEDULE (Fictional)",
      incomplete ? "STATUS: INCOMPLETE — schedules partially populated." : "",
      "",
      "Sensitive material schedule: [blank / partial]",
      "Non-sensitive schedule:",
      "- MG11 witness statements (partial)",
      "- CCTV stills (master not served)",
      "- CAD summary (full log outstanding)",
      "",
      ...m.expectedDisclosurePriorities.map((d) => `Priority chase: ${d}`),
    ]
      .filter(Boolean)
      .join("\n"),
    markers: incomplete ? ["mg6_incomplete", "mg6"] : ["mg6"],
  };
}

function mg11Page(m: RealLayoutStressSampleManifest): StressBundlePage {
  return {
    pageId: "mg11",
    title: "MG11 — Witness Statement",
    body: [
      "MG11 WITNESS STATEMENT (Fictional)",
      "",
      "I am a fictional police officer. My statement is provisional for stress testing.",
      `I deal with ${m.expectedDefendant} in relation to ${m.expectedCharge}.`,
      "",
      ...m.expectedContradictions.map((c) => `Conflict noted on papers: ${c}`),
      "Human review required — do not treat as agreed fact.",
    ].join("\n"),
    markers: m.layoutTags.includes("mg11_weird_placement") ? ["mg11_weird_placement", "mg11"] : ["mg11"],
  };
}

function cctvPage(m: RealLayoutStressSampleManifest): StressBundlePage {
  return {
    pageId: "cctv_stills",
    title: "CCTV Stills",
    body: [
      "CCTV STILLS (Fictional)",
      "[SCANNED IMAGE PAGE — OCR UNCERTAIN]",
      "",
      "Still frames attached. Master footage / export log NOT in bundle.",
      "Outstanding: cctv master; cctv export log.",
      "Continuity: partial — solicitor review required.",
    ].join("\n"),
    markers: ["cctv_stills_no_master", "scanned_page_marker"],
  };
}

function cadPage(m: RealLayoutStressSampleManifest): StressBundlePage {
  return {
    pageId: "cad_summary",
    title: "CAD Summary",
    body: [
      "CAD SUMMARY (Fictional — partial)",
      "",
      "Dispatch reference: FICTIONAL-CAD-" + m.seed,
      "Summary only — full CAD log outstanding / not served.",
      "Outstanding: full CAD log.",
    ].join("\n"),
    markers: ["cad_summary_no_full"],
  };
}

function nineNineNinePage(m: RealLayoutStressSampleManifest): StressBundlePage {
  return {
    pageId: "999_summary",
    title: "999 Summary",
    body: [
      "999 CALL SUMMARY (Fictional)",
      "",
      "Summary transcript only. Audio recording not in bundle.",
      "Outstanding: 999 audio.",
    ].join("\n"),
    markers: ["999_summary_no_audio"],
  };
}

function interviewPage(m: RealLayoutStressSampleManifest): StressBundlePage {
  return {
    pageId: "interview_summary",
    title: "Interview Summary",
    body: [
      "INTERVIEW SUMMARY (Fictional)",
      "",
      "Summary of interview under caution. Full transcript / recording not served.",
      "Outstanding: interview transcript; interview recording.",
      "PACE compliance notes: review with custody record.",
    ].join("\n"),
    markers: ["interview_summary_no_transcript"],
  };
}

function custodyPage(m: RealLayoutStressSampleManifest): StressBundlePage {
  return {
    pageId: "custody_pace",
    title: "Custody Record / PACE",
    body: [
      "CUSTODY RECORD / PACE NOTES (Fictional)",
      "[HANDWRITTEN-STYLE NOTE SIMULATION — OCR UNCERTAIN]",
      "",
      "Detention authorised. PACE review notes partial.",
      "Outstanding: PACE review notes; custody CCTV.",
    ].join("\n"),
    markers: ["custody_pace_notes"],
  };
}

function emailPage(m: RealLayoutStressSampleManifest): StressBundlePage {
  return {
    pageId: "email_screenshot",
    title: "Email Screenshot",
    body: [
      "EMAIL SCREENSHOT (Fictional Exhibit)",
      "",
      "Screenshot of email — headers / continuity incomplete.",
      "Exhibit label placement inconsistent with index.",
      "Outstanding: original email headers.",
    ].join("\n"),
    markers: ["email_screenshot_page", "exhibit_continuity_weird"],
  };
}

function exhibitPage(m: RealLayoutStressSampleManifest): StressBundlePage {
  return {
    pageId: "exhibit_schedule",
    title: "Exhibit Schedule",
    body: [
      "EXHIBIT SCHEDULE (Fictional)",
      "",
      "Exhibit references do not align cleanly with MG5 body text.",
      "Continuity statement outstanding.",
      ...m.expectedContradictions
        .filter((c) => /exhibit|continuity/i.test(c))
        .map((c) => `Continuity issue: ${c}`),
    ].join("\n"),
    markers: ["exhibit_continuity_weird"],
  };
}

function coverPage(m: RealLayoutStressSampleManifest): StressBundlePage {
  return {
    pageId: "cover",
    title: "Bundle Cover",
    body: [
      fictionalBanner(m),
      `Defendant: ${m.expectedDefendant}`,
      `Charge: ${m.expectedCharge}`,
      `Layout tags: ${m.layoutTags.join(", ")}`,
    ].join("\n"),
    markers: [],
  };
}

function pageNeeded(m: RealLayoutStressSampleManifest, tag: string): boolean {
  return m.layoutTags.includes(tag as never);
}

/** Build ordered pages; order shuffled by layout stress tags. */
export function buildStressBundlePages(m: RealLayoutStressSampleManifest): StressBundlePage[] {
  const pages: StressBundlePage[] = [coverPage(m)];

  const pool: StressBundlePage[] = [];
  pool.push(indexPage(m));

  if (pageNeeded(m, "mg11_weird_placement")) pool.push(mg11Page(m));

  if (pageNeeded(m, "corrected_charge_sheet")) {
    pool.push(chargePage(m, false));
  } else {
    pool.push(chargePage(m, false));
  }

  if (!pageNeeded(m, "mg11_weird_placement")) pool.push(mg11Page(m));

  pool.push(mg6Page(m));

  if (pageNeeded(m, "cctv_stills_no_master")) pool.push(cctvPage(m));
  if (pageNeeded(m, "cad_summary_no_full")) pool.push(cadPage(m));
  if (pageNeeded(m, "999_summary_no_audio")) pool.push(nineNineNinePage(m));
  if (pageNeeded(m, "interview_summary_no_transcript")) pool.push(interviewPage(m));
  if (pageNeeded(m, "custody_pace_notes")) pool.push(custodyPage(m));
  if (pageNeeded(m, "email_screenshot_page")) pool.push(emailPage(m));
  if (
    pageNeeded(m, "exhibit_continuity_weird") &&
    !pageNeeded(m, "email_screenshot_page")
  ) {
    pool.push(exhibitPage(m));
  }

  if (pageNeeded(m, "mg5_buried_late")) {
    pages.push(...pool);
    pages.push(mg5Page(m));
  } else {
    pool.splice(Math.min(2, pool.length), 0, mg5Page(m));
    pages.push(...pool);
  }

  if (pageNeeded(m, "corrected_charge_sheet")) {
    pages.push(chargePage(m, true));
  }

  if (pageNeeded(m, "duplicate_page") && pages.length > 2) {
    const dup = { ...pages[2]!, pageId: pages[2]!.pageId + "_dup", title: pages[2]!.title + " (DUPLICATE)" };
    pages.splice(3, 0, dup);
  }

  if (pageNeeded(m, "rotated_page_marker")) {
    for (const p of pages) {
      if (p.pageId === "cctv_stills" || p.pageId === "mg11") {
        p.markers.push("rotated_page_marker");
        p.body = "[PAGE MARKER: ROTATED 90°]\n" + p.body;
      }
    }
  }

  if (pageNeeded(m, "light_ocr_noise")) {
    for (const p of pages) {
      if (p.pageId === "mg5" || p.pageId === "charge_sheet") {
        p.body = "[OCR_NOISE_SIMULATION]\n" + applyOcrNoise(p.body);
        p.markers.push("light_ocr_noise");
      }
    }
  }

  if (pageNeeded(m, "multi_defendant") && m.coDefendants?.length) {
    pages.push({
      pageId: "co_defendant_sheet",
      title: "Co-defendant Cover Sheet",
      body: `Co-defendant(s): ${m.coDefendants.join("; ")}\nJoint enterprise / attribution remains provisional.`,
      markers: ["multi_defendant"],
    });
  }

  if (pageNeeded(m, "multi_count") && m.extraCounts?.length) {
    pages.push({
      pageId: "multi_count_schedule",
      title: "Additional Counts Schedule",
      body: `Additional counts on indictment: ${m.extraCounts.join("; ")}`,
      markers: ["multi_count"],
    });
  }

  return pages;
}

export function pagesToFixtureText(pages: StressBundlePage[]): string {
  return pages
    .map((p, i) => `--- PAGE ${i + 1}: ${p.title} (${p.pageId}) ---\n${p.body}`)
    .join("\n\n");
}
