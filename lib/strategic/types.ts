/**
 * Strategic Intelligence Types
 * 
 * Core types for strategic intelligence analysis with explanatory metadata
 */

/**
 * Metadata that explains WHY a strategic insight was recommended
 * and HOW to use it effectively
 */
export type StrategicInsightMeta = {
  /** Why this strategy/insight fits THIS specific case */
  whyRecommended: string;
  
  /** Document types or evidence phrases that triggered this insight */
  triggeredBy: string[];
  
  /** Alternative routes/strategies that would appear if different evidence was uploaded */
  alternatives: Array<{
    label: string;
    description: string;
    /** Evidence or documents that would unlock this alternative */
    unlockedBy?: string[];
  }>;
  
  /** What happens if you ignore this insight (risk level) */
  riskIfIgnored: string;
  
  /** Best stage in litigation timeline to use this (e.g. "CCMC", "Pre-trial review", "At trial") */
  bestStageToUse: string;
  
  /** How this helps you win (concrete outcomes) */
  howThisHelpsYouWin: string;
  
  /** "Use this to:" bullet points (role-specific) */
  useThisTo?: string[];
};

