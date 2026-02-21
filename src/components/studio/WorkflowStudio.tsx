/**
 * WorkflowStudio – main orchestrator
 * Hierarchy: Stage (Section) → Group → Step
 */
import { useState, useCallback, useRef } from "react";
import type { CaseIR, SelectionTarget, JsonPatch, StepType, BoundaryEventType } from "@/types/caseIr";
import { importBpmn } from "@/lib/bpmnImporter";
import { applyCaseIRPatch } from "@/lib/patchUtils";
import Toolbar from "./Toolbar";
import LifecycleDiagram from "./LifecycleDiagram";
import PropertiesPanel from "./PropertiesPanel";
import AiChatPanel from "./AiChatPanel";
import { Upload, FileText } from "lucide-react";
import "./studio.css";

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
    <div className="flex-1 flex items-center justify-center p-8 bg-canvas">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="empty-state-icon w-20 h-20 rounded-2xl mx-auto flex items-center justify-center">
          <FileText size={36} className="text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-2 text-foreground">Upload a BPMN File</h2>
          <p className="text-sm text-foreground-muted">
            Import a Camunda 7 / BPMN 2.0 file to visualise and edit your workflow with AI
          </p>
        </div>
        <div
          className={`rounded-2xl border-2 border-dashed p-10 transition-all cursor-pointer ${dragging ? "empty-dropzone--dragging" : "empty-dropzone"}`}
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) processFile(f); }}
        >
          {loading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="empty-spinner w-10 h-10 border-2 rounded-full animate-spin" />
              <p className="text-sm text-foreground-muted">Parsing BPMN…</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="empty-upload-icon w-12 h-12 rounded-xl flex items-center justify-center">
                <Upload size={22} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Drop your .bpmn file here</p>
                <p className="text-xs mt-1 text-foreground-muted">or click to browse</p>
              </div>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept=".bpmn,.xml" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ""; }} />
        {error && (
          <div className="empty-error rounded-lg px-4 py-3 text-sm text-left">
            {error}
          </div>
        )}
        <p className="text-xs text-foreground-subtle">Supports BPMN 2.0 · Camunda 7 · subProcess-based stage layout</p>
      </div>
    </div>
  );
}

export default function WorkflowStudio() {
  const [caseIr, setCaseIr] = useState<CaseIR | null>(null);
  const [selection, setSelection] = useState<SelectionTarget>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [propsCollapsed, setPropsCollapsed] = useState(true);
  
  const handleImportBpmn = (ir: CaseIR, w: string[]) => {
    if (!ir.alternativePaths) ir.alternativePaths = [];
    setCaseIr(ir); setWarnings(w); setSelection(null);
  };

  const handlePatch = useCallback((patch: JsonPatch) => {
    if (!caseIr) return;
    try {
      const updated = applyCaseIRPatch(caseIr, patch);
      if (!updated.alternativePaths) updated.alternativePaths = [];
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

  const handleSelectTrigger = useCallback(() => { setSelection({ kind: "trigger" }); setPropsCollapsed(false); }, []);
  const handleSelectEndEvent = useCallback(() => { setSelection({ kind: "endEvent" }); setPropsCollapsed(false); }, []);
  const handleSelectProcess = useCallback(() => { setSelection({ kind: "process" }); setPropsCollapsed(false); }, []);
  const handleSelectBoundaryEvent = useCallback((stageId: string, groupId: string, stepId: string, boundaryEventId: string) =>
    { setSelection({ kind: "boundaryEvent", stageId, groupId, stepId, boundaryEventId }); setPropsCollapsed(false); }, []);

  const handleSelectStage = useCallback((stageId: string) => { setSelection({ kind: "stage", stageId }); setPropsCollapsed(false); }, []);

  const handleSelectGroup = useCallback((stageId: string, groupId: string) =>
    { setSelection({ kind: "group", stageId, groupId }); setPropsCollapsed(false); }, []);

  const handleSelectStep = useCallback((stageId: string, groupId: string, stepId: string) =>
    { setSelection({ kind: "step", stageId, groupId, stepId }); setPropsCollapsed(false); }, []);

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

  // ── Alt Path handlers ───────────────────────────────────────────────────────
  const handleAddAltStage = useCallback(() => {
    if (!caseIr) return;
    if (!caseIr.alternativePaths) {
      handlePatch([
        { op: "add", path: "/alternativePaths", value: [{ id: uid(), name: "New Alt Stage", groups: [{ id: uid(), name: "Main", steps: [] }] }] },
      ]);
    } else {
      handlePatch([{ op: "add", path: "/alternativePaths/-", value: { id: uid(), name: "New Alt Stage", groups: [{ id: uid(), name: "Main", steps: [] }] } }]);
    }
  }, [caseIr, handlePatch]);

  const handleAddAltGroup = useCallback((stageId: string) => {
    if (!caseIr?.alternativePaths) return;
    const si = caseIr.alternativePaths.findIndex(s => s.id === stageId);
    if (si < 0) return;
    handlePatch([{ op: "add", path: `/alternativePaths/${si}/groups/-`, value: { id: uid(), name: "New Group", steps: [] } }]);
  }, [caseIr, handlePatch]);

  const handleAddAltStep = useCallback((stageId: string, groupId: string) => {
    if (!caseIr?.alternativePaths) return;
    const si = caseIr.alternativePaths.findIndex(s => s.id === stageId);
    if (si < 0) return;
    const gi = caseIr.alternativePaths[si].groups.findIndex(g => g.id === groupId);
    if (gi < 0) return;
    const newStep = { id: uid(), name: "New Task", type: "automation" as StepType };
    handlePatch([{ op: "add", path: `/alternativePaths/${si}/groups/${gi}/steps/-`, value: newStep }]);
  }, [caseIr, handlePatch]);

  const handleDeleteAltStage = useCallback((stageId: string) => {
    if (!caseIr?.alternativePaths) return;
    const si = caseIr.alternativePaths.findIndex(s => s.id === stageId);
    if (si < 0) return;
    handlePatch([{ op: "remove", path: `/alternativePaths/${si}` }]);
    setSelection(null);
  }, [caseIr, handlePatch]);

  const handleDeleteAltGroup = useCallback((stageId: string, groupId: string) => {
    if (!caseIr?.alternativePaths) return;
    const si = caseIr.alternativePaths.findIndex(s => s.id === stageId);
    if (si < 0) return;
    const gi = caseIr.alternativePaths[si].groups.findIndex(g => g.id === groupId);
    if (gi < 0) return;
    handlePatch([{ op: "remove", path: `/alternativePaths/${si}/groups/${gi}` }]);
    setSelection(null);
  }, [caseIr, handlePatch]);

  const handleDeleteAltStep = useCallback((stageId: string, groupId: string, stepId: string) => {
    if (!caseIr?.alternativePaths) return;
    const si = caseIr.alternativePaths.findIndex(s => s.id === stageId);
    if (si < 0) return;
    const gi = caseIr.alternativePaths[si].groups.findIndex(g => g.id === groupId);
    if (gi < 0) return;
    const sti = caseIr.alternativePaths[si].groups[gi].steps.findIndex(s => s.id === stepId);
    if (sti < 0) return;
    handlePatch([{ op: "remove", path: `/alternativePaths/${si}/groups/${gi}/steps/${sti}` }]);
    setSelection(null);
  }, [caseIr, handlePatch]);

  const handleDuplicateAltStep = useCallback((stageId: string, groupId: string, stepId: string) => {
    if (!caseIr?.alternativePaths) return;
    const si = caseIr.alternativePaths.findIndex(s => s.id === stageId);
    if (si < 0) return;
    const gi = caseIr.alternativePaths[si].groups.findIndex(g => g.id === groupId);
    if (gi < 0) return;
    const step = caseIr.alternativePaths[si].groups[gi].steps.find(s => s.id === stepId);
    if (!step) return;
    handlePatch([{ op: "add", path: `/alternativePaths/${si}/groups/${gi}/steps/-`, value: { ...step, id: uid(), name: `${step.name} (copy)` } }]);
  }, [caseIr, handlePatch]);

  const handleDuplicateAltStage = useCallback((stageId: string) => {
    if (!caseIr?.alternativePaths) return;
    const stage = caseIr.alternativePaths.find(s => s.id === stageId);
    if (!stage) return;
    const cloned = { ...stage, id: uid(), name: `${stage.name} (copy)`, groups: stage.groups.map(g => ({ ...g, id: uid(), steps: g.steps.map(s => ({ ...s, id: uid() })) })) };
    handlePatch([{ op: "add", path: "/alternativePaths/-", value: cloned }]);
  }, [caseIr, handlePatch]);

  const handleMoveAltStage = useCallback((stageId: string, dir: -1 | 1) => {
    if (!caseIr?.alternativePaths) return;
    const si = caseIr.alternativePaths.findIndex(s => s.id === stageId);
    const ti = si + dir;
    if (si < 0 || ti < 0 || ti >= caseIr.alternativePaths.length) return;
    handlePatch([{ op: "move", path: `/alternativePaths/${ti}`, from: `/alternativePaths/${si}` }]);
  }, [caseIr, handlePatch]);

  const handleMoveAltStep = useCallback((stageId: string, groupId: string, stepId: string, dir: -1 | 1) => {
    if (!caseIr?.alternativePaths) return;
    const si = caseIr.alternativePaths.findIndex(s => s.id === stageId);
    if (si < 0) return;
    const gi = caseIr.alternativePaths[si].groups.findIndex(g => g.id === groupId);
    if (gi < 0) return;
    const sti = caseIr.alternativePaths[si].groups[gi].steps.findIndex(s => s.id === stepId);
    const ti = sti + dir;
    if (sti < 0 || ti < 0 || ti >= caseIr.alternativePaths[si].groups[gi].steps.length) return;
    handlePatch([{ op: "move", path: `/alternativePaths/${si}/groups/${gi}/steps/${ti}`, from: `/alternativePaths/${si}/groups/${gi}/steps/${sti}` }]);
  }, [caseIr, handlePatch]);

  const handleMoveAltGroup = useCallback((stageId: string, groupId: string, dir: -1 | 1) => {
    if (!caseIr?.alternativePaths) return;
    const si = caseIr.alternativePaths.findIndex(s => s.id === stageId);
    if (si < 0) return;
    const gi = caseIr.alternativePaths[si].groups.findIndex(g => g.id === groupId);
    const ti = gi + dir;
    if (gi < 0 || ti < 0 || ti >= caseIr.alternativePaths[si].groups.length) return;
    handlePatch([{ op: "move", path: `/alternativePaths/${si}/groups/${ti}`, from: `/alternativePaths/${si}/groups/${gi}` }]);
  }, [caseIr, handlePatch]);

  const handleAddBoundaryEvent = useCallback((stageId: string, groupId: string, stepId: string, eventType: BoundaryEventType) => {
    if (!caseIr) return;
    let basePath = "";
    let si = caseIr.stages.findIndex(s => s.id === stageId);
    if (si >= 0) {
      basePath = `/stages/${si}`;
    } else if (caseIr.alternativePaths) {
      si = caseIr.alternativePaths.findIndex(s => s.id === stageId);
      if (si >= 0) basePath = `/alternativePaths/${si}`;
    }
    if (!basePath) return;
    const stageArr = basePath.startsWith("/stages") ? caseIr.stages : caseIr.alternativePaths!;
    const gi = stageArr[si].groups.findIndex(g => g.id === groupId);
    if (gi < 0) return;
    const sti = stageArr[si].groups[gi].steps.findIndex(s => s.id === stepId);
    if (sti < 0) return;
    const step = stageArr[si].groups[gi].steps[sti];
    const existingCount = step.boundaryEvents?.length ?? 0;
    const newBe = {
      id: uid(),
      name: `${eventType.charAt(0).toUpperCase() + eventType.slice(1)} Handler`,
      eventType,
      cancelActivity: true,
    };
    if (existingCount === 0) {
      handlePatch([{ op: "add", path: `${basePath}/groups/${gi}/steps/${sti}/boundaryEvents`, value: [newBe] }]);
    } else {
      handlePatch([{ op: "add", path: `${basePath}/groups/${gi}/steps/${sti}/boundaryEvents/-`, value: newBe }]);
    }
    setSelection({ kind: "boundaryEvent", stageId, groupId, stepId, boundaryEventId: newBe.id });
  }, [caseIr, handlePatch]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <Toolbar caseIr={caseIr} onImportBpmn={handleImportBpmn} onLoadSample={() => {}} />

      {warnings.length > 0 && (
        <div className="warning-banner flex items-center gap-2 px-4 py-1.5 text-[12px] flex-shrink-0">
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
                onAddBoundaryEvent={handleAddBoundaryEvent}
                onAddAltStage={handleAddAltStage}
                onAddAltGroup={handleAddAltGroup}
                onAddAltStep={handleAddAltStep}
                onDeleteAltStage={handleDeleteAltStage}
                onDeleteAltGroup={handleDeleteAltGroup}
                onDeleteAltStep={handleDeleteAltStep}
                onDuplicateAltStep={handleDuplicateAltStep}
                onDuplicateAltStage={handleDuplicateAltStage}
                onMoveAltStage={handleMoveAltStage}
                onMoveAltGroup={handleMoveAltGroup}
                onMoveAltStep={handleMoveAltStep}
              />
            </div>
            <PropertiesPanel
              caseIr={caseIr}
              selection={selection}
              onClose={() => setSelection(null)}
              onPatch={handlePatch}
              collapsed={propsCollapsed}
              onToggleCollapse={() => setPropsCollapsed(c => !c)}
            />
          </>
        ) : (
          <EmptyState onImport={handleImportBpmn} />
        )}
      </div>
    </div>
  );
}
