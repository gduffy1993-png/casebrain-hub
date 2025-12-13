"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Info, AlertTriangle, Target, Lightbulb } from "lucide-react";

type StrategicInsightMeta = {
  whyRecommended: string;
  triggeredBy: string[];
  alternatives: Array<{
    label: string;
    description: string;
    unlockedBy?: string[];
  }>;
  riskIfIgnored: string;
  bestStageToUse: string;
  howThisHelpsYouWin: string;
  useThisTo?: string[];
  useAt?: string[];
};

type StrategicInsightMetaProps = {
  meta: StrategicInsightMeta;
};

export function StrategicInsightMetaDisplay({ meta }: StrategicInsightMetaProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-3 border-t border-border/50 pt-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors w-full"
      >
        <Info className="h-3.5 w-3.5" />
        <span>Why this matters</span>
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 ml-auto" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 ml-auto" />
        )}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {/* Why Recommended */}
          <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-800/30">
            <div className="flex items-center gap-2 mb-1.5">
              <Lightbulb className="h-3.5 w-3.5 text-cyan-400" />
              <p className="text-xs font-medium text-cyan-300">Why this was recommended for YOUR case</p>
            </div>
            <p className="text-xs text-cyan-200/90 leading-relaxed">{meta.whyRecommended}</p>
          </div>

          {/* Triggered By */}
          {meta.triggeredBy.length > 0 && (
            <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-800/30">
              <p className="text-xs font-medium text-blue-300 mb-1.5">What triggered this insight</p>
              <ul className="text-xs text-blue-200/90 space-y-1">
                {meta.triggeredBy.map((trigger, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-blue-400 mt-0.5">•</span>
                    <span>{trigger}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Alternatives */}
          {meta.alternatives.length > 0 && (
            <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/30">
              <p className="text-xs font-medium text-amber-300 mb-1.5">Alternative routes if the evidence changes</p>
              <div className="space-y-2">
                {meta.alternatives.map((alt, idx) => (
                  <div key={idx} className="text-xs text-amber-200/90">
                    <p className="font-medium mb-0.5">{alt.label}</p>
                    <p className="leading-relaxed mb-1">{alt.description}</p>
                    {alt.unlockedBy && alt.unlockedBy.length > 0 && (
                      <p className="text-amber-300/80 italic">
                        Unlocks if you upload: {alt.unlockedBy.join(", ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risk If Ignored */}
          <div className="p-3 rounded-lg bg-red-950/30 border border-red-800/30">
            <div className="flex items-center gap-2 mb-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
              <p className="text-xs font-medium text-red-300">Risk if you ignore this</p>
            </div>
            <p className="text-xs text-red-200/90 leading-relaxed">{meta.riskIfIgnored}</p>
          </div>

          {/* Best Stage To Use */}
          <div className="flex items-center gap-2">
            <Target className="h-3.5 w-3.5 text-foreground" />
            <span className="text-xs text-muted-foreground">Best stage to use this:</span>
            <Badge variant="outline" className="text-xs">
              {meta.bestStageToUse}
            </Badge>
          </div>

          {/* How This Helps You Win */}
          <div className="p-3 rounded-lg bg-green-950/30 border border-green-800/30">
            <p className="text-xs font-medium text-green-300 mb-1.5">How this helps you win</p>
            <p className="text-xs text-green-200/90 leading-relaxed">{meta.howThisHelpsYouWin}</p>
          </div>

          {/* Use This To (if present) */}
          {meta.useThisTo && meta.useThisTo.length > 0 && (
            <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-800/30">
              <p className="text-xs font-medium text-cyan-300 mb-1.5">Use this to:</p>
              <ul className="text-xs text-cyan-200/90 space-y-1">
                {meta.useThisTo.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-cyan-400 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Use At (if present, as alternative to bestStageToUse) */}
          {meta.useAt && meta.useAt.length > 0 && (
            <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/30">
              <p className="text-xs font-medium text-amber-300 mb-1.5">Use this at:</p>
              <ul className="text-xs text-amber-200/90 space-y-1">
                {meta.useAt.map((stage, idx) => {
                  const [label, description] = stage.split(" – ");
                  return (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-amber-400 mt-0.5">•</span>
                      <span>
                        {label && <span className="font-medium">{label}</span>}
                        {description && ` – ${description}`}
                        {!label && <span>{stage}</span>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

