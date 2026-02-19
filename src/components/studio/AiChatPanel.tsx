/**
 * AI Chat Panel – conversational workflow editing assistant
 * Full chat UI replacing the old single-line prompt bar
 */
import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, RotateCcw, Loader2 } from "lucide-react";
import type { CaseIR, JsonPatch } from "@/types/caseIr";
import { applyCaseIRPatch } from "@/lib/patchUtils";

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
        <span
          className="text-[11px] px-3 py-1 rounded-full"
          style={{ background: "hsl(var(--primary-dim))", color: "hsl(var(--primary))" }}
        >
          {msg.content}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      {!isUser && (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-0.5"
          style={{ background: "hsl(var(--primary))" }}
        >
          <Sparkles size={13} color="white" />
        </div>
      )}

      <div style={{ maxWidth: "85%" }}>
        <div
          className="rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed"
          style={
            isUser
              ? { background: "hsl(var(--primary))", color: "white", borderBottomRightRadius: 4 }
              : { background: "hsl(var(--surface-overlay))", color: "hsl(var(--foreground))", border: "1px solid hsl(var(--border))", borderBottomLeftRadius: 4 }
          }
        >
          {/* Render simple markdown-ish: bold, italic, bullets */}
          <div className="whitespace-pre-wrap">
            {msg.content.split("\n").map((line, i) => {
              const trimmed = line.trim();
              const isBullet = trimmed.startsWith("•") || trimmed.startsWith("-") || trimmed.startsWith("*");
              const content = isBullet ? trimmed.slice(1).trim() : line;
              // Render italic (wrapped in *)
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

        {/* Undo button after assistant applied a patch */}
        {!isUser && msg.patch && msg.patch.length > 0 && onUndo && (
          <button
            className="flex items-center gap-1 mt-1.5 ml-1 text-[11px] transition-colors"
            style={{ color: "hsl(var(--foreground-muted))" }}
            onMouseEnter={e => { e.currentTarget.style.color = "hsl(var(--primary))"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "hsl(var(--foreground-muted))"; }}
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

    // Snapshot for undo
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
    <div
      className="flex flex-col h-full border-r"
      style={{ background: "hsl(var(--surface))", borderColor: "hsl(var(--border))" }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 border-b flex items-center gap-2.5 flex-shrink-0"
        style={{ borderColor: "hsl(var(--border))" }}
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: "hsl(var(--primary))" }}
        >
          <Sparkles size={14} color="white" />
        </div>
        <div>
          <div className="text-[13px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>
            Workflow Assistant
          </div>
          <div className="text-[10px]" style={{ color: "hsl(var(--foreground-muted))" }}>
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
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-0.5"
              style={{ background: "hsl(var(--primary))" }}
            >
              <Sparkles size={13} color="white" />
            </div>
            <div
              className="rounded-2xl px-4 py-3 flex items-center gap-2"
              style={{ background: "hsl(var(--surface-overlay))", border: "1px solid hsl(var(--border))", borderBottomLeftRadius: 4 }}
            >
              <Loader2 size={13} className="animate-spin" style={{ color: "hsl(var(--primary))" }} />
              <span className="text-[12px]" style={{ color: "hsl(var(--foreground-muted))" }}>Thinking…</span>
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
              className="text-[11px] px-2.5 py-1 rounded-full border transition-colors"
              style={{
                borderColor: "hsl(var(--border))",
                color: "hsl(var(--foreground-muted))",
                background: "hsl(var(--surface-overlay))",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = "hsl(var(--primary))";
                e.currentTarget.style.color = "hsl(var(--primary))";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = "hsl(var(--border))";
                e.currentTarget.style.color = "hsl(var(--foreground-muted))";
              }}
              onClick={() => setInput(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input row */}
      <div
        className="px-3 pb-3 pt-2 border-t flex-shrink-0"
        style={{ borderColor: "hsl(var(--border))" }}
      >
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2"
          style={{
            background: "hsl(var(--surface-overlay))",
            border: "1.5px solid hsl(var(--border))",
          }}
          onFocus={() => {}}
        >
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-foreground-muted"
            style={{ color: "hsl(var(--foreground))" }}
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
            className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-40"
            style={{
              background: input.trim() ? "hsl(var(--primary))" : "hsl(var(--border))",
            }}
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
