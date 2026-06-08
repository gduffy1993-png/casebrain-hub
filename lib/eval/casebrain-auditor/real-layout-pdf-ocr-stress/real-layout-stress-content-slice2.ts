import type { RealLayoutStressSampleManifest } from "./real-layout-stress-types";
import type { StressBundlePage } from "./real-layout-stress-content";

function heavyOcrNoise(text: string, seed = 0): string {
  let i = 0;
  return text
    .replace(/[aeiou]/gi, (c) => (((seed + i++) % 3) !== 0 ? c : " "))
    .replace(/\b(section)\b/gi, "s3ct1on")
    .replace(/\b(contrary)\b/gi, "c0ntr@ry")
    .replace(/\b(driving)\b/gi, "dr1v1ng")
    .replace(/\b(fraud)\b/gi, "fr@ud")
    .replace(/\b(robbery)\b/gi, "r0bbery")
    .replace(/\b(wounding)\b/gi, "w0und1ng")
    .replace(/\s{2,}/g, " ");
}

function brokenChargeWording(charge: string): string {
  const words = charge.split(" ");
  const mid = Math.floor(words.length / 2);
  return [...words.slice(0, mid), "\n--- OCR BREAK ---\n", ...words.slice(mid)].join(" ");
}

function stripOutstandingPhrases(text: string): string {
  return text
    .replace(/\boutstanding\b/gi, "on file")
    .replace(/\bnot yet served\b/gi, "listed")
    .replace(/\bnot served\b/gi, "listed")
    .replace(/\bnot in bundle\b/gi, "indexed")
    .replace(/\bchase disclosure\b/gi, "review");
}

export function applySlice2HardPatterns(
  m: RealLayoutStressSampleManifest,
  pages: StressBundlePage[],
): StressBundlePage[] {
  let out = [...pages];

  if (m.layoutTags.includes("blank_separator_page")) {
    out.splice(1, 0, {
      pageId: "blank_separator",
      title: "",
      body: "",
      markers: ["blank_separator_page"],
      blank: true,
    });
  }

  if (m.layoutTags.includes("split_bundle_sections")) {
    const splitAt = Math.max(2, Math.floor(out.length / 2));
    out.splice(splitAt, 0, {
      pageId: "split_section_break",
      title: "=== BUNDLE SECTION B (split) ===",
      body: "Fictional split bundle — section boundary. Index may not match section B pagination.",
      markers: ["split_bundle_sections"],
      repeatHeader: "SECTION B — FICTIONAL SPLIT",
    });
  }

  if (m.layoutTags.includes("repeated_header_footer")) {
    const hf = `CPS FICTIONAL BUNDLE — ${m.sampleId} — DO NOT USE IN COURT`;
    out = out.map((p) => ({ ...p, repeatHeader: hf, repeatFooter: `Page ref ${m.seed} — provisional` }));
  }

  if (m.layoutTags.includes("broken_charge_wording") || m.trapProfile?.chargeObscured) {
    out = out.map((p) => {
      if (p.pageId !== "charge_sheet" && p.pageId !== "charge_corrected") return p;
      return {
        ...p,
        body: `[OCR_BREAK_CHARGE]\n${heavyOcrNoise(brokenChargeWording(p.body), m.seed)}`,
        markers: [...p.markers, "broken_charge_wording"],
      };
    });
  }

  if (m.layoutTags.includes("mg_label_corrupted")) {
    out = out.map((p) => {
      if (!/^mg/i.test(p.pageId) && p.pageId !== "mg5" && !p.title.startsWith("MG")) return p;
      return {
        ...p,
        title: p.title.replace(/^MG/, "M G").replace("—", "- -"),
        body: p.body.replace(/MG5/g, "M G 5").replace(/MG6/g, "M G 6").replace(/MG11/g, "M G 1 1"),
        markers: [...p.markers, "mg_label_corrupted"],
      };
    });
  }

  if (m.layoutTags.includes("index_body_mismatch")) {
    out = out.map((p) => {
      if (p.pageId !== "index") return p;
      return {
        ...p,
        body:
          p.body +
          "\n\nINDEX NOTE: MG11 witness statement — PRESENT (page 4)\nINDEX NOTE: Expert collision report — PRESENT (page 11)",
        markers: [...p.markers, "index_body_mismatch"],
      };
    });
    out = out.filter((p) => p.pageId !== "mg11");
  }

  if (m.layoutTags.includes("body_not_in_index")) {
    out.push({
      pageId: "orphan_unused_schedule",
      title: "Unused Material Schedule (not in index)",
      body: "UNUSED MATERIAL SCHEDULE — document body present but not listed in bundle index.",
      markers: ["body_not_in_index"],
    });
  }

  if (m.defendantVariants?.length) {
    const variantBlock = m.defendantVariants.map((v) => `Name variant on papers: ${v}`).join("\n");
    out = out.map((p) => {
      if (p.pageId !== "cover" && p.pageId !== "index") return p;
      return { ...p, body: `${p.body}\n\n${variantBlock}`, markers: [...p.markers, "defendant_name_variants"] };
    });
  }

  if (m.layoutTags.includes("co_defendant_name_proximity") && m.coDefendants?.length) {
    out = out.map((p) => {
      if (p.pageId !== "charge_sheet") return p;
      return {
        ...p,
        body: `${p.body}\n\nCo-defendant named adjacent to client: ${m.coDefendants!.join(" / ")} (${m.expectedDefendant})`,
        markers: [...p.markers, "co_defendant_name_proximity"],
      };
    });
  }

  if (m.layoutTags.includes("charge_sheet_conflict")) {
    const old = out.find((p) => p.pageId === "charge_sheet");
    if (old) {
      out.push({
        pageId: "charge_conflict_old",
        title: "Charge Sheet (superseded — conflicts)",
        body: `${old.body}\n\nCONFLICT: earlier charge wording differs from corrected sheet — solicitor review.`,
        markers: ["charge_sheet_conflict"],
      });
    }
  }

  if (m.layoutTags.includes("interview_in_custody_log")) {
    out = out.map((p) => {
      if (p.pageId !== "custody_pace") return p;
      return {
        ...p,
        body: `${p.body}\n\n--- embedded interview summary ---\nINTERVIEW SUMMARY (in custody log): denies involvement; full transcript not served.`,
        markers: [...p.markers, "interview_in_custody_log"],
      };
    });
    out = out.filter((p) => p.pageId !== "interview_summary");
  }

  if (m.layoutTags.includes("cctv_export_log_absent")) {
    out = out.map((p) => {
      if (p.pageId !== "cctv_stills") return p;
      return {
        ...p,
        body: `${p.body}\n\nCCTV stills listed. Export log: ABSENT from bundle.`,
        markers: [...p.markers, "cctv_export_log_absent"],
      };
    });
  }

  if (m.layoutTags.includes("continuity_separated")) {
    out.push({
      pageId: "continuity_orphan",
      title: "Exhibit Continuity Statement (separated)",
      body: "CONTINUITY STATEMENT — separated from exhibit list. Provenance incomplete on papers.",
      markers: ["continuity_separated"],
    });
    out = out.filter((p) => p.pageId !== "exhibit_schedule");
  }

  if (m.layoutTags.includes("heavy_ocr_noise")) {
    out = out.map((p) => {
      if (p.blank || p.pageId === "scanned_blank") return p;
      if (p.pageId === "charge_sheet" || p.pageId === "mg5" || p.pageId === "index") {
        return { ...p, body: `[HEAVY_OCR]\n${heavyOcrNoise(p.body, m.seed)}`, markers: [...p.markers, "heavy_ocr_noise"] };
      }
      return p;
    });
  }

  if (m.layoutTags.includes("true_rotated_page")) {
    out = out.map((p) => {
      if (p.pageId === "cctv_stills" || p.pageId === "mg11") {
        return { ...p, rotate: true, markers: [...p.markers, "true_rotated_page"] };
      }
      return p;
    });
  }

  if (m.layoutTags.includes("scanned_image_page") || m.trapProfile?.thinScannedUnsafe) {
    const insertAt = Math.min(2, out.length);
    out.splice(insertAt, 0, {
      pageId: "scanned_blank",
      title: "[SCANNED IMAGE PAGE]",
      body: "[SCANNED IMAGE — NO MACHINE-READABLE TEXT]\n[OCR UNCERTAIN]",
      markers: ["scanned_image_page"],
      blank: true,
    });
  }

  if (m.trapProfile?.indexListsMissingOnly) {
    out = out.map((p) => {
      if (p.pageId === "index") {
        const missingLines = m.expectedMissingMaterial.map((x) => `INDEX: ${x} — OUTSTANDING`).join("\n");
        return { ...p, body: `${p.body}\n\n${missingLines}`, markers: [...p.markers, "index_lists_missing"] };
      }
      if (p.pageId === "mg5" || p.pageId === "mg6") {
        return { ...p, body: stripOutstandingPhrases(p.body), markers: [...p.markers, "body_strips_missing"] };
      }
      return p;
    });
  }

  if (m.trapProfile?.contradictionLayoutOnly && m.expectedContradictions.length) {
    out = out.map((p) => {
      if (p.pageId !== "mg5") return p;
      const hidden = m.expectedContradictions.map((c) => `[CORRUPTED_LAYOUT_ONLY] ${c}`).join("\n");
      return {
        ...p,
        body: heavyOcrNoise(`${p.body}\n\n${hidden}`, m.seed),
        markers: [...p.markers, "contradiction_layout_only"],
      };
    });
  }

  if (m.trapProfile?.thinScannedUnsafe && /^rlpdf-0(45|50)$/.test(m.sampleId)) {
    out = [
      {
        pageId: "cover",
        title: "Bundle Cover",
        body: `FICTIONAL THIN SCAN — ${m.expectedDefendant}`,
        markers: [],
      },
      {
        pageId: "scanned_blank",
        title: "[SCANNED PAGE ONLY]",
        body: "[SCANNED IMAGE — NO USABLE TEXT]",
        markers: ["scanned_image_page", "thin_trap"],
        blank: true,
      },
    ];
  }

  return out;
}
