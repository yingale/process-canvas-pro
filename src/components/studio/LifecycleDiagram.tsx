/**
 * Case Lifecycle Model Diagram
 * Hierarchy: Section (Stage) → Groups → Steps
 * Visual design: Pega-style horizontal cards with group sub-sections inside each stage.
 */
import { useState, useCallback, useRef, useEffect } from "react";
import {
  Plus, MoreHorizontal, ChevronDown, ChevronRight,
  Pencil, Copy, Trash2, GitBranch, Bot, User,
  Repeat2, ExternalLink, Zap, Bell, Layers,
  ArrowUp, ArrowDown, Timer, Mail, Radio, Play,
  Square, AlertTriangle, Settings, ZoomIn, ZoomOut, Maximize2, Minimize2, X,
  Workflow, GripVertical,
  type LucideIcon,
} from "lucide-react";
import type { CaseIR, Stage, Group, Step, StepType, SelectionTarget, Trigger, EndEvent, BoundaryEvent } from "@/types/caseIr";
import "./studio.css";

// ─── Step type config ──────────────────────────────────────────────────────────

const STEP_TYPE_META: Record<StepType, { label: string; color: string; Icon: LucideIcon }> = {
  automation:        { label: "Automation",  color: "hsl(213 88% 42%)",  Icon: Bot },
  user:              { label: "User Task",   color: "hsl(32 90% 48%)",   Icon: User },
  decision:          { label: "Decision",    color: "hsl(134 60% 42%)",  Icon: GitBranch },
  foreach:           { label: "For Each",    color: "hsl(268 62% 52%)",  Icon: Repeat2 },
  callActivity:      { label: "Subprocess",  color: "hsl(193 72% 40%)",  Icon: ExternalLink },
  intermediateEvent: { label: "Wait/Event",  color: "hsl(199 80% 42%)",  Icon: Bell },
};

const SECTION_COLORS = [
  "hsl(152 68% 38%)",
  "hsl(252 60% 52%)",
  "hsl(180 60% 40%)",
  "hsl(213 80% 52%)",
  "hsl(32 88% 50%)",
  "hsl(0 68% 50%)",
];

// ─── Context menu ──────────────────────────────────────────────────────────────

interface CtxMenu {
  kind: "stage" | "group" | "step";
  stageId: string;
  groupId?: string;
  stepId?: string;
  x: number; y: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

function ContextMenu({ menu, onRename, onDuplicate, onDelete, onMoveUp, onMoveDown, onClose }: {
  menu: CtxMenu; onRename: () => void; onDuplicate: () => void; onDelete: () => void;
  onMoveUp: () => void; onMoveDown: () => void; onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  const Item = ({ icon: Icon, label, danger, disabled, onClick }: { icon: LucideIcon; label: string; danger?: boolean; disabled?: boolean; onClick: () => void }) => (
    <button
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-[12px] transition-colors rounded ${disabled ? "ctx-menu-item--disabled" : danger ? "ctx-menu-item--danger" : "ctx-menu-item"}`}
      onClick={() => { if (!disabled) { onClick(); onClose(); } }}>
      <Icon size={12} />{label}
    </button>
  );

  return (
    <div ref={ref} className="ctx-menu fixed z-50 rounded-lg border py-1 min-w-[145px]"
      style={{ top: menu.y, left: menu.x }}>
      <Item icon={Pencil} label="Rename" onClick={onRename} />
      {menu.kind !== "group" && <Item icon={Copy} label="Duplicate" onClick={onDuplicate} />}
      <div className="ctx-menu-divider my-1 border-t" />
      <Item icon={ArrowUp} label="Move Up" disabled={!menu.canMoveUp} onClick={onMoveUp} />
      <Item icon={ArrowDown} label="Move Down" disabled={!menu.canMoveDown} onClick={onMoveDown} />
      <div className="ctx-menu-divider my-1 border-t" />
      <Item icon={Trash2} label="Delete" danger onClick={onDelete} />
    </div>
  );
}

// ─── Step row ──────────────────────────────────────────────────────────────────

function StepRow({ step, color, selected, onSelect, onContextMenu, onBoundaryClick }: {
  step: Step; color: string; selected: boolean;
  onSelect: () => void; onContextMenu: (e: React.MouseEvent) => void;
  onBoundaryClick?: (boundaryEventId: string) => void;
}) {
  const [hover, setHover] = useState(false);
  const meta = STEP_TYPE_META[step.type];
  const inputCount = step.tech?.inputParameters?.length ?? 0;
  const outputCount = step.tech?.outputParameters?.length ?? 0;

  let subLabel = meta.label;
  if (step.tech?.topic) subLabel += ` · ${step.tech.topic}`;
  if (step.type === "intermediateEvent") {
    subLabel = `${step.eventSubType.charAt(0).toUpperCase() + step.eventSubType.slice(1)} Event`;
    if (step.messageRef) subLabel += ` · ${step.messageRef}`;
  }
  if (step.type === "foreach") subLabel = `For Each · ${step.elementVariable || step.collectionExpression}`;

  return (
    <div
      className="group relative rounded-md cursor-pointer transition-all step-row"
      style={{
        background: selected ? `color-mix(in srgb, ${color} 8%, hsl(var(--surface)))` : hover ? undefined : undefined,
        borderColor: selected ? color + "60" : undefined,
      }}
      onClick={onSelect} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
    >
      <div className="flex items-start gap-2.5 px-2.5 py-2">
        <div className="flex-shrink-0 rounded-sm mt-0.5"
          style={{ width: 18, height: 18, background: meta.color, marginTop: 3 }}>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold truncate text-foreground">{step.name}</span>
          </div>
          <div className="text-[10px] mt-0.5 truncate text-foreground-muted">{subLabel}</div>
          {(inputCount > 0 || outputCount > 0) && (
            <div className="flex items-center gap-1 mt-1">
              {inputCount > 0 && <span className="step-io-badge--input text-[9px] px-1 py-0.5 rounded font-mono">IN:{inputCount}</span>}
              {outputCount > 0 && <span className="step-io-badge--output text-[9px] px-1 py-0.5 rounded font-mono">OUT:{outputCount}</span>}
            </div>
          )}
          {step.description && <div className="text-[9px] mt-0.5 truncate italic text-foreground-subtle">{step.description}</div>}
          {step.boundaryEvents && step.boundaryEvents.length > 0 && (
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              {step.boundaryEvents.map(be => (
                <button
                  key={be.id}
                  className={`text-[8px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5 transition-colors ${be.cancelActivity !== false ? "boundary-badge--interrupting" : "boundary-badge--non-interrupting"}`}
                  onClick={e => { e.stopPropagation(); onBoundaryClick?.(be.id); }}
                  title={`${be.cancelActivity !== false ? "Interrupting" : "Non-interrupting"} ${be.eventType} boundary event`}
                >
                  <AlertTriangle size={7} />
                  {be.eventType}
                </button>
              ))}
            </div>
          )}
        </div>
        {hover && (
          <button className="hover-btn flex-shrink-0 w-5 h-5 rounded flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity"
            onClick={e => { e.stopPropagation(); onContextMenu(e); }}>
            <MoreHorizontal size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Group sub-section ─────────────────────────────────────────────────────────

function GroupSection({ group, stageId, color, selection, onSelectGroup, onSelectStep, onAddStep, onGroupCtx, onStepCtx }: {
  group: Group; stageId: string; color: string; selection: SelectionTarget;
  onSelectGroup: (stageId: string, groupId: string) => void;
  onSelectStep: (stageId: string, groupId: string, stepId: string) => void;
  onAddStep: (stageId: string, groupId: string) => void;
  onGroupCtx: (e: React.MouseEvent, groupId: string) => void;
  onStepCtx: (e: React.MouseEvent, groupId: string, stepId: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [hover, setHover] = useState(false);
  const isGroupSel = selection?.kind === "group" && selection.groupId === group.id;

  return (
    <div className="mb-2">
      <div
        className="flex items-center gap-1.5 px-2 py-1 rounded-md cursor-pointer transition-all select-none"
        style={{ background: isGroupSel || hover ? `color-mix(in srgb, ${color} 6%, hsl(var(--surface-raised)))` : "transparent" }}
        onClick={() => onSelectGroup(stageId, group.id)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <button className="flex-shrink-0 opacity-50 hover:opacity-100 text-foreground-muted" onClick={e => { e.stopPropagation(); setCollapsed(c => !c); }}>
          {collapsed ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
        </button>
        <Layers size={10} style={{ color, flexShrink: 0 }} />
        <span className="flex-1 text-[11px] font-semibold truncate text-foreground">{group.name}</span>
        <span className="text-[9px] font-mono px-1 rounded" style={{ background: `${color}18`, color }}>{group.steps.length}</span>
        {hover && (
          <button className="hover-btn w-4 h-4 rounded flex items-center justify-center opacity-60 hover:opacity-100"
            onClick={e => { e.stopPropagation(); onGroupCtx(e, group.id); }}>
            <MoreHorizontal size={10} />
          </button>
        )}
      </div>

      {!collapsed && (
        <div className="ml-4 mt-1">
          {group.steps.length === 0 && (
            <div className="text-center py-3 text-[10px] rounded-lg mb-1.5 text-foreground-subtle border border-dashed">
              No steps
            </div>
          )}
          {group.steps.map(step => (
            <StepRow
              key={step.id}
              step={step}
              color={color}
              selected={selection?.kind === "step" && selection.stepId === step.id}
              onSelect={() => onSelectStep(stageId, group.id, step.id)}
              onContextMenu={e => onStepCtx(e, group.id, step.id)}
            />
          ))}
          <button
            className="add-btn-dashed w-full flex items-center justify-center gap-1 py-1.5 rounded border-dashed border text-[10px] font-medium transition-all hover:border-current"
            style={{ "--hover-color": color } as React.CSSProperties}
            onClick={() => onAddStep(stageId, group.id)}
          >
            <Plus size={10} /> Add Step
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Section card (Stage) ──────────────────────────────────────────────────────

function SectionCard({ stage, stageIdx, color, selection, onSelectStage, onSelectGroup, onSelectStep, onAddStep, onAddGroup, onStageCtx, onGroupCtx, onStepCtx }: {
  stage: Stage; stageIdx: number; color: string; selection: SelectionTarget;
  onSelectStage: (id: string) => void;
  onSelectGroup: (stageId: string, groupId: string) => void;
  onSelectStep: (stageId: string, groupId: string, stepId: string) => void;
  onAddStep: (stageId: string, groupId: string) => void;
  onAddGroup: (stageId: string) => void;
  onStageCtx: (e: React.MouseEvent, stageId: string) => void;
  onGroupCtx: (e: React.MouseEvent, stageId: string, groupId: string) => void;
  onStepCtx: (e: React.MouseEvent, stageId: string, groupId: string, stepId: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [headerHover, setHeaderHover] = useState(false);
  const isStageSelected = selection?.kind === "stage" && selection.stageId === stage.id;

  return (
    <div className="section-card flex-shrink-0 flex flex-col rounded-xl border transition-all overflow-hidden"
      style={{
        borderColor: isStageSelected ? color : undefined,
        boxShadow: isStageSelected ? `0 0 0 2px ${color}30, 0 4px 16px hsl(0 0% 0% / 0.06)` : undefined,
      }}>

      {/* Gradient header bar */}
      <div style={{ height: 4, background: `linear-gradient(90deg, ${color}, color-mix(in srgb, ${color} 50%, white))` }} />

      {/* Stage header */}
      <div className="flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none"
        style={{ background: `linear-gradient(90deg, color-mix(in srgb, ${color} 12%, hsl(var(--surface))) 0%, hsl(var(--surface)) 100%)` }}
        onClick={() => onSelectStage(stage.id)}
        onMouseEnter={() => setHeaderHover(true)}
        onMouseLeave={() => setHeaderHover(false)}
      >
        <GripVertical size={12} className="text-foreground-subtle flex-shrink-0 opacity-50" />
        <span className="flex-1 text-[13px] font-bold truncate text-foreground">{stage.name}</span>
        <button className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity text-foreground-muted"
          onClick={e => { e.stopPropagation(); setCollapsed(c => !c); }}>
          {collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
        </button>
        {headerHover && (
          <button className="hover-btn flex-shrink-0 w-6 h-6 rounded flex items-center justify-center opacity-60 hover:opacity-100"
            onClick={e => { e.stopPropagation(); onStageCtx(e, stage.id); }}>
            <MoreHorizontal size={13} />
          </button>
        )}
      </div>

      <div className="section-divider mx-3" />

      {!collapsed && (
        <div className="flex-1 p-3 flex flex-col">
          {stage.groups.map(group => (
            <GroupSection
              key={group.id}
              group={group}
              stageId={stage.id}
              color={color}
              selection={selection}
              onSelectGroup={onSelectGroup}
              onSelectStep={onSelectStep}
              onAddStep={onAddStep}
              onGroupCtx={(e, gid) => onGroupCtx(e, stage.id, gid)}
              onStepCtx={(e, gid, sid) => onStepCtx(e, stage.id, gid, sid)}
            />
          ))}

          <button
            className="add-btn-dashed w-full flex items-center justify-center gap-1.5 py-2 rounded-md border-dashed border transition-all text-[11px] font-medium mt-1"
            onClick={() => onAddGroup(stage.id)}
          >
            <Plus size={11} /><Layers size={10} /> Add Group
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Trigger card ──────────────────────────────────────────────────────────────

const TRIGGER_ICON_MAP: Record<string, LucideIcon> = { timer: Timer, message: Mail, signal: Radio, none: Play, manual: Play };

function TriggerCard({ trigger, selected, onClick }: { trigger: Trigger; selected: boolean; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  const Icon = TRIGGER_ICON_MAP[trigger.type] ?? Play;
  const label = trigger.type === "none" ? "Manual Start"
    : trigger.type === "timer" ? "Timer Start"
    : trigger.type === "message" ? "Message Start"
    : trigger.type === "signal" ? "Signal Start"
    : "Start Event";
  const subLabel = trigger.expression ?? trigger.name ?? "";

  return (
    <div
      className={`event-card flex-shrink-0 rounded-xl border cursor-pointer transition-all ${selected ? "" : ""}`}
      style={{
        width: 160,
        background: selected ? "color-mix(in srgb, hsl(var(--primary)) 6%, hsl(var(--surface)))" : hover ? undefined : undefined,
        borderColor: selected ? "hsl(var(--primary))" : undefined,
        boxShadow: selected ? "0 0 0 2px hsl(var(--primary) / 0.3), 0 4px 16px hsl(0 0% 0% / 0.06)" : undefined,
        borderTop: "3px solid hsl(var(--primary))",
      }}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="px-3 py-3 flex flex-col items-center gap-2 text-center">
        <div className="event-icon-circle--primary w-9 h-9 rounded-full flex items-center justify-center">
          <Icon size={18} className="text-primary" />
        </div>
        <div>
          <div className="text-[11px] font-bold text-foreground">{label}</div>
          {subLabel && (
            <div className="text-[10px] font-mono mt-0.5 truncate max-w-[130px] text-foreground-muted">
              {subLabel}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── End Event card ────────────────────────────────────────────────────────────

const END_EVT_ICONS: Record<string, LucideIcon> = { none: Square, terminate: Square, error: AlertTriangle, message: Mail, signal: Radio };

function EndEventCard({ endEvent, selected, onClick }: { endEvent: EndEvent; selected: boolean; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  const Icon = END_EVT_ICONS[endEvent.eventType] ?? Square;
  const label = endEvent.eventType === "none" ? "End" : `${endEvent.eventType.charAt(0).toUpperCase() + endEvent.eventType.slice(1)} End`;
  const accentColor = "hsl(0 68% 50%)";

  return (
    <div
      className="event-card flex-shrink-0 rounded-xl border cursor-pointer transition-all"
      style={{
        width: 130,
        background: selected ? `color-mix(in srgb, ${accentColor} 6%, hsl(var(--surface)))` : undefined,
        borderColor: selected ? accentColor : undefined,
        boxShadow: selected ? `0 0 0 2px hsl(0 68% 50% / 0.3), 0 4px 16px hsl(0 0% 0% / 0.06)` : undefined,
        borderTop: `3px solid ${accentColor}`,
      }}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="px-3 py-3 flex flex-col items-center gap-2 text-center">
        <div className="event-icon-circle--end w-9 h-9 rounded-full flex items-center justify-center">
          <Icon size={18} style={{ color: accentColor }} />
        </div>
        <div className="text-[11px] font-bold text-foreground">{label}</div>
        {endEvent.name && <div className="text-[10px] mt-0.5 truncate max-w-[110px] text-foreground-muted">{endEvent.name}</div>}
      </div>
    </div>
  );
}

// ─── Add Boundary Event Picker ─────────────────────────────────────────────────

function AddBoundaryPicker({ steps, eventTypes, onAdd, onClose }: {
  steps: Array<{ stageId: string; groupId: string; stepId: string; stepName: string; stageName: string }>;
  eventTypes: Array<{ value: import("@/types/caseIr").BoundaryEventType; label: string }>;
  onAdd: (stageId: string, groupId: string, stepId: string, eventType: import("@/types/caseIr").BoundaryEventType) => void;
  onClose: () => void;
}) {
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  const step = steps.find(s => s.stepId === selectedStep);

  return (
    <div ref={ref} className="picker-panel absolute bottom-full left-0 mb-2 z-50 rounded-xl border p-3 min-w-[240px]">
      {!selectedStep ? (
        <>
          <div className="text-[11px] font-bold mb-2 text-foreground">Select a step to attach to:</div>
          {steps.length === 0 ? (
            <div className="text-[10px] py-2 text-foreground-subtle">No steps available. Add steps first.</div>
          ) : (
            <div className="max-h-[200px] overflow-y-auto space-y-1">
              {steps.map(s => (
                <button key={s.stepId}
                  className="picker-item w-full text-left px-2.5 py-1.5 rounded-md text-[11px] transition-colors"
                  onClick={() => setSelectedStep(s.stepId)}
                >
                  <div className="font-medium">{s.stepName}</div>
                  <div className="text-[9px] text-foreground-subtle">{s.stageName}</div>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="text-[11px] font-bold mb-2 text-foreground">
            Event type for "{step?.stepName}":
          </div>
          <div className="space-y-1">
            {eventTypes.map(et => (
              <button key={et.value}
                className="picker-item w-full text-left px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors"
                onClick={() => {
                  if (step) onAdd(step.stageId, step.groupId, step.stepId, et.value);
                }}
              >
                {et.label}
              </button>
            ))}
          </div>
          <button className="mt-2 text-[10px] px-2 py-1 rounded text-foreground-muted"
            onClick={() => setSelectedStep(null)}>← Back</button>
        </>
      )}
    </div>
  );
}

// ─── Main diagram ──────────────────────────────────────────────────────────────

interface LifecycleDiagramProps {
  caseIr: CaseIR;
  selection: SelectionTarget;
  onSelectTrigger: () => void;
  onSelectEndEvent: () => void;
  onSelectProcess: () => void;
  onSelectBoundaryEvent: (stageId: string, groupId: string, stepId: string, boundaryEventId: string) => void;
  onSelectStage: (stageId: string) => void;
  onSelectGroup: (stageId: string, groupId: string) => void;
  onSelectStep: (stageId: string, groupId: string, stepId: string) => void;
  onAddStep: (stageId: string, groupId: string) => void;
  onAddGroup: (stageId: string) => void;
  onAddStage: () => void;
  onDeleteStage: (stageId: string) => void;
  onDeleteGroup: (stageId: string, groupId: string) => void;
  onDeleteStep: (stageId: string, groupId: string, stepId: string) => void;
  onDuplicateStep: (stageId: string, groupId: string, stepId: string) => void;
  onDuplicateStage: (stageId: string) => void;
  onMoveStage: (stageId: string, dir: -1 | 1) => void;
  onMoveGroup: (stageId: string, groupId: string, dir: -1 | 1) => void;
  onMoveStep: (stageId: string, groupId: string, stepId: string, dir: -1 | 1) => void;
  onAddBoundaryEvent: (stageId: string, groupId: string, stepId: string, eventType: import("@/types/caseIr").BoundaryEventType) => void;
  onAddAltStage: () => void;
  onAddAltGroup: (stageId: string) => void;
  onAddAltStep: (stageId: string, groupId: string) => void;
  onDeleteAltStage: (stageId: string) => void;
  onDeleteAltGroup: (stageId: string, groupId: string) => void;
  onDeleteAltStep: (stageId: string, groupId: string, stepId: string) => void;
  onDuplicateAltStep: (stageId: string, groupId: string, stepId: string) => void;
  onDuplicateAltStage: (stageId: string) => void;
  onMoveAltStage: (stageId: string, dir: -1 | 1) => void;
  onMoveAltGroup: (stageId: string, groupId: string, dir: -1 | 1) => void;
  onMoveAltStep: (stageId: string, groupId: string, stepId: string, dir: -1 | 1) => void;
}

export default function LifecycleDiagram({
  caseIr, selection,
  onSelectTrigger, onSelectEndEvent, onSelectProcess, onSelectBoundaryEvent,
  onSelectStage, onSelectGroup, onSelectStep,
  onAddStep, onAddGroup, onAddStage,
  onDeleteStage, onDeleteGroup, onDeleteStep,
  onDuplicateStep, onDuplicateStage,
  onMoveStage, onMoveGroup, onMoveStep,
  onAddBoundaryEvent,
  onAddAltStage, onAddAltGroup, onAddAltStep,
  onDeleteAltStage, onDeleteAltGroup, onDeleteAltStep,
  onDuplicateAltStep, onDuplicateAltStage,
  onMoveAltStage, onMoveAltGroup, onMoveAltStep,
}: LifecycleDiagramProps) {
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null);
  const [altCtxMenu, setAltCtxMenu] = useState<CtxMenu | null>(null);
  const [zoom, setZoom] = useState(0.85);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullZoom, setFullZoom] = useState(0.7);

  const containerRef = useRef<HTMLDivElement>(null);
  const fullRef = useRef<HTMLDivElement>(null);

  const activeZoom = fullscreen ? fullZoom : zoom;
  const setActiveZoom = fullscreen
    ? (fn: (z: number) => number) => setFullZoom(z => fn(z))
    : (fn: (z: number) => number) => setZoom(z => fn(z));

  const zoomIn = useCallback(() => setActiveZoom(z => Math.min(z + 0.1, 1.5)), [fullscreen]);
  const zoomOut = useCallback(() => setActiveZoom(z => Math.max(z - 0.1, 0.3)), [fullscreen]);
  const zoomReset = useCallback(() => { if (fullscreen) setFullZoom(0.7); else setZoom(0.85); }, [fullscreen]);

  // Ctrl+scroll to zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setZoom(z => Math.min(1.5, Math.max(0.3, z - e.deltaY * 0.002)));
      }
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  // Ctrl+scroll on fullscreen overlay
  useEffect(() => {
    const el = fullRef.current;
    if (!el || !fullscreen) return;
    const handler = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setFullZoom(z => Math.min(1.5, Math.max(0.3, z - e.deltaY * 0.002)));
      }
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [fullscreen]);

  // Escape to close fullscreen
  useEffect(() => {
    if (!fullscreen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setFullscreen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [fullscreen]);

  // Close fullscreen when user selects an element
  useEffect(() => {
    if (selection && fullscreen) setFullscreen(false);
  }, [selection]);

  // ── Context menu handlers (main flow) ──
  const openStageCtx = useCallback((e: React.MouseEvent, stageId: string) => {
    e.preventDefault();
    const si = caseIr.stages.findIndex(s => s.id === stageId);
    setCtxMenu({ kind: "stage", stageId, x: e.clientX, y: e.clientY, canMoveUp: si > 0, canMoveDown: si < caseIr.stages.length - 1 });
  }, [caseIr.stages]);

  const openGroupCtx = useCallback((e: React.MouseEvent, stageId: string, groupId: string) => {
    e.preventDefault();
    const stage = caseIr.stages.find(s => s.id === stageId);
    const gi = stage ? stage.groups.findIndex(g => g.id === groupId) : -1;
    const groupCount = stage ? stage.groups.length : 0;
    setCtxMenu({ kind: "group", stageId, groupId, x: e.clientX, y: e.clientY, canMoveUp: gi > 0, canMoveDown: gi < groupCount - 1 });
  }, [caseIr.stages]);

  const openStepCtx = useCallback((e: React.MouseEvent, stageId: string, groupId: string, stepId: string) => {
    e.preventDefault();
    const stage = caseIr.stages.find(s => s.id === stageId);
    const group = stage?.groups.find(g => g.id === groupId);
    const sti = group ? group.steps.findIndex(s => s.id === stepId) : -1;
    const stepCount = group ? group.steps.length : 0;
    setCtxMenu({ kind: "step", stageId, groupId, stepId, x: e.clientX, y: e.clientY, canMoveUp: sti > 0, canMoveDown: sti < stepCount - 1 });
  }, [caseIr.stages]);

  const handleCtxRename = useCallback(() => {
    if (!ctxMenu) return;
    if (ctxMenu.kind === "stage") onSelectStage(ctxMenu.stageId);
    else if (ctxMenu.kind === "group" && ctxMenu.groupId) onSelectGroup(ctxMenu.stageId, ctxMenu.groupId);
    else if (ctxMenu.kind === "step" && ctxMenu.groupId && ctxMenu.stepId) onSelectStep(ctxMenu.stageId, ctxMenu.groupId, ctxMenu.stepId);
    setCtxMenu(null);
  }, [ctxMenu, onSelectStage, onSelectGroup, onSelectStep]);

  const handleCtxDuplicate = useCallback(() => {
    if (!ctxMenu) return;
    if (ctxMenu.kind === "step" && ctxMenu.groupId && ctxMenu.stepId) onDuplicateStep(ctxMenu.stageId, ctxMenu.groupId, ctxMenu.stepId);
    else if (ctxMenu.kind === "stage") onDuplicateStage(ctxMenu.stageId);
    setCtxMenu(null);
  }, [ctxMenu, onDuplicateStep, onDuplicateStage]);

  const handleCtxDelete = useCallback(() => {
    if (!ctxMenu) return;
    if (ctxMenu.kind === "step" && ctxMenu.groupId && ctxMenu.stepId) onDeleteStep(ctxMenu.stageId, ctxMenu.groupId, ctxMenu.stepId);
    else if (ctxMenu.kind === "group" && ctxMenu.groupId) onDeleteGroup(ctxMenu.stageId, ctxMenu.groupId);
    else if (ctxMenu.kind === "stage") onDeleteStage(ctxMenu.stageId);
    setCtxMenu(null);
  }, [ctxMenu, onDeleteStep, onDeleteGroup, onDeleteStage]);

  const handleCtxMoveUp = useCallback(() => {
    if (!ctxMenu) return;
    if (ctxMenu.kind === "stage") onMoveStage(ctxMenu.stageId, -1);
    else if (ctxMenu.kind === "group" && ctxMenu.groupId) onMoveGroup(ctxMenu.stageId, ctxMenu.groupId, -1);
    else if (ctxMenu.kind === "step" && ctxMenu.groupId && ctxMenu.stepId) onMoveStep(ctxMenu.stageId, ctxMenu.groupId, ctxMenu.stepId, -1);
    setCtxMenu(null);
  }, [ctxMenu, onMoveStage, onMoveGroup, onMoveStep]);

  const handleCtxMoveDown = useCallback(() => {
    if (!ctxMenu) return;
    if (ctxMenu.kind === "stage") onMoveStage(ctxMenu.stageId, 1);
    else if (ctxMenu.kind === "group" && ctxMenu.groupId) onMoveGroup(ctxMenu.stageId, ctxMenu.groupId, 1);
    else if (ctxMenu.kind === "step" && ctxMenu.groupId && ctxMenu.stepId) onMoveStep(ctxMenu.stageId, ctxMenu.groupId, ctxMenu.stepId, 1);
    setCtxMenu(null);
  }, [ctxMenu, onMoveStage, onMoveGroup, onMoveStep]);

  // ── Alt path context menu handlers ──
  const altPaths = caseIr.alternativePaths ?? [];

  const openAltStageCtx = useCallback((e: React.MouseEvent, stageId: string) => {
    e.preventDefault();
    const si = altPaths.findIndex(s => s.id === stageId);
    setAltCtxMenu({ kind: "stage", stageId, x: e.clientX, y: e.clientY, canMoveUp: si > 0, canMoveDown: si < altPaths.length - 1 });
  }, [altPaths]);

  const openAltGroupCtx = useCallback((e: React.MouseEvent, stageId: string, groupId: string) => {
    e.preventDefault();
    const stage = altPaths.find(s => s.id === stageId);
    const gi = stage ? stage.groups.findIndex(g => g.id === groupId) : -1;
    setAltCtxMenu({ kind: "group", stageId, groupId, x: e.clientX, y: e.clientY, canMoveUp: gi > 0, canMoveDown: gi < (stage?.groups.length ?? 0) - 1 });
  }, [altPaths]);

  const openAltStepCtx = useCallback((e: React.MouseEvent, stageId: string, groupId: string, stepId: string) => {
    e.preventDefault();
    const stage = altPaths.find(s => s.id === stageId);
    const group = stage?.groups.find(g => g.id === groupId);
    const sti = group ? group.steps.findIndex(s => s.id === stepId) : -1;
    setAltCtxMenu({ kind: "step", stageId, groupId, stepId, x: e.clientX, y: e.clientY, canMoveUp: sti > 0, canMoveDown: sti < (group?.steps.length ?? 0) - 1 });
  }, [altPaths]);

  const handleAltCtxRename = useCallback(() => {
    if (!altCtxMenu) return;
    if (altCtxMenu.kind === "stage") onSelectStage(altCtxMenu.stageId);
    else if (altCtxMenu.kind === "group" && altCtxMenu.groupId) onSelectGroup(altCtxMenu.stageId, altCtxMenu.groupId);
    else if (altCtxMenu.kind === "step" && altCtxMenu.groupId && altCtxMenu.stepId) onSelectStep(altCtxMenu.stageId, altCtxMenu.groupId, altCtxMenu.stepId);
    setAltCtxMenu(null);
  }, [altCtxMenu, onSelectStage, onSelectGroup, onSelectStep]);

  const handleAltCtxDuplicate = useCallback(() => {
    if (!altCtxMenu) return;
    if (altCtxMenu.kind === "step" && altCtxMenu.groupId && altCtxMenu.stepId) onDuplicateAltStep(altCtxMenu.stageId, altCtxMenu.groupId, altCtxMenu.stepId);
    else if (altCtxMenu.kind === "stage") onDuplicateAltStage(altCtxMenu.stageId);
    setAltCtxMenu(null);
  }, [altCtxMenu, onDuplicateAltStep, onDuplicateAltStage]);

  const handleAltCtxDelete = useCallback(() => {
    if (!altCtxMenu) return;
    if (altCtxMenu.kind === "step" && altCtxMenu.groupId && altCtxMenu.stepId) onDeleteAltStep(altCtxMenu.stageId, altCtxMenu.groupId, altCtxMenu.stepId);
    else if (altCtxMenu.kind === "group" && altCtxMenu.groupId) onDeleteAltGroup(altCtxMenu.stageId, altCtxMenu.groupId);
    else if (altCtxMenu.kind === "stage") onDeleteAltStage(altCtxMenu.stageId);
    setAltCtxMenu(null);
  }, [altCtxMenu, onDeleteAltStep, onDeleteAltGroup, onDeleteAltStage]);

  const handleAltCtxMoveUp = useCallback(() => {
    if (!altCtxMenu) return;
    if (altCtxMenu.kind === "stage") onMoveAltStage(altCtxMenu.stageId, -1);
    else if (altCtxMenu.kind === "group" && altCtxMenu.groupId) onMoveAltGroup(altCtxMenu.stageId, altCtxMenu.groupId, -1);
    else if (altCtxMenu.kind === "step" && altCtxMenu.groupId && altCtxMenu.stepId) onMoveAltStep(altCtxMenu.stageId, altCtxMenu.groupId, altCtxMenu.stepId, -1);
    setAltCtxMenu(null);
  }, [altCtxMenu, onMoveAltStage, onMoveAltGroup, onMoveAltStep]);

  const handleAltCtxMoveDown = useCallback(() => {
    if (!altCtxMenu) return;
    if (altCtxMenu.kind === "stage") onMoveAltStage(altCtxMenu.stageId, 1);
    else if (altCtxMenu.kind === "group" && altCtxMenu.groupId) onMoveAltGroup(altCtxMenu.stageId, altCtxMenu.groupId, 1);
    else if (altCtxMenu.kind === "step" && altCtxMenu.groupId && altCtxMenu.stepId) onMoveAltStep(altCtxMenu.stageId, altCtxMenu.groupId, altCtxMenu.stepId, 1);
    setAltCtxMenu(null);
  }, [altCtxMenu, onMoveAltStage, onMoveAltGroup, onMoveAltStep]);

  const TRIGGER_ICONS: Record<string, LucideIcon> = { timer: Timer, message: Mail, signal: Radio, none: Play, manual: Play };
  const isTriggerSelected = selection?.kind === "trigger";

  // Shared diagram content renderer
  const renderDiagramContent = (scale: number) => (
    <div className="p-4 min-w-max" style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
      {/* Header */}
      <div className={`flex items-center gap-3 mb-3 cursor-pointer rounded-lg px-2 py-1 transition-colors ${selection?.kind === "process" ? "diagram-header--selected" : ""}`}
        onClick={onSelectProcess}>
        <Settings size={14} className="text-primary flex-shrink-0" />
        <div>
          <h1 className="text-[15px] font-bold text-foreground">{caseIr.name}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] font-mono text-foreground-subtle">{caseIr.id} · v{caseIr.version}</span>
          </div>
        </div>
      </div>

      {/* Main Flow lane */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-3 px-1">
          <Workflow size={14} className="text-foreground-muted" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-foreground-muted">Main Flow</span>
          <div className="lane-divider--solid flex-1 h-px" />
        </div>
        <div className="flex gap-3 items-start">
          <TriggerCard trigger={caseIr.trigger} selected={isTriggerSelected} onClick={onSelectTrigger} />
          <div className="flex items-center self-center text-foreground-subtle">
            <div className="connector-line" />
            <div className="connector-arrowhead" />
          </div>
          {caseIr.stages.map((stage, i) => (
            <SectionCard key={stage.id} stage={stage} stageIdx={i}
              color={stage.color || SECTION_COLORS[i % SECTION_COLORS.length]} selection={selection}
              onSelectStage={onSelectStage} onSelectGroup={onSelectGroup} onSelectStep={onSelectStep}
              onAddStep={onAddStep} onAddGroup={onAddGroup}
              onStageCtx={openStageCtx} onGroupCtx={openGroupCtx} onStepCtx={openStepCtx} />
          ))}
          <button className="add-section-btn flex-shrink-0 flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed transition-all"
            onClick={onAddStage}>
            <Plus size={18} /><span className="text-[10px] font-medium">Add Section</span>
          </button>
        </div>
      </div>

      {/* Alternative Paths lane */}
      <div>
        <div className="flex items-center gap-2 mb-3 px-1">
          <Workflow size={14} className="text-foreground-muted" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-foreground-muted">
            Alternative Paths
            {altPaths.length > 0 && (
              <span className="alt-path-count ml-1.5 text-[9px] font-mono px-1 py-0.5 rounded">{altPaths.length}</span>
            )}
          </span>
          <div className="lane-divider--dashed flex-1 h-px" />
        </div>
        <div className="flex gap-3 items-start">
          {altPaths.map((stage, i) => (
            <SectionCard key={stage.id} stage={stage} stageIdx={i}
              color={stage.color || SECTION_COLORS[(i + 3) % SECTION_COLORS.length]} selection={selection}
              onSelectStage={onSelectStage} onSelectGroup={onSelectGroup} onSelectStep={onSelectStep}
              onAddStep={onAddAltStep} onAddGroup={onAddAltGroup}
              onStageCtx={openAltStageCtx} onGroupCtx={openAltGroupCtx} onStepCtx={openAltStepCtx} />
          ))}
          <button className="add-section-btn add-alt-btn flex-shrink-0 flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed transition-all"
            onClick={onAddAltStage}>
            <Workflow size={18} /><span className="text-[10px] font-medium">Add Alt. Path</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Normal inline diagram */}
      <div ref={containerRef} className="studio-canvas w-full h-full overflow-auto relative flex flex-col">
        <div className="flex-1 min-h-0">
          {renderDiagramContent(zoom)}
        </div>
        <div className="sticky bottom-0 flex justify-end pointer-events-none p-4 z-40">
          <div className="zoom-controls pointer-events-auto flex items-center gap-1 rounded-lg border px-1 py-1">
            <button onClick={zoomOut} className="zoom-btn w-7 h-7 rounded flex items-center justify-center transition-colors"
              title="Zoom out"><ZoomOut size={14} /></button>
            <span className="zoom-label text-[10px] font-mono w-10 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button onClick={zoomIn} className="zoom-btn w-7 h-7 rounded flex items-center justify-center transition-colors"
              title="Zoom in"><ZoomIn size={14} /></button>
            <div className="zoom-divider w-px h-4 mx-0.5" />
            <button onClick={zoomReset} className="zoom-btn w-7 h-7 rounded flex items-center justify-center transition-colors"
              title="Reset zoom"><Maximize2 size={13} /></button>
            <div className="zoom-divider w-px h-4 mx-0.5" />
            <button onClick={() => setFullscreen(true)} className="zoom-btn zoom-btn--expand w-7 h-7 rounded flex items-center justify-center transition-colors"
              title="Open fullscreen view">
              <Maximize2 size={13} />
            </button>
          </div>
        </div>

        {ctxMenu && (
          <ContextMenu menu={ctxMenu} onRename={handleCtxRename} onDuplicate={handleCtxDuplicate}
            onDelete={handleCtxDelete} onMoveUp={handleCtxMoveUp} onMoveDown={handleCtxMoveDown}
            onClose={() => setCtxMenu(null)} />
        )}
        {altCtxMenu && (
          <ContextMenu menu={altCtxMenu} onRename={handleAltCtxRename} onDuplicate={handleAltCtxDuplicate}
            onDelete={handleAltCtxDelete} onMoveUp={handleAltCtxMoveUp} onMoveDown={handleAltCtxMoveDown}
            onClose={() => setAltCtxMenu(null)} />
        )}
      </div>

      {/* Fullscreen overlay */}
      {fullscreen && (
        <div className="fullscreen-overlay fixed inset-0 z-[100] flex flex-col">
          <div className="fullscreen-header flex items-center gap-3 px-5 py-3 border-b flex-shrink-0">
            <Settings size={14} className="text-primary" />
            <span className="text-[14px] font-bold text-foreground">{caseIr.name}</span>
            <span className="toolbar-badge text-[10px] font-mono px-1.5 py-0.5 rounded">
              Fullscreen View
            </span>
            <div className="flex-1" />
            <span className="text-[10px] text-foreground-subtle">Press Esc to close</span>
            <button onClick={() => setFullscreen(false)}
              className="fullscreen-close hover-btn w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              title="Close fullscreen">
              <X size={18} />
            </button>
          </div>

          <div ref={fullRef} className="studio-canvas flex-1 overflow-auto flex flex-col">
            <div className="flex-1 min-h-0">
              {renderDiagramContent(fullZoom)}
            </div>
            <div className="sticky bottom-0 flex justify-end pointer-events-none p-4 z-40">
              <div className="zoom-controls pointer-events-auto flex items-center gap-1 rounded-lg border px-1 py-1">
                <button onClick={zoomOut} className="zoom-btn w-7 h-7 rounded flex items-center justify-center transition-colors"
                  title="Zoom out"><ZoomOut size={14} /></button>
                <span className="zoom-label text-[10px] font-mono w-10 text-center">
                  {Math.round(fullZoom * 100)}%
                </span>
                <button onClick={zoomIn} className="zoom-btn w-7 h-7 rounded flex items-center justify-center transition-colors"
                  title="Zoom in"><ZoomIn size={14} /></button>
                <div className="zoom-divider w-px h-4 mx-0.5" />
                <button onClick={zoomReset} className="zoom-btn w-7 h-7 rounded flex items-center justify-center transition-colors"
                  title="Reset zoom"><Maximize2 size={13} /></button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
