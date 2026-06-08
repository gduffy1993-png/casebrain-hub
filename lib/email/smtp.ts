/**
 * SMTP Email Sending
 * 
 * Supports multiple email providers:
 * - SendGrid
 * - AWS SES
 * - Resend
 * - Generic SMTP
 */

import "server-only";

export type EmailProvider = "sendgrid" | "ses" | "resend" | "smtp";

export type EmailOptions = {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  from: string;
  fromName?: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
};

export type EmailResult = {
  success: boolean;
  messageId?: string;
  error?: string;
};

/**
 * Send email via configured provider
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  const provider = getEmailProvider();
  
  switch (provider) {
    case "sendgrid":
      return sendViaSendGrid(options);
    case "ses":
      return sendViaSES(options);
    case "resend":
      return sendViaResend(options);
    case "smtp":
      return sendViaSMTP(options);
    default:
      return {
        success: false,
        error: `Email provider "${provider}" not configured. Set EMAIL_PROVIDER and required credentials.`,
      };
  }
}

/**
 * Get configured email provider
 */
function getEmailProvider(): EmailProvider {
  const provider = process.env.EMAIL_PROVIDER?.toLowerCase();
  
  if (provider === "sendgrid" || provider === "ses" || provider === "resend" || provider === "smtp") {
    return provider;
  }
  
  // Default to SMTP if SMTP_HOST is set
  if (process.env.SMTP_HOST) {
    return "smtp";
  }
  
  // Default to sendgrid if SENDGRID_API_KEY is set
  if (process.env.SENDGRID_API_KEY) {
    return "sendgrid";
  }
  
  // Default to resend if RESEND_API_KEY is set
  if (process.env.RESEND_API_KEY) {
    return "resend";
  }
  
  return "smtp"; // Default fallback
}

/**
 * Send via SendGrid
 */
async function sendViaSendGrid(options: EmailOptions): Promise<EmailResult> {
  const apiKey = process.env.SENDGRID_API_KEY;
  
  if (!apiKey) {
    return {
      success: false,
      error: "SENDGRID_API_KEY not configured",
    };
  }
  
  try {
    const toEmails = Array.isArray(options.to) ? options.to : [options.to];
    const personalizations = [{
      to: toEmails.map(email => ({ email })),
      cc: options.cc ? (Array.isArray(options.cc) ? options.cc : [options.cc]).map(email => ({ email })) : undefined,
      bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc : [options.bcc]).map(email => ({ email })) : undefined,
    }];
    
    const payload: any = {
      personalizations,
      from: {
        email: options.from,
        name: options.fromName,
      },
      subject: options.subject,
      content: [],
    };
    
    if (options.text) {
      payload.content.push({
        type: "text/plain",
        value: options.text,
      });
    }
    
    if (options.html) {
      payload.content.push({
        type: "text/html",
        value: options.html,
      });
    }
    
    if (options.attachments && options.attachments.length > 0) {
      payload.attachments = options.attachments.map(att => ({
        filename: att.filename,
        content: typeof att.content === "string" ? att.content : att.content.toString("base64"),
        type: att.contentType,
        disposition: "attachment",
      }));
    }
    
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `SendGrid API error: ${response.status} ${errorText}`,
      };
    }
    
    const messageId = response.headers.get("x-message-id") || undefined;
    
    return {
      success: true,
      messageId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error sending email",
    };
  }
}

/**
 * Send via AWS SES
 */
async function sendViaSES(options: EmailOptions): Promise<EmailResult> {
  // AWS SES requires AWS SDK
  // For now, return error - can be implemented later
  return {
    success: false,
    error: "AWS SES integration not yet implemented. Use SendGrid or Resend instead.",
  };
}

/**
 * Send via Resend
 */
async function sendViaResend(options: EmailOptions): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  
  if (!apiKey) {
    return {
      success: false,
      error: "RESEND_API_KEY not configured",
    };
  }
  
  try {
    const toEmails = Array.isArray(options.to) ? options.to : [options.to];
    
    const payload: any = {
      from: options.fromName ? `${options.fromName} <${options.from}>` : options.from,
      to: toEmails,
      subject: options.subject,
    };
    
    if (options.cc) {
      payload.cc = Array.isArray(options.cc) ? options.cc : [options.cc];
    }
    
    if (options.bcc) {
      payload.bcc = Array.isArray(options.bcc) ? options.bcc : [options.bcc];
    }
    
    if (options.text) {
      payload.text = options.text;
    }
    
    if (options.html) {
      payload.html = options.html;
    }
    
    if (options.attachments && options.attachments.length > 0) {
      payload.attachments = options.attachments.map(att => ({
        filename: att.filename,
        content: typeof att.content === "string" ? att.content : Buffer.from(att.content).toString("base64"),
      }));
    }
    
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
      return {
        success: false,
        error: `Resend API error: ${response.status} ${JSON.stringify(errorData)}`,
      };
    }
    
    const data = await response.json();
    
    return {
      success: true,
      messageId: data.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error sending email",
    };
  }
}

/**
 * Send via generic SMTP
 */
async function sendViaSMTP(options: EmailOptions): Promise<EmailResult> {
  // SMTP requires nodemailer or similar
  // For now, return error - can be implemented later
  return {
    success: false,
    error: "Generic SMTP integration not yet implemented. Use SendGrid or Resend instead.",
  };
}

