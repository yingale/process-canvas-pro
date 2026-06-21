import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { recordAudit } from "@/lib/authz/audit";

interface Policy {
  id: string; name: string; effect: "ALLOW" | "DENY"; action: string;
  resource_pattern: string | null; condition: Record<string, unknown>; priority: number; enabled: boolean;
}

const BLANK: Omit<Policy, "id"> = {
  name: "", effect: "DENY", action: "workflow.deploy.prod",
  resource_pattern: null, condition: {}, priority: 100, enabled: true,
};

export default function AdminPoliciesPage() {
  const [rows, setRows] = useState<Policy[]>([]);
  const [editing, setEditing] = useState<Partial<Policy> | null>(null);
  const [conditionText, setConditionText] = useState("{}");

  const load = async () => {
    const { data } = await supabase.from("policies").select("*").order("priority");
    setRows((data ?? []) as Policy[]);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing({ ...BLANK }); setConditionText("{}"); };
  const openEdit = (p: Policy) => { setEditing(p); setConditionText(JSON.stringify(p.condition, null, 2)); };

  const save = async () => {
    if (!editing) return;
    if (!editing.name?.trim() || !editing.action?.trim()) { toast.error("Name and action required"); return; }
    let cond: Record<string, unknown> = {};
    try { cond = conditionText.trim() ? JSON.parse(conditionText) : {}; } catch { toast.error("Invalid condition JSON"); return; }

    const payload = {
      name: editing.name.trim(),
      effect: editing.effect ?? "DENY",
      action: editing.action.trim(),
      resource_pattern: editing.resource_pattern?.trim() || null,
      condition: cond,
      priority: editing.priority ?? 100,
      enabled: editing.enabled ?? true,
    };

    if (editing.id) {
      const { error } = await supabase.from("policies").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      await recordAudit({ action: "policy.update", decision: "ALLOW", resource_type: "policy", resource_id: editing.id });
    } else {
      const { data, error } = await supabase.from("policies").insert(payload).select().single();
      if (error) { toast.error(error.message); return; }
      await recordAudit({ action: "policy.create", decision: "ALLOW", resource_type: "policy", resource_id: data?.id });
    }
    toast.success("Policy saved");
    setEditing(null); load();
  };

  const del = async (p: Policy) => {
    if (!confirm(`Delete policy "${p.name}"?`)) return;
    const { error } = await supabase.from("policies").delete().eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    await recordAudit({ action: "policy.delete", decision: "ALLOW", resource_type: "policy", resource_id: p.id });
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold">Policies</h2>
        <Button size="sm" onClick={openNew}><Plus size={14} /> New policy</Button>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Evaluation order: <strong>DENY first</strong> → ALLOW → role permissions → default deny. Lower priority evaluated first.
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead><TableHead>Effect</TableHead><TableHead>Action</TableHead>
            <TableHead>Priority</TableHead><TableHead>Enabled</TableHead><TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground text-sm py-8">No policies yet</TableCell></TableRow>
          ) : rows.map(p => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">{p.name}</TableCell>
              <TableCell><Badge variant={p.effect === "DENY" ? "destructive" : "secondary"}>{p.effect}</Badge></TableCell>
              <TableCell className="text-xs"><code>{p.action}</code></TableCell>
              <TableCell>{p.priority}</TableCell>
              <TableCell>{p.enabled ? "✓" : "—"}</TableCell>
              <TableCell className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => openEdit(p)}>Edit</Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => del(p)}><Trash2 size={13} className="text-destructive" /></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit policy" : "New policy"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={editing?.name ?? ""} onChange={e => setEditing({ ...editing, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Effect</Label>
                <Select value={editing?.effect} onValueChange={(v) => setEditing({ ...editing, effect: v as "ALLOW" | "DENY" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DENY">DENY</SelectItem>
                    <SelectItem value="ALLOW">ALLOW</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Priority (lower first)</Label><Input type="number" value={editing?.priority ?? 100} onChange={e => setEditing({ ...editing, priority: Number(e.target.value) })} /></div>
            </div>
            <div><Label>Action (supports wildcard like workflow.*)</Label><Input value={editing?.action ?? ""} onChange={e => setEditing({ ...editing, action: e.target.value })} /></div>
            <div><Label>Resource pattern (optional)</Label><Input value={editing?.resource_pattern ?? ""} onChange={e => setEditing({ ...editing, resource_pattern: e.target.value })} /></div>
            <div>
              <Label>Condition (JSON-AST)</Label>
              <Textarea rows={6} className="font-mono text-xs" value={conditionText} onChange={e => setConditionText(e.target.value)} />
              <p className="text-[10px] text-muted-foreground mt-1">
                Example: <code>{`{"==":["user.attributes.employmentType","Contractor"]}`}</code>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={editing?.enabled ?? true} onCheckedChange={(c) => setEditing({ ...editing, enabled: c })} />
              <Label>Enabled</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
