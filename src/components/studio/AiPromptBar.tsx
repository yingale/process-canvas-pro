/**
 * AI Prompt Bar – bottom bar for AI-driven JSON Patch editing
 */
import { useState } from "react";
import { Sparkles, Send, Eye, Check, X, ChevronDown, ChevronUp } from "lucide-react";
import type { CaseIR, JsonPatch } from "@/types/caseIr";
import { mockAiPlan } from "@/lib/patchUtils";

interface AiPromptBarProps {
  caseIr: CaseIR;
  onApplyPatch: (patch: JsonPatch) => void;
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

    // Simulate async AI call (mock)
    await new Promise(r => setTimeout(r, 600));
    const result = mockAiPlan(prompt.trim(), caseIr);
    setPendingPatch(result.patch);
    setSummary(result.summary);
    setIsLoading(false);
  };

  const handleApply = () => {
    if (pendingPatch) {
      try {
        onApplyPatch(pendingPatch);
        setPendingPatch(null);
        setSummary("");
        setPrompt("");
        setShowPatch(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Patch failed");
      }
    }
  };

  const handleDiscard = () => {
    setPendingPatch(null);
    setSummary("");
    setError(null);
    setShowPatch(false);
  };

  return (
    <div
      className="border-t"
      style={{
        background: "hsl(var(--surface))",
        borderColor: "hsl(var(--border))",
      }}
    >
      {/* Patch Preview */}
      {pendingPatch && (
        <div
          className="border-b"
          style={{ borderColor: "hsl(var(--border))" }}
        >
          <div className="px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: "hsl(var(--primary))", boxShadow: "0 0 6px hsl(var(--primary))" }}
              />
              <span className="text-sm font-medium text-foreground">{summary}</span>
              <span
                className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                style={{ background: "hsl(var(--primary-dim))", color: "hsl(var(--primary))" }}
              >
                {pendingPatch.length} op{pendingPatch.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="flex items-center gap-1 text-[11px] text-foreground-muted hover:text-foreground transition-colors"
                onClick={() => setShowPatch(!showPatch)}
              >
                <Eye size={12} />
                {showPatch ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              </button>
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] font-medium transition-colors"
                style={{ background: "hsl(var(--destructive) / 0.15)", color: "hsl(var(--destructive))" }}
                onClick={handleDiscard}
              >
                <X size={12} /> Discard
              </button>
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] font-medium transition-all"
                style={{
                  background: pendingPatch.length === 0 ? "hsl(var(--muted))" : "hsl(var(--primary))",
                  color: pendingPatch.length === 0 ? "hsl(var(--muted-foreground))" : "hsl(var(--primary-foreground))",
                }}
                onClick={handleApply}
                disabled={pendingPatch.length === 0}
              >
                <Check size={12} /> Apply Patch
              </button>
            </div>
          </div>

          {showPatch && pendingPatch.length > 0 && (
            <div
              className="px-4 pb-3 max-h-32 overflow-y-auto"
            >
              <pre
                className="font-mono text-[11px] p-3 rounded-lg overflow-x-auto"
                style={{ background: "hsl(var(--surface-overlay))", color: "hsl(var(--foreground))" }}
              >
                {JSON.stringify(pendingPatch, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-4 py-2 text-sm text-destructive" style={{ background: "hsl(var(--destructive) / 0.08)" }}>
          {error}
        </div>
      )}

      {/* Input */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Sparkles size={16} className="text-primary flex-shrink-0" />
        <input
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-foreground-muted outline-none"
          placeholder='AI edit: e.g. "Add stage: Validation", "Add step to stage 0", "Rename process to X"'
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
        />
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
          style={{
            background: "hsl(var(--primary))",
            color: "hsl(var(--primary-foreground))",
          }}
          onClick={handleSubmit}
          disabled={isLoading || !prompt.trim()}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
          ) : (
            <Send size={13} />
          )}
          {isLoading ? "Planning..." : "Plan"}
        </button>
      </div>
    </div>
  );
}
