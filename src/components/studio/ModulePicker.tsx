/**
 * ModulePicker – dropdown to insert reusable module templates into a group.
 * Fetches modules from the database, filters by persona, and renders a popover list.
 */
import { useState, useEffect } from "react";
import { Package, ChevronDown, Loader2, Mail, Zap, Shield, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Step, ModuleConfigField, ModuleRef } from "@/types/caseIr";
import "./studio.css";

interface ReusableModule {
  id: string;
  name: string;
  category: string;
  description: string | null;
  icon: string | null;
  steps: Step[];
  config_schema: ModuleConfigField[];
  allowed_personas: string[] | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ICON_MAP: Record<string, any> = {
  mail: Mail,
  zap: Zap,
  shield: Shield,
  settings: Settings,
  package: Package,
};

interface ModulePickerProps {
  onInsert: (steps: Step[], moduleId: string) => void;
  currentPersona?: string;
}

export default function ModulePicker({ onInsert, currentPersona }: ModulePickerProps) {
  const [open, setOpen] = useState(false);
  const [modules, setModules] = useState<ReusableModule[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    if (!open || fetched) return;
    setLoading(true);
    supabase
      .from("reusable_modules")
      .select("id, name, category, description, icon, steps, config_schema, allowed_personas")
      .then(({ data, error }) => {
        if (!error && data) {
          setModules(data as unknown as ReusableModule[]);
        }
        setFetched(true);
        setLoading(false);
      });
  }, [open, fetched]);

  // Filter by persona
  const filtered = modules.filter((m) => {
    if (!m.allowed_personas || m.allowed_personas.length === 0) return true;
    if (!currentPersona) return true;
    return m.allowed_personas.includes(currentPersona);
  });

  const handleSelect = (mod: ReusableModule) => {
    const moduleRef: ModuleRef = {
      moduleId: mod.id,
      instanceConfig: {},
    };
    // Pre-fill defaults from config schema
    for (const field of mod.config_schema ?? []) {
      if (field.defaultValue !== undefined) {
        moduleRef.instanceConfig[field.key] =
          field.type === "boolean" ? field.defaultValue === "true" : field.defaultValue;
      }
    }
    const stepsWithNewIds = mod.steps.map((s) => ({
      ...s,
      id: `el_${Math.random().toString(36).slice(2, 8)}`,
      moduleRef,
    }));
    onInsert(stepsWithNewIds, mod.id);
    setOpen(false);
  };

  const grouped = filtered.reduce<Record<string, ReusableModule[]>>(
    (acc, m) => {
      const cat = m.category || "General";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(m);
      return acc;
    },
    {},
  );

  return (
    <div className="module-picker-wrapper">
      <button
        className="module-picker-trigger"
        onClick={() => setOpen((o) => !o)}
      >
        <Package size={10} />
        Add Module
        <ChevronDown size={9} />
      </button>

      {open && (
        <div className="module-picker-dropdown">
          <div className="module-picker-header">Reusable Modules</div>
          {loading ? (
            <div className="module-picker-loading">
              <Loader2 size={14} className="animate-spin" />
              <span>Loading…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="module-picker-empty">No modules available.</div>
          ) : (
            <div className="module-picker-list">
              {Object.entries(grouped).map(([cat, mods]) => (
                <div key={cat}>
                  <div className="module-picker-category">{cat}</div>
                  {mods.map((mod) => {
                    const IconComp = ICON_MAP[mod.icon ?? "package"] ?? Package;
                    const configCount = (mod.config_schema ?? []).length;
                    return (
                      <button
                        key={mod.id}
                        className="module-picker-item"
                        onClick={() => handleSelect(mod)}
                      >
                        <div className="module-picker-item-icon">
                          <IconComp size={12} />
                        </div>
                        <div className="module-picker-item-content">
                          <div className="module-picker-item-name">{mod.name}</div>
                          {mod.description && (
                            <div className="module-picker-item-desc">
                              {mod.description}
                            </div>
                          )}
                          <div className="module-picker-item-meta">
                            <span>{mod.steps.length} step{mod.steps.length !== 1 ? "s" : ""}</span>
                            {configCount > 0 && (
                              <span className="module-picker-config-badge">
                                {configCount} config field{configCount !== 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}