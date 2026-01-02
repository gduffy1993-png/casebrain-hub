"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Plus, Clock, CheckCircle2, AlertCircle, X } from "lucide-react";
import { useToast } from "@/components/Toast";

type DisclosureChaser = {
  id: string;
  item: string;
  status: "requested" | "chased" | "received" | "overdue";
  requested_at: string;
  chased_at: string | null;
  received_at: string | null;
  notes: string | null;
};

type DisclosureChasersPanelProps = {
  caseId: string;
};

export function DisclosureChasersPanel({ caseId }: DisclosureChasersPanelProps) {
  const [chasers, setChasers] = useState<DisclosureChaser[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const { push: showToast } = useToast();

  useEffect(() => {
    loadChasers();
  }, [caseId]);

  async function loadChasers() {
    try {
      setLoading(true);
      const response = await fetch(`/api/criminal/${caseId}/disclosure-chasers`);
      const result = await response.json();
      if (result.ok) {
        setChasers(result.data || []);
      }
    } catch (error) {
      console.error("Failed to load disclosure chasers:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!newItem.trim()) {
      showToast("Please enter an item", "error");
      return;
    }

    setIsAdding(true);
    try {
      const response = await fetch(`/api/criminal/${caseId}/disclosure-chasers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item: newItem.trim() }),
      });

      const result = await response.json();
      if (result.ok) {
        setNewItem("");
        await loadChasers();
        showToast("Disclosure item added", "success");
      } else {
        showToast(result.error || "Failed to add item", "error");
      }
    } catch (error) {
      showToast("Failed to add item", "error");
    } finally {
      setIsAdding(false);
    }
  }

  async function handleUpdateStatus(id: string, status: "chased" | "received") {
    try {
      const response = await fetch(`/api/criminal/${caseId}/disclosure-chasers`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });

      const result = await response.json();
      if (result.ok) {
        await loadChasers();
        showToast(`Item marked as ${status}`, "success");
      } else {
        showToast(result.error || "Failed to update", "error");
      }
    } catch (error) {
      showToast("Failed to update", "error");
    }
  }

  const getStatusBadge = (status: DisclosureChaser["status"]) => {
    const config = {
      requested: { color: "bg-blue-500/20 text-blue-600 border-blue-500/30", icon: Clock, label: "Requested" },
      chased: { color: "bg-amber-500/20 text-amber-600 border-amber-500/30", icon: AlertCircle, label: "Chased" },
      received: { color: "bg-green-500/20 text-green-600 border-green-500/30", icon: CheckCircle2, label: "Received" },
      overdue: { color: "bg-red-500/20 text-red-600 border-red-500/30", icon: X, label: "Overdue" },
    };
    const { color, icon: Icon, label } = config[status];
    return (
      <Badge className={`${color} border text-xs flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Disclosure Chasers</h2>
          </div>
        </div>

        {/* Add New Item */}
        <div className="flex gap-2">
          <Input
            placeholder="Enter disclosure item (e.g., CCTV footage, MG6 schedules)"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleAdd();
              }
            }}
            className="flex-1"
          />
          <Button onClick={handleAdd} disabled={isAdding || !newItem.trim()}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>

        {/* Chasers List */}
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : chasers.length === 0 ? (
          <div className="text-sm text-muted-foreground p-4 text-center border border-border/50 rounded-lg">
            No disclosure items tracked yet. Add items to start tracking.
          </div>
        ) : (
          <div className="space-y-2">
            {chasers.map((chaser) => (
              <div
                key={chaser.id}
                className="p-3 rounded-lg border border-border/50 bg-muted/10"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground">{chaser.item}</span>
                      {getStatusBadge(chaser.status)}
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>Requested: {new Date(chaser.requested_at).toLocaleDateString()}</div>
                      {chaser.chased_at && (
                        <div>Chased: {new Date(chaser.chased_at).toLocaleDateString()}</div>
                      )}
                      {chaser.received_at && (
                        <div>Received: {new Date(chaser.received_at).toLocaleDateString()}</div>
                      )}
                      {chaser.notes && (
                        <div className="mt-1 italic">Notes: {chaser.notes}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {chaser.status === "requested" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpdateStatus(chaser.id, "chased")}
                      >
                        Mark Chased
                      </Button>
                    )}
                    {chaser.status !== "received" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpdateStatus(chaser.id, "received")}
                      >
                        Mark Received
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

