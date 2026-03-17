/**
 * ModuleConfigPage – full-page module configuration editor.
 * Reuses the same FormBuilderPanel (form-builder UI) to edit a module's config_schema fields.
 * Uses the redirect-and-return pattern identical to FormBuilderPage.
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Save, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import FormBuilderPanel from "@/components/studio/FormBuilderPanel";
import type { ModuleConfigField, ModuleRef } from "@/types/caseIr";

export default function ModuleConfigPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as {
    returnTo: string;
    stepBasePath: string;
    moduleRef: ModuleRef;
  } | null;

  const [fields, setFields] = useState<ModuleConfigField[]>([]);
  const [moduleName, setModuleName] = useState("");
  const [loading, setLoading] = useState(true);

  // Load the module's config_schema as editable fields
  useEffect(() => {
    if (!state?.moduleRef?.moduleId) { setLoading(false); return; }
    supabase
      .from("reusable_modules")
      .select("name, config_schema")
      .eq("id", state.moduleRef.moduleId)
      .single()
      .then(({ data }) => {
        if (data) {
          setModuleName(data.name);
          setFields((data.config_schema as unknown as ModuleConfigField[]) ?? []);
        }
        setLoading(false);
      });
  }, [state?.moduleRef?.moduleId]);

  const handleSave = useCallback(() => {
    // Build instanceConfig from the field definitions (key → defaultValue mapping)
    const config: Record<string, unknown> = { ...state?.moduleRef?.instanceConfig };
    for (const f of fields) {
      if (!(f.key in config) && f.defaultValue !== undefined) {
        config[f.key] = f.defaultValue;
      }
    }

    navigate(state?.returnTo ?? "/studio", {
      state: {
        savedModuleConfig: config,
        savedModuleSchema: fields,
        stepBasePath: state?.stepBasePath,
        restoreStudio: true,
      },
    });
  }, [fields, state, navigate]);

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
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-[12px] font-semibold transition-all save-btn--active"
        >
          <Save size={12} />
          Save & Return
        </button>
      </div>

      {/* Form Builder Panel – same UI as form builder page */}
      <div className="flex-1 overflow-hidden">
        <FormBuilderPanel
          fields={fields}
          onFieldsChange={setFields}
          formTemplates={[]}
          onSaveTemplate={() => {}}
          onDeleteTemplate={() => {}}
        />
      </div>
    </div>
  );
}
