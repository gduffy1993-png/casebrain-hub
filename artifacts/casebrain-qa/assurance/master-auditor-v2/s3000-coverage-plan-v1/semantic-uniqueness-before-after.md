# Semantic uniqueness — before / after

**Status:** STOP uncommitted for Codex review · no cases generated · no PASS

## Before (`@1.0.0`)
Blanket **cluster max = 1** across semantic near-duplicates, plus required uniqueness on document-relationship and source fingerprints. Risk: manufactured diversity through IDs, salts, names, dates or cosmetic wording; unfair rejection of shared public forms and routine structures.

## After (`@1.1.0`) — layered
1. **L1 hard identity** — zero duplicate case IDs, packet hashes, complete source/output fingerprints.  
2. **L2 combined semantic signature** — normally unique; IDs/names/dates/salts/cosmetic wording must not create uniqueness.  
3. **L3** — charge family, layout, defence, stage, evidence-state label, public form structure may cluster.  
4. **L4** — repeated official/public forms expected; not rejected.  
5. **L5** — universal safety wording may repeat; measured separately from substantive output.  
6. **L6** — document-graph / evidence-graph / combined-signature **dominance % caps by stratum** (not blanket max=1).  
7. **L7** — meaningful distinctness only via substantive multi-axis combinations.  
8. **CUR detector** — rejects cosmetic uniqueness.  
9. **Routine-600 proof** — shared realistic structures without combined-signature collapse (policy arithmetic; no generation).

## Withdrawn
- `largestAllowedExactSemanticCluster = 1` as a universal semantic rule  
- `requiredUnique` on document-graph / source fingerprint alone  
- `PD-10` blanket near-duplicate cluster > 1 hard reject  

Machine delta: `semantic-uniqueness-before-after.json`  
Validation contract: `semantic-uniqueness-validation-contract.json`
