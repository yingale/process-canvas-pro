/**
 * Properties Panel – right sidebar for editing selected stage/step
 */
import { useState, useEffect } from "react";
import { X, ChevronRight, Plus, Trash2 } from "lucide-react";
import type { CaseIR, SelectionTarget, Stage, Step, StepType } from "@/types/caseIr";
import { STEP_TYPE_CONFIG } from "./FlowNodes";
import type { JsonPatch } from "@/types/caseIr";

interface PropertiesPanelProps {
  caseIr: CaseIR;
  selection: SelectionTarget;
  onClose: () => void;
  onPatch: (patch: JsonPatch) => void;
}

function findStageIndex(caseIr: CaseIR, stageId: string): number {
  return caseIr.stages.findIndex(s => s.id === stageId);
}

function findStepIndex(stage: Stage, stepId: string): number {
  return stage.steps.findIndex(s => s.id === stepId);
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-4 py-2 border-b border-border-subtle">
      <span className="text-[10px] font-bold uppercase tracking-widest text-foreground-muted">{title}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-medium text-foreground-muted">{label}</label>
      {children}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  mono,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <input
      className="w-full px-3 py-2 rounded-md border text-sm transition-colors focus:outline-none focus:ring-1"
      style={{
        background: "hsl(var(--surface-overlay))",
        borderColor: "hsl(var(--border))",
        color: "hsl(var(--foreground))",
        fontFamily: mono ? "var(--font-mono, monospace)" : undefined,
      }}
      onFocus={e => {
        e.currentTarget.style.borderColor = "hsl(var(--primary))";
        e.currentTarget.style.boxShadow = "0 0 0 1px hsl(var(--primary) / 0.3)";
      }}
      onBlur={e => {
        e.currentTarget.style.borderColor = "hsl(var(--border))";
        e.currentTarget.style.boxShadow = "none";
      }}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <div
        className="relative w-8 h-4 rounded-full transition-colors"
        style={{ background: checked ? "hsl(var(--primary))" : "hsl(var(--border))" }}
        onClick={() => onChange(!checked)}
      >
        <div
          className="absolute top-0.5 w-3 h-3 rounded-full transition-transform"
          style={{
            background: "hsl(var(--foreground))",
            transform: checked ? "translateX(17px)" : "translateX(2px)",
          }}
        />
      </div>
      <span className="text-sm text-foreground-muted">{label}</span>
    </label>
  );
}

// ─── Stage Properties ─────────────────────────────────────────────────────────

function StageProperties({
  stage,
  stageIdx,
  onPatch,
}: {
  stage: Stage;
  stageIdx: number;
  onPatch: (patch: JsonPatch) => void;
}) {
  const [name, setName] = useState(stage.name);

  useEffect(() => setName(stage.name), [stage.name]);

  const save = () => {
    if (name !== stage.name) {
      onPatch([{ op: "replace", path: `/stages/${stageIdx}/name`, value: name }]);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <Field label="Stage Name">
        <TextInput
          value={name}
          onChange={setName}
          placeholder="Stage name"
        />
      </Field>
      <Field label="Steps">
        <div className="font-mono text-sm text-foreground-muted">
          {stage.steps.length} step{stage.steps.length !== 1 ? "s" : ""}
        </div>
      </Field>
      <button
        className="w-full py-2 rounded-md text-sm font-medium transition-colors"
        style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
        onClick={save}
      >
        Save Stage
      </button>
    </div>
  );
}

// ─── Step Properties ──────────────────────────────────────────────────────────

function StepProperties({
  step,
  stageIdx,
  stepIdx,
  onPatch,
}: {
  step: Step;
  stageIdx: number;
  stepIdx: number;
  onPatch: (patch: JsonPatch) => void;
}) {
  const basePath = `/stages/${stageIdx}/steps/${stepIdx}`;
  const [name, setName] = useState(step.name);
  const [topic, setTopic] = useState(step.tech?.topic ?? "");
  const [asyncBefore, setAsyncBefore] = useState(step.tech?.asyncBefore ?? false);
  const [asyncAfter, setAsyncAfter] = useState(step.tech?.asyncAfter ?? false);

  useEffect(() => {
    setName(step.name);
    setTopic(step.tech?.topic ?? "");
    setAsyncBefore(step.tech?.asyncBefore ?? false);
    setAsyncAfter(step.tech?.asyncAfter ?? false);
  }, [step]);

  const cfg = STEP_TYPE_CONFIG[step.type];

  const save = () => {
    const patch: JsonPatch = [];
    if (name !== step.name) patch.push({ op: "replace", path: `${basePath}/name`, value: name });
    if (topic !== (step.tech?.topic ?? "")) {
      if (!step.tech) patch.push({ op: "add", path: `${basePath}/tech`, value: {} });
      patch.push({ op: (step.tech?.topic ? "replace" : "add"), path: `${basePath}/tech/topic`, value: topic });
    }
    if (asyncBefore !== (step.tech?.asyncBefore ?? false)) {
      if (!step.tech) patch.push({ op: "add", path: `${basePath}/tech`, value: {} });
      patch.push({ op: (step.tech?.asyncBefore !== undefined ? "replace" : "add"), path: `${basePath}/tech/asyncBefore`, value: asyncBefore });
    }
    if (asyncAfter !== (step.tech?.asyncAfter ?? false)) {
      if (!step.tech) patch.push({ op: "add", path: `${basePath}/tech`, value: {} });
      patch.push({ op: (step.tech?.asyncAfter !== undefined ? "replace" : "add"), path: `${basePath}/tech/asyncAfter`, value: asyncAfter });
    }
    if (patch.length > 0) onPatch(patch);
  };

  return (
    <div className="space-y-4 p-4">
      {/* Step type badge */}
      <div className="flex items-center gap-2">
        <div
          className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide"
          style={{
            background: `color-mix(in srgb, ${cfg.colorVar} 15%, transparent)`,
            color: cfg.colorVar,
          }}
        >
          {cfg.label}
        </div>
        {step.source?.bpmnElementId && (
          <span className="font-mono text-[10px] text-foreground-subtle truncate">{step.source.bpmnElementId}</span>
        )}
      </div>

      <Field label="Step Name">
        <TextInput value={name} onChange={setName} placeholder="Step name" />
      </Field>

      {(step.type === "automation") && (
        <>
          <SectionHeader title="Camunda 7 Extensions" />
          <div className="space-y-3 pt-1">
            <Field label="External Task Topic">
              <TextInput value={topic} onChange={setTopic} placeholder="e.g. fetch-emails" mono />
            </Field>
            <Toggle checked={asyncBefore} onChange={setAsyncBefore} label="Async Before" />
            <Toggle checked={asyncAfter} onChange={setAsyncAfter} label="Async After" />
          </div>
        </>
      )}

      {step.type === "decision" && (
        <>
          <SectionHeader title="Decision Branches" />
          <div className="space-y-2 pt-1">
            {step.branches.map((branch, bi) => (
              <div key={branch.id} className="rounded-lg border p-3 space-y-2"
                style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--surface-overlay))" }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground-muted">{branch.label}</span>
                  <ChevronRight size={12} className="text-foreground-subtle" />
                </div>
                <div className="font-mono text-[11px] text-foreground-subtle truncate">
                  {branch.condition}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {step.type === "foreach" && (
        <>
          <SectionHeader title="For Each Configuration" />
          <div className="space-y-3 pt-1">
            <Field label="Collection">
              <TextInput value={step.collectionExpression} onChange={() => {}} mono placeholder="${emails}" />
            </Field>
            <Field label="Element Variable">
              <TextInput value={step.elementVariable} onChange={() => {}} mono placeholder="email" />
            </Field>
          </div>
        </>
      )}

      {step.type === "callActivity" && (
        <>
          <SectionHeader title="Call Activity" />
          <div className="space-y-3 pt-1">
            <Field label="Called Element">
              <TextInput value={step.calledElement} onChange={() => {}} mono />
            </Field>
            {(step.inMappings?.length ?? 0) > 0 && (
              <Field label="In Mappings">
                <div className="space-y-1">
                  {step.inMappings?.map((m, i) => (
                    <div key={i} className="font-mono text-[11px] text-foreground-muted flex gap-2">
                      <span>{m.source}</span>
                      <span className="text-foreground-subtle">→</span>
                      <span>{m.target}</span>
                    </div>
                  ))}
                </div>
              </Field>
            )}
          </div>
        </>
      )}

      <button
        className="w-full py-2 rounded-md text-sm font-medium transition-colors"
        style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
        onClick={save}
      >
        Save Changes
      </button>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function PropertiesPanel({ caseIr, selection, onClose, onPatch }: PropertiesPanelProps) {
  if (!selection) {
    return (
      <div
        className="h-full flex flex-col border-l"
        style={{
          background: "hsl(var(--surface))",
          borderColor: "hsl(var(--border))",
          width: 280,
          minWidth: 280,
        }}
      >
        <div
          className="px-4 py-3 border-b"
          style={{ borderColor: "hsl(var(--border))" }}
        >
          <div className="text-[10px] font-bold uppercase tracking-widest text-foreground-muted">
            Properties
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "hsl(var(--surface-raised))", border: "1px solid hsl(var(--border))" }}
          >
            <ChevronRight size={18} className="text-foreground-subtle" />
          </div>
          <p className="text-[12px] text-foreground-muted leading-relaxed">
            Select a stage or step to view and edit its properties
          </p>
        </div>
      </div>
    );
  }

  const stageIdx = findStageIndex(caseIr, selection.stageId);
  const stage = caseIr.stages[stageIdx];
  if (!stage) return null;

  const stepIdx = selection.kind === "step" ? findStepIndex(stage, selection.stepId) : -1;
  const step = stepIdx >= 0 ? stage.steps[stepIdx] : null;

  return (
    <div
      className="h-full flex flex-col border-l animate-slide-right"
      style={{
        background: "hsl(var(--surface))",
        borderColor: "hsl(var(--border))",
        width: 280,
        minWidth: 280,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: "hsl(var(--border))" }}
      >
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-foreground-muted">
            {step ? "Step Properties" : "Stage Properties"}
          </div>
          <div className="text-sm font-semibold text-foreground mt-0.5 truncate max-w-[180px]">
            {step ? step.name : stage.name}
          </div>
        </div>
        <button
          className="w-7 h-7 rounded flex items-center justify-center hover:bg-surface-raised transition-colors"
          onClick={onClose}
        >
          <X size={14} className="text-foreground-muted" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {step ? (
          <StepProperties step={step} stageIdx={stageIdx} stepIdx={stepIdx} onPatch={onPatch} />
        ) : (
          <StageProperties stage={stage} stageIdx={stageIdx} onPatch={onPatch} />
        )}
      </div>
    </div>
  );
}

