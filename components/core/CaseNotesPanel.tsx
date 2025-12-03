"use client";

import { useState, useTransition, useEffect } from "react";
import { MessageSquare, Pin, Send, Loader2, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { CaseNote } from "@/lib/types/casebrain";

type CaseNotesPanelProps = {
  caseId: string;
  initialNotes?: CaseNote[];
};

export function CaseNotesPanel({ caseId, initialNotes = [] }: CaseNotesPanelProps) {
  const [notes, setNotes] = useState<CaseNote[]>(initialNotes);
  const [newNote, setNewNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(!initialNotes.length);

  // Fetch notes on mount if not provided
  useEffect(() => {
    if (initialNotes.length) return;

    const fetchNotes = async () => {
      try {
        const res = await fetch(`/api/cases/${caseId}/notes`);
        if (res.ok) {
          const data = await res.json();
          setNotes(data.notes ?? []);
        }
      } catch (error) {
        console.error("Failed to fetch notes:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotes();
  }, [caseId, initialNotes.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    startTransition(async () => {
      try {
        const res = await fetch(`/api/cases/${caseId}/notes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: newNote }),
        });

        if (res.ok) {
          const data = await res.json();
          setNotes((prev) => [data.note, ...prev]);
          setNewNote("");
        }
      } catch (error) {
        console.error("Failed to create note:", error);
      }
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  return (
    <Card
      title="Case Notes"
      description="Add notes and observations to this case."
      action={
        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent/60">
          {notes.length} note{notes.length !== 1 ? "s" : ""}
        </span>
      }
    >
      {/* New Note Form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a note..."
          rows={2}
          className="flex-1 resize-none rounded-xl border border-primary/20 bg-white px-3 py-2 text-sm text-accent shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
        />
        <Button
          type="submit"
          variant="primary"
          disabled={isPending || !newNote.trim()}
          className="self-end"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>

      {/* Notes List */}
      <div className="mt-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-accent/40" />
          </div>
        ) : notes.length > 0 ? (
          notes.map((note) => (
            <div
              key={note.id}
              className={`rounded-xl border p-3 ${
                note.isPinned
                  ? "border-primary/30 bg-primary/5"
                  : "border-primary/10 bg-surface-muted/80"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-accent/50">
                  <User className="h-3 w-3" />
                  <span>{note.createdBy}</span>
                  <span>•</span>
                  <span>{formatDate(note.createdAt)}</span>
                </div>
                {note.isPinned && (
                  <Pin className="h-3 w-3 text-primary" />
                )}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-accent/80">
                {note.content}
              </p>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <MessageSquare className="h-8 w-8 text-accent/20" />
            <p className="mt-2 text-sm text-accent/50">
              No notes yet. Add the first note above.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

