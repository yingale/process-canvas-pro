/**
 * ModulePicker – dropdown to insert reusable module templates into a group.
 * Fetches modules from the database and renders a popover list.
 */
import { useState, useEffect } from "react";
import { Package, ChevronDown, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Step } from "@/types/caseIr";
import "./studio.css";

interface ReusableModule {
  id: string;
  name: string;
  category: string;
  description: string | null;
  steps: Step[];
}

interface ModulePickerProps {
  onInsert: (steps: Step[]) => void;
}

export default function ModulePicker({ onInsert }: ModulePickerProps) {
  const [open, setOpen] = useState(false);
  const [modules, setModules] = useState<ReusableModule[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    if (!open || fetched) return;
    setLoading(true);
    supabase
      .from("reusable_modules")
      .select("id, name, category, description, steps")
      .then(({ data, error }) => {
        if (!error && data) {
          setModules(data as unknown as ReusableModule[]);
        }
        setFetched(true);
        setLoading(false);
      });
  }, [open, fetched]);

  const handleSelect = (mod: ReusableModule) => {
    const stepsWithNewIds = mod.steps.map((s) => ({
      ...s,
      id: `el_${Math.random().toString(36).slice(2, 8)}`,
    }));
    onInsert(stepsWithNewIds);
    setOpen(false);
  };

  const grouped = modules.reduce<Record<string, ReusableModule[]>>(
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
          ) : modules.length === 0 ? (
            <div className="module-picker-empty">No modules available.</div>
          ) : (
            <div className="module-picker-list">
              {Object.entries(grouped).map(([cat, mods]) => (
                <div key={cat}>
                  <div className="module-picker-category">{cat}</div>
                  {mods.map((mod) => (
                    <button
                      key={mod.id}
                      className="module-picker-item"
                      onClick={() => handleSelect(mod)}
                    >
                      <div className="module-picker-item-name">{mod.name}</div>
                      {mod.description && (
                        <div className="module-picker-item-desc">
                          {mod.description}
                        </div>
                      )}
                      <div className="module-picker-item-count">
                        {mod.steps.length} step{mod.steps.length !== 1 ? "s" : ""}
                      </div>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
