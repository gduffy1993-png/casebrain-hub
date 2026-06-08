"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, DollarSign, Plus, ArrowDown, ArrowUp } from "lucide-react";
import { format } from "date-fns";

type ClientMoneyTransaction = {
  id: string;
  clientName: string;
  amount: number;
  currency: string;
  transactionType: string;
  transactionDate: string;
  description: string | null;
  status: string;
};

type TrustAccount = {
  id: string;
  accountName: string;
  currentBalance: number;
  currency: string;
};

type ClientMoneyPanelProps = {
  caseId?: string;
};

export function ClientMoneyPanel({ caseId }: ClientMoneyPanelProps) {
  const [transactions, setTransactions] = useState<ClientMoneyTransaction[]>([]);
  const [trustAccounts, setTrustAccounts] = useState<TrustAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        // Fetch trust accounts
        const accountsResponse = await fetch("/api/trust/accounts");
        if (accountsResponse.ok) {
          const accountsData = await accountsResponse.json();
          setTrustAccounts(accountsData);
        }

        // Fetch transactions
        const params = new URLSearchParams();
        if (caseId) params.set("caseId", caseId);

        const transactionsResponse = await fetch(
          `/api/trust/client-money?${params}`
        );
        if (transactionsResponse.ok) {
          const transactionsData = await transactionsResponse.json();
          setTransactions(transactionsData);
        }
      } catch (error) {
        console.error("Failed to fetch client money data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [caseId]);

  const getTransactionTypeColor = (type: string) => {
    if (["deposit", "transfer_in", "interest"].includes(type)) {
      return "bg-green-500/20 text-green-400 border-green-500/30";
    }
    if (["withdrawal", "transfer_out", "fee_deduction", "refund"].includes(type)) {
      return "bg-red-500/20 text-red-400 border-red-500/30";
    }
    return "bg-slate-500/20 text-slate-400 border-slate-500/30";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "cleared":
      case "reconciled":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "pending":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "disputed":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading client money...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Client Money (Trust Account)</h3>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Transaction
        </Button>
      </div>

      {/* Trust Account Balances */}
      {trustAccounts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {trustAccounts.map((account) => (
            <div
              key={account.id}
              className="p-4 rounded-lg bg-cyan-950/30 border border-cyan-800/30"
            >
              <p className="text-sm text-cyan-200/70 mb-1">{account.accountName}</p>
              <p className="text-2xl font-bold text-cyan-300">
                {account.currency} {account.currentBalance.toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Transactions */}
      {transactions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No transactions yet</p>
      ) : (
        <div className="space-y-2">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="p-4 rounded-lg bg-muted/30 border border-border/50"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 rounded bg-muted">
                    {["deposit", "transfer_in", "interest"].includes(
                      transaction.transactionType
                    ) ? (
                      <ArrowDown className="h-4 w-4 text-green-400" />
                    ) : (
                      <ArrowUp className="h-4 w-4 text-red-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{transaction.clientName}</span>
                      <Badge className={getTransactionTypeColor(transaction.transactionType)}>
                        {transaction.transactionType.replace("_", " ")}
                      </Badge>
                      <Badge className={getStatusColor(transaction.status)}>
                        {transaction.status}
                      </Badge>
                    </div>
                    {transaction.description && (
                      <p className="text-sm text-muted-foreground mb-1">
                        {transaction.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(transaction.transactionDate), "dd MMM yyyy")}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`font-semibold ${
                      ["deposit", "transfer_in", "interest"].includes(
                        transaction.transactionType
                      )
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {["deposit", "transfer_in", "interest"].includes(
                      transaction.transactionType
                    )
                      ? "+"
                      : "-"}
                    {transaction.currency} {Math.abs(transaction.amount).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

