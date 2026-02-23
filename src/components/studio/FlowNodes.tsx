/**
 * Custom React Flow nodes for the Pega-style workflow diagram
 */
import { Handle, Position, type NodeProps } from "reactflow";
import { Bot, User, GitBranch, Repeat2, ExternalLink, Zap, Plus, Bell, type LucideIcon } from "lucide-react";
import type { Step, StepType } from "@/types/caseIr";
import "./studio.css";

// ─── Step type configuration ──────────────────────────────────────────────────

export const STEP_TYPE_CONFIG: Record<StepType, { label: string; icon: LucideIcon; colorVar: string }> = {
  automation:       { label: "Automation",   icon: Bot,          colorVar: "hsl(var(--step-automation))" },
  user:             { label: "User",          icon: User,         colorVar: "hsl(var(--step-user))" },
  decision:         { label: "Decision",      icon: GitBranch,    colorVar: "hsl(var(--step-decision))" },
  foreach:          { label: "For Each",      icon: Repeat2,      colorVar: "hsl(var(--step-foreach))" },
  callActivity:     { label: "Subprocess",    icon: ExternalLink, colorVar: "hsl(var(--step-call))" },
  intermediateEvent:{ label: "Wait / Event",  icon: Bell,         colorVar: "hsl(var(--step-event, 199 80% 42%))" },
};

// ─── Step card node ───────────────────────────────────────────────────────────

export interface StepNodeData {
  step: Step;
  stageId: string;
  stageColor: string;
  selected?: boolean;
  onSelect: (stageId: string, stepId: string) => void;
}

export function StepNode({ data }: NodeProps<StepNodeData>) {
  const { step, stageId, stageColor, selected, onSelect } = data;
  const cfg = STEP_TYPE_CONFIG[step.type];
  const Icon = cfg.icon;

  return (
    <div
      className="flow-node-step cursor-pointer group"
      onClick={() => onSelect(stageId, step.id)}
    >
      <Handle type="target" position={Position.Top} className="opacity-0" />

      <div
        className={`flow-step-card rounded border transition-all duration-150 ${selected ? "flow-step-card--selected" : "flow-step-card--default"}`}
        style={{ "--dynamic-color": stageColor } as React.CSSProperties}
      >
        <div className="px-3 py-2.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Icon size={11} className="text-foreground-muted" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
              {cfg.label}
            </span>
          </div>

          <p className="text-[12px] font-medium leading-snug line-clamp-2 text-foreground">
            {step.name}
          </p>

          {step.type === "decision" && step.branches.length > 0 && (
            <div className="mt-1.5 space-y-0.5">
              {step.branches.slice(0, 2).map(b => (
                <div key={b.id} className="flex items-center gap-1">
                  <div className="w-1 h-1 rounded-full opacity-60" style={{ "--dynamic-color": stageColor, background: "var(--dynamic-color)" } as React.CSSProperties} />
                  <span className="text-[9px] truncate text-foreground-muted">{b.label}</span>
                </div>
              ))}
              {step.branches.length > 2 && (
                <span className="text-[9px] text-foreground-subtle">+{step.branches.length - 2} more</span>
              )}
            </div>
          )}

          {step.type === "foreach" && (
            <div className="mt-1 font-mono text-[9px] truncate text-foreground-muted">
              ∀ {step.collectionExpression}
            </div>
          )}

          {step.type === "callActivity" && step.calledElement && (
            <div className="mt-1 font-mono text-[9px] truncate text-foreground-muted">
              → {step.calledElement}
            </div>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
}

// ─── Stage chevron header node ────────────────────────────────────────────────

export interface StageHeaderNodeData {
  stageName: string;
  stageId: string;
  stepCount: number;
  stageIndex: number;
  stageColor: string;
  isFirst: boolean;
  isLast: boolean;
  selected?: boolean;
  onSelect: (stageId: string) => void;
}

export function StageHeaderNode({ data }: NodeProps<StageHeaderNodeData>) {
  const { stageName, stageId, stageColor, isFirst, selected, onSelect } = data;

  const W = 200;
  const H = 52;
  const indent = isFirst ? 0 : 18;
  const point = 18;

  const clipPath = isFirst
    ? `polygon(0 0, ${W - point}px 0, ${W}px 50%, ${W - point}px 100%, 0 100%)`
    : `polygon(${indent}px 0, ${W - point}px 0, ${W}px 50%, ${W - point}px 100%, ${indent}px 100%, 0 50%)`;

  return (
    <div
      className="stage-header-node cursor-pointer select-none"
      onClick={() => onSelect(stageId)}
    >
      <Handle type="target" position={Position.Left} className="opacity-0" />

      <div
        className={`stage-header-chevron ${isFirst ? "stage-header-chevron--first" : "stage-header-chevron--notfirst"} stage-header-chevron-pr ${selected ? "stage-header-chevron--selected" : ""}`}
        style={{ "--dynamic-color": stageColor, "--clip-path": clipPath } as React.CSSProperties}
      >
        <div className="flex-1 min-w-0">
          <div className="stage-header-label-sup">Stage</div>
          <div className="stage-header-label-main">{stageName}</div>
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="opacity-0" />
    </div>
  );
}

// ─── Add Step button node ─────────────────────────────────────────────────────

export interface AddStepNodeData {
  stageId: string;
  stageColor: string;
  onAddStep: (stageId: string) => void;
}

export function AddStepNode({ data }: NodeProps<AddStepNodeData>) {
  const { stageId, stageColor, onAddStep } = data;

  return (
    <div className="flow-node-add-step">
      <button
        className="flow-add-step-btn w-full flex items-center justify-center gap-2 rounded border-dashed border transition-all duration-150 py-2"
        style={{ "--dynamic-color": stageColor } as React.CSSProperties}
        onClick={() => onAddStep(stageId)}
      >
        <Plus size={12} />
        Add Step
      </button>
    </div>
  );
}

// ─── Add Stage button node ────────────────────────────────────────────────────

export interface AddStageNodeData {
  onAddStage: () => void;
}

export function AddStageNode({ data }: NodeProps<AddStageNodeData>) {
  const { onAddStage } = data;

  return (
    <div className="flow-add-stage-node">
      <button
        className="flow-add-stage-btn w-full h-full rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all duration-150"
        onClick={onAddStage}
        title="Add new stage"
      >
        <Plus size={18} />
        <span className="text-[9px] mt-0.5">Stage</span>
      </button>
    </div>
  );
}

// ─── Trigger node ─────────────────────────────────────────────────────────────

export interface TriggerNodeData {
  triggerType: string;
  expression?: string;
  name?: string;
}

export function TriggerNode({ data }: NodeProps<TriggerNodeData>) {
  return (
    <div className="flow-trigger-node">
      <div className="flow-trigger-pill">
        <span className="flow-trigger-label">
          {data.triggerType === "none" ? "Start" : data.triggerType}
        </span>
      </div>
      <Handle type="source" position={Position.Right} className="opacity-0" />
    </div>
  );
}

// ─── End node ─────────────────────────────────────────────────────────────────

export function EndNode() {
  return (
    <div className="flow-end-node">
      <Handle type="target" position={Position.Left} className="opacity-0" />
      <div className="flow-end-pill">
        <span className="flow-end-label text-foreground-muted">End</span>
      </div>
    </div>
  );
}

// ─── Node types registry ──────────────────────────────────────────────────────

export const NODE_TYPES = {
  stepNode: StepNode,
  stageHeader: StageHeaderNode,
  triggerNode: TriggerNode,
  endNode: EndNode,
  addStepNode: AddStepNode,
  addStageNode: AddStageNode,
};
