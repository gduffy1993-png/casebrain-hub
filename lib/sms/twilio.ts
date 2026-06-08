/**
 * SMS/WhatsApp Integration via Twilio
 * 
 * Send SMS and WhatsApp messages to clients
 */

import "server-only";

export type SMSResult = {
  success: boolean;
  messageId?: string;
  providerMessageId?: string;
  error?: string;
};

/**
 * Send SMS message via Twilio
 */
export async function sendSMS(
  to: string,
  body: string,
  from?: string,
): Promise<SMSResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = from || process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken) {
    return {
      success: false,
      error: "TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be configured",
    };
  }

  if (!fromNumber) {
    return {
      success: false,
      error: "TWILIO_PHONE_NUMBER must be configured or provided",
    };
  }

  try {
    // Format phone number (remove spaces, ensure + prefix)
    const formattedTo = formatPhoneNumber(to);
    const formattedFrom = formatPhoneNumber(fromNumber);

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    const formData = new URLSearchParams();
    formData.append("To", formattedTo);
    formData.append("From", formattedFrom);
    formData.append("Body", body);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: `Twilio API error: ${response.status} ${JSON.stringify(errorData)}`,
      };
    }

    const data = await response.json();

    return {
      success: true,
      providerMessageId: data.sid,
      messageId: data.sid,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error sending SMS",
    };
  }
}

/**
 * Send WhatsApp message via Twilio
 */
export async function sendWhatsApp(
  to: string,
  body: string,
  from?: string,
): Promise<SMSResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const whatsappFrom = from || process.env.TWILIO_WHATSAPP_NUMBER || `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`;

  if (!accountSid || !authToken) {
    return {
      success: false,
      error: "TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be configured",
    };
  }

  if (!whatsappFrom) {
    return {
      success: false,
      error: "TWILIO_WHATSAPP_NUMBER or TWILIO_PHONE_NUMBER must be configured",
    };
  }

  try {
    // Format phone number for WhatsApp (ensure whatsapp: prefix)
    const formattedTo = formatPhoneNumber(to, true);
    const formattedFrom = whatsappFrom.startsWith("whatsapp:") 
      ? whatsappFrom 
      : `whatsapp:${formatPhoneNumber(whatsappFrom)}`;

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    const formData = new URLSearchParams();
    formData.append("To", formattedTo);
    formData.append("From", formattedFrom);
    formData.append("Body", body);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: `Twilio API error: ${response.status} ${JSON.stringify(errorData)}`,
      };
    }

    const data = await response.json();

    return {
      success: true,
      providerMessageId: data.sid,
      messageId: data.sid,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error sending WhatsApp message",
    };
  }
}

/**
 * Format phone number for Twilio
 */
function formatPhoneNumber(phone: string, whatsapp: boolean = false): string {
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, "");
  
  // If it doesn't start with +, assume it's a UK number and add +44
  if (!cleaned.startsWith("+")) {
    // Remove leading 0 if present
    if (cleaned.startsWith("0")) {
      cleaned = cleaned.substring(1);
    }
    cleaned = `+44${cleaned}`;
  }
  
  // Add whatsapp: prefix if needed
  if (whatsapp && !cleaned.startsWith("whatsapp:")) {
    cleaned = `whatsapp:${cleaned}`;
  }
  
  return cleaned;
}
