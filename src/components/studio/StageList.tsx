/**
 * StageList – left sidebar showing all stages and steps
 */
import { useState } from "react";
import {
  ChevronDown, ChevronRight, Plus, Trash2, ArrowLeft, ArrowRight, ArrowUp, ArrowDown
} from "lucide-react";
import type { CaseIR, Stage, Step, SelectionTarget, StepType } from "@/types/caseIr";
import { STEP_TYPE_CONFIG } from "./FlowNodes";
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
  const [addingStepTo, setAddingStepTo] = useState<string | null>(null);

  const toggleCollapse = (stageId: string) => {
    setCollapsedStages(prev => {
      const next = new Set(prev);
      next.has(stageId) ? next.delete(stageId) : next.add(stageId);
      return next;
    });
  };

  const addStage = () => {
    const newStage = { id: uid(), name: "New Stage", steps: [] };
    onPatch([{ op: "add", path: "/stages/-", value: newStage }]);
  };

  const deleteStage = (stageIdx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    onPatch([{ op: "remove", path: `/stages/${stageIdx}` }]);
    onSelect(null);
  };

  const moveStage = (stageIdx: number, dir: -1 | 1, e: React.MouseEvent) => {
    e.stopPropagation();
    const targetIdx = stageIdx + dir;
    if (targetIdx < 0 || targetIdx >= caseIr.stages.length) return;
    onPatch([{ op: "move", path: `/stages/${targetIdx}`, from: `/stages/${stageIdx}` }]);
  };

  const addStep = (stageIdx: number, type: StepType) => {
    const newStep: Record<string, unknown> = {
      id: uid(),
      name: `New ${STEP_TYPE_CONFIG[type].label}`,
      type,
    };
    if (type === "decision") newStep.branches = [];
    if (type === "foreach") { newStep.collectionExpression = "${items}"; newStep.elementVariable = "item"; newStep.steps = []; }
    if (type === "callActivity") newStep.calledElement = "";
    onPatch([{ op: "add", path: `/stages/${stageIdx}/steps/-`, value: newStep }]);
    setAddingStepTo(null);
  };

  const deleteStep = (stageIdx: number, stepIdx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    onPatch([{ op: "remove", path: `/stages/${stageIdx}/steps/${stepIdx}` }]);
    onSelect(null);
  };

  const moveStep = (stageIdx: number, stepIdx: number, dir: -1 | 1, e: React.MouseEvent) => {
    e.stopPropagation();
    const targetIdx = stepIdx + dir;
    const stage = caseIr.stages[stageIdx];
    if (targetIdx < 0 || targetIdx >= stage.steps.length) return;
    onPatch([{ op: "move", path: `/stages/${stageIdx}/steps/${targetIdx}`, from: `/stages/${stageIdx}/steps/${stepIdx}` }]);
  };

  return (
    <div
      className="h-full flex flex-col border-r"
      style={{
        background: "hsl(var(--sidebar-background))",
        borderColor: "hsl(var(--border))",
        width: 260,
        minWidth: 260,
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 border-b flex items-center justify-between"
        style={{ borderColor: "hsl(var(--border))" }}
      >
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-foreground-muted">Process</div>
          <div className="text-sm font-semibold text-foreground mt-0.5 truncate max-w-[170px]">{caseIr.name}</div>
        </div>
        <div
          className="text-[10px] font-mono px-2 py-0.5 rounded"
          style={{ background: "hsl(var(--primary-dim))", color: "hsl(var(--primary))" }}
        >
          v{caseIr.version}
        </div>
      </div>

      {/* Trigger info */}
      <div className="px-4 py-2 border-b" style={{ borderColor: "hsl(var(--border-subtle))" }}>
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: "hsl(var(--primary))" }}
          />
          <span className="text-[11px] text-foreground-muted">
            Trigger: <span className="text-foreground capitalize">{caseIr.trigger.type}</span>
            {caseIr.trigger.expression && (
              <span className="font-mono ml-1 text-foreground-subtle">({caseIr.trigger.expression})</span>
            )}
          </span>
        </div>
      </div>

      {/* Stages list */}
      <div className="flex-1 overflow-y-auto py-2">
        {caseIr.stages.map((stage, si) => {
          const isCollapsed = collapsedStages.has(stage.id);
          const isStageSelected = selection?.stageId === stage.id;

          return (
            <div key={stage.id} className="mb-1">
              {/* Stage row */}
              <div
                className="group flex items-center gap-1 px-3 py-2 cursor-pointer transition-colors"
                style={{
                  background: isStageSelected && selection?.kind === "stage"
                    ? "hsl(var(--primary-dim))"
                    : "transparent",
                }}
                onMouseEnter={e => {
                  if (!(isStageSelected && selection?.kind === "stage"))
                    e.currentTarget.style.background = "hsl(var(--sidebar-accent))";
                }}
                onMouseLeave={e => {
                  if (!(isStageSelected && selection?.kind === "stage"))
                    e.currentTarget.style.background = "transparent";
                }}
                onClick={() => onSelect({ kind: "stage", stageId: stage.id })}
              >
                <button
                  className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded text-foreground-muted hover:text-foreground"
                  onClick={e => { e.stopPropagation(); toggleCollapse(stage.id); }}
                >
                  {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                </button>

                <div
                  className="flex-shrink-0 w-1.5 h-4 rounded-full"
                  style={{ background: "hsl(var(--primary))", opacity: 0.7 }}
                />

                <span className="flex-1 text-[13px] font-medium text-foreground truncate">{stage.name}</span>

                {/* Stage actions */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-surface-overlay text-foreground-muted hover:text-foreground"
                    onClick={e => moveStage(si, -1, e)}
                    title="Move left"
                  >
                    <ArrowLeft size={11} />
                  </button>
                  <button
                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-surface-overlay text-foreground-muted hover:text-foreground"
                    onClick={e => moveStage(si, 1, e)}
                    title="Move right"
                  >
                    <ArrowRight size={11} />
                  </button>
                  <button
                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-destructive/20 text-foreground-muted hover:text-destructive"
                    onClick={e => deleteStage(si, e)}
                    title="Delete stage"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>

              {/* Steps */}
              {!isCollapsed && (
                <div className="ml-6">
                  {stage.steps.map((step, stepIdx) => {
                    const cfg = STEP_TYPE_CONFIG[step.type];
                    const isStepSelected = selection?.kind === "step" && selection.stepId === step.id;
                    return (
                      <div
                        key={step.id}
                        className="group flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors rounded-md mx-1"
                        style={{
                          background: isStepSelected ? `color-mix(in srgb, ${cfg.colorVar} 15%, transparent)` : "transparent",
                        }}
                        onMouseEnter={e => {
                          if (!isStepSelected) e.currentTarget.style.background = "hsl(var(--sidebar-accent))";
                        }}
                        onMouseLeave={e => {
                          if (!isStepSelected) e.currentTarget.style.background = "transparent";
                        }}
                        onClick={() => onSelect({ kind: "step", stageId: stage.id, stepId: step.id })}
                      >
                        <div
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ background: cfg.colorVar }}
                        />
                        <span className="flex-1 text-[12px] text-foreground truncate">{step.name}</span>

                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            className="w-5 h-5 flex items-center justify-center rounded hover:bg-surface-overlay text-foreground-muted hover:text-foreground"
                            onClick={e => moveStep(si, stepIdx, -1, e)}
                            title="Move up"
                          >
                            <ArrowUp size={10} />
                          </button>
                          <button
                            className="w-5 h-5 flex items-center justify-center rounded hover:bg-surface-overlay text-foreground-muted hover:text-foreground"
                            onClick={e => moveStep(si, stepIdx, 1, e)}
                            title="Move down"
                          >
                            <ArrowDown size={10} />
                          </button>
                          <button
                            className="w-5 h-5 flex items-center justify-center rounded hover:bg-destructive/20 text-foreground-muted hover:text-destructive"
                            onClick={e => deleteStep(si, stepIdx, e)}
                            title="Delete step"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Add step */}
                  {addingStepTo === stage.id ? (
                    <div className="mx-1 my-1 p-2 rounded-lg border" style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--surface-overlay))" }}>
                      <p className="text-[10px] text-foreground-muted mb-2">Choose step type:</p>
                      <div className="grid grid-cols-2 gap-1">
                        {STEP_TYPE_OPTIONS.map(type => {
                          const cfg = STEP_TYPE_CONFIG[type];
                          return (
                            <button
                              key={type}
                              className="px-2 py-1.5 rounded text-[11px] font-medium text-left transition-colors"
                              style={{ background: `color-mix(in srgb, ${cfg.colorVar} 12%, hsl(var(--surface)))`, color: cfg.colorVar }}
                              onClick={() => addStep(si, type)}
                            >
                              {cfg.label}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        className="mt-2 text-[10px] text-foreground-subtle w-full text-center"
                        onClick={() => setAddingStepTo(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-foreground-muted hover:text-foreground transition-colors w-full"
                      onClick={() => setAddingStepTo(stage.id)}
                    >
                      <Plus size={10} />
                      Add step
                    </button>
                  )}
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
          style={{
            background: "hsl(var(--surface-raised))",
            color: "hsl(var(--foreground-muted))",
            border: "1px dashed hsl(var(--border))",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = "hsl(var(--primary))";
            e.currentTarget.style.color = "hsl(var(--primary))";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = "hsl(var(--border))";
            e.currentTarget.style.color = "hsl(var(--foreground-muted))";
          }}
          onClick={addStage}
        >
          <Plus size={14} />
          Add Stage
        </button>
      </div>
    </div>
  );
}
