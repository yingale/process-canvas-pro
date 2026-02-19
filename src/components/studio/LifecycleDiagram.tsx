/**
 * Case Lifecycle Model Diagram
 * Card-based layout: BPMN XML → JSON → Lifecycle Diagram → Export
 *
 * Visual design matches Pega Case Lifecycle Manager:
 *  - "MAIN FLOW" swim lane with horizontal section cards
 *  - Each section card shows steps as a vertical list
 *  - Colored type indicator squares on each step
 *  - Hover context menus: Rename (via properties), Duplicate, Delete
 *  - "+ Add Step" within each section, "+ Add Section" at the end
 *  - "ALTERNATIVE PATHS" swim lane below (future)
 */

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Plus, MoreHorizontal, ChevronDown, ChevronRight,
  Pencil, Copy, Trash2, GitBranch, Bot, User,
  Repeat2, ExternalLink, Zap, AlignLeft, type LucideIcon,
} from "lucide-react";
import type { CaseIR, Stage, Step, StepType, SelectionTarget } from "@/types/caseIr";

// ─── Step type config ──────────────────────────────────────────────────────────

const STEP_TYPE_META: Record<StepType, { label: string; color: string; Icon: LucideIcon }> = {
  automation:   { label: "Automation",  color: "hsl(213 80% 50%)",  Icon: Bot },
  user:         { label: "User Task",   color: "hsl(32 86% 48%)",   Icon: User },
  decision:     { label: "Decision",    color: "hsl(134 58% 38%)",  Icon: GitBranch },
  foreach:      { label: "For Each",    color: "hsl(268 60% 50%)",  Icon: Repeat2 },
  callActivity: { label: "Subprocess",  color: "hsl(193 70% 42%)",  Icon: ExternalLink },
};

// Section accent colors cycling per stage index
const SECTION_COLORS = [
  "hsl(213 80% 50%)",
  "hsl(32 86% 48%)",
  "hsl(268 60% 50%)",
  "hsl(134 58% 38%)",
  "hsl(193 70% 42%)",
  "hsl(0 68% 50%)",
];

// ─── Context menu ──────────────────────────────────────────────────────────────

interface CtxMenu {
  kind: "stage" | "step";
  stageId: string;
  stepId?: string;
  x: number;
  y: number;
}

function ContextMenu({
  menu,
  onRename,
  onDuplicate,
  onDelete,
  onClose,
}: {
  menu: CtxMenu;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const Item = ({
    icon: Icon,
    label,
    danger,
    onClick,
  }: {
    icon: LucideIcon;
    label: string;
    danger?: boolean;
    onClick: () => void;
  }) => (
    <button
      className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[12px] transition-colors rounded"
      style={{ color: danger ? "hsl(var(--destructive))" : "hsl(var(--foreground))" }}
      onMouseEnter={e => {
        e.currentTarget.style.background = danger
          ? "hsl(var(--destructive) / 0.08)"
          : "hsl(var(--surface-raised))";
      }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
      onClick={() => { onClick(); onClose(); }}
    >
      <Icon size={12} />
      {label}
    </button>
  );

  return (
    <div
      ref={ref}
      className="fixed z-50 rounded-lg shadow-lg border py-1 min-w-[130px]"
      style={{
        top: menu.y,
        left: menu.x,
        background: "hsl(var(--surface))",
        borderColor: "hsl(var(--border))",
        boxShadow: "0 8px 24px hsl(0 0% 0% / 0.14)",
      }}
    >
      <Item icon={Pencil} label="Rename" onClick={onRename} />
      <Item icon={Copy} label="Duplicate" onClick={onDuplicate} />
      <div className="my-1 border-t" style={{ borderColor: "hsl(var(--border))" }} />
      <Item icon={Trash2} label="Delete" danger onClick={onDelete} />
    </div>
  );
}

// ─── Step row ──────────────────────────────────────────────────────────────────

function StepRow({
  step,
  stageId,
  color,
  selected,
  onSelect,
  onContextMenu,
}: {
  step: Step;
  stageId: string;
  color: string;
  selected: boolean;
  onSelect: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  const [hover, setHover] = useState(false);
  const meta = STEP_TYPE_META[step.type];
  const isAsync = step.tech?.asyncBefore || step.tech?.asyncAfter;

  return (
    <div
      className="group relative rounded-md cursor-pointer transition-all"
      style={{
        background: selected
          ? `color-mix(in srgb, ${color} 8%, hsl(var(--surface)))`
          : hover
          ? "hsl(var(--surface-raised))"
          : "hsl(var(--surface))",
        border: `1px solid ${selected ? color + "60" : "hsl(var(--border))"}`,
        marginBottom: 6,
      }}
      onClick={onSelect}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="flex items-start gap-2.5 px-2.5 py-2">
        {/* Type color dot */}
        <div
          className="flex-shrink-0 mt-0.5 rounded-sm"
          style={{ width: 10, height: 10, background: meta.color, marginTop: 4 }}
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className="text-[11px] font-semibold truncate"
              style={{ color: "hsl(var(--foreground))" }}
            >
              {step.name}
            </span>
            {isAsync && (
              <Zap size={9} style={{ color: "hsl(var(--warning))", flexShrink: 0 }} />
            )}
          </div>
          <div
            className="text-[10px] mt-0.5 truncate"
            style={{ color: "hsl(var(--foreground-muted))" }}
          >
            {meta.label}
            {step.tech?.topic && ` · ${step.tech.topic}`}
          </div>
          {step.type === "decision" && step.branches?.length > 0 && (
            <div className="text-[9px] mt-0.5" style={{ color: "hsl(var(--foreground-subtle))" }}>
              {step.branches.length} branch{step.branches.length !== 1 ? "es" : ""}
            </div>
          )}
        </div>

        {/* Context menu trigger */}
        {hover && (
          <button
            className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: "hsl(var(--foreground-muted))" }}
            onClick={e => { e.stopPropagation(); onContextMenu(e); }}
          >
            <MoreHorizontal size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Section card ──────────────────────────────────────────────────────────────

function SectionCard({
  stage,
  stageIdx,
  color,
  selectedStageId,
  selectedStepId,
  onSelectStage,
  onSelectStep,
  onAddStep,
  onContextMenu,
  onStepContextMenu,
}: {
  stage: Stage;
  stageIdx: number;
  color: string;
  selectedStageId: string | null;
  selectedStepId: string | null;
  onSelectStage: (id: string) => void;
  onSelectStep: (stageId: string, stepId: string) => void;
  onAddStep: (stageId: string) => void;
  onContextMenu: (e: React.MouseEvent, stageId: string) => void;
  onStepContextMenu: (e: React.MouseEvent, stageId: string, stepId: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [headerHover, setHeaderHover] = useState(false);
  const isStageSelected = selectedStageId === stage.id && !selectedStepId;

  return (
    <div
      className="flex-shrink-0 flex flex-col rounded-xl border transition-all"
      style={{
        width: 272,
        background: "hsl(var(--surface))",
        borderColor: isStageSelected ? color : "hsl(var(--border))",
        boxShadow: isStageSelected
          ? `0 0 0 2px ${color}30, 0 4px 16px hsl(0 0% 0% / 0.06)`
          : "0 2px 8px hsl(0 0% 0% / 0.04)",
        // Colored top accent
        borderTop: `3px solid ${color}`,
      }}
    >
      {/* Section header */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 cursor-pointer rounded-t-xl select-none"
        style={{
          background: headerHover || isStageSelected
            ? `color-mix(in srgb, ${color} 6%, hsl(var(--surface)))`
            : "transparent",
        }}
        onClick={() => onSelectStage(stage.id)}
        onMouseEnter={() => setHeaderHover(true)}
        onMouseLeave={() => setHeaderHover(false)}
      >
        {/* Collapse toggle */}
        <button
          className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
          onClick={e => { e.stopPropagation(); setCollapsed(c => !c); }}
          style={{ color: "hsl(var(--foreground-muted))" }}
        >
          {collapsed
            ? <ChevronRight size={13} />
            : <ChevronDown size={13} />}
        </button>

        {/* Stage name */}
        <span
          className="flex-1 text-[13px] font-semibold truncate"
          style={{ color: "hsl(var(--foreground))" }}
        >
          {stage.name}
        </span>

        {/* Step count badge */}
        <span
          className="text-[10px] font-mono px-1.5 py-0.5 rounded-md flex-shrink-0"
          style={{
            background: `color-mix(in srgb, ${color} 12%, transparent)`,
            color,
          }}
        >
          {stage.steps.length}
        </span>

        {/* Context menu */}
        {headerHover && (
          <button
            className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: "hsl(var(--foreground-muted))" }}
            onClick={e => { e.stopPropagation(); onContextMenu(e, stage.id); }}
          >
            <MoreHorizontal size={13} />
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="mx-3" style={{ height: 1, background: `color-mix(in srgb, ${color} 20%, hsl(var(--border)))` }} />

      {/* Steps */}
      {!collapsed && (
        <div className="flex-1 p-3 flex flex-col">
          {stage.steps.length === 0 && (
            <div
              className="text-center py-4 text-[11px] rounded-lg mb-2"
              style={{
                color: "hsl(var(--foreground-subtle))",
                border: `1px dashed hsl(var(--border))`,
              }}
            >
              No steps yet
            </div>
          )}

          {stage.steps.map(step => (
            <StepRow
              key={step.id}
              step={step}
              stageId={stage.id}
              color={color}
              selected={selectedStepId === step.id}
              onSelect={() => onSelectStep(stage.id, step.id)}
              onContextMenu={e => onStepContextMenu(e, stage.id, step.id)}
            />
          ))}

          {/* Add Step button */}
          <button
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-md border-dashed border transition-all text-[11px] font-medium mt-1"
            style={{
              borderColor: "hsl(var(--border))",
              color: "hsl(var(--foreground-subtle))",
              background: "transparent",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = color;
              e.currentTarget.style.color = color;
              e.currentTarget.style.background = `color-mix(in srgb, ${color} 6%, transparent)`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "hsl(var(--border))";
              e.currentTarget.style.color = "hsl(var(--foreground-subtle))";
              e.currentTarget.style.background = "transparent";
            }}
            onClick={() => onAddStep(stage.id)}
          >
            <Plus size={11} />
            Add Step
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Swim lane ─────────────────────────────────────────────────────────────────

function SwimLane({
  label,
  stages,
  startIdx,
  selectedStageId,
  selectedStepId,
  onSelectStage,
  onSelectStep,
  onAddStep,
  onAddStage,
  onContextMenu,
  onStepContextMenu,
  showAddStage,
  altPath,
}: {
  label: string;
  stages: Stage[];
  startIdx: number;
  selectedStageId: string | null;
  selectedStepId: string | null;
  onSelectStage: (id: string) => void;
  onSelectStep: (stageId: string, stepId: string) => void;
  onAddStep: (stageId: string) => void;
  onAddStage: () => void;
  onContextMenu: (e: React.MouseEvent, stageId: string) => void;
  onStepContextMenu: (e: React.MouseEvent, stageId: string, stepId: string) => void;
  showAddStage: boolean;
  altPath?: boolean;
}) {
  return (
    <div className="mb-6">
      {/* Lane header */}
      <div
        className="flex items-center gap-2 mb-3 px-1"
      >
        <AlignLeft size={14} style={{ color: "hsl(var(--foreground-muted))" }} />
        <span
          className="text-[11px] font-bold uppercase tracking-widest"
          style={{ color: "hsl(var(--foreground-muted))" }}
        >
          {label}
        </span>
        <div
          className="flex-1 h-px"
          style={{ background: altPath
            ? `repeating-linear-gradient(90deg, hsl(var(--border)) 0, hsl(var(--border)) 6px, transparent 6px, transparent 12px)`
            : "hsl(var(--border))"
          }}
        />
      </div>

      {/* Cards row */}
      <div className="flex gap-3 items-start">
        {stages.map((stage, i) => (
          <SectionCard
            key={stage.id}
            stage={stage}
            stageIdx={startIdx + i}
            color={SECTION_COLORS[(startIdx + i) % SECTION_COLORS.length]}
            selectedStageId={selectedStageId}
            selectedStepId={selectedStepId}
            onSelectStage={onSelectStage}
            onSelectStep={onSelectStep}
            onAddStep={onAddStep}
            onContextMenu={onContextMenu}
            onStepContextMenu={onStepContextMenu}
          />
        ))}

        {/* Add Section button */}
        {showAddStage && (
          <button
            className="flex-shrink-0 flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed transition-all"
            style={{
              width: 100,
              height: 80,
              borderColor: "hsl(var(--border))",
              color: "hsl(var(--foreground-subtle))",
              background: "transparent",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = "hsl(var(--primary))";
              e.currentTarget.style.color = "hsl(var(--primary))";
              e.currentTarget.style.background = "hsl(var(--primary-dim))";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "hsl(var(--border))";
              e.currentTarget.style.color = "hsl(var(--foreground-subtle))";
              e.currentTarget.style.background = "transparent";
            }}
            onClick={onAddStage}
          >
            <Plus size={20} />
            <span className="text-[10px] font-medium">
              {altPath ? "Add Alt. Path" : "Add Section"}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main diagram component ────────────────────────────────────────────────────

interface LifecycleDiagramProps {
  caseIr: CaseIR;
  selection: SelectionTarget;
  onSelectStage: (stageId: string) => void;
  onSelectStep: (stageId: string, stepId: string) => void;
  onAddStep: (stageId: string) => void;
  onAddStage: () => void;
  onDeleteStage: (stageId: string) => void;
  onDeleteStep: (stageId: string, stepId: string) => void;
  onDuplicateStep: (stageId: string, stepId: string) => void;
  onDuplicateStage: (stageId: string) => void;
}

export default function LifecycleDiagram({
  caseIr,
  selection,
  onSelectStage,
  onSelectStep,
  onAddStep,
  onAddStage,
  onDeleteStage,
  onDeleteStep,
  onDuplicateStep,
  onDuplicateStage,
}: LifecycleDiagramProps) {
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null);

  const selectedStageId = selection?.stageId ?? null;
  const selectedStepId = selection?.kind === "step" ? selection.stepId : null;

  const openStageCtx = useCallback((e: React.MouseEvent, stageId: string) => {
    e.preventDefault();
    setCtxMenu({ kind: "stage", stageId, x: e.clientX, y: e.clientY });
  }, []);

  const openStepCtx = useCallback((e: React.MouseEvent, stageId: string, stepId: string) => {
    e.preventDefault();
    setCtxMenu({ kind: "step", stageId, stepId, x: e.clientX, y: e.clientY });
  }, []);

  const handleCtxRename = useCallback(() => {
    if (!ctxMenu) return;
    if (ctxMenu.kind === "stage") onSelectStage(ctxMenu.stageId);
    else if (ctxMenu.stepId) onSelectStep(ctxMenu.stageId, ctxMenu.stepId);
    setCtxMenu(null);
  }, [ctxMenu, onSelectStage, onSelectStep]);

  const handleCtxDuplicate = useCallback(() => {
    if (!ctxMenu) return;
    if (ctxMenu.kind === "step" && ctxMenu.stepId) {
      onDuplicateStep(ctxMenu.stageId, ctxMenu.stepId);
    } else {
      onDuplicateStage(ctxMenu.stageId);
    }
    setCtxMenu(null);
  }, [ctxMenu, onDuplicateStep, onDuplicateStage]);

  const handleCtxDelete = useCallback(() => {
    if (!ctxMenu) return;
    if (ctxMenu.kind === "step" && ctxMenu.stepId) {
      onDeleteStep(ctxMenu.stageId, ctxMenu.stepId);
    } else {
      onDeleteStage(ctxMenu.stageId);
    }
    setCtxMenu(null);
  }, [ctxMenu, onDeleteStep, onDeleteStage]);

  // Trigger info banner
  const triggerLabel = caseIr.trigger.type === "none"
    ? "Manual Start"
    : caseIr.trigger.type === "timer"
    ? `Timer: ${caseIr.trigger.expression ?? "scheduled"}`
    : caseIr.trigger.type.charAt(0).toUpperCase() + caseIr.trigger.type.slice(1);

  return (
    <div
      className="w-full h-full overflow-auto"
      style={{ background: "hsl(var(--canvas-bg))" }}
    >
      <div className="p-6 min-w-max min-h-full">

        {/* Process header */}
        <div className="flex items-center gap-3 mb-5">
          <div>
            <h1
              className="text-[15px] font-bold"
              style={{ color: "hsl(var(--foreground))" }}
            >
              {caseIr.name}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{
                  background: "hsl(var(--primary) / 0.1)",
                  color: "hsl(var(--primary))",
                }}
              >
                <Zap size={8} />
                {triggerLabel}
              </span>
              <span
                className="text-[10px] font-mono"
                style={{ color: "hsl(var(--foreground-subtle))" }}
              >
                {caseIr.id} · v{caseIr.version}
              </span>
            </div>
          </div>
        </div>

        {/* MAIN FLOW swim lane */}
        <SwimLane
          label="Main Flow"
          stages={caseIr.stages}
          startIdx={0}
          selectedStageId={selectedStageId}
          selectedStepId={selectedStepId}
          onSelectStage={onSelectStage}
          onSelectStep={onSelectStep}
          onAddStep={onAddStep}
          onAddStage={onAddStage}
          onContextMenu={openStageCtx}
          onStepContextMenu={openStepCtx}
          showAddStage
        />

        {/* ALTERNATIVE PATHS swim lane */}
        <SwimLane
          label="Alternative Paths"
          stages={[]}
          startIdx={caseIr.stages.length}
          selectedStageId={selectedStageId}
          selectedStepId={selectedStepId}
          onSelectStage={onSelectStage}
          onSelectStep={onSelectStep}
          onAddStep={onAddStep}
          onAddStage={onAddStage}
          onContextMenu={openStageCtx}
          onStepContextMenu={openStepCtx}
          showAddStage
          altPath
        />
      </div>

      {/* Context menu */}
      {ctxMenu && (
        <ContextMenu
          menu={ctxMenu}
          onRename={handleCtxRename}
          onDuplicate={handleCtxDuplicate}
          onDelete={handleCtxDelete}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </div>
  );
}
