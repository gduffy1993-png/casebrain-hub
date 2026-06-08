"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Plus, Eye, Send } from "lucide-react";
import { format } from "date-fns";

type Invoice = {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: number;
  status: string;
  paidAmount: number;
  caseId: string | null;
};

type InvoiceListProps = {
  caseId?: string;
};

export function InvoiceList({ caseId }: InvoiceListProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInvoices() {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (caseId) params.set("caseId", caseId);

        const response = await fetch(`/api/billing/invoices?${params}`);
        if (response.ok) {
          const data = await response.json();
          setInvoices(data);
        }
      } catch (error) {
        console.error("Failed to fetch invoices:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchInvoices();
  }, [caseId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "sent":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "partially_paid":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "overdue":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "draft":
        return "bg-slate-500/20 text-slate-400 border-slate-500/30";
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading invoices...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Invoices</h3>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Invoice
        </Button>
      </div>

      {invoices.length === 0 ? (
        <p className="text-sm text-muted-foreground">No invoices yet</p>
      ) : (
        <div className="space-y-2">
          {invoices.map((invoice) => (
            <div
              key={invoice.id}
              className="p-4 rounded-lg bg-muted/30 border border-border/50 flex items-center justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{invoice.invoiceNumber}</span>
                  <Badge className={getStatusColor(invoice.status)}>
                    {invoice.status.replace("_", " ")}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground space-y-0.5">
                  <p>
                    Date: {format(new Date(invoice.invoiceDate), "dd MMM yyyy")}
                  </p>
                  <p>
                    Due: {format(new Date(invoice.dueDate), "dd MMM yyyy")}
                  </p>
                  <p className="font-semibold text-foreground">
                    £{invoice.totalAmount.toFixed(2)}
                    {invoice.paidAmount > 0 && (
                      <span className="text-muted-foreground ml-2">
                        (Paid: £{invoice.paidAmount.toFixed(2)})
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline">
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </Button>
                {invoice.status === "draft" && (
                  <Button size="sm">
                    <Send className="h-4 w-4 mr-2" />
                    Send
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

