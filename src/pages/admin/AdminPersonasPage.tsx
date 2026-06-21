import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Trash2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { recordAudit } from "@/lib/authz/audit";

interface Persona { id: string; name: string; description: string | null; }
interface Role { id: string; name: string; }

export default function AdminPersonasPage() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [pr, setPr] = useState<Map<string, Set<string>>>(new Map());
  const [name, setName] = useState(""); const [desc, setDesc] = useState("");
  const [editing, setEditing] = useState<Persona | null>(null);
  const [selRoles, setSelRoles] = useState<Set<string>>(new Set());

  const load = async () => {
    const [{ data: p }, { data: r }, { data: m }] = await Promise.all([
      supabase.from("personas").select("id,name,description").order("name"),
      supabase.from("roles").select("id,name").order("name"),
      supabase.from("persona_roles").select("persona_id,role_id"),
    ]);
    setPersonas((p ?? []) as Persona[]);
    setRoles((r ?? []) as Role[]);
    const map = new Map<string, Set<string>>();
    (m ?? []).forEach(x => { if (!map.has(x.persona_id)) map.set(x.persona_id, new Set()); map.get(x.persona_id)!.add(x.role_id); });
    setPr(map);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!name.trim()) return;
    const { error, data } = await supabase.from("personas").insert({ name: name.trim(), description: desc.trim() || null }).select().single();
    if (error) { toast.error(error.message); return; }
    await recordAudit({ action: "persona.create", decision: "ALLOW", resource_type: "persona", resource_id: data?.id });
    setName(""); setDesc(""); load();
  };
  const del = async (p: Persona) => {
    if (!confirm(`Delete "${p.name}"?`)) return;
    const { error } = await supabase.from("personas").delete().eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    await recordAudit({ action: "persona.delete", decision: "ALLOW", resource_type: "persona", resource_id: p.id });
    load();
  };
  const openEdit = (p: Persona) => { setSelRoles(new Set(pr.get(p.id) ?? [])); setEditing(p); };

  const save = async () => {
    if (!editing) return;
    const cur = pr.get(editing.id) ?? new Set<string>();
    const add = [...selRoles].filter(x => !cur.has(x));
    const remove = [...cur].filter(x => !selRoles.has(x));
    const ops: Promise<unknown>[] = [];
    if (add.length) ops.push(Promise.resolve(supabase.from("persona_roles").insert(add.map(role_id => ({ persona_id: editing.id, role_id })))));
    if (remove.length) ops.push(Promise.resolve(supabase.from("persona_roles").delete().eq("persona_id", editing.id).in("role_id", remove)));
    await Promise.all(ops);
    await recordAudit({ action: "persona.update", decision: "ALLOW", resource_type: "persona", resource_id: editing.id, metadata: { added: add, removed: remove } });
    toast.success("Persona updated");
    setEditing(null); load();
  };

  return (
    <div>
      <h2 className="text-base font-semibold mb-3">Personas</h2>
      <div className="flex gap-2 mb-4 p-3 rounded-lg border bg-muted/30">
        <Input placeholder="Persona name" value={name} onChange={e => setName(e.target.value)} className="max-w-xs" />
        <Input placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} />
        <Button onClick={add}><Plus size={14} /> Add</Button>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Roles</TableHead><TableHead>Description</TableHead><TableHead className="w-[120px]"></TableHead></TableRow></TableHeader>
        <TableBody>
          {personas.map(p => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">{p.name}</TableCell>
              <TableCell>
                {roles.filter(r => pr.get(p.id)?.has(r.id)).map(r => <Badge key={r.id} variant="secondary" className="mr-1 text-[10px]">{r.name}</Badge>)}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{p.description ?? "—"}</TableCell>
              <TableCell className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => openEdit(p)}>Roles</Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => del(p)}><Trash2 size={13} className="text-destructive" /></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.name} — Assign roles</DialogTitle></DialogHeader>
          <div className="space-y-1.5 max-h-72 overflow-auto pr-2">
            {roles.map(r => (
              <label key={r.id} className="flex items-center gap-2 text-sm">
                <Checkbox checked={selRoles.has(r.id)} onCheckedChange={(c) => {
                  const s = new Set(selRoles); if (c) s.add(r.id); else s.delete(r.id); setSelRoles(s);
                }} />
                {r.name}
              </label>
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
