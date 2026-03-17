/**
 * FormBuilderPage – standalone page for creating/editing form templates.
 * After saving, navigates back to studio with the form attached.
 */
import { useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import FormBuilderPanel from "@/components/studio/FormBuilderPanel";
import type { ModuleConfigField, FormTemplate } from "@/types/caseIr";

function templateUid() { return `ftpl_${Math.random().toString(36).slice(2, 10)}`; }

export default function FormBuilderPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as {
    returnTo: string;
    stepBasePath: string;
    existingTemplates: FormTemplate[];
    editTemplate?: FormTemplate;
  } | null;

  const [fields, setFields] = useState<ModuleConfigField[]>(state?.editTemplate?.fields ?? []);
  const [formName, setFormName] = useState(state?.editTemplate?.name ?? "");

  const handleSave = useCallback(() => {
    if (!formName.trim() || fields.length === 0) return;

    const template: FormTemplate = {
      id: state?.editTemplate?.id ?? templateUid(),
      name: formName.trim(),
      fields,
    };

    navigate(state?.returnTo ?? "/studio", {
      state: {
        savedFormTemplate: template,
        stepBasePath: state?.stepBasePath,
        restoreStudio: true,
      },
    });
  }, [formName, fields, state, navigate]);

  const handleCancel = () => {
    navigate(state?.returnTo ?? "/studio", {
      state: { restoreStudio: true },
    });
  };

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
          <h1 className="text-[14px] font-bold text-foreground">
            {state?.editTemplate ? "Edit Form Template" : "Create New Form"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={formName}
            onChange={e => setFormName(e.target.value)}
            placeholder="Form name…"
            className="studio-input text-[12px] px-3 py-1.5 rounded-md w-56 border border-border bg-surface-overlay"
          />
          <button
            onClick={handleSave}
            disabled={!formName.trim() || fields.length === 0}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-[12px] font-semibold transition-all ${
              formName.trim() && fields.length > 0
                ? "save-btn--active"
                : "save-btn--inactive"
            }`}
          >
            <Save size={12} />
            Save & Attach
          </button>
        </div>
      </div>

      {/* Form Builder */}
      <div className="flex-1 overflow-hidden">
        <FormBuilderPanel
          fields={fields}
          onFieldsChange={setFields}
          formTemplates={state?.existingTemplates ?? []}
          onSaveTemplate={() => {}}
          onDeleteTemplate={() => {}}
        />
      </div>
    </div>
  );
}
