/**
 * FormBuilderDialog – 3-pane drag/drop form builder popup.
 * Opened when user drops the "Form" node onto a workflow step.
 *
 * Layout:
 *   ┌──────────────────────────────────────────────────────────────────┐
 *   │ [Form name input]                                       [X]      │
 *   ├────────────┬────────────────────────────────┬────────────────────┤
 *   │ Fields     │ Preview / Canvas               │ Properties         │
 *   │ palette    │  (drag fields here, click      │ (edit selected     │
 *   │ (drag)     │   to select)                   │  field)            │
 *   └────────────┴────────────────────────────────┴────────────────────┘
 */
import { useState, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Type, Hash, Mail, Calendar, ListChecks, CircleDot, ToggleLeft,
  AlignLeft, Upload, Link as LinkIcon, ChevronsUpDown, Trash2, GripVertical,
  FormInput, type LucideIcon,
} from "lucide-react";
import type { FormFieldType, ModuleConfigField } from "@/types/caseIr";

interface FieldTypeDef {
  type: FormFieldType;
  label: string;
  icon: LucideIcon;
  defaults?: Partial<ModuleConfigField>;
}

const FIELD_TYPES: FieldTypeDef[] = [
  { type: "string",         label: "Short Text",  icon: Type },
  { type: "multiline",      label: "Long Text",   icon: AlignLeft },
  { type: "number",         label: "Number",      icon: Hash },
  { type: "email",          label: "Email",       icon: Mail },
  { type: "url",            label: "URL",         icon: LinkIcon },
  { type: "date",           label: "Date",        icon: Calendar },
  { type: "select",         label: "Dropdown",    icon: ChevronsUpDown, defaults: { options: ["Option 1", "Option 2"] } },
  { type: "radio",          label: "Radio",       icon: CircleDot,      defaults: { options: ["Option 1", "Option 2"] } },
  { type: "checkbox-group", label: "Checkboxes",  icon: ListChecks,     defaults: { options: ["Option 1", "Option 2"] } },
  { type: "boolean",        label: "Toggle",      icon: ToggleLeft },
  { type: "file",           label: "File Upload", icon: Upload },
];

let fieldCounter = 0;
function makeKey(type: string) {
  fieldCounter += 1;
  return `${type}_${Date.now().toString(36).slice(-4)}${fieldCounter}`;
}

interface FormBuilderDialogProps {
  open: boolean;
  onClose: () => void;
  targetStepName?: string;
  initialName?: string;
  initialFields?: ModuleConfigField[];
  onSave: (formName: string, fields: ModuleConfigField[]) => void;
}

export default function FormBuilderDialog({
  open, onClose, targetStepName, initialName, initialFields, onSave,
}: FormBuilderDialogProps) {
  const [formName, setFormName] = useState(initialName ?? "");
  const [fields, setFields] = useState<ModuleConfigField[]>(initialFields ?? []);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const selected = useMemo(
    () => fields.find(f => f.key === selectedKey) ?? null,
    [fields, selectedKey],
  );

  const addField = (def: FieldTypeDef) => {
    const key = makeKey(def.type);
    const newField: ModuleConfigField = {
      key,
      label: def.label,
      type: def.type,
      required: false,
      ...def.defaults,
    };
    setFields(prev => [...prev, newField]);
    setSelectedKey(key);
  };

  const updateSelected = (patch: Partial<ModuleConfigField>) => {
    if (!selected) return;
    setFields(prev => prev.map(f => f.key === selected.key ? { ...f, ...patch } : f));
  };

  const removeField = (key: string) => {
    setFields(prev => prev.filter(f => f.key !== key));
    if (selectedKey === key) setSelectedKey(null);
  };

  const handleSave = () => {
    if (!formName.trim() || fields.length === 0) return;
    onSave(formName.trim(), fields);
    setFormName(""); setFields([]); setSelectedKey(null);
  };

  const handleClose = () => {
    setFormName(""); setFields([]); setSelectedKey(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-[1100px] w-[95vw] h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 py-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-base">
            <FormInput size={16} className="text-primary" />
            Form Builder
            {targetStepName && (
              <span className="text-xs font-normal text-muted-foreground">
                → attaching to <span className="font-medium text-foreground">{targetStepName}</span>
              </span>
            )}
          </DialogTitle>
          <div className="pt-2">
            <Input
              placeholder="Form name (e.g. Customer Onboarding)"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="h-9"
            />
          </div>
        </DialogHeader>

        {/* 3-pane body */}
        <div className="flex-1 grid grid-cols-[220px_1fr_280px] min-h-0">
          {/* LEFT — Field palette */}
          <div className="border-r overflow-y-auto p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Fields
            </div>
            <div className="space-y-1.5">
              {FIELD_TYPES.map(def => {
                const Icon = def.icon;
                return (
                  <button
                    key={def.type}
                    type="button"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/x-form-field", def.type);
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    onClick={() => addField(def)}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md border border-border hover:border-primary hover:bg-accent/30 transition-colors cursor-grab active:cursor-grabbing text-left"
                  >
                    <GripVertical size={10} className="text-muted-foreground opacity-50" />
                    <Icon size={14} className="text-primary" />
                    <span className="text-xs font-medium">{def.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* MIDDLE — Canvas / Preview */}
          <div
            className="overflow-y-auto p-5 bg-muted/20"
            onDragOver={(e) => {
              if (e.dataTransfer.types.includes("application/x-form-field")) {
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
              }
            }}
            onDrop={(e) => {
              const t = e.dataTransfer.getData("application/x-form-field") as FormFieldType;
              if (!t) return;
              const def = FIELD_TYPES.find(f => f.type === t);
              if (def) addField(def);
            }}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Preview
            </div>
            {fields.length === 0 ? (
              <div className="border-2 border-dashed border-border rounded-lg py-16 text-center text-sm text-muted-foreground">
                Drag fields from the left, or click them to add.
              </div>
            ) : (
              <div className="space-y-3 max-w-md mx-auto">
                {fields.map(f => (
                  <FieldPreview
                    key={f.key}
                    field={f}
                    selected={f.key === selectedKey}
                    onSelect={() => setSelectedKey(f.key)}
                    onRemove={() => removeField(f.key)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* RIGHT — Properties */}
          <div className="border-l overflow-y-auto p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Properties
            </div>
            {!selected ? (
              <p className="text-xs text-muted-foreground italic">
                Select a field to edit its properties.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Label</Label>
                  <Input
                    value={selected.label}
                    onChange={(e) => updateSelected({ label: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Field key</Label>
                  <Input
                    value={selected.key}
                    onChange={(e) => {
                      const newKey = e.target.value.replace(/\s+/g, "_");
                      setFields(prev => prev.map(f => f.key === selected.key ? { ...f, key: newKey } : f));
                      setSelectedKey(newKey);
                    }}
                    className="h-8 text-sm font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Type</Label>
                  <Select
                    value={selected.type}
                    onValueChange={(v) => {
                      const def = FIELD_TYPES.find(d => d.type === v);
                      updateSelected({ type: v as FormFieldType, ...(def?.defaults ?? {}) });
                    }}
                  >
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FIELD_TYPES.map(d => (
                        <SelectItem key={d.type} value={d.type}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Hint / placeholder</Label>
                  <Input
                    value={selected.hint ?? ""}
                    onChange={(e) => updateSelected({ hint: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Default value</Label>
                  <Input
                    value={selected.defaultValue ?? ""}
                    onChange={(e) => updateSelected({ defaultValue: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
                {(selected.type === "select" || selected.type === "radio" || selected.type === "checkbox-group") && (
                  <div className="space-y-1">
                    <Label className="text-xs">Options (one per line)</Label>
                    <Textarea
                      value={(selected.options ?? []).join("\n")}
                      onChange={(e) => updateSelected({ options: e.target.value.split("\n").filter(Boolean) })}
                      rows={4}
                      className="text-sm"
                    />
                  </div>
                )}
                <label className="flex items-center gap-2 pt-1">
                  <Checkbox
                    checked={selected.required}
                    onCheckedChange={(v) => updateSelected({ required: !!v })}
                  />
                  <span className="text-xs">Required</span>
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-destructive hover:text-destructive"
                  onClick={() => removeField(selected.key)}
                >
                  <Trash2 size={12} className="mr-1.5" /> Delete field
                </Button>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="px-5 py-3 border-t">
          <Button variant="outline" size="sm" onClick={handleClose}>Cancel</Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!formName.trim() || fields.length === 0}
          >
            <FormInput size={13} className="mr-1.5" />
            Save Form ({fields.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Field preview renderer ───────────────────────────────────────────────────

function FieldPreview({ field, selected, onSelect, onRemove }: {
  field: ModuleConfigField; selected: boolean; onSelect: () => void; onRemove: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`group relative rounded-lg border bg-background p-3 cursor-pointer transition-all ${
        selected ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <Label className="text-xs font-medium">
          {field.label}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </Label>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
        >
          <Trash2 size={11} />
        </button>
      </div>
      <RenderInput field={field} />
      {field.hint && <p className="text-[10px] text-muted-foreground mt-1">{field.hint}</p>}
    </div>
  );
}

function RenderInput({ field }: { field: ModuleConfigField }) {
  switch (field.type) {
    case "multiline":
      return <Textarea disabled placeholder={field.hint} rows={3} className="text-sm" />;
    case "number":
      return <Input disabled type="number" placeholder={field.hint} className="h-8 text-sm" />;
    case "email":
      return <Input disabled type="email" placeholder={field.hint ?? "name@example.com"} className="h-8 text-sm" />;
    case "url":
      return <Input disabled type="url" placeholder={field.hint ?? "https://"} className="h-8 text-sm" />;
    case "date":
      return <Input disabled type="date" className="h-8 text-sm" />;
    case "select":
      return (
        <Select disabled>
          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder={field.hint ?? "Select..."} /></SelectTrigger>
        </Select>
      );
    case "radio":
      return (
        <div className="space-y-1">
          {(field.options ?? []).map(o => (
            <label key={o} className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="radio" disabled /> {o}
            </label>
          ))}
        </div>
      );
    case "checkbox-group":
      return (
        <div className="space-y-1">
          {(field.options ?? []).map(o => (
            <label key={o} className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" disabled /> {o}
            </label>
          ))}
        </div>
      );
    case "boolean":
      return (
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" disabled /> Yes / No
        </label>
      );
    case "file":
      return <Input disabled type="file" className="h-8 text-sm" />;
    default:
      return <Input disabled placeholder={field.hint} className="h-8 text-sm" />;
  }
}
