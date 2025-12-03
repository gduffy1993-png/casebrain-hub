"use client";

import { useState } from "react";
import { Info, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
import type { Explanation } from "@/lib/packs/types";
import { getConfidenceColor } from "@/lib/explainability";

interface ExplanationPopoverProps {
  explanation: Explanation | undefined;
  variant?: "icon" | "inline" | "badge";
  className?: string;
}

/**
 * Display an explanation for an AI-generated output
 * Shows as an icon that expands to show details
 */
export function ExplanationPopover({
  explanation,
  variant = "icon",
  className = "",
}: ExplanationPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!explanation) {
    return null;
  }

  if (variant === "icon") {
    return (
      <div className={`relative inline-block ${className}`}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="text-white/40 hover:text-white/70 transition-colors focus:outline-none"
          aria-label="Why is this shown?"
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>

        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Popover */}
            <div className="absolute left-0 top-full z-50 mt-1 min-w-[250px] max-w-[350px] rounded-lg border border-white/10 bg-surface/95 p-3 shadow-xl backdrop-blur-md">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-white/90">
                    {explanation.summary}
                  </p>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-white/40 hover:text-white/70"
                  >
                    ×
                  </button>
                </div>

                {explanation.details && (
                  <p className="text-xs text-white/60 leading-relaxed">
                    {explanation.details}
                  </p>
                )}

                {explanation.triggeredByFacts?.length ? (
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wide text-white/40">
                      Contributing factors
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {explanation.triggeredByFacts.map((fact, i) => (
                        <span
                          key={i}
                          className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-white/60"
                        >
                          {fact}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {explanation.confidence && (
                  <div className="flex items-center gap-1.5 pt-1 border-t border-white/5">
                    <span className="text-[10px] text-white/40">
                      Confidence:
                    </span>
                    <span
                      className={`text-[10px] font-medium ${getConfidenceColor(explanation.confidence)}`}
                    >
                      {explanation.confidence}
                    </span>
                  </div>
                )}

                {(explanation.ruleId || explanation.packId) && (
                  <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                    {explanation.packId && (
                      <span className="rounded bg-purple-500/10 px-1.5 py-0.5 text-[9px] text-purple-400">
                        {explanation.packId.replace(/_/g, " ")}
                      </span>
                    )}
                    {explanation.ruleId && (
                      <span className="text-[9px] text-white/30 font-mono">
                        {explanation.ruleId}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  if (variant === "badge") {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/50 cursor-help ${className}`}
        title={explanation.summary + (explanation.details ? `\n\n${explanation.details}` : "")}
      >
        <Info className="h-2.5 w-2.5" />
        {explanation.confidence ? explanation.confidence : "info"}
      </span>
    );
  }

  // Inline variant
  return (
    <div className={`space-y-1 ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white/70 transition-colors"
      >
        <Info className="h-3 w-3" />
        <span>Why is this shown?</span>
        {isOpen ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </button>

      {isOpen && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-2.5 space-y-2">
          <p className="text-xs text-white/80">{explanation.summary}</p>

          {explanation.details && (
            <p className="text-[11px] text-white/50 leading-relaxed">
              {explanation.details}
            </p>
          )}

          {explanation.triggeredByFacts?.length ? (
            <div className="flex flex-wrap gap-1 pt-1">
              {explanation.triggeredByFacts.map((fact, i) => (
                <span
                  key={i}
                  className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-white/50"
                >
                  {fact}
                </span>
              ))}
            </div>
          ) : null}

          {explanation.confidence && (
            <span
              className={`text-[10px] ${getConfidenceColor(explanation.confidence)}`}
            >
              Confidence: {explanation.confidence}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

interface ExplanationListProps {
  explanations: Explanation[];
  title?: string;
  className?: string;
}

/**
 * Display a list of explanations
 */
export function ExplanationList({
  explanations,
  title = "Why these results?",
  className = "",
}: ExplanationListProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!explanations.length) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white/70 transition-colors"
      >
        <Info className="h-3 w-3" />
        <span>{title}</span>
        {isOpen ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </button>

      {isOpen && (
        <div className="space-y-2 rounded-lg border border-white/10 bg-white/5 p-3">
          {explanations.map((exp) => (
            <div
              key={exp.id}
              className="border-b border-white/5 pb-2 last:border-0 last:pb-0"
            >
              <p className="text-xs font-medium text-white/80">{exp.summary}</p>
              {exp.details && (
                <p className="text-[11px] text-white/50 mt-0.5">
                  {exp.details}
                </p>
              )}
              {exp.confidence && (
                <span
                  className={`text-[10px] ${getConfidenceColor(exp.confidence)}`}
                >
                  Confidence: {exp.confidence}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

