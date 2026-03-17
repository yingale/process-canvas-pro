/**
 * ModuleConfigPage – full-page module configuration editor.
 * Uses the same redirect-and-return pattern as FormBuilderPage.
 */
import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Save, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { ModuleConfigField, ModuleRef, JsonPatch } from "@/types/caseIr";
import { SectionHeader, Field, TextInput, MultilineInput, Toggle } from "@/components/studio/properties/PropertyFields";

export default function ModuleConfigPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as {
    returnTo: string;
    stepBasePath: string;
    moduleRef: ModuleRef;
  } | null;

  const [schema, setSchema] = useState<ModuleConfigField[]>([]);
  const [moduleName, setModuleName] = useState("");
  const [moduleDesc, setModuleDesc] = useState("");
  const [config, setConfig] = useState<Record<string, unknown>>(
    () => ({ ...state?.moduleRef?.instanceConfig })
  );
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!state?.moduleRef?.moduleId) { setLoading(false); return; }
    supabase
      .from("reusable_modules")
      .select("name, description, config_schema")
      .eq("id", state.moduleRef.moduleId)
      .single()
      .then(({ data }) => {
        if (data) {
          setModuleName(data.name);
          setModuleDesc(data.description ?? "");
          setSchema((data.config_schema as unknown as ModuleConfigField[]) ?? []);
        }
        setLoading(false);
      });
  }, [state?.moduleRef?.moduleId]);

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
  useEffect(() => { setOpenGroups(new Set(Object.keys(grouped))); }, [grouped]);

  const toggleGroup = (g: string) =>
    setOpenGroups(prev => {
      const next = new Set(prev);
      next.has(g) ? next.delete(g) : next.add(g);
      return next;
    });

  const handleChange = (key: string, value: unknown) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = useCallback(() => {
    navigate(state?.returnTo ?? "/studio", {
      state: {
        savedModuleConfig: config,
        stepBasePath: state?.stepBasePath,
        restoreStudio: true,
      },
    });
  }, [config, state, navigate]);

  const handleCancel = () => {
    navigate(state?.returnTo ?? "/studio", {
      state: { restoreStudio: true },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="empty-spinner w-10 h-10 border-2 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-surface flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={handleCancel}
            className="flex items-center gap-1.5 text-[12px] font-medium text-foreground-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft size={14} />
            Back to Studio
          </button>
          <div className="w-px h-5 bg-border" />
          <div className="flex items-center gap-2">
            <div className="module-config-icon">
              <Package size={14} />
            </div>
            <h1 className="text-[14px] font-bold text-foreground">
              Configure: {moduleName}
            </h1>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={!dirty}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-[12px] font-semibold transition-all ${
            dirty ? "save-btn--active" : "save-btn--inactive"
          }`}
        >
          <Save size={12} />
          Save & Return
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {/* Module info */}
        {moduleDesc && (
          <div className="desc-box mx-6 my-4 text-[12px] italic px-4 py-3 rounded-lg">
            {moduleDesc}
          </div>
        )}

        {schema.length === 0 ? (
          <div className="px-6 py-12 text-center text-foreground-muted text-[13px]">
            This module has no configurable fields.
          </div>
        ) : (
          <div className="max-w-2xl mx-auto py-4">
            {Object.entries(grouped).map(([group, fields]) => (
              <div key={group} className="mb-2">
                <SectionHeader
                  title={group}
                  open={openGroups.has(group)}
                  onToggle={() => toggleGroup(group)}
                />
                {openGroups.has(group) && (
                  <div className="px-6 py-4 space-y-4">
                    {fields.map(field => {
                      const val = config[field.key] ?? field.defaultValue ?? "";
                      if (field.type === "boolean") {
                        return (
                          <Toggle
                            key={field.key}
                            checked={val === true || val === "true"}
                            onChange={v => handleChange(field.key, v)}
                            label={field.label}
                          />
                        );
                      }
                      if (field.type === "select" && field.options) {
                        return (
                          <Field key={field.key} label={field.label} hint={field.hint}>
                            <select
                              className="studio-select w-full text-[12px] rounded-md px-2.5 py-1.5"
                              value={String(val)}
                              onChange={e => handleChange(field.key, e.target.value)}
                            >
                              <option value="">Select…</option>
                              {field.options.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          </Field>
                        );
                      }
                      if (field.type === "multiline") {
                        return (
                          <Field key={field.key} label={field.label} hint={field.hint}>
                            <MultilineInput
                              value={String(val)}
                              onChange={v => handleChange(field.key, v)}
                              placeholder={field.hint || `Enter ${field.label.toLowerCase()}…`}
                            />
                          </Field>
                        );
                      }
                      if (field.type === "number") {
                        return (
                          <Field key={field.key} label={field.label} hint={field.hint}>
                            <input
                              type="number"
                              className="studio-input w-full px-2.5 py-1.5 rounded-md border text-[12px] transition-colors focus:outline-none"
                              value={val === "" ? "" : Number(val)}
                              min={field.min}
                              max={field.max}
                              step={field.step}
                              onChange={e => handleChange(field.key, e.target.value === "" ? "" : Number(e.target.value))}
                              placeholder={field.hint || `Enter ${field.label.toLowerCase()}…`}
                            />
                          </Field>
                        );
                      }
                      return (
                        <Field key={field.key} label={field.label} hint={field.hint}>
                          <TextInput
                            value={String(val)}
                            onChange={v => handleChange(field.key, v)}
                            placeholder={field.hint || `Enter ${field.label.toLowerCase()}…`}
                          />
                        </Field>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
