/**
 * StepFormPanel – lets users attach a reusable form template to a step,
 * and optionally override field-level settings per step instance.
 */
import { useState, useMemo } from "react";
import { FormInput, Plus, X, Eye, Settings2, ChevronDown, ChevronRight } from "lucide-react";
import type { FormTemplate, FormRef, ModuleConfigField, JsonPatch } from "@/types/caseIr";
import FormPreview from "../FormPreview";
import { SectionHeader, Field, TextInput, Toggle } from "./PropertyFields";
import "../studio.css";

interface StepFormPanelProps {
  formRef?: FormRef;
  formTemplates: FormTemplate[];
  basePath: string; // e.g. "/stages/0/groups/0/steps/2"
  onPatch: (p: JsonPatch) => void;
}

export default function StepFormPanel({ formRef, formTemplates, basePath, onPatch }: StepFormPanelProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [showOverrides, setShowOverrides] = useState(false);

  const selectedTemplate = useMemo(
    () => formTemplates.find((t) => t.id === formRef?.formId),
    [formTemplates, formRef?.formId],
  );

  // Compute effective fields (template fields + overrides)
  const effectiveFields = useMemo(() => {
    if (!selectedTemplate) return [];
    return selectedTemplate.fields.map((f) => {
      const override = formRef?.fieldOverrides?.[f.key];
      return override ? { ...f, ...override } : f;
    });
  }, [selectedTemplate, formRef?.fieldOverrides]);

  const handleAttach = (formId: string) => {
    onPatch([
      {
        op: formRef ? "replace" : "add",
        path: `${basePath}/formRef`,
        value: { formId, fieldOverrides: {} } satisfies FormRef,
      },
    ]);
  };

  const handleDetach = () => {
    onPatch([{ op: "remove", path: `${basePath}/formRef` }]);
  };

  const handleOverrideChange = (fieldKey: string, prop: string, value: unknown) => {
    const currentOverrides = { ...(formRef?.fieldOverrides ?? {}) };
    if (!currentOverrides[fieldKey]) currentOverrides[fieldKey] = {};
    (currentOverrides[fieldKey] as Record<string, unknown>)[prop] = value;
    onPatch([
      {
        op: "replace",
        path: `${basePath}/formRef/fieldOverrides`,
        value: currentOverrides,
      },
    ]);
  };

  const handleRemoveOverride = (fieldKey: string, prop: string) => {
    const currentOverrides = { ...(formRef?.fieldOverrides ?? {}) };
    if (currentOverrides[fieldKey]) {
      const fieldOv = { ...currentOverrides[fieldKey] } as Record<string, unknown>;
      delete fieldOv[prop];
      if (Object.keys(fieldOv).length === 0) {
        delete currentOverrides[fieldKey];
      } else {
        currentOverrides[fieldKey] = fieldOv as Partial<ModuleConfigField>;
      }
    }
    onPatch([
      {
        op: "replace",
        path: `${basePath}/formRef/fieldOverrides`,
        value: currentOverrides,
      },
    ]);
  };

  if (formTemplates.length === 0) {
    return (
      <div className="px-4 py-6 text-center text-[11px] text-foreground-muted">
        No form templates defined yet. Go to the <strong>Forms</strong> tab to create one.
      </div>
    );
  }

  return (
    <div className="step-form-panel">
      {/* Form selector */}
      <div className="px-4 py-3 space-y-2">
        <Field label="Attached Form">
          <div className="flex gap-1.5">
            <select
              className="studio-select flex-1 text-[12px] rounded-md px-2.5 py-1.5"
              value={formRef?.formId ?? ""}
              onChange={(e) => (e.target.value ? handleAttach(e.target.value) : handleDetach())}
            >
              <option value="">— None —</option>
              {formTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.fields.length} fields)
                </option>
              ))}
            </select>
            {formRef && (
              <button
                className="step-form-icon-btn"
                onClick={handleDetach}
                title="Detach form"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </Field>

        {selectedTemplate?.description && (
          <div className="text-[10px] text-foreground-muted italic px-1">
            {selectedTemplate.description}
          </div>
        )}
      </div>

      {selectedTemplate && (
        <>
          {/* Actions bar */}
          <div className="px-4 pb-2 flex gap-1.5">
            <button
              className={`step-form-action-btn ${showPreview ? "step-form-action-btn--active" : ""}`}
              onClick={() => { setShowPreview(!showPreview); setShowOverrides(false); }}
            >
              <Eye size={11} /> Preview
            </button>
            <button
              className={`step-form-action-btn ${showOverrides ? "step-form-action-btn--active" : ""}`}
              onClick={() => { setShowOverrides(!showOverrides); setShowPreview(false); }}
            >
              <Settings2 size={11} /> Overrides
            </button>
          </div>

          {/* Preview */}
          {showPreview && (
            <div className="px-3 pb-3">
              <div className="step-form-preview-wrap">
                <FormPreview fields={effectiveFields} />
              </div>
            </div>
          )}

          {/* Field overrides */}
          {showOverrides && (
            <div className="px-4 pb-3 space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-widest text-foreground-muted mb-1">
                Per-Step Field Overrides
              </div>
              {selectedTemplate.fields.map((field) => {
                const override = formRef?.fieldOverrides?.[field.key] ?? {};
                const hasOverrides = Object.keys(override).length > 0;
                return (
                  <FieldOverrideRow
                    key={field.key}
                    field={field}
                    override={override}
                    hasOverrides={hasOverrides}
                    onChange={(prop, val) => handleOverrideChange(field.key, prop, val)}
                    onRemove={(prop) => handleRemoveOverride(field.key, prop)}
                  />
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Field Override Row ─────────────────────────────────────────────────────── */

function FieldOverrideRow({
  field,
  override,
  hasOverrides,
  onChange,
  onRemove,
}: {
  field: ModuleConfigField;
  override: Partial<ModuleConfigField>;
  hasOverrides: boolean;
  onChange: (prop: string, value: unknown) => void;
  onRemove: (prop: string) => void;
}) {
  const [expanded, setExpanded] = useState(hasOverrides);

  return (
    <div className={`step-form-override-card ${hasOverrides ? "step-form-override-card--modified" : ""}`}>
      <button className="step-form-override-header" onClick={() => setExpanded(!expanded)}>
        {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        <span className="text-[11px] font-medium text-foreground">{field.label || field.key}</span>
        <span className="text-[9px] font-mono text-foreground-subtle ml-auto">{field.type}</span>
        {hasOverrides && <span className="step-form-override-dot" />}
      </button>
      {expanded && (
        <div className="step-form-override-body">
          {/* Override: required */}
          <div className="flex items-center justify-between">
            <Toggle
              checked={override.required ?? field.required}
              onChange={(v) => (v === field.required ? onRemove("required") : onChange("required", v))}
              label="Required"
            />
          </div>
          {/* Override: defaultValue */}
          <Field label="Default Value">
            <TextInput
              value={String(override.defaultValue ?? field.defaultValue ?? "")}
              onChange={(v) => (v === (field.defaultValue ?? "") ? onRemove("defaultValue") : onChange("defaultValue", v))}
              placeholder={field.defaultValue ?? "No default"}
            />
          </Field>
          {/* Override: hint */}
          <Field label="Hint Text">
            <TextInput
              value={String(override.hint ?? field.hint ?? "")}
              onChange={(v) => (v === (field.hint ?? "") ? onRemove("hint") : onChange("hint", v))}
              placeholder={field.hint ?? "No hint"}
            />
          </Field>
        </div>
      )}
    </div>
  );
}
