# CaseBrain Shared Types Checklist

## Central Type Definition: `lib/types/casebrain.ts`

All shared types are centralized in this file for consistency across the application.

---

## Core Enums & Base Types

| Type | Purpose | Used By |
|------|---------|---------|
| `Severity` | Risk/priority levels | All brains, UI components |
| `PracticeArea` | Case practice areas | Limitation, Compliance, Pathway |
| `HeatmapStatus` | RED/AMBER/GREEN status | Heatmap, Compliance |

---

## Phase 1 Types

### Compliance Dashboard
| Type | Purpose | File |
|------|---------|------|
| `ComplianceItemStatus` | PRESENT/MISSING/EXPIRED/UNKNOWN | `lib/compliance.ts` |
| `ComplianceItem` | Individual compliance check | `lib/compliance.ts` |
| `ComplianceGap` | Missing compliance item | `lib/compliance.ts` |
| `CaseComplianceScore` | Full compliance assessment | `lib/compliance.ts` |

### Audio / Attendance Notes
| Type | Purpose | File |
|------|---------|------|
| `CallType` | CLIENT/OPPONENT/COURT/EXPERT/OTHER | `lib/types/casebrain.ts` |
| `CaseCallRecord` | Audio upload record | `lib/types/casebrain.ts` |
| `AttendanceNote` | Structured attendance note | `lib/types/casebrain.ts` |

### Smart Chasers & Next Steps
| Type | Purpose | File |
|------|---------|------|
| `LetterStatus` | Correspondence status | `lib/types/casebrain.ts` |
| `OutgoingCorrespondence` | Letter/email tracking | `lib/types/casebrain.ts` |
| `NextStepSource` | Where next step came from | `lib/types/casebrain.ts` |
| `NextStep` | Priority action for case | `lib/types/casebrain.ts` |
| `ChaserAlert` | Overdue chaser warning | `lib/types/casebrain.ts` |

---

## Phase 2 Types

### Semantic Search
| Type | Purpose | File |
|------|---------|------|
| `SearchCategory` | cases/documents/letters/all | `lib/semantic-search.ts` |
| `SemanticSearchResult` | Search result item | `lib/semantic-search.ts` |
| `SemanticSearchParams` | Search parameters | `lib/semantic-search.ts` |

### Outcome Pathway
| Type | Purpose | File |
|------|---------|------|
| `OutcomePathway` | Case pathway prediction | `lib/types/casebrain.ts` |

---

## Phase G Types (Secret Gems)

### Client Update Generator
| Type | Purpose | File |
|------|---------|------|
| `ClientUpdateDraft` | Generated client email | `lib/types/casebrain.ts` |

### Opponent Activity Radar
| Type | Purpose | File |
|------|---------|------|
| `OpponentActivityStatus` | NORMAL/SLOWER/CONCERNING/NO_DATA | `lib/types/casebrain.ts` |
| `OpponentActivitySnapshot` | Opponent response pattern | `lib/types/casebrain.ts` |

### Bundle Navigator (Full)
| Type | Purpose | File |
|------|---------|------|
| `BundleJobStatus` | pending/running/completed/failed | `lib/types/casebrain.ts` |
| `BundleAnalysisLevel` | phase_a/full | `lib/types/casebrain.ts` |
| `ChunkStatus` | pending/processing/completed/failed | `lib/types/casebrain.ts` |
| `CaseBundle` | Full bundle record | `lib/types/casebrain.ts` |
| `BundleChunk` | Individual chunk | `lib/types/casebrain.ts` |
| `BundleChunkIssue` | Issue in chunk | `lib/types/casebrain.ts` |
| `BundleChunkDate` | Date in chunk | `lib/types/casebrain.ts` |
| `TOCSection` | Table of contents entry | `lib/types/casebrain.ts` |
| `BundleTimelineEntry` | Timeline entry | `lib/types/casebrain.ts` |
| `BundleSearchResult` | Search result | `lib/types/casebrain.ts` |
| `BundleIssue` | Aggregated issue | `lib/types/casebrain.ts` |
| `BundleContradiction` | Detected contradiction | `lib/types/casebrain.ts` |
| `BundleOverview` | Summary overview | `lib/types/casebrain.ts` |
| `BundlePhaseASummary` | Legacy Phase A type | `lib/types/casebrain.ts` |

---

## Phase H Types (Export & Intake)

### Case Pack PDF Export
| Type | Purpose | File |
|------|---------|------|
| `CasePackSectionType` | Section type enum | `lib/types/casebrain.ts` |
| `CasePackSection` | Individual report section | `lib/types/casebrain.ts` |
| `CasePackMeta` | Full case pack metadata | `lib/types/casebrain.ts` |

### Email Intake
| Type | Purpose | File |
|------|---------|------|
| `EmailAttachment` | Attachment details | `lib/types/casebrain.ts` |
| `EmailIntakeSource` | forward/outlook-addon/other | `lib/types/casebrain.ts` |
| `EmailIntakePayload` | Incoming email payload | `lib/types/casebrain.ts` |
| `EmailIntakeResult` | Intake processing result | `lib/types/casebrain.ts` |

### Outlook Integration
| Type | Purpose | File |
|------|---------|------|
| `OutlookIntakePayload` | Outlook-specific payload | `lib/types/casebrain.ts` |

---

## Phase I Types (Solicitor Tools)

### Key Facts Sheet (I1)
| Type | Purpose | File |
|------|---------|------|
| `KeyFactsStage` | Case stage enum | `lib/types/casebrain.ts` |
| `KeyFactsFundingType` | Funding type enum | `lib/types/casebrain.ts` |
| `KeyFactsKeyDate` | Key date with urgency flag | `lib/types/casebrain.ts` |
| `KeyFactsSummary` | Full key facts summary | `lib/types/casebrain.ts` |

### Correspondence Timeline (I2)
| Type | Purpose | File |
|------|---------|------|
| `CorrespondenceDirection` | inbound/outbound | `lib/types/casebrain.ts` |
| `CorrespondenceChannel` | email/letter/phone/other | `lib/types/casebrain.ts` |
| `CorrespondenceParty` | client/opponent/court/etc | `lib/types/casebrain.ts` |
| `CorrespondenceItem` | Individual correspondence | `lib/types/casebrain.ts` |
| `CorrespondenceTimelineSummary` | Full timeline with stats | `lib/types/casebrain.ts` |

### Instructions to Counsel (I3)
| Type | Purpose | File |
|------|---------|------|
| `InstructionsToCounselSection` | Section of instructions | `lib/types/casebrain.ts` |
| `InstructionsToCounselDraft` | Full instructions draft | `lib/types/casebrain.ts` |

---

## Phase J Types (Document Intelligence)

### Clause Red-Flag Detector (J1)
| Type | Purpose | File |
|------|---------|------|
| `ClauseRedFlagCategory` | Category of red flag | `lib/types/casebrain.ts` |
| `ClauseRedFlag` | Individual red flag | `lib/types/casebrain.ts` |
| `ClauseRedFlagSummary` | Document red flag summary | `lib/types/casebrain.ts` |

### Hearing Preparation Pack (J2)
| Type | Purpose | File |
|------|---------|------|
| `HearingPrepSection` | Section of hearing pack | `lib/types/casebrain.ts` |
| `HearingPrepPack` | Full hearing prep pack | `lib/types/casebrain.ts` |

---

## Phase K Types (Case Intelligence)

### Complaint Risk Meter (K1)
| Type | Purpose | File |
|------|---------|------|
| `ComplaintRiskLevel` | low/medium/high/critical | `lib/types/casebrain.ts` |
| `ComplaintRiskFactor` | Individual risk factor | `lib/types/casebrain.ts` |
| `ComplaintRiskScore` | Full complaint risk score | `lib/types/casebrain.ts` |

### Outcome Insights Engine (K2)
| Type | Purpose | File |
|------|---------|------|
| `OutcomeConfidence` | low/medium/high | `lib/types/casebrain.ts` |
| `OutcomeInsight` | Full outcome insight | `lib/types/casebrain.ts` |

---

## Phase 3 Types

### Court Deadlines
| Type | Purpose | File |
|------|---------|------|
| `DeadlineType` | Type of CPR deadline | `lib/court-deadlines.ts` |
| `DeadlineStatus` | PENDING/DUE_SOON/OVERDUE/COMPLETED | `lib/court-deadlines.ts` |
| `CourtDeadline` | Individual deadline | `lib/court-deadlines.ts` |
| `ProtocolStage` | Grouped deadline stage | `lib/court-deadlines.ts` |

### Document Grader
| Type | Purpose | File |
|------|---------|------|
| `DocumentType` | Type of legal document | `lib/document-grader.ts` |
| `GradeLevel` | A/B/C/D/F grade | `lib/document-grader.ts` |
| `DocumentCriterion` | Grading criterion | `lib/document-grader.ts` |
| `DocumentGrade` | Full document grade | `lib/document-grader.ts` |

### Complaint Risk
| Type | Purpose | File |
|------|---------|------|
| `ComplaintRiskLevel` | LOW/MEDIUM/HIGH/CRITICAL | `lib/complaint-risk.ts` |
| `ComplaintRiskFactor` | Risk factor detail | `lib/complaint-risk.ts` |
| `ComplaintRiskAssessment` | Full assessment | `lib/complaint-risk.ts` |

### Workload & Billing
| Type | Purpose | File |
|------|---------|------|
| `LoadStatus` | UNDERLOADED/OPTIMAL/HIGH/OVERLOADED | `lib/workload.ts` |
| `FeeEarnerLoad` | Fee earner workload | `lib/workload.ts` |
| `BillingHealthMetric` | Billing metric | `lib/workload.ts` |
| `WipHealthView` | WIP health overview | `lib/workload.ts` |

---

## Existing Types (Pre-Beast Mode)

### Key Issues
| Type | Purpose |
|------|---------|
| `KeyIssueCategory` | LIABILITY/CAUSATION/QUANTUM/etc |
| `KeyIssue` | Case issue detail |

### Limitation
| Type | Purpose |
|------|---------|
| `LimitationInfo` | Limitation period details |

### Housing
| Type | Purpose |
|------|---------|
| `LandlordType` | social/private/council/unknown |
| `HousingStage` | Case stage |
| `HousingPack` | Housing case data |

### Risk Flags
| Type | Purpose |
|------|---------|
| `RiskType` | Risk category |
| `RiskStatus` | outstanding/resolved/snoozed |
| `RiskRecommendedAction` | Suggested action |
| `RiskFlag` | Full risk flag |

### Search
| Type | Purpose |
|------|---------|
| `SearchMatchType` | title/content/metadata |
| `SearchHit` | Search result |

### Missing Evidence
| Type | Purpose |
|------|---------|
| `EvidenceCategory` | Evidence type |
| `EvidenceStatus` | MISSING/REQUESTED/RECEIVED |
| `MissingEvidenceItem` | Missing item detail |
| `EvidenceRequirement` | Required evidence template |

### Document Compare
| Type | Purpose |
|------|---------|
| `ChangeType` | ADDED/REMOVED/CHANGED |
| `DocumentDiff` | Document difference |
| `DocumentCompareResult` | Comparison result |

### Party Details
| Type | Purpose |
|------|---------|
| `PartyRole` | CLAIMANT/DEFENDANT/etc |
| `PartyContact` | Contact details |
| `PartyDetails` | Party information |

### Tasks
| Type | Purpose |
|------|---------|
| `TaskSource` | Where task originated |
| `TaskStatus` | OPEN/DONE/DEFERRED |
| `CaseBrainTask` | Task detail |

### Case Heatmap
| Type | Purpose |
|------|---------|
| `CaseIssueKey` | Heatmap dimension |
| `CaseHeatmapCell` | Individual cell |
| `CaseHeatmap` | Full heatmap |

### Case Notes
| Type | Purpose |
|------|---------|
| `CaseNote` | Note on a case |

### Similar Cases
| Type | Purpose |
|------|---------|
| `SimilarCase` | Similar case match |

---

## Utility Functions

### Key Issues Builder
| Function | Purpose | File |
|----------|---------|------|
| `buildKeyIssues` | Convert raw issues to KeyIssue objects | `lib/key-issues.ts` |

> **Note**: `buildKeyIssues` was moved from `components/core/KeyIssuesPanel.tsx` to `lib/key-issues.ts` so it can be used by server components. The component re-exports it for backwards compatibility.

---

## Type Usage Guidelines

1. **Always import from `lib/types/casebrain.ts`** for shared types
2. **Keep domain-specific types in their brain files** (e.g., `lib/court-deadlines.ts`)
3. **Use `Severity` consistently** for all risk/priority levels
4. **Use `HeatmapStatus` for RED/AMBER/GREEN** indicators
5. **Avoid `any` types** - use proper typing throughout
6. **Server components**: Import utilities from `lib/` not from `"use client"` components

---

## Pack System Types (Multi-Practice Area)

### Core Pack Types
| Type | Purpose | File |
|------|---------|------|
| `PackId` | Pack identifier (matches PracticeArea) | `lib/packs/types.ts` |
| `LitigationPack` | Full pack definition | `lib/packs/types.ts` |
| `PackRegistry` | Map of all packs | `lib/packs/types.ts` |

### Evidence Requirements
| Type | Purpose | File |
|------|---------|------|
| `PackEvidenceRequirement` | Evidence item for pack | `lib/packs/types.ts` |

### Risk Rules
| Type | Purpose | File |
|------|---------|------|
| `RiskRuleCategory` | Category of risk rule | `lib/packs/types.ts` |
| `PackRiskRule` | Risk rule for pack | `lib/packs/types.ts` |
| `RiskTrigger` | Trigger condition | `lib/packs/types.ts` |

### Limitation Rules
| Type | Purpose | File |
|------|---------|------|
| `PackLimitationRule` | Limitation rule for pack | `lib/packs/types.ts` |

### Compliance Items
| Type | Purpose | File |
|------|---------|------|
| `PackComplianceItem` | Compliance check for pack | `lib/packs/types.ts` |

### Prompt Hints
| Type | Purpose | File |
|------|---------|------|
| `PackPromptHints` | AI prompt hints for brains | `lib/packs/types.ts` |

### Pack Registry Functions
| Function | Purpose | File |
|----------|---------|------|
| `getPackForPracticeArea` | Get pack by practice area | `lib/packs/index.ts` |
| `getPackById` | Get pack by ID | `lib/packs/index.ts` |
| `getAllPackIds` | Get all pack IDs | `lib/packs/index.ts` |
| `getAllPacks` | Get all packs | `lib/packs/index.ts` |
| `getEvidenceChecklist` | Get evidence requirements | `lib/packs/index.ts` |
| `getRiskRules` | Get risk rules | `lib/packs/index.ts` |
| `getPromptHint` | Get AI prompt hint | `lib/packs/index.ts` |
| `getPackLabel` | Get pack display name | `lib/packs/index.ts` |
| `getPackDescription` | Get pack description | `lib/packs/index.ts` |

### PracticeArea Type Update
The `PracticeArea` type was updated in `lib/types/casebrain.ts`:
```typescript
export type PracticeArea =
  | "housing_disrepair"
  | "personal_injury"
  | "clinical_negligence"
  | "family"
  | "other_litigation";
```

### Helper Functions
| Function | Purpose | File |
|----------|---------|------|
| `normalizePracticeArea` | Convert legacy values to standardized | `lib/types/casebrain.ts` |
| `PRACTICE_AREA_LABELS` | Human-friendly labels | `lib/types/casebrain.ts` |

---

## Last Updated
November 28, 2025 - Added multi-pack system types and functions
