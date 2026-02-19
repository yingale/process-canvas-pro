/**
 * Custom React Flow nodes for the Pega-style workflow diagram
 * Horizontal layout: chevron stage headers + step cards stacked below
 */
import { Handle, Position, MarkerType, type NodeProps } from "reactflow";
import { Bot, User, GitBranch, Repeat2, ExternalLink, Zap, type LucideIcon } from "lucide-react";
import type { Step, StepType } from "@/types/caseIr";

// ─── Step type configuration ──────────────────────────────────────────────────

export const STEP_TYPE_CONFIG: Record<StepType, {
  label: string;
  icon: LucideIcon;
  colorVar: string;
}> = {
  automation: { label: "Automation", icon: Bot,         colorVar: "hsl(var(--step-automation))" },
  user:        { label: "User",       icon: User,        colorVar: "hsl(var(--step-user))" },
  decision:    { label: "Decision",   icon: GitBranch,   colorVar: "hsl(var(--step-decision))" },
  foreach:     { label: "For Each",   icon: Repeat2,     colorVar: "hsl(var(--step-foreach))" },
  callActivity:{ label: "Call",       icon: ExternalLink, colorVar: "hsl(var(--step-call))" },
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
  const isAsync = step.tech?.asyncBefore || step.tech?.asyncAfter;

  return (
    <div
      className="cursor-pointer group"
      style={{ width: 188 }}
      onClick={() => onSelect(stageId, step.id)}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />

      <div
        className="rounded border transition-all duration-150"
        style={{
          background: "hsl(var(--surface))",
          borderColor: selected ? stageColor : "hsl(var(--border))",
          borderLeftWidth: selected ? 3 : 1,
          borderLeftColor: stageColor,
          boxShadow: selected
            ? `0 0 0 1px ${stageColor}40, var(--shadow-card)`
            : "var(--shadow-card)",
        }}
      >
        <div className="px-3 py-2.5">
          {/* Type badge row */}
          <div className="flex items-center gap-1.5 mb-1.5">
            <Icon size={11} color={stageColor} />
            <span
              className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: stageColor }}
            >
              {cfg.label}
            </span>
            {isAsync && (
              <div className="ml-auto" title="Async">
                <Zap size={10} style={{ color: "hsl(var(--warning))" }} className="opacity-70" />
              </div>
            )}
          </div>

          {/* Step name */}
          <p
            className="text-[12px] font-medium leading-snug line-clamp-2"
            style={{ color: "hsl(var(--foreground))" }}
          >
            {step.name}
          </p>

          {/* Decision branches */}
          {step.type === "decision" && step.branches.length > 0 && (
            <div className="mt-1.5 space-y-0.5">
              {step.branches.slice(0, 2).map((b) => (
                <div key={b.id} className="flex items-center gap-1">
                  <div className="w-1 h-1 rounded-full" style={{ background: stageColor, opacity: 0.6 }} />
                  <span className="text-[9px] truncate" style={{ color: "hsl(var(--foreground-muted))" }}>{b.label}</span>
                </div>
              ))}
              {step.branches.length > 2 && (
                <span className="text-[9px]" style={{ color: "hsl(var(--foreground-subtle))" }}>+{step.branches.length - 2} more</span>
              )}
            </div>
          )}

          {/* Foreach expression */}
          {step.type === "foreach" && (
            <div className="mt-1 font-mono text-[9px] truncate" style={{ color: "hsl(var(--foreground-muted))" }}>
              ∀ {step.collectionExpression}
            </div>
          )}

          {/* Call activity target */}
          {step.type === "callActivity" && step.calledElement && (
            <div className="mt-1 font-mono text-[9px] truncate" style={{ color: "hsl(var(--foreground-muted))" }}>
              → {step.calledElement}
            </div>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
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

  // Chevron shape: left indent if not first, right point always
  const W = 200;
  const H = 52;
  const indent = isFirst ? 0 : 18;
  const point = 18;

  const clipPath = isFirst
    ? `polygon(0 0, ${W - point}px 0, ${W}px 50%, ${W - point}px 100%, 0 100%)`
    : `polygon(${indent}px 0, ${W - point}px 0, ${W}px 50%, ${W - point}px 100%, ${indent}px 100%, 0 50%)`;

  return (
    <div
      className="cursor-pointer select-none"
      style={{ width: W, height: H }}
      onClick={() => onSelect(stageId)}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />

      <div
        style={{
          width: W,
          height: H,
          background: selected
            ? `color-mix(in srgb, ${stageColor} 90%, white)`
            : stageColor,
          clipPath,
          display: "flex",
          alignItems: "center",
          paddingLeft: isFirst ? 16 : 28,
          paddingRight: point + 8,
          transition: "filter 0.15s",
          filter: selected ? "brightness(1.15)" : "none",
          boxSizing: "border-box",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.75)", textTransform: "uppercase", letterSpacing: "0.06em", lineHeight: 1 }}>
            Stage
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", lineHeight: 1.25, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {stageName}
          </div>
        </div>
      </div>

      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
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
    <div style={{ width: 72 }}>
      <div
        style={{
          width: 72,
          height: 36,
          borderRadius: 18,
          background: "hsl(var(--primary))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {data.triggerType === "none" ? "Start" : data.triggerType}
        </span>
      </div>
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </div>
  );
}

// ─── End node ─────────────────────────────────────────────────────────────────

export function EndNode() {
  return (
    <div style={{ width: 60 }}>
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <div
        style={{
          width: 60,
          height: 36,
          borderRadius: 18,
          border: "2px solid hsl(var(--foreground-subtle))",
          background: "hsl(var(--surface))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, color: "hsl(var(--foreground-muted))", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          End
        </span>
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

// re-export for flowBuilder
export { MarkerType };
