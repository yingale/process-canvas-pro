/**
 * WorkflowStudio – main orchestrator
 * Hierarchy: Stage (Section) → Group → Step
 */
import { useState, useCallback, useRef } from "react";
import type { CaseIR, SelectionTarget, JsonPatch, StepType } from "@/types/caseIr";
import { importBpmn } from "@/lib/bpmnImporter";
import { applyCaseIRPatch } from "@/lib/patchUtils";
import Toolbar from "./Toolbar";
import LifecycleDiagram from "./LifecycleDiagram";
import PropertiesPanel from "./PropertiesPanel";
import AiChatPanel from "./AiChatPanel";
import { Upload, FileText } from "lucide-react";

function uid() { return `el_${Math.random().toString(36).slice(2, 8)}`; }

function EmptyState({ onImport }: { onImport: (ir: CaseIR, w: string[]) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const processFile = async (file: File) => {
    setError(null); setLoading(true);
    try {
      const xml = await file.text();
      const result = await importBpmn(xml, file.name);
      onImport(result.caseIr, result.warnings);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to parse BPMN file.");
    } finally { setLoading(false); }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-8" style={{ background: "hsl(var(--canvas-bg))" }}>
      <div className="w-full max-w-md text-center space-y-6">
        <div className="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center"
          style={{ background: "hsl(var(--primary-dim))", border: "2px solid hsl(var(--primary) / 0.2)" }}>
          <FileText size={36} style={{ color: "hsl(var(--primary))" }} />
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: "hsl(var(--foreground))" }}>Upload a BPMN File</h2>
          <p className="text-sm" style={{ color: "hsl(var(--foreground-muted))" }}>
            Import a Camunda 7 / BPMN 2.0 file to visualise and edit your workflow with AI
          </p>
        </div>
        <div
          className="rounded-2xl border-2 border-dashed p-10 transition-all cursor-pointer"
          style={{ borderColor: dragging ? "hsl(var(--primary))" : "hsl(var(--border))", background: dragging ? "hsl(var(--primary-dim))" : "hsl(var(--surface))" }}
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) processFile(f); }}
        >
          {loading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-2 rounded-full animate-spin" style={{ borderColor: "hsl(var(--border))", borderTopColor: "hsl(var(--primary))" }} />
              <p className="text-sm" style={{ color: "hsl(var(--foreground-muted))" }}>Parsing BPMN…</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "hsl(var(--primary-dim))" }}>
                <Upload size={22} style={{ color: "hsl(var(--primary))" }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>Drop your .bpmn file here</p>
                <p className="text-xs mt-1" style={{ color: "hsl(var(--foreground-muted))" }}>or click to browse</p>
              </div>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept=".bpmn,.xml" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ""; }} />
        {error && (
          <div className="rounded-lg px-4 py-3 text-sm text-left"
            style={{ background: "hsl(var(--destructive) / 0.1)", color: "hsl(var(--destructive))", border: "1px solid hsl(var(--destructive) / 0.2)" }}>
            {error}
          </div>
        )}
        <p className="text-xs" style={{ color: "hsl(var(--foreground-subtle))" }}>Supports BPMN 2.0 · Camunda 7 · subProcess-based stage layout</p>
      </div>
    </div>
  );
}

export default function WorkflowStudio() {
  const [caseIr, setCaseIr] = useState<CaseIR | null>(null);
  const [selection, setSelection] = useState<SelectionTarget>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  
  const handleImportBpmn = (ir: CaseIR, w: string[]) => { setCaseIr(ir); setWarnings(w); setSelection(null); };

  const handlePatch = useCallback((patch: JsonPatch) => {
    if (!caseIr) return;
    try {
      const updated = applyCaseIRPatch(caseIr, patch);
      // Clear ALL cached original XML/diagram data so the exporter fully
      // regenerates from the edited IR – including diagram shapes for new steps.
      updated.metadata = {
        ...updated.metadata,
        updatedAt: new Date().toISOString(),
        originalBpmnXml: undefined,
        originalDiagramXml: undefined,
      };
      setCaseIr(updated);
    } catch (e) { console.error("Patch failed:", e); }
  }, [caseIr]);

  const handleUndoTo = useCallback((snapshot: CaseIR) => { setCaseIr(snapshot); setSelection(null); }, []);

  const handleSelectTrigger = useCallback(() => setSelection({ kind: "trigger" }), []);
  const handleSelectEndEvent = useCallback(() => setSelection({ kind: "endEvent" }), []);
  const handleSelectProcess = useCallback(() => setSelection({ kind: "process" }), []);
  const handleSelectBoundaryEvent = useCallback((stageId: string, groupId: string, stepId: string, boundaryEventId: string) =>
    setSelection({ kind: "boundaryEvent", stageId, groupId, stepId, boundaryEventId }), []);

  const handleSelectStage = useCallback((stageId: string) => setSelection({ kind: "stage", stageId }), []);

  const handleSelectGroup = useCallback((stageId: string, groupId: string) =>
    setSelection({ kind: "group", stageId, groupId }), []);

  const handleSelectStep = useCallback((stageId: string, groupId: string, stepId: string) =>
    setSelection({ kind: "step", stageId, groupId, stepId }), []);

  const handleAddStep = useCallback((stageId: string, groupId: string) => {
    if (!caseIr) return;
    const si = caseIr.stages.findIndex(s => s.id === stageId);
    if (si < 0) return;
    const gi = caseIr.stages[si].groups.findIndex(g => g.id === groupId);
    if (gi < 0) return;
    const newStep = { id: uid(), name: "New Task", type: "automation" as StepType };
    handlePatch([{ op: "add", path: `/stages/${si}/groups/${gi}/steps/-`, value: newStep }]);
  }, [caseIr, handlePatch]);

  const handleAddGroup = useCallback((stageId: string) => {
    if (!caseIr) return;
    const si = caseIr.stages.findIndex(s => s.id === stageId);
    if (si < 0) return;
    handlePatch([{ op: "add", path: `/stages/${si}/groups/-`, value: { id: uid(), name: "New Group", steps: [] } }]);
  }, [caseIr, handlePatch]);

  const handleAddStage = useCallback(() => {
    handlePatch([{ op: "add", path: "/stages/-", value: { id: uid(), name: "New Stage", groups: [{ id: uid(), name: "Main", steps: [] }] } }]);
  }, [handlePatch]);

  const handleDeleteStage = useCallback((stageId: string) => {
    if (!caseIr) return;
    const si = caseIr.stages.findIndex(s => s.id === stageId);
    if (si < 0) return;
    handlePatch([{ op: "remove", path: `/stages/${si}` }]);
    setSelection(null);
  }, [caseIr, handlePatch]);

  const handleDeleteGroup = useCallback((stageId: string, groupId: string) => {
    if (!caseIr) return;
    const si = caseIr.stages.findIndex(s => s.id === stageId);
    if (si < 0) return;
    const gi = caseIr.stages[si].groups.findIndex(g => g.id === groupId);
    if (gi < 0) return;
    handlePatch([{ op: "remove", path: `/stages/${si}/groups/${gi}` }]);
    setSelection(null);
  }, [caseIr, handlePatch]);

  const handleDeleteStep = useCallback((stageId: string, groupId: string, stepId: string) => {
    if (!caseIr) return;
    const si = caseIr.stages.findIndex(s => s.id === stageId);
    if (si < 0) return;
    const gi = caseIr.stages[si].groups.findIndex(g => g.id === groupId);
    if (gi < 0) return;
    const sti = caseIr.stages[si].groups[gi].steps.findIndex(s => s.id === stepId);
    if (sti < 0) return;
    handlePatch([{ op: "remove", path: `/stages/${si}/groups/${gi}/steps/${sti}` }]);
    setSelection(null);
  }, [caseIr, handlePatch]);

  const handleDuplicateStep = useCallback((stageId: string, groupId: string, stepId: string) => {
    if (!caseIr) return;
    const si = caseIr.stages.findIndex(s => s.id === stageId);
    if (si < 0) return;
    const gi = caseIr.stages[si].groups.findIndex(g => g.id === groupId);
    if (gi < 0) return;
    const step = caseIr.stages[si].groups[gi].steps.find(s => s.id === stepId);
    if (!step) return;
    handlePatch([{ op: "add", path: `/stages/${si}/groups/${gi}/steps/-`, value: { ...step, id: uid(), name: `${step.name} (copy)` } }]);
  }, [caseIr, handlePatch]);

  const handleDuplicateStage = useCallback((stageId: string) => {
    if (!caseIr) return;
    const stage = caseIr.stages.find(s => s.id === stageId);
    if (!stage) return;
    const cloned = { ...stage, id: uid(), name: `${stage.name} (copy)`, groups: stage.groups.map(g => ({ ...g, id: uid(), steps: g.steps.map(s => ({ ...s, id: uid() })) })) };
    handlePatch([{ op: "add", path: "/stages/-", value: cloned }]);
  }, [caseIr, handlePatch]);

  const handleMoveStage = useCallback((stageId: string, dir: -1 | 1) => {
    if (!caseIr) return;
    const si = caseIr.stages.findIndex(s => s.id === stageId);
    const ti = si + dir;
    if (si < 0 || ti < 0 || ti >= caseIr.stages.length) return;
    handlePatch([{ op: "move", path: `/stages/${ti}`, from: `/stages/${si}` }]);
  }, [caseIr, handlePatch]);

  const handleMoveStep = useCallback((stageId: string, groupId: string, stepId: string, dir: -1 | 1) => {
    if (!caseIr) return;
    const si = caseIr.stages.findIndex(s => s.id === stageId);
    if (si < 0) return;
    const gi = caseIr.stages[si].groups.findIndex(g => g.id === groupId);
    if (gi < 0) return;
    const sti = caseIr.stages[si].groups[gi].steps.findIndex(s => s.id === stepId);
    const ti = sti + dir;
    if (sti < 0 || ti < 0 || ti >= caseIr.stages[si].groups[gi].steps.length) return;
    handlePatch([{ op: "move", path: `/stages/${si}/groups/${gi}/steps/${ti}`, from: `/stages/${si}/groups/${gi}/steps/${sti}` }]);
  }, [caseIr, handlePatch]);

  const handleMoveGroup = useCallback((stageId: string, groupId: string, dir: -1 | 1) => {
    if (!caseIr) return;
    const si = caseIr.stages.findIndex(s => s.id === stageId);
    if (si < 0) return;
    const gi = caseIr.stages[si].groups.findIndex(g => g.id === groupId);
    const ti = gi + dir;
    if (gi < 0 || ti < 0 || ti >= caseIr.stages[si].groups.length) return;
    handlePatch([{ op: "move", path: `/stages/${si}/groups/${ti}`, from: `/stages/${si}/groups/${gi}` }]);
  }, [caseIr, handlePatch]);

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "hsl(var(--background))" }}>
      <Toolbar caseIr={caseIr} onImportBpmn={handleImportBpmn} onLoadSample={() => {}} />

      {warnings.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-1.5 text-[12px] flex-shrink-0"
          style={{ background: "hsl(var(--warning) / 0.08)", color: "hsl(var(--warning))", borderBottom: "1px solid hsl(var(--warning) / 0.2)" }}>
          ⚠ {warnings[0]}
          {warnings.length > 1 && <span className="opacity-60">(+{warnings.length - 1} more)</span>}
          <button className="ml-auto opacity-60 hover:opacity-100" onClick={() => setWarnings([])}>✕</button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {caseIr ? (
          <>
            <div className="flex flex-col overflow-hidden flex-shrink-0" style={{ width: 280, minWidth: 280 }}>
              <AiChatPanel caseIr={caseIr} onApplyPatch={handlePatch} onUndoTo={handleUndoTo} />
            </div>
            <div className="flex-1 overflow-hidden">
              <LifecycleDiagram
                caseIr={caseIr}
                selection={selection}
                onSelectTrigger={handleSelectTrigger}
                onSelectEndEvent={handleSelectEndEvent}
                onSelectProcess={handleSelectProcess}
                onSelectBoundaryEvent={handleSelectBoundaryEvent}
                onSelectStage={handleSelectStage}
                onSelectGroup={handleSelectGroup}
                onSelectStep={handleSelectStep}
                onAddStep={handleAddStep}
                onAddGroup={handleAddGroup}
                onAddStage={handleAddStage}
                onDeleteStage={handleDeleteStage}
                onDeleteGroup={handleDeleteGroup}
                onDeleteStep={handleDeleteStep}
                onDuplicateStep={handleDuplicateStep}
                onDuplicateStage={handleDuplicateStage}
                onMoveStage={handleMoveStage}
                onMoveGroup={handleMoveGroup}
                onMoveStep={handleMoveStep}
              />
            </div>
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
