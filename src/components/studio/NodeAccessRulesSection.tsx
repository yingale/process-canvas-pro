/**
 * NodeAccessRulesSection — list/CRUD ABAC access rules for a single node.
 * Renders inside NodeConfigDialog.
 */
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, ShieldCheck, ShieldX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import RuleBuilder from "@/components/abac/RuleBuilder";
import type { AbacExpression } from "@/lib/abac/types";
import { toast } from "sonner";

interface Rule {
  id: string;
  workflow_id: string;
  step_id: string;
  name: string;
  effect: "allow" | "deny";
  action: "view" | "edit" | "execute" | "approve";
  expression: AbacExpression;
  priority: number;
  enabled: boolean;
}

interface Props {
  workflowId: string;
  stepId: string;
  disabled?: boolean;
}

export default function NodeAccessRulesSection({ workflowId, stepId, disabled }: Props) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [editing, setEditing] = useState<Rule | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("node_access_rules")
      .select("*")
      .eq("workflow_id", workflowId)
      .eq("step_id", stepId)
      .order("priority", { ascending: true });
    setRules((data ?? []) as unknown as Rule[]);
    setLoading(false);
  }, [workflowId, stepId]);

  useEffect(() => { void load(); }, [load]);

  const startNew = () => setEditing({
    id: "",
    workflow_id: workflowId,
    step_id: stepId,
    name: "New rule",
    effect: "deny",
    action: "edit",
    expression: { all: [] },
    priority: 100,
    enabled: true,
  });

  const save = useCallback(async () => {
    if (!editing) return;
    const payload = {
      workflow_id: editing.workflow_id,
      step_id: editing.step_id,
      name: editing.name,
      effect: editing.effect,
      action: editing.action,
      expression: editing.expression as unknown as Record<string, unknown>,
      priority: editing.priority,
      enabled: editing.enabled,
    };
    if (editing.id) {
      const { error } = await supabase.from("node_access_rules").update(payload as never).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from("node_access_rules").insert(payload as never);
      if (error) { toast.error(error.message); return; }
    }
    toast.success("Rule saved");
    setEditing(null);
    await load();
  }, [editing, load]);

  const remove = useCallback(async (id: string) => {
    if (!confirm("Delete this rule?")) return;
    const { error } = await supabase.from("node_access_rules").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    await load();
  }, [load]);

  const toggle = async (r: Rule) => {
    await supabase.from("node_access_rules").update({ enabled: !r.enabled } as never).eq("id", r.id);
    await load();
  };

  if (loading) return <div className="text-xs text-muted-foreground p-2">Loading rules…</div>;

  return (
    <div className="rounded-md border bg-muted/20 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Access Rules (ABAC)</div>
          <p className="text-xs text-muted-foreground">
            Rules are evaluated in priority order; first match wins. Default = allow.
          </p>
        </div>
        {!disabled && (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={startNew}>
            <Plus className="h-3 w-3 mr-1" /> Add rule
          </Button>
        )}
      </div>

      {rules.length === 0 && !editing && (
        <p className="text-xs text-muted-foreground italic">No rules — anyone with workflow access can use this node.</p>
      )}

      <ul className="space-y-1.5">
        {rules.map((r) => (
          <li key={r.id} className="flex items-center gap-2 rounded border bg-background px-2 py-1.5 text-xs">
            {r.effect === "allow"
              ? <ShieldCheck size={14} className="text-success" />
              : <ShieldX size={14} className="text-destructive" />}
            <Badge variant={r.effect === "allow" ? "default" : "destructive"} className="text-[10px]">
              {r.effect.toUpperCase()}
            </Badge>
            <Badge variant="outline" className="text-[10px]">{r.action}</Badge>
            <span className="font-medium flex-1 truncate">{r.name}</span>
            <span className="text-[10px] text-muted-foreground">p{r.priority}</span>
            {!disabled && (
              <>
                <Switch checked={r.enabled} onCheckedChange={() => toggle(r)} />
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(r)}>✎</Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(r.id)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </>
            )}
          </li>
        ))}
      </ul>

      {editing && (
        <div className="rounded-md border bg-background p-3 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <div className="md:col-span-2">
              <Label className="text-xs">Name</Label>
              <Input className="h-8 text-xs" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Effect</Label>
              <Select value={editing.effect} onValueChange={(v) => setEditing({ ...editing, effect: v as Rule["effect"] })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="allow">Allow</SelectItem>
                  <SelectItem value="deny">Deny</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Action</Label>
              <Select value={editing.action} onValueChange={(v) => setEditing({ ...editing, action: v as Rule["action"] })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">View</SelectItem>
                  <SelectItem value="edit">Edit</SelectItem>
                  <SelectItem value="execute">Execute</SelectItem>
                  <SelectItem value="approve">Approve</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Priority</Label>
              <Input
                type="number" className="h-8 text-xs"
                value={editing.priority}
                onChange={(e) => setEditing({ ...editing, priority: Number(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">When this condition matches:</Label>
            <RuleBuilder value={editing.expression} onChange={(v) => setEditing({ ...editing, expression: v })} />
          </div>

          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button size="sm" onClick={save}>Save rule</Button>
          </div>
        </div>
      )}
    </div>
  );
}
