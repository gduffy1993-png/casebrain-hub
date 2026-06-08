import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import { createInvoice, getInvoices } from "@/lib/billing/invoicing";

export async function GET(request: Request) {
  try {
    const { orgId } = await requireAuthContext();
    const { searchParams } = new URL(request.url);

    const caseId = searchParams.get("caseId") ?? undefined;
    const startDate = searchParams.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : undefined;
    const endDate = searchParams.get("endDate")
      ? new Date(searchParams.get("endDate")!)
      : undefined;
    const status = searchParams.get("status") as
      | "draft"
      | "sent"
      | "paid"
      | "partially_paid"
      | "overdue"
      | "cancelled"
      | "written_off"
      | undefined;

    const invoices = await getInvoices(orgId, {
      caseId,
      startDate,
      endDate,
      status,
    });

    return NextResponse.json(invoices);
  } catch (error) {
    console.error("[Billing] Error fetching invoices:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId, orgId } = await requireAuthContext();
    const body = await request.json();

    const {
      caseId,
      clientId,
      invoiceDate,
      dueDate,
      taxRate,
      paymentTermsDays,
      notes,
      timeEntryIds,
      disbursementIds,
      lineItems,
    } = body;

    const invoice = await createInvoice(userId, orgId, {
      caseId,
      clientId,
      invoiceDate: invoiceDate ? new Date(invoiceDate) : undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      taxRate,
      paymentTermsDays,
      notes,
      timeEntryIds,
      disbursementIds,
      lineItems,
    });

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("[Billing] Error creating invoice:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create invoice" },
      { status: 500 }
    );
  }
}

