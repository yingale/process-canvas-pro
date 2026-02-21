/**
 * Properties Panel – fully-editable, schema-driven Camunda 7 property editor.
 * Uses camundaSchema.ts (derived from camunda-bpmn-moddle) to render all
 * applicable property groups for every step type, with placeholders/defaults
 * when values are absent.
 */
import { useState, useEffect, useCallback } from "react";
import {
  X, ChevronRight, Plus, Trash2, ArrowRight, ChevronDown, Settings2, PanelRightClose, PanelRightOpen,
} from "lucide-react";
import type { CaseIR, SelectionTarget, Stage, Group, Step, IoParam, EndEvent, ProcessProperties } from "@/types/caseIr";
import { STEP_TYPE_CONFIG } from "./FlowNodes";
import { CAMUNDA_PROP_GROUPS, TRIGGER_PROP_GROUPS, type PropField } from "./camundaSchema";
import type { JsonPatch, Trigger } from "@/types/caseIr";
import "./studio.css";

// ─── Path helpers ─────────────────────────────────────────────────────────────

function findStageLocation(caseIr: CaseIR, stageId: string): { arrayPath: string; index: number; stage: Stage } | null {
  const si = caseIr.stages.findIndex(s => s.id === stageId);
  if (si >= 0) return { arrayPath: "/stages", index: si, stage: caseIr.stages[si] };
  const altPaths = caseIr.alternativePaths ?? [];
  const ai = altPaths.findIndex(s => s.id === stageId);
  if (ai >= 0) return { arrayPath: "/alternativePaths", index: ai, stage: altPaths[ai] };
  return null;
}

function findStageIndex(caseIr: CaseIR, stageId: string) { return caseIr.stages.findIndex(s => s.id === stageId); }
function findGroupIndex(stage: Stage, groupId: string) { return stage.groups.findIndex(g => g.id === groupId); }
function findStepIndex(group: Group, stepId: string) { return group.steps.findIndex(s => s.id === stepId); }

function deepGet(obj: Record<string, unknown>, key: string): unknown {
  return key.split(".").reduce<unknown>((cur, k) => {
    if (cur && typeof cur === "object") return (cur as Record<string, unknown>)[k];
    return undefined;
  }, obj);
}

function deepSet(obj: Record<string, unknown>, key: string, value: unknown): Record<string, unknown> {
  const parts = key.split(".");
  if (parts.length === 1) return { ...obj, [key]: value };
  const [head, ...rest] = parts;
  const child = (obj[head] && typeof obj[head] === "object") ? obj[head] as Record<string, unknown> : {};
  return { ...obj, [head]: deepSet(child, rest.join("."), value) };
}

// ─── Primitive UI components ──────────────────────────────────────────────────

function SectionHeader({ title, open, onToggle }: { title: string; open: boolean; onToggle: () => void }) {
  return (
    <button
      className={`section-header-btn w-full flex items-center gap-2 px-4 py-2 border-b text-left transition-colors ${open ? "section-header-btn--open" : "section-header-btn--closed"}`}
      onClick={onToggle}
    >
      <Settings2 size={11} className="text-foreground-muted flex-shrink-0" />
      <span className="flex-1 text-[10px] font-bold uppercase tracking-widest text-foreground-muted">{title}</span>
      {open ? <ChevronDown size={12} className="text-foreground-subtle" /> : <ChevronRight size={12} className="text-foreground-subtle" />}
    </button>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium text-foreground-muted">{label}</label>
      {children}
      {hint && <p className="text-[10px] leading-relaxed text-foreground-subtle">{hint}</p>}
    </div>
  );
}

interface InputProps { value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean }

function TextInput({ value, onChange, placeholder, mono }: InputProps) {
  return (
    <input
      className="studio-input w-full px-2.5 py-1.5 rounded-md border text-[12px] transition-colors focus:outline-none"
      style={{ fontFamily: mono ? "monospace" : undefined }}
      value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
    />
  );
}

function MultilineInput({ value, onChange, placeholder, mono }: InputProps) {
  return (
    <textarea
      rows={5}
      className="studio-input w-full px-2.5 py-1.5 rounded-md border text-[12px] transition-colors focus:outline-none resize-y"
      style={{ fontFamily: mono ? "monospace" : undefined, minHeight: 80 }}
      value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
    />
  );
}

function ExpressionInput({ value, onChange, placeholder }: InputProps) {
  return (
    <div className="relative">
      <span className="expression-prefix absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono select-none">fx</span>
      <input
        className="studio-input w-full pl-7 pr-2.5 py-1.5 rounded-md border text-[12px] font-mono transition-colors focus:outline-none"
        value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      />
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center justify-between gap-2 cursor-pointer py-0.5">
      <span className="text-[12px] text-foreground">{label}</span>
      <div className={`relative flex-shrink-0 w-8 h-4 rounded-full transition-colors ${checked ? "toggle-track--on" : "toggle-track--off"}`} onClick={() => onChange(!checked)}>
        <div className="toggle-thumb absolute top-0.5 w-3 h-3 rounded-full transition-transform" style={{ transform: checked ? "translateX(17px)" : "translateX(2px)" }} />
      </div>
    </label>
  );
}

function SelectInput({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: { label: string; value: string }[]; placeholder?: string }) {
  return (
    <select
      className={`studio-select w-full px-2.5 py-1.5 rounded-md border text-[12px] transition-colors focus:outline-none ${!value ? "studio-select--empty" : ""}`}
      value={value} onChange={e => onChange(e.target.value)}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ─── IO Parameter table (editable) ───────────────────────────────────────────

function IoParamTable({ params, label, accent, onChange }: {
  params: IoParam[]; label: string; accent: string;
  onChange: (updated: IoParam[]) => void;
}) {
  const update = (i: number, field: keyof IoParam, val: string) => {
    const next = params.map((p, idx) => idx === i ? { ...p, [field]: val } : p);
    onChange(next);
  };
  const add = () => onChange([...params, { name: "", value: "" }]);
  const remove = (i: number) => onChange(params.filter((_, idx) => idx !== i));

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: accent }}>{label}</span>
        <button
          className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-medium transition-colors"
          style={{ background: `color-mix(in srgb, ${accent} 12%, transparent)`, color: accent }}
          onClick={add}
        >
          <Plus size={9} /> Add
        </button>
      </div>
      {params.length === 0 ? (
        <div className="io-empty text-[11px] text-center py-3 rounded-lg border border-dashed">
          No {label.toLowerCase()} — click Add
        </div>
      ) : (
        <div className="space-y-1.5">
          {params.map((p, i) => (
            <div key={i} className="io-param-row flex items-center gap-1.5 rounded-lg p-2">
              <input
                className="io-param-input flex-1 min-w-0 px-2 py-1 rounded text-[11px] font-mono focus:outline-none border"
                value={p.name} onChange={e => update(i, "name", e.target.value)} placeholder="name"
              />
              <ArrowRight size={9} className="text-foreground-subtle flex-shrink-0" />
              <input
                className="io-param-input flex-1 min-w-0 px-2 py-1 rounded text-[11px] font-mono focus:outline-none border"
                value={p.value} onChange={e => update(i, "value", e.target.value)} placeholder="${expression}"
              />
              <button className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-destructive/20 text-destructive"
                onClick={() => remove(i)}>
                <Trash2 size={9} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Dynamic field renderer ───────────────────────────────────────────────────

function FieldRenderer({ field, value, onChange }: {
  field: PropField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const str = (v: unknown) => (v !== undefined && v !== null ? String(v) : "");

  switch (field.type) {
    case "boolean":
      return (
        <Toggle
          checked={typeof value === "boolean" ? value : (field.default as boolean ?? false)}
          onChange={onChange}
          label=""
        />
      );
    case "select":
      return (
        <SelectInput
          value={str(value) || str(field.default)}
          onChange={onChange}
          options={field.options ?? []}
          placeholder={field.placeholder}
        />
      );
    case "expression":
      return <ExpressionInput value={str(value)} onChange={onChange} placeholder={field.placeholder} />;
    case "multiline":
      return <MultilineInput value={str(value)} onChange={onChange} placeholder={field.placeholder} mono={field.mono} />;
    default:
      return <TextInput value={str(value)} onChange={onChange} placeholder={field.placeholder} mono={field.mono} />;
  }
}

// ─── Step properties panel ────────────────────────────────────────────────────

function StepPropertiesPanel({
  step, basePath, onPatch,
}: {
  step: Step;
  basePath: string;
  onPatch: (p: JsonPatch) => void;
}) {
  const [draft, setDraft] = useState<Record<string, unknown>>(step as unknown as Record<string, unknown>);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(["service-task", "user-task", "call-activity", "foreach", "intermediate-event", "async", "gateway"]));
  const [inputParams, setInputParams] = useState<IoParam[]>(step.tech?.inputParameters ?? []);
  const [outputParams, setOutputParams] = useState<IoParam[]>(step.tech?.outputParameters ?? []);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDraft(step as unknown as Record<string, unknown>);
    setInputParams(step.tech?.inputParameters ?? []);
    setOutputParams(step.tech?.outputParameters ?? []);
    setDirty(false);
  }, [step.id]);

  const toggleGroup = (id: string) => setOpenGroups(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const handleChange = useCallback((key: string, value: unknown) => {
    setDraft(d => deepSet(d, key, value));
    setDirty(true);
  }, []);

  const handleSave = () => {
    const patch: JsonPatch = [];
    const updated = {
      ...draft,
      tech: {
        ...(typeof draft.tech === "object" && draft.tech ? draft.tech : {}),
        inputParameters: inputParams,
        outputParameters: outputParams,
      },
    };
    patch.push({ op: "replace", path: basePath, value: updated });
    onPatch(patch);
    setDirty(false);
  };

  const cfg = STEP_TYPE_CONFIG[step.type];
  const bpmnType = step.source?.bpmnElementType ?? "";

  const applicableGroups = CAMUNDA_PROP_GROUPS.filter(group => {
    if (!group.appliesTo.includes(step.type) && group.appliesTo.length > 0) return false;
    if (group.appliesIfBpmnType?.length && !group.appliesIfBpmnType.some(t => bpmnType.includes(t))) {
      if (bpmnType) return false;
    }
    return true;
  });

  const groups = step.type === "decision"
    ? applicableGroups.filter(g => g.id !== "async" && g.id !== "job")
    : applicableGroups.filter(g => g.id !== "gateway");

  return (
    <div className="flex flex-col h-full">
      {/* Type badge + BPMN id */}
      <div className="flex items-center gap-2 flex-wrap px-4 py-3 border-b border-border">
        <div className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide"
          style={{ background: `color-mix(in srgb, ${cfg.colorVar} 15%, transparent)`, color: cfg.colorVar }}>
          {cfg.label}
        </div>
        {bpmnType && (
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface-raised text-foreground-subtle">
            {bpmnType}
          </span>
        )}
        {step.source?.bpmnElementId && (
          <span className="font-mono text-[10px] opacity-60 truncate max-w-full text-foreground-subtle" title={step.source.bpmnElementId}>
            #{step.source.bpmnElementId}
          </span>
        )}
      </div>

      {step.description && (
        <div className="desc-box mx-4 my-3 text-[11px] italic px-3 py-2 rounded-lg">
          {step.description}
        </div>
      )}

      {/* General — name */}
      <div className="px-4 py-3 space-y-3">
        <Field label="Name">
          <TextInput value={String(draft.name ?? "")} onChange={v => handleChange("name", v)} placeholder="Step name" />
        </Field>
        <Field label="Description">
          <MultilineInput value={String(draft.description ?? "")} onChange={v => handleChange("description", v)} placeholder="Optional description…" />
        </Field>
      </div>

      {/* Schema-driven property groups */}
      {groups.map(group => {
        const isOpen = openGroups.has(group.id);
        return (
          <div key={group.id}>
            <SectionHeader title={group.title} open={isOpen} onToggle={() => toggleGroup(group.id)} />
            {isOpen && (
              <div className="px-4 py-3 space-y-3">
                {group.fields.map(field => {
                  const val = deepGet(draft as Record<string, unknown>, field.key);
                  if (field.type === "boolean") {
                    const boolVal = typeof val === "boolean" ? val : (field.default as boolean ?? false);
                    return (
                      <Toggle key={field.key} checked={boolVal} onChange={v => handleChange(field.key, v)} label={field.label} />
                    );
                  }
                  return (
                    <Field key={field.key} label={field.label} hint={field.hint}>
                      <FieldRenderer field={field} value={val} onChange={v => handleChange(field.key, v)} />
                    </Field>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Decision branches */}
      {step.type === "decision" && step.branches.length > 0 && (
        <div>
          <SectionHeader title="Branches" open={openGroups.has("branches")} onToggle={() => toggleGroup("branches")} />
          {openGroups.has("branches") && (
            <div className="px-4 py-3 space-y-2">
              {step.branches.map(branch => (
                <div key={branch.id} className="branch-card rounded-lg border p-3 space-y-1.5">
                  <div className="text-[11px] font-semibold text-foreground">{branch.label}</div>
                  <div className="font-mono text-[10px] break-all text-foreground-muted">{branch.condition}</div>
                  {branch.targetStepId && (
                    <div className="text-[10px] text-foreground-subtle">→ {branch.targetStepId}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Call activity mappings */}
      {step.type === "callActivity" && (
        <div>
          <SectionHeader title="Variable Mappings" open={openGroups.has("ca-mappings")} onToggle={() => toggleGroup("ca-mappings")} />
          {openGroups.has("ca-mappings") && (
            <div className="px-4 py-3 space-y-3">
              <div>
                <div className="mapping-label--in text-[10px] font-bold uppercase tracking-widest mb-2">In Mappings</div>
                {(step.inMappings ?? []).map((m, i) => (
                  <div key={i} className="mapping-row flex items-center gap-1.5 text-[11px] font-mono py-1">
                    <span className="text-foreground">{m.source}</span>
                    <ArrowRight size={9} className="text-foreground-subtle" />
                    <span>{m.target}</span>
                  </div>
                ))}
                {(!step.inMappings || step.inMappings.length === 0) && (
                  <div className="text-[11px] text-foreground-subtle">No in mappings</div>
                )}
              </div>
              <div>
                <div className="mapping-label--out text-[10px] font-bold uppercase tracking-widest mb-2">Out Mappings</div>
                {(step.outMappings ?? []).map((m, i) => (
                  <div key={i} className="mapping-row flex items-center gap-1.5 text-[11px] font-mono py-1">
                    <span className="text-foreground">{m.source}</span>
                    <ArrowRight size={9} className="text-foreground-subtle" />
                    <span>{m.target}</span>
                  </div>
                ))}
                {(!step.outMappings || step.outMappings.length === 0) && (
                  <div className="text-[11px] text-foreground-subtle">No out mappings</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* IO Parameters */}
      <div>
        <SectionHeader title="Input / Output Parameters" open={openGroups.has("io")} onToggle={() => toggleGroup("io")} />
        {openGroups.has("io") && (
          <div className="px-4 py-3 space-y-4">
            <IoParamTable
              params={inputParams}
              label="Input Parameters"
              accent="hsl(213 80% 50%)"
              onChange={p => { setInputParams(p); setDirty(true); }}
            />
            <IoParamTable
              params={outputParams}
              label="Output Parameters"
              accent="hsl(134 58% 38%)"
              onChange={p => { setOutputParams(p); setDirty(true); }}
            />
          </div>
        )}
      </div>

      {/* Save button */}
      <div className="p-4 border-t border-border mt-auto">
        <button
          className={`w-full py-2 rounded-md text-sm font-semibold transition-all ${dirty ? "save-btn--active" : "save-btn--inactive"}`}
          onClick={handleSave}
        >
          {dirty ? "Save Changes" : "No Changes"}
        </button>
      </div>
    </div>
  );
}

// ─── Stage properties ─────────────────────────────────────────────────────────

function StagePropertiesPanel({ stage, basePath, stageIndex, onPatch }: { stage: Stage; basePath: string; stageIndex: number; onPatch: (p: JsonPatch) => void }) {
  const [name, setName] = useState(stage.name);
  useEffect(() => setName(stage.name), [stage.id]);
  const totalSteps = stage.groups.reduce((n, g) => n + g.steps.length, 0);

  return (
    <div className="p-4 space-y-4">
      <Field label="Stage Name">
        <TextInput value={name} onChange={setName} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <div className="stat-card rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-foreground">{stage.groups.length}</div>
          <div className="text-[10px] text-foreground-muted">Groups</div>
        </div>
        <div className="stat-card rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-foreground">{totalSteps}</div>
          <div className="text-[10px] text-foreground-muted">Steps</div>
        </div>
      </div>
      <button
        className="save-btn--active w-full py-2 rounded-md text-sm font-semibold"
        onClick={() => { if (name !== stage.name) onPatch([{ op: "replace", path: `${basePath}/name`, value: name }]); }}
      >
        Save Stage
      </button>
    </div>
  );
}

const SECTION_COLORS_PANEL = [
  "hsl(152 68% 38%)",
  "hsl(252 60% 52%)",
  "hsl(180 60% 40%)",
  "hsl(213 80% 52%)",
  "hsl(32 88% 50%)",
  "hsl(0 68% 50%)",
];

// ─── Group properties ─────────────────────────────────────────────────────────

function GroupPropertiesPanel({ group, basePath, onPatch }: { group: Group; basePath: string; onPatch: (p: JsonPatch) => void }) {
  const [name, setName] = useState(group.name);
  useEffect(() => setName(group.name), [group.id]);
  return (
    <div className="p-4 space-y-4">
      <Field label="Group Name">
        <TextInput value={name} onChange={setName} />
      </Field>
      <div className="stat-card rounded-lg p-3 text-center">
        <div className="text-lg font-bold text-foreground">{group.steps.length}</div>
        <div className="text-[10px] text-foreground-muted">Steps</div>
      </div>
      <button
        className="save-btn--active w-full py-2 rounded-md text-sm font-semibold"
        onClick={() => { if (name !== group.name) onPatch([{ op: "replace", path: `${basePath}/name`, value: name }]); }}
      >
        Save Group
      </button>
    </div>
  );
}

// ─── Trigger properties panel ─────────────────────────────────────────────────

function TriggerPropertiesPanel({ trigger, onPatch }: { trigger: Trigger; onPatch: (p: JsonPatch) => void }) {
  const [draft, setDraft] = useState<Record<string, unknown>>(trigger as unknown as Record<string, unknown>);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(["trigger-type", "trigger-async"]));
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDraft(trigger as unknown as Record<string, unknown>);
    setDirty(false);
  }, [trigger.type, trigger.expression, trigger.name]);

  const toggleGroup = (id: string) => setOpenGroups(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const handleChange = useCallback((key: string, value: unknown) => {
    setDraft(d => deepSet(d, key, value));
    setDirty(true);
  }, []);

  const handleSave = () => {
    const patch: JsonPatch = [{ op: "replace", path: "/trigger", value: draft }];
    onPatch(patch);
    setDirty(false);
  };

  const triggerType = String(draft.type ?? "none");

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 flex-wrap px-4 py-3 border-b border-border">
        <div className="type-badge--primary px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide">
          Start Event
        </div>
        {(trigger.source?.bpmnElementId) && (
          <span className="font-mono text-[10px] opacity-60 truncate max-w-full text-foreground-subtle" title={trigger.source.bpmnElementId}>
            #{trigger.source.bpmnElementId}
          </span>
        )}
      </div>

      {TRIGGER_PROP_GROUPS.map(group => {
        const isOpen = openGroups.has(group.id);
        return (
          <div key={group.id}>
            <SectionHeader title={group.title} open={isOpen} onToggle={() => toggleGroup(group.id)} />
            {isOpen && (
              <div className="px-4 py-3 space-y-3">
                {group.fields.map(field => {
                  if (field.key === "expression" && triggerType !== "timer") return null;
                  if (field.key === "messageRef" && triggerType !== "message") return null;

                  const val = deepGet(draft as Record<string, unknown>, field.key);
                  if (field.type === "boolean") {
                    const boolVal = typeof val === "boolean" ? val : (field.default as boolean ?? false);
                    return (
                      <Toggle key={field.key} checked={boolVal} onChange={v => handleChange(field.key, v)} label={field.label} />
                    );
                  }
                  return (
                    <Field key={field.key} label={field.label} hint={field.hint}>
                      <FieldRenderer field={field} value={val} onChange={v => handleChange(field.key, v)} />
                    </Field>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <div className="p-4 border-t border-border mt-auto">
        <button
          className={`w-full py-2 rounded-md text-sm font-semibold transition-all ${dirty ? "save-btn--active" : "save-btn--inactive"}`}
          onClick={handleSave}
        >
          {dirty ? "Save Changes" : "No Changes"}
        </button>
      </div>
    </div>
  );
}

// ─── End Event properties panel ───────────────────────────────────────────────

function EndEventPropertiesPanel({ endEvent, onPatch }: { endEvent: EndEvent; onPatch: (p: JsonPatch) => void }) {
  const [draft, setDraft] = useState<Record<string, unknown>>(endEvent as unknown as Record<string, unknown>);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDraft(endEvent as unknown as Record<string, unknown>);
    setDirty(false);
  }, [endEvent.id, endEvent.eventType]);

  const handleChange = useCallback((key: string, value: unknown) => {
    setDraft(d => deepSet(d, key, value));
    setDirty(true);
  }, []);

  const handleSave = () => {
    onPatch([{ op: "replace", path: "/endEvent", value: draft }]);
    setDirty(false);
  };

  const eventType = String(draft.eventType ?? "none");

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 flex-wrap px-4 py-3 border-b border-border">
        <div className="type-badge--end px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide">
          End Event
        </div>
        {endEvent.source?.bpmnElementId && (
          <span className="font-mono text-[10px] opacity-60 text-foreground-subtle">
            #{endEvent.source.bpmnElementId}
          </span>
        )}
      </div>
      <div className="px-4 py-3 space-y-3">
        <Field label="Event Type">
          <SelectInput
            value={eventType}
            onChange={v => handleChange("eventType", v)}
            options={[
              { label: "None", value: "none" },
              { label: "Terminate", value: "terminate" },
              { label: "Error", value: "error" },
              { label: "Message", value: "message" },
              { label: "Signal", value: "signal" },
              { label: "Escalation", value: "escalation" },
              { label: "Compensate", value: "compensate" },
            ]}
          />
        </Field>
        <Field label="Name">
          <TextInput value={String(draft.name ?? "")} onChange={v => handleChange("name", v)} placeholder="End Event name" />
        </Field>
        {(eventType === "error" || eventType === "escalation") && (
          <Field label="Error/Escalation Code" hint="Reference code for the error or escalation">
            <TextInput value={String(draft.expression ?? "")} onChange={v => handleChange("expression", v)} placeholder="errorCode" mono />
          </Field>
        )}
      </div>
      <div className="px-4 py-3 space-y-3 border-t border-border">
        <Toggle checked={typeof deepGet(draft, "tech.asyncBefore") === "boolean" ? deepGet(draft, "tech.asyncBefore") as boolean : false}
          onChange={v => handleChange("tech.asyncBefore", v)} label="Async Before" />
        <Toggle checked={typeof deepGet(draft, "tech.asyncAfter") === "boolean" ? deepGet(draft, "tech.asyncAfter") as boolean : false}
          onChange={v => handleChange("tech.asyncAfter", v)} label="Async After" />
      </div>
      <div className="p-4 border-t border-border mt-auto">
        <button className={`w-full py-2 rounded-md text-sm font-semibold transition-all ${dirty ? "save-btn--active" : "save-btn--inactive"}`}
          onClick={handleSave}>
          {dirty ? "Save Changes" : "No Changes"}
        </button>
      </div>
    </div>
  );
}

// ─── Process properties panel ─────────────────────────────────────────────────

function ProcessPropertiesPanel({ caseIr, onPatch }: { caseIr: CaseIR; onPatch: (p: JsonPatch) => void }) {
  const props = caseIr.processProperties ?? {};
  const [draft, setDraft] = useState<Record<string, unknown>>({
    name: caseIr.name,
    id: caseIr.id,
    version: caseIr.version,
    ...props,
  });
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDraft({ name: caseIr.name, id: caseIr.id, version: caseIr.version, ...(caseIr.processProperties ?? {}) });
    setDirty(false);
  }, [caseIr.id, caseIr.name]);

  const handleChange = useCallback((key: string, value: unknown) => {
    setDraft(d => ({ ...d, [key]: value }));
    setDirty(true);
  }, []);

  const handleSave = () => {
    const patch: JsonPatch = [];
    if (draft.name !== caseIr.name) patch.push({ op: "replace", path: "/name", value: draft.name });
    if (draft.version !== caseIr.version) patch.push({ op: "replace", path: "/version", value: draft.version });
    const procProps: ProcessProperties = {};
    if (draft.isExecutable !== undefined) procProps.isExecutable = draft.isExecutable as boolean;
    if (draft.versionTag) procProps.versionTag = String(draft.versionTag);
    if (draft.historyTimeToLive) procProps.historyTimeToLive = String(draft.historyTimeToLive);
    if (draft.candidateStarterGroups) procProps.candidateStarterGroups = String(draft.candidateStarterGroups);
    if (draft.candidateStarterUsers) procProps.candidateStarterUsers = String(draft.candidateStarterUsers);
    if (draft.jobPriority) procProps.jobPriority = String(draft.jobPriority);
    if (draft.taskPriority) procProps.taskPriority = String(draft.taskPriority);
    patch.push({ op: "replace", path: "/processProperties", value: procProps });
    if (patch.length) onPatch(patch);
    setDirty(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 flex-wrap px-4 py-3 border-b border-border">
        <div className="type-badge--primary px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide">
          Process
        </div>
        <span className="font-mono text-[10px] opacity-60 text-foreground-subtle">
          {caseIr.id}
        </span>
      </div>
      <div className="px-4 py-3 space-y-3">
        <Field label="Process Name">
          <TextInput value={String(draft.name ?? "")} onChange={v => handleChange("name", v)} placeholder="Process name" />
        </Field>
        <Field label="Version">
          <TextInput value={String(draft.version ?? "")} onChange={v => handleChange("version", v)} placeholder="1.0.0" mono />
        </Field>
        <Toggle checked={draft.isExecutable === true} onChange={v => handleChange("isExecutable", v)} label="Is Executable" />
      </div>
      <div className="px-4 py-3 space-y-3 border-t border-border">
        <Field label="Version Tag" hint="Camunda version tag for deployment">
          <TextInput value={String(draft.versionTag ?? "")} onChange={v => handleChange("versionTag", v)} placeholder="release-1.0" mono />
        </Field>
        <Field label="History Time To Live" hint="Days to keep process history (e.g., 180)">
          <TextInput value={String(draft.historyTimeToLive ?? "")} onChange={v => handleChange("historyTimeToLive", v)} placeholder="180" mono />
        </Field>
        <Field label="Candidate Starter Groups" hint="Comma-separated groups allowed to start this process">
          <TextInput value={String(draft.candidateStarterGroups ?? "")} onChange={v => handleChange("candidateStarterGroups", v)} placeholder="managers, admins" />
        </Field>
        <Field label="Candidate Starter Users" hint="Comma-separated users allowed to start this process">
          <TextInput value={String(draft.candidateStarterUsers ?? "")} onChange={v => handleChange("candidateStarterUsers", v)} placeholder="user1, user2" />
        </Field>
        <Field label="Default Job Priority" hint="Default priority for all jobs in this process">
          <ExpressionInput value={String(draft.jobPriority ?? "")} onChange={v => handleChange("jobPriority", v)} placeholder="${priority}" />
        </Field>
        <Field label="Default Task Priority" hint="Default priority for external tasks">
          <ExpressionInput value={String(draft.taskPriority ?? "")} onChange={v => handleChange("taskPriority", v)} placeholder="${priority}" />
        </Field>
      </div>
      <div className="p-4 border-t border-border mt-auto">
        <button className={`w-full py-2 rounded-md text-sm font-semibold transition-all ${dirty ? "save-btn--active" : "save-btn--inactive"}`}
          onClick={handleSave}>
          {dirty ? "Save Changes" : "No Changes"}
        </button>
      </div>
    </div>
  );
}

// ─── Boundary Event properties panel ──────────────────────────────────────────

function BoundaryEventPropertiesPanel({ boundaryEvent, basePath, onPatch }: { boundaryEvent: import("@/types/caseIr").BoundaryEvent; basePath: string; onPatch: (p: JsonPatch) => void }) {
  const [draft, setDraft] = useState<Record<string, unknown>>(boundaryEvent as unknown as Record<string, unknown>);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDraft(boundaryEvent as unknown as Record<string, unknown>);
    setDirty(false);
  }, [boundaryEvent.id]);

  const handleChange = useCallback((key: string, value: unknown) => {
    setDraft(d => deepSet(d, key, value));
    setDirty(true);
  }, []);

  const handleSave = () => {
    onPatch([{ op: "replace", path: basePath, value: draft }]);
    setDirty(false);
  };

  const evtType = String(draft.eventType ?? "generic");

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 flex-wrap px-4 py-3 border-b border-border">
        <div className="type-badge--boundary px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide">
          Boundary · {evtType}
        </div>
      </div>
      <div className="px-4 py-3 space-y-3">
        <Field label="Event Type">
          <SelectInput value={evtType} onChange={v => handleChange("eventType", v)}
            options={[
              { label: "Timer", value: "timer" },
              { label: "Message", value: "message" },
              { label: "Signal", value: "signal" },
              { label: "Error", value: "error" },
              { label: "Escalation", value: "escalation" },
              { label: "Conditional", value: "conditional" },
            ]}
          />
        </Field>
        <Field label="Name">
          <TextInput value={String(draft.name ?? "")} onChange={v => handleChange("name", v)} placeholder="Boundary event name" />
        </Field>
        <Toggle checked={draft.cancelActivity !== false} onChange={v => handleChange("cancelActivity", v)} label="Interrupting (Cancel Activity)" />
        {(evtType === "timer" || evtType === "error" || evtType === "message") && (
          <Field label="Expression" hint={evtType === "timer" ? "Timer duration/cycle" : evtType === "error" ? "Error code" : "Message name"}>
            <ExpressionInput value={String(draft.expression ?? "")} onChange={v => handleChange("expression", v)} placeholder={evtType === "timer" ? "PT5M" : "ref"} />
          </Field>
        )}
      </div>
      <div className="px-4 py-3 space-y-3 border-t border-border">
        <Toggle checked={typeof deepGet(draft, "tech.asyncBefore") === "boolean" ? deepGet(draft, "tech.asyncBefore") as boolean : false}
          onChange={v => handleChange("tech.asyncBefore", v)} label="Async Before" />
        <Toggle checked={typeof deepGet(draft, "tech.asyncAfter") === "boolean" ? deepGet(draft, "tech.asyncAfter") as boolean : false}
          onChange={v => handleChange("tech.asyncAfter", v)} label="Async After" />
      </div>
      <div className="p-4 border-t border-border mt-auto">
        <button className={`w-full py-2 rounded-md text-sm font-semibold transition-all ${dirty ? "save-btn--active" : "save-btn--inactive"}`}
          onClick={handleSave}>
          {dirty ? "Save Changes" : "No Changes"}
        </button>
      </div>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function PropertiesPanel({ caseIr, selection, onClose, onPatch, collapsed, onToggleCollapse }: {
  caseIr: CaseIR; selection: SelectionTarget; onClose: () => void; onPatch: (p: JsonPatch) => void;
  collapsed: boolean; onToggleCollapse: () => void;
}) {
  if (collapsed) {
    return (
      <div className="props-collapsed h-full flex flex-col items-center border-l py-3 px-1">
        <button className="hover-btn w-7 h-7 rounded flex items-center justify-center transition-colors"
          onClick={onToggleCollapse}
          title="Expand Properties Panel"
        >
          <PanelRightOpen size={14} />
        </button>
      </div>
    );
  }

  const CollapseBtn = () => (
    <button className="hover-btn flex-shrink-0 w-7 h-7 rounded flex items-center justify-center transition-colors"
      onClick={onToggleCollapse}
      title="Collapse Properties Panel"
    >
      <PanelRightClose size={14} />
    </button>
  );

  if (!selection) {
    return (
      <div className="props-panel h-full flex flex-col border-l">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-[10px] font-bold uppercase tracking-widest text-foreground-muted">Properties</span>
          <CollapseBtn />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
          <div className="props-empty-icon w-10 h-10 rounded-xl flex items-center justify-center">
            <Settings2 size={18} className="text-foreground-subtle" />
          </div>
          <p className="text-[12px] leading-relaxed text-foreground-muted">
            Select a trigger, stage, group, or step to view and edit its Camunda 7 properties
          </p>
        </div>
      </div>
    );
  }

  // ── Trigger properties ────────────────────────────────────────────────────
  if (selection.kind === "trigger") {
    return (
      <div className="props-panel h-full flex flex-col border-l">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-widest text-foreground-muted">Trigger Properties</div>
            <div className="text-[13px] font-semibold mt-0.5 truncate text-foreground">Start Event</div>
          </div>
          <div className="flex items-center gap-1">
            <CollapseBtn />
            <button className="hover-btn flex-shrink-0 w-7 h-7 rounded flex items-center justify-center transition-colors"
              onClick={onClose}>
              <X size={14} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <TriggerPropertiesPanel trigger={caseIr.trigger} onPatch={onPatch} />
        </div>
      </div>
    );
  }

  // ── End Event properties ──────────────────────────────────────────────────
  if (selection.kind === "endEvent") {
    return (
      <div className="props-panel h-full flex flex-col border-l">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-widest text-foreground-muted">End Event Properties</div>
            <div className="text-[13px] font-semibold mt-0.5 truncate text-foreground">{caseIr.endEvent.name ?? "End Event"}</div>
          </div>
          <div className="flex items-center gap-1">
            <CollapseBtn />
            <button className="hover-btn flex-shrink-0 w-7 h-7 rounded flex items-center justify-center transition-colors"
              onClick={onClose}><X size={14} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <EndEventPropertiesPanel endEvent={caseIr.endEvent} onPatch={onPatch} />
        </div>
      </div>
    );
  }

  // ── Process properties ────────────────────────────────────────────────────
  if (selection.kind === "process") {
    return (
      <div className="props-panel h-full flex flex-col border-l">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-widest text-foreground-muted">Process Properties</div>
            <div className="text-[13px] font-semibold mt-0.5 truncate text-foreground">{caseIr.name}</div>
          </div>
          <div className="flex items-center gap-1">
            <CollapseBtn />
            <button className="hover-btn flex-shrink-0 w-7 h-7 rounded flex items-center justify-center transition-colors"
              onClick={onClose}><X size={14} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ProcessPropertiesPanel caseIr={caseIr} onPatch={onPatch} />
        </div>
      </div>
    );
  }

  // ── Boundary Event properties ─────────────────────────────────────────────
  if (selection.kind === "boundaryEvent") {
    const loc = findStageLocation(caseIr, selection.stageId);
    if (!loc) return null;
    const gi2 = findGroupIndex(loc.stage, selection.groupId);
    const group2 = loc.stage.groups[gi2];
    if (!group2) return null;
    const sti2 = findStepIndex(group2, selection.stepId);
    const step2 = group2.steps[sti2];
    if (!step2 || !step2.boundaryEvents) return null;
    const be = step2.boundaryEvents.find(b => b.id === selection.boundaryEventId);
    if (!be) return null;
    const bePath = `${loc.arrayPath}/${loc.index}/groups/${gi2}/steps/${sti2}/boundaryEvents/${step2.boundaryEvents.indexOf(be)}`;
    return (
      <div className="props-panel h-full flex flex-col border-l">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-widest text-foreground-muted">Boundary Event</div>
            <div className="text-[13px] font-semibold mt-0.5 truncate text-foreground">{be.name}</div>
          </div>
          <div className="flex items-center gap-1">
            <CollapseBtn />
            <button className="hover-btn flex-shrink-0 w-7 h-7 rounded flex items-center justify-center transition-colors"
              onClick={onClose}><X size={14} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <BoundaryEventPropertiesPanel boundaryEvent={be} basePath={bePath} onPatch={onPatch} />
        </div>
      </div>
    );
  }

  if (!('stageId' in selection)) return null;
  const loc = findStageLocation(caseIr, selection.stageId);
  if (!loc) return null;
  const { stage, arrayPath, index: si } = loc;

  let title = "Stage";
  let subtitle = stage.name;
  const stagePath = `${arrayPath}/${si}`;
  let content: React.ReactNode = <StagePropertiesPanel stage={stage} basePath={stagePath} stageIndex={si} onPatch={onPatch} />;

  if (selection.kind === "group" || selection.kind === "step") {
    const gi = findGroupIndex(stage, selection.groupId);
    const group = stage.groups[gi];
    if (!group) return null;

    if (selection.kind === "group") {
      title = "Group";
      subtitle = group.name;
      content = <GroupPropertiesPanel group={group} basePath={`${stagePath}/groups/${gi}`} onPatch={onPatch} />;
    } else {
      const sti = findStepIndex(group, selection.stepId);
      const step = group.steps[sti];
      if (!step) return null;
      title = "Step";
      subtitle = step.name;
      const basePath = `${stagePath}/groups/${gi}/steps/${sti}`;
      content = <StepPropertiesPanel step={step} basePath={basePath} onPatch={onPatch} />;
    }
  }

  return (
    <div className="props-panel h-full flex flex-col border-l">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-widest text-foreground-muted">{title} Properties</div>
          <div className="text-[13px] font-semibold mt-0.5 truncate text-foreground">{subtitle}</div>
        </div>
        <div className="flex items-center gap-1">
          <CollapseBtn />
          <button className="hover-btn flex-shrink-0 w-7 h-7 rounded flex items-center justify-center transition-colors"
            onClick={onClose}><X size={14} /></button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {content}
      </div>
    </div>
  );
}
