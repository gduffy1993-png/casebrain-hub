import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth-supabase";
import { handleEmailIntake, normalizeOutlookPayload } from "@/lib/email-intake";
import type { OutlookIntakePayload } from "@/lib/types/casebrain";

// API key header for Outlook add-in authentication
const API_KEY_HEADER = "x-casebrain-api-key";
const OUTLOOK_ADDON_HEADER = "x-outlook-addon-version";

/**
 * Validate Outlook add-in authentication
 * 
 * Supports:
 * 1. Supabase session auth (if user is also logged into CaseBrain web)
 * 2. API key auth (for standalone Outlook add-in use)
 * 3. Future: JWT/OAuth token from Outlook identity
 */
async function validateOutlookAuth(request: NextRequest): Promise<{ orgId: string; userId: string } | null> {
  // First try Supabase auth (for users with active web session)
  try {
    const { orgId, userId } = await requireAuthContext();
    if (orgId && userId) {
      return { orgId, userId };
    }
  } catch {
    // Continue to API key fallback
  }

  // Fall back to API key auth
  const apiKey = request.headers.get(API_KEY_HEADER);
  if (apiKey) {
    const validKey = process.env.CASEBRAIN_INTAKE_API_KEY;
    if (validKey && apiKey === validKey) {
      const systemOrgId = process.env.CASEBRAIN_DEFAULT_ORG_ID;
      const systemUserId = process.env.CASEBRAIN_SYSTEM_USER_ID ?? "outlook-addon";
      
      if (systemOrgId) {
        return { orgId: systemOrgId, userId: systemUserId };
      }
    }
  }

  // TODO: Add support for Azure AD / Microsoft identity tokens
  // This would allow the Outlook add-in to authenticate using the user's
  // Microsoft account, which could then be mapped to a CaseBrain user.

  return null;
}

/**
 * Validate the Outlook intake payload structure
 */
function validateOutlookPayload(body: unknown): body is OutlookIntakePayload {
  if (!body || typeof body !== "object") return false;
  
  const payload = body as Record<string, unknown>;
  
  // Required fields
  if (typeof payload.messageId !== "string") return false;
  if (typeof payload.from !== "string" || !payload.from) return false;
  if (typeof payload.to !== "string" || !payload.to) return false;
  if (typeof payload.subject !== "string") return false;
  if (!Array.isArray(payload.attachments)) return false;
  
  // Validate attachments
  for (const att of payload.attachments) {
    if (!att || typeof att !== "object") return false;
    if (typeof (att as Record<string, unknown>).filename !== "string") return false;
    if (typeof (att as Record<string, unknown>).contentType !== "string") return false;
    if (typeof (att as Record<string, unknown>).size !== "number") return false;
  }
  
  return true;
}

/**
 * POST /api/intake/outlook
 * 
 * Receives emails from the Outlook "Send to CaseBrain" add-in.
 * Normalizes the Outlook-specific payload and routes through
 * the standard email intake handler.
 * 
 * The Outlook add-in should:
 * 1. Capture the current email's metadata
 * 2. Upload attachments to a temporary location (or include content)
 * 3. POST to this endpoint
 * 4. Display the result to the user
 */
export async function POST(request: NextRequest) {
  try {
    // Log Outlook add-in version for diagnostics
    const addonVersion = request.headers.get(OUTLOOK_ADDON_HEADER);
    if (addonVersion) {
      console.log(`Outlook add-in request from version: ${addonVersion}`);
    }

    // Validate authentication
    const authResult = await validateOutlookAuth(request);
    if (!authResult) {
      return NextResponse.json(
        { 
          error: "Unauthorized",
          message: "Please configure your CaseBrain API key in the Outlook add-in settings, or ensure you're logged into CaseBrain web.",
        },
        { status: 401 },
      );
    }

    const { orgId, userId } = authResult;

    // Parse and validate payload
    const body = await request.json();
    
    if (!validateOutlookPayload(body)) {
      return NextResponse.json(
        { 
          error: "Invalid Outlook payload",
          expected: {
            messageId: "string - Outlook message ID (required)",
            from: "string - Sender email (required)",
            to: "string - Recipient email (required)",
            subject: "string - Email subject (required)",
            bodyPreview: "string - Short preview (optional)",
            bodyText: "string - Full body text (optional)",
            attachments: "array of { id?, filename, contentType, size, url? }",
          },
        },
        { status: 400 },
      );
    }

    // Normalize Outlook payload to standard email intake format
    const normalizedPayload = normalizeOutlookPayload(body);

    // Process through standard email intake handler
    const result = await handleEmailIntake(normalizedPayload, orgId, userId);

    // Return result in a format the Outlook add-in can display
    return NextResponse.json({
      ...result,
      // Add Outlook-specific response fields
      outlookMessageId: body.messageId,
      displayMessage: result.success
        ? result.createdCaseId
          ? `✓ New case created in CaseBrain`
          : `✓ Added to existing case`
        : `✗ ${result.message}`,
    });
  } catch (error) {
    console.error("Outlook intake error:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        displayMessage: "✗ Failed to send to CaseBrain. Please try again.",
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/intake/outlook
 * 
 * Returns documentation and health check for the Outlook integration
 */
export async function GET() {
  return NextResponse.json({
    status: "ready",
    endpoint: "/api/intake/outlook",
    version: "1.0.0",
    description: "Outlook 'Send to CaseBrain' integration endpoint",
    
    integration: {
      addInManifest: "Contact CaseBrain support for the Outlook add-in manifest",
      authentication: {
        option1: "API key via x-casebrain-api-key header",
        option2: "Clerk session if logged into CaseBrain web",
        future: "Azure AD / Microsoft identity (planned)",
      },
    },
    
    payload: {
      messageId: "string - Outlook message ID (required)",
      from: "string - Sender email address (required)",
      to: "string - Recipient address (required)",
      cc: "string - CC addresses (optional)",
      subject: "string - Email subject (required)",
      bodyPreview: "string - Short preview text (optional)",
      bodyText: "string - Full plain text body (optional)",
      attachments: [{
        id: "string - Outlook attachment ID (optional)",
        filename: "string - File name (required)",
        contentType: "string - MIME type (required)",
        size: "number - File size in bytes (required)",
        url: "string - Download URL (optional, for large attachments)",
      }],
    },
    
    behavior: {
      caseRouting: [
        "Detects case references in subject (e.g. [CASE:ABC123])",
        "Attaches to matching case if found",
        "Creates new case if no match",
      ],
      attachments: "Stored as documents on the case",
      emailBody: "Stored as a case note with correspondence type",
      tasks: "Review task created for new cases or new documents",
    },
    
    response: {
      success: "boolean - Whether intake succeeded",
      createdCaseId: "string - ID of new case (if created)",
      updatedCaseId: "string - ID of existing case (if matched)",
      documentsCreated: "string[] - Document IDs created",
      notesCreated: "string[] - Note IDs created",
      outlookMessageId: "string - Echo of the message ID",
      displayMessage: "string - User-friendly message for Outlook UI",
    },
    
    headers: {
      "x-casebrain-api-key": "Your CaseBrain intake API key",
      "x-outlook-addon-version": "Outlook add-in version (for diagnostics)",
      "Content-Type": "application/json",
    },
  });
}

/**
 * OPTIONS - CORS preflight for Outlook add-in
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-casebrain-api-key, x-outlook-addon-version",
    },
  });
}

