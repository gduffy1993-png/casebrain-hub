"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Scale, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { normalizeApiResponse, isGated } from "@/lib/api-response-normalizer";

type EvidenceStrength = {
  overallStrength: number;
  level: "VERY_WEAK" | "WEAK" | "MODERATE" | "STRONG" | "VERY_STRONG";
  factors: {
    identification: { strength: number; hasCCTV: boolean; hasWitnesses: boolean; hasFacialRecognition: boolean; hasFormalProcedure: boolean };
    forensics: { strength: number; hasWeapon: boolean; hasFingerprints: boolean; hasDNA: boolean; hasChainOfCustody: boolean };
    witnesses: { strength: number; count: number; hasComplainant: boolean; hasIndependent: boolean; consistency: string };
    pace: { strength: number; isCompliant: boolean; hasSolicitor: boolean; isRecorded: boolean; hasRightsGiven: boolean };
    medical: { strength: number; hasEvidence: boolean; isConsistent: boolean };
    disclosure: { strength: number; hasGaps: boolean; gapSeverity: string; isFoundational: boolean };
  };
  calibration: {
    shouldDowngradeDisclosureStay: boolean;
    shouldDowngradePACE: boolean;
    shouldFocusOnPleaMitigation: boolean;
    realisticOutcome: string;
    languageTone: string;
  };
  warnings: string[];
};

type EvidenceStrengthPanelProps = {
  caseId: string;
};

export function EvidenceStrengthPanel({ caseId }: EvidenceStrengthPanelProps) {
  const [strength, setStrength] = useState<EvidenceStrength | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStrength() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/cases/${caseId}/evidence-strength`);
        if (!response.ok) {
          throw new Error("Failed to fetch evidence strength");
        }

        const result = await response.json();
        const normalized = normalizeApiResponse<EvidenceStrength>(result);

        if (isGated(normalized)) {
          setError("Analysis unavailable. Upload text-based PDFs to generate evidence strength.");
          setStrength(null);
          return;
        }

        setStrength(normalized.data || result);
      } catch (err) {
        console.error("Failed to fetch evidence strength:", err);
        setError("Evidence strength not available yet.");
      } finally {
        setLoading(false);
      }
    }

    fetchStrength();
  }, [caseId]);

  const getLevelColor = (level: string) => {
    if (level === "VERY_STRONG" || level === "STRONG") return "text-red-400";
    if (level === "MODERATE") return "text-yellow-400";
    return "text-green-400";
  };

  const getLevelBadge = (level: string) => {
    if (level === "VERY_STRONG" || level === "STRONG") return "danger";
    if (level === "MODERATE") return "warning";
    return "success";
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Analyzing evidence strength…</span>
        </div>
      </Card>
    );
  }

  if (error || !strength) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">
          {error || "Evidence strength not available yet."}
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6 border-2 border-orange-500/20">
      <div className="flex items-center gap-2 mb-4">
        <Scale className="h-5 w-5 text-orange-400" />
        <h2 className="text-xl font-bold">Evidence Strength Analyzer</h2>
        <Badge variant={getLevelBadge(strength.level)} className="ml-auto">
          {strength.level.replace("_", " ")}
        </Badge>
      </div>

      {/* Overall Strength */}
      <div className="mb-4 p-4 bg-muted/30 border border-border rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold">Prosecution Case Strength</span>
          <Badge variant={strength.overallStrength >= 70 ? "danger" : strength.overallStrength >= 40 ? "warning" : "success"}>
            {strength.overallStrength}%
          </Badge>
        </div>
        <div className="w-full bg-muted rounded-full h-3 overflow-hidden mb-2">
          <div
            className={`h-full transition-all ${
              strength.overallStrength >= 70
                ? "bg-red-500"
                : strength.overallStrength >= 40
                  ? "bg-yellow-500"
                  : "bg-green-500"
            }`}
            style={{ width: `${strength.overallStrength}%` }}
          />
        </div>
        <p className="text-sm text-muted-foreground">{strength.calibration.realisticOutcome}</p>
      </div>

      {/* Warnings */}
      {strength.warnings.length > 0 && (
        <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <span className="font-semibold">Professional Judgment Warnings</span>
          </div>
          <ul className="space-y-1">
            {strength.warnings.map((warning, idx) => (
              <li key={idx} className="text-sm flex items-start gap-2">
                <span className="text-amber-400">•</span>
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Evidence Factors */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold mb-2">Evidence Factors</h3>
        <div className="space-y-2">
          <div className="p-3 rounded-lg border bg-muted/30 border-border">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">Identification</span>
              <Badge variant="secondary">{strength.factors.identification.strength}%</Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              CCTV: {strength.factors.identification.hasCCTV ? "✓" : "✗"} | 
              Witnesses: {strength.factors.identification.hasWitnesses ? "✓" : "✗"} | 
              Facial Recognition: {strength.factors.identification.hasFacialRecognition ? "✓" : "✗"}
            </div>
          </div>
          <div className="p-3 rounded-lg border bg-muted/30 border-border">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">Forensics</span>
              <Badge variant="secondary">{strength.factors.forensics.strength}%</Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              Weapon: {strength.factors.forensics.hasWeapon ? "✓" : "✗"} | 
              Fingerprints: {strength.factors.forensics.hasFingerprints ? "✓" : "✗"} | 
              DNA: {strength.factors.forensics.hasDNA ? "✓" : "✗"}
            </div>
          </div>
          <div className="p-3 rounded-lg border bg-muted/30 border-border">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">Witnesses</span>
              <Badge variant="secondary">{strength.factors.witnesses.strength}%</Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              Count: {strength.factors.witnesses.count} | 
              Complainant: {strength.factors.witnesses.hasComplainant ? "✓" : "✗"} | 
              Independent: {strength.factors.witnesses.hasIndependent ? "✓" : "✗"}
            </div>
          </div>
          <div className="p-3 rounded-lg border bg-muted/30 border-border">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">PACE Compliance</span>
              <Badge variant={strength.factors.pace.isCompliant ? "success" : "warning"}>
                {strength.factors.pace.strength}%
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              Compliant: {strength.factors.pace.isCompliant ? "✓" : "✗"} | 
              Solicitor: {strength.factors.pace.hasSolicitor ? "✓" : "✗"} | 
              Recorded: {strength.factors.pace.isRecorded ? "✓" : "✗"}
            </div>
          </div>
          <div className="p-3 rounded-lg border bg-muted/30 border-border">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">Disclosure</span>
              <Badge variant="secondary">{strength.factors.disclosure.strength}%</Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              Gaps: {strength.factors.disclosure.hasGaps ? "Yes" : "No"} | 
              Severity: {strength.factors.disclosure.gapSeverity} | 
              Foundational: {strength.factors.disclosure.isFoundational ? "Yes" : "No"}
            </div>
          </div>
        </div>
      </div>

      {/* Calibration */}
      <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded">
        <h3 className="text-sm font-semibold mb-2">Reality Calibration</h3>
        <div className="space-y-1 text-xs">
          <div>Language Tone: <Badge variant="secondary">{strength.calibration.languageTone}</Badge></div>
          {strength.calibration.shouldDowngradeDisclosureStay && (
            <div className="text-amber-400">⚠ Disclosure stay probability downgraded (prosecution case strong)</div>
          )}
          {strength.calibration.shouldDowngradePACE && (
            <div className="text-amber-400">⚠ PACE breach angles downgraded (PACE appears compliant)</div>
          )}
          {strength.calibration.shouldFocusOnPleaMitigation && (
            <div className="text-blue-400">→ Focus on plea strategy and sentence mitigation</div>
          )}
        </div>
      </div>
    </Card>
  );
}
