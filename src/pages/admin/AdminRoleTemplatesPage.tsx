/**
 * AdminRoleTemplatesPage — super-admin CRUD of global workflow role templates.
 * Workflow admins can clone these per-workflow.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Perm { key: string; label: string; description: string | null; category: string }
interface Template {
  id: string;
  key: string;
  name: string;
  description: string | null;
  permissions: string[];
  is_builtin: boolean;
}

export default function AdminRoleTemplatesPage() {
  const [catalog, setCatalog] = useState<Perm[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [editing, setEditing] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [c, t] = await Promise.all([
      supabase.from("workflow_permission_catalog").select("*").order("sort_order"),
      supabase.from("workflow_role_templates").select("*").order("is_builtin", { ascending: false }).order("name"),
    ]);
    setCatalog((c.data ?? []) as unknown as Perm[]);
    setTemplates(((t.data ?? []) as unknown as Template[]).map((r) => ({
      ...r, permissions: Array.isArray(r.permissions) ? r.permissions : [],
    })));
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const startNew = () => setEditing({
    id: "", key: "", name: "", description: "", permissions: [], is_builtin: false,
  });

  const save = async () => {
    if (!editing) return;
    const payload = {
      key: editing.key.trim() || editing.name.trim().toLowerCase().replace(/\s+/g, "_"),
      name: editing.name,
      description: editing.description,
      permissions: editing.permissions as unknown as Record<string, unknown>,
    };
    const { error } = editing.id
      ? await supabase.from("workflow_role_templates").update(payload as never).eq("id", editing.id)
      : await supabase.from("workflow_role_templates").insert(payload as never);
    if (error) { toast.error(error.message); return; }
    toast.success("Template saved");
    setEditing(null);
    await load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    const { error } = await supabase.from("workflow_role_templates").delete().eq("id", id);
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

  if (loading) return <div className="p-4 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Workflow role templates</h2>
          <p className="text-xs text-muted-foreground">
            Reusable role presets that workflow admins can assign or clone per workflow.
          </p>
        </div>
        <Button size="sm" onClick={startNew}><Plus className="h-3 w-3 mr-1" /> New template</Button>
      </div>

      <ul className="divide-y rounded border">
        {templates.map((t) => (
          <li key={t.id} className="flex items-center px-3 py-2 gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium">{t.name}</span>
                <code className="text-[10px] text-muted-foreground">{t.key}</code>
                {t.is_builtin && <Badge variant="outline" className="text-[10px]"><Lock size={9} className="mr-0.5" /> built-in</Badge>}
              </div>
              {t.description && <div className="text-[11px] text-muted-foreground">{t.description}</div>}
            </div>
            <Badge variant="secondary" className="text-[10px]">{t.permissions.length} perms</Badge>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditing(t)}>Edit</Button>
            {!t.is_builtin && (
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(t.id)}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            )}
          </li>
        ))}
      </ul>

      {editing && (
        <div className="rounded-lg border p-4 space-y-3 bg-background">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Name</Label>
              <Input className="h-8 text-xs" value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Key (slug)</Label>
              <Input className="h-8 text-xs" value={editing.key} disabled={editing.is_builtin}
                onChange={(e) => setEditing({ ...editing, key: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Input className="h-8 text-xs" value={editing.description ?? ""}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            </div>
          </div>

          <div>
            <Label className="text-xs">Permissions</Label>
            <div className="mt-1 space-y-3 rounded border p-2 max-h-80 overflow-auto">
              {Array.from(byCategory.entries()).map(([cat, perms]) => (
                <div key={cat}>
                  <div className="text-[10px] uppercase text-muted-foreground mb-1">{cat}</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                    {perms.map((p) => {
                      const checked = editing.permissions.includes(p.key);
                      return (
                        <label key={p.key} className="flex items-start gap-2 text-xs cursor-pointer">
                          <Checkbox checked={checked}
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
            <Button size="sm" onClick={save}>Save</Button>
          </div>
        </div>
      )}
    </div>
  );
}
