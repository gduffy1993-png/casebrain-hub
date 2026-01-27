/**
 * Weapon Proof Tracker
 * 
 * Tracks alleged weapons and their evidence status deterministically.
 * No predictions - only records what is present or absent in the evidence.
 */

export type WeaponObservationStatus = "yes" | "no" | "unclear";

export type WeaponTracker = {
  allegedWeapon: string;
  visuallyObserved: WeaponObservationStatus;
  weaponRecovered: WeaponObservationStatus;
  forensicConfirmation: WeaponObservationStatus;
  disclosureDependent: boolean;
};

/**
 * Extract weapon information from documents and evidence
 */
export function extractWeaponTracker(
  documents: Array<{ name: string; extracted_json?: unknown }>,
  evidenceImpactMap?: Array<{ evidenceItem: { name: string; urgency?: string } }>
): WeaponTracker | null {
  // Search for weapon mentions in document names and extracted JSON
  const corpus = documents
    .map((d) => {
      const name = d.name.toLowerCase();
      const json = typeof d.extracted_json === "string" 
        ? d.extracted_json.toLowerCase()
        : JSON.stringify(d.extracted_json || {}).toLowerCase();
      return `${name} ${json}`;
    })
    .join(" ");

  // Common weapon terms
  const weaponPatterns = [
    /(?:glass|bottle|knife|blade|weapon|object|item|implement|tool)\s*(?:used|alleged|wielded|brandished|thrown|struck)/i,
    /(?:weapon|object|item)\s*(?:was|is|allegedly)/i,
  ];

  const weaponMatch = corpus.match(weaponPatterns[0]) || corpus.match(weaponPatterns[1]);
  
  if (!weaponMatch) {
    return null; // No weapon mentioned
  }

  // Extract weapon type (simplified - look for common terms)
  let allegedWeapon = "unknown weapon";
  const weaponTypes = ["glass bottle", "bottle", "knife", "blade", "weapon", "object", "item", "implement"];
  for (const type of weaponTypes) {
    if (corpus.includes(type)) {
      allegedWeapon = type;
      break;
    }
  }

  // Check visual observation status
  let visuallyObserved: WeaponObservationStatus = "unclear";
  const visualPatterns = {
    yes: [
      /(?:saw|seen|observed|witnessed|visible|clear|distinct)\s*(?:the|a|an)?\s*(?:weapon|object|item|bottle|knife)/i,
      /(?:complainant|witness|victim)\s*(?:saw|seen|observed|witnessed)\s*(?:the|a|an)?\s*(?:weapon|object|item)/i,
    ],
    no: [
      /(?:did\s*not\s*see|not\s*seen|not\s*visible|unclear|uncertain|could\s*not\s*see)/i,
      /(?:poor\s*visibility|poor\s*lighting|could\s*not\s*make\s*out)/i,
    ],
  };

  if (visualPatterns.yes.some((p) => p.test(corpus))) {
    visuallyObserved = "yes";
  } else if (visualPatterns.no.some((p) => p.test(corpus))) {
    visuallyObserved = "no";
  }

  // Check weapon recovery
  let weaponRecovered: WeaponObservationStatus = "unclear";
  const recoveryPatterns = {
    yes: [
      /(?:recovered|seized|found|located|retrieved|exhibited)/i,
      /(?:weapon|object|item|bottle|knife)\s*(?:was|has\s*been)\s*(?:recovered|seized|found)/i,
    ],
    no: [
      /(?:not\s*recovered|not\s*seized|not\s*found|never\s*recovered|missing)/i,
    ],
  };

  if (recoveryPatterns.yes.some((p) => p.test(corpus))) {
    weaponRecovered = "yes";
  } else if (recoveryPatterns.no.some((p) => p.test(corpus))) {
    weaponRecovered = "no";
  } else {
    weaponRecovered = "unclear";
  }

  // Check forensic confirmation
  let forensicConfirmation: WeaponObservationStatus = "no";
  const forensicPatterns = [
    /(?:forensic|dna|fingerprint|analysis|examination)\s*(?:on|of|from)\s*(?:the|a|an)?\s*(?:weapon|object|item|bottle|knife)/i,
    /(?:forensic|dna|fingerprint)\s*(?:evidence|report|analysis)/i,
  ];

  if (forensicPatterns.some((p) => p.test(corpus))) {
    forensicConfirmation = "yes";
  }

  // Check if disclosure-dependent
  const disclosureDependent = evidenceImpactMap?.some((impact) => {
    const item = impact.evidenceItem.name.toLowerCase();
    return item.includes("weapon") || 
           item.includes("forensic") || 
           item.includes("exhibit") ||
           (impact.evidenceItem.urgency?.toLowerCase().includes("missing") || 
            impact.evidenceItem.urgency?.toLowerCase().includes("outstanding"));
  }) || false;

  return {
    allegedWeapon,
    visuallyObserved,
    weaponRecovered,
    forensicConfirmation,
    disclosureDependent,
  };
}
