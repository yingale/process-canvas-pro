/**
 * StepFormPanel – lets users attach a reusable form template to a step,
 * create new form templates inline, and optionally override field-level settings.
 */
import { useState, useMemo } from "react";
import { Plus, X, Eye, Settings2, ChevronDown, ChevronRight, Save } from "lucide-react";
import type { FormTemplate, FormRef, ModuleConfigField, JsonPatch } from "@/types/caseIr";
import FormPreview from "../FormPreview";
import { SectionHeader, Field, TextInput, Toggle } from "./PropertyFields";
import "../studio.css";

const FIELD_TYPE_OPTIONS: { value: ModuleConfigField["type"]; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Textarea" },
  { value: "number", label: "Number" },
  { value: "checkbox", label: "Checkbox" },
  { value: "select", label: "Dropdown" },
  { value: "radio", label: "Radio" },
  { value: "date", label: "Date" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "url", label: "URL" },
  { value: "file", label: "File Upload" },
];

function uid() { return `fld_${Math.random().toString(36).slice(2, 8)}`; }
function templateUid() { return `ftpl_${Math.random().toString(36).slice(2, 10)}`; }

interface StepFormPanelProps {
  formRef?: FormRef;
  formTemplates: FormTemplate[];
  basePath: string;
  onPatch: (p: JsonPatch) => void;
}

export default function StepFormPanel({ formRef, formTemplates, basePath, onPatch }: StepFormPanelProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [showOverrides, setShowOverrides] = useState(false);
  const [creatingNew, setCreatingNew] = useState(false);
  const [newFormName, setNewFormName] = useState("");
  const [newFormFields, setNewFormFields] = useState<ModuleConfigField[]>([]);

  const selectedTemplate = useMemo(
    () => formTemplates.find((t) => t.id === formRef?.formId),
    [formTemplates, formRef?.formId],
  );

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
    onPatch([{ op: "replace", path: `${basePath}/formRef/fieldOverrides`, value: currentOverrides }]);
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
    onPatch([{ op: "replace", path: `${basePath}/formRef/fieldOverrides`, value: currentOverrides }]);
  };

  /* ── Create new form template inline ── */
  const handleAddNewField = () => {
    setNewFormFields(prev => [...prev, {
      key: uid(), label: "", type: "text", required: false,
    }]);
  };

  const handleNewFieldChange = (index: number, updates: Partial<ModuleConfigField>) => {
    setNewFormFields(prev => prev.map((f, i) => i === index ? { ...f, ...updates } : f));
  };

  const handleRemoveNewField = (index: number) => {
    setNewFormFields(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveNewTemplate = () => {
    if (!newFormName.trim() || newFormFields.length === 0) return;
    const template: FormTemplate = {
      id: templateUid(),
      name: newFormName.trim(),
      fields: newFormFields,
    };
    // Save template to CaseIR
    const existing = formTemplates;
    if (existing.length === 0) {
      onPatch([{ op: "add", path: "/formTemplates", value: [template] }]);
    } else {
      onPatch([{ op: "add", path: "/formTemplates/-", value: template }]);
    }
    // Auto-attach to this step
    setTimeout(() => {
      onPatch([{
        op: formRef ? "replace" : "add",
        path: `${basePath}/formRef`,
        value: { formId: template.id, fieldOverrides: {} } satisfies FormRef,
      }]);
    }, 50);
    // Reset
    setCreatingNew(false);
    setNewFormName("");
    setNewFormFields([]);
  };

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
              <button className="step-form-icon-btn" onClick={handleDetach} title="Detach form">
                <X size={12} />
              </button>
            )}
          </div>
        </Field>

        {/* Create new form button */}
        {!creatingNew && (
          <button
            className="step-form-action-btn w-full justify-center gap-1.5"
            onClick={() => setCreatingNew(true)}
          >
            <Plus size={11} /> Create New Form
          </button>
        )}

        {selectedTemplate?.description && (
          <div className="text-[10px] text-foreground-muted italic px-1">
            {selectedTemplate.description}
          </div>
        )}
      </div>

      {/* Inline form creator */}
      {creatingNew && (
        <div className="px-4 pb-3 space-y-3 border-t border-border pt-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-foreground-muted">
            New Form Template
          </div>
          <Field label="Form Name">
            <TextInput
              value={newFormName}
              onChange={setNewFormName}
              placeholder="e.g. Application Details"
            />
          </Field>

          {/* Field list */}
          <div className="space-y-2">
            {newFormFields.map((field, idx) => (
              <div key={field.key} className="step-form-override-card p-2 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <TextInput
                    value={field.label}
                    onChange={(v) => handleNewFieldChange(idx, { label: v, key: v ? v.toLowerCase().replace(/\s+/g, '_') : field.key })}
                    placeholder="Field label"
                  />
                  <select
                    className="studio-select text-[11px] px-1.5 py-1 rounded"
                    value={field.type}
                    onChange={(e) => handleNewFieldChange(idx, { type: e.target.value as ModuleConfigField["type"] })}
                  >
                    {FIELD_TYPE_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <button className="step-form-icon-btn" onClick={() => handleRemoveNewField(idx)} title="Remove field">
                    <X size={10} />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <Toggle
                    checked={field.required ?? false}
                    onChange={(v) => handleNewFieldChange(idx, { required: v })}
                    label="Required"
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            className="step-form-action-btn w-full justify-center gap-1"
            onClick={handleAddNewField}
          >
            <Plus size={10} /> Add Field
          </button>

          <div className="flex gap-1.5">
            <button
              className={`flex-1 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                newFormName.trim() && newFormFields.length > 0
                  ? "save-btn--active"
                  : "save-btn--inactive"
              }`}
              onClick={handleSaveNewTemplate}
              disabled={!newFormName.trim() || newFormFields.length === 0}
            >
              <Save size={10} className="inline mr-1" />
              Save & Attach
            </button>
            <button
              className="step-form-action-btn px-3"
              onClick={() => { setCreatingNew(false); setNewFormName(""); setNewFormFields([]); }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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
  field, override, hasOverrides, onChange, onRemove,
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
          <div className="flex items-center justify-between">
            <Toggle
              checked={override.required ?? field.required}
              onChange={(v) => (v === field.required ? onRemove("required") : onChange("required", v))}
              label="Required"
            />
          </div>
          <Field label="Default Value">
            <TextInput
              value={String(override.defaultValue ?? field.defaultValue ?? "")}
              onChange={(v) => (v === (field.defaultValue ?? "") ? onRemove("defaultValue") : onChange("defaultValue", v))}
              placeholder={field.defaultValue ?? "No default"}
            />
          </Field>
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
