/**
 * Properties Panel – right sidebar
 * Supports: Stage, Group, Step selection
 */
import { useState, useEffect } from "react";
import { X, ChevronRight, ArrowRight, Bell } from "lucide-react";
import type { CaseIR, SelectionTarget, Stage, Group, Step, IoParam } from "@/types/caseIr";
import { STEP_TYPE_CONFIG } from "./FlowNodes";
import type { JsonPatch } from "@/types/caseIr";

interface PropertiesPanelProps {
  caseIr: CaseIR;
  selection: SelectionTarget;
  onClose: () => void;
  onPatch: (patch: JsonPatch) => void;
}

function findStageIndex(caseIr: CaseIR, stageId: string) { return caseIr.stages.findIndex(s => s.id === stageId); }
function findGroupIndex(stage: Stage, groupId: string) { return stage.groups.findIndex(g => g.id === groupId); }
function findStepIndex(group: Group, stepId: string) { return group.steps.findIndex(s => s.id === stepId); }

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-4 py-2 border-b" style={{ borderColor: "hsl(var(--border))" }}>
      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "hsl(var(--foreground-muted))" }}>{title}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-medium" style={{ color: "hsl(var(--foreground-muted))" }}>{label}</label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, mono }: { value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean }) {
  return (
    <input
      className="w-full px-3 py-2 rounded-md border text-sm transition-colors focus:outline-none"
      style={{ background: "hsl(var(--surface-overlay))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))", fontFamily: mono ? "monospace" : undefined }}
      onFocus={e => { e.currentTarget.style.borderColor = "hsl(var(--primary))"; e.currentTarget.style.boxShadow = "0 0 0 1px hsl(var(--primary) / 0.3)"; }}
      onBlur={e => { e.currentTarget.style.borderColor = "hsl(var(--border))"; e.currentTarget.style.boxShadow = "none"; }}
      value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
    />
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <div className="relative w-8 h-4 rounded-full transition-colors" style={{ background: checked ? "hsl(var(--primary))" : "hsl(var(--border))" }} onClick={() => onChange(!checked)}>
        <div className="absolute top-0.5 w-3 h-3 rounded-full transition-transform" style={{ background: "hsl(var(--foreground))", transform: checked ? "translateX(17px)" : "translateX(2px)" }} />
      </div>
      <span className="text-sm" style={{ color: "hsl(var(--foreground-muted))" }}>{label}</span>
    </label>
  );
}

function IoParamsTable({ params, label, accent }: { params: IoParam[]; label: string; accent: string }) {
  if (!params.length) return null;
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: accent }}>{label}</div>
      <div className="rounded-lg overflow-hidden border" style={{ borderColor: "hsl(var(--border))" }}>
        {params.map((p, i) => (
          <div key={i} className="flex items-start gap-2 px-3 py-2 text-[11px]"
            style={{ background: i % 2 === 0 ? "hsl(var(--surface-overlay))" : "transparent", borderBottom: i < params.length - 1 ? "1px solid hsl(var(--border))" : undefined }}>
            <span className="font-semibold flex-shrink-0" style={{ color: "hsl(var(--foreground))", minWidth: 80 }}>{p.name}</span>
            <ArrowRight size={9} className="flex-shrink-0 mt-0.5" style={{ color: "hsl(var(--foreground-subtle))" }} />
            <span className="font-mono break-all" style={{ color: "hsl(var(--foreground-muted))" }}>{p.value || <em style={{ opacity: 0.5 }}>—</em>}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Stage properties ─────────────────────────────────────────────────────────

function StageProperties({ stage, stageIdx, onPatch }: { stage: Stage; stageIdx: number; onPatch: (p: JsonPatch) => void }) {
  const [name, setName] = useState(stage.name);
  useEffect(() => setName(stage.name), [stage.name]);
  const save = () => { if (name !== stage.name) onPatch([{ op: "replace", path: `/stages/${stageIdx}/name`, value: name }]); };
  const totalSteps = stage.groups.reduce((n, g) => n + g.steps.length, 0);
  return (
    <div className="space-y-4 p-4">
      <Field label="Stage Name"><TextInput value={name} onChange={setName} /></Field>
      <div className="text-[11px]" style={{ color: "hsl(var(--foreground-muted))" }}>
        {stage.groups.length} group{stage.groups.length !== 1 ? "s" : ""} · {totalSteps} step{totalSteps !== 1 ? "s" : ""}
      </div>
      <button className="w-full py-2 rounded-md text-sm font-medium" style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }} onClick={save}>Save Stage</button>
    </div>
  );
}

// ─── Group properties ─────────────────────────────────────────────────────────

function GroupProperties({ group, stageIdx, groupIdx, onPatch }: { group: Group; stageIdx: number; groupIdx: number; onPatch: (p: JsonPatch) => void }) {
  const [name, setName] = useState(group.name);
  useEffect(() => setName(group.name), [group.name]);
  const save = () => { if (name !== group.name) onPatch([{ op: "replace", path: `/stages/${stageIdx}/groups/${groupIdx}/name`, value: name }]); };
  return (
    <div className="space-y-4 p-4">
      <Field label="Group Name"><TextInput value={name} onChange={setName} /></Field>
      <div className="text-[11px]" style={{ color: "hsl(var(--foreground-muted))" }}>{group.steps.length} step{group.steps.length !== 1 ? "s" : ""}</div>
      <button className="w-full py-2 rounded-md text-sm font-medium" style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }} onClick={save}>Save Group</button>
    </div>
  );
}

// ─── Step properties ──────────────────────────────────────────────────────────

function StepProperties({ step, stageIdx, groupIdx, stepIdx, onPatch }: { step: Step; stageIdx: number; groupIdx: number; stepIdx: number; onPatch: (p: JsonPatch) => void }) {
  const basePath = `/stages/${stageIdx}/groups/${groupIdx}/steps/${stepIdx}`;
  const [name, setName] = useState(step.name);
  const [topic, setTopic] = useState(step.tech?.topic ?? "");
  const [asyncBefore, setAsyncBefore] = useState(step.tech?.asyncBefore ?? false);
  const [asyncAfter, setAsyncAfter] = useState(step.tech?.asyncAfter ?? false);

  useEffect(() => {
    setName(step.name); setTopic(step.tech?.topic ?? "");
    setAsyncBefore(step.tech?.asyncBefore ?? false); setAsyncAfter(step.tech?.asyncAfter ?? false);
  }, [step]);

  const cfg = STEP_TYPE_CONFIG[step.type];
  const inputParams = step.tech?.inputParameters ?? [];
  const outputParams = step.tech?.outputParameters ?? [];

  const save = () => {
    const patch: JsonPatch = [];
    if (name !== step.name) patch.push({ op: "replace", path: `${basePath}/name`, value: name });
    if (topic !== (step.tech?.topic ?? "")) {
      if (!step.tech) patch.push({ op: "add", path: `${basePath}/tech`, value: {} });
      patch.push({ op: step.tech?.topic ? "replace" : "add", path: `${basePath}/tech/topic`, value: topic });
    }
    if (asyncBefore !== (step.tech?.asyncBefore ?? false)) {
      if (!step.tech) patch.push({ op: "add", path: `${basePath}/tech`, value: {} });
      patch.push({ op: step.tech?.asyncBefore !== undefined ? "replace" : "add", path: `${basePath}/tech/asyncBefore`, value: asyncBefore });
    }
    if (asyncAfter !== (step.tech?.asyncAfter ?? false)) {
      if (!step.tech) patch.push({ op: "add", path: `${basePath}/tech`, value: {} });
      patch.push({ op: step.tech?.asyncAfter !== undefined ? "replace" : "add", path: `${basePath}/tech/asyncAfter`, value: asyncAfter });
    }
    if (patch.length) onPatch(patch);
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide"
          style={{ background: `color-mix(in srgb, ${cfg.colorVar} 15%, transparent)`, color: cfg.colorVar }}>
          {cfg.label}
        </div>
        {step.source?.bpmnElementId && (
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded truncate max-w-[140px]"
            style={{ background: "hsl(var(--surface-raised))", color: "hsl(var(--foreground-subtle))" }} title={step.source.bpmnElementId}>
            {step.source.bpmnElementId}
          </span>
        )}
      </div>

      {step.description && (
        <div className="text-[11px] px-3 py-2 rounded-lg italic"
          style={{ background: "hsl(var(--surface-overlay))", color: "hsl(var(--foreground-muted))", border: "1px solid hsl(var(--border))" }}>
          {step.description}
        </div>
      )}

      <Field label="Step Name"><TextInput value={name} onChange={setName} /></Field>

      {(step.type === "automation" || step.type === "user") && (
        <>
          <SectionHeader title="Camunda Extensions" />
          <div className="space-y-3 pt-1">
            <Field label="External Task Topic"><TextInput value={topic} onChange={setTopic} placeholder="e.g. fetch-emails" mono /></Field>
            <Toggle checked={asyncBefore} onChange={setAsyncBefore} label="Async Before" />
            <Toggle checked={asyncAfter} onChange={setAsyncAfter} label="Async After" />
          </div>
        </>
      )}

      {step.type === "intermediateEvent" && (
        <>
          <SectionHeader title="Event Details" />
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-2">
              <Bell size={13} style={{ color: "hsl(199 80% 42%)" }} />
              <span className="text-[12px] font-medium" style={{ color: "hsl(var(--foreground))" }}>
                {step.eventSubType.charAt(0).toUpperCase() + step.eventSubType.slice(1)} Event
              </span>
            </div>
            {step.messageRef && <Field label="Message"><div className="font-mono text-[11px] px-3 py-2 rounded-lg" style={{ background: "hsl(var(--surface-overlay))", color: "hsl(var(--foreground-muted))" }}>{step.messageRef}</div></Field>}
            {step.timerExpression && <Field label="Timer"><div className="font-mono text-[11px] px-3 py-2 rounded-lg" style={{ background: "hsl(var(--surface-overlay))", color: "hsl(var(--foreground-muted))" }}>{step.timerExpression}</div></Field>}
          </div>
        </>
      )}

      {step.type === "decision" && (
        <>
          <SectionHeader title="Decision Branches" />
          <div className="space-y-2 pt-1">
            {step.branches.map(branch => (
              <div key={branch.id} className="rounded-lg border p-3 space-y-1.5"
                style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--surface-overlay))" }}>
                <div className="text-[11px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{branch.label}</div>
                <div className="font-mono text-[10px] break-all" style={{ color: "hsl(var(--foreground-subtle))" }}>{branch.condition}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {step.type === "foreach" && (
        <>
          <SectionHeader title="For Each" />
          <div className="space-y-3 pt-1">
            <Field label="Collection"><TextInput value={step.collectionExpression} onChange={() => {}} mono /></Field>
            <Field label="Element Variable"><TextInput value={step.elementVariable} onChange={() => {}} mono /></Field>
            <div className="text-[11px]" style={{ color: "hsl(var(--foreground-muted))" }}>Sequential: <strong>{step.isSequential ? "Yes" : "No"}</strong></div>
          </div>
        </>
      )}

      {step.type === "callActivity" && (
        <>
          <SectionHeader title="Call Activity" />
          <div className="space-y-3 pt-1">
            <Field label="Called Element"><TextInput value={step.calledElement} onChange={() => {}} mono /></Field>
          </div>
        </>
      )}

      {(inputParams.length > 0 || outputParams.length > 0) && (
        <>
          <SectionHeader title="Parameters" />
          <div className="space-y-3 pt-1">
            <IoParamsTable params={inputParams} label="Input Parameters" accent="hsl(213 80% 50%)" />
            <IoParamsTable params={outputParams} label="Output Parameters" accent="hsl(134 58% 38%)" />
          </div>
        </>
      )}

      <button className="w-full py-2 rounded-md text-sm font-medium" style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }} onClick={save}>Save Changes</button>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function PropertiesPanel({ caseIr, selection, onClose, onPatch }: PropertiesPanelProps) {
  const panelStyle = { background: "hsl(var(--surface))", borderColor: "hsl(var(--border))", width: 290, minWidth: 290 };

  if (!selection) {
    return (
      <div className="h-full flex flex-col border-l" style={panelStyle}>
        <div className="px-4 py-3 border-b" style={{ borderColor: "hsl(var(--border))" }}>
          <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "hsl(var(--foreground-muted))" }}>Properties</div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "hsl(var(--surface-raised))", border: "1px solid hsl(var(--border))" }}>
            <ChevronRight size={18} style={{ color: "hsl(var(--foreground-subtle))" }} />
          </div>
          <p className="text-[12px] leading-relaxed" style={{ color: "hsl(var(--foreground-muted))" }}>Select a stage, group, or step to view and edit its properties</p>
        </div>
      </div>
    );
  }

  const stageIdx = findStageIndex(caseIr, selection.stageId);
  const stage = caseIr.stages[stageIdx];
  if (!stage) return null;

  let title = "Stage Properties";
  let subtitle = stage.name;
  let content: React.ReactNode = <StageProperties stage={stage} stageIdx={stageIdx} onPatch={onPatch} />;

  if (selection.kind === "group" || selection.kind === "step") {
    const gi = findGroupIndex(stage, selection.groupId);
    const group = stage.groups[gi];
    if (!group) return null;

    if (selection.kind === "group") {
      title = "Group Properties";
      subtitle = group.name;
      content = <GroupProperties group={group} stageIdx={stageIdx} groupIdx={gi} onPatch={onPatch} />;
    } else {
      const sti = findStepIndex(group, selection.stepId);
      const step = group.steps[sti];
      if (!step) return null;
      title = "Step Properties";
      subtitle = step.name;
      content = <StepProperties step={step} stageIdx={stageIdx} groupIdx={gi} stepIdx={sti} onPatch={onPatch} />;
    }
  }

  return (
    <div className="h-full flex flex-col border-l" style={panelStyle}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "hsl(var(--border))" }}>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "hsl(var(--foreground-muted))" }}>{title}</div>
          <div className="text-sm font-semibold mt-0.5 truncate max-w-[200px]" style={{ color: "hsl(var(--foreground))" }}>{subtitle}</div>
        </div>
        <button className="w-7 h-7 rounded flex items-center justify-center hover:bg-surface-raised transition-colors" onClick={onClose}>
          <X size={14} style={{ color: "hsl(var(--foreground-muted))" }} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">{content}</div>
    </div>
  );
}
