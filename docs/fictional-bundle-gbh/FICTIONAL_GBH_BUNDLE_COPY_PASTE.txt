================================================================================
CASEBRAIN_BUNDLE_METADATA (JSON — ingestion / testing; remove strip for print-PDF if needed)
================================================================================

{
  "bundle_version": "2.1",
  "fictional": true,
  "case_reference": "NS/2024/00452",
  "title": "R v Pike",
  "offence": "s20_oapa",
  "offence_label": "Section 20 OAPA 1861 — GBH (inflict)",
  "case_difficulty": "medium",
  "strength": "medium",
  "themes": [
    "one-punch GBH",
    "kerb fall causation",
    "friend witness",
    "CCTV requested not in bundle",
    "disclosure backlog"
  ],
  "casebrain_hooks": [
    "Tests follow-the-document disclosure status (served vs outstanding).",
    "Tests causation: single blow + fall + kerb (one sequence).",
    "Tests weak independent ID on suspect before arrest (Patel did not see punch).",
    "Tests MG5 vs MG6 vs CCTV list tension (footage 'held' vs not served).",
    "Tests charge date vs MG5 incident date mismatch.",
    "Tests MG5 'intentionally' language against s20 charge framing."
  ],
  "disclosure_issues": [
    "CCTV continuity not provided",
    "999/CAD retained not disclosed",
    "BWV not disclosed",
    "forensic report awaited",
    "medical records requested not served",
    "custody CCTV requested not provided",
    "partial 999 transcript only"
  ],
  "witness_issues": [
    "Morgan Drew is friend of victim; emotional; alcohol mentioned",
    "Patel: aftermath only; busy entrance angle",
    "Time estimates differ slightly between witnesses",
    "PC Vale attendance time 00:30; CAD fragment shows 00:24 dispatch"
  ],
  "document_tensions": [
    "Charge particulars date 14 March 2024; MG5 narrative evening 15 March 2024.",
    "MG5 para 3 suggests footage secured/hold; MG6(a) and CCTV list: footage awaiting service.",
    "MG5 evidence checklist consistent with outstanding BWV/999/CAD; align chat with MG6 rows.",
    "CCTV continuity statement notes clock drift vs shop stated times."
  ],
  "hallucination_traps": [
    "Do not invent that medical records are served — MG6 says requested / not served.",
    "Do not invent CCTV in hand — list says requested, continuity outstanding.",
    "Do not reconcile the 14th vs 15th date without flagging the conflict."
  ],
  "sections_expected": [
    "METADATA", "COVER_INDEX", "CHARGE", "MG5", "CUSTODY", "MG6A",
    "MG11_DREW", "MG11_PATEL", "MG11_VALE", "CCTV_LIST", "CCTV_CONTINUITY",
    "NINE_NINE_PARTIAL", "CAD_EXTRACT", "IR001_SUMMARY", "FORENSIC_MEDICAL_NOTE", "EXHIBIT_LIST"
  ]
}

================================================================================
CROWN PROSECUTION SERVICE — CASE PAPERS
================================================================================

R v PIKE
Section 20 Offences Against the Person Act 1861 — Grievous Bodily Harm

Northshire Magistrates' Court (to be allocated Crown Court)
Listed: 29 April 2024 — First appearance

Prosecution bundle — Initial disclosure
Case reference: NS/2024/00452

=== SECTION: COVER_INDEX ===

================================================================================
INDEX
================================================================================

Document                                              Page
------------------------------------------------------------
Charge sheet                                              3
MG5 — Case summary                                        4
Custody record — Jordan Pike                              8
MG6(a) — Schedule of initial disclosure                   11
MG11 — Witness statement — Morgan Drew                    13
MG11 — Witness statement — Samir Patel                    17
MG11 — Witness statement — PC Robin Vale                  21
CCTV list — Aroma_Kebab                                  23
CCTV continuity statement (draft)                        24
999 call — partial closed-caption extract                 25
CAD log — partial extract                                 26
Interview summary — IR-001                                27
Forensic / medical schedule note                          28
Exhibit list                                              29

=== SECTION: CHARGE ===

================================================================================
CHARGE SHEET
================================================================================

Defendant: Jordan PIKE
DOB: 12 August 1995
Address: 44 Mill Lane, Northshire, NSh1 2AB

Date of charge: 15 March 2024
Court: Northshire Magistrates' Court

CHARGE

Statement of offence
Grievous bodily harm, contrary to section 20 of the Offences Against the Person Act 1861.

Particulars of offence
Jordan Pike on 14 March 2024 unlawfully and maliciously inflicted grievous bodily harm on Casey Webb.

Plea: Not guilty (to be put before Crown Court)

Bail status: Conditional bail. Conditions: Residence at 44 Mill Lane; Curfew 22:00–06:00; Not to contact Casey Webb or Morgan Drew; Not to enter High Street, Northshire between 21:00 and 00:00.

Next hearing: 29 April 2024 — First appearance (allocation and plea).

=== SECTION: MG5 ===

================================================================================
MG5 — CASE SUMMARY
================================================================================

Prosecution case summary
Case reference: NS/2024/00452
Defendant: Jordan Pike
Offence: Section 20 OAPA 1861 — Grievous bodily harm
Prepared by: CPS Northshire
Date: 18 March 2024

Summary of the case

1. The prosecution case is that on the evening of 15 March 2024, the defendant Jordan Pike and the victim Casey Webb were involved in a verbal altercation outside Aroma Kebab, 12 High Street, Northshire. The incident escalated and the defendant punched the victim once to the face. The victim fell backwards and struck his head on the kerb. He sustained a serious laceration to the back of his head and a fracture to the occipital region. He was taken to hospital by ambulance and required treatment. The injury amounts to grievous bodily harm.

2. The victim was in the company of his friend Morgan Drew at the time. Both had been inside Aroma Kebab and had left the premises when the defendant approached. Words were exchanged between the defendant and the victim. The defendant then struck the victim. A second customer, Tina Walsh, was present in the area but left before the police arrived. Staff at Aroma Kebab, including Samir Patel, witnessed the aftermath. Mr Patel called the police. Emergency services were called; the 999 call and CAD log are retained by the force.

3. CCTV from Aroma Kebab and surrounding premises has been requested. The shop reports the relevant 22:45–23:45 window is retained on their system and a copy export is being arranged. The footage is relevant to identification and the sequence of events. Disclosure of the encoded export, hash values, and continuity documentation will be pursued; continuity bundle is not yet prepared.

4. Forensic samples were taken from the scene, including from the kerb area. The forensic report is awaited; laboratory turnaround extended due to backlogs (update as of 18 March 2024). This may assist with contact issues and the position of the victim at impact, subject to limitations of environmental staining.

5. The defendant was arrested in the early hours of 15 March 2024. He was interviewed at Northshire Police Station. He answered no comment to the questions put. His custody record and interview record form part of the disclosure.

6. Medical evidence: The victim was conveyed to Northshire General Hospital. Hospital records and a medical report have been requested from the treating team. Not yet served. The prosecution will rely on this to prove the injury and its seriousness (GBH).

7. Scene photos: Scene photographs were taken by the first attending officer at 00:35. They show the pavement, kerb, and blood. Retained by the force. To be disclosed as part of initial disclosure. Scene photos list to follow.

8. The prosecution will rely on the evidence of Morgan Drew (eye-witness, friend of victim), Samir Patel (eye-witness, independent), custody and interview records, CCTV when served, medical evidence when served, scene photos when served, and any forensic evidence when available. Body worn video from the first attending officer is retained; 999 call audio and CAD log are retained. Disclosure of BWV, 999 call, CAD log, full CCTV continuity chain, and custody CCTV is outstanding. The prosecution summary alleges the defendant deliberately punched the victim and caused grievous bodily harm unlawfully; there is no justification for the use of force (self-defence / accident are live issues for the defence).

Evidence checklist (for disclosure): CCTV export — requested; awaiting service. CCTV continuity — not yet provided. Witness statements — served (Drew, Patel, Vale). Custody record — served. Interview record — served. Forensics — report awaited. 999 call — retained; not yet disclosed. CAD log — retained; not yet disclosed. BWV — retained; not yet disclosed. Medical report / hospital records — requested; not yet served. Scene photos — retained; to be disclosed. Custody CCTV — requested by detained; not yet provided.

Crown theory (for disclosure purposes)
- The defendant struck a single blow; the victim fell; the kerb impact caused serious head injury amounting to GBH.
- The blow was unlawful; any issue is defensive narrative only (to be tested at trial).

Defence angles suggested by materials (non-exhaustive; for disclosure neutrality)
- Identity / quality of observation (lighting; witness positions; Patel did not see the punch).
- Mechanism and foreseeability (fallback / intervening factors — fact-specific).
- Self-defence or lack of intent/recklessness depending on instructions (not vouched by MG5).

Key issues list
- Identification and sequence; CCTV if served.
- Causation: blow–fall–kerb as one sequence.
- Medical proof of serious harm (report awaited).
- Disclosure completeness: CCTV continuity, BWV, 999/CAD, forensics, medical.

Witness inconsistencies (summary)
- Drew gives a punch-to-face account; Patel heard shouting and saw aftermath only.
- Times overlap but not identical (see statements).
- Vale attended ~00:30; partial CAD extract suggests earlier dispatch time — full CAD awaited.

Defendant's date of birth: 12 August 1995
Victim: Casey Webb
Key witnesses: Morgan Drew, Samir Patel
Location of incident: Outside Aroma Kebab, 12 High Street, Northshire
Approximate time of incident: Around 23:00 to 23:30

=== SECTION: CUSTODY ===

================================================================================
CUSTODY RECORD — JORDAN PIKE
================================================================================

Police station: Northshire Police Station
Custody suite reference: NS-CUST-2024-0315-001

Defendant: Jordan J. PIKE
DOB: 12 August 1995
Arrest date and time: 15 March 2024, 00:45
Arrest location: High Street, Northshire (outside Aroma Kebab)
Arrest reason: Suspected section 20 GBH — assault on Casey Webb

Detention authorised: 15 March 2024, 01:15
Authorising officer: Sgt K. Ellis

Risk and welfare (custody sergeant tick boxes / notes):
- Intoxication: Detained states 2 pints earlier; appears sobering; refused to provide formal intoximetre.
- Mental health: No known MH flag overnight; no AA required (age 28). Detained anxious but coherent.
- Injury check: Small abrasion to right knuckle noted at medical triage 01:50; declined further treatment.
- Aggression / compliance: Initially raised voice in cell corridor; compliant after legal advice.
- Requests: Solicitor (granted); water; food — meal offered.
- Sleep: Offered rest period before interview — declined.

Legal advice: Solicitor attended. Ms J. Cole, Northshire Defence Solicitors. Legal visit 02:30–03:15. Advice given. Detained stated he would reply no comment in interview.

Interview: 15 March 2024, 04:00–04:45. Conducted by DC M. Ford and DC L. Hayes. No comment interview. Interview recording reference: NS-IR-2024-0315-001.

Charge: 15 March 2024, 06:00. Charged with section 20 OAPA 1861 — GBH. Caution applied.

Meals: Tea and toast 03:30. No dietary requirements.

Rest: Detained offered rest period. Declined.

Property: Retained. No change from arrest.

Release: 15 March 2024, 07:30. Bailed to appear at Northshire Magistrates' Court on 29 April 2024. Conditions as per bail form.

Additional notes (custody officer):
Detained requested copy of custody CCTV. Not yet provided. To be requested via disclosure. Note: suite B camera cycle overwrites after 72h if not downloaded — download request logged 07:40.

Custody record completed by: PC R. Vale
Time: 15 March 2024, 07:45

=== SECTION: MG6A ===

================================================================================
MG6(a) — SCHEDULE OF INITIAL DISCLOSURE
================================================================================

Case: R v Pike
Case reference: NS/2024/00452
Date of schedule: 20 March 2024

The following items are listed for the purpose of initial disclosure under the Criminal Procedure and Investigations Act 1996.

Item                                          Status        Date served / Notes
----------------------------------------------------------------------------------------
Charge sheet                                  Served        20 March 2024
MG5 — Case summary                            Served        20 March 2024
Custody record — Jordan Pike                  Served        20 March 2024
Interview record (NS-IR-2024-0315-001)        Served        20 March 2024
MG11 — Witness statement — Morgan Drew        Served        20 March 2024
MG11 — Witness statement — Samir Patel        Served        20 March 2024
MG11 — Witness statement — PC Robin Vale      Served        20 March 2024
Exhibit list                                  Served        20 March 2024
CCTV list — Aroma Kebab                       Awaiting      Requested from premises; master export not yet in exhibits. Window 22:45–23:45.
CCTV continuity statement                     Not served    Draft received; formal continuity incomplete; see statement.
999 call audio                                Retained      Retained by force; partial closed-caption only released pre-charge elsewhere; full audio not yet disclosed under CPIA schedule.
CAD log                                       Retained      Retained by force; partial extract attached; known gap on unit timestamps awaiting IT pull.
Body worn video (BWV)                         Retained      First attending officer; download queued; disclosure pending (file large; chain TBC).
Forensic report                               Awaiting      Scene samples taken; lab backlog; draft ETA notified to OIC — not in this bundle.
Medical report / hospital records             Requested     Victim — Northshire General; not yet served to defence under initial disclosure.
Scene photos                                  Retained      Taken at scene 00:35; to be disclosed with continuity note.
Custody CCTV                                  Requested     Requested by detained / defence; download not yet confirmed from suite vendor.

Outstanding summary: CCTV export and continuity, full 999/CAD, BWV, forensic report, medical records, custody CCTV. Timetable for service subject to third parties and lab.

=== SECTION: MG11_DREW ===

================================================================================
MG11 — WITNESS STATEMENT
================================================================================

Statement of: Morgan DREW
Age: 24 (date of birth: 3 June 1999)
Address: 8 Church Road, Northshire, NSh2 4CD
Occupation: Retail assistant

This statement consisting of 3 pages is true to the best of my knowledge and belief. I make it knowing that it may be used in court.

Signed: Morgan Drew
Date: 16 March 2024

Statement

1. On Friday 15 March 2024 I was with my friend Casey Webb. We'd been in town since, like, 8ish. We went to Aroma Kebab on High Street for food — I'd had maybe two drinks, I'm not drunk, just a bit wired. We left the takeaway at about 23:15, could be 23:10, I'm not looking at the clock every second.

2. We were standing outside chatting when this lad I now know is Jordan Pike came over. Jordan and Casey had words — I don't know what started it, something stupid, it ramped up fast. Jordan was right up in Casey's face shouting. Then he punched Casey once, straight in the face — I saw that clear as anything — and Casey went backwards like a plank and his head cracked off the kerb. Horrible sound. Blood straight away. I was screaming at Jordan, people came out the shop.

3. Time-wise it was between about 23:10 and 23:30, definitely outside Aroma Kebab by the door. Lighting was takeaway spill and streetlamps — you could see faces ok where they were standing, but it was night, I'm not going to pretend it's like daytime. I knew Casey from college; I'd never seen Pike before that night — police showed me a photo the next day and said that was him from custody, I said yeah that's him.

4. Ambulance took Casey. Police took my details. I was shaking, kept going over it in my head. Casey was in and out — bad cut back of head, blood everywhere. I'm not a doctor but he looked really bad.

5. I am willing to give evidence in court. I have read this statement and it is true.

=== SECTION: MG11_PATEL ===

================================================================================
MG11 — WITNESS STATEMENT
================================================================================

Statement of: Samir PATEL
Age: 38 (date of birth: 11 November 1985)
Address: 22 Park View, Northshire, NSh3 6EF
Occupation: Manager, Aroma Kebab, 12 High Street, Northshire

This statement consisting of 2 pages is true to the best of my knowledge and belief. I make it knowing that it may be used in court.

Signed: Samir Patel
Date: 17 March 2024

Statement

1. I am the manager of Aroma Kebab. On the night of 14/15 March 2024 I was on close-down. Kitchen noise, extractor fan, busy. We close 23:30. About 23:20 I heard shouting through the door — swear words, angry — I opened the inner door and looked out. I saw a man on the deck and another bloke standing, and a younger lad freaking out. Blood on the flags. I did NOT see anyone throw a punch — I can't say I saw the hit — I saw the aftermath.

2. The injured bloke had been in earlier with a woman; she went before all this, Tina I think they're saying — they'd been in ~22:45, left maybe quarter hour later. My angle is awkward: the door frame cuts half the pavement on camera side, I was partly behind glass with reflection.

3. We have CCTV front and forecourt. Cameras run while we're open. Police want 22:45–23:45 — we've said we'll export; tech guy comes Tuesdays; police know. Footage should show approach and context but I'm not guaranteeing you see every millisecond — sign on the window catches glare sometimes.

4. I phoned 999 from the shop handset — line was bad, operator asked me to repeat address twice. Ambulance and police attended; short statement on scene. Willing to give evidence. Statement true.

=== SECTION: MG11_VALE ===

================================================================================
MG11 — WITNESS STATEMENT
================================================================================

Statement of: PC Robin VALE
Badge number: 4521
Force: Northshire Police
Role: Response officer

This statement consisting of 2 pages is true to the best of my knowledge and belief. I make it knowing that it may be used in court.

Signed: Robin Vale
Date: 16 March 2024

Statement

1. On 15 March 2024 I was on duty. We were dispatched High Street Northshire — assault shout from 999. We attended approximately 00:30 (transport log may say 00:28–00:32 range). Male on pavement, head injury, ambulance working on him. Crowd control.

2. I spoke with witness Morgan Drew and manager Samir Patel. The defendant had been pointed out / located near scene and was arrested on suspicion of s20. I later viewed BWV from first officer already on ground — shows victim and commotion; full download for disclosure not completed at time of this statement. I completed custody record at Northshire. Detainee asked for custody suite CCTV copy — not provided yet.

3. I have read this statement and it is true.

=== SECTION: CCTV_LIST ===

================================================================================
CCTV LIST — AROMA KEBAB
================================================================================

Case: R v Pike
Case reference: NS/2024/00452

Premises: Aroma Kebab, 12 High Street, Northshire
Date of incident: 14/15 March 2024
Time window requested: 22:45 – 23:45
Exhibit reference: CCTV-001

Status: Requested from premises. Master file not yet lodged in CPS exhibits. Hash TBC upon export.

Notes: Covers front and pavement; relevance: ID + sequence. Neighbouring pharmacy CCTV requested separately — not yet confirmed.

=== SECTION: CCTV_CONTINUITY ===

================================================================================
CCTV CONTINUITY STATEMENT (DRAFT — NORTHSHIRE DIGITAL EVIDENCE UNIT)
================================================================================

Exhibit: CCTV-001 (pending final exhibit number upon ingest)
Source: Aroma Kebab — Hikvision NVR — counterclaimed time zone GMT

The premises operator states recording runs 22:00–23:59 on date of interest. Export attempted 19 March showed filename timestamps +00:03:12 relative to incident witness estimates; NVR clock not network-synced in 2023 install ( engineer note on file ). A 12-second gap exists between file Cam2_234112.dav and Cam2_234124.dav — vendor says buffer flush; relevance to be assessed when footage served.

Continuity officer: DC L. Hayes (draft — formal sign-off outstanding)

=== SECTION: NINE_NINE_PARTIAL ===

================================================================================
999 CALL — PARTIAL CLOSED-CAPTION EXTRACT (REDUCED CONTENT — FULL AUDIO RETAINED)
================================================================================

Operator: Emergency which service
Caller: Police … police quick … High Street … kebab shop … fight … mans [inaudible] head
Operator: Is the patient breathing
Caller: There's blood … send someone now … [background: shouting]
Operator: Address please
Caller: Aroma … twelve High Street … Northshire … hurry up

[END EXTRACT — remainder retained; partial redaction applied pre-schedule per force policy]

=== SECTION: CAD_EXTRACT ===

================================================================================
CAD LOG — PARTIAL EXTRACT (TIMESTAMPS INCOMPLETE — FULL LOG RETAINED)
================================================================================

INC-77421-B | 15/03/2024 | ASSAULT | HIGH ST NORTHSHIRE
23:24 — Call linked (999) — grade delayed due duplicate ping
23:26 — Unit ND-14 dispatched  [column: time_on_scene blank pending sync]
00:24 — Update: ambulance on scene (source: radio burst; CAD reconciled incomplete)
00:30 — Unit ND-14 logs arrival (Vale)

Note: Full CAD reconciliation awaited from Comms; known sync issue 14–16 Mar rollout.

=== SECTION: IR001_SUMMARY ===

================================================================================
INTERVIEW SUMMARY — IR-001 (DEFENCE ACCESS — NOT FULL TRANSCRIPT IN THIS BUNDLE)
================================================================================

Interview: NS-IR-2024-0315-001 | Jordan Pike | 15 March 2024 04:00–04:45
Officers: DC Ford, DC Hayes | Legal rep: J. Cole

Pre-interview: Caution, solicitor present. Defendant confirms nominated solicitor; short private consultation.

Conduct: Majority of questions answered "no comment." Representative interrupts once re: wording of "premeditation" in hypothetical; question rephrased.

Observations (officer note for disclosure index): Defendant tired; states limited sleep; coherent. No appropriate adult required. Break offered — refused.

Outcome: No comment to material allegations; charged thereafter.

=== SECTION: FORENSIC_MEDICAL_NOTE ===

================================================================================
FORENSIC / MEDICAL — SCHEDULE NOTE (NOT A REPORT)
================================================================================

Forensic: Scene sampling kerb and pavement — chain started CR-FP-0315; laboratory queue; limitations note on environmental DNA/no suspect comparison pending strategy.

Medical: Treating hospital confirms serious head injury treatment; structured report and imaging summary requested; **not** included in initial MG6 schedule as served — status "Requested" on MG6(a).

=== SECTION: EXHIBIT_LIST ===

================================================================================
EXHIBIT LIST
================================================================================

Case: R v Pike
Case reference: NS/2024/00452
Date: 20 March 2024

Exhibit    Description
------------------------------------------------------------
MG5        Case summary
CR-001     Custody record — Jordan Pike
IR-001     Interview record — Jordan Pike (NS-IR-2024-0315-001)
MG11-1     Witness statement — Morgan Drew
MG11-2     Witness statement — Samir Patel
MG11-3     Witness statement — PC Robin Vale
CCTV-001   CCTV list — Aroma Kebab (footage export not yet in exhibits)

The following are not yet exhibited: CCTV master files, signed continuity bundle, full 999 audio, full CAD, body worn video (BWV), forensic laboratory report, medical report / hospital records, scene photos (digital pack), custody suite download.

================================================================================
END OF BUNDLE
================================================================================
