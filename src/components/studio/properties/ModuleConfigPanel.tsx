/**
 * ModuleConfigPanel – renders a dynamic config form from a module's configSchema.
 * Also allows attaching forms (existing or new) to the step via the module.
 */
import { useState, useEffect, useMemo } from "react";
import { Package, Plus, X, Eye, FileText } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import type { ModuleConfigField, ModuleRef, JsonPatch, FormTemplate, FormRef } from "@/types/caseIr";
import { supabase } from "@/integrations/supabase/client";
import { SectionHeader, Field, TextInput, MultilineInput, Toggle } from "./PropertyFields";
import FormPreview from "../FormPreview";
import "../studio.css";

interface ModuleConfigPanelProps {
  moduleRef: ModuleRef;
  basePath: string;
  onPatch: (p: JsonPatch) => void;
  formTemplates?: FormTemplate[];
  formRef?: FormRef;
}

export default function ModuleConfigPanel({ moduleRef, basePath, onPatch, formTemplates = [], formRef }: ModuleConfigPanelProps) {
  const navigate = useNavigate();
  const [schema, setSchema] = useState<ModuleConfigField[]>([]);
  const [moduleName, setModuleName] = useState("");
  const [moduleDesc, setModuleDesc] = useState("");
  const [config, setConfig] = useState<Record<string, unknown>>({ ...moduleRef.instanceConfig });
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showFormPreview, setShowFormPreview] = useState(false);

  useEffect(() => {
    supabase
      .from("reusable_modules")
      .select("name, description, config_schema")
      .eq("id", moduleRef.moduleId)
      .single()
      .then(({ data }) => {
        if (data) {
          setModuleName(data.name);
          setModuleDesc(data.description ?? "");
          setSchema((data.config_schema as unknown as ModuleConfigField[]) ?? []);
        }
        setLoading(false);
      });
  }, [moduleRef.moduleId]);

  const grouped = useMemo(() => {
    const groups: Record<string, ModuleConfigField[]> = {};
    for (const f of schema) {
      const g = f.group || "General";
      if (!groups[g]) groups[g] = [];
      groups[g].push(f);
    }
    return groups;
  }, [schema]);

  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    setOpenGroups(new Set([...Object.keys(grouped), "form-attachment"]));
  }, [grouped]);

  const toggleGroup = (g: string) =>
    setOpenGroups((prev) => {
      const next = new Set(prev);
      next.has(g) ? next.delete(g) : next.add(g);
      return next;
    });

  const handleChange = (key: string, value: unknown) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = () => {
    onPatch([{ op: "replace", path: `${basePath}/moduleRef/instanceConfig`, value: config }]);
    setDirty(false);
  };

  const selectedTemplate = useMemo(
    () => formTemplates.find(t => t.id === formRef?.formId),
    [formTemplates, formRef?.formId],
  );

  const effectiveFields = useMemo(() => {
    if (!selectedTemplate) return [];
    return selectedTemplate.fields.map(f => {
      const override = formRef?.fieldOverrides?.[f.key];
      return override ? { ...f, ...override } : f;
    });
  }, [selectedTemplate, formRef?.fieldOverrides]);

  const handleAttachForm = (formId: string) => {
    onPatch([{
      op: formRef ? "replace" : "add",
      path: `${basePath}/formRef`,
      value: { formId, fieldOverrides: {} } satisfies FormRef,
    }]);
  };

  const handleDetachForm = () => {
    onPatch([{ op: "remove", path: `${basePath}/formRef` }]);
  };

  const handleCreateNewForm = () => {
    navigate("/studio/form-builder", {
      state: {
        returnTo: "/studio",
        stepBasePath: basePath,
        existingTemplates: formTemplates,
      },
    });
  };

  if (loading) {
    return (
      <div className="px-4 py-6 text-center text-[11px] text-foreground-muted">
        Loading module configuration…
      </div>
    );
  }

  return (
    <div className="module-config-panel">
      {/* Module header */}
      <div className="module-config-header px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="module-config-icon">
            <Package size={14} />
          </div>
          <div className="min-w-0">
            <div className="text-[12px] font-semibold text-foreground truncate">
              {moduleName}
            </div>
            {moduleDesc && (
              <div className="text-[10px] text-foreground-muted mt-0.5">
                {moduleDesc}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Config fields grouped */}
      {schema.length === 0 ? (
        <div className="px-4 py-4 text-center text-[11px] text-foreground-subtle">
          This module has no configurable fields.
        </div>
      ) : (
        Object.entries(grouped).map(([group, fields]) => (
          <div key={group}>
            <SectionHeader title={group} open={openGroups.has(group)} onToggle={() => toggleGroup(group)} />
            {openGroups.has(group) && (
              <div className="px-4 py-3 space-y-3">
                {fields.map((field) => {
                  const val = config[field.key] ?? field.defaultValue ?? "";
                  if (field.type === "boolean") {
                    return (
                      <Toggle key={field.key} checked={val === true || val === "true"} onChange={(v) => handleChange(field.key, v)} label={field.label} />
                    );
                  }
                  if (field.type === "select" && field.options) {
                    return (
                      <Field key={field.key} label={field.label} hint={field.hint}>
                        <select className="studio-select w-full text-[12px] rounded-md px-2.5 py-1.5" value={String(val)} onChange={(e) => handleChange(field.key, e.target.value)}>
                          <option value="">Select…</option>
                          {field.options.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                        </select>
                      </Field>
                    );
                  }
                  if (field.type === "multiline") {
                    return (
                      <Field key={field.key} label={field.label} hint={field.hint}>
                        <MultilineInput value={String(val)} onChange={(v) => handleChange(field.key, v)} placeholder={field.hint || `Enter ${field.label.toLowerCase()}…`} />
                      </Field>
                    );
                  }
                  return (
                    <Field key={field.key} label={field.label} hint={field.hint}>
                      <TextInput value={String(val)} onChange={(v) => handleChange(field.key, v)} placeholder={field.hint || `Enter ${field.label.toLowerCase()}…`} />
                    </Field>
                  );
                })}
              </div>
            )}
          </div>
        ))
      )}

      {/* Form Attachment Section */}
      <div>
        <SectionHeader
          title={`Form${selectedTemplate ? ` — ${selectedTemplate.name}` : ""}`}
          open={openGroups.has("form-attachment")}
          onToggle={() => toggleGroup("form-attachment")}
        />
        {openGroups.has("form-attachment") && (
          <div className="px-4 py-3 space-y-2.5">
            {/* Existing form selector */}
            <Field label="Attached Form">
              <div className="flex gap-1.5">
                <select
                  className="studio-select flex-1 text-[12px] rounded-md px-2.5 py-1.5"
                  value={formRef?.formId ?? ""}
                  onChange={(e) => (e.target.value ? handleAttachForm(e.target.value) : handleDetachForm())}
                >
                  <option value="">— None —</option>
                  {formTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.fields.length} fields)
                    </option>
                  ))}
                </select>
                {formRef && (
                  <button className="step-form-icon-btn" onClick={handleDetachForm} title="Detach form">
                    <X size={12} />
                  </button>
                )}
              </div>
            </Field>

            {/* Create new form button */}
            <button
              className="step-form-action-btn w-full justify-center gap-1.5"
              onClick={handleCreateNewForm}
            >
              <Plus size={11} /> Create New Form
            </button>

            {/* Preview attached form */}
            {selectedTemplate && (
              <div className="space-y-2">
                <button
                  className={`step-form-action-btn ${showFormPreview ? "step-form-action-btn--active" : ""}`}
                  onClick={() => setShowFormPreview(!showFormPreview)}
                >
                  <Eye size={11} /> {showFormPreview ? "Hide" : "Show"} Preview
                </button>
                {showFormPreview && (
                  <div className="step-form-preview-wrap">
                    <FormPreview fields={effectiveFields} />
                  </div>
                )}
                <div className="text-[10px] text-foreground-subtle flex items-center gap-1">
                  <FileText size={10} />
                  {selectedTemplate.fields.length} fields attached
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Save config */}
      {schema.length > 0 && (
        <div className="p-4 border-t border-border">
          <button
            className={`w-full py-2 rounded-md text-sm font-semibold transition-all ${dirty ? "save-btn--active" : "save-btn--inactive"}`}
            onClick={handleSave}
          >
            {dirty ? "Save Configuration" : "No Changes"}
          </button>
        </div>
      )}
    </div>
  );
}
