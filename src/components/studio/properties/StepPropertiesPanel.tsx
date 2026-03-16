/**
 * Step properties editor sub-panel.
 */
import { useState, useEffect, useCallback } from "react";
import { ArrowRight, Package } from "lucide-react";
import type { Step, IoParam, JsonPatch } from "@/types/caseIr";
import ModuleConfigPanel from "./ModuleConfigPanel";
import { STEP_TYPE_CONFIG } from "../FlowNodes";
import { CAMUNDA_PROP_GROUPS } from "../camundaSchema";
import {
  deepGet, deepSet, SectionHeader, Field, TextInput,
  MultilineInput, Toggle, IoParamTable, FieldRenderer,
} from "./PropertyFields";

interface StepPropertiesPanelProps {
  step: Step;
  basePath: string;
  onPatch: (p: JsonPatch) => void;
}

export default function StepPropertiesPanel({
  step, basePath, onPatch,
}: StepPropertiesPanelProps) {
  const [draft, setDraft] = useState<Record<string, unknown>>(
    step as unknown as Record<string, unknown>
  );
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    new Set(["service-task", "user-task", "call-activity", "foreach", "intermediate-event", "async", "gateway"])
  );
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
    const updated = {
      ...draft,
      tech: {
        ...(typeof draft.tech === "object" && draft.tech ? draft.tech : {}),
        inputParameters: inputParams,
        outputParameters: outputParams,
      },
    };
    onPatch([{ op: "replace", path: basePath, value: updated }]);
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
      <div className="flex items-center gap-2 flex-wrap px-4 py-3 border-b border-border">
        <div className="step-type-badge px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide"
          style={{ "--dynamic-color": cfg.colorVar } as React.CSSProperties}>
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

      <div className="px-4 py-3 space-y-3">
        <Field label="Name">
          <TextInput value={String(draft.name ?? "")} onChange={v => handleChange("name", v)} placeholder="Step name" />
        </Field>
        <Field label="Description">
          <MultilineInput value={String(draft.description ?? "")} onChange={v => handleChange("description", v)} placeholder="Optional description…" />
        </Field>
      </div>

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
                    return <Toggle key={field.key} checked={boolVal} onChange={v => handleChange(field.key, v)} label={field.label} />;
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

      {step.type === "decision" && step.branches.length > 0 && (
        <div>
          <SectionHeader title="Branches" open={openGroups.has("branches")} onToggle={() => toggleGroup("branches")} />
          {openGroups.has("branches") && (
            <div className="px-4 py-3 space-y-2">
              {step.branches.map(branch => (
                <div key={branch.id} className="branch-card rounded-lg border p-3 space-y-1.5">
                  <div className="text-[11px] font-semibold text-foreground">{branch.label}</div>
                  <div className="font-mono text-[10px] break-all text-foreground-muted">{branch.condition}</div>
                  {branch.targetStepId && <div className="text-[10px] text-foreground-subtle">→ {branch.targetStepId}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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

      {/* Module Configuration */}
      {step.moduleRef && (
        <div>
          <SectionHeader
            title="Module Configuration"
            open={openGroups.has("module-config")}
            onToggle={() => toggleGroup("module-config")}
          />
          {openGroups.has("module-config") && (
            <ModuleConfigPanel
              moduleRef={step.moduleRef}
              basePath={basePath}
              onPatch={onPatch}
            />
          )}
        </div>
      )}
      <div>
        <SectionHeader title="Input / Output Parameters" open={openGroups.has("io")} onToggle={() => toggleGroup("io")} />
        {openGroups.has("io") && (
          <div className="px-4 py-3 space-y-4">
            <IoParamTable params={inputParams} label="Input Parameters" accent="hsl(213 80% 50%)" onChange={p => { setInputParams(p); setDirty(true); }} />
            <IoParamTable params={outputParams} label="Output Parameters" accent="hsl(134 58% 38%)" onChange={p => { setOutputParams(p); setDirty(true); }} />
          </div>
        )}
      </div>

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
