/**
 * AI Prompt Bar – bottom bar for AI-driven JSON Patch editing
 */
import { useState } from "react";
import { Sparkles, Send, Eye, Check, X, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import type { CaseIR, JsonPatch } from "@/types/caseIr";
import "./studio.css";

interface AiPromptBarProps {
  caseIr: CaseIR;
  onApplyPatch: (patch: JsonPatch) => void;
}

const AI_PLAN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-plan`;

async function callAiPlan(
  prompt: string,
  caseIr: CaseIR
): Promise<{ patch: JsonPatch; summary: string }> {
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
    if (res.status === 429) throw new Error(data.error ?? "Rate limit exceeded – try again shortly.");
    if (res.status === 402) throw new Error(data.error ?? "AI credits exhausted – add credits in workspace settings.");
    throw new Error(data.error ?? `AI service error (${res.status})`);
  }

  if (data.error) throw new Error(data.error);

  return { patch: data.patch ?? [], summary: data.summary ?? "" };
}

export default function AiPromptBar({ caseIr, onApplyPatch }: AiPromptBarProps) {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingPatch, setPendingPatch] = useState<JsonPatch | null>(null);
  const [summary, setSummary] = useState("");
  const [showPatch, setShowPatch] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!prompt.trim()) return;
    setError(null);
    setIsLoading(true);
    setPendingPatch(null);
    setSummary("");
    setShowPatch(false);

    try {
      const result = await callAiPlan(prompt.trim(), caseIr);
      setPendingPatch(result.patch);
      setSummary(result.summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI planning failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (!pendingPatch) return;
    try {
      onApplyPatch(pendingPatch);
      setPendingPatch(null);
      setSummary("");
      setPrompt("");
      setShowPatch(false);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Patch apply failed");
    }
  };

  const handleDiscard = () => {
    setPendingPatch(null);
    setSummary("");
    setError(null);
    setShowPatch(false);
  };

  const opCount = pendingPatch?.length ?? 0;

  return (
    <div className="prompt-bar border-t border-r flex-shrink-0">
      {/* Patch preview area */}
      {pendingPatch && (
        <div className="border-b border-border">
          <div className="px-4 py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${opCount === 0 ? "prompt-status-dot--inactive" : "prompt-status-dot--active"}`} />
              <span className="text-sm font-medium text-foreground truncate">{summary}</span>
              <span className={`flex-shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded ${opCount === 0 ? "prompt-ops-badge--inactive" : "prompt-ops-badge--active"}`}>
                {opCount} op{opCount !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {opCount > 0 && (
                <button
                  className="flex items-center gap-1 text-[11px] text-foreground-muted hover:text-foreground transition-colors"
                  onClick={() => setShowPatch(!showPatch)}
                  title="Preview patch JSON"
                >
                  <Eye size={12} />
                  {showPatch ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                </button>
              )}

              <button
                className="prompt-discard-btn flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors"
                onClick={handleDiscard}
              >
                <X size={12} /> Discard
              </button>

              <button
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all disabled:opacity-40 ${opCount === 0 ? "prompt-apply-btn--inactive" : "prompt-apply-btn--active"}`}
                onClick={handleApply}
                disabled={opCount === 0}
              >
                <Check size={12} /> Apply Patch
              </button>
            </div>
          </div>

          {showPatch && opCount > 0 && (
            <div className="px-4 pb-3">
              <pre className="prompt-preview font-mono text-[11px] p-3 rounded-lg overflow-x-auto max-h-36">
                {JSON.stringify(pendingPatch, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="prompt-error-banner flex items-center gap-2 px-4 py-2 text-[12px]">
          <AlertTriangle size={12} className="text-destructive flex-shrink-0" />
          <span className="text-destructive">{error}</span>
          <button className="ml-auto text-destructive opacity-60 hover:opacity-100" onClick={() => setError(null)}>
            <X size={11} />
          </button>
        </div>
      )}

      {/* Prompt input row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Sparkles
          size={16}
          className={`flex-shrink-0 transition-colors ${isLoading ? "text-primary" : "text-foreground-muted"}`}
        />

        <input
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-foreground-muted outline-none"
          placeholder={
            isLoading
              ? "Gemini is planning your patch…"
              : 'e.g. "Add a validation step after Fetch Emails", "Rename stage 0 to Ingestion", "Set trigger to timer with R/PT1H"'
          }
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          disabled={isLoading}
        />

        <span className="prompt-model-badge flex-shrink-0 font-mono text-[9px] px-1.5 py-0.5 rounded opacity-60">
          Gemini
        </span>

        <button
          className="toolbar-btn--primary flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40 flex-shrink-0"
          onClick={handleSubmit}
          disabled={isLoading || !prompt.trim()}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
          ) : (
            <Send size={13} />
          )}
          {isLoading ? "Planning…" : "Plan"}
        </button>
      </div>

      {/* Hint */}
      <div className="px-4 pb-2 text-[10px] text-foreground-subtle" style={{ marginTop: -8 }}>
        AI generates RFC 6902 JSON Patch operations · review before applying · ↵ to plan
      </div>
    </div>
  );
}
