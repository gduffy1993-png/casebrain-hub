/**
 * Trust Accounting - Client Money Management
 * 
 * SRA-compliant client money handling for UK solicitors
 */

import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase";

export type ClientMoneyTransaction = {
  id: string;
  orgId: string;
  caseId: string | null;
  trustAccountId: string;
  clientName: string;
  clientReference: string | null;
  amount: number;
  currency: string;
  transactionType:
    | "deposit"
    | "withdrawal"
    | "transfer_in"
    | "transfer_out"
    | "interest"
    | "fee_deduction"
    | "refund";
  transactionDate: Date;
  description: string | null;
  reference: string | null;
  receiptNumber: string | null;
  invoiceId: string | null;
  status: "pending" | "cleared" | "reconciled" | "disputed" | "voided";
  reconciledAt: Date | null;
  reconciledBy: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

export type TrustAccount = {
  id: string;
  orgId: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  sortCode: string | null;
  currency: string;
  openingBalance: number;
  currentBalance: number;
  isActive: boolean;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Create client money transaction
 */
export async function createClientMoneyTransaction(
  orgId: string,
  userId: string,
  input: {
    caseId?: string;
    trustAccountId: string;
    clientName: string;
    clientReference?: string;
    amount: number;
    currency?: string;
    transactionType: ClientMoneyTransaction["transactionType"];
    transactionDate?: Date;
    description?: string;
    reference?: string;
    receiptNumber?: string;
    invoiceId?: string;
  },
): Promise<ClientMoneyTransaction> {
  const supabase = getSupabaseAdminClient();

  // Validate trust account exists and is active
  const { data: trustAccount } = await supabase
    .from("trust_accounts")
    .select("*")
    .eq("id", input.trustAccountId)
    .eq("org_id", orgId)
    .eq("is_active", true)
    .single();

  if (!trustAccount) {
    throw new Error("Trust account not found or inactive");
  }

  // Validate balance for withdrawals
  if (
    ["withdrawal", "transfer_out", "fee_deduction", "refund"].includes(
      input.transactionType
    ) &&
    Number(trustAccount.current_balance) < input.amount
  ) {
    throw new Error("Insufficient trust account balance");
  }

  const { data, error } = await supabase
    .from("client_money")
    .insert({
      org_id: orgId,
      case_id: input.caseId ?? null,
      trust_account_id: input.trustAccountId,
      client_name: input.clientName,
      client_reference: input.clientReference ?? null,
      amount: input.amount,
      currency: input.currency ?? "GBP",
      transaction_type: input.transactionType,
      transaction_date: input.transactionDate
        ? input.transactionDate.toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      description: input.description ?? null,
      reference: input.reference ?? null,
      receipt_number: input.receiptNumber ?? null,
      invoice_id: input.invoiceId ?? null,
      status: "pending",
      created_by: userId,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error("Failed to create client money transaction");
  }

  return mapClientMoneyTransaction(data);
}

/**
 * Get client money transactions
 */
export async function getClientMoneyTransactions(
  orgId: string,
  filters?: {
    caseId?: string;
    trustAccountId?: string;
    clientName?: string;
    transactionType?: ClientMoneyTransaction["transactionType"];
    startDate?: Date;
    endDate?: Date;
    status?: ClientMoneyTransaction["status"];
  },
): Promise<ClientMoneyTransaction[]> {
  const supabase = getSupabaseAdminClient();

  let query = supabase
    .from("client_money")
    .select("*")
    .eq("org_id", orgId);

  if (filters?.caseId) {
    query = query.eq("case_id", filters.caseId);
  }

  if (filters?.trustAccountId) {
    query = query.eq("trust_account_id", filters.trustAccountId);
  }

  if (filters?.clientName) {
    query = query.ilike("client_name", `%${filters.clientName}%`);
  }

  if (filters?.transactionType) {
    query = query.eq("transaction_type", filters.transactionType);
  }

  if (filters?.startDate) {
    query = query.gte("transaction_date", filters.startDate.toISOString().split("T")[0]);
  }

  if (filters?.endDate) {
    query = query.lte("transaction_date", filters.endDate.toISOString().split("T")[0]);
  }

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  query = query.order("transaction_date", { ascending: false });

  const { data, error } = await query;

  if (error) {
    throw new Error("Failed to fetch client money transactions");
  }

  return (data ?? []).map(mapClientMoneyTransaction);
}

/**
 * Get trust accounts
 */
export async function getTrustAccounts(orgId: string): Promise<TrustAccount[]> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("trust_accounts")
    .select("*")
    .eq("org_id", orgId)
    .eq("is_active", true)
    .order("is_primary", { ascending: false });

  if (error) {
    throw new Error("Failed to fetch trust accounts");
  }

  return (data ?? []).map(mapTrustAccount);
}

/**
 * Map database row to ClientMoneyTransaction
 */
function mapClientMoneyTransaction(row: any): ClientMoneyTransaction {
  return {
    id: row.id,
    orgId: row.org_id,
    caseId: row.case_id,
    trustAccountId: row.trust_account_id,
    clientName: row.client_name,
    clientReference: row.client_reference,
    amount: Number(row.amount),
    currency: row.currency,
    transactionType: row.transaction_type,
    transactionDate: new Date(row.transaction_date),
    description: row.description,
    reference: row.reference,
    receiptNumber: row.receipt_number,
    invoiceId: row.invoice_id,
    status: row.status,
    reconciledAt: row.reconciled_at ? new Date(row.reconciled_at) : null,
    reconciledBy: row.reconciled_by,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Map database row to TrustAccount
 */
function mapTrustAccount(row: any): TrustAccount {
  return {
    id: row.id,
    orgId: row.org_id,
    accountName: row.account_name,
    accountNumber: row.account_number,
    bankName: row.bank_name,
    sortCode: row.sort_code,
    currency: row.currency,
    openingBalance: Number(row.opening_balance),
    currentBalance: Number(row.current_balance),
    isActive: row.is_active,
    isPrimary: row.is_primary,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

