# DEFENCE PLAN GENERATION FIX - COMPREHENSIVE PLAN

## PROBLEM STATEMENT

**User uploaded a comprehensive defence review PDF but:**
- Defence plan shows "unavailable"
- No loopholes identified
- Strategy is selected but plan doesn't generate

**Root Cause:** The system expects **prosecution documents** (charge sheets, MG11s, custody records) but the user uploaded a **defence review PDF** (output from `generate-defence-review-pdf.ts`). The extraction system can't parse defence review PDFs into the structured `criminalMeta` format that the aggressive defence engine requires.

---

## ROOT CAUSE ANALYSIS

### 1. **Document Type Mismatch**
- **Expected:** Prosecution bundle documents (MG5, MG11, charge sheets, custody records)
- **Received:** Defence review PDF (structured analysis document, not source evidence)
- **Impact:** `extractCriminalCaseMeta()` extracts structured data from prosecution docs, but defence review PDFs don't contain the same structure

### 2. **criminalMeta Dependency Chain**
```
PDF Upload → Text Extraction → extractCriminalCaseMeta() → criminalMeta object
                                                              ↓
                                    aggressive-defense-engine.ts
                                    ↓
                              findAllDefenseAngles(criminalMeta, caseId)
                                    ↓
                              Most functions check: if (!criminalMeta?.prosecutionEvidence) return [];
                                    ↓
                              Result: Empty angles array → No defence plan
```

### 3. **Current Flow Breakdown**
- `app/api/criminal/[caseId]/aggressive-defense/route.ts` line 69-75:
  - Extracts `criminalMeta` from `extracted_json.criminalMeta`
  - If `criminalMeta` is null/empty → `findAllDefenseAngles(null, caseId)` → returns empty angles
- `lib/criminal/aggressive-defense-engine.ts`:
  - All angle finders check `if (!criminalMeta?.prosecutionEvidence) return []`
  - No fallback to analyze `raw_text` when `criminalMeta` is missing

### 4. **Loophole Detector Same Issue**
- `lib/criminal/loophole-detector.ts` also depends on `criminalMeta`
- If `criminalMeta` is null → no loopholes detected

---

## SOLUTION STRATEGY

### **Phase 1: Fallback to Raw Text Analysis (IMMEDIATE FIX)**

**Goal:** Make the system work with ANY PDF, not just prosecution bundles.

**Changes Required:**

1. **Modify `findAllDefenseAngles()` to accept documents array**
   ```typescript
   // Current signature:
   findAllDefenseAngles(criminalMeta: CriminalMeta | null, caseId: string)
   
   // New signature:
   findAllDefenseAngles(
     criminalMeta: CriminalMeta | null,
     caseId: string,
     documents?: Array<{ raw_text?: string; extracted_json?: unknown }>
   )
   ```

2. **Add LLM-based fallback when criminalMeta is null**
   - If `criminalMeta` is null/empty, use LLM to analyze `raw_text` from all documents
   - Extract defence angles directly from PDF content using structured prompts
   - Parse defence review PDFs, case summaries, and any text-based documents

3. **Update angle finders to work with raw text**
   - When `criminalMeta` is null, pass `documents` array to each angle finder
   - Use LLM to extract relevant information from raw text
   - Example: `findPACEExclusionAngles()` should analyze raw text for PACE breach mentions

4. **Update API route to pass documents**
   - `app/api/criminal/[caseId]/aggressive-defense/route.ts` already has `context.documents`
   - Pass `context.documents` to `findAllDefenseAngles()`

---

### **Phase 2: Enhanced Defence Review PDF Parsing (MEDIUM TERM)**

**Goal:** Specifically handle defence review PDFs as a first-class document type.

**Changes Required:**

1. **Detect defence review PDFs**
   - Check for keywords: "DEFENCE REVIEW", "DISCLOSURE ASSESSMENT", "PROCEDURAL STATUS"
   - If detected, use specialized parser

2. **Extract structured data from defence reviews**
   - Parse sections: "CCTV & MEDIA EVIDENCE REVIEW", "DISCLOSURE STATUS", "PACE COMPLIANCE"
   - Extract outstanding material lists, disclosure gaps, PACE breaches mentioned
   - Convert defence review structure → `criminalMeta` structure

3. **Map defence review content to defence angles**
   - If defence review mentions "CCTV footage outstanding" → Generate `DISCLOSURE_FAILURE_STAY` angle
   - If mentions "PACE breach" → Generate `PACE_BREACH_EXCLUSION` angle
   - If mentions "identification weaknesses" → Generate `IDENTIFICATION_CHALLENGE` angle

---

### **Phase 3: Loophole Detector Enhancement (MEDIUM TERM)**

**Goal:** Make loophole detector work with raw text when criminalMeta is missing.

**Changes Required:**

1. **Update `detectAllLoopholes()` to accept documents**
   ```typescript
   detectAllLoopholes(
     criminalMeta: CriminalMeta | null,
     caseId: string,
     documents?: Array<{ raw_text?: string }>
   )
   ```

2. **Add LLM-based loophole detection**
   - When `criminalMeta` is null, use LLM to analyze raw text
   - Extract loopholes, weaknesses, procedural errors from any document type
   - Parse defence reviews, case summaries, witness statements, etc.

---

## IMPLEMENTATION PRIORITY

### **CRITICAL (Do First):**
1. ✅ Modify `findAllDefenseAngles()` to accept `documents` parameter
2. ✅ Add LLM fallback in `findAllDefenseAngles()` when `criminalMeta` is null
3. ✅ Update API route to pass `context.documents`
4. ✅ Test with defence review PDF

### **HIGH (Do Next):**
5. Update `detectAllLoopholes()` to work with raw text
6. Add LLM-based angle extraction from raw text
7. Test with various PDF types (prosecution bundles, defence reviews, case summaries)

### **MEDIUM (Nice to Have):**
8. Specialized defence review PDF parser
9. Enhanced extraction from defence review structure
10. Performance optimization for LLM calls

---

## TECHNICAL DETAILS

### **LLM Prompt Structure for Fallback**

When `criminalMeta` is null, use this prompt structure:

```
You are analyzing a criminal defence case document. Extract defence angles and loopholes.

Document content:
{raw_text}

Extract:
1. PACE breaches mentioned
2. Disclosure failures/gaps
3. Evidence weaknesses
4. Identification issues
5. Procedural errors
6. Any other defence angles

Return structured JSON matching DefenseAngle format.
```

### **Files to Modify**

1. `lib/criminal/aggressive-defense-engine.ts`
   - Update `findAllDefenseAngles()` signature
   - Add LLM fallback function
   - Update all angle finders to accept documents

2. `app/api/criminal/[caseId]/aggressive-defense/route.ts`
   - Pass `context.documents` to `findAllDefenseAngles()`

3. `lib/criminal/loophole-detector.ts`
   - Update `detectAllLoopholes()` signature
   - Add LLM fallback

4. `app/api/criminal/[caseId]/loopholes/route.ts`
   - Pass documents to `detectAllLoopholes()`

---

## TESTING PLAN

1. **Test with defence review PDF** (current user case)
   - Upload defence review PDF
   - Verify defence plan generates
   - Verify loopholes are detected

2. **Test with prosecution bundle** (regression test)
   - Upload MG5, MG11, charge sheet
   - Verify existing flow still works
   - Verify criminalMeta extraction still works

3. **Test with mixed documents**
   - Upload both prosecution bundle + defence review
   - Verify system uses best available data

4. **Test with empty/null criminalMeta**
   - Upload non-criminal document
   - Verify fallback to raw text analysis works

---

## SUCCESS CRITERIA

✅ Defence plan generates from defence review PDF  
✅ Loopholes are detected from defence review PDF  
✅ System still works with prosecution bundles (no regression)  
✅ System works with any PDF type (prosecution, defence, case summary)  
✅ Performance is acceptable (LLM calls are fast enough)  

---

## ESTIMATED EFFORT

- **Phase 1 (Critical):** 4-6 hours
- **Phase 2 (High):** 3-4 hours  
- **Phase 3 (Medium):** 2-3 hours

**Total:** ~9-13 hours

---

## NOTES

- This fix maintains backward compatibility (prosecution bundles still work)
- LLM fallback is a safety net, not a replacement for structured extraction
- Defence review PDFs are rich in content - we should leverage that
- User frustration is valid - system should work with any document type

