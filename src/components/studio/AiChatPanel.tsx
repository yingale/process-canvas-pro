/**
 * AI Chat Panel – conversational workflow editing assistant
 */
import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, RotateCcw, Loader2 } from "lucide-react";
import type { CaseIR, JsonPatch } from "@/types/caseIr";
import { applyCaseIRPatch } from "@/lib/patchUtils";
import "./studio.css";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  patch?: JsonPatch;
  undoSnapshot?: CaseIR;
}

interface AiChatPanelProps {
  caseIr: CaseIR;
  onApplyPatch: (patch: JsonPatch) => void;
  onUndoTo?: (snapshot: CaseIR) => void;
}

const AI_PLAN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-plan`;

async function callAiPlan(prompt: string, caseIr: CaseIR) {
  const res = await fetch(AI_PLAN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ prompt, caseIr }),
  });
  const data = await res.json();
  if (!res.ok) {
    if (res.status === 429) throw new Error(data.error ?? "I'm getting too many requests right now. Give me a moment and try again!");
    if (res.status === 402) throw new Error(data.error ?? "AI credits are exhausted. Please add credits in Settings → Workspace → Usage.");
    throw new Error(data.error ?? `Something went wrong (${res.status}). Please try again.`);
  }
  if (data.error) throw new Error(data.error);
  return { patch: data.patch ?? [], summary: data.summary ?? "" };
}

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content: "Hi! I'm your workflow assistant 👋\n\nJust tell me what you want to do in plain English — like:\n• *\"Add a spam check step after fetching emails\"*\n• *\"Create a new Approval stage\"*\n• *\"Add a loop that processes each email one by one\"*\n• *\"Rename the first stage to Data Collection\"*\n\nI'll update your workflow automatically!",
};

function uid() {
  return `msg_${Math.random().toString(36).slice(2, 9)}`;
}

function MessageBubble({ msg, onUndo }: { msg: ChatMessage; onUndo?: () => void }) {
  const isUser = msg.role === "user";
  const isSystem = msg.role === "system";

  if (isSystem) {
    return (
      <div className="flex justify-center my-1">
        <span className="chat-system-badge text-[11px] px-3 py-1 rounded-full">
          {msg.content}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      {!isUser && (
        <div className="chat-avatar w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
          <Sparkles size={13} color="white" />
        </div>
      )}

      <div style={{ maxWidth: "85%" }}>
        <div className={`rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${isUser ? "chat-bubble--user" : "chat-bubble--assistant"}`}>
          <div className="whitespace-pre-wrap">
            {msg.content.split("\n").map((line, i) => {
              const trimmed = line.trim();
              const isBullet = trimmed.startsWith("•") || trimmed.startsWith("-") || trimmed.startsWith("*");
              const content = isBullet ? trimmed.slice(1).trim() : line;
              const rendered = content.replace(/\*(.*?)\*/g, (_, t) => t);
              return (
                <div key={i} className={isBullet ? "flex items-start gap-1.5 mt-0.5" : ""}>
                  {isBullet && (
                    <span
                      className="mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: isUser ? "rgba(255,255,255,0.7)" : "hsl(var(--primary))" }}
                    />
                  )}
                  <span>{rendered}</span>
                </div>
              );
            })}
          </div>
        </div>

        {!isUser && msg.patch && msg.patch.length > 0 && onUndo && (
          <button
            className="chat-undo-btn flex items-center gap-1 mt-1.5 ml-1 text-[11px] transition-colors"
            onClick={onUndo}
          >
            <RotateCcw size={10} />
            Undo this change
          </button>
        )}
      </div>
    </div>
  );
}

export default function AiChatPanel({ caseIr, onApplyPatch, onUndoTo }: AiChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = { id: uid(), role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    const snapshot = JSON.parse(JSON.stringify(caseIr)) as CaseIR;

    try {
      const { patch, summary } = await callAiPlan(text, caseIr);

      if (patch.length > 0) {
        onApplyPatch(patch);
      }

      const assistantMsg: ChatMessage = {
        id: uid(),
        role: "assistant",
        content: summary || (patch.length === 0 ? "Hmm, I couldn't figure out what to change. Could you describe it differently?" : "Done! Your workflow has been updated."),
        patch,
        undoSnapshot: snapshot,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (e) {
      const errorMsg: ChatMessage = {
        id: uid(),
        role: "assistant",
        content: e instanceof Error ? e.message : "Something went wrong. Please try again.",
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleUndo = (msg: ChatMessage) => {
    if (msg.undoSnapshot && onUndoTo) {
      onUndoTo(msg.undoSnapshot);
      setMessages(prev => [
        ...prev,
        { id: uid(), role: "system", content: "Change undone ↩" },
      ]);
    }
  };

  const SUGGESTIONS = [
    "Add a new stage",
    "Add a loop for each item",
    "Add an approval step",
    "Add a decision branch",
  ];

  return (
    <div className="chat-panel flex flex-col h-full border-r">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2.5 flex-shrink-0">
        <div className="chat-avatar w-7 h-7 rounded-full flex items-center justify-center">
          <Sparkles size={14} color="white" />
        </div>
        <div>
          <div className="text-[13px] font-semibold text-foreground">
            Workflow Assistant
          </div>
          <div className="text-[10px] text-foreground-muted">
            Powered by AI · ask anything
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-3"
        style={{ minHeight: 0 }}
      >
        {messages.map(msg => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            onUndo={msg.patch && msg.patch.length > 0 && msg.undoSnapshot ? () => handleUndo(msg) : undefined}
          />
        ))}

        {isLoading && (
          <div className="flex justify-start mb-3">
            <div className="chat-avatar w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
              <Sparkles size={13} color="white" />
            </div>
            <div className="chat-loading-bubble rounded-2xl px-4 py-3 flex items-center gap-2">
              <Loader2 size={13} className="animate-spin text-primary" />
              <span className="text-[12px] text-foreground-muted">Thinking…</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick suggestions */}
      {messages.length <= 1 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1.5 flex-shrink-0">
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              className="chat-suggestion-btn text-[11px] px-2.5 py-1 rounded-full border transition-colors"
              onClick={() => setInput(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="px-3 pb-3 pt-2 border-t border-border flex-shrink-0">
        <div className="chat-input-container flex items-center gap-2 rounded-xl px-3 py-2">
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-foreground-muted text-foreground"
            placeholder="Describe a change…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={isLoading}
          />
          <button
            className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-40 ${input.trim() ? "chat-send-btn--active" : "chat-send-btn--inactive"}`}
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
          >
            <Send size={12} color="white" />
          </button>
        </div>
      </div>
    </div>
  );
}
