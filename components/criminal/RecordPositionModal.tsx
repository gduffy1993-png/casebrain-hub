"use client";

import { useState, useMemo } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/Toast";

type ChargeSummary = { offence: string; section: string | null };

type RecordPositionModalProps = {
  caseId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialText?: string;
  currentPhase?: number;
  onPhase2Request?: () => void;
  showPhase2CTA?: boolean;
  onAutoAdvanceToPhase2?: () => void;
  /** Charges for this case – used to show offence-appropriate defence presets */
  charges?: ChargeSummary[];
};

type Preset = { label: string; text: string };

// Always shown for every criminal case
const GENERIC_PRESETS: Preset[] = [
  {
    label: "Reserved pending disclosure",
    text: "Position reserved pending full disclosure. Awaiting CCTV, witness statements, and forensic evidence before committing to a defence strategy.",
  },
];

// Assault / OAPA (s18, s20, wounding, GBH)
const ASSAULT_PRESETS: Preset[] = [
  {
    label: "Deny intent (s18) / alternative s20",
    text: "Defence position: Deny intent to cause GBH (s18). Alternative position: Accept act but dispute intent - alternative charge s20 (unlawful wounding) may be appropriate. Awaiting full disclosure to confirm.",
  },
  {
    label: "Accept act, dispute intent (s18→s20)",
    text: "Defence position: Accept the act occurred but dispute intent to cause GBH. Seeking charge reduction from s18 to s20 (unlawful wounding). Basis: [to be completed after disclosure].",
  },
  {
    label: "Self-defence / lawful excuse",
    text: "Defence position: Self-defence / lawful excuse. [Details to be completed after full disclosure and client instructions].",
  },
];

// Robbery
const ROBBERY_PRESETS: Preset[] = [
  {
    label: "Deny offence / wrong person (ID)",
    text: "Defence position: Deny the offence. Wrong person / identification in issue. [Alibi or presence to be confirmed after disclosure and client instructions].",
  },
  {
    label: "Deny intent to steal / no robbery",
    text: "Defence position: Deny intent to steal or use of force for theft. [e.g. belief in right to property / no appropriation / no force or threat – to be completed after disclosure].",
  },
];

// Theft / burglary
const THEFT_PRESETS: Preset[] = [
  {
    label: "Deny offence / wrong person",
    text: "Defence position: Deny the offence. [Identification / alibi / presence to be confirmed after disclosure and client instructions].",
  },
  {
    label: "Deny dishonesty / intent",
    text: "Defence position: Deny dishonesty or intent. [Belief in right / borrowing / lack of intention to permanently deprive – to be completed after disclosure].",
  },
];

// Arson / criminal damage by fire
const ARSON_PRESETS: Preset[] = [
  {
    label: "Deny offence / wrong person",
    text: "Defence position: Deny the offence. [Identification / alibi / presence to be confirmed after disclosure and client instructions].",
  },
  {
    label: "Deny intent / lawful excuse (arson)",
    text: "Defence position: Deny intention to destroy or damage property, or lawful excuse. [Accident / no intent to damage / belief in lawful excuse – to be completed after disclosure].",
  },
];

// Criminal damage (non-arson)
const CRIMINAL_DAMAGE_PRESETS: Preset[] = [
  {
    label: "Deny offence / wrong person",
    text: "Defence position: Deny the offence. [Identification / alibi to be confirmed after disclosure and client instructions].",
  },
  {
    label: "Deny intent / lawful excuse",
    text: "Defence position: Deny intention to destroy or damage, or lawful excuse. [To be completed after disclosure].",
  },
];

// Drugs (possession, supply, intent to supply)
const DRUGS_PRESETS: Preset[] = [
  {
    label: "Deny possession / not mine",
    text: "Defence position: Deny possession / knowledge. [Not in possession / not aware / wrong person – to be completed after disclosure and client instructions].",
  },
  {
    label: "Deny intent to supply / personal use",
    text: "Defence position: Accept possession but deny intent to supply. Personal use only. [To be completed after disclosure].",
  },
];

// Fraud / false representation
const FRAUD_PRESETS: Preset[] = [
  {
    label: "Deny offence / wrong person",
    text: "Defence position: Deny the offence. [Identification / no involvement – to be confirmed after disclosure and client instructions].",
  },
  {
    label: "Deny dishonesty / no intent to defraud",
    text: "Defence position: Deny dishonesty or intent to make gain / cause loss. [Belief in right / no false representation – to be completed after disclosure].",
  },
];

// Sexual offences
const SEXUAL_PRESETS: Preset[] = [
  {
    label: "Deny offence / wrong person (ID)",
    text: "Defence position: Deny the offence. Identification in issue. [To be confirmed after disclosure and client instructions].",
  },
  {
    label: "Consent / reasonable belief",
    text: "Defence position: Consent or reasonable belief in consent. [Details to be completed after full disclosure and client instructions].",
  },
];

// Public order (affray, violent disorder, etc.)
const PUBLIC_ORDER_PRESETS: Preset[] = [
  {
    label: "Deny offence / wrong person",
    text: "Defence position: Deny the offence. [Identification / presence / role – to be confirmed after disclosure and client instructions].",
  },
  {
    label: "Deny intent / self-defence",
    text: "Defence position: Deny intent to cause fear / violence, or self-defence / lawful excuse. [To be completed after disclosure].",
  },
  {
    label: "Self-defence / lawful excuse",
    text: "Defence position: Self-defence / lawful excuse. [Details to be completed after full disclosure and client instructions].",
  },
];

// Generic fallback when no specific offence type detected
const OTHER_PRESETS: Preset[] = [
  {
    label: "Deny offence / wrong person",
    text: "Defence position: Deny the offence. [Identification / alibi / presence to be confirmed after disclosure and client instructions].",
  },
  {
    label: "Deny intent / seek lesser charge",
    text: "Defence position: Accept act but dispute intent or seriousness. Seeking to put prosecution to proof or to reduce to a lesser charge. Basis: [to be completed after disclosure].",
  },
];

function getOffenceCategories(charges: ChargeSummary[]): {
  assault: boolean;
  robbery: boolean;
  theft: boolean;
  arson: boolean;
  criminalDamage: boolean;
  drugs: boolean;
  fraud: boolean;
  sexual: boolean;
  publicOrder: boolean;
} {
  const combined = charges
    .map((c) => `${(c.offence || "").toLowerCase()} ${(c.section || "").toLowerCase()}`)
    .join(" ");
  return {
    assault: /\b(s\.?18|s\.?20|section 18|section 20|oapa|wounding|gbh|abh|assault|malicious)\b/i.test(combined),
    robbery: /\b(robbery|rob)\b/i.test(combined),
    theft: /\b(theft|burglary|burgle|stolen)\b/i.test(combined),
    arson: /\b(arson|arson\s|fire\s+with\s+intent|criminal damage by fire)\b/i.test(combined),
    criminalDamage: /\b(criminal damage|damage to property|s\.?1\s+cda|s\.?1\(1\)|s\.?1\(2\)|s\.?1\(3\))\b/i.test(combined),
    drugs: /\b(drug|possession|supply|intent to supply|controlled drug|misuse of drugs|mda|pca)\b/i.test(combined),
    fraud: /\b(fraud|false representation|dishonestly|fraud act)\b/i.test(combined),
    sexual: /\b(rape|sexual assault|indecent|sexual offence)\b/i.test(combined),
    publicOrder: /\b(affray|violent disorder|public order|s\.?3\s+poa|s\.?4\s+poa|s\.?5\s+poa)\b/i.test(combined),
  };
}

function buildPresetsForCharges(charges: ChargeSummary[]): Preset[] {
  const cats = getOffenceCategories(charges);
  const out: Preset[] = [...GENERIC_PRESETS];
  const seen = new Set(out.map((p) => p.label));

  const add = (presets: Preset[]) => {
    presets.forEach((p) => {
      if (!seen.has(p.label)) {
        seen.add(p.label);
        out.push(p);
      }
    });
  };

  if (cats.assault) add(ASSAULT_PRESETS);
  if (cats.robbery) add(ROBBERY_PRESETS);
  if (cats.theft) add(THEFT_PRESETS);
  if (cats.arson) add(ARSON_PRESETS);
  else if (cats.criminalDamage) add(CRIMINAL_DAMAGE_PRESETS);
  if (cats.drugs) add(DRUGS_PRESETS);
  if (cats.fraud) add(FRAUD_PRESETS);
  if (cats.sexual) add(SEXUAL_PRESETS);
  if (cats.publicOrder) add(PUBLIC_ORDER_PRESETS);

  // Every criminal case gets these two options (by label dedup they may already be in from a category above)
  add(OTHER_PRESETS);

  return out;
}

export function RecordPositionModal({
  caseId,
  isOpen,
  onClose,
  onSuccess,
  initialText = "",
  currentPhase = 1,
  onPhase2Request,
  showPhase2CTA = false,
  onAutoAdvanceToPhase2,
  charges = [],
}: RecordPositionModalProps) {
  const [positionText, setPositionText] = useState(initialText);
  const [isSaving, setIsSaving] = useState(false);
  const { push: showToast } = useToast();

  const positionTemplates = useMemo(
    () => buildPresetsForCharges(charges),
    [charges]
  );

  // Auto-save and advance to Phase 2 when preset is clicked
  const handlePresetClick = async (template: { label: string; text: string }) => {
    setPositionText(template.text);
    
    // Immediately POST the position
    setIsSaving(true);
    try {
      const response = await fetch(`/api/criminal/${caseId}/position`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          position_text: template.text.trim(),
          phase: 2, // Always set to Phase 2 when using preset
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to save position" }));
        throw new Error(errorData.error || `Failed to save position (${response.status})`);
      }

      showToast("Defence position saved. Advancing to Phase 2.", "success");
      onSuccess();
      onClose();
      setPositionText("");
      
      // Auto-advance to Phase 2
      if (onAutoAdvanceToPhase2) {
        onAutoAdvanceToPhase2();
        // Scroll to Phase 2 section after a brief delay
        setTimeout(() => {
          const phase2Section = document.querySelector('[data-phase-2-section]') as HTMLElement;
          if (phase2Section) {
            phase2Section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            phase2Section.focus();
          }
        }, 100);
      }
    } catch (error) {
      console.error("[RecordPositionModal] Failed to auto-save preset:", error);
      showToast(
        error instanceof Error ? error.message : "Failed to save position. Please try again.",
        "error"
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!positionText.trim()) {
      showToast("Position text cannot be empty", "error");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/criminal/${caseId}/position`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          position_text: positionText.trim(),
          phase: currentPhase,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to save position" }));
        throw new Error(errorData.error || `Failed to save position (${response.status})`);
      }

      showToast("Defence position saved. Phase 2 is now unlocked.", "success");
      onSuccess();
      onClose();
      setPositionText("");
    } catch (error) {
      console.error("[RecordPositionModal] Failed to save position:", error);
      showToast(
        error instanceof Error ? error.message : "Failed to save position. Please try again.",
        "error"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setPositionText(initialText);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-surface border border-border rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">Record Current Position</h2>
          <button
            onClick={handleCancel}
            className="text-muted-foreground hover:text-foreground transition-colors"
            disabled={isSaving}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Template Buttons */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Common defence positions
            </label>
            <div className="grid grid-cols-2 gap-2">
              {positionTemplates.map((template, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetClick(template)}
                  disabled={isSaving}
                  className="text-left justify-start h-auto py-2 px-3 text-xs"
                >
                  {template.label}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-3">
              This records the legal defence position as it stands today. You will choose how to run the case next.
            </p>
            <label className="block text-sm font-medium text-foreground mb-2">
              Position Text <span className="text-danger">*</span>
            </label>
            <textarea
              value={positionText}
              onChange={(e) => setPositionText(e.target.value)}
              placeholder="Enter the current defence position..."
              className="w-full min-h-[200px] px-3 py-2 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-y"
              disabled={isSaving}
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-1">
              {positionText.length} characters
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-3 p-6 border-t border-border">
          {showPhase2CTA && (
            <div className="flex items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
              <p className="text-xs text-blue-300/80 flex-1">
                Defence position saved. Phase 2 is now unlocked — you can now choose how to run the case.
              </p>
              {onPhase2Request && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onPhase2Request();
                    onClose();
                  }}
                  className="text-xs"
                >
                  Go to Phase 2
                </Button>
              )}
            </div>
          )}
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !positionText.trim()}
              className="min-w-[100px]"
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

