import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { getInvoice, markInvoiceAsSent } from "@/lib/billing/invoicing";

type RouteParams = {
  params: Promise<{ invoiceId: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { orgId } = await requireAuthContext();
    const { invoiceId } = await params;

    const result = await getInvoice(invoiceId, orgId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Billing] Error fetching invoice:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch invoice" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { orgId } = await requireAuthContext();
    const { invoiceId } = await params;
    const body = await request.json();

    if (body.action === "mark_sent") {
      const invoice = await markInvoiceAsSent(invoiceId, orgId);
      return NextResponse.json(invoice);
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[Billing] Error updating invoice:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update invoice" },
      { status: 500 }
    );
  }
}

