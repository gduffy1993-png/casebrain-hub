# DEFENCE PLAN SYSTEM - ENHANCEMENT PLAN

## CURRENT STATE

✅ **Phase 1 Complete:**
- LLM fallback for defence angles when `criminalMeta` is null
- System works with any PDF type (prosecution bundles, defence reviews, case summaries)
- Backward compatible with existing prosecution bundle flow

---

## PROPOSED ENHANCEMENTS

### **1. LOOPHOLE DETECTOR FALLBACK (HIGH PRIORITY)**

**Problem:** Loopholes panel shows "No loopholes identified yet" even when defence review PDF has rich content.

**Solution:**
- Add same LLM fallback to `detectAllLoopholes()` function
- When `criminalMeta` is null, analyze raw text to extract loopholes
- Update `/api/criminal/[caseId]/loopholes` route to generate on-the-fly if DB is empty
- Extract: PACE breaches, disclosure failures, evidence weaknesses, procedural errors

**Impact:** Loopholes panel will populate from defence review PDFs immediately.

**Effort:** 2-3 hours

---

### **2. DEFENCE REVIEW PDF SPECIALIZED PARSER (MEDIUM PRIORITY)**

**Problem:** Defence review PDFs have structured sections (CCTV review, disclosure status, PACE compliance) that we're not fully leveraging.

**Solution:**
- Detect defence review PDFs (keywords: "DEFENCE REVIEW", "DISCLOSURE ASSESSMENT")
- Parse structured sections:
  - "CCTV & MEDIA EVIDENCE REVIEW" → Extract outstanding material
  - "DISCLOSURE STATUS & CPIA COMPLIANCE" → Extract missing items
  - "PACE COMPLIANCE" → Extract breaches mentioned
  - "IDENTIFICATION EVIDENCE ASSESSMENT" → Extract weaknesses
- Map defence review structure → `criminalMeta` structure (partial)
- Use parsed data to seed angle finders (more accurate than pure LLM)

**Impact:** More accurate angle extraction from defence reviews, faster processing.

**Effort:** 4-5 hours

---

### **3. SMART CACHING & INCREMENTAL UPDATES (MEDIUM PRIORITY)**

**Problem:** Every page load re-runs LLM analysis, which is slow and expensive.

**Solution:**
- Cache LLM-extracted angles in database (new table: `criminal_defense_angles_cache`)
- Cache key: `caseId + documentHash + extractionVersion`
- When new document uploaded → invalidate cache → re-extract
- When no new documents → serve from cache
- Incremental updates: Only re-analyze new documents, merge with existing angles

**Impact:** Faster page loads, lower LLM costs, better UX.

**Effort:** 3-4 hours

---

### **4. MULTI-DOCUMENT INTELLIGENT MERGING (MEDIUM PRIORITY)**

**Problem:** When multiple documents exist (prosecution bundle + defence review), we're not intelligently combining them.

**Solution:**
- Priority system:
  1. Use `criminalMeta` from prosecution bundle if available (most structured)
  2. Supplement with LLM analysis of defence review PDF
  3. Merge angles, deduplicate, prioritize by confidence
- Cross-reference: Use defence review to validate/contradict prosecution bundle
- Confidence scoring: Higher confidence for structured data, lower for LLM inference

**Impact:** Best of both worlds - structured prosecution data + rich defence analysis.

**Effort:** 3-4 hours

---

### **5. ANGLE CONFIDENCE & EVIDENCE LINKING (LOW PRIORITY)**

**Problem:** LLM-extracted angles don't show which document/section they came from.

**Solution:**
- Link each angle to source document(s) and text snippets
- Show "Source: Defence Review PDF, Section 4 (CCTV Review)"
- Extract relevant quotes from documents as evidence for each angle
- Confidence score based on:
  - Structured data extraction (high confidence)
  - LLM inference from single mention (medium confidence)
  - LLM inference from multiple mentions (higher confidence)

**Impact:** More transparent, verifiable defence angles.

**Effort:** 2-3 hours

---

### **6. REAL-TIME ANGLE UPDATES (LOW PRIORITY)**

**Problem:** User has to refresh page to see new angles after uploading documents.

**Solution:**
- WebSocket/SSE connection for real-time updates
- When document processing completes → push angle updates to UI
- Show "New defence angles detected" notification
- Auto-refresh defence plan panel

**Impact:** Better UX, immediate feedback.

**Effort:** 4-5 hours

---

### **7. ANGLE PRIORITIZATION & FILTERING (LOW PRIORITY)**

**Problem:** Too many angles can overwhelm user. Need smart prioritization.

**Solution:**
- Filter by:
  - Win probability threshold (e.g., "Show only 70%+")
  - Severity (CRITICAL, HIGH, etc.)
  - Angle type (PACE, disclosure, evidence, etc.)
  - Committed strategy (show angles relevant to selected strategy)
- Sort options:
  - By win probability (default)
  - By severity
  - By exploitability
  - By relevance to strategy
- "Focus mode": Show only top 3-5 angles

**Impact:** Less overwhelming, more actionable.

**Effort:** 2-3 hours

---

### **8. ANGLE VALIDATION & QUALITY CHECKS (LOW PRIORITY)**

**Problem:** LLM might hallucinate angles that don't exist in documents.

**Solution:**
- Post-processing validation:
  - Check if angle mentions exist in source text (regex/string matching)
  - Flag low-confidence angles with "Requires verification" badge
  - Show source text snippet for each angle
- Quality scoring:
  - High: Structured data + multiple document mentions
  - Medium: Single document mention + LLM inference
  - Low: LLM inference only, no direct mentions
- User feedback: "This angle is incorrect" → improve LLM prompts

**Impact:** More reliable, trustworthy angles.

**Effort:** 3-4 hours

---

### **9. STRATEGY-SPECIFIC ANGLE FILTERING (MEDIUM PRIORITY)**

**Problem:** User selects "Charge Reduction" strategy but sees all angles (including "Fight Charge" angles).

**Solution:**
- Filter angles by committed strategy:
  - "Charge Reduction" → Show disclosure, evidence weakness, intent challenge angles
  - "Fight Charge" → Show PACE breaches, disclosure failures, identification challenges
  - "Outcome Management" → Show mitigation, character, sentencing angles
- Reorder: Most relevant angles first
- Hide irrelevant angles (or show in collapsed section)

**Impact:** More focused, strategy-aligned defence plan.

**Effort:** 2-3 hours

---

### **10. ANGLE DEPENDENCIES & SEQUENCING (LOW PRIORITY)**

**Problem:** Some angles depend on others (e.g., disclosure failure → stay application).

**Solution:**
- Define angle dependencies:
  - "DISCLOSURE_FAILURE_STAY" depends on "DISCLOSURE_FAILURE" being successful first
  - "NO_CASE_TO_ANSWER" depends on evidence exclusion angles
- Show dependency graph
- Suggest sequence: "First try X, then if successful, try Y"
- Conditional angles: "If disclosure application succeeds, then..."

**Impact:** More tactical, sequenced defence strategy.

**Effort:** 4-5 hours

---

### **11. EXPORT & SHARING (LOW PRIORITY)**

**Problem:** User wants to export defence plan to share with team/client.

**Solution:**
- Export defence plan as:
  - PDF (formatted, professional)
  - Word document (editable)
  - Markdown (for notes)
- Include:
  - All angles with full details
  - Source document references
  - Legal arguments ready to use
  - Tactical plan
- Share link: Generate shareable link (read-only) for team members

**Impact:** Better collaboration, professional output.

**Effort:** 3-4 hours

---

### **12. ANGLE TEMPLATES & REUSABILITY (LOW PRIORITY)**

**Problem:** Similar cases have similar angles, but we regenerate from scratch each time.

**Solution:**
- Angle template library:
  - Common angles (PACE breaches, disclosure failures) as templates
  - Case-specific customization (fill in case details)
  - Reuse across similar cases
- Template matching: "This case matches s18 wounding template → load common angles"
- Custom templates: User can save custom angles as templates

**Impact:** Faster analysis, consistency across cases.

**Effort:** 5-6 hours

---

## PRIORITY RANKING

### **Must Have (Do Next):**
1. ✅ Loophole Detector Fallback (HIGH)
2. Strategy-Specific Angle Filtering (MEDIUM)

### **Should Have (Do Soon):**
3. Defence Review PDF Specialized Parser (MEDIUM)
4. Smart Caching & Incremental Updates (MEDIUM)
5. Multi-Document Intelligent Merging (MEDIUM)

### **Nice to Have (Do Later):**
6. Angle Confidence & Evidence Linking (LOW)
7. Angle Prioritization & Filtering (LOW)
8. Angle Validation & Quality Checks (LOW)
9. Real-Time Angle Updates (LOW)
10. Angle Dependencies & Sequencing (LOW)
11. Export & Sharing (LOW)
12. Angle Templates & Reusability (LOW)

---

## ESTIMATED TOTAL EFFORT

- **Must Have:** ~5 hours
- **Should Have:** ~14 hours
- **Nice to Have:** ~30 hours
- **Total:** ~49 hours

---

## RECOMMENDED IMPLEMENTATION ORDER

1. **Week 1:** Loophole Detector Fallback + Strategy-Specific Filtering
2. **Week 2:** Defence Review Parser + Caching
3. **Week 3:** Multi-Document Merging + Confidence Scoring
4. **Week 4+:** Nice-to-haves as needed

---

## NOTES

- All enhancements maintain backward compatibility
- LLM costs should be monitored (caching helps)
- User feedback should guide prioritization
- Some features (real-time, export) may require infrastructure changes

