import assert from 'node:assert/strict';
import { extractBundleCaseMetadata } from '../lib/criminal/extract-bundle-case-metadata';
const text = `Matter ref CB-TB-014 | Page 1
R v Omar Siddiq
Cover and bundle index
TabDocumentDateNotes
2Charge sheet / offence details2026Defendant, charge, court and hearing
Matter ref CB-TB-014 | Page 2
R v Omar Siddiq
Defendant and offence details
FieldEntry
DefendantOmar Siddiq
OffencePossession of a controlled drug of Class B with intent to supply, contrary to section 5(3) of
 the Misuse of Drugs Act 1971
CourtEastmere Magistrates' Court
Next hearing31 July 2026 at 10:00`;
const meta = extractBundleCaseMetadata(text);
console.log(meta.offenceWording);
assert.match(meta.offenceWording ?? '', /possession.*intent to supply/i);
assert.match(meta.offenceWording ?? '', /Misuse of Drugs Act 1971/i);
assert.doesNotMatch(meta.offenceWording ?? '', /details2026|Defendant, charge, court/);
console.log('Flattened index charge regression passed');
import { buildLiveProductionSurfacesFromDocumentUnits } from '../lib/criminal/canonical-live-surface-adapter';
const surfaces = buildLiveProductionSurfacesFromDocumentUnits([], {
  allegation: 'Possession of a Class B controlled drug with intent to supply',
  scheduleChaseLab: { unsupportedInput: true, unsupportedReason: 'Column-separated PDF text required' },
});
assert.equal(surfaces.disclosureChase.safeCourtLine, '');
assert.equal(surfaces.composedProse.courtLine, null);
assert.equal(surfaces.composedProse.cpsChase, null);
console.log('Unsupported schedule drafting regression passed');
