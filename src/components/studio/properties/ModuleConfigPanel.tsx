/**
 * ModuleConfigPanel – renders a dynamic config form from a module's configSchema.
 */
import { useState, useEffect, useMemo } from "react";
import { Package } from "lucide-react";
import type { ModuleConfigField, ModuleRef, JsonPatch } from "@/types/caseIr";
import { supabase } from "@/integrations/supabase/client";
import { SectionHeader, Field, TextInput, MultilineInput, Toggle } from "./PropertyFields";
import "../studio.css";

interface ModuleConfigPanelProps {
  moduleRef: ModuleRef;
  basePath: string;
  onPatch: (p: JsonPatch) => void;
}

export default function ModuleConfigPanel({ moduleRef, basePath, onPatch }: ModuleConfigPanelProps) {
  const [schema, setSchema] = useState<ModuleConfigField[]>([]);
  const [moduleName, setModuleName] = useState("");
  const [moduleDesc, setModuleDesc] = useState("");
  const [config, setConfig] = useState<Record<string, unknown>>({ ...moduleRef.instanceConfig });
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);

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
    setOpenGroups(new Set(Object.keys(grouped)));
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
