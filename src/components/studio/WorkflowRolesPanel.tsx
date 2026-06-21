/**
 * WorkflowRolesPanel — per-workflow custom roles CRUD.
 * Rendered as a sub-tab of the Members panel for workflow admins.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Perm { key: string; label: string; description: string | null; category: string }
interface Template { id: string; key: string; name: string; permissions: string[] }
interface CustomRole {
  id: string;
  workflow_id: string;
  name: string;
  description: string | null;
  template_id: string | null;
  permissions: string[];
}

interface Props { workflowId: string; canManage: boolean }

export default function WorkflowRolesPanel({ workflowId, canManage }: Props) {
  const [catalog, setCatalog] = useState<Perm[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [editing, setEditing] = useState<CustomRole | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [c, t, r] = await Promise.all([
      supabase.from("workflow_permission_catalog").select("*").order("sort_order"),
      supabase.from("workflow_role_templates").select("*"),
      supabase.from("workflow_custom_roles").select("*").eq("workflow_id", workflowId),
    ]);
    setCatalog((c.data ?? []) as unknown as Perm[]);
    setTemplates(((t.data ?? []) as unknown as Template[]).map((row) => ({
      ...row,
      permissions: Array.isArray(row.permissions) ? row.permissions : [],
    })));
    setRoles(((r.data ?? []) as unknown as CustomRole[]).map((row) => ({
      ...row,
      permissions: Array.isArray(row.permissions) ? row.permissions : [],
    })));
    setLoading(false);
  }, [workflowId]);

  useEffect(() => { void load(); }, [load]);

  const startBlank = () => setEditing({
    id: "", workflow_id: workflowId, name: "New role", description: "",
    template_id: null, permissions: [],
  });
  const cloneTemplate = (t: Template) => setEditing({
    id: "", workflow_id: workflowId, name: `${t.name} (custom)`, description: null,
    template_id: t.id, permissions: [...t.permissions],
  });

  const save = async () => {
    if (!editing) return;
    const payload = {
      workflow_id: editing.workflow_id,
      name: editing.name.trim(),
      description: editing.description,
      template_id: editing.template_id,
      permissions: editing.permissions as unknown as Record<string, unknown>,
    };
    const { error } = editing.id
      ? await supabase.from("workflow_custom_roles").update(payload as never).eq("id", editing.id)
      : await supabase.from("workflow_custom_roles").insert(payload as never);
    if (error) { toast.error(error.message); return; }
    toast.success("Role saved");
    setEditing(null);
    await load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this role? Members assigned to it will fall back to their template.")) return;
    const { error } = await supabase.from("workflow_custom_roles").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    await load();
  };

  const byCategory = useMemo(() => {
    const out = new Map<string, Perm[]>();
    catalog.forEach((p) => {
      if (!out.has(p.category)) out.set(p.category, []);
      out.get(p.category)!.push(p);
    });
    return out;
  }, [catalog]);

  if (loading) return <div className="text-sm text-muted-foreground p-2">Loading…</div>;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Global role templates</h3>
        </div>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {templates.map((t) => (
            <li key={t.id} className="rounded border p-2 flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{t.name}</div>
                <div className="text-[11px] text-muted-foreground">
                  {t.permissions.length} permissions
                </div>
              </div>
              {canManage && (
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => cloneTemplate(t)}>
                  <Copy className="h-3 w-3 mr-1" /> Clone & customize
                </Button>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Custom roles for this workflow</h3>
          {canManage && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={startBlank}>
              <Plus className="h-3 w-3 mr-1" /> New role
            </Button>
          )}
        </div>
        {roles.length === 0 && (
          <p className="text-xs text-muted-foreground italic">No custom roles yet.</p>
        )}
        <ul className="divide-y rounded border">
          {roles.map((r) => (
            <li key={r.id} className="flex items-center px-3 py-2 text-sm gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-medium">{r.name}</div>
                {r.description && <div className="text-[11px] text-muted-foreground">{r.description}</div>}
              </div>
              <Badge variant="outline" className="text-[10px]">{r.permissions.length} perms</Badge>
              {canManage && (
                <>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditing(r)}>Edit</Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(r.id)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>

      {editing && (
        <div className="rounded-lg border p-4 space-y-3 bg-background">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Name</Label>
              <Input className="h-8 text-xs" value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">Description</Label>
              <Input className="h-8 text-xs" value={editing.description ?? ""}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            </div>
            <div className="md:col-span-3">
              <Label className="text-xs">Cloned from (optional)</Label>
              <Select
                value={editing.template_id ?? "__none__"}
                onValueChange={(v) => setEditing({ ...editing, template_id: v === "__none__" ? null : v })}
              >
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">Permissions</Label>
            <div className="mt-1 space-y-3 rounded border p-2 max-h-72 overflow-auto">
              {Array.from(byCategory.entries()).map(([cat, perms]) => (
                <div key={cat}>
                  <div className="text-[10px] uppercase text-muted-foreground mb-1">{cat}</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                    {perms.map((p) => {
                      const checked = editing.permissions.includes(p.key);
                      return (
                        <label key={p.key} className="flex items-start gap-2 text-xs cursor-pointer">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) => setEditing({
                              ...editing,
                              permissions: v
                                ? [...editing.permissions, p.key]
                                : editing.permissions.filter((x) => x !== p.key),
                            })}
                          />
                          <div>
                            <div className="font-medium">{p.label}</div>
                            <div className="text-[10px] text-muted-foreground">{p.description}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button size="sm" onClick={save}>Save role</Button>
          </div>
        </div>
      )}
    </div>
  );
}
