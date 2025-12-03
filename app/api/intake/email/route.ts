import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { handleEmailIntake } from "@/lib/email-intake";
import type { EmailIntakePayload } from "@/lib/types/casebrain";

// API key header for external integrations
const API_KEY_HEADER = "x-casebrain-api-key";

/**
 * Validate the request has proper authentication
 * Supports either:
 * 1. Clerk session auth (for internal use)
 * 2. API key auth (for external email gateways)
 */
async function validateAuth(request: NextRequest): Promise<{ orgId: string; userId: string } | null> {
  // First try Clerk auth
  const { orgId, userId } = await auth();
  
  if (orgId && userId) {
    return { orgId, userId };
  }

  // Fall back to API key auth
  // TODO: Implement proper API key validation from settings/database
  const apiKey = request.headers.get(API_KEY_HEADER);
  if (apiKey) {
    // For now, check against env var
    const validKey = process.env.CASEBRAIN_INTAKE_API_KEY;
    if (validKey && apiKey === validKey) {
      // Use a system org/user ID for API key auth
      const systemOrgId = process.env.CASEBRAIN_DEFAULT_ORG_ID;
      const systemUserId = process.env.CASEBRAIN_SYSTEM_USER_ID ?? "system";
      
      if (systemOrgId) {
        return { orgId: systemOrgId, userId: systemUserId };
      }
    }
  }

  return null;
}

/**
 * Validate the email intake payload structure
 */
function validatePayload(body: unknown): body is EmailIntakePayload {
  if (!body || typeof body !== "object") return false;
  
  const payload = body as Record<string, unknown>;
  
  // Required fields
  if (typeof payload.from !== "string" || !payload.from) return false;
  if (typeof payload.to !== "string" || !payload.to) return false;
  if (typeof payload.subject !== "string") return false;
  if (!Array.isArray(payload.attachments)) return false;
  
  // Validate each attachment
  for (const att of payload.attachments) {
    if (!att || typeof att !== "object") return false;
    if (typeof (att as Record<string, unknown>).filename !== "string") return false;
    if (typeof (att as Record<string, unknown>).contentType !== "string") return false;
    if (typeof (att as Record<string, unknown>).size !== "number") return false;
  }
  
  return true;
}

/**
 * POST /api/intake/email
 * 
 * Accepts email intake payloads from:
 * - Email gateway services (e.g. SendGrid, Mailgun inbound)
 * - Internal forwarding tools
 * - Other integrations
 * 
 * Creates or updates a case based on the email content.
 */
export async function POST(request: NextRequest) {
  try {
    // Validate authentication
    const authResult = await validateAuth(request);
    if (!authResult) {
      return NextResponse.json(
        { error: "Unauthorized. Provide valid session or API key." },
        { status: 401 },
      );
    }

    const { orgId, userId } = authResult;

    // Parse and validate payload
    const body = await request.json();
    
    if (!validatePayload(body)) {
      return NextResponse.json(
        { 
          error: "Invalid payload",
          expected: {
            from: "string (required)",
            to: "string (required)",
            subject: "string (required)",
            bodyText: "string (optional)",
            bodyHtml: "string (optional)",
            attachments: "array of { filename, contentType, size, urlOrStorageRef? }",
            intakeSource: "forward | outlook-addon | other (optional)",
            caseReference: "string (optional)",
          },
        },
        { status: 400 },
      );
    }

    // Process the email intake
    const result = await handleEmailIntake(body, orgId, userId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 500 },
      );
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Email intake error:", error);
    return NextResponse.json(
      { error: "Internal server error processing email intake" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/intake/email
 * 
 * Returns documentation about the email intake endpoint
 */
export async function GET() {
  return NextResponse.json({
    endpoint: "/api/intake/email",
    method: "POST",
    description: "Forward emails to CaseBrain to automatically create or update cases",
    authentication: {
      option1: "Clerk session (for internal use)",
      option2: `API key via ${API_KEY_HEADER} header (for email gateways)`,
    },
    payload: {
      from: "string - Sender email address (required)",
      to: "string - Recipient address (required)",
      cc: "string - CC addresses (optional)",
      subject: "string - Email subject (required)",
      bodyText: "string - Plain text body (optional)",
      bodyHtml: "string - HTML body (optional)",
      attachments: [{
        filename: "string - File name (required)",
        contentType: "string - MIME type (required)",
        size: "number - File size in bytes (required)",
        urlOrStorageRef: "string - URL or storage reference (optional)",
      }],
      intakeSource: "forward | outlook-addon | other (optional)",
      caseReference: "string - Explicit case reference to attach to (optional)",
    },
    behavior: {
      caseRouting: [
        "If caseReference provided, attaches to that case",
        "If subject/body contains [CASE:XXX] pattern, attaches to that case",
        "Otherwise, creates a new case with subject as title",
      ],
      attachments: "Stored as documents on the case",
      emailBody: "Stored as a case note",
    },
    response: {
      success: "boolean",
      createdCaseId: "string (if new case created)",
      updatedCaseId: "string (if attached to existing case)",
      documentsCreated: "string[] - IDs of documents created",
      notesCreated: "string[] - IDs of notes created",
      tasksCreated: "string[] - IDs of tasks created",
      message: "string - Description of what happened",
    },
  });
}

