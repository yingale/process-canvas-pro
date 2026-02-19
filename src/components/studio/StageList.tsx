/**
 * StageList – left sidebar: Section → Groups → Steps
 */
import { useState } from "react";
import {
  ChevronDown, ChevronRight, Plus, Trash2, ArrowLeft, ArrowRight
} from "lucide-react";
import type { CaseIR, SelectionTarget, StepType } from "@/types/caseIr";
import { STEP_TYPE_CONFIG } from "./FlowNodes";
import { STAGE_COLORS } from "./flowBuilder";
import type { JsonPatch } from "@/types/caseIr";

interface StageListProps {
  caseIr: CaseIR;
  selection: SelectionTarget;
  onSelect: (sel: SelectionTarget) => void;
  onPatch: (patch: JsonPatch) => void;
}

const STEP_TYPE_OPTIONS: StepType[] = ["automation", "user", "decision", "foreach", "callActivity"];

function uid() {
  return `el_${Math.random().toString(36).slice(2, 8)}`;
}

export default function StageList({ caseIr, selection, onSelect, onPatch }: StageListProps) {
  const [collapsedStages, setCollapsedStages] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [addingStepTo, setAddingStepTo] = useState<{ stageId: string; groupId: string } | null>(null);

  const toggleStage = (id: string) =>
    setCollapsedStages(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleGroup = (id: string) =>
    setCollapsedGroups(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const addStage = () => {
    const newStage = {
      id: uid(), name: "New Stage",
      groups: [{ id: uid(), name: "Main", steps: [] }],
    };
    onPatch([{ op: "add", path: "/stages/-", value: newStage }]);
  };

  const deleteStage = (si: number, e: React.MouseEvent) => {
    e.stopPropagation();
    onPatch([{ op: "remove", path: `/stages/${si}` }]);
    onSelect(null);
  };

  const moveStage = (si: number, dir: -1 | 1, e: React.MouseEvent) => {
    e.stopPropagation();
    const ti = si + dir;
    if (ti < 0 || ti >= caseIr.stages.length) return;
    onPatch([{ op: "move", path: `/stages/${ti}`, from: `/stages/${si}` }]);
  };

  const addStep = (si: number, gi: number, type: StepType) => {
    const newStep: Record<string, unknown> = {
      id: uid(), name: `New ${STEP_TYPE_CONFIG[type].label}`, type,
    };
    if (type === "decision") newStep.branches = [];
    if (type === "foreach") { newStep.collectionExpression = "${items}"; newStep.elementVariable = "item"; newStep.steps = []; }
    if (type === "callActivity") newStep.calledElement = "";
    if (type === "intermediateEvent") { newStep.eventSubType = "message"; }
    onPatch([{ op: "add", path: `/stages/${si}/groups/${gi}/steps/-`, value: newStep }]);
    setAddingStepTo(null);
  };

  const deleteStep = (si: number, gi: number, sti: number, e: React.MouseEvent) => {
    e.stopPropagation();
    onPatch([{ op: "remove", path: `/stages/${si}/groups/${gi}/steps/${sti}` }]);
    onSelect(null);
  };

  return (
    <div
      className="h-full flex flex-col border-r"
      style={{ background: "hsl(var(--sidebar-background))", borderColor: "hsl(var(--border))", width: 260, minWidth: 260 }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "hsl(var(--border))" }}>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-foreground-muted">Process</div>
          <div className="text-sm font-semibold text-foreground mt-0.5 truncate max-w-[170px]">{caseIr.name}</div>
        </div>
        <div className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: "hsl(var(--primary-dim))", color: "hsl(var(--primary))" }}>
          v{caseIr.version}
        </div>
      </div>

      {/* Trigger */}
      <div className="px-4 py-2 border-b" style={{ borderColor: "hsl(var(--border-subtle))" }}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: "hsl(var(--primary))" }} />
          <span className="text-[11px] text-foreground-muted">
            Trigger: <span className="text-foreground capitalize">{caseIr.trigger.type}</span>
            {caseIr.trigger.expression && <span className="font-mono ml-1 text-foreground-subtle">({caseIr.trigger.expression})</span>}
          </span>
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-2">
        {caseIr.stages.map((stage, si) => {
          const stageCollapsed = collapsedStages.has(stage.id);
          const isStageSelected = selection?.kind === "stage" && selection.stageId === stage.id;
          const stageColor = STAGE_COLORS[si % STAGE_COLORS.length];

          return (
            <div key={stage.id} className="mb-1">
              {/* Stage row */}
              <div
                className="group flex items-center gap-1 px-3 py-2 cursor-pointer transition-colors"
                style={{ background: isStageSelected ? `${stageColor}18` : "transparent" }}
                onMouseEnter={e => { if (!isStageSelected) e.currentTarget.style.background = "hsl(var(--sidebar-accent))"; }}
                onMouseLeave={e => { if (!isStageSelected) e.currentTarget.style.background = isStageSelected ? `${stageColor}18` : "transparent"; }}
                onClick={() => onSelect({ kind: "stage", stageId: stage.id })}
              >
                <button className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded text-foreground-muted hover:text-foreground"
                  onClick={e => { e.stopPropagation(); toggleStage(stage.id); }}>
                  {stageCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                </button>
                <div className="flex-shrink-0 w-2 h-2 rounded-sm" style={{ background: stageColor }} />
                <span className="flex-1 text-[13px] font-semibold text-foreground truncate">{stage.name}</span>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="w-5 h-5 flex items-center justify-center rounded hover:bg-surface-overlay text-foreground-muted hover:text-foreground"
                    onClick={e => moveStage(si, -1, e)} title="Move left"><ArrowLeft size={11} /></button>
                  <button className="w-5 h-5 flex items-center justify-center rounded hover:bg-surface-overlay text-foreground-muted hover:text-foreground"
                    onClick={e => moveStage(si, 1, e)} title="Move right"><ArrowRight size={11} /></button>
                  <button className="w-5 h-5 flex items-center justify-center rounded hover:bg-destructive/20 text-foreground-muted hover:text-destructive"
                    onClick={e => deleteStage(si, e)} title="Delete"><Trash2 size={11} /></button>
                </div>
              </div>

              {/* Groups */}
              {!stageCollapsed && (
                <div className="ml-4">
                  {stage.groups.map((group, gi) => {
                    const groupCollapsed = collapsedGroups.has(group.id);
                    const isGroupSel = selection?.kind === "group" && selection.groupId === group.id;
                    return (
                      <div key={group.id} className="mb-0.5">
                        {/* Group row */}
                        <div
                          className="group flex items-center gap-1 px-2 py-1.5 cursor-pointer rounded-md mx-1 transition-colors"
                          style={{ background: isGroupSel ? "hsl(var(--sidebar-accent))" : "transparent" }}
                          onMouseEnter={e => { if (!isGroupSel) e.currentTarget.style.background = "hsl(var(--sidebar-accent))"; }}
                          onMouseLeave={e => { if (!isGroupSel) e.currentTarget.style.background = "transparent"; }}
                          onClick={() => onSelect({ kind: "group", stageId: stage.id, groupId: group.id })}
                        >
                          <button className="flex-shrink-0 w-3 h-3 flex items-center justify-center text-foreground-subtle"
                            onClick={e => { e.stopPropagation(); toggleGroup(group.id); }}>
                            {groupCollapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
                          </button>
                          <div className="flex-shrink-0 w-1.5 h-1.5 rounded-sm border" style={{ borderColor: stageColor }} />
                          <span className="flex-1 text-[11px] font-medium text-foreground-muted truncate">{group.name}</span>
                          <span className="text-[9px] font-mono text-foreground-subtle opacity-0 group-hover:opacity-100">
                            {group.steps.length}
                          </span>
                        </div>

                        {/* Steps */}
                        {!groupCollapsed && (
                          <div className="ml-5">
                            {group.steps.map((step, sti) => {
                              const cfg = STEP_TYPE_CONFIG[step.type];
                              const isStepSel = selection?.kind === "step" && selection.stepId === step.id;
                              return (
                                <div
                                  key={step.id}
                                  className="group flex items-center gap-2 px-2 py-1 cursor-pointer transition-colors rounded mx-1"
                                  style={{ background: isStepSel ? `color-mix(in srgb, ${cfg.colorVar} 15%, transparent)` : "transparent" }}
                                  onMouseEnter={e => { if (!isStepSel) e.currentTarget.style.background = "hsl(var(--sidebar-accent))"; }}
                                  onMouseLeave={e => { if (!isStepSel) e.currentTarget.style.background = "transparent"; }}
                                  onClick={() => onSelect({ kind: "step", stageId: stage.id, groupId: group.id, stepId: step.id })}
                                >
                                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.colorVar }} />
                                  <span className="flex-1 text-[11px] text-foreground truncate">{step.name}</span>
                                  <button className="w-4 h-4 flex items-center justify-center rounded hover:bg-destructive/20 text-foreground-muted hover:text-destructive opacity-0 group-hover:opacity-100"
                                    onClick={e => deleteStep(si, gi, sti, e)}><Trash2 size={9} /></button>
                                </div>
                              );
                            })}

                            {/* Add step */}
                            {addingStepTo?.groupId === group.id ? (
                              <div className="mx-1 my-1 p-2 rounded-lg border" style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--surface-overlay))" }}>
                                <p className="text-[10px] text-foreground-muted mb-1.5">Step type:</p>
                                <div className="grid grid-cols-2 gap-1">
                                  {STEP_TYPE_OPTIONS.map(type => {
                                    const cfg = STEP_TYPE_CONFIG[type];
                                    return (
                                      <button key={type}
                                        className="px-2 py-1 rounded text-[10px] font-medium text-left"
                                        style={{ background: `color-mix(in srgb, ${cfg.colorVar} 12%, hsl(var(--surface)))`, color: cfg.colorVar }}
                                        onClick={() => addStep(si, gi, type)}>
                                        {cfg.label}
                                      </button>
                                    );
                                  })}
                                </div>
                                <button className="mt-1.5 text-[10px] text-foreground-subtle w-full text-center"
                                  onClick={() => setAddingStepTo(null)}>Cancel</button>
                              </div>
                            ) : (
                              <button
                                className="flex items-center gap-1 px-2 py-1 text-[10px] text-foreground-subtle hover:text-foreground transition-colors w-full"
                                onClick={() => setAddingStepTo({ stageId: stage.id, groupId: group.id })}
                              >
                                <Plus size={9} /> Add step
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add stage */}
      <div className="p-3 border-t" style={{ borderColor: "hsl(var(--border))" }}>
        <button
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all"
          style={{ background: "hsl(var(--surface-raised))", color: "hsl(var(--foreground-muted))", border: "1px dashed hsl(var(--border))" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "hsl(var(--primary))"; e.currentTarget.style.color = "hsl(var(--primary))"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "hsl(var(--border))"; e.currentTarget.style.color = "hsl(var(--foreground-muted))"; }}
          onClick={addStage}
        >
          <Plus size={14} /> Add Stage
        </button>
      </div>
    </div>
  );
}
