/**
 * Shared property editor UI primitives.
 * Used by all PropertiesPanel sub-components.
 */
import React from "react";
import {
  ChevronRight, ChevronDown, Plus, Trash2,
  ArrowRight, Settings2,
} from "lucide-react";
import type { IoParam } from "@/types/caseIr";
import type { PropField } from "../camundaSchema";
import "../../studio/studio.css";

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function deepGet(obj: Record<string, unknown>, key: string): unknown {
  return key.split(".").reduce<unknown>((cur, k) => {
    if (cur && typeof cur === "object") return (cur as Record<string, unknown>)[k];
    return undefined;
  }, obj);
}

export function deepSet(
  obj: Record<string, unknown>,
  key: string,
  value: unknown
): Record<string, unknown> {
  const parts = key.split(".");
  if (parts.length === 1) return { ...obj, [key]: value };
  const [head, ...rest] = parts;
  const child = (obj[head] && typeof obj[head] === "object")
    ? obj[head] as Record<string, unknown>
    : {};
  return { ...obj, [head]: deepSet(child, rest.join("."), value) };
}

// ─── Section Header ───────────────────────────────────────────────────────────

export function SectionHeader({
  title, open, onToggle,
}: {
  title: string; open: boolean; onToggle: () => void;
}) {
  return (
    <button
      className={`section-header-btn w-full flex items-center gap-2 px-4 py-2 border-b text-left transition-colors ${open ? "section-header-btn--open" : "section-header-btn--closed"}`}
      onClick={onToggle}
    >
      <Settings2 size={11} className="text-foreground-muted flex-shrink-0" />
      <span className="flex-1 text-[10px] font-bold uppercase tracking-widest text-foreground-muted">
        {title}
      </span>
      {open
        ? <ChevronDown size={12} className="text-foreground-subtle" />
        : <ChevronRight size={12} className="text-foreground-subtle" />}
    </button>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

export function Field({
  label, hint, children,
}: {
  label: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium text-foreground-muted">{label}</label>
      {children}
      {hint && <p className="text-[10px] leading-relaxed text-foreground-subtle">{hint}</p>}
    </div>
  );
}

// ─── Input primitives ─────────────────────────────────────────────────────────

interface InputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
}

export function TextInput({ value, onChange, placeholder, mono }: InputProps) {
  return (
    <input
      className={`studio-input w-full px-2.5 py-1.5 rounded-md border text-[12px] transition-colors focus:outline-none ${mono ? "studio-input--mono" : ""}`}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

export function MultilineInput({ value, onChange, placeholder, mono }: InputProps) {
  return (
    <textarea
      rows={5}
      className={`studio-input studio-input--multiline w-full px-2.5 py-1.5 rounded-md border text-[12px] transition-colors focus:outline-none resize-y ${mono ? "studio-input--mono" : ""}`}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

export function ExpressionInput({ value, onChange, placeholder }: InputProps) {
  return (
    <div className="relative">
      <span className="expression-prefix absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono select-none">
        fx
      </span>
      <input
        className="studio-input studio-input--mono w-full pl-7 pr-2.5 py-1.5 rounded-md border text-[12px] transition-colors focus:outline-none"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

export function Toggle({
  checked, onChange, label,
}: {
  checked: boolean; onChange: (v: boolean) => void; label: string;
}) {
  return (
    <label className="flex items-center justify-between gap-2 cursor-pointer py-0.5">
      <span className="text-[12px] text-foreground">{label}</span>
      <div
        className={`relative flex-shrink-0 w-8 h-4 rounded-full transition-colors ${checked ? "toggle-track--on" : "toggle-track--off"}`}
        onClick={() => onChange(!checked)}
      >
        <div className={`toggle-thumb absolute top-0.5 w-3 h-3 rounded-full transition-transform ${checked ? "toggle-thumb--checked" : "toggle-thumb--unchecked"}`} />
      </div>
    </label>
  );
}

export function SelectInput({
  value, onChange, options, placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
  placeholder?: string;
}) {
  return (
    <select
      className={`studio-select w-full px-2.5 py-1.5 rounded-md border text-[12px] transition-colors focus:outline-none ${!value ? "studio-select--empty" : ""}`}
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ─── IO Parameter table ───────────────────────────────────────────────────────

export function IoParamTable({
  params, label, accent, onChange,
}: {
  params: IoParam[];
  label: string;
  accent: string;
  onChange: (updated: IoParam[]) => void;
}) {
  const update = (i: number, field: keyof IoParam, val: string) => {
    const next = params.map((p, idx) => idx === i ? { ...p, [field]: val } : p);
    onChange(next);
  };
  const add = () => onChange([...params, { name: "", value: "" }]);
  const remove = (i: number) => onChange(params.filter((_, idx) => idx !== i));

  return (
    <div style={{ "--dynamic-color": accent } as React.CSSProperties}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="io-label text-[10px] font-bold uppercase tracking-widest">{label}</span>
        <button
          className="io-add-btn flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-medium transition-colors"
          onClick={add}
        >
          <Plus size={9} /> Add
        </button>
      </div>
      {params.length === 0 ? (
        <div className="io-empty text-[11px] text-center py-3 rounded-lg border border-dashed">
          No {label.toLowerCase()} — click Add
        </div>
      ) : (
        <div className="space-y-1.5">
          {params.map((p, i) => (
            <div key={i} className="io-param-row flex items-center gap-1.5 rounded-lg p-2">
              <input
                className="io-param-input flex-1 min-w-0 px-2 py-1 rounded text-[11px] font-mono focus:outline-none border"
                value={p.name}
                onChange={e => update(i, "name", e.target.value)}
                placeholder="name"
              />
              <ArrowRight size={9} className="text-foreground-subtle flex-shrink-0" />
              <input
                className="io-param-input flex-1 min-w-0 px-2 py-1 rounded text-[11px] font-mono focus:outline-none border"
                value={p.value}
                onChange={e => update(i, "value", e.target.value)}
                placeholder="${expression}"
              />
              <button
                className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-destructive/20 text-destructive"
                onClick={() => remove(i)}
              >
                <Trash2 size={9} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Dynamic field renderer ───────────────────────────────────────────────────

export function FieldRenderer({
  field, value, onChange,
}: {
  field: PropField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const str = (v: unknown) => (v !== undefined && v !== null ? String(v) : "");

  switch (field.type) {
    case "boolean":
      return (
        <Toggle
          checked={typeof value === "boolean" ? value : (field.default as boolean ?? false)}
          onChange={onChange}
          label=""
        />
      );
    case "select":
      return (
        <SelectInput
          value={str(value) || str(field.default)}
          onChange={onChange}
          options={field.options ?? []}
          placeholder={field.placeholder}
        />
      );
    case "expression":
      return <ExpressionInput value={str(value)} onChange={onChange} placeholder={field.placeholder} />;
    case "multiline":
      return <MultilineInput value={str(value)} onChange={onChange} placeholder={field.placeholder} mono={field.mono} />;
    default:
      return <TextInput value={str(value)} onChange={onChange} placeholder={field.placeholder} mono={field.mono} />;
  }
}
