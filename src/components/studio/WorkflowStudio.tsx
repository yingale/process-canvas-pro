/**
 * WorkflowStudio – main orchestrator component
 */
import { useState, useCallback, useRef } from "react";
import type { CaseIR, SelectionTarget, JsonPatch, StepType } from "@/types/caseIr";
import { importBpmn } from "@/lib/bpmnImporter";
import { applyCaseIRPatch } from "@/lib/patchUtils";
import Toolbar from "./Toolbar";
import ProcessDiagram from "./ProcessDiagram";
import PropertiesPanel from "./PropertiesPanel";
import AiChatPanel from "./AiChatPanel";
import { Upload, FileText } from "lucide-react";

function uid() {
  return `el_${Math.random().toString(36).slice(2, 8)}`;
}

function EmptyState({ onImport }: { onImport: (ir: CaseIR, w: string[]) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const processFile = async (file: File) => {
    setError(null);
    setLoading(true);
    try {
      const xml = await file.text();
      const result = await importBpmn(xml, file.name);
      onImport(result.caseIr, result.warnings);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to parse BPMN file.");
    } finally {
      setLoading(false);
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div className="flex-1 flex items-center justify-center p-8" style={{ background: "hsl(var(--canvas-bg))" }}>
      <div className="w-full max-w-md text-center space-y-6">
        {/* Icon */}
        <div
          className="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center"
          style={{ background: "hsl(var(--primary-dim))", border: "2px solid hsl(var(--primary) / 0.2)" }}
        >
          <FileText size={36} style={{ color: "hsl(var(--primary))" }} />
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: "hsl(var(--foreground))" }}>
            Upload a BPMN File
          </h2>
          <p className="text-sm" style={{ color: "hsl(var(--foreground-muted))" }}>
            Import a Camunda 7 / BPMN 2.0 file to visualise and edit your workflow with AI
          </p>
        </div>

        {/* Drop zone */}
        <div
          className="rounded-2xl border-2 border-dashed p-10 transition-all cursor-pointer"
          style={{
            borderColor: dragging ? "hsl(var(--primary))" : "hsl(var(--border))",
            background: dragging ? "hsl(var(--primary-dim))" : "hsl(var(--surface))",
          }}
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          {loading ? (
            <div className="flex flex-col items-center gap-3">
              <div
                className="w-10 h-10 border-2 rounded-full animate-spin"
                style={{ borderColor: "hsl(var(--border))", borderTopColor: "hsl(var(--primary))" }}
              />
              <p className="text-sm" style={{ color: "hsl(var(--foreground-muted))" }}>Parsing BPMN…</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: "hsl(var(--primary-dim))" }}
              >
                <Upload size={22} style={{ color: "hsl(var(--primary))" }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>
                  Drop your .bpmn file here
                </p>
                <p className="text-xs mt-1" style={{ color: "hsl(var(--foreground-muted))" }}>
                  or click to browse
                </p>
              </div>
            </div>
          )}
        </div>

        <input ref={fileRef} type="file" accept=".bpmn,.xml" className="hidden" onChange={handleFile} />

        {/* Error */}
        {error && (
          <div
            className="rounded-lg px-4 py-3 text-sm text-left"
            style={{ background: "hsl(var(--destructive) / 0.1)", color: "hsl(var(--destructive))", border: "1px solid hsl(var(--destructive) / 0.2)" }}
          >
            {error}
          </div>
        )}

        <p className="text-xs" style={{ color: "hsl(var(--foreground-subtle))" }}>
          Supports BPMN 2.0 · Camunda 7 · subProcess-based stage layout
        </p>
      </div>
    </div>
  );
}

export default function WorkflowStudio() {
  const [caseIr, setCaseIr] = useState<CaseIR | null>(null);
  const [selection, setSelection] = useState<SelectionTarget>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const handleImportBpmn = (ir: CaseIR, w: string[]) => {
    setCaseIr(ir);
    setWarnings(w);
    setSelection(null);
  };

  const handlePatch = useCallback((patch: JsonPatch) => {
    if (!caseIr) return;
    try {
      const updated = applyCaseIRPatch(caseIr, patch);
      updated.metadata = { ...updated.metadata, updatedAt: new Date().toISOString() };
      setCaseIr(updated);
    } catch (e) {
      console.error("Patch failed:", e);
    }
  }, [caseIr]);

  const handleUndoTo = useCallback((snapshot: CaseIR) => {
    setCaseIr(snapshot);
    setSelection(null);
  }, []);

  const handleSelectStage = useCallback((stageId: string) => {
    setSelection({ kind: "stage", stageId });
  }, []);

  const handleSelectStep = useCallback((stageId: string, stepId: string) => {
    setSelection({ kind: "step", stageId, stepId });
  }, []);

  const handleAddStep = useCallback((stageId: string) => {
    if (!caseIr) return;
    const si = caseIr.stages.findIndex(s => s.id === stageId);
    if (si < 0) return;
    const newStep = { id: uid(), name: "New Task", type: "automation" as StepType };
    handlePatch([{ op: "add", path: `/stages/${si}/steps/-`, value: newStep }]);
  }, [caseIr, handlePatch]);

  const handleAddStage = useCallback(() => {
    const newStage = { id: uid(), name: "New Stage", steps: [] };
    handlePatch([{ op: "add", path: "/stages/-", value: newStage }]);
  }, [handlePatch]);

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "hsl(var(--background))" }}>
      <Toolbar caseIr={caseIr} onImportBpmn={handleImportBpmn} onLoadSample={() => {}} />

      {/* Warnings bar */}
      {warnings.length > 0 && (
        <div
          className="flex items-center gap-2 px-4 py-1.5 text-[12px] flex-shrink-0"
          style={{ background: "hsl(var(--warning) / 0.08)", color: "hsl(var(--warning))", borderBottom: "1px solid hsl(var(--warning) / 0.2)" }}
        >
          ⚠ {warnings[0]}
          {warnings.length > 1 && <span className="opacity-60">(+{warnings.length - 1} more)</span>}
          <button className="ml-auto opacity-60 hover:opacity-100" onClick={() => setWarnings([])}>✕</button>
        </div>
      )}

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {caseIr ? (
          <>
            {/* Left: AI Chat Panel */}
            <div className="flex flex-col overflow-hidden flex-shrink-0" style={{ width: 280, minWidth: 280 }}>
              <AiChatPanel
                caseIr={caseIr}
                onApplyPatch={handlePatch}
                onUndoTo={handleUndoTo}
              />
            </div>

            {/* Center: Process diagram */}
            <div className="flex-1 overflow-hidden">
              <ProcessDiagram
                caseIr={caseIr}
                selection={selection}
                onSelectStage={handleSelectStage}
                onSelectStep={handleSelectStep}
                onAddStep={handleAddStep}
                onAddStage={handleAddStage}
              />
            </div>

            {/* Right: Properties panel */}
            <PropertiesPanel
              caseIr={caseIr}
              selection={selection}
              onClose={() => setSelection(null)}
              onPatch={handlePatch}
            />
          </>
        ) : (
          <EmptyState onImport={handleImportBpmn} />
        )}
      </div>
    </div>
  );
}
