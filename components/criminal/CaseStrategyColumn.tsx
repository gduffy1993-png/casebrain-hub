"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { FoldSection } from "@/components/ui/fold-section";
import type { CaseSnapshot } from "@/lib/criminal/case-snapshot-adapter";
import { RecordPositionModal } from "./RecordPositionModal";
import {
  OFFENCE_TYPE_LABELS,
  STRATEGY_ANGLE_LABELS,
} from "@/lib/criminal/strategy-suggest/constants";
import type { StrategySuggestOutput } from "@/lib/criminal/strategy-suggest/types";

import type { StrategyCommitment } from "./StrategyCommitmentPanel";

type SavedPosition = {
  id: string;
  position_text: string;
  phase: number;
  created_at: string;
};

/**
 * Helper: Check if ANY strategy data exists in snapshot
 * Strategy UI should render if ANY strategy-related data is present,
 * regardless of analysis mode or commitment status
 */
function hasAnyStrategyData(snapshot: CaseSnapshot | null | undefined): boolean {
  if (!snapshot) return false;
  
  // Check for strategy data flags
  if (snapshot.strategy?.strategyDataExists) return true;
  if (snapshot.strategy?.hasRenderableData) return true;
  
  // Check for specific strategy fields
  if (snapshot.strategy?.primary) return true;
  if (snapshot.strategy?.fallbacks && snapshot.strategy.fallbacks.length > 0) return true;
  if (snapshot.strategy?.confidence) return true;
  
  // Check for analysis mode that indicates strategy generation has run
  if (snapshot.analysis?.mode === "preview" || snapshot.analysis?.mode === "complete") return true;
  if (snapshot.analysis?.hasVersion) return true;
  
  return false;
}

type CaseStrategyColumnProps = {
  caseId: string;
  snapshot: CaseSnapshot;
  onRecordPosition?: () => void;
  onCommitmentChange?: (commitment: StrategyCommitment | null) => void;
  currentPhase?: number;
  onPositionChange?: (hasPosition: boolean) => void;
  savedPosition?: SavedPosition | null;
  /** Option 3 Phase 2: save suggested position as recorded position (Use this). opts.fromAiSuggestion=true records audit (Phase 4.3). */
  onUsePositionSuggestion?: (text: string, opts?: { fromAiSuggestion?: boolean }) => Promise<void>;
  /** Option 3 Phase 2: open Record Position modal with draft text (Edit) */
  onEditPositionSuggestion?: (text: string) => void;
};

export function CaseStrategyColumn({ caseId, snapshot, onRecordPosition, onCommitmentChange, currentPhase = 1, onPositionChange, savedPosition: propSavedPosition, onUsePositionSuggestion, onEditPositionSuggestion }: CaseStrategyColumnProps) {
  const router = useRouter();
  const [savedPosition, setSavedPosition] = useState<SavedPosition | null>(propSavedPosition || null);
  const [isLoadingPosition, setIsLoadingPosition] = useState(true);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<StrategySuggestOutput | null>(null);
  const [suggestionFallback, setSuggestionFallback] = useState<string | null>(null);
  const [showAiDutiesHelp, setShowAiDutiesHelp] = useState(false);

  // Guard against undefined snapshot or decisionLog
  const position = snapshot?.decisionLog?.currentPosition ?? null;

  // Define fetchPosition BEFORE it's used in useEffect to avoid closure issues
  const fetchPosition = async () => {
    setIsLoadingPosition(true);
    try {
      const response = await fetch(`/api/criminal/${caseId}/position`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        if (data.ok && (data.data || data.position)) {
          setSavedPosition(data.data || data.position);
          onPositionChange?.(true);
        } else {
          setSavedPosition(null);
          onPositionChange?.(false);
        }
      } else {
        setSavedPosition(null);
        onPositionChange?.(false);
      }
    } catch (error) {
      console.error("[CaseStrategyColumn] Failed to fetch position:", error);
      setSavedPosition(null);
    } finally {
      setIsLoadingPosition(false);
    }
  };

  // Fetch saved position on mount, or sync with prop if provided
  useEffect(() => {
    if (propSavedPosition !== undefined) {
      setSavedPosition(propSavedPosition);
      setIsLoadingPosition(false);
      onPositionChange?.(!!propSavedPosition);
    } else {
      fetchPosition();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, propSavedPosition]);

  const handleOpenModal = () => {
    onRecordPosition?.();
  };

  const handlePositionSaved = () => {
    // Refetch position and refresh router
    fetchPosition();
    router.refresh();
    // onPositionChange will be called by fetchPosition
  };

  const getSuggestion = async () => {
    setSuggestionLoading(true);
    setSuggestion(null);
    setSuggestionFallback(null);
    try {
      const res = await fetch(`/api/criminal/${caseId}/strategy-suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.fallback === true) {
        setSuggestionFallback(data.reason ?? "Suggestion unavailable.");
        return;
      }
      setSuggestion(data as StrategySuggestOutput);
    } catch (err) {
      console.error("[CaseStrategyColumn] strategy-suggest failed:", err);
      setSuggestionFallback("Suggestion unavailable. Try again or record position manually.");
    } finally {
      setSuggestionLoading(false);
    }
  };

  const buildPositionTextFromSuggestion = (s: StrategySuggestOutput): string => {
    const angleLabels = s.strategyAngles.map((id) => STRATEGY_ANGLE_LABELS[id] ?? id).join("; ");
    const narrative = s.narrativeDraft?.trim();
    return narrative ? `${narrative}\n\nStrategy angles: ${angleLabels}` : `Strategy angles: ${angleLabels}. [Review and complete after disclosure.]`;
  };

  const handleUseSuggestion = async () => {
    if (!suggestion || !onUsePositionSuggestion) return;
    await onUsePositionSuggestion(buildPositionTextFromSuggestion(suggestion), { fromAiSuggestion: true });
    setSuggestion(null);
    fetchPosition();
    router.refresh();
  };

  const handleEditSuggestion = () => {
    if (!suggestion || !onEditPositionSuggestion) return;
    onEditPositionSuggestion(buildPositionTextFromSuggestion(suggestion));
    setSuggestion(null);
  };

  const handleRejectSuggestion = () => {
    if (suggestion) {
      fetch(`/api/criminal/${caseId}/strategy-suggest/reject`, {
        method: "POST",
        credentials: "include",
      }).catch(() => {});
    }
    setSuggestion(null);
  };

  const fallbackMessage =
    suggestionFallback === "timeout" || suggestionFallback === "ai_unavailable"
      ? "Suggestion unavailable – try again or add more detail."
      : suggestionFallback;

  return (
    <div className="space-y-6">
      {/* Record Current Position */}
      <FoldSection title="Record Current Position" defaultOpen={false}>
        {isLoadingPosition ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">Loading position...</p>
          </div>
        ) : savedPosition ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-sm">
                Phase {savedPosition.phase}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(savedPosition.created_at).toLocaleDateString()}
              </span>
            </div>
            <p className="text-sm text-foreground whitespace-pre-wrap">{savedPosition.position_text}</p>
            <button
              onClick={handleOpenModal}
              className="text-xs text-primary hover:underline"
            >
              Update position
            </button>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">No defence position has been formally recorded yet.</p>
            <button
              onClick={handleOpenModal}
              className="text-sm text-primary hover:underline"
            >
              Record position
            </button>
          </div>
        )}
      </FoldSection>

      {/* Option 3 Phase 2: AI strategy suggestion (draft only; solicitor must verify) */}
      <FoldSection title="AI strategy suggestion" defaultOpen={false}>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Get a suggested offence type and strategy angles. AI-assisted only – you must verify before use.{" "}
            <button
              type="button"
              onClick={() => setShowAiDutiesHelp(!showAiDutiesHelp)}
              className="text-primary hover:underline"
            >
              AI use &amp; your professional duties
            </button>
          </p>
          {showAiDutiesHelp && (
            <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">AI use and your professional duties</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Verify:</strong> You must personally verify any suggested strategy and any legal authority before relying on it.</li>
                <li><strong>Competence:</strong> Use AI only where you are competent to assess the output; seek advice where needed.</li>
                <li><strong>Confidentiality:</strong> We do not send client names or identifying details to the AI; only charge wording and case summary.</li>
                <li><strong>Disclosure:</strong> Check whether your tribunal or regulator requires you to disclose AI use in the matter.</li>
              </ul>
            </div>
          )}
          {!suggestion && !suggestionLoading && !suggestionFallback && (
            <Button
              variant="outline"
              size="sm"
              onClick={getSuggestion}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Get suggestion
            </Button>
          )}
          {suggestionLoading && (
            <p className="text-sm text-muted-foreground">Loading suggestion…</p>
          )}
          {suggestionFallback && !suggestionLoading && (
            <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
              {fallbackMessage} Add charge or summary to the case, or record position manually above.
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => setSuggestionFallback(null)}>Dismiss</Button>
            </div>
          )}
          {suggestion && !suggestionLoading && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-3">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                AI-assisted. Not legal advice. You must verify before use.
              </p>
              <div>
                <span className="text-xs text-muted-foreground">Offence type: </span>
                <Badge variant="outline" className="text-xs">
                  {OFFENCE_TYPE_LABELS[suggestion.offenceType as keyof typeof OFFENCE_TYPE_LABELS] ?? suggestion.offenceType}
                </Badge>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Strategy angles: </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {suggestion.strategyAngles.map((id) => (
                    <Badge key={id} variant="secondary" className="text-xs">
                      {STRATEGY_ANGLE_LABELS[id] ?? id}
                    </Badge>
                  ))}
                </div>
              </div>
              {suggestion.narrativeDraft && (
                <p className="text-sm text-foreground whitespace-pre-wrap">{suggestion.narrativeDraft}</p>
              )}
              <div className="flex flex-wrap gap-2 pt-2">
                {onUsePositionSuggestion && (
                  <Button size="sm" onClick={handleUseSuggestion}>Use this</Button>
                )}
                {onEditPositionSuggestion && (
                  <Button size="sm" variant="outline" onClick={handleEditSuggestion}>Edit</Button>
                )}
                <Button size="sm" variant="ghost" onClick={handleRejectSuggestion}>Reject</Button>
              </div>
            </div>
          )}
        </div>
      </FoldSection>

      {/* Strategy Overview */}
      {hasAnyStrategyData(snapshot) ? (
        <FoldSection title="Strategy Overview" defaultOpen={false}>
          <div className="space-y-3">
            {snapshot?.strategy?.primary && (
              <div>
                <span className="text-xs text-muted-foreground">Primary: </span>
                <Badge variant="outline" className="text-xs">
                  {snapshot.strategy.primary}
                </Badge>
              </div>
            )}
            {snapshot?.strategy?.confidence && (
              <div>
                <span className="text-xs text-muted-foreground">Confidence: </span>
                <Badge
                  className={`text-xs ${
                    snapshot.strategy.confidence === "HIGH"
                      ? "bg-green-500/10 text-green-600"
                      : snapshot.strategy.confidence === "MEDIUM"
                      ? "bg-amber-500/10 text-amber-600"
                      : "bg-blue-500/10 text-blue-600"
                  }`}
                >
                  {snapshot.strategy.confidence}
                </Badge>
              </div>
            )}
          </div>
        </FoldSection>
      ) : (
        <FoldSection title="Strategy Overview" defaultOpen={false}>
          <div className="text-center py-4 text-muted-foreground text-sm">
            Run analysis to populate strategy overview.
          </div>
        </FoldSection>
      )}

      {/* Next Steps */}
      <FoldSection title="Next Steps" defaultOpen={false}>
        {snapshot?.actions?.nextSteps && snapshot.actions.nextSteps.length > 0 ? (
          <div className="space-y-2">
            {snapshot.actions.nextSteps.map((step) => (
              <div
                key={step.id}
                className="flex items-center justify-between p-2 rounded-lg border border-border/50 bg-muted/10"
              >
                <span className="text-sm text-foreground">{step.title}</span>
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    step.priority === "CRITICAL"
                      ? "border-danger text-danger"
                      : step.priority === "HIGH"
                      ? "border-warning text-warning"
                      : ""
                  }`}
                >
                  {step.priority}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground text-sm">
            {snapshot?.analysis?.canShowStrategyPreview && !snapshot?.analysis?.canShowStrategyFull ? (
              <>Unavailable in thin-pack preview. Add documents then re-analyse to generate these.</>
            ) : (
              <>Run analysis to generate next steps.</>
            )}
          </div>
        )}
      </FoldSection>
    </div>
  );
}

