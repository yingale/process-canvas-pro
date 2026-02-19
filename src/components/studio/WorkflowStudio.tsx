/**
 * WorkflowStudio – main orchestrator component
 */
import { useState, useCallback, useEffect } from "react";
import type { CaseIR, SelectionTarget, JsonPatch, StepType } from "@/types/caseIr";
import { importBpmn } from "@/lib/bpmnImporter";
import { applyCaseIRPatch } from "@/lib/patchUtils";
import { EMAIL_FETCHER_BPMN } from "@/lib/sampleBpmn";
import Toolbar from "./Toolbar";
import ProcessDiagram from "./ProcessDiagram";
import PropertiesPanel from "./PropertiesPanel";
import AiChatPanel from "./AiChatPanel";

function uid() {
  return `el_${Math.random().toString(36).slice(2, 8)}`;
}

export default function WorkflowStudio() {
  const [caseIr, setCaseIr] = useState<CaseIR | null>(null);
  const [selection, setSelection] = useState<SelectionTarget>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    loadSample();
  }, []);

  const loadSample = async () => {
    try {
      const { caseIr: ir, warnings: w } = await importBpmn(EMAIL_FETCHER_BPMN, "email_fetcher.bpmn");
      setCaseIr(ir);
      setWarnings(w);
      setSelection(null);
    } catch (e) {
      console.error("Failed to load sample:", e);
    }
  };

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

  // Inline diagram add actions
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
      <Toolbar caseIr={caseIr} onImportBpmn={handleImportBpmn} onLoadSample={loadSample} />

      {/* Warnings bar */}
      {warnings.length > 0 && (
        <div
          className="flex items-center gap-2 px-4 py-1.5 text-[12px]"
          style={{ background: "hsl(var(--warning) / 0.08)", color: "hsl(var(--warning))", borderBottom: "1px solid hsl(var(--warning) / 0.2)" }}
        >
          ⚠ {warnings[0]}
          {warnings.length > 1 && <span className="opacity-60">(+{warnings.length - 1} more)</span>}
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
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4 animate-fade-in">
              <div
                className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center"
                style={{ background: "hsl(var(--surface-raised))", border: "1px solid hsl(var(--border))" }}
              >
                <div className="w-8 h-8 border-2 rounded-full border-t-primary border-border animate-spin" />
              </div>
              <p className="text-sm" style={{ color: "hsl(var(--foreground-muted))" }}>Loading workflow…</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
