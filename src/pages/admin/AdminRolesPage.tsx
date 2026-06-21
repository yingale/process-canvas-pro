import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { recordAudit } from "@/lib/authz/audit";
import { CATALOG_BY_GROUP } from "@/lib/authz/permissionCatalog";

interface Role { id: string; name: string; description: string | null; is_system: boolean; }
interface Permission { id: string; key: string; }

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [perms, setPerms] = useState<Permission[]>([]);
  const [rp, setRp] = useState<Map<string, Set<string>>>(new Map()); // role_id -> Set<permission key>
  const [name, setName] = useState(""); const [desc, setDesc] = useState("");
  const [editing, setEditing] = useState<Role | null>(null);
  const [selKeys, setSelKeys] = useState<Set<string>>(new Set());

  const load = async () => {
    const [{ data: r }, { data: p }, { data: m }] = await Promise.all([
      supabase.from("roles").select("id,name,description,is_system").order("name"),
      supabase.from("permissions").select("id,key"),
      supabase.from("role_permissions").select("role_id,permissions(key)"),
    ]);
    setRoles((r ?? []) as Role[]);
    setPerms((p ?? []) as Permission[]);
    const map = new Map<string, Set<string>>();
    (m ?? []).forEach((x) => {
      const key = (x as { permissions: { key: string } | null }).permissions?.key;
      if (!key) return;
      if (!map.has(x.role_id)) map.set(x.role_id, new Set());
      map.get(x.role_id)!.add(key);
    });
    setRp(map);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!name.trim()) return;
    const { error, data } = await supabase.from("roles").insert({ name: name.trim(), description: desc.trim() || null }).select().single();
    if (error) { toast.error(error.message); return; }
    await recordAudit({ action: "role.create", decision: "ALLOW", resource_type: "role", resource_id: data?.id });
    setName(""); setDesc(""); load();
  };
  const del = async (r: Role) => {
    if (r.is_system) { toast.error("System roles cannot be deleted"); return; }
    if (!confirm(`Delete role "${r.name}"?`)) return;
    const { error } = await supabase.from("roles").delete().eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    await recordAudit({ action: "role.delete", decision: "ALLOW", resource_type: "role", resource_id: r.id });
    load();
  };
  const openEdit = (r: Role) => { setSelKeys(new Set(rp.get(r.id) ?? [])); setEditing(r); };

  const save = async () => {
    if (!editing) return;
    const keyToId = new Map(perms.map(p => [p.key, p.id]));
    const cur = rp.get(editing.id) ?? new Set<string>();
    const addKeys = [...selKeys].filter(k => !cur.has(k));
    const delKeys = [...cur].filter(k => !selKeys.has(k));
    const ops: Promise<unknown>[] = [];
    if (addKeys.length) {
      const rows = addKeys.map(k => keyToId.get(k)).filter((x): x is string => !!x).map(permission_id => ({ role_id: editing.id, permission_id }));
      if (rows.length) ops.push(supabase.from("role_permissions").insert(rows));
    }
    if (delKeys.length) {
      const ids = delKeys.map(k => keyToId.get(k)).filter((x): x is string => !!x);
      if (ids.length) ops.push(supabase.from("role_permissions").delete().eq("role_id", editing.id).in("permission_id", ids));
    }
    await Promise.all(ops);
    await recordAudit({ action: "role.update", decision: "ALLOW", resource_type: "role", resource_id: editing.id, metadata: { added: addKeys, removed: delKeys } });
    toast.success("Role updated");
    setEditing(null); load();
  };

  return (
    <div>
      <h2 className="text-base font-semibold mb-3">Roles</h2>
      <div className="flex gap-2 mb-4 p-3 rounded-lg border bg-muted/30">
        <Input placeholder="Role name" value={name} onChange={e => setName(e.target.value)} className="max-w-xs" />
        <Input placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} />
        <Button onClick={add}><Plus size={14} /> Add</Button>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Description</TableHead><TableHead>Permissions</TableHead><TableHead className="w-[140px]"></TableHead></TableRow></TableHeader>
        <TableBody>
          {roles.map(r => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">{r.name} {r.is_system && <Badge variant="outline" className="ml-1 text-[9px]">system</Badge>}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{r.description ?? "—"}</TableCell>
              <TableCell className="text-xs">{rp.get(r.id)?.size ?? 0}</TableCell>
              <TableCell className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => openEdit(r)}>Permissions</Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => del(r)} disabled={r.is_system}><Trash2 size={13} className="text-destructive" /></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing?.name} — Permissions</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-auto pr-2">
            {Object.entries(CATALOG_BY_GROUP).map(([group, entries]) => (
              <div key={group}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{group}</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {entries.map(e => (
                    <label key={e.key} className="flex items-center gap-2 text-xs">
                      <Checkbox checked={selKeys.has(e.key)} onCheckedChange={(c) => {
                        const s = new Set(selKeys); if (c) s.add(e.key); else s.delete(e.key); setSelKeys(s);
                      }} />
                      <code className="text-[10px]">{e.key}</code>
                    </label>
                  ))}
                </div>
              </div>
            ))}
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
