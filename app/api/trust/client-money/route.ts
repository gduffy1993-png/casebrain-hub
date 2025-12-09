import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth";
import {
  createClientMoneyTransaction,
  getClientMoneyTransactions,
} from "@/lib/trust-accounting/client-money";

export async function GET(request: Request) {
  try {
    const { orgId } = await requireAuthContext();
    const { searchParams } = new URL(request.url);

    const caseId = searchParams.get("caseId") ?? undefined;
    const trustAccountId = searchParams.get("trustAccountId") ?? undefined;
    const clientName = searchParams.get("clientName") ?? undefined;
    const transactionType = searchParams.get("transactionType") as
      | "deposit"
      | "withdrawal"
      | "transfer_in"
      | "transfer_out"
      | "interest"
      | "fee_deduction"
      | "refund"
      | undefined;
    const startDate = searchParams.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : undefined;
    const endDate = searchParams.get("endDate")
      ? new Date(searchParams.get("endDate")!)
      : undefined;
    const status = searchParams.get("status") as
      | "pending"
      | "cleared"
      | "reconciled"
      | "disputed"
      | "voided"
      | undefined;

    const transactions = await getClientMoneyTransactions(orgId, {
      caseId,
      trustAccountId,
      clientName,
      transactionType,
      startDate,
      endDate,
      status,
    });

    return NextResponse.json(transactions);
  } catch (error) {
    console.error("[Trust] Error fetching client money transactions:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch transactions" },
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
      trustAccountId,
      clientName,
      clientReference,
      amount,
      currency,
      transactionType,
      transactionDate,
      description,
      reference,
      receiptNumber,
      invoiceId,
    } = body;

    if (!trustAccountId || !clientName || !amount || !transactionType) {
      return NextResponse.json(
        { error: "trustAccountId, clientName, amount, and transactionType are required" },
        { status: 400 }
      );
    }

    const transaction = await createClientMoneyTransaction(orgId, userId, {
      caseId,
      trustAccountId,
      clientName,
      clientReference,
      amount: Number(amount),
      currency,
      transactionType,
      transactionDate: transactionDate ? new Date(transactionDate) : undefined,
      description,
      reference,
      receiptNumber,
      invoiceId,
    });

    return NextResponse.json(transaction);
  } catch (error) {
    console.error("[Trust] Error creating client money transaction:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create transaction" },
      { status: 500 }
    );
  }
}

