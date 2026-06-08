/**
 * Invoicing System
 * 
 * Generate invoices from time entries and disbursements
 */

import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase";

export type Invoice = {
  id: string;
  orgId: string;
  caseId: string | null;
  clientId: string | null;
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  status: "draft" | "sent" | "paid" | "partially_paid" | "overdue" | "cancelled" | "written_off";
  sentAt: Date | null;
  paidAt: Date | null;
  paidAmount: number;
  paymentTermsDays: number;
  lateFeeRate: number;
  notes: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

export type InvoiceLineItem = {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  timeEntryId: string | null;
  disbursementId: string | null;
  itemType: "time" | "disbursement" | "fixed_fee" | "expense";
};

export type CreateInvoiceInput = {
  caseId?: string;
  clientId?: string;
  invoiceDate?: Date;
  dueDate?: Date;
  taxRate?: number;
  paymentTermsDays?: number;
  notes?: string;
  timeEntryIds?: string[];
  disbursementIds?: string[];
  lineItems?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    itemType: "time" | "disbursement" | "fixed_fee" | "expense";
  }>;
};

/**
 * Create invoice from time entries and disbursements
 */
export async function createInvoice(
  userId: string,
  orgId: string,
  input: CreateInvoiceInput,
): Promise<Invoice> {
  const supabase = getSupabaseAdminClient();

  // Calculate due date
  const invoiceDate = input.invoiceDate ?? new Date();
  const paymentTermsDays = input.paymentTermsDays ?? 30;
  const dueDate = input.dueDate ?? new Date(invoiceDate);
  dueDate.setDate(dueDate.getDate() + paymentTermsDays);

  // Create invoice
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .insert({
      org_id: orgId,
      case_id: input.caseId ?? null,
      client_id: input.clientId ?? null,
      invoice_date: invoiceDate.toISOString().split("T")[0],
      due_date: dueDate.toISOString().split("T")[0],
      tax_rate: input.taxRate ?? 0,
      payment_terms_days: paymentTermsDays,
      status: "draft",
      notes: input.notes ?? null,
      created_by: userId,
    })
    .select("*")
    .single();

  if (invoiceError || !invoice) {
    throw new Error("Failed to create invoice");
  }

  // Add line items from time entries
  if (input.timeEntryIds && input.timeEntryIds.length > 0) {
    const { data: timeEntries } = await supabase
      .from("time_entries")
      .select("*")
      .in("id", input.timeEntryIds)
      .eq("org_id", orgId)
      .eq("is_billed", false);

    if (timeEntries) {
      for (const entry of timeEntries) {
        if (entry.duration_minutes && entry.hourly_rate) {
          const quantity = entry.duration_minutes / 60;
          const unitPrice = Number(entry.hourly_rate);
          const totalPrice = quantity * unitPrice;

          await supabase.from("invoice_line_items").insert({
            invoice_id: invoice.id,
            description: entry.description,
            quantity,
            unit_price: unitPrice,
            total_price: totalPrice,
            time_entry_id: entry.id,
            item_type: "time",
          });

          // Mark time entry as billed
          await supabase
            .from("time_entries")
            .update({
              is_billed: true,
              invoice_id: invoice.id,
            })
            .eq("id", entry.id);
        }
      }
    }
  }

  // Add line items from disbursements
  if (input.disbursementIds && input.disbursementIds.length > 0) {
    const { data: disbursements } = await supabase
      .from("disbursements")
      .select("*")
      .in("id", input.disbursementIds)
      .eq("org_id", orgId)
      .eq("is_billed", false);

    if (disbursements) {
      for (const disb of disbursements) {
        const quantity = 1;
        const unitPrice = Number(disb.amount);
        const totalPrice = unitPrice;

        await supabase.from("invoice_line_items").insert({
          invoice_id: invoice.id,
          description: disb.description,
          quantity,
          unit_price: unitPrice,
          total_price: totalPrice,
          disbursement_id: disb.id,
          item_type: "disbursement",
        });

        // Mark disbursement as billed
        await supabase
          .from("disbursements")
          .update({
            is_billed: true,
            invoice_id: invoice.id,
          })
          .eq("id", disb.id);
      }
    }
  }

  // Add manual line items
  if (input.lineItems) {
    for (const item of input.lineItems) {
      await supabase.from("invoice_line_items").insert({
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.quantity * item.unitPrice,
        item_type: item.itemType,
      });
    }
  }

  // Fetch updated invoice with calculated totals
  const { data: updatedInvoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoice.id)
    .single();

  if (!updatedInvoice) {
    throw new Error("Failed to fetch updated invoice");
  }

  return mapInvoice(updatedInvoice);
}

/**
 * Get invoice with line items
 */
export async function getInvoice(
  invoiceId: string,
  orgId: string,
): Promise<{ invoice: Invoice; lineItems: InvoiceLineItem[] }> {
  const supabase = getSupabaseAdminClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .eq("org_id", orgId)
    .single();

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  const { data: lineItems } = await supabase
    .from("invoice_line_items")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("created_at", { ascending: true });

  return {
    invoice: mapInvoice(invoice),
    lineItems: (lineItems ?? []).map(mapInvoiceLineItem),
  };
}

/**
 * Get invoices for case/user/date range
 */
export async function getInvoices(
  orgId: string,
  filters: {
    caseId?: string;
    startDate?: Date;
    endDate?: Date;
    status?: Invoice["status"];
  },
): Promise<Invoice[]> {
  const supabase = getSupabaseAdminClient();

  let query = supabase
    .from("invoices")
    .select("*")
    .eq("org_id", orgId);

  if (filters.caseId) {
    query = query.eq("case_id", filters.caseId);
  }

  if (filters.startDate) {
    query = query.gte("invoice_date", filters.startDate.toISOString().split("T")[0]);
  }

  if (filters.endDate) {
    query = query.lte("invoice_date", filters.endDate.toISOString().split("T")[0]);
  }

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  query = query.order("invoice_date", { ascending: false });

  const { data, error } = await query;

  if (error) {
    throw new Error("Failed to fetch invoices");
  }

  return (data ?? []).map(mapInvoice);
}

/**
 * Mark invoice as sent
 */
export async function markInvoiceAsSent(
  invoiceId: string,
  orgId: string,
): Promise<Invoice> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("invoices")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
    })
    .eq("id", invoiceId)
    .eq("org_id", orgId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error("Failed to update invoice");
  }

  return mapInvoice(data);
}

/**
 * Map database row to Invoice
 */
function mapInvoice(row: any): Invoice {
  return {
    id: row.id,
    orgId: row.org_id,
    caseId: row.case_id,
    clientId: row.client_id,
    invoiceNumber: row.invoice_number,
    invoiceDate: new Date(row.invoice_date),
    dueDate: new Date(row.due_date),
    subtotal: Number(row.subtotal),
    taxRate: Number(row.tax_rate),
    taxAmount: Number(row.tax_amount),
    totalAmount: Number(row.total_amount),
    status: row.status,
    sentAt: row.sent_at ? new Date(row.sent_at) : null,
    paidAt: row.paid_at ? new Date(row.paid_at) : null,
    paidAmount: Number(row.paid_amount),
    paymentTermsDays: row.payment_terms_days,
    lateFeeRate: Number(row.late_fee_rate),
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Map database row to InvoiceLineItem
 */
function mapInvoiceLineItem(row: any): InvoiceLineItem {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    description: row.description,
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
    totalPrice: Number(row.total_price),
    timeEntryId: row.time_entry_id,
    disbursementId: row.disbursement_id,
    itemType: row.item_type,
  };
}

