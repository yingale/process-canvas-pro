/**
 * Case Lifecycle Model Diagram
 * Hierarchy: Section (Stage) → Groups → Steps
 * Visual design: Pega-style horizontal cards with group sub-sections inside each stage.
 */
import { useState, useCallback, useRef, useEffect } from "react";
import {
  Plus, MoreHorizontal, ChevronDown, ChevronRight,
  Pencil, Copy, Trash2, GitBranch, Bot, User,
  Repeat2, ExternalLink, Zap, AlignLeft, Bell, Layers,
  ArrowUp, ArrowDown, Timer, Mail, Radio, Play,
  Square, AlertTriangle, Settings,
  type LucideIcon,
} from "lucide-react";
import type { CaseIR, Stage, Group, Step, StepType, SelectionTarget, Trigger, EndEvent, BoundaryEvent } from "@/types/caseIr";

// ─── Step type config ──────────────────────────────────────────────────────────

const STEP_TYPE_META: Record<StepType, { label: string; color: string; Icon: LucideIcon }> = {
  automation:        { label: "Automation",  color: "hsl(213 80% 50%)",  Icon: Bot },
  user:              { label: "User Task",   color: "hsl(32 86% 48%)",   Icon: User },
  decision:          { label: "Decision",    color: "hsl(134 58% 38%)",  Icon: GitBranch },
  foreach:           { label: "For Each",    color: "hsl(268 60% 50%)",  Icon: Repeat2 },
  callActivity:      { label: "Subprocess",  color: "hsl(193 70% 42%)",  Icon: ExternalLink },
  intermediateEvent: { label: "Wait/Event",  color: "hsl(199 80% 42%)",  Icon: Bell },
};

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
      className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[12px] transition-colors rounded"
      style={{ color: disabled ? "hsl(var(--foreground-subtle))" : danger ? "hsl(var(--destructive))" : "hsl(var(--foreground))", cursor: disabled ? "default" : "pointer" }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = danger ? "hsl(var(--destructive) / 0.08)" : "hsl(var(--surface-raised))"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
      onClick={() => { if (!disabled) { onClick(); onClose(); } }}>
      <Icon size={12} />{label}
    </button>
  );

  return (
    <div ref={ref} className="fixed z-50 rounded-lg shadow-lg border py-1 min-w-[145px]"
      style={{ top: menu.y, left: menu.x, background: "hsl(var(--surface))", borderColor: "hsl(var(--border))", boxShadow: "0 8px 24px hsl(0 0% 0% / 0.14)" }}>
      <Item icon={Pencil} label="Rename" onClick={onRename} />
      {menu.kind !== "group" && <Item icon={Copy} label="Duplicate" onClick={onDuplicate} />}
      <div className="my-1 border-t" style={{ borderColor: "hsl(var(--border))" }} />
      <Item icon={ArrowUp} label="Move Up" disabled={!menu.canMoveUp} onClick={onMoveUp} />
      <Item icon={ArrowDown} label="Move Down" disabled={!menu.canMoveDown} onClick={onMoveDown} />
      <div className="my-1 border-t" style={{ borderColor: "hsl(var(--border))" }} />
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
  const isAsync = step.tech?.asyncBefore || step.tech?.asyncAfter;
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
      className="group relative rounded-md cursor-pointer transition-all"
      style={{
        background: selected ? `color-mix(in srgb, ${color} 8%, hsl(var(--surface)))` : hover ? "hsl(var(--surface-raised))" : "hsl(var(--surface))",
        border: `1px solid ${selected ? color + "60" : "hsl(var(--border))"}`,
        marginBottom: 5,
      }}
      onClick={onSelect} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
    >
      <div className="flex items-start gap-2.5 px-2.5 py-2">
        <div className="flex-shrink-0 rounded-sm flex items-center justify-center mt-0.5"
          style={{ width: 16, height: 16, background: `${meta.color}22`, marginTop: 3 }}>
          <meta.Icon size={9} style={{ color: meta.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold truncate" style={{ color: "hsl(var(--foreground))" }}>{step.name}</span>
            {isAsync && <span title="Async"><Zap size={9} style={{ color: "hsl(var(--warning))", flexShrink: 0 }} /></span>}
          </div>
          <div className="text-[10px] mt-0.5 truncate" style={{ color: "hsl(var(--foreground-muted))" }}>{subLabel}</div>
          {(inputCount > 0 || outputCount > 0) && (
            <div className="flex items-center gap-1 mt-1">
              {inputCount > 0 && <span className="text-[9px] px-1 py-0.5 rounded font-mono" style={{ background: "hsl(213 80% 50% / 0.12)", color: "hsl(213 80% 50%)" }}>IN:{inputCount}</span>}
              {outputCount > 0 && <span className="text-[9px] px-1 py-0.5 rounded font-mono" style={{ background: "hsl(134 58% 38% / 0.12)", color: "hsl(134 58% 38%)" }}>OUT:{outputCount}</span>}
            </div>
          )}
          {step.description && <div className="text-[9px] mt-0.5 truncate italic" style={{ color: "hsl(var(--foreground-subtle))" }}>{step.description}</div>}
          {/* Boundary events indicators */}
          {step.boundaryEvents && step.boundaryEvents.length > 0 && (
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              {step.boundaryEvents.map(be => (
                <button
                  key={be.id}
                  className="text-[8px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5 transition-colors"
                  style={{
                    background: be.cancelActivity !== false ? "hsl(0 68% 50% / 0.12)" : "hsl(32 86% 48% / 0.12)",
                    color: be.cancelActivity !== false ? "hsl(0 68% 50%)" : "hsl(32 86% 48%)",
                    border: `1px solid ${be.cancelActivity !== false ? "hsl(0 68% 50% / 0.3)" : "hsl(32 86% 48% / 0.3)"}`,
                  }}
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
          <button className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: "hsl(var(--foreground-muted))" }}
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
      {/* Group header */}
      <div
        className="flex items-center gap-1.5 px-2 py-1 rounded-md cursor-pointer transition-all select-none"
        style={{ background: isGroupSel || hover ? `color-mix(in srgb, ${color} 6%, hsl(var(--surface-raised)))` : "transparent" }}
        onClick={() => onSelectGroup(stageId, group.id)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <button className="flex-shrink-0 opacity-50 hover:opacity-100" onClick={e => { e.stopPropagation(); setCollapsed(c => !c); }}
          style={{ color: "hsl(var(--foreground-muted))" }}>
          {collapsed ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
        </button>
        <Layers size={10} style={{ color, flexShrink: 0 }} />
        <span className="flex-1 text-[11px] font-semibold truncate" style={{ color: "hsl(var(--foreground))" }}>{group.name}</span>
        <span className="text-[9px] font-mono px-1 rounded" style={{ background: `${color}18`, color }}>{group.steps.length}</span>
        {hover && (
          <button className="w-4 h-4 rounded flex items-center justify-center opacity-60 hover:opacity-100"
            style={{ color: "hsl(var(--foreground-muted))" }}
            onClick={e => { e.stopPropagation(); onGroupCtx(e, group.id); }}>
            <MoreHorizontal size={10} />
          </button>
        )}
      </div>

      {/* Steps */}
      {!collapsed && (
        <div className="ml-4 mt-1">
          {group.steps.length === 0 && (
            <div className="text-center py-3 text-[10px] rounded-lg mb-1.5"
              style={{ color: "hsl(var(--foreground-subtle))", border: `1px dashed hsl(var(--border))` }}>
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
            className="w-full flex items-center justify-center gap-1 py-1.5 rounded border-dashed border text-[10px] font-medium transition-all"
            style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--foreground-subtle))", background: "transparent" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.color = color; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "hsl(var(--border))"; e.currentTarget.style.color = "hsl(var(--foreground-subtle))"; }}
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
  const totalSteps = stage.groups.reduce((n, g) => n + g.steps.length, 0);

  return (
    <div className="flex-shrink-0 flex flex-col rounded-xl border transition-all"
      style={{
        width: 290,
        background: "hsl(var(--surface))",
        borderColor: isStageSelected ? color : "hsl(var(--border))",
        boxShadow: isStageSelected ? `0 0 0 2px ${color}30, 0 4px 16px hsl(0 0% 0% / 0.06)` : "0 2px 8px hsl(0 0% 0% / 0.04)",
        borderTop: `3px solid ${color}`,
      }}>

      {/* Stage header */}
      <div className="flex items-center gap-2 px-3 py-2.5 cursor-pointer rounded-t-xl select-none"
        style={{ background: headerHover || isStageSelected ? `color-mix(in srgb, ${color} 6%, hsl(var(--surface)))` : "transparent" }}
        onClick={() => onSelectStage(stage.id)}
        onMouseEnter={() => setHeaderHover(true)}
        onMouseLeave={() => setHeaderHover(false)}
      >
        <button className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
          onClick={e => { e.stopPropagation(); setCollapsed(c => !c); }}
          style={{ color: "hsl(var(--foreground-muted))" }}>
          {collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
        </button>
        <span className="flex-1 text-[13px] font-bold truncate" style={{ color: "hsl(var(--foreground))" }}>{stage.name}</span>
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md"
          style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}>
          {stage.groups.length}g · {totalSteps}s
        </span>
        {headerHover && (
          <button className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center opacity-60 hover:opacity-100"
            style={{ color: "hsl(var(--foreground-muted))" }}
            onClick={e => { e.stopPropagation(); onStageCtx(e, stage.id); }}>
            <MoreHorizontal size={13} />
          </button>
        )}
      </div>

      <div className="mx-3" style={{ height: 1, background: `color-mix(in srgb, ${color} 20%, hsl(var(--border)))` }} />

      {/* Groups */}
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

          {/* Add Group */}
          <button
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-md border-dashed border transition-all text-[11px] font-medium mt-1"
            style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--foreground-subtle))", background: "transparent" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.color = color; e.currentTarget.style.background = `color-mix(in srgb, ${color} 4%, transparent)`; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "hsl(var(--border))"; e.currentTarget.style.color = "hsl(var(--foreground-subtle))"; e.currentTarget.style.background = "transparent"; }}
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
  const accentColor = "hsl(var(--primary))";

  return (
    <div
      className="flex-shrink-0 rounded-xl border cursor-pointer transition-all"
      style={{
        width: 160,
        background: selected ? `color-mix(in srgb, ${accentColor} 6%, hsl(var(--surface)))` : hover ? "hsl(var(--surface-raised))" : "hsl(var(--surface))",
        borderColor: selected ? accentColor : "hsl(var(--border))",
        boxShadow: selected ? `0 0 0 2px hsl(var(--primary) / 0.3), 0 4px 16px hsl(0 0% 0% / 0.06)` : "0 2px 8px hsl(0 0% 0% / 0.04)",
        borderTop: `3px solid ${accentColor}`,
      }}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="px-3 py-3 flex flex-col items-center gap-2 text-center">
        <div className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: `hsl(var(--primary) / 0.12)` }}>
          <Icon size={18} style={{ color: accentColor }} />
        </div>
        <div>
          <div className="text-[11px] font-bold" style={{ color: "hsl(var(--foreground))" }}>{label}</div>
          {subLabel && (
            <div className="text-[10px] font-mono mt-0.5 truncate max-w-[130px]" style={{ color: "hsl(var(--foreground-muted))" }}>
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
      className="flex-shrink-0 rounded-xl border cursor-pointer transition-all"
      style={{
        width: 130,
        background: selected ? `color-mix(in srgb, ${accentColor} 6%, hsl(var(--surface)))` : hover ? "hsl(var(--surface-raised))" : "hsl(var(--surface))",
        borderColor: selected ? accentColor : "hsl(var(--border))",
        boxShadow: selected ? `0 0 0 2px hsl(0 68% 50% / 0.3), 0 4px 16px hsl(0 0% 0% / 0.06)` : "0 2px 8px hsl(0 0% 0% / 0.04)",
        borderTop: `3px solid ${accentColor}`,
      }}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="px-3 py-3 flex flex-col items-center gap-2 text-center">
        <div className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "hsl(0 68% 50% / 0.12)" }}>
          <Icon size={18} style={{ color: accentColor }} />
        </div>
        <div className="text-[11px] font-bold" style={{ color: "hsl(var(--foreground))" }}>{label}</div>
        {endEvent.name && <div className="text-[10px] mt-0.5 truncate max-w-[110px]" style={{ color: "hsl(var(--foreground-muted))" }}>{endEvent.name}</div>}
      </div>
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
}

export default function LifecycleDiagram({
  caseIr, selection,
  onSelectTrigger, onSelectEndEvent, onSelectProcess, onSelectBoundaryEvent,
  onSelectStage, onSelectGroup, onSelectStep,
  onAddStep, onAddGroup, onAddStage,
  onDeleteStage, onDeleteGroup, onDeleteStep,
  onDuplicateStep, onDuplicateStage,
  onMoveStage, onMoveGroup, onMoveStep,
}: LifecycleDiagramProps) {
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null);

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

  const triggerLabel = caseIr.trigger.type === "none" ? "Manual Start"
    : caseIr.trigger.type === "timer" ? `Timer: ${caseIr.trigger.expression ?? "scheduled"}`
    : caseIr.trigger.type.charAt(0).toUpperCase() + caseIr.trigger.type.slice(1);

  const TRIGGER_ICONS: Record<string, LucideIcon> = { timer: Timer, message: Mail, signal: Radio, none: Play, manual: Play };
  const TriggerIcon = TRIGGER_ICONS[caseIr.trigger.type] ?? Play;
  const isTriggerSelected = selection?.kind === "trigger";

  return (
    <div className="w-full h-full overflow-auto" style={{ background: "hsl(var(--canvas-bg))" }}>
      <div className="p-6 min-w-max min-h-full">

        {/* Header – clickable for process properties */}
        <div className="flex items-center gap-3 mb-5 cursor-pointer rounded-lg px-2 py-1 transition-colors"
          style={{ background: selection?.kind === "process" ? "hsl(var(--primary) / 0.06)" : "transparent" }}
          onClick={onSelectProcess}
        >
          <Settings size={14} style={{ color: "hsl(var(--primary))", flexShrink: 0 }} />
          <div>
            <h1 className="text-[15px] font-bold" style={{ color: "hsl(var(--foreground))" }}>{caseIr.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-mono" style={{ color: "hsl(var(--foreground-subtle))" }}>
                {caseIr.id} · v{caseIr.version}
              </span>
            </div>
          </div>
        </div>

        {/* Main Flow lane */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3 px-1">
            <AlignLeft size={14} style={{ color: "hsl(var(--foreground-muted))" }} />
            <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "hsl(var(--foreground-muted))" }}>Main Flow</span>
            <div className="flex-1 h-px" style={{ background: "hsl(var(--border))" }} />
          </div>
          <div className="flex gap-3 items-start">
            {/* Trigger Card */}
            <TriggerCard trigger={caseIr.trigger} selected={isTriggerSelected} onClick={onSelectTrigger} />

            {/* Arrow connector */}
            <div className="flex items-center self-center" style={{ color: "hsl(var(--foreground-subtle))" }}>
              <div style={{ width: 24, height: 2, background: "hsl(var(--border))" }} />
              <div style={{ width: 0, height: 0, borderTop: "5px solid transparent", borderBottom: "5px solid transparent", borderLeft: "6px solid hsl(var(--border))" }} />
            </div>

            {caseIr.stages.map((stage, i) => (
              <SectionCard
                key={stage.id}
                stage={stage}
                stageIdx={i}
                color={SECTION_COLORS[i % SECTION_COLORS.length]}
                selection={selection}
                onSelectStage={onSelectStage}
                onSelectGroup={onSelectGroup}
                onSelectStep={onSelectStep}
                onAddStep={onAddStep}
                onAddGroup={onAddGroup}
                onStageCtx={openStageCtx}
                onGroupCtx={openGroupCtx}
                onStepCtx={openStepCtx}
              />
            ))}
            {/* Add Section */}
            <button
              className="flex-shrink-0 flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed transition-all"
              style={{ width: 100, height: 90, borderColor: "hsl(var(--border))", color: "hsl(var(--foreground-subtle))", background: "transparent" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "hsl(var(--primary))"; e.currentTarget.style.color = "hsl(var(--primary))"; e.currentTarget.style.background = "hsl(var(--primary-dim))"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "hsl(var(--border))"; e.currentTarget.style.color = "hsl(var(--foreground-subtle))"; e.currentTarget.style.background = "transparent"; }}
              onClick={onAddStage}
            >
              <Plus size={20} />
              <span className="text-[10px] font-medium">Add Section</span>
            </button>
          </div>
        </div>

        {/* Alt Paths lane – shows boundary events (error/fallback flows) */}
        {(() => {
          const allBoundaryEvents: Array<{ stageId: string; groupId: string; stepId: string; stepName: string; be: import("@/types/caseIr").BoundaryEvent }> = [];
          caseIr.stages.forEach(stage => {
            stage.groups.forEach(group => {
              group.steps.forEach(step => {
                step.boundaryEvents?.forEach(be => {
                  allBoundaryEvents.push({ stageId: stage.id, groupId: group.id, stepId: step.id, stepName: step.name, be });
                });
              });
            });
          });

          return (
            <div>
              <div className="flex items-center gap-2 mb-3 px-1">
                <AlignLeft size={14} style={{ color: "hsl(var(--foreground-muted))" }} />
                <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "hsl(var(--foreground-muted))" }}>
                  Alternative Paths
                  {allBoundaryEvents.length > 0 && (
                    <span className="ml-1.5 text-[9px] font-mono px-1 py-0.5 rounded" style={{ background: "hsl(var(--warning) / 0.12)", color: "hsl(var(--warning))" }}>
                      {allBoundaryEvents.length}
                    </span>
                  )}
                </span>
                <div className="flex-1 h-px" style={{ background: `repeating-linear-gradient(90deg, hsl(var(--border)) 0, hsl(var(--border)) 6px, transparent 6px, transparent 12px)` }} />
              </div>
              <div className="flex gap-3 flex-wrap">
                {allBoundaryEvents.length === 0 ? (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl border text-[11px]"
                    style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--foreground-subtle))", background: "hsl(var(--surface))" }}>
                    <AlertTriangle size={13} style={{ opacity: 0.5 }} />
                    <span>No boundary events (error/fallback handlers) defined on any step. Add boundary events to steps to create alternative paths.</span>
                  </div>
                ) : (
                  allBoundaryEvents.map(({ stageId, groupId, stepId, stepName, be }) => {
                    const isSelected = selection?.kind === "boundaryEvent" && selection.boundaryEventId === be.id;
                    const accentColor = be.cancelActivity !== false ? "hsl(0 68% 50%)" : "hsl(32 86% 48%)";
                    return (
                      <div
                        key={be.id}
                        className="flex-shrink-0 rounded-xl border cursor-pointer transition-all"
                        style={{
                          width: 220,
                          background: isSelected ? `color-mix(in srgb, ${accentColor} 6%, hsl(var(--surface)))` : "hsl(var(--surface))",
                          borderColor: isSelected ? accentColor : "hsl(var(--border))",
                          boxShadow: isSelected ? `0 0 0 2px ${accentColor}30` : "0 2px 8px hsl(0 0% 0% / 0.04)",
                          borderTop: `3px solid ${accentColor}`,
                        }}
                        onClick={() => onSelectBoundaryEvent(stageId, groupId, stepId, be.id)}
                      >
                        <div className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5 mb-1">
                            <AlertTriangle size={11} style={{ color: accentColor }} />
                            <span className="text-[11px] font-bold truncate" style={{ color: "hsl(var(--foreground))" }}>
                              {be.name || `${be.eventType} handler`}
                            </span>
                          </div>
                          <div className="text-[10px]" style={{ color: "hsl(var(--foreground-muted))" }}>
                            {be.cancelActivity !== false ? "Interrupting" : "Non-interrupting"} · {be.eventType}
                          </div>
                          <div className="text-[9px] mt-1 truncate" style={{ color: "hsl(var(--foreground-subtle))" }}>
                            on: {stepName}
                          </div>
                          {be.expression && (
                            <div className="text-[9px] font-mono mt-0.5 truncate" style={{ color: "hsl(var(--foreground-subtle))" }}>
                              {be.expression}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {ctxMenu && (
        <ContextMenu
          menu={ctxMenu}
          onRename={handleCtxRename}
          onDuplicate={handleCtxDuplicate}
          onDelete={handleCtxDelete}
          onMoveUp={handleCtxMoveUp}
          onMoveDown={handleCtxMoveDown}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </div>
  );
}

