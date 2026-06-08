-- ============================================
-- INJECT ANKLE FRACTURE TEST BUNDLE
-- ============================================
-- Replace :documentId with your actual document UUID
-- This bundle should trigger STRONG (Expert Pending) momentum

-- STEP 1: Get your document ID and case info
-- Run this first to get the values:
-- SELECT id, case_id, org_id, name FROM documents WHERE name LIKE '%ankle%' OR name LIKE '%fracture%' LIMIT 1;

-- ============================================
-- STEP 2: Update Document
-- ============================================
UPDATE documents
SET 
  raw_text = 'Clinical Negligence Test Bundle – Missed Ankle Fracture (Fictional)

Prepared for: ged / CaseBrain CN momentum testing

Note: All names, dates, and identifiers are fictional.

Page 1 – A&E Attendance Record

Hospital: North Manchester General Hospital – Emergency Department

Patient: Mr Ged Sample

DOB: 14/03/1993      NHS No: 999 888 7777

Hospital No: NMGH123456

Date of Attendance: 12/03/2023      Time: 21:37

Presenting Complaint:

Twisted right ankle after fall down two steps at home. Immediate pain, swelling, unable to fully weight bear.

Triage Notes:

• Mode of arrival: Walk-in, assisted by partner

• Pain score: 8/10, throbbing, worse on movement

• Swelling: Marked around lateral malleolus

• Colour: Mild bruising developing

• Red flags documented: Inability to weight bear, bony tenderness over lateral malleolus

Triage Assessment:

NEWS score: 1 (HR 98, BP 132/82, SpO2 98% RA, Temp 37.1°C)

ED Clinician Assessment (SHO):

"27-year-old male, inversion injury at home. Tender over lateral malleolus but able to partially weight bear. 

Neurovascularly intact. No deformity. Plan: ankle X-ray to rule out fracture."

Provisional Diagnosis:

Right ankle sprain.

Plan:

• X-ray ankle

• Analgesia: Paracetamol and Ibuprofen

• Reassess after imaging.

Page 2 – Initial Radiology Request and Report

Date: 12/03/2023      Time: 22:05

Referring Clinician: Dr J Smith (ED SHO)

Clinical Details on Request Form:

"Inversion injury, significant lateral ankle pain and swelling, bony tenderness over lateral malleolus, unable

 to fully weight bear. Please rule out fracture."

X-ray Performed:

Right ankle – AP and lateral views

Initial Radiology Report (Provisional):

Reported by: Dr L Brown (Radiology Registrar)

Time: 22:32

Findings:

Normal alignment of ankle mortise. No acute fracture identified. No dislocation. Soft tissue swelling laterall

y. No obvious osteochondral lesion seen.

Impression:

No acute bony injury identified. Appearances in keeping with soft tissue injury / ankle sprain.

Comment:

No further imaging recommended at this stage.

This initial radiology report is later found to be incorrect. A non-displaced fracture of the lateral malleolu

s was present on the original images but missed on the initial report.

Page 3 – ED Discharge Note

Date: 12/03/2023      Time: 23:01

ED Clinician: Dr J Smith (SHO), reviewed by: Dr K Roberts (ED Registrar)

ED Review:

X-ray reported as showing no acute bony injury. Patient still painful but able to hobble with support. Neurova

scularly intact. Soft tissue swelling around lateral ankle. No proximal fibula tenderness.

Final ED Diagnosis:

Right ankle sprain / soft tissue injury.

Discharge Plan:

• Discharged home with tubigrip and crutches.

• Advice: weight bear as tolerated, ice, elevation, over-the-counter analgesia.

• Safety netting: "If pain or swelling worsens, or if still unable to weight bear after 5–7 days, please retur

n to ED or see your GP. Persistent pain may require further imaging."

No referral made to fracture clinic.

No formal immobilisation (no boot, no cast).

No plan for repeat imaging.

This represents a missed opportunity to immobilise and arrange follow-up in accordance with standard trauma an

d BOAST guidelines for suspected ankle fractures with weight-bearing difficulty and bony tenderness.

Page 4 – GP Consultation (First Follow-Up)

GP Practice: North Manchester Medical Centre

Clinician: Dr A Patel

Date: 18/03/2023

Reason for Consultation:

Ongoing right ankle pain one week after ED visit.

History:

Seen in A&E on 12/03/2023 following ankle inversion injury. X-ray reportedly normal, diagnosed as sprain. Sinc

e then, pain has persisted, particularly on attempting to weight bear. Swelling remains significant. Difficult

y mobilising; has been largely housebound. Struggling with sleep due to pain. Self-employed delivery driver, u

nable to work since the injury.

Examination:

• Visible swelling over lateral malleolus

• Marked bony tenderness over distal fibula

• Pain on passive movement

• Guarding on weight-bearing; unable to walk without crutches

GP Impression:

Persistent pain and functional limitation are disproportionate to simple sprain. Concern regarding missed frac

ture or osteochondral injury.

Plan:

• Arrange urgent repeat X-ray via ED

• Provide sick note for 2 weeks

• Advise strict elevation and reduced weight bearing until reviewed.

Page 5 – Second A&E Attendance

Hospital: North Manchester General Hospital – Emergency Department

Date: 19/03/2023      Time: 10:14

Clinician: Dr H Green (ED Registrar)

History:

Re-presents with ongoing severe right ankle pain and swelling. Previously seen 12/03/2023, X-ray reported norm

al. GP concerned about missed fracture. Patient reports several episodes of the ankle "giving way", ongoing 8/

10 pain, and inability to work.

Examination:

• Marked lateral swelling and bruising

• Point tenderness directly over lateral malleolus

• Reduced range of movement

• Antalgic gait; unable to fully weight bear

• Neurovascular status remains intact

ED Impression:

Symptoms now 7 days post injury and disproportionate to simple sprain. Missed fracture must be excluded. Reque

st radiology review of previous images and consider repeat X-ray.

Plan:

• Repeat ankle X-ray

• Urgent radiology review of original films

• Discussion with orthopaedics following imaging.

Page 6 – Radiology Addendum and Repeat Imaging

Radiology Department: North Manchester General Hospital

Date: 19/03/2023

Addendum to Previous Report (12/03/2023):

Radiologist: Dr P Evans (Consultant Radiologist)

On retrospective review of the ankle X-ray dated 12/03/2023, there is a subtle cortical step and lucency seen 

at the distal fibula, consistent with a non-displaced Weber B fracture of the lateral malleolus.

This fracture was present on the original images but was not identified in the initial report. The previous re

port is therefore amended.

Impression (Amended):

Non-displaced Weber B fracture of the distal fibula. Associated soft tissue swelling. No dislocation.

Repeat X-ray (19/03/2023):

Confirms non-displaced Weber B fracture of the lateral malleolus. Mild widening of medial clear space compared

 to previous film, raising concern about evolving instability.

Comment:

The fracture was initially missed on the X-ray performed 12/03/2023. There has been progression in alignment s

uggestive of increased instability over the intervening week.

This addendum explicitly documents a missed fracture on initial imaging and a delay in diagnosis.

Page 7 – Orthopaedic Review Note

Department: Trauma & Orthopaedics

Clinician: Mr R Thompson (Consultant Orthopaedic Surgeon)

Date: 19/03/2023

History:

Patient referred from ED with diagnosis of right Weber B ankle fracture. Original imaging on 12/03/2023 report

ed as normal. Fracture identified on retrospective review and confirmed on repeat imaging today. Patient has b

een weight bearing on injured ankle for 7 days due to initial diagnosis of sprain.

Examination:

• Persistent lateral ankle swelling

• Localised bony tenderness over distal fibula

• Pain on stress testing of ankle

• No neurovascular compromise

Assessment:

Delayed diagnosis of right Weber B fracture following missed fracture on initial radiology report. Patient has

 continued to weight bear for one week with unstable fracture pattern. This delay is likely to have contribute

d to worsening displacement and prolonged symptoms.

Plan:

• Recommend operative management (ORIF – open reduction and internal fixation)

• Discussed risks: infection, non-union, post-traumatic arthritis, chronic pain

• Arrange surgery within 7–10 days

• Provide non-weight-bearing cast and crutches until surgery.

Page 8 – Operation Note

Hospital: North Manchester General Hospital

Date of Procedure: 24/03/2023

Surgeon: Mr R Thompson

Assistant: Registrar + Scrub Nurse

Procedure: Open Reduction Internal Fixation (ORIF) of Right Ankle – Weber B Fracture

Indication:

Delayed diagnosis of Weber B fracture with radiological evidence of instability and persistent functional impa

irment. Non-operative management no longer appropriate due to delay and displacement.

Operative Findings:

Obvious fracture at distal fibula with callus formation consistent with delayed diagnosis. Fibular fracture ed

ges appeared sclerotic, suggesting ongoing movement at the fracture site during the delay period. Ligamentous 

strain noted around lateral ankle.

Procedure Steps:

• Lateral approach to distal fibula

• Fracture fragments exposed and reduced

• Internal fixation with plate and screws

• Fluoroscopic confirmation of alignment

• Layered closure, sterile dressing applied

Post-Operative Plan:

• Non-weight-bearing for 6 weeks

• Follow-up in fracture clinic with repeat X-ray

• Physiotherapy referral for rehabilitation

Surgeon''s Comment:

Earlier identification and immobilisation of this fracture may have allowed conservative treatment and avoided

 the need for operative fixation. The delay in diagnosis has likely contributed to fracture instability and ne

ed for surgery.

Page 9 – Post-Operative Clinic Letter

Clinic: Trauma & Orthopaedic Follow-Up

Date: 10/04/2023

Clinician: Mr R Thompson

Recipient: GP – Dr A Patel

Summary:

Mr Ged Sample was reviewed post-operatively following ORIF of his right ankle Weber B fracture. As you know, t

he fracture was not identified on the initial A&E attendance on 12/03/2023 and was only diagnosed on 19/03/202

3 following GP re-referral and radiology addendum.

Progress:

• Wound healing satisfactory

• Persistent pain rated 6/10

• Ankle stiffness, reduced dorsiflexion

• Continues to be unfit for work

Clinical Opinion:

In my view, the delay in diagnosis and lack of initial immobilisation have prolonged his pain and functional l

imitations and may increase his risk of long-term stiffness and post-traumatic arthritis. Earlier recognition 

and immobilisation in a boot or cast would likely have reduced the need for surgery and shortened recovery tim

e.

Plan:

• Continue non-weight-bearing for further 2 weeks, then gradual weight bearing in boot

• Physiotherapy to commence at 6 weeks

• Review again at 12 weeks.

Page 10 – GP Follow-Up and Functional Impact

Date: 20/04/2023

Clinician: Dr A Patel

History:

Seen today 4 weeks post-surgery. Still experiencing significant right ankle pain and swelling. Walking with cr

utches. Not driving. Reports disturbed sleep, low mood, and concerns about return to work. Self-employed deliv

ery driver; financial pressure significant.

Functional Impact:

• Off work continuously since 12/03/2023

• Unable to perform usual household tasks

• Requires assistance from partner with shopping and stairs

• Ongoing pain despite regular analgesia

GP Opinion:

It is clear that the delayed diagnosis of his ankle fracture has resulted in prolonged pain, loss of earnings,

 and a more complex recovery than would have been expected with timely identification and immobilisation. I ha

ve advised him that an earlier diagnosis may have avoided surgery and reduced the length of incapacity.

Plan:

• Continue analgesia

• Fit note extended for further 4 weeks

• Suggested he seek legal advice regarding potential clinical negligence relating to the missed fracture and d

elayed diagnosis.

Page 11 – Complaint Letter from Patient

Date: 01/05/2023

From: Mr Ged Sample

To: Patient Advice and Liaison Service (PALS) / Complaints Department

Subject: Formal Complaint – Missed Ankle Fracture and Delayed Diagnosis

I am writing to raise a formal complaint regarding the care I received at North Manchester General Hospital on

 12/03/2023.

On that date, I attended A&E with a very painful and swollen right ankle after a fall. I was sent for an X-ray

 which I was told was "normal". I was discharged with a diagnosis of a sprain, no boot or cast, and told to wa

lk on it as pain allowed.

Over the next week, my pain and swelling did not improve, and I was unable to walk properly. My GP was concern

ed that the pain was not in keeping with a simple sprain and referred me back to hospital. When I returned, I 

was told that the original X-ray actually showed a fracture that had been missed, and that because of the dela

y, I would now need surgery.

I believe the failure to recognise my fracture on the first visit, and the decision to send me home without im

mobilisation or follow-up, has caused me avoidable pain, loss of earnings, and a longer and more difficult rec

overy. I would like the hospital to explain how this happened, what steps are being taken to prevent this happ

ening to other patients, and to acknowledge the distress this has caused me and my family.

Page 12 – Trust Response / Internal Investigation Summary

Date: 20/06/2023

From: Clinical Governance Lead, North Manchester General Hospital

To: Mr Ged Sample

Subject: Response to Complaint – Missed Ankle Fracture

We have now completed our review of the care you received during your attendance at our Emergency Department o

n 12/03/2023 and your subsequent care.

Our investigation confirms that:

1. The X-ray of your right ankle taken on 12/03/2023 did in fact show a non-displaced Weber B fracture of the 

lateral malleolus.

2. This fracture was not identified in the initial radiology report and was therefore not acted upon by the Em

ergency Department team.

3. You were discharged with a diagnosis of ankle sprain and without immobilisation or referral to fracture cli

nic.

4. The fracture was only identified when your GP referred you back to hospital on 19/03/2023, resulting in a d

elay of approximately 7 days in the diagnosis and appropriate management of your ankle fracture.

5. As a result of this delay, you required surgical fixation rather than conservative management, and your rec

overy has been longer and more complex than would otherwise have been expected.

We accept that the failure to identify your fracture on the initial X-ray report represents a breach of the st

andard of care you were entitled to receive. We also accept that the delay in diagnosis more likely than not c

ontributed to the need for surgery and to the prolonged symptoms you have experienced.

We would like to offer our sincere apologies for this failure and the impact it has had on you.

Learning Actions:

• Additional radiology review processes for ankle injuries with persistent symptoms.

• Teaching sessions for ED clinicians on ankle fracture red flags and the importance of immobilisation when in

 doubt.

• Audit of ankle X-ray reporting discrepancies over the next 12 months.

This bundle contains clear, repeated references to:

• Missed fracture on initial imaging (breach)

• Delay in diagnosis and lack of immobilisation (breach + causation)

• Need for surgery and prolonged recovery specifically linked to delay (harm + causation)

• Explicit Trust admission that failure constituted a breach and more likely than not caused additional harm.',
  
  ai_summary = 'Missed ankle fracture on initial radiology report. Patient attended A&E on 12/03/2023 with right ankle injury. Initial X-ray reported as normal but later addendum confirmed non-displaced Weber B fracture was present on original images. Patient discharged without immobilisation. Re-presented 7 days later with worsening symptoms. Fracture identified on retrospective review. Delay in diagnosis led to need for surgical fixation (ORIF) rather than conservative management. Trust investigation accepted breach of duty and that delay more likely than not contributed to need for surgery and prolonged recovery.',
  
  extracted_json = jsonb_build_object(
    'summary', 'Missed ankle fracture on initial radiology report. Patient attended A&E on 12/03/2023 with right ankle injury. Initial X-ray reported as normal but later addendum confirmed non-displaced Weber B fracture was present on original images. Patient discharged without immobilisation. Re-presented 7 days later with worsening symptoms. Fracture identified on retrospective review. Delay in diagnosis led to need for surgical fixation (ORIF) rather than conservative management. Trust investigation accepted breach of duty and that delay more likely than not contributed to need for surgery and prolonged recovery.',
    'keyIssues', '[
      {
        "label": "Missed fracture on initial imaging",
        "description": "Initial X-ray on 12/03/2023 reported as normal but addendum on 19/03/2023 confirmed non-displaced Weber B fracture was present on original images",
        "severity": "HIGH"
      },
      {
        "label": "Failure to immobilise",
        "description": "Patient discharged without boot, cast, or referral to fracture clinic despite inability to weight bear and bony tenderness",
        "severity": "HIGH"
      },
      {
        "label": "Delay in diagnosis",
        "description": "7 day delay between initial presentation and correct diagnosis, during which patient continued to weight bear on unstable fracture",
        "severity": "HIGH"
      },
      {
        "label": "Delay contributed to need for surgery",
        "description": "Orthopaedic surgeon and Trust investigation both accept that delay likely contributed to need for ORIF rather than conservative management",
        "severity": "HIGH"
      }
    ]'::jsonb,
    'timeline', '[
      {
        "date": "2024-03-12",
        "label": "Initial A&E attendance",
        "description": "Right ankle injury, X-ray reported as normal, discharged with diagnosis of sprain"
      },
      {
        "date": "2024-03-18",
        "label": "GP consultation",
        "description": "Ongoing pain, concern about missed fracture, arranged urgent repeat X-ray"
      },
      {
        "date": "2024-03-19",
        "label": "Second A&E attendance",
        "description": "Radiology addendum confirms fracture was present on original X-ray, fracture now identified"
      },
      {
        "date": "2024-03-24",
        "label": "Surgery (ORIF)",
        "description": "Open reduction and internal fixation performed due to delayed diagnosis and displacement"
      },
      {
        "date": "2024-04-10",
        "label": "Post-operative review",
        "description": "Surgeon confirms delay likely contributed to need for surgery and prolonged recovery"
      },
      {
        "date": "2024-06-20",
        "label": "Trust investigation response",
        "description": "Trust accepts breach of duty and that delay more likely than not contributed to need for surgery"
      }
    ]'::jsonb,
    'parties', '[]'::jsonb,
    'dates', '[]'::jsonb,
    'amounts', '[]'::jsonb
  ),
  updated_at = NOW()
WHERE id = :documentId;

-- ============================================
-- STEP 3: Ensure Practice Area
-- ============================================
UPDATE cases
SET practice_area = 'clinical_negligence'
WHERE id = (
  SELECT case_id FROM documents WHERE id = :documentId
)
AND org_id = (
  SELECT org_id FROM documents WHERE id = :documentId
);

-- ============================================
-- STEP 4: Create/Update Bundle and Chunk
-- ============================================
DO $$
DECLARE
  v_case_id UUID;
  v_org_id TEXT;
  v_bundle_id UUID;
  v_doc_name TEXT;
  v_full_text TEXT;
  v_summary TEXT;
BEGIN
  -- Get case, org, and document info
  SELECT case_id, org_id, name, raw_text, ai_summary
  INTO v_case_id, v_org_id, v_doc_name, v_full_text, v_summary
  FROM documents 
  WHERE id = :documentId;

  IF v_case_id IS NULL THEN
    RAISE EXCEPTION 'Document not found: %', :documentId;
  END IF;

  -- Find or create bundle
  SELECT id INTO v_bundle_id
  FROM case_bundles
  WHERE case_id = v_case_id AND org_id = v_org_id
  LIMIT 1;

  IF v_bundle_id IS NULL THEN
    INSERT INTO case_bundles (
      case_id, org_id, bundle_name, status, analysis_level, progress
    )
    VALUES (
      v_case_id, 
      v_org_id, 
      COALESCE(v_doc_name, 'Ankle Fracture Test Bundle'),
      'completed',
      'full',
      100
    )
    RETURNING id INTO v_bundle_id;
  END IF;

  -- Insert or update bundle_chunk
  INSERT INTO bundle_chunks (
    bundle_id, 
    chunk_index, 
    page_start, 
    page_end, 
    status,
    raw_text, 
    ai_summary, 
    processed_at
  )
  VALUES (
    v_bundle_id,
    0,
    1,
    12,
    'completed',
    v_full_text,
    v_summary,
    NOW()
  )
  ON CONFLICT (bundle_id, chunk_index) 
  DO UPDATE SET 
    raw_text = v_full_text,
    ai_summary = v_summary,
    status = 'completed',
    processed_at = NOW();

  RAISE NOTICE 'Successfully injected ankle fracture bundle for document %, case %, bundle %', 
    :documentId, v_case_id, v_bundle_id;
END $$;

-- ============================================
-- VERIFICATION
-- ============================================
-- Check document was updated:
SELECT 
  id, 
  name, 
  LEFT(ai_summary, 100) as summary_preview,
  jsonb_array_length(extracted_json->'keyIssues') as key_issues_count,
  jsonb_array_length(extracted_json->'timeline') as timeline_count,
  updated_at
FROM documents 
WHERE id = :documentId;

-- Check bundle_chunk was created:
SELECT 
  bc.id,
  bc.chunk_index,
  bc.status,
  LEFT(bc.raw_text, 50) as text_preview,
  cb.case_id,
  cb.bundle_name
FROM bundle_chunks bc
JOIN case_bundles cb ON bc.bundle_id = cb.id
JOIN documents d ON cb.case_id = d.case_id
WHERE d.id = :documentId;

