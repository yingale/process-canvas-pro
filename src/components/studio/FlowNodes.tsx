/**
 * Custom React Flow nodes for the Pega-style workflow diagram
 */
import { Handle, Position, type NodeProps } from "reactflow";
import { Bot, User, GitBranch, Repeat2, ExternalLink, Zap, type LucideIcon } from "lucide-react";
import type { Step, StepType } from "@/types/caseIr";

// ─── Step type configuration ──────────────────────────────────────────────────

export const STEP_TYPE_CONFIG: Record<StepType, {
  label: string;
  icon: LucideIcon;
  colorVar: string;
}> = {
  automation: { label: "Automation", icon: Bot, colorVar: "hsl(var(--step-automation))" },
  user:        { label: "User",       icon: User, colorVar: "hsl(var(--step-user))" },
  decision:    { label: "Decision",   icon: GitBranch, colorVar: "hsl(var(--step-decision))" },
  foreach:     { label: "For Each",   icon: Repeat2, colorVar: "hsl(var(--step-foreach))" },
  callActivity:{ label: "Call",       icon: ExternalLink, colorVar: "hsl(var(--step-call))" },
};

// ─── Step card node ───────────────────────────────────────────────────────────

export interface StepNodeData {
  step: Step;
  stageId: string;
  selected?: boolean;
  onSelect: (stageId: string, stepId: string) => void;
}

export function StepNode({ data }: NodeProps<StepNodeData>) {
  const { step, stageId, selected, onSelect } = data;
  const cfg = STEP_TYPE_CONFIG[step.type];
  const Icon = cfg.icon;
  const color = cfg.colorVar;

  const hasTopic = step.type === "automation" && step.tech?.topic;
  const isAsync = step.tech?.asyncBefore || step.tech?.asyncAfter;

  return (
    <div
      className="relative cursor-pointer group"
      style={{ width: 200 }}
      onClick={() => onSelect(stageId, step.id)}
    >
      <Handle type="target" position={Position.Top} />

      <div
        className="rounded-lg border transition-all duration-150"
        style={{
          background: selected
            ? `color-mix(in srgb, ${color} 12%, hsl(var(--surface-raised)))`
            : "hsl(var(--surface-raised))",
          borderColor: selected ? color : "hsl(var(--border))",
          boxShadow: selected ? `0 0 0 1px ${color}` : "var(--shadow-card)",
        }}
      >
        {/* Color stripe */}
        <div
          className="h-0.5 rounded-t-lg"
          style={{ background: color }}
        />

        <div className="p-3">
          {/* Header row */}
          <div className="flex items-center gap-2 mb-1.5">
            <div
              className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
              style={{ background: `color-mix(in srgb, ${color} 15%, transparent)` }}
            >
              <Icon size={11} color={color} />
            </div>
            <span
              className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color }}
            >
              {cfg.label}
            </span>

            {/* Async indicator */}
            {isAsync && (
              <div className="ml-auto" title="Async">
                <Zap size={10} className="text-warning opacity-70" />
              </div>
            )}
          </div>

          {/* Step name */}
          <p className="text-[13px] font-medium text-foreground leading-snug line-clamp-2">
            {step.name}
          </p>

          {/* Tech details */}
          {hasTopic && (
            <div className="mt-1.5 font-mono text-[10px] text-foreground-muted truncate">
              {step.tech?.topic}
            </div>
          )}

          {/* Decision branches preview */}
          {step.type === "decision" && step.branches.length > 0 && (
            <div className="mt-2 space-y-1">
              {step.branches.slice(0, 3).map((b, i) => (
                <div key={b.id} className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: color, opacity: 0.7 }} />
                  <span className="text-[10px] text-foreground-muted truncate">{b.label}</span>
                  {i === 2 && step.branches.length > 3 && (
                    <span className="text-[10px] text-foreground-subtle">+{step.branches.length - 3}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Foreach badge */}
          {step.type === "foreach" && (
            <div className="mt-1.5 font-mono text-[10px] text-foreground-muted truncate">
              ∀ {step.collectionExpression}
            </div>
          )}

          {/* CallActivity badge */}
          {step.type === "callActivity" && step.calledElement && (
            <div className="mt-1.5 font-mono text-[10px] text-foreground-muted truncate">
              → {step.calledElement}
            </div>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

// ─── Stage header node ────────────────────────────────────────────────────────

export interface StageHeaderNodeData {
  stageName: string;
  stageId: string;
  stepCount: number;
  selected?: boolean;
  onSelect: (stageId: string) => void;
}

export function StageHeaderNode({ data }: NodeProps<StageHeaderNodeData>) {
  const { stageName, stageId, stepCount, selected, onSelect } = data;

  return (
    <div
      className="cursor-pointer"
      style={{ width: 220 }}
      onClick={() => onSelect(stageId)}
    >
      <div
        className="rounded-xl border-2 px-4 py-3 transition-all duration-150"
        style={{
          background: selected
            ? "color-mix(in srgb, hsl(var(--primary)) 10%, hsl(var(--surface)))"
            : "hsl(var(--surface))",
          borderColor: selected ? "hsl(var(--primary))" : "hsl(var(--border))",
          boxShadow: selected ? "var(--shadow-glow)" : "none",
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-widest text-foreground-muted">
            Stage
          </span>
          <span
            className="text-[10px] font-mono px-1.5 py-0.5 rounded"
            style={{
              background: "hsl(var(--primary-dim))",
              color: "hsl(var(--primary))",
            }}
          >
            {stepCount} step{stepCount !== 1 ? "s" : ""}
          </span>
        </div>
        <h3 className="mt-1 text-[15px] font-semibold text-foreground leading-tight">
          {stageName}
        </h3>
      </div>
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
    <div style={{ width: 160 }}>
      <div
        className="rounded-full border px-4 py-2 text-center"
        style={{
          background: "hsl(var(--surface))",
          borderColor: "hsl(var(--primary))",
          boxShadow: "0 0 12px hsl(var(--primary) / 0.2)",
        }}
      >
        <div className="text-[10px] font-bold uppercase tracking-widest text-primary mb-0.5">
          {data.triggerType === "none" ? "Start" : data.triggerType}
        </div>
        {data.expression && (
          <div className="font-mono text-[9px] text-foreground-muted truncate">
            {data.expression}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

// ─── End node ─────────────────────────────────────────────────────────────────

export function EndNode() {
  return (
    <div style={{ width: 120 }}>
      <Handle type="target" position={Position.Top} />
      <div
        className="rounded-full border-2 px-4 py-2 text-center"
        style={{
          background: "hsl(var(--surface))",
          borderColor: "hsl(var(--foreground-subtle))",
        }}
      >
        <div className="text-[10px] font-bold uppercase tracking-widest text-foreground-muted">
          End
        </div>
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
};
