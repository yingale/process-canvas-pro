/**
 * Step properties editor sub-panel.
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { ArrowRight, Package, FileText, X, Pencil, Eye, Settings2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Step, IoParam, JsonPatch, FormTemplate, FormRef } from "@/types/caseIr";
import FormPreview from "../FormPreview";
import { STEP_TYPE_CONFIG } from "../FlowNodes";
import { CAMUNDA_PROP_GROUPS } from "../camundaSchema";
import {
  deepGet, deepSet, SectionHeader, Field, TextInput,
  MultilineInput, Toggle, IoParamTable, FieldRenderer,
} from "./PropertyFields";

/* ─── Form management sub-section ──────────────────────────────────────────── */

function StepFormSection({ step, basePath, onPatch, formTemplates, openGroups, toggleGroup, caseIr }: {
  step: Step; basePath: string; onPatch: (p: JsonPatch) => void;
  formTemplates: FormTemplate[];
  openGroups: Set<string>; toggleGroup: (id: string) => void;
  caseIr?: import("@/types/caseIr").CaseIR;
}) {
  const navigate = useNavigate();
  const [showPreview, setShowPreview] = useState(false);

  const selectedTemplate = useMemo(
    () => formTemplates.find(t => t.id === step.formRef?.formId),
    [formTemplates, step.formRef?.formId],
  );

  const effectiveFields = useMemo(() => {
    if (!selectedTemplate) return [];
    return selectedTemplate.fields.map(f => {
      const override = step.formRef?.fieldOverrides?.[f.key];
      return override ? { ...f, ...override } : f;
    });
  }, [selectedTemplate, step.formRef?.fieldOverrides]);

  const handleAttachForm = (formId: string) => {
    onPatch([{
      op: step.formRef ? "replace" : "add",
      path: `${basePath}/formRef`,
      value: { formId, fieldOverrides: {} } satisfies FormRef,
    }]);
  };

  const handleDetachForm = () => {
    onPatch([{ op: "remove", path: `${basePath}/formRef` }]);
  };

  const handleEditForm = () => {
    if (!selectedTemplate) return;
    if (caseIr) sessionStorage.setItem("studio_caseIr", JSON.stringify(caseIr));
    navigate("/studio/form-builder", {
      state: {
        returnTo: "/studio",
        stepBasePath: basePath,
        existingTemplates: formTemplates,
        editTemplate: selectedTemplate,
      },
    });
  };

  const handleCreateNewForm = () => {
    if (caseIr) sessionStorage.setItem("studio_caseIr", JSON.stringify(caseIr));
    navigate("/studio/form-builder", {
      state: {
        returnTo: "/studio",
        stepBasePath: basePath,
        existingTemplates: formTemplates,
      },
    });
  };

  const sectionTitle = `Form${selectedTemplate ? ` — ${selectedTemplate.name}` : ""}`;

  return (
    <div>
      <SectionHeader title={sectionTitle} open={openGroups.has("step-form")} onToggle={() => toggleGroup("step-form")} />
      {openGroups.has("step-form") && (
        <div className="px-4 py-3 space-y-2.5">
          <Field label="Attached Form">
            <div className="flex gap-1.5">
              <select
                className="studio-select flex-1 text-[12px] rounded-md px-2.5 py-1.5"
                value={step.formRef?.formId ?? ""}
                onChange={(e) => (e.target.value ? handleAttachForm(e.target.value) : handleDetachForm())}
              >
                <option value="">— None —</option>
                {formTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.fields.length} fields)
                  </option>
                ))}
              </select>
              {step.formRef && (
                <button className="step-form-icon-btn" onClick={handleDetachForm} title="Detach form">
                  <X size={12} />
                </button>
              )}
            </div>
          </Field>

          <div className="flex gap-1.5">
            {selectedTemplate && (
              <>
                <button className="step-form-action-btn flex-1 justify-center gap-1" onClick={handleEditForm}>
                  <Pencil size={10} /> Edit Form
                </button>
                <button
                  className={`step-form-action-btn ${showPreview ? "step-form-action-btn--active" : ""}`}
                  onClick={() => setShowPreview(!showPreview)}
                >
                  <Eye size={10} />
                </button>
              </>
            )}
            <button className="step-form-action-btn flex-1 justify-center gap-1" onClick={handleCreateNewForm}>
              <FileText size={10} /> New Form
            </button>
          </div>

          {showPreview && selectedTemplate && (
            <div className="step-form-preview-wrap">
              <FormPreview fields={effectiveFields} />
            </div>
          )}

          {selectedTemplate && (
            <div className="text-[10px] text-foreground-subtle flex items-center gap-1">
              <FileText size={10} />
              {selectedTemplate.fields.length} field{selectedTemplate.fields.length !== 1 ? "s" : ""} attached
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Main panel ───────────────────────────────────────────────────────────── */

interface StepPropertiesPanelProps {
  step: Step;
  basePath: string;
  onPatch: (p: JsonPatch) => void;
  formTemplates?: FormTemplate[];
  caseIr?: import("@/types/caseIr").CaseIR;
}

export default function StepPropertiesPanel({
  step, basePath, onPatch, formTemplates = [], caseIr,
}: StepPropertiesPanelProps) {
  const [draft, setDraft] = useState<Record<string, unknown>>(
    step as unknown as Record<string, unknown>
  );
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    new Set(["service-task", "user-task", "call-activity", "foreach", "intermediate-event", "async", "gateway", "step-form"])
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

      {step.moduleRef && (
        <div className="px-4 py-3">
          <button
            className="step-form-action-btn w-full justify-center gap-1.5 py-2"
            onClick={() => {
              if (caseIr) sessionStorage.setItem("studio_caseIr", JSON.stringify(caseIr));
              navigate("/studio/module-config", {
                state: {
                  returnTo: "/studio",
                  stepBasePath: basePath,
                  moduleRef: step.moduleRef,
                },
              });
            }}
          >
            <Settings2 size={12} /> Configure Module
          </button>
        </div>
      )}

      {/* Form management section */}
      <StepFormSection
        step={step}
        basePath={basePath}
        onPatch={onPatch}
        formTemplates={formTemplates}
        openGroups={openGroups}
        toggleGroup={toggleGroup}
        caseIr={caseIr}
      />

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
