"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MessageSquare, Send, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePilotDocumentsTabActive } from "@/components/criminal/workflow/useCaseWorkflowActiveTab";
import { isCriminalPilotMode } from "@/lib/pilot-mode";
import {
  BATTLEBOARD_FALLBACK_TIMEOUT_HEADER,
  SUGGESTED_PROMPTS,
  buildBattleboardTimeoutFallback,
  isAssistantUpstreamFailure,
  isSuggestedPrompt,
  tryLocalSuggestedAnswer,
  type ControlRoomAssistantContext,
} from "./assistantBattleboardFallback";

const CHAT_STORAGE_KEY_PREFIX = "casebrain:control-room-chat:";
const ASSISTANT_TIMEOUT_MS = 90_000;
const ASSISTANT_TIMEOUT_MESSAGE = "The assistant timed out. Try a shorter question or ask again.";

const LEGACY_SERVER_TIMEOUT_TEXT =
  "The assistant ran out of time before producing an answer. Your case data is unchanged — please send the question again.";

function normalizeAssistantDisplayText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return text;
  if (trimmed.startsWith(BATTLEBOARD_FALLBACK_TIMEOUT_HEADER)) return text;
  if (trimmed === LEGACY_SERVER_TIMEOUT_TEXT) return ASSISTANT_TIMEOUT_MESSAGE;
  if (/ran out of time before producing an answer/i.test(trimmed)) return ASSISTANT_TIMEOUT_MESSAGE;
  if (trimmed === "Request timed out") return ASSISTANT_TIMEOUT_MESSAGE;
  return text;
}

function replyWithBattleboardFallback(
  ctx: ControlRoomAssistantContext,
  useTimeoutHeader: boolean,
): string {
  const body = buildBattleboardTimeoutFallback(ctx);
  if (!body) return ASSISTANT_TIMEOUT_MESSAGE;
  if (useTimeoutHeader) return `${BATTLEBOARD_FALLBACK_TIMEOUT_HEADER}\n\n${body}`;
  return body;
}

type ChatMessage = { role: "user" | "assistant"; content: string };

export type ControlRoomAssistantProps = {
  caseId: string;
  planSummary: string;
  evidenceSummary?: string;
  timelineSummary?: string;
  assistantContext: ControlRoomAssistantContext;
};

function AssistantChat({
  caseId,
  planSummary,
  evidenceSummary,
  timelineSummary,
  assistantContext,
  onClose,
  showClose,
}: ControlRoomAssistantProps & { onClose?: () => void; showClose?: boolean }) {
  const trimmedPlan = planSummary.slice(0, 1200);
  const trimmedEvidence = (evidenceSummary ?? "").slice(0, 800);
  const trimmedTimeline = (timelineSummary ?? "").slice(0, 400);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`${CHAT_STORAGE_KEY_PREFIX}${caseId}`);
      if (raw) {
        const parsed = JSON.parse(raw) as ChatMessage[];
        if (Array.isArray(parsed)) {
          setMessages(
            parsed.slice(-40).map((m) =>
              m.role === "assistant"
                ? { ...m, content: normalizeAssistantDisplayText(m.content) }
                : m,
            ),
          );
        }
      }
    } catch {
      /* ignore */
    }
  }, [caseId]);

  useEffect(() => {
    try {
      if (messages.length === 0) localStorage.removeItem(`${CHAT_STORAGE_KEY_PREFIX}${caseId}`);
      else localStorage.setItem(`${CHAT_STORAGE_KEY_PREFIX}${caseId}`, JSON.stringify(messages));
    } catch {
      /* ignore */
    }
  }, [caseId, messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;
      setInput("");
      const userMsg: ChatMessage = { role: "user", content: trimmed };
      setMessages((prev) => [...prev, userMsg]);

      if (isSuggestedPrompt(trimmed)) {
        const local = tryLocalSuggestedAnswer(trimmed, assistantContext);
        if (local) {
          setMessages((prev) => [...prev, { role: "assistant", content: local }]);
          return;
        }
      }

      setSending(true);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), ASSISTANT_TIMEOUT_MS);
      try {
        const res = await fetch(`/api/criminal/${caseId}/defence-plan-chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          signal: controller.signal,
          body: JSON.stringify({
            message: trimmed,
            planSummary: trimmedPlan,
            evidenceSummary: trimmedEvidence,
            timelineSummary: trimmedTimeline,
          }),
        });
        const data = await res.json().catch(() => ({}));
        const rawReply =
          typeof data?.reply === "string"
            ? data.reply
            : typeof data?.answer === "string"
              ? data.answer
              : res.ok
                ? "No answer returned — check bundle and strategy context."
                : typeof data?.error === "string"
                  ? data.error
                  : `Request failed (${res.status})`;

        let reply: string;
        if (isAssistantUpstreamFailure(res.status, rawReply)) {
          reply = replyWithBattleboardFallback(assistantContext, true);
        } else {
          reply = normalizeAssistantDisplayText(rawReply);
        }
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      } catch (e) {
        const timedOut = e instanceof DOMException && e.name === "AbortError";
        const reply = timedOut
          ? replyWithBattleboardFallback(assistantContext, true)
          : normalizeAssistantDisplayText(e instanceof Error ? e.message : "Could not reach assistant.");
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      } finally {
        clearTimeout(timeoutId);
        setSending(false);
      }
    },
    [assistantContext, caseId, trimmedEvidence, trimmedPlan, trimmedTimeline, sending],
  );

  return (
    <Card className="border-slate-200 flex flex-col h-full min-h-0 shadow-md bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2.5 bg-slate-50/90 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <MessageSquare className="h-4 w-4 text-blue-700 shrink-0" />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-900 truncate">CaseBrain Assistant</h3>
            <p className="text-[10px] text-slate-500 truncate">
              Beta · secondary to case data · solicitor review
            </p>
          </div>
        </div>
        {showClose && onClose && (
          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={onClose}>
            <X className="h-4 w-4" />
            <span className="sr-only">Close assistant</span>
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-1 p-2 border-b border-border/40 shrink-0 max-h-[88px] overflow-y-auto">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={sending}
            onClick={() => sendMessage(prompt)}
            className="text-[10px] px-1.5 py-0.5 rounded border border-border/60 bg-muted/30 text-foreground hover:bg-muted/60 transition-colors"
            title="Answers from Control Room and case documents when available — no AI call"
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-2.5 space-y-2 min-h-0">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground leading-relaxed">
            Suggested prompts answer from Control Room and case documents first. Custom questions use the assistant
            when available — conditional only; solicitor review required.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`rounded-lg px-2.5 py-2 text-xs whitespace-pre-wrap ${
              m.role === "user"
                ? "bg-primary/15 text-foreground ml-3"
                : "bg-muted/40 text-foreground mr-1 border border-border/40"
            }`}
          >
            {m.content}
          </div>
        ))}
        {sending && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Thinking…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        className="p-2.5 border-t border-border/50 flex gap-2 shrink-0"
        onSubmit={(e) => {
          e.preventDefault();
          void sendMessage(input);
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={2}
          placeholder="Ask about this case…"
          className="flex-1 text-sm rounded-md border border-border/60 bg-background px-2.5 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-primary/40"
        />
        <Button type="submit" size="sm" disabled={sending || !input.trim()} className="self-end shrink-0">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </Card>
  );
}

/** Desktop fixed dock + mobile FAB drawer — assistant is secondary to the dashboard. */
export function ControlRoomAssistantDock(props: ControlRoomAssistantProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const documentsFocus = usePilotDocumentsTabActive();

  useEffect(() => {
    if (documentsFocus) setMobileOpen(false);
  }, [documentsFocus]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  if (isCriminalPilotMode() && documentsFocus) {
    return null;
  }

  return (
    <>
      <aside
        className="hidden xl:flex flex-col fixed right-0 top-14 z-30 w-[min(360px,26vw)] h-[calc(100vh-3.5rem)] border-l border-slate-200 bg-slate-50/95 backdrop-blur-sm p-3"
        aria-label="Case assistant"
      >
        <AssistantChat {...props} />
      </aside>

      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="xl:hidden fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-2 ring-background hover:opacity-95 transition-opacity"
        aria-label="Open case assistant"
      >
        <MessageSquare className="h-6 w-6" />
      </button>

      {mobileOpen && (
        <div className="xl:hidden fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close assistant overlay"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative flex flex-col w-full max-w-md h-full bg-background shadow-2xl p-3">
            <AssistantChat {...props} showClose onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
