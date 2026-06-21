import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { recordAudit } from "@/lib/authz/audit";

interface Profile { id: string; email: string; name: string | null; status: string; attributes: Record<string, unknown>; }
interface NamedRow { id: string; name: string; }

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [personas, setPersonas] = useState<NamedRow[]>([]);
  const [teams, setTeams] = useState<NamedRow[]>([]);
  const [assignments, setAssignments] = useState<{ user_id: string; persona_ids: Set<string>; team_ids: Set<string> }[]>([]);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [selPersonas, setSelPersonas] = useState<Set<string>>(new Set());
  const [selTeams, setSelTeams] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: u }, { data: p }, { data: t }, { data: up }, { data: ut }] = await Promise.all([
      supabase.from("profiles").select("id,email,name,status,attributes").order("email"),
      supabase.from("personas").select("id,name").order("name"),
      supabase.from("teams").select("id,name").order("name"),
      supabase.from("user_personas").select("user_id,persona_id"),
      supabase.from("user_teams").select("user_id,team_id"),
    ]);
    setUsers((u ?? []) as Profile[]);
    setPersonas((p ?? []) as NamedRow[]);
    setTeams((t ?? []) as NamedRow[]);
    const map = new Map<string, { user_id: string; persona_ids: Set<string>; team_ids: Set<string> }>();
    (u ?? []).forEach(row => map.set(row.id, { user_id: row.id, persona_ids: new Set(), team_ids: new Set() }));
    (up ?? []).forEach(r => map.get(r.user_id)?.persona_ids.add(r.persona_id));
    (ut ?? []).forEach(r => map.get(r.user_id)?.team_ids.add(r.team_id));
    setAssignments([...map.values()]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openEdit = (user: Profile) => {
    const a = assignments.find(x => x.user_id === user.id);
    setSelPersonas(new Set(a?.persona_ids ?? []));
    setSelTeams(new Set(a?.team_ids ?? []));
    setEditing(user);
  };

  const save = async () => {
    if (!editing) return;
    const current = assignments.find(a => a.user_id === editing.id);
    const curP = current?.persona_ids ?? new Set<string>();
    const curT = current?.team_ids ?? new Set<string>();

    const addP = [...selPersonas].filter(x => !curP.has(x));
    const delP = [...curP].filter(x => !selPersonas.has(x));
    const addT = [...selTeams].filter(x => !curT.has(x));
    const delT = [...curT].filter(x => !selTeams.has(x));

    const ops: Promise<unknown>[] = [];
    if (addP.length) ops.push(supabase.from("user_personas").insert(addP.map(persona_id => ({ user_id: editing.id, persona_id }))));
    if (delP.length) ops.push(supabase.from("user_personas").delete().eq("user_id", editing.id).in("persona_id", delP));
    if (addT.length) ops.push(supabase.from("user_teams").insert(addT.map(team_id => ({ user_id: editing.id, team_id }))));
    if (delT.length) ops.push(supabase.from("user_teams").delete().eq("user_id", editing.id).in("team_id", delT));
    await Promise.all(ops);

    await recordAudit({ action: "user.update", decision: "ALLOW", resource_type: "user", resource_id: editing.id,
      metadata: { addedPersonas: addP, removedPersonas: delP, addedTeams: addT, removedTeams: delT } });
    toast.success("User updated");
    setEditing(null);
    load();
  };

  return (
    <div>
      <h2 className="text-base font-semibold mb-3">Users</h2>
      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Personas</TableHead>
              <TableHead>Teams</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map(u => {
              const a = assignments.find(x => x.user_id === u.id);
              return (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.email}</TableCell>
                  <TableCell>{u.name ?? "—"}</TableCell>
                  <TableCell><Badge variant="secondary">{u.status}</Badge></TableCell>
                  <TableCell className="text-xs">{personas.filter(p => a?.persona_ids.has(p.id)).map(p => p.name).join(", ") || "—"}</TableCell>
                  <TableCell className="text-xs">{teams.filter(t => a?.team_ids.has(t.id)).map(t => t.name).join(", ") || "—"}</TableCell>
                  <TableCell><Button size="sm" variant="outline" onClick={() => openEdit(u)}>Manage</Button></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.email}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold mb-2">Personas</p>
              <div className="space-y-1.5 max-h-64 overflow-auto pr-2">
                {personas.map(p => (
                  <label key={p.id} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={selPersonas.has(p.id)} onCheckedChange={(c) => {
                      const s = new Set(selPersonas);
                      if (c) s.add(p.id); else s.delete(p.id);
                      setSelPersonas(s);
                    }} />
                    {p.name}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold mb-2">Teams</p>
              <div className="space-y-1.5 max-h-64 overflow-auto pr-2">
                {teams.map(t => (
                  <label key={t.id} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={selTeams.has(t.id)} onCheckedChange={(c) => {
                      const s = new Set(selTeams);
                      if (c) s.add(t.id); else s.delete(t.id);
                      setSelTeams(s);
                    }} />
                    {t.name}
                  </label>
                ))}
              </div>
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
