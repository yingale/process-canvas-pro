/**
 * FormPreview – Renders a live preview of configured form fields
 * as they would appear to end users.
 */
import type { ModuleConfigField } from "@/types/caseIr";
import { useState } from "react";
import { Star } from "lucide-react";
import "./studio.css";

interface FormPreviewProps {
  fields: ModuleConfigField[];
}

export default function FormPreview({ fields }: FormPreviewProps) {
  const [values, setValues] = useState<Record<string, unknown>>({});

  if (fields.length === 0) {
    return (
      <div className="fp-empty">
        <p className="text-[12px] text-foreground-muted">No fields to preview. Add fields in the builder first.</p>
      </div>
    );
  }

  const grouped = groupFields(fields);
  const update = (key: string, val: unknown) => setValues(prev => ({ ...prev, [key]: val }));

  return (
    <div className="fp-container">
      <div className="fp-form">
        {grouped.map(({ group, fields: gFields }) => (
          <fieldset key={group} className="fp-group">
            {group !== "__ungrouped" && <legend className="fp-group-legend">{group}</legend>}
            {gFields.map(field => (
              <div key={field.key} className="fp-field">
                <label className="fp-field-label">
                  {field.label || field.key}
                  {field.required && <span className="fp-required">*</span>}
                </label>
                {field.hint && <p className="fp-hint">{field.hint}</p>}
                <FieldRenderer field={field} value={values[field.key]} onChange={v => update(field.key, v)} />
              </div>
            ))}
          </fieldset>
        ))}
        <div className="fp-actions">
          <button className="fp-submit-btn" type="button" onClick={() => setValues({})}>
            Reset
          </button>
          <button className="fp-submit-btn fp-submit-btn--primary" type="button">
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}

function groupFields(fields: ModuleConfigField[]) {
  const map = new Map<string, ModuleConfigField[]>();
  for (const f of fields) {
    const g = f.group || "__ungrouped";
    if (!map.has(g)) map.set(g, []);
    map.get(g)!.push(f);
  }
  return Array.from(map.entries()).map(([group, fields]) => ({ group, fields }));
}

function FieldRenderer({ field, value, onChange }: { field: ModuleConfigField; value: unknown; onChange: (v: unknown) => void }) {
  const strVal = (value as string) ?? field.defaultValue ?? "";
  const numVal = (value as number) ?? (field.defaultValue ? Number(field.defaultValue) : undefined);

  switch (field.type) {
    case "string":
    case "email":
    case "url":
    case "password":
      return (
        <input
          className="fp-input"
          type={field.type === "string" ? "text" : field.type}
          value={strVal}
          onChange={e => onChange(e.target.value)}
          placeholder={field.label || field.key}
        />
      );

    case "number":
      return (
        <input
          className="fp-input"
          type="number"
          value={numVal ?? ""}
          min={field.min}
          max={field.max}
          onChange={e => onChange(e.target.value ? Number(e.target.value) : undefined)}
          placeholder={field.label || field.key}
        />
      );

    case "multiline":
    case "richtext":
      return (
        <textarea
          className="fp-textarea"
          value={strVal}
          onChange={e => onChange(e.target.value)}
          placeholder={field.label || field.key}
          rows={3}
        />
      );

    case "boolean":
      return (
        <label className="fp-toggle">
          <input
            type="checkbox"
            checked={value === true || value === "true" || (value === undefined && field.defaultValue === "true")}
            onChange={e => onChange(e.target.checked)}
          />
          <span className="fp-toggle-label">{(value === true || value === "true") ? "Yes" : "No"}</span>
        </label>
      );

    case "select":
      return (
        <select className="fp-select" value={strVal} onChange={e => onChange(e.target.value)}>
          <option value="">— Select —</option>
          {(field.options ?? []).map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );

    case "radio":
      return (
        <div className="fp-radio-group">
          {(field.options ?? []).map(opt => (
            <label key={opt} className="fp-radio">
              <input type="radio" name={field.key} value={opt} checked={strVal === opt} onChange={() => onChange(opt)} />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      );

    case "checkbox-group":
      const checked = Array.isArray(value) ? value as string[] : [];
      return (
        <div className="fp-checkbox-group">
          {(field.options ?? []).map(opt => (
            <label key={opt} className="fp-checkbox">
              <input
                type="checkbox"
                checked={checked.includes(opt)}
                onChange={e => {
                  onChange(e.target.checked ? [...checked, opt] : checked.filter(v => v !== opt));
                }}
              />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      );

    case "date":
      return (
        <input className="fp-input" type="date" value={strVal} onChange={e => onChange(e.target.value)} />
      );

    case "file":
      return (
        <input className="fp-input fp-file-input" type="file" accept={field.accept} />
      );

    case "color":
      return (
        <div className="fp-color-row">
          <input type="color" value={strVal || "#000000"} onChange={e => onChange(e.target.value)} className="fp-color-picker" />
          <span className="text-[11px] text-foreground-muted font-mono">{strVal || "#000000"}</span>
        </div>
      );

    case "slider":
      return (
        <div className="fp-slider-row">
          <input
            type="range"
            className="fp-slider"
            min={field.min ?? 0}
            max={field.max ?? 100}
            step={field.step ?? 1}
            value={numVal ?? field.min ?? 0}
            onChange={e => onChange(Number(e.target.value))}
          />
          <span className="fp-slider-val">{numVal ?? field.min ?? 0}</span>
        </div>
      );

    case "rating":
      const ratingVal = (numVal ?? 0) as number;
      const max = field.max ?? 5;
      return (
        <div className="fp-rating">
          {Array.from({ length: max }, (_, i) => (
            <button
              key={i}
              type="button"
              className={`fp-star ${i < ratingVal ? "fp-star--filled" : ""}`}
              onClick={() => onChange(i + 1)}
            >
              <Star size={18} />
            </button>
          ))}
        </div>
      );

    case "repeatable":
      return (
        <div className="fp-repeatable-placeholder">
          <span className="text-[11px] text-foreground-muted italic">Repeatable group preview not yet supported</span>
        </div>
      );

    default:
      return <input className="fp-input" type="text" value={strVal} onChange={e => onChange(e.target.value)} />;
  }
}
