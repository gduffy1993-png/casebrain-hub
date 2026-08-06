# Solicitor Output Quality Suite (MAA V2)

**Scope:** Families K (chase), L (wording), M (audience), O (priority), P (contradiction), parts of C/D/E/N  
**Authority mix:** automated + human_review (+ browser for cockpit checks)  

## Purpose

Define the quality bar for solicitor-facing outputs without replacing Stage 150 execution.

## Suites

### 1. Actionability (K + V1 `MAA-ACTION-QUALITY` / `MAA-CHASE-QUALITY`)

Every important finding should answer:

1. what is wrong or missing;
2. why it matters;
3. which source supports it;
4. what remains unknown;
5. what action is required.

Chase items must request a specific item, link provenance, distinguish evidential vs procedural, avoid template-only invention, avoid chasing served aliases, update on service change, disclose exclusions, and use professional CPS-facing language.

### 2. Professional wording (L)

Detect broken grammar; incomplete sentences; mid truncation; incomplete disclaimers; duplicated phrases; awkward template joins; doubled spaces/punctuation; broken lists/pipe fragments; incorrect capitalisation; damaged protected acronyms; placeholders; fixture IDs; developer text; filesystem paths; audit codes; generic filler; hostile/sensational/amateur language; vague warnings without actions; excessive disclaimers; unsupported absolute-proof wording.

**Protected acronyms:** MG5, MG6, MG6C, MG11, BWV, ANPR, PTPH, SFR, PACE, CCTV, YJS, NRM, AFIS, DNA.

### 3. Audience separation (M)

Independent receipts for solicitor, client, court, CPS, supervisor, counsel, expert, internal audit. Internal audit never leaks externally. Unavailable audience → `not_exercised`.

### 4. Priority and load (O)

Both directions: important omission **and** burial under repetition. Visible priority for charge; court/hearing/time; bundle state; safe line; main risk; top contradiction; immediate action; missing evidence; do-not-say; source/provenance. Progressive disclosure required — do not delete safety content to simplify appearance.

### 5. Contradiction ranking (P)

Classify and rank: defendant/identity; operative charge; hearing/date; evidence state; attribution; continuity; procedural; wording/cosmetic. High-risk must not sit under cosmetic issues.

## Pass discipline

- Automated wording scans can yield `defect` / `unresolved` / `not_exercised`.
- Professional usefulness and many tone judgements require **human_review**.
- Missing surfaces or tools → `not_exercised`, never `pass`.
