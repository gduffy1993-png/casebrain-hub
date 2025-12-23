/**
 * CaseBrain Shared Types
 *
 * Central type definitions for all CaseBrain "brains" and UI components.
 * These types ensure consistent data shapes across the application.
 */

// =============================================================================
// Severity Levels
// =============================================================================

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

// =============================================================================
// Key Issues
// =============================================================================

export type KeyIssueCategory =
  | "LIABILITY"
  | "CAUSATION"
  | "QUANTUM"
  | "HOUSING"
  | "PROCEDURE"
  | "OTHER";

export type KeyIssue = {
  id: string;
  caseId: string;
  label: string;
  category: KeyIssueCategory;
  severity: Severity;
  sourceDocs: string[];
  reason?: string;
  createdAt: string;
};

// =============================================================================
// Limitation Info
// =============================================================================

/**
 * Practice areas supported by CaseBrain
 * Each area can have its own "pack" with specialized evidence, risk, and limitation rules.
 */
export type PracticeArea =
  | "housing_disrepair"
  | "personal_injury"
  | "clinical_negligence"
  | "family"
  | "criminal"
  | "other_litigation";

/**
 * User-friendly labels for practice areas
 */
export const PRACTICE_AREA_LABELS: Record<PracticeArea, string> = {
  housing_disrepair: "Housing Disrepair",
  personal_injury: "Personal Injury",
  clinical_negligence: "Clinical Negligence",
  family: "Family",
  criminal: "Criminal Law",
  other_litigation: "Other Litigation",
};

/**
 * Solicitor role / practice area options for UI selectors
 * These map to practice areas but use solicitor-friendly language
 */
export const PRACTICE_AREA_OPTIONS: Array<{
  value: PracticeArea;
  label: string;
  description: string;
}> = [
  {
    value: "family",
    label: "Family Solicitor",
    description: "Children, contact, residence, finances, safeguarding, non-disclosure.",
  },
  {
    value: "housing_disrepair",
    label: "Housing Solicitor",
    description: "Damp, mould, leaks, social housing disrepair, Awaab-style risks.",
  },
  {
    value: "personal_injury",
    label: "PI Solicitor",
    description: "RTA, EL/PL, CNF, liability/quantum, limitation in 3 years, FD risk.",
  },
  {
    value: "clinical_negligence",
    label: "Clinical Neg Solicitor",
    description: "Breach/causation/quantum, experts, date of knowledge, complex costs.",
  },
  {
    value: "criminal",
    label: "Criminal Defense Solicitor",
    description: "Defense work, PACE compliance, evidence analysis, loophole detection, get off strategies.",
  },
  {
    value: "other_litigation",
    label: "General Litigation Solicitor",
    description: "Anything else not covered above.",
  },
];

/**
 * Map legacy practice area values to standardized values
 */
export function normalizePracticeArea(area?: string | null): PracticeArea {
  if (!area) return "other_litigation";
  
  const lower = area.toLowerCase().replace(/[^a-z_]/g, "_");
  
  // Housing variants
  if (lower.includes("housing") || lower.includes("disrepair")) return "housing_disrepair";
  
  // PI variants  
  if (lower.includes("pi") || lower.includes("personal") || lower.includes("injury") || 
      lower.includes("rta") || lower.includes("accident")) return "personal_injury";
  
  // Clinical negligence variants
  if (lower.includes("clin") || lower.includes("medical") || lower.includes("negligence")) return "clinical_negligence";
  
  // Family
  if (lower.includes("family") || lower.includes("child") || lower.includes("divorce") ||
      lower.includes("matrimonial") || lower.includes("financial_remedy")) return "family";

  // Criminal
  if (lower.includes("criminal") || lower.includes("defence") || lower.includes("defense") ||
      lower.includes("cps") || lower.includes("pace") || lower.includes("custody") ||
      lower.includes("interview") || lower.includes("disclosure")) return "criminal";
  
  return "other_litigation";
}

export type LimitationInfo = {
  caseId: string;
  causeOfAction: string;
  primaryLimitationDate: string;
  daysRemaining: number;
  isExpired: boolean;
  severity: Severity;
  practiceArea: PracticeArea;
  hasMinor?: boolean;
  isAwaabRelevant?: boolean;
  notes?: string;
};

// =============================================================================
// Housing Pack
// =============================================================================

export type LandlordType = "social" | "private" | "council" | "unknown";

export type HousingStage =
  | "intake"
  | "investigation"
  | "pre_action"
  | "litigation"
  | "settlement"
  | "closed";

export type HousingPack = {
  caseId: string;
  landlordType: LandlordType;
  landlordName?: string;
  propertyAddress?: string;
  hasChildInProperty: boolean;
  isSocialTenant: boolean;
  hasDampMould: boolean;
  tenantVulnerabilities: string[];
  complaintDates: string[];
  hhsrsCategory1Hazards: string[];
  hhsrsCategory2Hazards: string[];
  awaabRiskLevel: Severity;
  stage: HousingStage;
  firstReportDate?: string;
  limitationDate?: string;
};

// =============================================================================
// Risk Flags
// =============================================================================

export type RiskType =
  | "limitation"
  | "awaabs_law"
  | "section_11"
  | "compliance"
  | "evidence_gap"
  | "vulnerability"
  | "deadline"
  | "other";

export type RiskStatus = "outstanding" | "resolved" | "snoozed";

export type RiskRecommendedAction = {
  id: string;
  label: string;
  description: string;
  priority: "normal" | "high" | "urgent";
};

export type RiskFlag = {
  id: string;
  caseId: string;
  severity: Severity;
  type: RiskType;
  code: string;
  title: string;
  message: string;
  source: string;
  relatedDocIds?: string[];
  deadlineDate?: string;
  status: RiskStatus;
  recommendedActions?: RiskRecommendedAction[];
  createdAt: string;
  resolvedAt?: string;
};

// =============================================================================
// Search
// =============================================================================

export type SearchMatchType = "title" | "content" | "metadata";

export type SearchHit = {
  caseId: string;
  documentId: string;
  documentTitle: string;
  snippet: string;
  highlightedText?: string;
  score?: number;
  pageNumber?: number;
  matchType: SearchMatchType;
};

// =============================================================================
// Missing Evidence
// =============================================================================

export type EvidenceCategory =
  | "LIABILITY"
  | "CAUSATION"
  | "QUANTUM"
  | "HOUSING"
  | "PROCEDURE";

export type EvidenceStatus = "MISSING" | "REQUESTED" | "RECEIVED";

export type MissingEvidenceItem = {
  id: string;
  caseId: string;
  category: EvidenceCategory;
  label: string;
  reason: string;
  priority: Severity;
  status: EvidenceStatus;
  linkedDocIds?: string[];
  suggestedAction?: string;
};

// =============================================================================
// Document Compare
// =============================================================================

export type ChangeType = "ADDED" | "REMOVED" | "CHANGED";

export type DocumentDiff = {
  section: string;
  before: string;
  after: string;
  changeType: ChangeType;
};

export type DocumentCompareResult = {
  caseId: string;
  docAId: string;
  docATitle: string;
  docBId: string;
  docBTitle: string;
  summary: string;
  diffs: DocumentDiff[];
  comparedAt: string;
};

// =============================================================================
// Party Details
// =============================================================================

export type PartyRole =
  | "CLAIMANT"
  | "DEFENDANT"
  | "LANDLORD"
  | "TENANT"
  | "INSURER"
  | "SOLICITOR"
  | "EXPERT"
  | "OTHER";

export type PartyContact = {
  email?: string;
  phone?: string;
};

export type PartyDetails = {
  id: string;
  caseId: string;
  role: PartyRole;
  name: string;
  address?: string;
  postcode?: string;
  reference?: string;
  contact?: PartyContact;
  sourceDocIds: string[];
  confidence: number;
  isVerified: boolean;
  createdAt: string;
  updatedAt?: string;
};

// =============================================================================
// Tasks (Extended)
// =============================================================================

export type TaskSource =
  | "LIMITATION"
  | "AWAAB"
  | "MISSING_EVIDENCE"
  | "TIMELINE_EVENT"
  | "RISK_FLAG"
  | "MANUAL";

export type TaskStatus = "OPEN" | "DONE" | "DEFERRED";

export type CaseBrainTask = {
  id: string;
  caseId: string | null;
  orgId: string;
  title: string;
  description?: string;
  dueDate?: string;
  source: TaskSource;
  status: TaskStatus;
  severity?: Severity;
  sourceReferenceId?: string;
  createdBy: string;
  createdAt: string;
  completedAt?: string;
};

// =============================================================================
// Case Heatmap
// =============================================================================

export type CaseIssueKey =
  | "LIABILITY"
  | "CAUSATION"
  | "QUANTUM"
  | "EVIDENCE_COMPLETENESS"
  | "LIMITATION_RISK"
  | "HOUSING_STANDARD"
  | "AWAAB_RISK"
  | "PROCEDURAL_COMPLIANCE"
  | "DEADLINE_RISK";

export type HeatmapStatus = "RED" | "AMBER" | "GREEN";

export type CaseHeatmapCell = {
  caseId: string;
  issue: CaseIssueKey;
  score: number;
  status: HeatmapStatus;
  reason: string;
  lastUpdated: string;
  breakdown?: Array<{
    factor: string;
    impact: number; // positive or negative percentage impact
  }>;
};

export type CaseHeatmap = {
  caseId: string;
  cells: CaseHeatmapCell[];
  overallScore: number;
  overallStatus: HeatmapStatus;
  generatedAt: string;
};

// =============================================================================
// Case Notes
// =============================================================================

export type CaseNote = {
  id: string;
  caseId: string;
  orgId: string;
  content: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  isPinned: boolean;
};

// =============================================================================
// Similar Cases
// =============================================================================

export type SimilarCase = {
  caseId: string;
  title: string;
  similarity: number;
  matchReasons: string[];
  practiceArea: string;
  stage?: string;
};

// =============================================================================
// Evidence Templates (for Missing Evidence Finder)
// =============================================================================

export type EvidenceRequirement = {
  id: string;
  label: string;
  category: EvidenceCategory;
  description: string;
  priority: Severity;
  caseTypes: string[];
  detectPatterns: string[];
};

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Convert a DB record type to the shared type
 */
export type FromRecord<T> = Omit<T, "created_at" | "updated_at"> & {
  createdAt: string;
  updatedAt?: string;
};

/**
 * API response wrapper
 */
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

// =============================================================================
// Compliance Dashboard (Phase 1.1)
// =============================================================================

export type ComplianceItemStatus = "PRESENT" | "MISSING" | "EXPIRED" | "UNKNOWN";

export type ComplianceItem = {
  id: string;
  label: string;
  status: ComplianceItemStatus;
  lastChecked?: string;
  expiryDate?: string;
  notes?: string;
};

export type ComplianceGap = {
  type: "AML" | "CFA" | "CONFLICT" | "INSTRUCTIONS" | "ATTENDANCE_NOTE" | "AUTHORITY" | "RETAINER";
  label: string;
  status: ComplianceItemStatus;
  severity: Severity;
  suggestion: string;
};

export type CaseComplianceScore = {
  caseId: string;
  caseTitle: string;
  clientName?: string;
  opponentName?: string;
  practiceArea: string;
  overallScore: number; // 0-100
  status: HeatmapStatus;
  limitationDaysRemaining?: number;
  limitationSeverity: Severity;
  riskCounts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  missingEvidenceCount: number;
  complianceGaps: ComplianceGap[];
  awaabRiskLevel?: Severity;
  lastUpdated: string;
};

// =============================================================================
// Audio / Attendance Notes (Phase 1.2)
// =============================================================================

export type CallType = "CLIENT" | "OPPONENT" | "COURT" | "EXPERT" | "OTHER";

export type CaseCallRecord = {
  id: string;
  caseId: string;
  orgId: string;
  fileName: string;
  fileUrl?: string;
  duration?: number; // seconds
  callType: CallType;
  callDate: string;
  participants?: string[];
  transcriptText?: string;
  status: "UPLOADED" | "PROCESSING" | "COMPLETED" | "FAILED";
  createdBy: string;
  createdAt: string;
  processedAt?: string;
};

export type AttendanceNote = {
  id: string;
  caseId: string;
  callRecordId?: string;
  orgId: string;
  noteDate: string;
  attendees: string[];
  summary: string;
  adviceGiven: string[];
  issuesDiscussed: string[];
  risksIdentified: string[];
  tasksCreated: string[]; // task IDs
  keyDates?: Array<{ label: string; date: string }>;
  followUpRequired: boolean;
  followUpDetails?: string;
  createdBy: string;
  createdAt: string;
};

// =============================================================================
// Smart Chasers & Next Steps (Phase 1.3)
// =============================================================================

export type LetterStatus = "DRAFT" | "SENT" | "RESPONSE_RECEIVED" | "CHASER_DUE" | "CHASER_SENT";

export type OutgoingCorrespondence = {
  id: string;
  caseId: string;
  type: "LETTER" | "EMAIL" | "FORM";
  templateId?: string;
  subject: string;
  recipient: string;
  sentAt?: string;
  expectedResponseDays: number;
  chaseDueAt?: string;
  responseReceivedAt?: string;
  status: LetterStatus;
  chaserCount: number;
  createdAt: string;
};

export type NextStepSource = 
  | "PROTOCOL"
  | "LIMITATION"
  | "RISK"
  | "EVIDENCE"
  | "CHASER"
  | "TIMELINE"
  | "COMPLIANCE"
  | "DEADLINE"
  | "MANUAL";

export type NextStep = {
  id: string;
  caseId: string;
  title: string;
  description: string;
  reason: string;
  source: NextStepSource;
  priority: Severity;
  dueDate?: string;
  suggestedAction?: string;
  suggestedTemplateId?: string;
  isUrgent: boolean;
  createdAt: string;
};

export type ChaserAlert = {
  id: string;
  caseId: string;
  correspondenceId: string;
  letterSubject: string;
  recipient: string;
  sentAt: string;
  dueAt: string;
  daysOverdue: number;
  isOverdue: boolean;
};

// =============================================================================
// Outcome Pathway (Phase 2.4)
// =============================================================================

export type OutcomePathway = {
  caseId: string;
  practiceArea: string;
  currentStage: string;
  expectedSteps: Array<{
    step: string;
    typicalTimeframe: string;
    isCompleted: boolean;
  }>;
  estimatedTimeToResolution: string;
  estimatedCostBand: "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";
  similarCasesCount: number;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  generatedAt: string;
};

// =============================================================================
// Client Update Generator (Phase G1)
// =============================================================================

export type ClientUpdateDraft = {
  caseId: string;
  subject: string;
  body: string;
  generatedAt: string;
  dataUsed: {
    tasksCompleted: number;
    lettersSent: number;
    documentsAdded: number;
    risksResolved: number;
    risksRaised: number;
  };
};

// =============================================================================
// Opponent Activity Radar (Phase G2)
// =============================================================================

export type OpponentActivityStatus = 
  | "NORMAL"
  | "SLOWER_THAN_USUAL"
  | "CONCERNING_SILENCE"
  | "NO_DATA";

export type OpponentActivitySnapshot = {
  caseId: string;
  lastLetterSentAt?: string;
  lastChaseSentAt?: string;
  lastOpponentReplyAt?: string;
  daysSinceLastContact: number;
  averageResponseDays?: number;
  currentSilenceDays: number;
  status: OpponentActivityStatus;
  statusMessage: string;
  generatedAt: string;
};

// =============================================================================
// Bundle Navigator (Phase B/C/D)
// =============================================================================

// Job status
export type BundleJobStatus = "pending" | "running" | "completed" | "failed";
export type BundleAnalysisLevel = "phase_a" | "full";
export type ChunkStatus = "pending" | "processing" | "completed" | "failed";

// Main bundle record
export type CaseBundle = {
  id: string;
  caseId: string;
  orgId: string;
  fileRef?: string;
  bundleName: string;
  totalPages: number;
  analysisLevel: BundleAnalysisLevel;
  status: BundleJobStatus;
  progress: number; // 0-100
  errorMessage?: string;
  
  // Phase A (quick preview)
  phaseASummary?: string;
  detectedSections: string[];
  
  // Full analysis
  fullSummary?: string;
  fullToc: TOCSection[];
  fullTimeline: BundleTimelineEntry[];
  issuesMap: BundleIssue[];
  contradictions: BundleContradiction[];
  
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
};

// Individual chunk
export type BundleChunk = {
  id: string;
  bundleId: string;
  chunkIndex: number;
  pageStart: number;
  pageEnd: number;
  status: ChunkStatus;
  
  rawText?: string;
  aiSummary?: string;
  docTypes: string[];
  keyIssues: BundleChunkIssue[];
  keyDates: BundleChunkDate[];
  entities: string[];
  
  errorMessage?: string;
  createdAt: string;
  processedAt?: string;
};

// Chunk-level extracted data
export type BundleChunkIssue = {
  issue: string;
  type: "liability" | "causation" | "quantum" | "procedure" | "other";
  strength: "strong" | "medium" | "weak" | "unclear";
  pageRef?: number;
};

export type BundleChunkDate = {
  date: string;
  context: string;
  importance: "high" | "medium" | "low";
  pageRef?: number;
};

// Phase C: Table of Contents
export type TOCSection = {
  id: string;
  title: string;
  pageStart: number;
  pageEnd: number;
  docType: string;
  summary: string;
  childSections?: TOCSection[];
};

// Phase C: Timeline
export type BundleTimelineEntry = {
  date: string;
  event: string;
  source: string;
  pageRef?: number;
  importance: "high" | "medium" | "low";
};

// Phase C: Search
export type BundleSearchResult = {
  chunkId: string;
  pageStart: number;
  pageEnd: number;
  matchedText: string;
  context: string;
  relevance: number;
};

// Phase D: Issues Map
export type BundleIssue = {
  id: string;
  issue: string;
  type: "liability" | "causation" | "quantum" | "procedure" | "other";
  overallStrength: "strong" | "medium" | "weak" | "unclear";
  supportingSections: Array<{
    chunkId: string;
    pageStart: number;
    pageEnd: number;
    excerpt: string;
  }>;
};

// Phase D: Contradictions
export type BundleContradiction = {
  id: string;
  description: string;
  confidence: "high" | "medium" | "low";
  sectionsInvolved: Array<{
    chunkId: string;
    pageStart: number;
    pageEnd: number;
    position: string;
  }>;
  potentialImpact: string;
};

// Bundle overview (combined view)
export type BundleOverview = {
  bundleId: string;
  bundleName: string;
  totalPages: number;
  status: BundleJobStatus;
  progress: number;
  summary: string;
  docTypeCounts: Record<string, number>;
  issueCount: number;
  contradictionCount: number;
  keyDatesCount: number;
  lastUpdated: string;
};

// =============================================================================
// Case Pack PDF Export (Phase H1)
// =============================================================================

export type CasePackSectionType =
  | "OVERVIEW"
  | "TIMELINE"
  | "BUNDLE"
  | "ISSUES"
  | "CONTRADICTIONS"
  | "RISKS"
  | "NEXT_STEPS"
  | "CLIENT_UPDATE"
  | "OPPONENT_ACTIVITY"
  | "EVIDENCE";

export type CasePackSection = {
  id: string;
  type: CasePackSectionType;
  title: string;
  description?: string;
  content: string;
  isEmpty: boolean;
};

export type CasePackMeta = {
  caseId: string;
  caseTitle: string;
  clientName?: string;
  opponentName?: string;
  practiceArea: string;
  generatedAt: string;
  generatedByUserId: string;
  sections: CasePackSection[];
};

// =============================================================================
// Email Intake (Phase H2)
// =============================================================================

export type EmailAttachment = {
  filename: string;
  contentType: string;
  size: number;
  urlOrStorageRef?: string;
};

export type EmailIntakeSource = "forward" | "outlook-addon" | "other";

export type EmailIntakePayload = {
  from: string;
  to: string;
  cc?: string;
  subject: string;
  bodyText?: string;
  bodyHtml?: string;
  attachments: EmailAttachment[];
  intakeSource: EmailIntakeSource;
  caseReference?: string; // Optional explicit case reference
};

export type EmailIntakeResult = {
  success: boolean;
  createdCaseId?: string;
  updatedCaseId?: string;
  documentsCreated: string[];
  notesCreated: string[];
  tasksCreated: string[];
  message: string;
};

// =============================================================================
// Outlook Intake (Phase H3)
// =============================================================================

export type OutlookIntakePayload = {
  messageId: string;
  from: string;
  to: string;
  cc?: string;
  subject: string;
  bodyPreview?: string;
  bodyText?: string;
  attachments: Array<{
    id?: string;
    filename: string;
    contentType: string;
    size: number;
    url?: string;
  }>;
};

// =============================================================================
// Phase I1: Key Facts Sheet
// =============================================================================

export type KeyFactsStage =
  | "pre_action"
  | "issued"
  | "post_issue"
  | "trial_prep"
  | "settled"
  | "closed"
  | "other";

export type KeyFactsFundingType =
  | "cfa"
  | "private"
  | "legal_aid"
  | "dba"
  | "after_event"
  | "other"
  | "unknown";

export type KeyFactsKeyDate = {
  label: string;
  date: string;
  isPast: boolean;
  isUrgent?: boolean;
};

export type KeyFactsBundleSummarySection = {
  title: string;
  body: string;
};

export type KeyFactsSummary = {
  caseId: string;
  practiceArea?: PracticeArea;
  clientName?: string;
  opponentName?: string;
  courtName?: string;
  claimType?: string;
  causeOfAction?: string;
  stage: KeyFactsStage;
  fundingType: KeyFactsFundingType;
  approxValue?: string;
  headlineSummary?: string;
  whatClientWants?: string;
  keyDates: KeyFactsKeyDate[];
  mainRisks: string[];
  primaryIssues: string[];
  nextStepsBrief?: string;
  bundleSummarySections?: KeyFactsBundleSummarySection[];
  layeredSummary?: import("@/lib/layered-summary/types").LayeredSummary | null;
};

// =============================================================================
// Phase I2: Correspondence Timeline
// =============================================================================

export type CorrespondenceDirection = "inbound" | "outbound";

export type CorrespondenceChannel = "email" | "letter" | "phone_note" | "other";

export type CorrespondenceParty =
  | "client"
  | "opponent"
  | "court"
  | "third_party"
  | "internal"
  | "unknown";

export type CorrespondenceItem = {
  id: string;
  caseId: string;
  direction: CorrespondenceDirection;
  channel: CorrespondenceChannel;
  party: CorrespondenceParty;
  displayName?: string;
  subjectOrLabel?: string;
  summary?: string;
  createdAt: string;
  hasAttachment?: boolean;
  isOpponentReply?: boolean;
  gapSincePreviousDays?: number;
  category?: "event" | "risk" | "complaint" | "limitation" | "evidence" | "protocol" | "communication" | "milestone";
};

export type CorrespondenceTimelineSummary = {
  items: CorrespondenceItem[];
  longGaps: Array<{ fromId: string; toId: string; days: number }>;
  opponentAverageReplyDays?: number;
  lastClientUpdateAt?: string;
  lastOpponentContactAt?: string;
};

// =============================================================================
// Phase I3: Instructions to Counsel
// =============================================================================

export type InstructionsToCounselSection = {
  id: string;
  title: string;
  content: string;
};

export type InstructionsToCounselDraft = {
  caseId: string;
  generatedAt: string;
  generatedByUserId: string;
  sections: InstructionsToCounselSection[];
};

// =============================================================================
// Phase J1: Dangerous Clauses / Red-Flag Detector
// =============================================================================

export type ClauseRedFlagCategory =
  | "repair_obligation"
  | "break_clause"
  | "rent_increase"
  | "unfair_term"
  | "liability_cap"
  | "indemnity"
  | "notice_requirement"
  | "missing_signature"
  | "inconsistent_term"
  | "exclusion_clause"
  | "service_requirement"
  | "other";

export type ClauseRedFlag = {
  id: string;
  caseId: string;
  documentId: string;
  category: ClauseRedFlagCategory;
  clauseText: string;
  explanation: string;
  severity: "low" | "medium" | "high" | "critical";
  pageRef?: number;
};

export type ClauseRedFlagSummary = {
  caseId: string;
  documentId: string;
  documentName: string;
  redFlags: ClauseRedFlag[];
  totalCritical: number;
  totalHigh: number;
  totalMedium: number;
  totalLow: number;
  analysedAt: string;
};

// =============================================================================
// Phase J2: Hearing Preparation Pack
// =============================================================================

export type HearingPrepSection = {
  id: string;
  title: string;
  content: string;
  priority?: "essential" | "recommended" | "optional";
};

export type HearingPrepPack = {
  caseId: string;
  hearingType?: string;
  hearingDate?: string;
  generatedAt: string;
  generatedByUserId: string;
  sections: HearingPrepSection[];
};

// =============================================================================
// Phase K1: Complaint Risk Meter
// =============================================================================

export type ComplaintRiskLevel = "low" | "medium" | "high" | "critical";

export type ComplaintRiskFactor = {
  factor: string;
  impact: "positive" | "negative";
  weight: number;
  description: string;
};

export type ComplaintRiskScore = {
  caseId: string;
  score: number; // 0-100
  level: ComplaintRiskLevel;
  factors: ComplaintRiskFactor[];
  reasons: string[];
  suggestions: string[];
  calculatedAt: string;
};

// =============================================================================
// Phase K2: Outcome Likelihood Engine
// =============================================================================

export type OutcomeConfidence = "low" | "medium" | "high";

export type OutcomeInsight = {
  caseId: string;
  generatedAt: string;
  outcomeRanges: string[];
  timeToResolutionEstimate?: string;
  influencingFactors: string[];
  strengths: string[];
  weaknesses: string[];
  confidence: OutcomeConfidence;
  disclaimer: string;
};

// Legacy Phase A type (for backwards compatibility)
export type BundlePhaseASummary = {
  caseId: string;
  bundleId: string;
  bundleName: string;
  pageCount: number;
  summary: string;
  detectedSections: string[];
  processedAt: string;
  isPartialAnalysis: boolean;
};

