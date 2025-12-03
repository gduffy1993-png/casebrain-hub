import type { HousingLetterTemplate } from "./letters";

/**
 * Default housing disrepair letter templates
 * 
 * This file contains constants only - no "use server" directive.
 * Constants are imported by the server action file (letters.ts).
 */
export const DEFAULT_HOUSING_TEMPLATES: Omit<HousingLetterTemplate, "id">[] = [
  {
    code: "REPAIR_REQUEST",
    name: "Initial Repair Request",
    description: "Formal request for landlord to carry out repairs",
    body: `Dear {{landlord_name}},

Re: {{property_address}}

I am writing on behalf of my client, {{tenant_name}}, regarding disrepair at the above property.

The following issues require urgent attention:

{{defects_list}}

Under Section 11 of the Landlord and Tenant Act 1985, you have a duty to keep the property in good repair. I would be grateful if you could confirm:

1. When you will arrange for an inspection of the property;
2. When the necessary repairs will be carried out; and
3. The name and contact details of the contractor you propose to use.

I look forward to hearing from you within 14 days.

Yours faithfully,
{{firm_name}}`,
    variables: [
      "landlord_name",
      "property_address",
      "tenant_name",
      "defects_list",
      "firm_name",
    ],
  },
  {
    code: "S11_LTA",
    name: "Section 11 LTA 1985 Notice",
    description: "Formal notice under Section 11 of the Landlord and Tenant Act 1985",
    body: `Dear {{landlord_name}},

Re: {{property_address}} - Section 11 LTA 1985 Notice

I am writing to formally notify you of your obligations under Section 11 of the Landlord and Tenant Act 1985 in respect of the above property.

The following disrepair issues have been reported:

{{defects_list}}

Under Section 11, you are required to:
- Keep in repair the structure and exterior of the dwelling
- Keep in repair and proper working order installations for the supply of water, gas, electricity, sanitation, space heating and heating water

These obligations are ongoing and cannot be excluded or limited. Failure to comply may result in legal action being taken against you.

Please confirm within 14 days:
1. Your acceptance of these obligations
2. Your proposed timetable for carrying out the necessary repairs
3. Details of any access arrangements required

Yours faithfully,
{{firm_name}}`,
    variables: [
      "landlord_name",
      "property_address",
      "defects_list",
      "firm_name",
    ],
  },
  {
    code: "PRE_ACTION",
    name: "Letter Before Action",
    description: "Pre-action protocol letter before commencing proceedings",
    body: `Dear {{landlord_name}},

Re: {{property_address}} - Letter Before Action

I am instructed by {{tenant_name}} in relation to disrepair at the above property.

Despite previous correspondence dated {{first_complaint_date}}, the following issues remain outstanding:

{{defects_list}}

This constitutes a breach of your obligations under Section 11 of the Landlord and Tenant Act 1985 and/or the terms of the tenancy agreement.

My client has suffered loss and damage as a result, including:
- Inconvenience and distress
- Damage to personal belongings
- Additional heating costs
- Health issues ({{health_issues}})

Unless you confirm within 21 days that you will:
1. Carry out all necessary repairs within a reasonable timeframe; and
2. Compensate my client for the losses suffered

I have instructions to issue proceedings against you without further notice.

Yours faithfully,
{{firm_name}}`,
    variables: [
      "landlord_name",
      "property_address",
      "tenant_name",
      "first_complaint_date",
      "defects_list",
      "health_issues",
      "firm_name",
    ],
  },
  {
    code: "ESCALATION",
    name: "Escalation Chaser",
    description: "Follow-up letter when landlord has not responded",
    body: `Dear {{landlord_name}},

Re: {{property_address}} - Urgent: Outstanding Repairs

I refer to my previous correspondence dated {{previous_letter_date}} regarding disrepair at the above property.

To date, I have not received a response from you. The following issues remain outstanding:

{{defects_list}}

This matter is now urgent. The property is {{unfit_status}} and my client's health is being affected.

I require your response within 7 days confirming:
1. When you will inspect the property
2. When repairs will commence
3. Your proposed completion date

Failure to respond will result in immediate legal action being taken.

Yours faithfully,
{{firm_name}}`,
    variables: [
      "landlord_name",
      "property_address",
      "previous_letter_date",
      "defects_list",
      "unfit_status",
      "firm_name",
    ],
  },
];

