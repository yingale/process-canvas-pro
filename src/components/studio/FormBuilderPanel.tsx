/**
 * FormBuilderPanel – Studio tab for building configurable forms.
 * Two modes:
 *   1. API-driven: Fetch ModuleConfigField[] from an API endpoint
 *   2. Custom: Build form fields visually with drag-and-drop ordering
 */
import { useState, useCallback, useRef } from "react";
import {
  Plus, Trash2, GripVertical, Upload, Link2, Pencil, Eye, EyeOff,
  Type, Hash, ToggleLeft, List, AlignLeft, FileUp, Calendar,
  CircleDot, CheckSquare, Mail, Globe, Lock,
  Palette, SlidersHorizontal, Star, Repeat, ChevronDown, ChevronRight, X,
} from "lucide-react";
import type { ModuleConfigField, FormFieldType } from "@/types/caseIr";
import FormPreview from "./FormPreview";
import "./studio.css";

// ─── Field type registry ──────────────────────────────────────────────────────

const FIELD_TYPES: { type: FormFieldType; label: string; icon: React.ReactNode; category: string }[] = [
  { type: "string",         label: "Text",            icon: <Type size={14} />,              category: "Basic" },
  { type: "number",         label: "Number",          icon: <Hash size={14} />,              category: "Basic" },
  { type: "boolean",        label: "Toggle",          icon: <ToggleLeft size={14} />,         category: "Basic" },
  { type: "select",         label: "Dropdown",        icon: <List size={14} />,              category: "Basic" },
  { type: "multiline",      label: "Multiline Text",  icon: <AlignLeft size={14} />,          category: "Basic" },
  { type: "file",           label: "File Upload",     icon: <FileUp size={14} />,            category: "Basic" },
  { type: "date",           label: "Date Picker",     icon: <Calendar size={14} />,           category: "Extended" },
  { type: "radio",          label: "Radio Group",     icon: <CircleDot size={14} />,          category: "Extended" },
  { type: "checkbox-group", label: "Checkbox Group",  icon: <CheckSquare size={14} />,        category: "Extended" },
  { type: "email",          label: "Email",           icon: <Mail size={14} />,              category: "Extended" },
  { type: "url",            label: "URL",             icon: <Globe size={14} />,             category: "Extended" },
  { type: "password",       label: "Password",        icon: <Lock size={14} />,              category: "Extended" },
  { type: "richtext",       label: "Rich Text",       icon: <Pencil size={14} />,            category: "Advanced" },
  { type: "color",          label: "Color Picker",    icon: <Palette size={14} />,           category: "Advanced" },
  { type: "slider",         label: "Slider",          icon: <SlidersHorizontal size={14} />,  category: "Advanced" },
  { type: "rating",         label: "Rating",          icon: <Star size={14} />,              category: "Advanced" },
  { type: "repeatable",     label: "Repeatable Group",icon: <Repeat size={14} />,            category: "Advanced" },
];

function uid() { return `field_${Math.random().toString(36).slice(2, 8)}`; }

// ─── CSV Parser ───────────────────────────────────────────────────────────────

function parseCSV(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

// ─── Field Editor ─────────────────────────────────────────────────────────────

function FieldEditor({
  field, index, total, onUpdate, onRemove, onMoveUp, onMoveDown,
}: {
  field: ModuleConfigField;
  index: number;
  total: number;
  onUpdate: (f: ModuleConfigField) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const csvRef = useRef<HTMLInputElement>(null);
  const fieldMeta = FIELD_TYPES.find(ft => ft.type === field.type);
  const needsOptions = ["select", "radio", "checkbox-group"].includes(field.type);

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const options = parseCSV(reader.result as string);
      onUpdate({ ...field, options });
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="fb-field-card">
      {/* Header */}
      <div className="fb-field-header" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            className="fb-grip cursor-grab"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <GripVertical size={12} />
          </button>
          <span className="fb-field-type-icon">{fieldMeta?.icon}</span>
          <span className="text-[12px] font-semibold text-foreground truncate">
            {field.label || "Untitled Field"}
          </span>
          <span className="text-[10px] text-foreground-subtle font-mono">
            {field.key}
          </span>
          {field.required && (
            <span className="fb-required-badge">Required</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {index > 0 && (
            <button className="fb-mini-btn" onClick={(e) => { e.stopPropagation(); onMoveUp(); }} title="Move up">↑</button>
          )}
          {index < total - 1 && (
            <button className="fb-mini-btn" onClick={(e) => { e.stopPropagation(); onMoveDown(); }} title="Move down">↓</button>
          )}
          <button className="fb-mini-btn fb-mini-btn--danger" onClick={(e) => { e.stopPropagation(); onRemove(); }} title="Remove">
            <Trash2 size={11} />
          </button>
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </div>
      </div>

      {/* Body */}
      {expanded && (
        <div className="fb-field-body">
          <div className="fb-field-row">
            <label className="fb-label">Key</label>
            <input
              className="studio-input fb-input"
              value={field.key}
              onChange={(e) => onUpdate({ ...field, key: e.target.value })}
              placeholder="field_key"
            />
          </div>
          <div className="fb-field-row">
            <label className="fb-label">Label</label>
            <input
              className="studio-input fb-input"
              value={field.label}
              onChange={(e) => onUpdate({ ...field, label: e.target.value })}
              placeholder="Field Label"
            />
          </div>
          <div className="fb-field-row">
            <label className="fb-label">Type</label>
            <select
              className="studio-select fb-input"
              value={field.type}
              onChange={(e) => onUpdate({ ...field, type: e.target.value as FormFieldType })}
            >
              {FIELD_TYPES.map(ft => (
                <option key={ft.type} value={ft.type}>{ft.label}</option>
              ))}
            </select>
          </div>
          <div className="fb-field-row">
            <label className="fb-label">Group</label>
            <input
              className="studio-input fb-input"
              value={field.group ?? ""}
              onChange={(e) => onUpdate({ ...field, group: e.target.value || undefined })}
              placeholder="e.g., Connection, Filters"
            />
          </div>
          <div className="fb-field-row">
            <label className="fb-label">Hint</label>
            <input
              className="studio-input fb-input"
              value={field.hint ?? ""}
              onChange={(e) => onUpdate({ ...field, hint: e.target.value || undefined })}
              placeholder="Help text for the user"
            />
          </div>
          <div className="fb-field-row">
            <label className="fb-label">Default Value</label>
            <input
              className="studio-input fb-input"
              value={field.defaultValue ?? ""}
              onChange={(e) => onUpdate({ ...field, defaultValue: e.target.value || undefined })}
            />
          </div>
          <div className="fb-toggle-row">
            <label className="fb-label">Required</label>
            <button
              className={`fb-toggle-btn ${field.required ? "fb-toggle-btn--on" : "fb-toggle-btn--off"}`}
              onClick={() => onUpdate({ ...field, required: !field.required })}
            >
              {field.required ? "Yes" : "No"}
            </button>
          </div>

          {/* Slider-specific: min/max/step */}
          {(field.type === "slider" || field.type === "rating" || field.type === "number") && (
            <div className="fb-field-row-group">
              <div className="fb-field-row">
                <label className="fb-label">Min</label>
                <input
                  className="studio-input fb-input"
                  type="number"
                  value={field.min ?? ""}
                  onChange={(e) => onUpdate({ ...field, min: e.target.value ? Number(e.target.value) : undefined })}
                />
              </div>
              <div className="fb-field-row">
                <label className="fb-label">Max</label>
                <input
                  className="studio-input fb-input"
                  type="number"
                  value={field.max ?? ""}
                  onChange={(e) => onUpdate({ ...field, max: e.target.value ? Number(e.target.value) : undefined })}
                />
              </div>
              {field.type === "slider" && (
                <div className="fb-field-row">
                  <label className="fb-label">Step</label>
                  <input
                    className="studio-input fb-input"
                    type="number"
                    value={field.step ?? ""}
                    onChange={(e) => onUpdate({ ...field, step: e.target.value ? Number(e.target.value) : undefined })}
                  />
                </div>
              )}
            </div>
          )}

          {/* File accept type */}
          {field.type === "file" && (
            <div className="fb-field-row">
              <label className="fb-label">Accept</label>
              <input
                className="studio-input fb-input"
                value={field.accept ?? ""}
                onChange={(e) => onUpdate({ ...field, accept: e.target.value || undefined })}
                placeholder=".pdf,.xlsx,.csv"
              />
            </div>
          )}

          {/* Options for select/radio/checkbox */}
          {needsOptions && (
            <div className="fb-options-section">
              <div className="flex items-center justify-between mb-2">
                <label className="fb-label">Options</label>
                <div className="flex gap-1">
                  <button
                    className="fb-mini-action"
                    onClick={() => onUpdate({ ...field, options: [...(field.options ?? []), ""] })}
                  >
                    <Plus size={10} /> Add
                  </button>
                  <button
                    className="fb-mini-action"
                    onClick={() => csvRef.current?.click()}
                  >
                    <Upload size={10} /> CSV
                  </button>
                  <input
                    ref={csvRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleCSVUpload}
                  />
                </div>
              </div>
              {(field.options ?? []).map((opt, oi) => (
                <div key={oi} className="fb-option-row">
                  <input
                    className="studio-input fb-input flex-1"
                    value={opt}
                    onChange={(e) => {
                      const newOpts = [...(field.options ?? [])];
                      newOpts[oi] = e.target.value;
                      onUpdate({ ...field, options: newOpts });
                    }}
                    placeholder={`Option ${oi + 1}`}
                  />
                  <button
                    className="fb-mini-btn fb-mini-btn--danger"
                    onClick={() => {
                      const newOpts = (field.options ?? []).filter((_, i) => i !== oi);
                      onUpdate({ ...field, options: newOpts });
                    }}
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
              {(field.options ?? []).length === 0 && (
                <div className="text-[10px] text-foreground-subtle italic px-1">
                  No options. Add manually or upload a CSV file.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Type Palette ─────────────────────────────────────────────────────────────

function TypePalette({ onAdd }: { onAdd: (type: FormFieldType) => void }) {
  const categories = ["Basic", "Extended", "Advanced"];
  return (
    <div className="fb-palette">
      <div className="fb-palette-title">Add Field</div>
      {categories.map(cat => (
        <div key={cat}>
          <div className="fb-palette-category">{cat}</div>
          <div className="fb-palette-grid">
            {FIELD_TYPES.filter(ft => ft.category === cat).map(ft => (
              <button
                key={ft.type}
                className="fb-palette-item"
                onClick={() => onAdd(ft.type)}
                title={ft.label}
              >
                {ft.icon}
                <span>{ft.label}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

interface FormBuilderPanelProps {
  fields: ModuleConfigField[];
  onFieldsChange: (fields: ModuleConfigField[]) => void;
}

export default function FormBuilderPanel({ fields, onFieldsChange }: FormBuilderPanelProps) {
  const [mode, setMode] = useState<"custom" | "api">("custom");
  const [showPreview, setShowPreview] = useState(false);
  const [apiUrl, setApiUrl] = useState("");
  const [apiFetching, setApiFetching] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const handleAddField = useCallback((type: FormFieldType) => {
    const newField: ModuleConfigField = {
      key: uid(),
      label: "",
      type,
      required: false,
    };
    if (["select", "radio", "checkbox-group"].includes(type)) {
      newField.options = [];
    }
    if (type === "slider") {
      newField.min = 0;
      newField.max = 100;
      newField.step = 1;
    }
    if (type === "rating") {
      newField.min = 1;
      newField.max = 5;
    }
    onFieldsChange([...fields, newField]);
  }, [fields, onFieldsChange]);

  const handleUpdate = useCallback((index: number, updated: ModuleConfigField) => {
    const next = [...fields];
    next[index] = updated;
    onFieldsChange(next);
  }, [fields, onFieldsChange]);

  const handleRemove = useCallback((index: number) => {
    onFieldsChange(fields.filter((_, i) => i !== index));
  }, [fields, onFieldsChange]);

  const handleMove = useCallback((from: number, to: number) => {
    if (to < 0 || to >= fields.length) return;
    const next = [...fields];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onFieldsChange(next);
  }, [fields, onFieldsChange]);

  const handleFetchApi = async () => {
    if (!apiUrl.trim()) return;
    setApiFetching(true);
    setApiError(null);
    try {
      const res = await fetch(apiUrl.trim());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const fetched: ModuleConfigField[] = Array.isArray(data) ? data : data.fields ?? data.schema ?? [];
      if (!Array.isArray(fetched) || fetched.length === 0) {
        throw new Error("Response is not a valid ModuleConfigField[] array");
      }
      onFieldsChange(fetched);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setApiFetching(false);
    }
  };

  return (
    <div className="fb-panel">
      {/* Mode toggle */}
      <div className="fb-mode-bar">
        <div className="flex gap-1">
          <button
            className={`fb-mode-btn ${mode === "custom" && !showPreview ? "fb-mode-btn--active" : ""}`}
            onClick={() => { setMode("custom"); setShowPreview(false); }}
          >
            <Pencil size={12} /> Builder
          </button>
          <button
            className={`fb-mode-btn ${mode === "api" && !showPreview ? "fb-mode-btn--active" : ""}`}
            onClick={() => { setMode("api"); setShowPreview(false); }}
          >
            <Link2 size={12} /> API
          </button>
        </div>
        <button
          className={`fb-mode-btn ${showPreview ? "fb-mode-btn--active" : ""}`}
          onClick={() => setShowPreview(!showPreview)}
          disabled={fields.length === 0}
          title={fields.length === 0 ? "Add fields first" : "Toggle preview"}
        >
          {showPreview ? <EyeOff size={12} /> : <Eye size={12} />}
          Preview
        </button>
      </div>

      {showPreview ? (
        <FormPreview fields={fields} />
      ) : mode === "api" ? (
        <div className="fb-api-section">
          <p className="text-[11px] text-foreground-muted mb-3">
            Provide an API endpoint that returns a <code className="fb-code">ModuleConfigField[]</code> JSON array.
          </p>
          <div className="flex gap-2 mb-2">
            <input
              className="studio-input fb-input flex-1"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://api.example.com/form-schema"
            />
            <button
              className="fb-fetch-btn"
              onClick={handleFetchApi}
              disabled={apiFetching || !apiUrl.trim()}
            >
              {apiFetching ? "Fetching…" : "Fetch"}
            </button>
          </div>
          {apiError && (
            <div className="fb-api-error">{apiError}</div>
          )}
          {fields.length > 0 && (
            <div className="mt-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-foreground-muted mb-2">
                Fetched Fields ({fields.length})
              </div>
              {fields.map((f, i) => (
                <FieldEditor
                  key={f.key}
                  field={f}
                  index={i}
                  total={fields.length}
                  onUpdate={(updated) => handleUpdate(i, updated)}
                  onRemove={() => handleRemove(i)}
                  onMoveUp={() => handleMove(i, i - 1)}
                  onMoveDown={() => handleMove(i, i + 1)}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="fb-custom-section">
          <div className="fb-layout">
            <TypePalette onAdd={handleAddField} />
            <div className="fb-fields-area">
              {fields.length === 0 ? (
                <div className="fb-empty-state">
                  <Plus size={24} className="text-foreground-subtle mb-2" />
                  <p className="text-[12px] text-foreground-muted">
                    Click a field type on the left to add it to your form.
                  </p>
                </div>
              ) : (
                <div className="fb-fields-list">
                  {fields.map((f, i) => (
                    <FieldEditor
                      key={f.key}
                      field={f}
                      index={i}
                      total={fields.length}
                      onUpdate={(updated) => handleUpdate(i, updated)}
                      onRemove={() => handleRemove(i)}
                      onMoveUp={() => handleMove(i, i - 1)}
                      onMoveDown={() => handleMove(i, i + 1)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer summary */}
      <div className="fb-footer">
        <span className="text-[10px] text-foreground-muted">
          {fields.length} field{fields.length !== 1 ? "s" : ""} configured
          {showPreview && " • Preview mode"}
        </span>
      </div>
    </div>
  );
}
