/**
 * NodeRaciSection — RACI persona pickers for a node/activity.
 * Renders inside NodeConfigDialog. Persists into node_instance_configs.personas.
 */
import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

export interface NodeRaci {
  responsible: string[];
  accountable: string | null;
  consulted: string[];
  informed: string[];
}

export const EMPTY_RACI: NodeRaci = { responsible: [], accountable: null, consulted: [], informed: [] };

interface Props {
  workflowId: string;
  value: NodeRaci;
  onChange: (v: NodeRaci) => void;
  disabled?: boolean;
}

export default function NodeRaciSection({ workflowId, value, onChange, disabled }: Props) {
  const [personas, setPersonas] = useState<{ id: string; name: string; role?: string | null }[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("workflow_personas")
        .select("id,name,role")
        .eq("workflow_id", workflowId);
      setPersonas((data ?? []) as { id: string; name: string; role: string | null }[]);
    })();
  }, [workflowId]);

  const toggle = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  const nameOf = (id: string) => personas.find((p) => p.id === id)?.name ?? "Unknown";

  const MultiPicker = ({
    label, hint, selected, onPick,
  }: { label: string; hint: string; selected: string[]; onPick: (id: string) => void }) => (
    <div className="space-y-2">
      <div>
        <Label className="text-xs font-semibold">{label}</Label>
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      </div>
      <Select
        value=""
        onValueChange={(id) => id && onPick(id)}
        disabled={disabled || personas.length === 0}
      >
        <SelectTrigger className="h-8">
          <SelectValue placeholder={personas.length === 0 ? "Define personas first" : "Add persona…"} />
        </SelectTrigger>
        <SelectContent>
          {personas.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}{p.role ? ` · ${p.role}` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex flex-wrap gap-1.5 min-h-[24px]">
        {selected.map((id) => (
          <Badge
            key={id}
            variant="secondary"
            className={disabled ? "" : "cursor-pointer"}
            onClick={() => !disabled && onPick(id)}
            title={disabled ? undefined : "Click to remove"}
          >
            {nameOf(id)}{!disabled && " ×"}
          </Badge>
        ))}
      </div>
    </div>
  );

  return (
    <div className="rounded-md border bg-muted/20 p-3 space-y-4">
      <div>
        <div className="text-sm font-semibold">Personas (RACI)</div>
        <p className="text-xs text-muted-foreground">
          Who is Responsible, Accountable, Consulted, and Informed for this activity.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MultiPicker
          label="Responsible (R)"
          hint="Does the work"
          selected={value.responsible}
          onPick={(id) => onChange({ ...value, responsible: toggle(value.responsible, id) })}
        />
        <div className="space-y-2">
          <div>
            <Label className="text-xs font-semibold">Accountable (A)</Label>
            <p className="text-[11px] text-muted-foreground">Owns the outcome — exactly one</p>
          </div>
          <Select
            value={value.accountable ?? "__none__"}
            onValueChange={(v) => onChange({ ...value, accountable: v === "__none__" ? null : v })}
            disabled={disabled}
          >
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {personas.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <MultiPicker
          label="Consulted (C)"
          hint="Two-way input before/during"
          selected={value.consulted}
          onPick={(id) => onChange({ ...value, consulted: toggle(value.consulted, id) })}
        />
        <MultiPicker
          label="Informed (I)"
          hint="One-way update after"
          selected={value.informed}
          onPick={(id) => onChange({ ...value, informed: toggle(value.informed, id) })}
        />
      </div>
    </div>
  );
}
