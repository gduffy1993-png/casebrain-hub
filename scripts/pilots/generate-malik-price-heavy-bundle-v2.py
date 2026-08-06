from __future__ import annotations

import hashlib
import importlib.util
import json
import random
import shutil
from datetime import date
from pathlib import Path
from xml.sax.saxutils import escape

from pypdf import PdfReader, PdfWriter
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph, Table, TableStyle


ROOT = Path(__file__).resolve().parents[2]
BLUEPRINT = ROOT / "docs" / "controlled-pdf-pilots" / "malik-price-150-page"
V1_SNAPSHOT = ROOT / "output" / "pdf" / "malik-price-150-page" / "generation-v1"
OUT = ROOT / "output" / "pdf" / "malik-price-150-page" / "generation-v2"
SOURCES = OUT / "source-documents"
INGESTION = OUT / "ingestion"
EXPECTED_FREEZE = "75b4df080358baa20bd44a80344dff181e6cb623981bed69f192d133e992773e"
CASE_REF = "T202600417"
POLICE_REF = "NG/4417/26"
ACCESS_DATE = "2026-07-23"

V1_SCRIPT = ROOT / "scripts" / "pilots" / "generate-malik-price-heavy-bundle.py"
spec = importlib.util.spec_from_file_location("malik_price_v1_source", V1_SCRIPT)
V1 = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(V1)
DOCS = V1.DOCS
DOCS_BY_ID = {doc[0]: doc for doc in DOCS}


PURPOSES = {
    "DOC-COVER": ["Identify the court, parties, hearing, confidentiality and authoritative compiled pagination."],
    "DOC-INDEX": [
        "Index bundle administration, versions and pages 1-25, retaining the inaccurate master-CCTV service entry.",
        "Index disclosure schedules and witness material at pages 26-69.",
        "Index independent and police witness material at pages 70-91, retaining the duplicate Priya Shah reference.",
        "Index interview, custody and media material at pages 92-129.",
        "Index medical, telephone, disclosure correspondence and hearing material at pages 130-150, with index certification.",
    ],
    "DOC-MG5-V1": [
        "Record first-file administrative data, offence summary status and preparation provenance.",
        "Set out the initial prosecution allegation and incident sequence.",
        "Record the two defendants' separate interview positions without treating either as fact.",
        "Map witnesses, exhibits and evidential scope by defendant.",
        "Record the initial prosecution media narrative, including its overstatement of the CCTV.",
        "Record disclosure and outstanding-enquiry position at the first-summary date.",
        "Record the early PTPH listing entry of 28 August 2026 at 14:00.",
    ],
    "DOC-MG5-REVISED": [
        "Record revision control and documents received since MG5 version 1.",
        "Set out the revised allegation while preserving the limits of source evidence.",
        "Separate evidence and counts by defendant.",
        "Record media timing and the unresolved CCTV visibility limitation.",
        "Record outstanding and later material, including aliases and missing master footage.",
        "Record the current procedural position and source hierarchy.",
    ],
    "DOC-INDICTMENT-ORIGINAL": [
        "Record original Count 1 with the non-operative 1 June 2026 incident date.",
        "Record original Count 2 with the non-operative 1 June 2026 incident date.",
        "Record original Count 3 with the non-operative 1 June 2026 incident date and Price-only allocation.",
    ],
    "DOC-INDICTMENT-AMENDED": [
        "Record operative Count 1 using the frozen specimen wording.",
        "Record operative Count 2 using the frozen specimen wording and Malik-only allocation.",
        "Record operative Count 3 using the frozen specimen wording, 'locking knife', and Price-only allocation.",
    ],
    "DOC-MG6": [
        "Record disclosure schedule control, service legend and media service states.",
        "Record witness-statement and first-account service states.",
        "Record interview recording and transcript service states.",
        "Record custody and PACE material service states.",
        "Record property and exhibit service states.",
        "Record CCTV, BWV, CAD and 999 service states.",
        "Record medical and forensic service states.",
        "Record telephone extraction and attribution service states.",
        "Record court, indictment and case-management service states.",
        "Record defence requests, correspondence and missing attachments.",
        "Reconcile the telephone-report alias with the already-served report.",
        "Certify continuing review and outstanding actions without treating schedule entries as proof.",
    ],
    "DOC-MG6C": [
        "Schedule officer notebooks and first-response working material.",
        "Schedule scene-management and house-to-house material.",
        "Schedule CCTV retrieval correspondence and premises-system material.",
        "Schedule derivative CCTV processing and still-selection material.",
        "Schedule body-worn-video working records and omitted segments.",
        "Schedule CAD and 999 administrative and working records.",
        "Schedule witness contact, draft and preparation material.",
        "Schedule Malik-only custody and risk-assessment material.",
        "Schedule Price-only custody, property and image material.",
        "Schedule separate interview-preparation and briefing material.",
        "Schedule general property and exhibit-management material.",
        "Schedule Price-only knife exhibit continuity and laboratory administration material.",
        "Schedule Malik-associated handset acquisition and audit material.",
        "Schedule telephone analysis, account-association and authorship-limitation material.",
        "Schedule medical liaison and redacted administrative material.",
        "Schedule forensic-provider administration and unused working material.",
        "Schedule listing, charging and case-management working material.",
        "Schedule disclosure correspondence, duplicate references and closing certification.",
    ],
    "DOC-MG11-DRAFT-C1": [
        "Preserve Daniel Okeke's unsigned early account of leaving work and first observations.",
        "Preserve the early grey-top and red-cap clothing description and viewing conditions.",
        "Preserve the early account of demand, movement, pain and inability to see a blade.",
        "Preserve uncertainty about speakers, words, property movement and sequence.",
        "Record assistance at the scene and the witness's limited opportunity to observe departure.",
        "Record medication, timing and conditions affecting the early account.",
        "Identify the document as an unsigned working draft not adopted as a formal statement.",
    ],
    "DOC-MG11-SIGNED-C1": [
        "Record Daniel Okeke's signed-statement provenance and present recollection.",
        "Record the changed navy-jacket/light-stripe clothing description and uncertainty.",
        "Record the demand and inability to attribute every phrase to a particular man.",
        "Record the wound sensation without visual identification of the object or assailant.",
        "Record the two departing figures without attributing items carried.",
        "Separate clinical information from the witness's own perception.",
        "Complete the statement of truth and signature while preserving the earlier draft.",
    ],
    "DOC-MG11-W1": [
        "Record Priya Shah's position inside the café and the physical sight-line obstructions.",
        "Record her observation of two men approaching without facial identification.",
        "Record the quick movement and her inability to see a knife or injury mechanism.",
        "Record the uncertain lighter sleeve mark and departure towards Bridge Street.",
        "Record the 999 call, non-identification status, statement of truth and signature.",
    ],
    "DOC-MG11-W2": [
        "Record Callum Briggs's route and arrival after the confrontation.",
        "Record his distant view of two departing figures and inability to identify them.",
        "Record first-aid actions and absence of any observed weapon.",
        "Record the complainant's distressed reference to a missing phone as non-verbatim.",
        "Record police handover, aftermath-only scope, statement of truth and signature.",
    ],
    "DOC-POLICE-STATEMENTS": [
        "Record PC Leah Morton's first-response statement and scene conditions.",
        "Record the scene log, sight lines and property positions.",
        "Record PC Rowan King's arrest and property record for Malik.",
        "Record PC Naomi Jones's arrest and shoulder-bag seizure for Price.",
        "Record the opening, photography and resealing of Price's property bag.",
        "Present the knife photograph exhibit labelled NJ/1 without inferring use.",
        "Present the property-bag continuity record also labelled NJ/1, exposing the collision.",
        "Record evidence-store movements and the missing 4-to-6 June transfer.",
        "Record forensic submission and the blank intervening-handler field.",
        "Record CCTV collection, derivative clips and the unreceived premises master.",
        "Record BWV continuity, hashes and the omitted referenced segment.",
        "Reconcile defendant/count scope and state that officers do not determine wound causation.",
    ],
    "DOC-INTERVIEW-MALIK": [
        "Record interview opening, caution, identity and reason for being at Merton Parade.",
        "Record Malik's route, association with Price and lack of planned meeting.",
        "Record Malik's denial of demands, taking and joint action.",
        "Record questions about CCTV, clothing, departure and limits of the images.",
        "Record handset possession, account association and shared-access answers.",
        "Mark the controlled missing transcript page while confirming complete audio service.",
        "Record Malik's denial of weapon possession, wounding and intent.",
        "Record answers about Price, the bag and absence of knowledge of a knife.",
        "Record departure, post-incident route, closing denial and interview conclusion.",
    ],
    "DOC-INTERVIEW-PRICE": [
        "Record interview opening, caution, identity, route and shoulder bag.",
        "Record Price's denial of demands and taking property.",
        "Record proximity to Malik and denial of joint action.",
        "Record observation limits and Price's admission that a locking knife was in his bag.",
        "Record the bag pocket, prior handling, denial of removal and exhibit-identification limit.",
        "Record locking mechanism, public-place questions and denial of use or threat.",
        "Record awareness of injury and denial of plans to use force or take property.",
        "Record CCTV departure questions, route and denial of discarding property.",
        "Record the continuity qualification, possession answer, robbery denial and conclusion.",
    ],
    "DOC-CUSTODY-PACE": [
        "Record Malik's booking, grounds, rights, legal advice and detention authorisation.",
        "Record Price's booking, grounds, rights, legal advice and detention authorisation.",
        "Record Malik's risk assessment, healthcare screen and personal property.",
        "Record Price's risk assessment and separation of personal property from the evidential bag.",
        "Record solicitor contact and private consultations without privileged content.",
        "Record Malik's custody-system movement times that conflict with the interview record.",
        "Record Price's custody and interview movements.",
        "Record Malik's charge entries for Counts 1 and 2 and remand decision.",
        "Record Price's charge entries for Counts 1 and 3 and bail position.",
        "Record Malik's remand transfer and Price's conditional release.",
    ],
    "DOC-CCTV-BWV-CAD": [
        "Record media register, derivative service, missing premises master and native clock note.",
        "Present CCTV clip C1 approach still, metadata and viewing limits.",
        "Present CCTV clip C2 obstruction still, metadata and viewing limits.",
        "Present CCTV clip C3 separation still, metadata and viewing limits.",
        "Present CCTV clip C4 departure still, metadata and viewing limits.",
        "Present the CAD incident chronology on its native timebase.",
        "Present the 999 transcript extract and caller's express observation limits.",
        "Present BWV register, continuity and the missing referenced segment.",
        "Reconcile displayed CCTV and CAD times without altering either native record.",
        "Certify media completeness limits: clips and stills served, master missing, stabbing not clear.",
    ],
    "DOC-MEDICAL-FORENSIC": [
        "Present emergency-department triage, observations, pain history and initial treatment.",
        "Present the emergency assessment, imaging and referral chronology.",
        "Present the operation-note extract and anatomical findings.",
        "Present inpatient recovery, discharge and follow-up record.",
        "Present Dr Maya Venn's factual statement from the clinical notes.",
        "Present the forensic clinician's qualifications, materials, method and qualified opinion.",
        "Present the opinion limitations separating injury from identity, item attribution and intent.",
        "Present the medical exhibit index, service state, declaration and signature.",
    ],
    "DOC-PHONE-ATTRIBUTION": [
        "Record instruction, exhibit receipt and separation of device seizure from ownership.",
        "Record acquisition method, tool version, native container and integrity hashes.",
        "Record handset, SIM and subscriber identifiers without equating registration with use.",
        "Record account association and shared-access material without inferring authorship.",
        "Present a selected-message schedule with account/device provenance and author unknown.",
        "Present cell/application time and area-level location limitations.",
        "Reconcile the served report with its later alias and state the attribution limitations.",
    ],
    "DOC-DISCLOSURE-CORRESPONDENCE": [
        "Present the 27 June CPS email referring to a master-CCTV attachment absent from the served copy.",
        "Present the 29 June defence chase requesting the missing attachment and service confirmation.",
        "Present the 1 July defence chase using the alias 'downloaded handset data report'.",
        "Present the 3 July CPS response reconciling the telephone alias and confirming the master remains awaited.",
    ],
    "DOC-HEARING-NOTICE-PTPH": [
        "Present the operative Crown Court PTPH notice for 14 September 2026 at 10:00 in Court 3.",
        "Present accompanying case-management directions and identify the superseded MG5 listing.",
    ],
}


MG6_GROUPS = [
    ("Media service", ["CCTV clips C1-C4", "Premises master CCTV export", "CCTV still sheet A", "CCTV continuity statement", "BWV LM/2", "BWV RK/4", "Media hash register"]),
    ("Witness service", ["Daniel Okeke draft account", "Daniel Okeke signed statement", "Priya Shah signed statement", "Callum Briggs signed statement", "PC Morton statement", "PC King statement", "PC Jones statement"]),
    ("Interview service", ["Malik audio master", "Malik working copy", "Malik transcript pages 1-5", "Malik transcript page 6", "Malik transcript pages 7-9", "Price audio master", "Price complete transcript"]),
    ("Custody service", ["Malik custody front sheet", "Price custody front sheet", "Malik risk screen", "Price risk screen", "Legal-advice attendance log", "Malik movement log", "Price movement log"]),
    ("Property service", ["Malik property receipt", "Price property receipt", "Price shoulder-bag seizure record", "Bag opening record", "Knife photograph NJ/1", "Property-bag log NJ/1", "Evidence-store movement sheet"]),
    ("Incident media", ["CAD certified extract", "CAD native print", "999 audio", "999 transcript", "BWV viewing log", "CCTV clock comparison note", "Scene sight-line plan"]),
    ("Medical service", ["ED triage extract", "ED clinician note", "Imaging report", "Operation note extract", "Discharge record", "Dr Venn statement", "Forensic medical report"]),
    ("Telephone service", ["Device seizure record", "Acquisition log", "Extraction report", "Message schedule", "Location schedule", "Attribution limitations", "Service receipt"]),
    ("Court material", ["Original indictment", "Amended indictment", "Sending record", "Early listing email", "PTPH notice", "PTPH directions", "Standard witness table"]),
    ("Correspondence", ["CPS service email 25 June", "CPS email 27 June", "Defence chase 29 June", "Defence chase 1 July", "CPS response 3 July", "Missing attachment record", "Disclosure action log"]),
    ("Alias reconciliation", ["Telephone extraction and attribution report", "Downloaded handset data report request", "Secure-email service receipt", "Document hash comparison", "Title-mapping note", "Defence confirmation request", "Disclosure officer reconciliation"]),
    ("Continuing review", ["Disclosure review certificate", "Outstanding CCTV-master action", "Outstanding BWV-segment action", "Malik transcript exception", "Knife-continuity action", "Witness-difference review", "Final schedule sign-off"]),
]


MG6C_GROUPS = [
    ("Officer notebooks", ["PC Morton pocket notebook 3 June", "PC King pocket notebook 3 June", "PC Jones pocket notebook 3 June", "Custody desk rough note", "Supervisor briefing note", "Officer availability email", "Vehicle deployment note", "First-response debrief"]),
    ("Scene management", ["Initial scene sketch", "Cordon log", "House-to-house negative enquiry 01", "House-to-house negative enquiry 02", "Street-light maintenance response", "Delivery-van owner contact note", "Bus-shelter cleaning log", "Unused scene photograph index"]),
    ("CCTV retrieval", ["Premises manager request email", "CCTV system make-and-model note", "Native export request form", "Engineer call record", "Retention-window reminder", "Collection appointment log", "Premises consent form", "Unanswered master-export chase"]),
    ("CCTV processing", ["Clip C1 working transcode", "Clip C2 working transcode", "Clip C3 working transcode", "Clip C4 working transcode", "Still-selection worksheet", "Thumbnail contact sheet", "Player-software note", "Analyst viewing rough notes"]),
    ("Body-worn video", ["LM/2 upload receipt", "LM/2 auto-transcript", "LM/2 viewing bookmark list", "RK/4 upload receipt", "RK/4 partial export note", "Referenced RK/4 segment request", "BWV audit trail", "BWV redaction working copy"]),
    ("CAD and 999", ["CAD operator rough note", "CAD event export request", "CAD certification email", "999 call-taker worksheet", "999 auto-transcript", "Audio quality note", "Dispatch radio extract", "Ambulance liaison record"]),
    ("Witness preparation", ["Okeke first-contact note", "Okeke unsigned draft", "Okeke appointment email", "Shah contact log", "Shah availability note", "Briggs contact log", "Briggs availability note", "Duplicate Shah index working entry"]),
    ("Malik custody", ["Malik search record", "Malik risk-screen worksheet", "Malik meal and drink log", "Malik cell-check print", "Malik legal-advice call log", "Malik property photograph", "Malik detention review note", "Malik custody-clock print"]),
    ("Price custody", ["Price search record", "Price risk-screen worksheet", "Price personal-property image", "Price shoulder-bag booking image", "Price legal-advice call log", "Price cell-check print", "Price bail-address check", "Price post-arrest image sheet"]),
    ("Interview preparation", ["Malik solicitor briefing record", "Malik interview plan", "Malik question schedule draft", "Malik transcript correction sheet", "Price solicitor briefing record", "Price interview plan", "Price question schedule draft", "Interview-room equipment checklist"]),
    ("Property management", ["Temporary-locker receipt", "Property transfer request", "Evidence-store intake note", "Seal-number worksheet", "Property barcode audit", "Exhibit-label allocation log", "Rebagging consumables record", "Unused property photograph list"]),
    ("Knife continuity", ["Price bag seizure worksheet", "Bag seal image", "Knife measurement worksheet", "Knife photograph contact sheet", "Unrecorded-transfer query", "Laboratory booking email", "Laboratory receipt worksheet", "Continuity reconciliation draft"]),
    ("Handset acquisition", ["Black-handset seizure worksheet", "SIM removal photograph", "Faraday-bag log", "Device triage note", "Extraction authority record", "Native-container receipt", "Acquisition hash worksheet", "Device return/retention note"]),
    ("Telephone analysis", ["Account-handle research note", "Subscriber return", "Shared-access enquiry note", "Message-filter query", "Deleted-record search log", "Location-cell lookup worksheet", "Timezone conversion note", "Analyst peer-review comments"]),
    ("Medical liaison", ["Hospital records request", "Consent/legal-basis record", "ED liaison email", "Imaging retrieval log", "Operation-note request", "Redacted contact sheet", "Clinician availability email", "Medical bundle working index"]),
    ("Forensic administration", ["Terms-of-reference draft", "Provider quotation", "Material dispatch note", "Laboratory case opening", "Analyst bench notes index", "Quality-control worksheet", "Unused image annotation", "Expert disclosure index"]),
    ("Case management", ["Early listing email", "Court availability note", "Charging referral worksheet", "CPS action plan", "Witness requirement draft", "Advocate conference note index", "Bundle pagination worksheet", "Superseded direction checklist"]),
    ("Disclosure closing", ["Defence chase log", "CPS response log", "Attachment exception note", "Telephone alias mapping draft", "Schedule quality-check sheet", "Disclosure officer review note", "Prosecutor endorsement tracker", "Closing certificate working copy"]),
]


POLICE_CONTENT = [
    ("First response", "PC Leah Morton attended at 21:47 after CAD deployment. Daniel Okeke was on the pavement outside 14 Merton Parade and members of the public were providing first aid. Morton requested ambulance attendance, separated witnesses and recorded that she had not seen the incident itself."),
    ("Scene log and sight lines", "The café doorway, bus shelter, freestanding street sign and delivery van were measured and photographed. The van and sign obstructed part of the line from the café to the place of close contact. No officer account converts those observations into an identification."),
    ("Arrest of Malik Hassan", "PC Rowan King arrested Malik near Northgate tram stop at 23:06. Grounds, caution, clothing and personal property were recorded. No knife or complainant property was recorded in Malik's personal-property receipt."),
    ("Arrest of Jordan Price", "PC Naomi Jones arrested Price on Bridge Street at 23:18. A shoulder bag was seized, separated from personal property and sealed. The seizure record concerns Price only."),
    ("Opening and resealing", "Seal 884216 was opened at 00:42 on 4 June by Jones in the presence of Morton. A locking knife was photographed, measured and placed in a new bag marked 884216A. This record does not address use or wound causation."),
    ("Knife photograph NJ/1", "This exhibit sheet depicts the locking knife as photographed after the bag was opened. Scale, colour card, seal number and photographer details are shown. The label NJ/1 collides with a separate continuity-log label."),
    ("Property-bag log NJ/1", "This separately created log also bears NJ/1. It records entries before temporary storage and after laboratory receipt but contains no entry for the transfer between 4 and 6 June."),
    ("Evidence-store movements", "The evidence-store system records temporary-locker placement on 4 June and laboratory dispatch on 6 June. The handler and physical movement between those events are blank and require reconciliation."),
    ("Forensic submission", "The provider recorded receipt of seal 884216A on 6 June. The submission asks for examination and preservation. It does not ask the scientist to determine the identity of an assailant or legal intent."),
    ("CCTV collection", "Four derivative clips were copied from the premises system on 5 June. Hashes for those files were recorded. The native premises master export was requested but was not received."),
    ("BWV continuity", "LM/2 and part of RK/4 were uploaded and hashed. A segment referred to in the viewing note is outside the served set. Both recordings begin after the alleged offence."),
    ("Scope reconciliation", "The robbery allegation concerns both defendants. The wounding allegation concerns Malik; the separate locking-knife possession allegation concerns Price. The exhibit records do not establish that Price's knife caused the wound."),
]


MEDICAL_CONTENT = [
    ("Emergency department triage", "Daniel Okeke arrived by ambulance at 22:18. The triage record documents a penetrating wound to the left upper abdomen, pain score, observations, allergy status and analgesia. It records a patient history, not an identification of an assailant."),
    ("Emergency assessment and imaging", "Clinical examination, blood tests, imaging request and surgical referral are time-stamped. The imaging report describes the wound track and excludes a retained radiopaque foreign body. The record does not identify a particular implement."),
    ("Operation note extract", "The operation note records wound exploration, haemostasis, irrigation and closure. Anatomical observations and treatment are distinguished from later expert interpretation. No police account is adopted as clinical fact."),
    ("Inpatient and discharge record", "Post-operative observations, medication, mobilisation, wound care and discharge advice are recorded. Personal contact details are visibly redacted from the defence copy."),
    ("Factual witness statement", "Dr Maya Venn identifies the clinical records she made or reviewed and describes examination and treatment. She gives no opinion on identity, participation or intent."),
    ("Forensic medical opinion", "The instructed clinician lists qualifications, materials, method and assumptions. The injury is compatible with a sharp implement, but wound appearance alone cannot identify a specific recovered item."),
    ("Opinion limitations", "Injury mechanism, assailant identity, exhibit attribution and intent are separate questions. The report supports the existence and clinical character of injury only within its stated qualifications."),
    ("Exhibit index and declaration", "The source clinical extracts, imaging report, factual statement and opinion report are indexed with service dates. The expert duty, statement of truth, signature and report-version history are recorded."),
]


PHONE_CONTENT = [
    ("Instruction and receipt", "A black handset was seized from a coat associated with Malik Hassan. Seizure, physical possession, legal ownership and user identity are recorded as distinct propositions."),
    ("Acquisition and integrity", "A read-only extraction was completed using tool version 9.4. Native container, working copy, acquisition log and SHA-256 values are recorded with analyst and peer-review identifiers."),
    ("Device and SIM identifiers", "Handset serial, IMEI, SIM identifier and subscriber return are tabulated. Subscriber registration and device presence do not establish who used the handset at any event."),
    ("Account association", "The handle northline_mh appears on the device and in prior association material. Shared access is reported. Account association does not establish authorship of each message."),
    ("Selected message schedule", "Messages concerning a meeting near Merton Parade are presented with source path, application time, device time and account label. Human author remains unknown unless separately supported."),
    ("Location and time", "Cell and application records are shown with timezone and precision. They describe a device or account event within an area and do not place a person at a precise point."),
    ("Limitations and alias reconciliation", "The served 'Telephone extraction and attribution report' is the document later called the 'downloaded handset data report'. Ownership, association and authorship remain separately stated."),
]


WITNESS_ADDITIONS = {
    "DOC-MG11-DRAFT-C1": [
        ("Additional detail", "I had finished work and was walking along the parade when I became aware of people close to me. My attention moved between the pavement, the shop fronts and the people nearby, so I did not have an uninterrupted view of either man's face.", "Recording note", "The officer wrote this early account while I was receiving assistance. I had not checked the wording against a recording and I did not sign or adopt these pages."),
        ("Viewing conditions", "The shop lighting was brighter than the pavement and I was looking across changing pools of light. My description of a grey top and red cap was an impression made during quick movement, not a formal identification.", "Uncertainty retained", "I could not say whether the same clothing remained visible throughout or whether one person passed behind the other. I did not select anyone from an identification procedure."),
        ("Sequence remembered", "I remember a demand, movement around me and then pain. Those things happened close together, but I could not put every movement into an exact order or say which man spoke each phrase.", "Object not seen", "I did not see a blade or other object enter my body. The account records the sensation and what I noticed afterwards, not a visual identification of the cause."),
        ("Property account", "I later realised that my telephone and cash were not with me. I did not see either item pass into a particular hand and I could not say which person, if either, carried them away.", "Words and speakers", "Some words were shouted while people were moving. I could not reliably assign every word to one speaker, and the draft should not be read as doing so."),
        ("Assistance", "People came towards me after I called out and I focused on staying upright. By the time I looked along the pavement, the figures were already moving away and I saw them only briefly.", "Departure limit", "I could not identify what either figure was carrying. I remember a direction of travel rather than a clear view of faces or hands."),
        ("Condition when recorded", "I was tired, in pain and had received medication before parts of the early account were written down. I answered as best I could, but timings in this draft were estimates.", "Later review", "Any later statement should be compared with this wording. A later account does not make this unsigned draft a statement I adopted."),
        ("Draft status", "I was not asked to sign these pages as a formal statement on that occasion. Corrections, if any, were to be dealt with when I was able to review a complete statement.", "Officer endorsement", "Working copy retained to show the words first recorded, the circumstances in which they were obtained and the fact that no statement of truth was signed."),
    ],
    "DOC-MG11-SIGNED-C1": [
        ("Present recollection", "I have read this statement when able to concentrate and have separated what I personally remember from information later given to me. I continue to describe only what I saw, heard or felt at the parade.", "Earlier account", "I understand that an unsigned early account is retained separately. Where this signed statement differs, both records should be available rather than one being silently substituted for the other."),
        ("Clothing impression", "My present recollection is of a dark navy jacket with a lighter stripe. The observation was brief and affected by movement and lighting, and I cannot use that feature to identify a person.", "Identification limit", "I did not see either face clearly enough to make an identification. I have not been shown a procedure that changes that position."),
        ("Demand and movement", "I heard words demanding property while the two men were close, but I cannot safely say that every phrase came from the same speaker. Bodies crossed my view and I lost sight of hands.", "Property limit", "I did not see my telephone or cash in a named person's possession. I discovered the loss after the close contact had ended."),
        ("Pain and injury", "I felt sudden pain on my left side during the movement. I did not see what caused it and cannot identify a weapon or the person responsible from my own sight.", "Medical information", "Descriptions of the wound, treatment and possible implement come from clinical records or expert material, not from anything I saw."),
        ("Departure", "I saw two figures moving away in the Bridge Street direction. The view was from behind and at increasing distance, and I cannot say what either person carried.", "Continuity of observation", "My view was interrupted while other people approached and I concentrated on the injury. I cannot give an unbroken account of the figures' route."),
        ("Clinical separation", "I have included the treatment chronology only to explain when this statement was made. I do not adopt a clinician's opinion about mechanism, attribution or intent.", "Personal knowledge", "My evidence is limited to the incident as I perceived it and the property I later found missing."),
        ("Final review", "I have checked the page sequence and the corrections shown. No one has asked me to identify a person, a recovered exhibit or the author of any digital message.", "Statement of truth", "I make this statement from my own recollection, subject to the uncertainties and limits recorded on the preceding pages."),
    ],
    "DOC-MG11-W1": [
        ("Café position", "I was inside the café behind the counter. The window frame, street sign and a delivery vehicle each blocked part of the pavement at different moments, so my view was not continuous.", "Observation limit", "I could see movement and clothing at intervals but could not identify a face or see the hands of both people throughout."),
        ("Approach", "I saw two people move towards the area outside the late shop. I did not hear enough of the conversation to attribute words and I could not tell whether they had arrived together.", "Distance and light", "Reflection from the café glass and the brighter interior affected the view. I did not make a recognition or formal identification."),
        ("Close contact", "The movement was quick and partly behind the street furniture and vehicle. I did not see a knife, a wound being caused or property pass from one person to another.", "What I did see", "I saw bodies close together and then separating. Anything more specific about the cause of injury would be an inference rather than my observation."),
        ("Clothing and departure", "I recall a lighter mark or sleeve area on one figure, but cannot be certain of its colour, garment or wearer. Two figures moved towards Bridge Street.", "Identification limit", "The clothing impression is not sufficiently distinctive to identify either person and I could not see what either carried."),
        ("Emergency call", "I called 999 and described an injured man and people leaving. I told the call taker that I had not seen what caused the injury.", "Final review", "I have checked that this statement does not identify a suspect, a weapon or the person responsible for any demand."),
    ],
    "DOC-MG11-W2": [
        ("Arrival", "I came along the parade after the close confrontation had ended. I first noticed an injured man and people moving away at a distance.", "Scope", "I did not see the beginning of the incident, any demand, any taking of property or the injury being caused."),
        ("Departing figures", "I saw two figures from behind for a short time. Distance, other pedestrians and the angle of view meant that I could not identify either one.", "Hands and property", "I could not see a weapon and cannot say whether either person carried the complainant's property."),
        ("First aid", "I concentrated on helping the injured man and asking others to contact emergency services. My attention was then on his condition rather than the departing figures.", "No mechanism evidence", "I did not examine the wound beyond what was necessary to assist and I offer no opinion about the object or person that caused it."),
        ("Words heard", "The injured man referred to his phone while distressed. I cannot give his exact words and did not see the phone taken.", "Hearsay boundary", "The reference explains my actions at the scene; it is not my direct observation of a robbery or identification of an offender."),
        ("Police handover", "I remained until police and ambulance staff took over. I pointed out the general direction in which I had seen figures moving.", "Final review", "My evidence concerns the aftermath and first aid. I do not identify either defendant, a weapon or any recovered exhibit."),
    ],
}


PUBLIC_REFS = [
    ("Criminal casefiles: forms, standards and file structure", "https://www.gov.uk/government/publications/manual-of-guidance-and-mg-forms/criminal-casefiles-forms-standards-and-file-structure-accessible"),
    ("Criminal Procedure Rules forms", "https://www.gov.uk/guidance/criminal-procedure-rules-forms"),
    ("Criminal Procedure Rules 2025 and Criminal Practice Directions 2023", "https://www.gov.uk/guidance/criminal-procedure-rules-2025-and-criminal-practice-directions-2023"),
    ("PACE Code C 2023", "https://www.gov.uk/government/publications/pace-code-c-2023/pace-code-c-2023-accessible"),
    ("CPS Disclosure National Standards", "https://www.cps.gov.uk/prosecution-guidance/disclosure-national-standards"),
    ("CPS Disclosure Manual examples of unused material", "https://www.cps.gov.uk/sites/default/files/documents/legal_guidance/Annex-A-Examples-of-Unused-Material.pdf"),
    ("CPS Expert Evidence", "https://www.cps.gov.uk/prosecution-guidance/expert-evidence"),
    ("Forensic Science Regulator Code of Practice version 2", "https://www.gov.uk/government/publications/forensic-science-activities-statutory-code-of-practice-version-2"),
    ("College of Policing CCTV guidance", "https://www.college.police.uk/guidance/investigation/investigative-strategies/cctv"),
    ("NHS England high quality patient records", "https://www.england.nhs.uk/long-read/high-quality-patient-records/"),
    ("HMCTS where to add case materials", "https://www.gov.uk/government/publications/how-to-use-hmcts-common-platform/where-to-add-case-materials"),
]


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def verify_freeze() -> dict:
    freeze_text = (BLUEPRINT / "FREEZE-HASH.txt").read_text(encoding="utf-8")
    if EXPECTED_FREEZE not in freeze_text:
        raise RuntimeError("Pinned Malik-Price v1.1 freeze hash is not present")
    marker = json.loads((V1_SNAPSHOT / "IMMUTABLE-GENERATION-V1.json").read_text(encoding="utf-8"))
    if marker["payloadTreeSha256"] != "4b51904abf96514b0d9f9be3c6bd042cbe9bd10190731f9c4e8fa99218a9b7d1":
        raise RuntimeError("generation-v1 immutable marker mismatch")
    hashes = {}
    for path in sorted(BLUEPRINT.iterdir()):
        if path.is_file():
            hashes[path.name] = sha256(path)
    return hashes


def reset_v2() -> None:
    if OUT.exists():
        raise RuntimeError("generation-v2 already exists; refusing to overwrite")
    SOURCES.mkdir(parents=True)
    INGESTION.mkdir(parents=True)


def pstyle(size=9, leading=12, bold=False, color="#17202A", align=TA_LEFT):
    return ParagraphStyle(
        "p",
        fontName="Helvetica-Bold" if bold else "Helvetica",
        fontSize=size,
        leading=leading,
        textColor=colors.HexColor(color),
        alignment=align,
        spaceAfter=0,
    )


def para(c, text, x, top, width, size=9, leading=12, bold=False, color="#17202A", align=TA_LEFT):
    p = Paragraph(escape(text).replace("\n", "<br/>"), pstyle(size, leading, bold, color, align))
    _, height = p.wrap(width, 200 * mm)
    p.drawOn(c, x, top - height)
    return top - height


def draw_table(c, data, x, top, widths, font=7.2, header_bg="#DCE6ED", grid="#8294A3", row_bgs=None, padding=3.2):
    cells = []
    for r, row in enumerate(data):
        cells.append([
            Paragraph(escape(str(value)), pstyle(font, font + 2.1, r == 0, "#17202A"))
            for value in row
        ])
    table = Table(cells, colWidths=widths, repeatRows=1)
    commands = [
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(header_bg)),
        ("GRID", (0, 0), (-1, -1), 0.45, colors.HexColor(grid)),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), padding),
        ("RIGHTPADDING", (0, 0), (-1, -1), padding),
        ("TOPPADDING", (0, 0), (-1, -1), padding),
        ("BOTTOMPADDING", (0, 0), (-1, -1), padding),
    ]
    if row_bgs:
        for row_no in range(1, len(data)):
            commands.append(("BACKGROUND", (0, row_no), (-1, row_no), colors.HexColor(row_bgs[(row_no - 1) % len(row_bgs)])))
    table.setStyle(TableStyle(commands))
    _, height = table.wrap(sum(widths), 250 * mm)
    table.drawOn(c, x, top - height)
    return top - height


def section(c, title, x, top, width, fill="#DCE6ED", ink="#16334D"):
    c.setFillColor(colors.HexColor(fill))
    c.roundRect(x, top - 7 * mm, width, 7 * mm, 1.5 * mm, fill=1, stroke=0)
    c.setFillColor(colors.HexColor(ink))
    c.setFont("Helvetica-Bold", 9)
    c.drawString(x + 3 * mm, top - 4.8 * mm, title)
    return top - 10 * mm


def signature(c, x, y, name, role=None, scanned=False):
    c.setStrokeColor(colors.HexColor("#3B5E7B" if not scanned else "#5F6468"))
    c.setLineWidth(1.1)
    c.bezier(x, y, x + 12 * mm, y + 8 * mm, x + 20 * mm, y - 4 * mm, x + 34 * mm, y + 4 * mm)
    c.setFont("Helvetica", 6.6)
    c.setFillColor(colors.HexColor("#354A5B"))
    c.drawString(x, y - 4 * mm, name + (f" - {role}" if role else ""))


def redaction(c, x, y, width, label="personal contact details withheld"):
    c.setFillColor(colors.black)
    c.rect(x, y, width, 5 * mm, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#5A6670"))
    c.setFont("Helvetica", 5.5)
    c.drawString(x, y - 2.5 * mm, label)


def scan_texture(c, width, height, seed):
    rng = random.Random(seed)
    c.setFillColor(colors.HexColor("#F2F1EC"))
    c.rect(0, 0, width, height, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#D1D0CB"))
    for _ in range(110):
        x = rng.random() * width
        y = rng.random() * height
        r = rng.choice([0.12, 0.18, 0.22])
        c.circle(x, y, r, fill=1, stroke=0)


def footer(c, w, compiled, local, total, classification="OFFICIAL - COURT/CASE USE"):
    c.setStrokeColor(colors.HexColor("#9BA8B3"))
    c.setLineWidth(0.35)
    c.line(14 * mm, 13 * mm, w - 14 * mm, 13 * mm)
    c.setFillColor(colors.HexColor("#4C5B66"))
    c.setFont("Helvetica", 6.4)
    c.drawString(14 * mm, 8.5 * mm, f"R v Malik Hassan and Jordan Price | source page {local} of {total}")
    c.drawCentredString(w / 2, 8.5 * mm, classification)
    c.drawRightString(w - 14 * mm, 8.5 * mm, f"COMPILED PAGE {compiled} OF 150")


def top_header(c, w, h, title, org, color, compiled, local, total, classification="OFFICIAL - COURT/CASE USE"):
    c.setFillColor(colors.HexColor(color))
    c.rect(0, h - 20 * mm, w, 20 * mm, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 8.3)
    c.drawString(14 * mm, h - 8 * mm, org)
    c.setFont("Helvetica", 6.5)
    c.drawRightString(w - 14 * mm, h - 8 * mm, f"{CASE_REF} | {POLICE_REF}")
    c.setFont("Helvetica-Bold", 12)
    c.drawString(14 * mm, h - 15.3 * mm, title)
    footer(c, w, compiled, local, total, classification)
    return h - 27 * mm


def witness_header(c, w, h, title, compiled, local, total, draft=False):
    scan_texture(c, w, h, 7000 + compiled)
    c.setStrokeColor(colors.HexColor("#31363A"))
    c.setLineWidth(0.8)
    c.rect(12 * mm, 16 * mm, w - 24 * mm, h - 28 * mm, fill=0, stroke=1)
    c.setFillColor(colors.HexColor("#202326"))
    c.setFont("Helvetica-Bold", 15)
    c.drawString(17 * mm, h - 19 * mm, "WITNESS STATEMENT")
    c.setFont("Helvetica", 7)
    c.drawRightString(w - 17 * mm, h - 15 * mm, "Criminal Justice Act 1967, s.9")
    c.drawRightString(w - 17 * mm, h - 20 * mm, "Criminal Procedure Rules, Part 16")
    c.setFont("Helvetica-Bold", 8)
    c.drawString(17 * mm, h - 27 * mm, title)
    if draft:
        c.setStrokeColor(colors.HexColor("#8E3F32"))
        c.rect(w - 55 * mm, h - 40 * mm, 38 * mm, 9 * mm, fill=0, stroke=1)
        c.setFillColor(colors.HexColor("#8E3F32"))
        c.drawCentredString(w - 36 * mm, h - 37 * mm, "UNSIGNED WORKING DRAFT")
    footer(c, w, compiled, local, total, "OFFICIAL - SCANNED CASE COPY")
    return h - 39 * mm


def page_size(doc_id, local):
    if doc_id == "DOC-MG6" and local > 1:
        return landscape(A4)
    if doc_id == "DOC-MG6C":
        return landscape(A4)
    if doc_id == "DOC-PHONE-ATTRIBUTION":
        return landscape(A4)
    return A4


def mg6_rows(local):
    label, items = MG6_GROUPS[local - 1]
    states = ["Served", "Served", "Part served", "Not served", "Served", "Review open", "Served"]
    notes = [
        "Source and service receipt cross-referenced.",
        "Defence-copy pagination recorded.",
        "Exception identified in the source register.",
        "Outstanding action retained; no attachment inferred.",
        "Native or signed source identified.",
        "Continuing disclosure review required.",
        "Hash or issue date recorded.",
    ]
    rows = [["Ref", "Material", "Service state", "Schedule note"]]
    for i, item in enumerate(items):
        state = states[(local + i) % len(states)]
        if item == "Premises master CCTV export":
            state = "Not served"
        if item == "Malik transcript page 6":
            state = "Not in transcript"
        if local == 11 and i == 1:
            state = "Alias request"
        rows.append([f"MG6/{local:02d}/{i+1:02d}", item, state, notes[i]])
    return label, rows


def mg6c_rows(local):
    label, items = MG6C_GROUPS[local - 1]
    rows = [["Item", "Detailed description", "Location / holder", "Scope", "Disclosure officer entry"]]
    scopes = ["Joint", "Malik only", "Price only", "Administrative"]
    states = ["Retained", "Inspected", "Review recorded", "Cross-reference required"]
    for i, item in enumerate(items):
        scope = scopes[(local + i) % 4]
        if local == 8:
            scope = "Malik only"
        if local in {9, 12}:
            scope = "Price only"
        if local == 13:
            scope = "Malik-associated device"
        note = f"{states[(local * 2 + i) % 4]}; item-specific CPIA review entry {local:02d}.{i+1:02d}."
        if local == 12 and i == 4:
            note = "Continuity gap query between 4 and 6 June; no inference as to use or causation."
        if local == 14 and i == 0:
            note = "Association research only; not proof of message authorship."
        if local == 18 and i == 3:
            scope = "Malik only"
            note = "Working label concerns Price's sealed knife bag; scope label requires correction before reliance."
        rows.append([f"C/{(local-1)*8+i+1:03d}", item, ["OIC file", "Digital unit", "Custody system", "Property store"][i % 4], scope, note])
    return label, rows


def media_frame(c, x, y, width, height, local):
    c.setFillColor(colors.HexColor("#1E2428"))
    c.rect(x, y, width, height, fill=1, stroke=0)
    c.setStrokeColor(colors.HexColor("#465159"))
    for i in range(1, 6):
        c.line(x, y + i * height / 6, x + width, y + i * height / 6)
    shift = (local - 2) * width * 0.055
    c.setFillColor(colors.HexColor("#7A8288"))
    c.rect(x + width * 0.08, y + height * 0.16, width * 0.24, height * 0.55, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#111416"))
    c.roundRect(x + width * 0.54 + shift, y + height * 0.18, width * 0.075, height * 0.50, 3 * mm, fill=1, stroke=0)
    c.roundRect(x + width * 0.68 + shift * .6, y + height * 0.17, width * 0.075, height * 0.47, 3 * mm, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Courier", 6.3)
    times = ["21:46:18", "21:47:03", "21:47:29", "21:48:11"]
    c.drawString(x + 3 * mm, y + height - 6 * mm, f"CAM2 03/06/2026 {times[local-2]}")


def professional_record_detail(c, doc_id, local, total, top, x, width):
    """Draw an authentic record-control or continuation section for thin pages."""
    purpose = PURPOSES[doc_id][local - 1]
    profiles = {
        "DOC-INDEX": ("Index verification and filing history", "Court bundle index / electronically compiled", "Pagination clerk and reviewing caseworker", "Index entry checked against source title, version and compiled range", "An index entry records navigation and stated service only; it is not proof of source content"),
        "DOC-MG5-V1": ("Case-summary continuation and source checks", "MG5 case-summary form / version 1", "Officer in the case; prosecutor review pending at this version", "Narrative checked against statements, interviews, exhibits and schedules available on 9 June", "The prosecution summary is an allegation record and cannot supersede a signed statement, recording or court order"),
        "DOC-MG5-REVISED": ("Revised-summary continuation and change control", "MG5 case-summary form / revised version", "Officer in the case and reviewing prosecutor", "Revision checked against the amended indictment, later disclosure and current listing notice", "A revision corrects the summary state but does not erase the earlier version or decide evidential conflicts"),
        "DOC-MG6": ("Item-level service and review audit", "Disclosure schedule / case-management export", "Disclosure officer with prosecutor endorsement where recorded", "Each listed item reconciled to repository title, service event and outstanding action", "Service, review and disclosure-decision states remain separate from admissibility and truth"),
        "DOC-MG6C": ("Unused-material review and decision trail", "MG6C continuation schedule / non-sensitive unused material", "Disclosure officer; prosecutor decision shown only where made", "Description, location, sensitivity state and defendant scope reviewed item by item", "A schedule description is not an admission, finding or substitute for inspection of the material"),
        "DOC-MG11-DRAFT-C1": ("Draft-account provenance and adoption record", "Contemporaneous working account / unsigned draft", "Witness-contact officer; maker has not adopted this version", "Original wording, clothing description and uncertainty retained without silent correction", "This page cannot be presented as a signed witness statement or used to erase the later account"),
        "DOC-MG11-SIGNED-C1": ("Statement continuation, exhibits and source record", "MG11-style signed witness statement / served scan", "Daniel Okeke; signature and statement of truth on final page", "Page sequence checked against the signed original; earlier draft remains a separate record", "Personal perception, later clinical information and police-supplied material must remain distinct"),
        "DOC-MG11-W1": ("Statement continuation, sight-line and exhibit record", "MG11-style signed witness statement / served scan", "Priya Shah; signature and statement of truth on final page", "Café position, obstructions and non-identification status retained across the page sequence", "A clothing impression or direction of travel is not a facial identification or observation of a weapon"),
        "DOC-MG11-W2": ("Statement continuation, aftermath and exhibit record", "MG11-style signed witness statement / served scan", "Callum Briggs; signature and statement of truth on final page", "Arrival time, first-aid activity and police handover kept separate from the unseen confrontation", "A distressed report of missing property is not direct observation of a taking or identification of an offender"),
        "DOC-POLICE-STATEMENTS": ("Officer record, exhibit and continuity checks", "Officer statement / exhibit sheet / property-system extract", "Named officer or evidence-management system shown in the page header", "Event time, actor, exhibit label, seal state and source-system entry cross-checked", "Continuity records do not determine identity, use, wound causation or legal intent"),
        "DOC-INTERVIEW-MALIK": ("Audio alignment and transcript-production log", "PACE interview audio / served transcript working copy", "Interviewing officer, interviewee and solicitor identified in the header", "Speaker turns aligned to the complete audio; transcript numbering retained, including the absent page", "The audio is primary; custody movements and transcript aids cannot silently replace its timing or words"),
        "DOC-INTERVIEW-PRICE": ("Audio alignment and transcript-production log", "PACE interview audio / served transcript working copy", "Interviewing officer, interviewee and solicitor identified in the header", "Speaker turns and exhibit references checked against the complete recording", "A possession answer belongs to Price and does not establish use, wound causation or Malik's knowledge"),
        "DOC-CUSTODY-PACE": ("Custody audit, authorisation and rights fields", "Native custody system / authorised audit print", "Custody officer and timed operator identifiers", "Booking, reviews, legal advice, movements, charge and release/remand entries retained in native order", "Custody entries do not replace interview audio, clinical records, exhibit logs or court orders"),
        "DOC-CCTV-BWV-CAD": ("Media metadata, timebase and completeness record", "Derivative CCTV / BWV repository / CAD or 999 system", "Digital media officer or originating control-room system", "Filename, native clock, derivative state, source link and viewing limitation recorded", "A derivative image, approximate clock offset or clip description cannot establish an obscured act or identity"),
        "DOC-MEDICAL-FORENSIC": ("Clinical provenance, authorship and opinion boundary", "Hospital EPR extract / imaging record / signed clinical or expert report", "Treating clinician or instructed forensic clinician identified for the relevant entry", "Authorship, entry time, record type, material reviewed and report version retained", "Clinical fact, patient history and qualified opinion remain separate from identity, attribution and intent"),
        "DOC-PHONE-ATTRIBUTION": ("Extraction provenance and attribution-state checks", "Native extraction container / analyst report and schedules", "Digital forensic analyst with peer-review record", "Seizure, acquisition, device identifier, account field, message source and timebase retained separately", "Device possession, subscriber registration, account association and human authorship are distinct propositions"),
        "DOC-DISCLOSURE-CORRESPONDENCE": ("Transport, attachment and service audit", "Secure-email export / served correspondence copy", "Named sender and recipient mailboxes", "Header fields, body, attachment panel and service action checked against the exported message", "A reference to an attachment does not prove that the attachment was present or served"),
        "DOC-HEARING-NOTICE-PTPH": ("Issue, service and case-management record", "HMCTS-style court notice / issued electronic record", "Northgate Crown Court listing and case-management office", "Case number, parties, hearing details, directions, responsibility and due dates checked", "The latest issued notice governs the listing state; it does not determine evidence or merits"),
    }
    if doc_id not in profiles or top < 62 * mm:
        return top
    title, native, owner, check, boundary = profiles[doc_id]
    top -= 6 * mm
    top = section(c, title, x, top, width, "#E8ECEF", "#344A58")
    rows = [
        ["Record field", "Page-specific entry", "Provenance / state"],
        ["Native source", native, f"{DOCS_BY_ID[doc_id][1]} - source page {local} of {total}"],
        ["Responsible record owner", owner, "The maker or originating system is identified; the entry remains subject to proof"],
        ["Content scope", purpose, "Recorded as the scope of this page and subject to any admissibility ruling"],
        ["Quality / reconciliation", check, f"Continuation check: compiled page {DOCS_BY_ID[doc_id][3] + local - 1}"],
        ["Evidential boundary", boundary, "Contrary sources remain on the file for review by the parties and, where applicable, the court"],
        ["Version and audience", f"Served-copy presentation for {DOCS_BY_ID[doc_id][1]}; version sequence, signatures and redactions retained", "OFFICIAL case use; no privileged material is included in this served copy"],
    ]
    return draw_table(c, rows, x, top, [34 * mm, width * .46, width - 34 * mm - width * .46], 6.75, "#DCE3E7", "#788993", ["#FFFFFF", "#F4F6F7"], 3.0)


def render_page(c, doc, local, truth):
    doc_id, title, filename, start, end, org = doc
    compiled = start + local - 1
    total = end - start + 1
    w, h = page_size(doc_id, local)
    x = 15 * mm
    width = w - 30 * mm

    if doc_id == "DOC-COVER":
        c.setFillColor(colors.HexColor("#F6F2E8"))
        c.rect(0, 0, w, h, fill=1, stroke=0)
        c.setFillColor(colors.HexColor("#111820"))
        c.rect(0, h - 30 * mm, w, 30 * mm, fill=1, stroke=0)
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 10)
        c.drawCentredString(w / 2, h - 13 * mm, "NORTHGATE CROWN COURT")
        c.setFont("Helvetica", 8)
        c.drawCentredString(w / 2, h - 20 * mm, "DIGITAL CASE SYSTEM - PROSECUTION CASE PAPERS")
        c.setFillColor(colors.HexColor("#111820"))
        c.setFont("Helvetica-Bold", 18)
        c.drawCentredString(w / 2, h - 70 * mm, "R")
        c.drawCentredString(w / 2, h - 83 * mm, "- v -")
        c.drawCentredString(w / 2, h - 99 * mm, "MALIK HASSAN")
        c.drawCentredString(w / 2, h - 112 * mm, "JORDAN PRICE")
        c.setStrokeColor(colors.HexColor("#B3A678"))
        c.setLineWidth(1)
        c.line(45 * mm, h - 127 * mm, w - 45 * mm, h - 127 * mm)
        c.setFont("Helvetica-Bold", 11)
        c.drawCentredString(w / 2, h - 145 * mm, "PLEA AND TRIAL PREPARATION HEARING")
        c.setFont("Helvetica", 10)
        c.drawCentredString(w / 2, h - 156 * mm, "14 September 2026 | 10:00 | Court 3")
        c.drawCentredString(w / 2, h - 166 * mm, f"Case {CASE_REF}")
        c.setFillColor(colors.HexColor("#E7E0CA"))
        c.roundRect(40 * mm, h - 205 * mm, w - 80 * mm, 24 * mm, 2 * mm, fill=1, stroke=0)
        c.setFillColor(colors.HexColor("#31363A"))
        c.setFont("Helvetica-Bold", 9)
        c.drawCentredString(w / 2, h - 191 * mm, "COMPILED PAGINATION 1-150")
        c.setFont("Helvetica", 7.5)
        c.drawCentredString(w / 2, h - 199 * mm, "Personal data restricted to authorised criminal proceedings users")
        footer(c, w, compiled, local, total)
        return

    if doc_id == "DOC-INDEX":
        top = top_header(c, w, h, "Bundle index and document control", "NORTHGATE CROWN COURT", "#29323A", compiled, local, total)
        top = draw_table(c, [
            ["Bundle version", "Prepared", "Pagination authority", "Hearing"],
            ["Generation-v2", "Northgate CPS Casework Unit", "Compiled PDF pages", "PTPH 14 Sep 2026, 10:00"],
        ], x, top, [38 * mm, 50 * mm, 45 * mm, width - 133 * mm], 7.2, "#E6E8EA")
        top -= 5 * mm
        top = section(c, f"Index part {local} of {total}", x, top, width, "#E6E8EA", "#20262B")
        entries = []
        for number, item in enumerate(DOCS, 1):
            _, dtitle, _, ds, de, _ = item
            entries.append([str(number), dtitle, f"{ds}-{de}", "Current" if number not in {5} else "Superseded"])
        chunk = entries[(local - 1) * 5: local * 5]
        if local == 1:
            chunk.append(["M1", "Master CCTV footage - served", "120-129", "Index entry"])
        if local == 3:
            chunk.append(["11A", "Priya Shah witness statement - second index label", "70-74", "Duplicate reference"])
        top = draw_table(c, [["Ref", "Document", "Compiled pages", "Index status"]] + chunk, x, top, [18 * mm, width - 83 * mm, 30 * mm, 35 * mm], 7.6, "#D9DEE2", row_bgs=["#FFFFFF", "#F5F6F7"])
        top -= 7 * mm
        note = [
            "The index is a navigation record. Service and completeness must be reconciled with the underlying schedule and source document.",
            "Disclosure schedules record service state; they do not prove the evidential content of a listed item.",
            "The repeated Priya Shah reference is retained as an index defect and is not a second independent statement.",
            "Interview and media exceptions are identified in the source records and must not be resolved from the index alone.",
            "Index checked for continuous compiled pagination. Substantive status remains governed by the source hierarchy.",
        ][local - 1]
        top = section(c, "Index control note", x, top, width, "#F0E8D0", "#604F19")
        top = para(c, note, x, top, width, 9, 13)
        professional_record_detail(c, doc_id, local, total, top, x, width)
        return

    if doc_id in {"DOC-MG5-V1", "DOC-MG5-REVISED"}:
        revised = doc_id == "DOC-MG5-REVISED"
        top = top_header(c, w, h, "MG5 - Offence report / case summary", "NORTHGATE CONSTABULARY - DIGITAL CASE FILE", "#124D78" if not revised else "#1E5B4F", compiled, local, total, "OFFICIAL - PROSECUTION CASE FILE")
        c.setFillColor(colors.HexColor("#D9EAF4" if not revised else "#DDEDE7"))
        c.rect(0, 13 * mm, 8 * mm, h - 33 * mm, fill=1, stroke=0)
        status = "VERSION 1 - 9 JUNE 2026" if not revised else "REVISED - 30 JUNE 2026"
        top = draw_table(c, [
            ["URN", "Case", "Officer in case", "Document status"],
            [POLICE_REF, "R v Hassan and Price", "PC Leah Morton 4172", status],
        ], x, top, [30 * mm, 52 * mm, 48 * mm, width - 130 * mm], 7.4, "#D9EAF4" if not revised else "#DDEDE7")
        top -= 5 * mm
        heading, blocks = V1.page_text_blocks(doc_id, local)
        top = section(c, heading, x, top, width, "#D9EAF4" if not revised else "#DDEDE7", "#124D78" if not revised else "#1E5B4F")
        top = para(c, blocks[0][1], x, top, width, 9.4, 13)
        top -= 5 * mm
        details = [
            ["Source status", "Prosecution summary; consult signed statements, recordings and exhibits.", "Incident", "3 June 2026, about 21:40"],
            ["Complainant", "Daniel Okeke", "Location", "Outside 14 Merton Parade, Northgate"],
            ["Malik position", "Denies robbery and wounding.", "Price position", "Denies robbery; separate knife-possession answers recorded."],
            ["Witness scope", "Okeke, Shah and Briggs observed from different positions.", "Officer scope", "First response, arrests and continuity only."],
            ["Served media", "Four derivative clips and selected stills.", "Missing source", "Premises master export not supplied."],
            ["Review state", "Schedules and source documents require reconciliation.", "Open actions", "Master CCTV, BWV segment, transcript exception."],
            ["Listing source", "Early administrative entry copied into this version.", "Later source", "Court notice at compiled pages 149-150."],
        ] if not revised else [
            ["Supersedes", "MG5 version 1 for current summary only.", "Preserves", "Earlier summary and source conflicts remain visible."],
            ["Joint allegation", "Taking of telephone and cash.", "Separate allegation", "Wounding recorded against Malik only."],
            ["Price-only material", "Recovered locking knife with continuity gap.", "Forbidden shortcut", "No inference of use or wound causation."],
            ["Displayed CCTV", "Approximately seven minutes fast.", "Visibility", "Critical contact remains obstructed."],
            ["Telephone title", "Extraction and attribution report.", "Alias", "Downloaded handset data report."],
            ["Operative sources", "Amended indictment and latest court notice.", "Summary limit", "MG5 does not replace source evidence."],
        ]
        row = details[local - 1]
        top = draw_table(c, [["Field", "Entry", "Field", "Entry"], row], x, top, [30 * mm, 55 * mm, 30 * mm, width - 115 * mm], 7.4, "#E7EEF3" if not revised else "#E4EFEA")
        top -= 6 * mm
        top = section(c, "File-quality and provenance note", x, top, width, "#EEF3F6", "#244B64")
        extra = (
            "This page identifies the source class and version date. Assertions are the prosecution case as summarised at that date. "
            "A listed item, schedule entry or summary phrase is not treated as proof of the underlying fact."
        )
        top = para(c, extra, x, top, width, 8.8, 12.5)
        professional_record_detail(c, doc_id, local, total, top, x, width)
        return

    if doc_id in {"DOC-INDICTMENT-ORIGINAL", "DOC-INDICTMENT-AMENDED"}:
        original = doc_id.endswith("ORIGINAL")
        c.setFillColor(colors.white)
        c.rect(0, 0, w, h, fill=1, stroke=0)
        c.setFillColor(colors.HexColor("#202326"))
        c.setFont("Helvetica-Bold", 11)
        c.drawCentredString(w / 2, h - 19 * mm, "IN THE CROWN COURT AT NORTHGATE")
        c.setFont("Helvetica", 8)
        c.drawCentredString(w / 2, h - 27 * mm, f"Case No. {CASE_REF}")
        c.setStrokeColor(colors.HexColor("#202326"))
        c.line(30 * mm, h - 33 * mm, w - 30 * mm, h - 33 * mm)
        c.setFont("Helvetica-Bold", 16)
        c.drawCentredString(w / 2, h - 48 * mm, "INDICTMENT")
        c.setFont("Helvetica-Bold", 9)
        c.drawCentredString(w / 2, h - 57 * mm, "FIRST INDICTMENT - SUPERSEDED" if original else "PROPOSED AMENDED INDICTMENT")
        top = h - 70 * mm
        charge = truth["specimenCharges"]["counts"][local - 1]
        wording = charge["specimenWording"]
        if original:
            wording = wording.replace("on 3 June 2026", "on 1 June 2026")
        statement, particulars = wording.split(" PARTICULARS OF OFFENCE ")
        top = section(c, f"COUNT {local}", x, top, width, "#ECECEC", "#202326")
        top = para(c, statement, x, top, width, 10.5, 15, True)
        top -= 8 * mm
        top = para(c, "PARTICULARS OF OFFENCE", x, top, width, 9.2, 13, True)
        top = para(c, particulars, x, top - 2 * mm, width, 10.5, 15)
        top -= 12 * mm
        top = draw_table(c, [
            ["Document date", "Status", "Defendant allocation"],
            ["12 June 2026" if original else "2 July 2026", "NON-OPERATIVE - SUPERSEDED" if original else "OPERATIVE SOURCE IN THIS BUNDLE", ", ".join(charge["defendants"])],
        ], x, top, [38 * mm, 62 * mm, width - 100 * mm], 7.8, "#ECECEC")
        top -= 8 * mm
        if original:
            c.saveState()
            c.translate(w - 57 * mm, top - 14 * mm)
            c.rotate(-8)
            c.setStrokeColor(colors.HexColor("#A3463B"))
            c.setLineWidth(1)
            c.rect(-25 * mm, -5 * mm, 50 * mm, 10 * mm, fill=0, stroke=1)
            c.setFillColor(colors.HexColor("#A3463B"))
            c.setFont("Helvetica-Bold", 8)
            c.drawCentredString(0, -2 * mm, "SUPERSEDED - DATE AMENDED")
            c.restoreState()
        else:
            top = para(c, "Amendment note: incident date shown as 3 June 2026. Earlier indictment retained at compiled pages 20-22.", x, top, width, 8.6, 12)
        footer(c, w, compiled, local, total, "OFFICIAL - COURT RECORD COPY")
        return

    if doc_id == "DOC-MG6":
        if local == 1:
            top = top_header(c, w, h, "MG6 - Disclosure and service record", "NORTHGATE CONSTABULARY / CPS", "#405B70", compiled, local, total, "OFFICIAL - CASE INFORMATION")
        else:
            top = top_header(c, w, h, "MG6 continuation - disclosure and service", "NORTHGATE CONSTABULARY / CPS", "#405B70", compiled, local, total, "OFFICIAL - CASE INFORMATION")
        label, rows = mg6_rows(local)
        top = section(c, label, x, top, width, "#DDE5EA", "#2D475A")
        top = draw_table(c, rows, x, top, [27 * mm, 67 * mm, 40 * mm, width - 134 * mm], 7.0, "#DDE5EA", row_bgs=["#FFFFFF", "#F2F5F7"])
        top -= 6 * mm
        top = section(c, "Schedule status and action", x, top, width, "#F2E9D5", "#6A5320")
        status_text = [
            "Service entries identify what the schedule says was supplied. The premises master export remains absent despite the separate index entry.",
            "Draft and signed accounts are separate records. Service of the signed statement does not erase the earlier draft.",
            "The complete Malik audio is served. One transcript page is absent; the interview itself is not missing.",
            "Custody records and interview records retain their own recorded times. The discrepancy is not normalised in this schedule.",
            "The two NJ/1 labels are separately listed. Neither label resolves the missing continuity transfer.",
            "Displayed CCTV time and CAD time remain on their native records; the comparison note flags the approximate offset.",
            "Medical service supports access to clinical and opinion sources, not identity or intent.",
            "Telephone ownership, account association and message authorship remain distinct in the served report.",
            "The amended indictment and latest PTPH notice are the current procedural sources; superseded records remain indexed.",
            "An email can evidence that an attachment was mentioned without establishing that the attachment was actually present.",
            "The alias request maps to an existing served report and remains an action for title reconciliation, not a second missing report.",
            "Continuing review is item-specific. Disclosure officer and prosecutor decisions are recorded without converting material descriptions into facts.",
        ][local - 1]
        top = para(c, status_text, x, top, width, 8.8, 12.5)
        professional_record_detail(c, doc_id, local, total, top, x, width)
        if local == total:
            signature(c, x, 24 * mm, "A. Frost", "Disclosure Officer")
            signature(c, x + 80 * mm, 24 * mm, "R. Hale", "Reviewing Prosecutor")
        return

    if doc_id == "DOC-MG6C":
        top = top_header(c, w, h, "MG6C - Schedule of relevant non-sensitive unused material", "NORTHGATE CONSTABULARY - DISCLOSURE UNIT", "#4A5863", compiled, local, total, "OFFICIAL - DEFENCE SERVICE COPY")
        label, rows = mg6c_rows(local)
        top = draw_table(c, [
            ["URN", "Defendants", "Disclosure officer", "Schedule part"],
            [POLICE_REF, "Malik Hassan / Jordan Price", "DC Amelia Frost 2681", f"{local} of {total} - {label}"],
        ], x, top, [28 * mm, 63 * mm, 55 * mm, width - 146 * mm], 7.0, "#E0E4E7")
        top -= 4 * mm
        top = draw_table(c, rows, x, top, [22 * mm, 73 * mm, 40 * mm, 34 * mm, width - 169 * mm], 6.45, "#D7DEE3", row_bgs=["#FFFFFF", "#F2F4F5"], padding=2.6)
        top -= 4 * mm
        note = (
            "Each item is described sufficiently for item-specific review. Scope is a scheduling field, not an admission or finding. "
            "Any prosecutor endorsement must be read with the item description, location and continuing-disclosure record."
        )
        top = para(c, note, x, top, width, 7.5, 10.4, False, "#47545D")
        professional_record_detail(c, doc_id, local, total, top, x, width)
        if local == total:
            signature(c, w - 80 * mm, 22 * mm, "A. Frost", "Disclosure Officer")
        return

    if doc_id in {"DOC-MG11-DRAFT-C1", "DOC-MG11-SIGNED-C1", "DOC-MG11-W1", "DOC-MG11-W2"}:
        draft = doc_id == "DOC-MG11-DRAFT-C1"
        shead, blocks = V1.statement_sections(doc_id, local)
        top = witness_header(c, w, h, shead, compiled, local, total, draft)
        fields = [
            ["Surname / organisation", shead.split(" - ")[0], "Statement pages", f"{local} of {total}"],
            ["Statement reference", f"{POLICE_REF}/W{compiled}", "Date", "5 June 2026" if draft else "18 June 2026"],
            ["Occupation", "Retail manager" if "Daniel" in shead else ("Café supervisor" if "Priya" in shead else "Civil engineer"), "Over 18", "Yes"],
        ]
        top = draw_table(c, fields, x + 2 * mm, top, [44 * mm, 53 * mm, 35 * mm, width - 132 * mm], 7.1, "#D7D7D4", "#777777", ["#F8F8F5", "#ECECE8"])
        top -= 5 * mm
        for idx, (label, text) in enumerate(blocks, 1):
            c.setFillColor(colors.HexColor("#2B2E30"))
            c.setFont("Helvetica-Bold", 7.5)
            c.drawString(x + 2 * mm, top - 2 * mm, f"{idx}. {label}")
            statement_text = text.replace(
                "uncertainty is not resolved by the document compiler",
                "uncertainty is retained in the statement record",
            )
            top = para(c, statement_text, x + 9 * mm, top - 5 * mm, width - 11 * mm, 8.8, 12.2)
            top -= 4 * mm
        add_label_1, add_text_1, add_label_2, add_text_2 = WITNESS_ADDITIONS[doc_id][local - 1]
        for add_no, (add_label, add_text) in enumerate(
            [(add_label_1, add_text_1), (add_label_2, add_text_2)],
            start=len(blocks) + 1,
        ):
            c.setFillColor(colors.HexColor("#2B2E30"))
            c.setFont("Helvetica-Bold", 7.5)
            c.drawString(x + 2 * mm, top - 2 * mm, f"{add_no}. {add_label}")
            top = para(c, add_text, x + 9 * mm, top - 5 * mm, width - 11 * mm, 8.8, 12.2)
            top -= 4 * mm
        c.setStrokeColor(colors.HexColor("#9A9A96"))
        c.line(x + 7 * mm, 24 * mm, x + 7 * mm, h - 44 * mm)
        if local == total:
            top = para(c, "I believe that the facts stated in this witness statement are true.", x + 9 * mm, top, width - 11 * mm, 8.4, 11.5, not draft)
            if draft:
                c.setFillColor(colors.HexColor("#8E3F32"))
                c.setFont("Helvetica-Bold", 8)
                c.drawString(x + 9 * mm, top - 10 * mm, "Not signed or adopted by the witness")
            else:
                signature(c, x + 10 * mm, top - 13 * mm, shead.split(" - ")[0], scanned=True)
                redaction(c, x + 90 * mm, top - 15 * mm, 55 * mm)
        return

    if doc_id == "DOC-POLICE-STATEMENTS":
        top = top_header(c, w, h, "Officer statement / exhibit continuity", "NORTHGATE CONSTABULARY - INVESTIGATION FILE", "#173A57", compiled, local, total)
        heading, text = POLICE_CONTENT[local - 1]
        top = draw_table(c, [
            ["URN", "Maker / unit", "Document type", "Source page"],
            [POLICE_REF, ["PC Leah Morton", "PC Rowan King", "PC Naomi Jones", "Evidence Management Unit"][local % 4], heading, f"{local} of {total}"],
        ], x, top, [30 * mm, 45 * mm, 70 * mm, width - 145 * mm], 7.2, "#D7E3EC")
        top -= 5 * mm
        top = section(c, heading, x, top, width, "#D7E3EC", "#173A57")
        top = para(c, text, x, top, width, 9.2, 13)
        top -= 6 * mm
        if local in {5, 6, 7, 8, 9}:
            c.setFillColor(colors.HexColor("#E7E9E8"))
            c.roundRect(x + 8 * mm, top - 72 * mm, width * .47, 66 * mm, 2 * mm, fill=1, stroke=0)
            c.setFillColor(colors.HexColor("#39434A"))
            c.setFont("Helvetica-Bold", 7.2)
            c.drawString(x + 13 * mm, top - 15 * mm, "NORTHGATE POLICE - EXHIBIT IMAGE / BAG RECORD")
            c.setStrokeColor(colors.HexColor("#1E252A"))
            c.setLineWidth(2)
            c.line(x + 25 * mm, top - 49 * mm, x + 90 * mm, top - 30 * mm)
            redaction(c, x + 13 * mm, top - 62 * mm, 50 * mm, "private barcode masked in served copy")
            top -= 78 * mm
        rows = [["Date/time", "Actor / system", "Entry", "Continuity or evidential limit"]]
        for i in range(5):
            rows.append([
                f"{3 + min(local, 3)} Jun 2026 {20 + i:02d}:{(local * 9 + i * 7) % 60:02d}",
                ["Morton", "King", "Jones", "Property store", "Forensic provider"][i],
                f"{heading} - record {i+1}",
                ["Direct record", "Reported entry", "Label check", "Gap retained", "No causation opinion"][i],
            ])
        top = draw_table(c, rows, x, top, [34 * mm, 35 * mm, 52 * mm, width - 121 * mm], 6.9, "#D7E3EC", row_bgs=["#FFFFFF", "#F3F6F8"])
        professional_record_detail(c, doc_id, local, total, top, x, width)
        if local in {1, 3, 4, 10, 11, 12}:
            signature(c, x, 23 * mm, ["L. Morton", "R. King", "N. Jones"][local % 3], "Police witness")
        return

    if doc_id in {"DOC-INTERVIEW-MALIK", "DOC-INTERVIEW-PRICE"}:
        person = "Malik" if doc_id.endswith("MALIK") else "Price"
        top = top_header(c, w, h, f"PACE audio interview record - {person} {'Hassan' if person == 'Malik' else 'Price'}", "NORTHGATE CONSTABULARY - INTERVIEW SUITE", "#333A40", compiled, local, total, "OFFICIAL - INTERVIEW RECORD")
        if person == "Malik" and compiled == 97:
            c.setStrokeColor(colors.HexColor("#8A6A1C"))
            c.setFillColor(colors.HexColor("#F4E9C9"))
            c.roundRect(27 * mm, h / 2 - 40 * mm, w - 54 * mm, 80 * mm, 3 * mm, fill=1, stroke=1)
            c.setFillColor(colors.HexColor("#5E4713"))
            c.setFont("Helvetica-Bold", 14)
            c.drawCentredString(w / 2, h / 2 + 20 * mm, "TRANSCRIPT CONTINUATION PAGE NOT IN SERVED SET")
            c.setFont("Helvetica", 9.2)
            c.drawCentredString(w / 2, h / 2 + 5 * mm, "Complete audio recording: served")
            c.drawCentredString(w / 2, h / 2 - 6 * mm, "Transcript: source page 6 absent; sequence resumes at source page 7")
            c.setFont("Helvetica-Bold", 9.5)
            c.drawCentredString(w / 2, h / 2 - 23 * mm, "RECORDING SERVED / TRANSCRIPT INCOMPLETE")
            return
        times = "01:14-01:52" if person == "Malik" else "02:08-02:44"
        top = draw_table(c, [
            ["Interview reference", "Location", "Participants", "Recorded"],
            [f"{POLICE_REF}/INT/{person[0]}", "Room 2, Northgate Central", "DC Amir Khan; Elise Ward, solicitor; interviewee", f"4 June 2026 {times}"],
        ], x, top, [35 * mm, 43 * mm, 62 * mm, width - 140 * mm], 7.0, "#DDE5DF")
        top -= 5 * mm
        top = draw_table(c, V1.interview_rows(person, local), x, top, [23 * mm, 24 * mm, 75 * mm, width - 122 * mm], 7.1, "#CED8D2", "#64716A", ["#FFFFFF", "#F1F4F2"], 3.0)
        top -= 6 * mm
        top = section(c, "Recording and transcript control", x, top, width, "#E7E5DE", "#4B4941")
        control = (
            "Audio is the primary record. Transcript page numbering follows the served transcript and is an aid to listening. "
            "Custody-system movement entries remain separate records and are not silently substituted for these interview times."
        )
        top = para(c, control, x, top, width, 8.4, 11.8)
        professional_record_detail(c, doc_id, local, total, top, x, width)
        if local == total:
            signature(c, x, 23 * mm, "DC Amir Khan", "Interviewing officer")
        return

    if doc_id == "DOC-CUSTODY-PACE":
        top = top_header(c, w, h, "Custody record extract", "NORTHGATE CENTRAL CUSTODY", "#315D52", compiled, local, total, "OFFICIAL - CUSTODY RECORD COPY")
        detainee = "Malik Hassan" if local in {1, 3, 6, 8} else ("Jordan Price" if local in {2, 4, 7, 9} else "Both records / administrative")
        top = draw_table(c, [
            ["Custody number", "Detainee / record", "Custody officer", "Print status"],
            [f"NGC/2026/{4400+local}", detainee, "Sgt Helen Rowe", f"Audit print {local} of {total}"],
        ], x, top, [37 * mm, 54 * mm, 43 * mm, width - 134 * mm], 7.2, "#D9E9E4")
        top -= 5 * mm
        top = section(c, PURPOSES[doc_id][local - 1].split(".")[0], x, top, width, "#D9E9E4", "#315D52")
        top = draw_table(c, V1.custody_rows(local), x, top, [24 * mm, 68 * mm, 40 * mm, width - 132 * mm], 7.1, "#D9E9E4", "#648278", ["#FFFFFF", "#F0F6F3"])
        top -= 6 * mm
        fields = [
            ["Rights and entitlements", "Recorded at booking; legal advice requested", "Healthcare", "Screened; clinical detail recorded separately"],
            ["Property separation", "Personal property kept distinct from evidential exhibits", "Audit", "Timed operator identifiers retained"],
        ]
        top = draw_table(c, fields, x, top, [38 * mm, 52 * mm, 32 * mm, width - 122 * mm], 7.0, "#EDF3F1")
        top -= 6 * mm
        note = (
            "This is an audit extract of the custody system. Interview-room audio and transcript records retain their own times. "
            "For Malik, the movement entry and interview record do not align and both remain visible for review."
        ) if local == 6 else "Entries are presented as custody-system records with operator and source state; they do not replace separate exhibit, interview or court records."
        top = para(c, note, x, top, width, 8.5, 12)
        professional_record_detail(c, doc_id, local, total, top, x, width)
        if local in {1, 2, 8, 9, 10}:
            signature(c, x, 23 * mm, "Sgt Helen Rowe", "Custody officer")
        return

    if doc_id == "DOC-CCTV-BWV-CAD":
        top = top_header(c, w, h, "Digital media and incident records", "NORTHGATE CONSTABULARY - DIGITAL MEDIA UNIT", "#242A2F", compiled, local, total)
        heading = PURPOSES[doc_id][local - 1].split(".")[0]
        top = section(c, heading, x, top, width, "#D9DEE1", "#242A2F")
        intro = [
            "Four derivative CCTV clips are present. The premises master export is not in the served set. The device clock is recorded as approximately seven minutes fast.",
            "Clip C1 shows two figures approaching from the bus-shelter direction. Faces and hands are not resolved.",
            "Clip C2 covers the close-contact interval, but the delivery van and street sign obstruct the critical area.",
            "Clip C3 shows separation and movement. No blade or wound-causing act is clearly visible.",
            "Clip C4 shows two figures leaving towards Bridge Street. Identity and property carried cannot be determined from the still alone.",
            "The CAD log records the call, dispatch and first attendance on the CAD timebase.",
            "The 999 caller reports an injured man and two people leaving, and says she did not see what caused the injury.",
            "LM/2 begins after first attendance. RK/4 relates to the later street search; one referenced segment is outside the served set.",
            "CCTV displayed times are retained. A comparison field records an approximate seven-minute offset against CAD without altering either native record.",
            "Completeness review confirms clips and stills, not the premises master. Critical contact remains obscured and the stabbing is not shown clearly.",
        ][local - 1]
        top = para(c, intro, x, top, width, 8.8, 12.4)
        top -= 4 * mm
        if local in {2, 3, 4, 5}:
            media_frame(c, x + 10 * mm, top - 78 * mm, width - 20 * mm, 72 * mm, local)
            top -= 84 * mm
        rows = V1.media_rows(local)
        top = draw_table(c, rows, x, top, [38 * mm, 43 * mm, 36 * mm, width - 117 * mm], 7.0, "#D9DEE1", "#69757D", ["#FFFFFF", "#F1F3F4"])
        professional_record_detail(c, doc_id, local, total, top, x, width)
        if local == 10:
            signature(c, x, 22 * mm, "T. Lewis", "Digital media officer")
        return

    if doc_id == "DOC-MEDICAL-FORENSIC":
        expert_page = local >= 6
        top = top_header(c, w, h, "Forensic medical report" if expert_page else "Clinical record extract", "NORTHGATE UNIVERSITY HOSPITAL" if not expert_page else "NORTHGATE FORENSIC CLINICAL SERVICE", "#007F87" if not expert_page else "#5B3F72", compiled, local, total, "CONFIDENTIAL MEDICAL - AUTHORISED CASE USE")
        heading, text = MEDICAL_CONTENT[local - 1]
        top = draw_table(c, [
            ["Patient", "Hospital number", "Document / author", "Version"],
            ["Daniel Okeke", "NGH-26-004981", heading, f"{'Clinical extract' if local < 5 else 'Report'} {local}/{total}"],
        ], x, top, [35 * mm, 38 * mm, 74 * mm, width - 147 * mm], 7.0, "#D7EEEE" if not expert_page else "#E8E0EE")
        top -= 5 * mm
        top = section(c, heading, x, top, width, "#D7EEEE" if not expert_page else "#E8E0EE", "#006870" if not expert_page else "#4D345F")
        top = para(c, text, x, top, width, 9.1, 13)
        top -= 5 * mm
        top = draw_table(c, V1.medical_rows(local), x, top, [35 * mm, 39 * mm, 54 * mm, width - 128 * mm], 6.9, "#D7EEEE" if not expert_page else "#E8E0EE", "#678D90" if not expert_page else "#806B8D", ["#FFFFFF", "#F2F8F8" if not expert_page else "#F7F3F8"])
        top -= 6 * mm
        if local in {1, 3, 5, 6, 7}:
            c.setStrokeColor(colors.HexColor("#6B777C"))
            cx, cy = x + 30 * mm, top - 30 * mm
            c.circle(cx, cy + 17 * mm, 5 * mm, fill=0, stroke=1)
            c.line(cx, cy + 12 * mm, cx, cy - 15 * mm)
            c.line(cx, cy + 4 * mm, cx - 12 * mm, cy - 3 * mm)
            c.line(cx, cy + 4 * mm, cx + 12 * mm, cy - 3 * mm)
            c.line(cx, cy - 15 * mm, cx - 9 * mm, cy - 32 * mm)
            c.line(cx, cy - 15 * mm, cx + 9 * mm, cy - 32 * mm)
            c.setFillColor(colors.HexColor("#A13A3A"))
            c.circle(cx + 8 * mm, cy + 1 * mm, 2.4 * mm, fill=1, stroke=0)
            para(c, "Body map: left upper abdomen mark; diagrammatic and not to scale.", x + 55 * mm, top - 12 * mm, width - 55 * mm, 7.5, 10.5)
            top -= 68 * mm
        professional_record_detail(c, doc_id, local, total, top, x, width)
        if local in {5, 6, 7, 8}:
            signature(c, w - 78 * mm, 23 * mm, "Dr Maya Venn" if local == 5 else "Dr Imani Cole", "Clinician")
        return

    if doc_id == "DOC-PHONE-ATTRIBUTION":
        top = top_header(c, w, h, "Mobile device extraction and attribution report", "NORTHGATE DIGITAL FORENSICS UNIT", "#173E49", compiled, local, total, "OFFICIAL - TECHNICAL REPORT")
        heading, text = PHONE_CONTENT[local - 1]
        top = draw_table(c, [
            ["Laboratory ref", "Exhibit", "Analyst", "Report section", "Status"],
            ["NDFU/26/1847", "MH/3 black handset", "E. Novak", heading, "Served technical report"],
        ], x, top, [38 * mm, 48 * mm, 35 * mm, 70 * mm, width - 191 * mm], 7.0, "#D4E3E6")
        top -= 5 * mm
        top = section(c, heading, x, top, width, "#D4E3E6", "#173E49")
        top = para(c, text, x, top, width, 8.8, 12.2)
        top -= 4 * mm
        rows = [["Record", "Source path / identifier", "Device or app time", "Account / subscriber", "Attribution state"]]
        states = ["Physical device", "Subscriber record", "Associated account", "Author unknown", "Area-level event"]
        for i in range(8):
            rows.append([
                f"{local:02d}-{i+1:02d}",
                f"/evidence/MH3/section-{local}/record-{i+1:02d}",
                f"2026-06-03 21:{20 + local + i:02d}:{(local * 7 + i * 5) % 60:02d}",
                ["Handset", "SIM ending 419", "northline_mh", "message row", "cell sector NG-14"][i % 5],
                states[i % 5],
            ])
        top = draw_table(c, rows, x, top, [24 * mm, 82 * mm, 50 * mm, 48 * mm, width - 204 * mm], 6.6, "#D4E3E6", "#5E7B82", ["#FFFFFF", "#F0F5F6"])
        top -= 5 * mm
        boundary = [
            "Seizure from clothing is not the same proposition as legal ownership or exclusive use.",
            "Integrity values authenticate the acquired data set, not the identity of a human author.",
            "Registration and device identifiers do not prove who used the device at a particular time.",
            "Association evidence is retained as association; shared access remains a live limitation.",
            "Displayed messages are selections from a device/account source and are not attributed to Malik as author.",
            "Location precision is area-level and time fields retain their native timezone/source.",
            "The alias maps to this served report; it does not create a second missing extraction.",
        ][local - 1]
        top = para(c, boundary, x, top, width, 8.2, 11.5, True, "#8A3030")
        professional_record_detail(c, doc_id, local, total, top, x, width)
        if local == total:
            signature(c, x, 19 * mm, "E. Novak", "Digital forensic analyst")
        return

    if doc_id == "DOC-DISCLOSURE-CORRESPONDENCE":
        c.setFillColor(colors.HexColor("#FAFAFA"))
        c.rect(0, 0, w, h, fill=1, stroke=0)
        top = top_header(c, w, h, "Secure case correspondence", "CPS NORTHGATE / WARD SOLICITORS", "#394A59", compiled, local, total, "OFFICIAL - LEGAL CORRESPONDENCE")
        records = [
            ("secure.caseworker@northgate-cps.invalid", "defence.team@ward-solicitors.invalid", "27 June 2026 16:42", "Further disclosure - CCTV", "Please find attached the premises CCTV master export and updated schedule. The served-copy attachment panel below contains no file."),
            ("defence.team@ward-solicitors.invalid", "secure.caseworker@northgate-cps.invalid", "29 June 2026 09:18", "Missing CCTV attachment", "The email of 27 June refers to a premises master export, but no attachment is present. Please confirm whether it has ever been supplied and provide the native export if available."),
            ("defence.team@ward-solicitors.invalid", "secure.caseworker@northgate-cps.invalid", "1 July 2026 11:06", "Downloaded handset data report", "Please provide the downloaded handset data report referred to in the updated case list and confirm its service date and document hash."),
            ("secure.caseworker@northgate-cps.invalid", "defence.team@ward-solicitors.invalid", "3 July 2026 14:37", "CCTV and handset-report reconciliation", "CCTV clips were served, but the premises master remains awaited. The downloaded handset data report is the telephone extraction and attribution report already served under that title; the service receipt is enclosed."),
        ]
        sender, recipient, sent, subject_text, body = records[local - 1]
        top = draw_table(c, [
            ["From", sender],
            ["To", recipient],
            ["Sent", sent],
            ["Subject", subject_text],
            ["Matter", f"R v Hassan and Price / {CASE_REF}"],
        ], x, top, [32 * mm, width - 32 * mm], 7.5, "#E2E6E9")
        top -= 9 * mm
        top = para(c, "Dear caseworker," if local in {2, 3} else "Dear defence team,", x, top, width, 9.3, 13)
        top = para(c, body, x, top - 6 * mm, width, 9.3, 14)
        top = para(c, "Regards,\n" + ("Ward Solicitors disclosure team" if local in {2, 3} else "Rina Hale, CPS caseworker"), x, top - 10 * mm, width, 9.0, 13)
        top -= 12 * mm
        top = section(c, "Attachment panel", x, top, width, "#ECEFF1", "#394A59")
        attachment = "No attachment present in this served email record." if local == 1 else (
            "No new attachment; request only." if local in {2, 3} else "Service receipt: telephone-extraction-and-attribution-report.pdf"
        )
        top = draw_table(c, [["Filename / state", "Size", "Integrity / action"], [attachment, "-" if local != 4 else "214 KB", "Missing" if local == 1 else ("Requested" if local in {2, 3} else "Receipt recorded")]], x, top, [width * .55, width * .15, width * .30], 7.3, "#ECEFF1")
        professional_record_detail(c, doc_id, local, total, top, x, width)
        footer(c, w, compiled, local, total, "OFFICIAL - LEGAL CORRESPONDENCE")
        return

    if doc_id == "DOC-HEARING-NOTICE-PTPH":
        c.setFillColor(colors.white)
        c.rect(0, 0, w, h, fill=1, stroke=0)
        c.setFillColor(colors.HexColor("#4A295F"))
        c.rect(0, h - 28 * mm, w, 28 * mm, fill=1, stroke=0)
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 12)
        c.drawString(15 * mm, h - 12 * mm, "HM Courts & Tribunals Service")
        c.setFont("Helvetica", 7)
        c.drawRightString(w - 15 * mm, h - 12 * mm, "NORTHGATE CROWN COURT")
        c.setFont("Helvetica-Bold", 9)
        c.drawString(15 * mm, h - 20 * mm, "CRIMINAL CASE MANAGEMENT NOTICE")
        top = h - 38 * mm
        if local == 1:
            top = para(c, "Notice of Plea and Trial Preparation Hearing", x, top, width, 15, 19, True, "#3B214D")
            top -= 7 * mm
            rows = [
                ["Case number", CASE_REF],
                ["Defendants", "Malik Hassan; Jordan Price"],
                ["Hearing", "Plea and Trial Preparation Hearing"],
                ["Date", "14 September 2026"],
                ["Time", "10:00"],
                ["Courtroom", "Court 3 - Northgate Crown Court"],
                ["Attendance", "Defendants and representatives as directed"],
                ["Issued", "3 July 2026 by Northgate Crown Court"],
            ]
            top = draw_table(c, [["Field", "Court record"]] + rows, x, top, [45 * mm, width - 45 * mm], 8.2, "#E7DFEC", "#806B8D", ["#FFFFFF", "#F7F3F8"])
            top -= 8 * mm
            top = para(c, "This notice is the current court listing source in the served papers.", x, top, width, 9.2, 13, True, "#4A295F")
        else:
            top = para(c, "Directions accompanying the PTPH notice", x, top, width, 15, 19, True, "#3B214D")
            top -= 7 * mm
            rows = [
                ["Confirm pleas and count positions", "Both defence teams", "At PTPH"],
                ["Identify witnesses required", "All parties", "7 September 2026"],
                ["Identify outstanding disclosure", "CPS and defence", "Before PTPH"],
                ["Confirm media playback needs", "CPS", "7 September 2026"],
                ["Identify expert issues", "Parties if relied upon", "As directed"],
                ["Earlier listing entry", "Case record", "28 August 2026 at 14:00 - superseded"],
            ]
            top = draw_table(c, [["Direction", "Responsible party", "Date / state"]] + rows, x, top, [width * .48, width * .28, width * .24], 8.0, "#E7DFEC", "#806B8D", ["#FFFFFF", "#F7F3F8"])
            top -= 8 * mm
            top = para(c, "The earlier MG5 listing remains in the bundle to explain the discrepancy. It is not the operative PTPH date or time.", x, top, width, 9.2, 13, True, "#4A295F")
        top = professional_record_detail(c, doc_id, local, total, top, x, width)
        if local == 2:
            signature(c, x, max(23 * mm, top - 16 * mm), "A. Mercer", "Court officer")
        footer(c, w, compiled, local, total, "OFFICIAL - COURT NOTICE")
        return

    raise RuntimeError(f"Unhandled document page: {doc_id}")


def generate_sources(truth):
    source_manifest = []
    page_records = []
    for doc in DOCS:
        doc_id, title, filename, start, end, org = doc
        path = SOURCES / filename
        c = canvas.Canvas(str(path), pagesize=page_size(doc_id, 1), pageCompression=1)
        c.setTitle(title)
        c.setAuthor("Fictional Northgate case papers - engineering corpus")
        c.setSubject(f"R v Hassan and Price - {CASE_REF}")
        for local in range(1, end - start + 2):
            c.setPageSize(page_size(doc_id, local))
            render_page(c, doc, local, truth)
            page_records.append({
                "compiledPage": start + local - 1,
                "docId": doc_id,
                "sourceFile": filename,
                "sourcePage": local,
                "documentTitle": title,
                "purpose": PURPOSES[doc_id][local - 1],
                "orientation": "landscape" if page_size(doc_id, local)[0] > page_size(doc_id, local)[1] else "portrait",
                "truthKeyIncluded": False,
            })
            c.showPage()
        c.save()
        pages = len(PdfReader(str(path)).pages)
        expected = end - start + 1
        if pages != expected:
            raise RuntimeError(f"{filename}: expected {expected} pages, got {pages}")
        source_manifest.append({
            "docId": doc_id,
            "title": title,
            "file": f"source-documents/{filename}",
            "compiledPages": [start, end],
            "pageCount": pages,
            "sha256": sha256(path),
        })
    if len(page_records) != 150 or [p["compiledPage"] for p in page_records] != list(range(1, 151)):
        raise RuntimeError("page-purpose register does not cover compiled pages 1-150 exactly once")
    return source_manifest, page_records


def compile_bundle(source_manifest):
    writer = PdfWriter()
    for item in source_manifest:
        reader = PdfReader(str(OUT / item["file"]))
        for page in reader.pages:
            writer.add_page(page)
    writer.add_metadata({
        "/Title": "R v Malik Hassan and Jordan Price - generation-v2",
        "/Author": "Fictional Northgate case papers",
        "/Subject": "AI-reviewed criminal-document engineering pilot; not legal approval",
        "/Keywords": "Crown Court; fictional; disclosure; witness; evidence",
    })
    compiled = OUT / "malik-price-generation-v2-compiled-150-page-bundle.pdf"
    with compiled.open("wb") as fh:
        writer.write(fh)
    if len(PdfReader(str(compiled)).pages) != 150:
        raise RuntimeError("compiled generation-v2 bundle is not 150 pages")
    blinded = INGESTION / "malik-price-generation-v2-blinded-ingestion.pdf"
    shutil.copyfile(compiled, blinded)
    return compiled, blinded


def write_public_mapping():
    doc_map = {
        "DOC-COVER": [1, 2],
        "DOC-INDEX": [1, 2, 3, 10],
        "DOC-MG5-V1": [0, 10],
        "DOC-MG5-REVISED": [0, 10],
        "DOC-INDICTMENT-ORIGINAL": [1, 2],
        "DOC-INDICTMENT-AMENDED": [1, 2],
        "DOC-MG6": [0, 4, 10],
        "DOC-MG6C": [0, 4, 5],
        "DOC-MG11-DRAFT-C1": [1],
        "DOC-MG11-SIGNED-C1": [1],
        "DOC-MG11-W1": [1],
        "DOC-MG11-W2": [1],
        "DOC-POLICE-STATEMENTS": [0, 8],
        "DOC-INTERVIEW-MALIK": [3],
        "DOC-INTERVIEW-PRICE": [3],
        "DOC-CUSTODY-PACE": [3],
        "DOC-CCTV-BWV-CAD": [8],
        "DOC-MEDICAL-FORENSIC": [6, 7, 9],
        "DOC-PHONE-ATTRIBUTION": [7, 8],
        "DOC-DISCLOSURE-CORRESPONDENCE": [4, 10],
        "DOC-HEARING-NOTICE-PTPH": [1, 2],
    }
    rows = []
    for doc in DOCS:
        doc_id, title, filename, start, end, org = doc
        refs = [{"title": PUBLIC_REFS[i][0], "url": PUBLIC_REFS[i][1], "accessDate": ACCESS_DATE} for i in doc_map[doc_id]]
        rows.append({
            "docId": doc_id,
            "documentTitle": title,
            "sourceFile": f"source-documents/{filename}",
            "publicStructuralReferences": refs,
            "use": "Structural and field-purpose reference only; wording, facts, personal data and visual implementation are wholly fictional.",
            "copiedOfficialForm": False,
            "copiedRealCaseNarrative": False,
        })
    (OUT / "public-template-mapping.json").write_text(json.dumps({
        "accessDate": ACCESS_DATE,
        "mappingCount": len(rows),
        "documents": rows,
    }, indent=2), encoding="utf-8")
    md = ["# Generation-v2 public-template mapping", "", "Public sources were used only to understand professional structure and required fields. No official form or real-case narrative was copied.", ""]
    for row in rows:
        md.append(f"## {row['docId']} - {row['documentTitle']}")
        md.append("")
        for ref in row["publicStructuralReferences"]:
            md.append(f"- [{ref['title']}]({ref['url']}) - accessed {ref['accessDate']}")
        md.append("")
    (OUT / "public-template-mapping.md").write_text("\n".join(md), encoding="utf-8")


def leakage_scan(pdf):
    reader = PdfReader(str(pdf))
    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    blocked = [
        "TRAP-", "RF-", "COUNT_", "DOC-", "truth key", "truth-key", "expected answer",
        "forbidden conclusion", "hard fail", "fixture", "developer", "programme pass",
        "Brain 1", "Guardian", "Phase 11", "holdout", "gold key", "scoring material",
    ]
    hits = [term for term in blocked if term.lower() in text.lower()]
    return {
        "pdf": str(pdf.relative_to(OUT)).replace("\\", "/"),
        "pageCount": len(reader.pages),
        "extractedCharacters": len(text),
        "blockedMarkers": blocked,
        "hits": hits,
        "passed": not hits,
        "hiddenTextControl": "Generated page text is visible content. No annotations, embedded attachments, JavaScript, invisible layers or truth/scoring material were added.",
    }


def main():
    frozen_hashes = verify_freeze()
    truth = json.loads((BLUEPRINT / "truth-key.json").read_text(encoding="utf-8"))
    reset_v2()
    for doc_id, _, _, start, end, _ in DOCS:
        if len(PURPOSES[doc_id]) != end - start + 1:
            raise RuntimeError(f"{doc_id}: purpose count mismatch")
    source_manifest, page_records = generate_sources(truth)
    compiled, blinded = compile_bundle(source_manifest)
    write_public_mapping()
    scan = leakage_scan(blinded)
    if not scan["passed"]:
        raise RuntimeError(f"blinding leakage scan failed: {scan['hits']}")
    (OUT / "page-purpose-register.json").write_text(json.dumps({
        "pilotId": "malik-price-150-page",
        "generation": "generation-v2",
        "compiledPages": 150,
        "coverage": "exactly_once",
        "pages": page_records,
    }, indent=2), encoding="utf-8")
    purpose_md = ["# Generation-v2 page-purpose register", "", "Every compiled page has one substantive evidential, procedural or navigation purpose. Truth-key and scoring content are excluded.", ""]
    for page in page_records:
        purpose_md.append(f"- **{page['compiledPage']:03d}** | {page['docId']} | source {page['sourcePage']} | {page['purpose']}")
    (OUT / "page-purpose-register.md").write_text("\n".join(purpose_md), encoding="utf-8")
    (OUT / "source-document-to-compiled-page-register.json").write_text(json.dumps({
        "pilotId": "malik-price-150-page",
        "generation": "generation-v2",
        "authoritativePagination": "compiled_pdf_page_numbers",
        "sourceDocuments": source_manifest,
    }, indent=2), encoding="utf-8")
    hash_manifest = {
        "compiled": {
            "file": compiled.name,
            "sha256": sha256(compiled),
            "pages": 150,
        },
        "blindedIngestion": {
            "file": str(blinded.relative_to(OUT)).replace("\\", "/"),
            "sha256": sha256(blinded),
            "pages": 150,
        },
        "sources": source_manifest,
    }
    (OUT / "hash-manifest.json").write_text(json.dumps(hash_manifest, indent=2), encoding="utf-8")
    (OUT / "blinding-and-leakage-scan-report.json").write_text(json.dumps(scan, indent=2), encoding="utf-8")
    generation = {
        "pilotId": "malik-price-150-page",
        "generation": "generation-v2",
        "blueprintPinnedSha256": EXPECTED_FREEZE,
        "frozenBlueprintFileHashesBeforeGeneration": frozen_hashes,
        "generationV1PayloadTreeSha256": "4b51904abf96514b0d9f9be3c6bd042cbe9bd10190731f9c4e8fa99218a9b7d1",
        "sourceDocuments": 21,
        "compiledPages": 150,
        "compiledSha256": sha256(compiled),
        "truthChanged": False,
        "chargeWordingChanged": False,
        "defendantsChanged": False,
        "conflictsChanged": False,
        "expectedFindingsChanged": False,
        "truthKeyIncludedInIngestion": False,
        "applicationRunAttempted": False,
        "legalApprovalClaimed": False,
        "programmePassClaimed": False,
    }
    (OUT / "generation-manifest.json").write_text(json.dumps(generation, indent=2), encoding="utf-8")
    print(json.dumps({
        "output": str(OUT),
        "sources": len(source_manifest),
        "pages": len(page_records),
        "compiledSha256": sha256(compiled),
        "blindingPassed": scan["passed"],
    }, indent=2))


if __name__ == "__main__":
    main()
