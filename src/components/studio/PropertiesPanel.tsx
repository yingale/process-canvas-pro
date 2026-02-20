/**
 * Properties Panel – fully-editable, schema-driven Camunda 7 property editor.
 * Uses camundaSchema.ts (derived from camunda-bpmn-moddle) to render all
 * applicable property groups for every step type, with placeholders/defaults
 * when values are absent.
 */
import { useState, useEffect, useCallback } from "react";
import {
  X, ChevronRight, Plus, Trash2, ArrowRight, ChevronDown, Settings2,
} from "lucide-react";
import type { CaseIR, SelectionTarget, Stage, Group, Step, IoParam } from "@/types/caseIr";
import { STEP_TYPE_CONFIG } from "./FlowNodes";
import { CAMUNDA_PROP_GROUPS, TRIGGER_PROP_GROUPS, type PropField } from "./camundaSchema";
import type { JsonPatch, Trigger } from "@/types/caseIr";

// ─── Path helpers ─────────────────────────────────────────────────────────────

function findStageIndex(caseIr: CaseIR, stageId: string) { return caseIr.stages.findIndex(s => s.id === stageId); }
function findGroupIndex(stage: Stage, groupId: string) { return stage.groups.findIndex(g => g.id === groupId); }
function findStepIndex(group: Group, stepId: string) { return group.steps.findIndex(s => s.id === stepId); }

/** Deep-get a dot-notation key from an object */
function deepGet(obj: Record<string, unknown>, key: string): unknown {
  return key.split(".").reduce<unknown>((cur, k) => {
    if (cur && typeof cur === "object") return (cur as Record<string, unknown>)[k];
    return undefined;
  }, obj);
}

/** Deep-set a dot-notation key, returning a new object (immutable) */
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
      className="w-full flex items-center gap-2 px-4 py-2 border-b text-left transition-colors"
      style={{ borderColor: "hsl(var(--border))", background: open ? "hsl(var(--surface-raised))" : "hsl(var(--surface))" }}
      onClick={onToggle}
    >
      <Settings2 size={11} style={{ color: "hsl(var(--foreground-muted))", flexShrink: 0 }} />
      <span className="flex-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: "hsl(var(--foreground-muted))" }}>{title}</span>
      {open ? <ChevronDown size={12} style={{ color: "hsl(var(--foreground-subtle))" }} /> : <ChevronRight size={12} style={{ color: "hsl(var(--foreground-subtle))" }} />}
    </button>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium" style={{ color: "hsl(var(--foreground-muted))" }}>{label}</label>
      {children}
      {hint && <p className="text-[10px] leading-relaxed" style={{ color: "hsl(var(--foreground-subtle))" }}>{hint}</p>}
    </div>
  );
}

interface InputProps { value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean }

function TextInput({ value, onChange, placeholder, mono }: InputProps) {
  return (
    <input
      className="w-full px-2.5 py-1.5 rounded-md border text-[12px] transition-colors focus:outline-none"
      style={{ background: "hsl(var(--surface-overlay))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))", fontFamily: mono ? "monospace" : undefined }}
      onFocus={e => { e.currentTarget.style.borderColor = "hsl(var(--primary))"; e.currentTarget.style.boxShadow = "0 0 0 1px hsl(var(--primary) / 0.25)"; }}
      onBlur={e => { e.currentTarget.style.borderColor = "hsl(var(--border))"; e.currentTarget.style.boxShadow = "none"; }}
      value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
    />
  );
}

function MultilineInput({ value, onChange, placeholder, mono }: InputProps) {
  return (
    <textarea
      rows={5}
      className="w-full px-2.5 py-1.5 rounded-md border text-[12px] transition-colors focus:outline-none resize-y"
      style={{ background: "hsl(var(--surface-overlay))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))", fontFamily: mono ? "monospace" : undefined, minHeight: 80 }}
      onFocus={e => { e.currentTarget.style.borderColor = "hsl(var(--primary))"; e.currentTarget.style.boxShadow = "0 0 0 1px hsl(var(--primary) / 0.25)"; }}
      onBlur={e => { e.currentTarget.style.borderColor = "hsl(var(--border))"; e.currentTarget.style.boxShadow = "none"; }}
      value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
    />
  );
}

function ExpressionInput({ value, onChange, placeholder }: InputProps) {
  return (
    <div className="relative">
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono select-none" style={{ color: "hsl(var(--primary) / 0.6)" }}>fx</span>
      <input
        className="w-full pl-7 pr-2.5 py-1.5 rounded-md border text-[12px] font-mono transition-colors focus:outline-none"
        style={{ background: "hsl(var(--surface-overlay))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}
        onFocus={e => { e.currentTarget.style.borderColor = "hsl(var(--primary))"; e.currentTarget.style.boxShadow = "0 0 0 1px hsl(var(--primary) / 0.25)"; }}
        onBlur={e => { e.currentTarget.style.borderColor = "hsl(var(--border))"; e.currentTarget.style.boxShadow = "none"; }}
        value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      />
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center justify-between gap-2 cursor-pointer py-0.5">
      <span className="text-[12px]" style={{ color: "hsl(var(--foreground))" }}>{label}</span>
      <div className="relative flex-shrink-0 w-8 h-4 rounded-full transition-colors" style={{ background: checked ? "hsl(var(--primary))" : "hsl(var(--border))" }} onClick={() => onChange(!checked)}>
        <div className="absolute top-0.5 w-3 h-3 rounded-full transition-transform" style={{ background: "white", transform: checked ? "translateX(17px)" : "translateX(2px)" }} />
      </div>
    </label>
  );
}

function SelectInput({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: { label: string; value: string }[]; placeholder?: string }) {
  return (
    <select
      className="w-full px-2.5 py-1.5 rounded-md border text-[12px] transition-colors focus:outline-none"
      style={{ background: "hsl(var(--surface-overlay))", borderColor: "hsl(var(--border))", color: value ? "hsl(var(--foreground))" : "hsl(var(--foreground-subtle))" }}
      onFocus={e => { e.currentTarget.style.borderColor = "hsl(var(--primary))"; }}
      onBlur={e => { e.currentTarget.style.borderColor = "hsl(var(--border))"; }}
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
        <div className="text-[11px] text-center py-3 rounded-lg border border-dashed" style={{ color: "hsl(var(--foreground-subtle))", borderColor: "hsl(var(--border))" }}>
          No {label.toLowerCase()} — click Add
        </div>
      ) : (
        <div className="space-y-1.5">
          {params.map((p, i) => (
            <div key={i} className="flex items-center gap-1.5 rounded-lg p-2"
              style={{ background: "hsl(var(--surface-overlay))", border: "1px solid hsl(var(--border))" }}>
              <input
                className="flex-1 min-w-0 px-2 py-1 rounded text-[11px] font-mono focus:outline-none border"
                style={{ background: "hsl(var(--surface))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}
                value={p.name} onChange={e => update(i, "name", e.target.value)} placeholder="name"
              />
              <ArrowRight size={9} style={{ color: "hsl(var(--foreground-subtle))", flexShrink: 0 }} />
              <input
                className="flex-1 min-w-0 px-2 py-1 rounded text-[11px] font-mono focus:outline-none border"
                style={{ background: "hsl(var(--surface))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}
                value={p.value} onChange={e => update(i, "value", e.target.value)} placeholder="${expression}"
              />
              <button className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-destructive/20"
                style={{ color: "hsl(var(--destructive))" }} onClick={() => remove(i)}>
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
  // Local draft of the whole step
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

    // Build full updated step from draft
    const updated = {
      ...draft,
      tech: {
        ...(typeof draft.tech === "object" && draft.tech ? draft.tech : {}),
        inputParameters: inputParams,
        outputParameters: outputParams,
      },
    };

    // Replace the whole step via patch (simplest correct approach)
    patch.push({ op: "replace", path: basePath, value: updated });
    onPatch(patch);
    setDirty(false);
  };

  const cfg = STEP_TYPE_CONFIG[step.type];
  const bpmnType = step.source?.bpmnElementType ?? "";

  // Determine which groups are applicable
  const applicableGroups = CAMUNDA_PROP_GROUPS.filter(group => {
    if (!group.appliesTo.includes(step.type) && group.appliesTo.length > 0) return false;
    if (group.appliesIfBpmnType?.length && !group.appliesIfBpmnType.some(t => bpmnType.includes(t))) {
      // Still show it if bpmnType is unknown (manual step), just not if known and doesn't match
      if (bpmnType) return false;
    }
    return true;
  });

  // Deduplicate async group (decision has its own)
  const groups = step.type === "decision"
    ? applicableGroups.filter(g => g.id !== "async" && g.id !== "job")
    : applicableGroups.filter(g => g.id !== "gateway");

  return (
    <div className="flex flex-col h-full">
      {/* Type badge + BPMN id */}
      <div className="flex items-center gap-2 flex-wrap px-4 py-3 border-b" style={{ borderColor: "hsl(var(--border))" }}>
        <div className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide"
          style={{ background: `color-mix(in srgb, ${cfg.colorVar} 15%, transparent)`, color: cfg.colorVar }}>
          {cfg.label}
        </div>
        {bpmnType && (
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded"
            style={{ background: "hsl(var(--surface-raised))", color: "hsl(var(--foreground-subtle))" }}>
            {bpmnType}
          </span>
        )}
        {step.source?.bpmnElementId && (
          <span className="font-mono text-[10px] opacity-60 truncate max-w-full"
            style={{ color: "hsl(var(--foreground-subtle))" }} title={step.source.bpmnElementId}>
            #{step.source.bpmnElementId}
          </span>
        )}
      </div>

      {/* Description */}
      {step.description && (
        <div className="mx-4 my-3 text-[11px] italic px-3 py-2 rounded-lg"
          style={{ background: "hsl(var(--surface-overlay))", color: "hsl(var(--foreground-muted))", border: "1px solid hsl(var(--border))" }}>
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

      {/* Decision branches (read-only view, always shown for decision) */}
      {step.type === "decision" && step.branches.length > 0 && (
        <div>
          <SectionHeader title="Branches" open={openGroups.has("branches")} onToggle={() => toggleGroup("branches")} />
          {openGroups.has("branches") && (
            <div className="px-4 py-3 space-y-2">
              {step.branches.map(branch => (
                <div key={branch.id} className="rounded-lg border p-3 space-y-1.5"
                  style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--surface-overlay))" }}>
                  <div className="text-[11px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{branch.label}</div>
                  <div className="font-mono text-[10px] break-all" style={{ color: "hsl(var(--foreground-muted))" }}>{branch.condition}</div>
                  {branch.targetStepId && (
                    <div className="text-[10px]" style={{ color: "hsl(var(--foreground-subtle))" }}>→ {branch.targetStepId}</div>
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
                <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "hsl(213 80% 50%)" }}>In Mappings</div>
                {(step.inMappings ?? []).map((m, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[11px] font-mono py-1"
                    style={{ color: "hsl(var(--foreground-muted))", borderBottom: "1px solid hsl(var(--border))" }}>
                    <span style={{ color: "hsl(var(--foreground))" }}>{m.source}</span>
                    <ArrowRight size={9} style={{ color: "hsl(var(--foreground-subtle))" }} />
                    <span>{m.target}</span>
                  </div>
                ))}
                {(!step.inMappings || step.inMappings.length === 0) && (
                  <div className="text-[11px]" style={{ color: "hsl(var(--foreground-subtle))" }}>No in mappings</div>
                )}
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "hsl(134 58% 38%)" }}>Out Mappings</div>
                {(step.outMappings ?? []).map((m, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[11px] font-mono py-1"
                    style={{ color: "hsl(var(--foreground-muted))", borderBottom: "1px solid hsl(var(--border))" }}>
                    <span style={{ color: "hsl(var(--foreground))" }}>{m.source}</span>
                    <ArrowRight size={9} style={{ color: "hsl(var(--foreground-subtle))" }} />
                    <span>{m.target}</span>
                  </div>
                ))}
                {(!step.outMappings || step.outMappings.length === 0) && (
                  <div className="text-[11px]" style={{ color: "hsl(var(--foreground-subtle))" }}>No out mappings</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* IO Parameters – always shown, editable */}
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
      <div className="p-4 border-t mt-auto" style={{ borderColor: "hsl(var(--border))" }}>
        <button
          className="w-full py-2 rounded-md text-sm font-semibold transition-all"
          style={{
            background: dirty ? "hsl(var(--primary))" : "hsl(var(--surface-raised))",
            color: dirty ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground-muted))",
            cursor: dirty ? "pointer" : "default",
          }}
          onClick={handleSave}
        >
          {dirty ? "Save Changes" : "No Changes"}
        </button>
      </div>
    </div>
  );
}

// ─── Stage properties ─────────────────────────────────────────────────────────

function StagePropertiesPanel({ stage, stageIdx, onPatch }: { stage: Stage; stageIdx: number; onPatch: (p: JsonPatch) => void }) {
  const [name, setName] = useState(stage.name);
  useEffect(() => setName(stage.name), [stage.id]);
  const totalSteps = stage.groups.reduce((n, g) => n + g.steps.length, 0);
  return (
    <div className="p-4 space-y-4">
      <Field label="Stage Name">
        <TextInput value={name} onChange={setName} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg p-3 text-center" style={{ background: "hsl(var(--surface-overlay))", border: "1px solid hsl(var(--border))" }}>
          <div className="text-lg font-bold" style={{ color: "hsl(var(--foreground))" }}>{stage.groups.length}</div>
          <div className="text-[10px]" style={{ color: "hsl(var(--foreground-muted))" }}>Groups</div>
        </div>
        <div className="rounded-lg p-3 text-center" style={{ background: "hsl(var(--surface-overlay))", border: "1px solid hsl(var(--border))" }}>
          <div className="text-lg font-bold" style={{ color: "hsl(var(--foreground))" }}>{totalSteps}</div>
          <div className="text-[10px]" style={{ color: "hsl(var(--foreground-muted))" }}>Steps</div>
        </div>
      </div>
      <button
        className="w-full py-2 rounded-md text-sm font-semibold"
        style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
        onClick={() => { if (name !== stage.name) onPatch([{ op: "replace", path: `/stages/${stageIdx}/name`, value: name }]); }}
      >
        Save Stage
      </button>
    </div>
  );
}

// ─── Group properties ─────────────────────────────────────────────────────────

function GroupPropertiesPanel({ group, stageIdx, groupIdx, onPatch }: { group: Group; stageIdx: number; groupIdx: number; onPatch: (p: JsonPatch) => void }) {
  const [name, setName] = useState(group.name);
  useEffect(() => setName(group.name), [group.id]);
  return (
    <div className="p-4 space-y-4">
      <Field label="Group Name">
        <TextInput value={name} onChange={setName} />
      </Field>
      <div className="rounded-lg p-3 text-center" style={{ background: "hsl(var(--surface-overlay))", border: "1px solid hsl(var(--border))" }}>
        <div className="text-lg font-bold" style={{ color: "hsl(var(--foreground))" }}>{group.steps.length}</div>
        <div className="text-[10px]" style={{ color: "hsl(var(--foreground-muted))" }}>Steps</div>
      </div>
      <button
        className="w-full py-2 rounded-md text-sm font-semibold"
        style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
        onClick={() => { if (name !== group.name) onPatch([{ op: "replace", path: `/stages/${stageIdx}/groups/${groupIdx}/name`, value: name }]); }}
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
      {/* Type badge */}
      <div className="flex items-center gap-2 flex-wrap px-4 py-3 border-b" style={{ borderColor: "hsl(var(--border))" }}>
        <div className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide"
          style={{ background: "hsl(var(--primary) / 0.15)", color: "hsl(var(--primary))" }}>
          Start Event
        </div>
        {(trigger.source?.bpmnElementId) && (
          <span className="font-mono text-[10px] opacity-60 truncate max-w-full"
            style={{ color: "hsl(var(--foreground-subtle))" }} title={trigger.source.bpmnElementId}>
            #{trigger.source.bpmnElementId}
          </span>
        )}
      </div>

      {/* Schema-driven groups */}
      {TRIGGER_PROP_GROUPS.map(group => {
        const isOpen = openGroups.has(group.id);
        return (
          <div key={group.id}>
            <SectionHeader title={group.title} open={isOpen} onToggle={() => toggleGroup(group.id)} />
            {isOpen && (
              <div className="px-4 py-3 space-y-3">
                {group.fields.map(field => {
                  // Conditionally show fields based on trigger type
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

      {/* Save button */}
      <div className="p-4 border-t mt-auto" style={{ borderColor: "hsl(var(--border))" }}>
        <button
          className="w-full py-2 rounded-md text-sm font-semibold transition-all"
          style={{
            background: dirty ? "hsl(var(--primary))" : "hsl(var(--surface-raised))",
            color: dirty ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground-muted))",
            cursor: dirty ? "pointer" : "default",
          }}
          onClick={handleSave}
        >
          {dirty ? "Save Changes" : "No Changes"}
        </button>
      </div>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function PropertiesPanel({ caseIr, selection, onClose, onPatch }: {
  caseIr: CaseIR; selection: SelectionTarget; onClose: () => void; onPatch: (p: JsonPatch) => void;
}) {
  const panelStyle: React.CSSProperties = {
    background: "hsl(var(--surface))",
    borderColor: "hsl(var(--border))",
    width: 310,
    minWidth: 310,
  };

  if (!selection) {
    return (
      <div className="h-full flex flex-col border-l" style={panelStyle}>
        <div className="px-4 py-3 border-b" style={{ borderColor: "hsl(var(--border))" }}>
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "hsl(var(--foreground-muted))" }}>Properties</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "hsl(var(--surface-raised))", border: "1px solid hsl(var(--border))" }}>
            <Settings2 size={18} style={{ color: "hsl(var(--foreground-subtle))" }} />
          </div>
          <p className="text-[12px] leading-relaxed" style={{ color: "hsl(var(--foreground-muted))" }}>
            Select a trigger, stage, group, or step to view and edit its Camunda 7 properties
          </p>
        </div>
      </div>
    );
  }

  // ── Trigger properties ────────────────────────────────────────────────────
  if (selection.kind === "trigger") {
    return (
      <div className="h-full flex flex-col border-l" style={panelStyle}>
        <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0" style={{ borderColor: "hsl(var(--border))" }}>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "hsl(var(--foreground-muted))" }}>Trigger Properties</div>
            <div className="text-[13px] font-semibold mt-0.5 truncate" style={{ color: "hsl(var(--foreground))" }}>Start Event</div>
          </div>
          <button className="flex-shrink-0 w-7 h-7 rounded flex items-center justify-center transition-colors"
            style={{ color: "hsl(var(--foreground-muted))" }}
            onMouseEnter={e => { e.currentTarget.style.background = "hsl(var(--surface-raised))"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
            onClick={onClose}>
            <X size={14} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <TriggerPropertiesPanel trigger={caseIr.trigger} onPatch={onPatch} />
        </div>
      </div>
    );
  }

  const si = findStageIndex(caseIr, selection.stageId);
  const stage = caseIr.stages[si];
  if (!stage) return null;

  let title = "Stage";
  let subtitle = stage.name;
  let content: React.ReactNode = <StagePropertiesPanel stage={stage} stageIdx={si} onPatch={onPatch} />;

  if (selection.kind === "group" || selection.kind === "step") {
    const gi = findGroupIndex(stage, selection.groupId);
    const group = stage.groups[gi];
    if (!group) return null;

    if (selection.kind === "group") {
      title = "Group";
      subtitle = group.name;
      content = <GroupPropertiesPanel group={group} stageIdx={si} groupIdx={gi} onPatch={onPatch} />;
    } else {
      const sti = findStepIndex(group, selection.stepId);
      const step = group.steps[sti];
      if (!step) return null;
      title = "Step";
      subtitle = step.name;
      const basePath = `/stages/${si}/groups/${gi}/steps/${sti}`;
      content = <StepPropertiesPanel step={step} basePath={basePath} onPatch={onPatch} />;
    }
  }

  return (
    <div className="h-full flex flex-col border-l" style={panelStyle}>
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0" style={{ borderColor: "hsl(var(--border))" }}>
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "hsl(var(--foreground-muted))" }}>{title} Properties</div>
          <div className="text-[13px] font-semibold mt-0.5 truncate" style={{ color: "hsl(var(--foreground))" }}>{subtitle}</div>
        </div>
        <button className="flex-shrink-0 w-7 h-7 rounded flex items-center justify-center transition-colors"
          style={{ color: "hsl(var(--foreground-muted))" }}
          onMouseEnter={e => { e.currentTarget.style.background = "hsl(var(--surface-raised))"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
          onClick={onClose}>
          <X size={14} />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">{content}</div>
    </div>
  );
}
