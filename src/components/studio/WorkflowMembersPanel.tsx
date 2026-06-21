/**
 * WorkflowMembersPanel — visible inside Studio to a workflow's admin (and super admin).
 * Lets the admin add/remove users on this workflow and pick role + persona + team.
 * Permissions enforced server-side by RLS on workflow_members.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, UserPlus, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkflowRole, invalidateWorkflowRole } from "@/hooks/use-workflow-role";
import { toast } from "sonner";

type Role = "workflow_admin" | "designer" | "approver" | "viewer";

interface Member {
  id: string;
  user_id: string;
  role: Role;
  persona_id: string | null;
  team_id: string | null;
  email?: string;
  name?: string | null;
}

interface Props { workflowId: string }

const ROLE_LABEL: Record<Role, string> = {
  workflow_admin: "Workflow Admin",
  designer: "Designer",
  approver: "Approver",
  viewer: "Viewer",
};

export default function WorkflowMembersPanel({ workflowId }: Props) {
  const { canManage, loading: roleLoading } = useWorkflowRole(workflowId);
  const [members, setMembers] = useState<Member[]>([]);
  const [personas, setPersonas] = useState<{ id: string; name: string }[]>([]);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // add-member form
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("viewer");
  const [personaId, setPersonaId] = useState<string>("__none__");
  const [teamId, setTeamId] = useState<string>("__none__");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [mRes, pRes, tRes] = await Promise.all([
      supabase
        .from("workflow_members")
        .select("id,user_id,role,persona_id,team_id,profiles:user_id(email,name)")
        .eq("workflow_id", workflowId),
      supabase.from("personas").select("id,name").order("name"),
      supabase.from("teams").select("id,name").order("name"),
    ]);
    setMembers(
      ((mRes.data ?? []) as unknown as Array<Member & { profiles: { email: string; name: string | null } | null }>)
        .map((r) => ({
          id: r.id,
          user_id: r.user_id,
          role: r.role,
          persona_id: r.persona_id,
          team_id: r.team_id,
          email: r.profiles?.email,
          name: r.profiles?.name,
        })),
    );
    setPersonas((pRes.data ?? []) as { id: string; name: string }[]);
    setTeams((tRes.data ?? []) as { id: string; name: string }[]);
    setLoading(false);
  }, [workflowId]);

  useEffect(() => { void load(); }, [load]);

  const add = useCallback(async () => {
    if (!email.trim()) return;
    setBusy(true);
    try {
      const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .select("id,email")
        .ilike("email", email.trim())
        .maybeSingle();
      if (profErr || !prof) {
        toast.error("No user with that email. They must sign up first.");
        return;
      }
      const { error } = await supabase.from("workflow_members").insert({
        workflow_id: workflowId,
        user_id: prof.id,
        role,
        persona_id: personaId === "__none__" ? null : personaId,
        team_id: teamId === "__none__" ? null : teamId,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(`Added ${prof.email} as ${ROLE_LABEL[role]}`);
      setEmail("");
      setRole("viewer");
      setPersonaId("__none__");
      setTeamId("__none__");
      invalidateWorkflowRole(workflowId);
      await load();
    } finally {
      setBusy(false);
    }
  }, [email, role, personaId, teamId, workflowId, load]);

  const update = useCallback(async (id: string, patch: Partial<Member>) => {
    const { error } = await supabase.from("workflow_members").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    invalidateWorkflowRole(workflowId);
    await load();
  }, [workflowId, load]);

  const remove = useCallback(async (id: string) => {
    if (!confirm("Remove this user from the workflow?")) return;
    const { error } = await supabase.from("workflow_members").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    invalidateWorkflowRole(workflowId);
    await load();
  }, [workflowId, load]);

  const personaName = useMemo(() => new Map(personas.map((p) => [p.id, p.name])), [personas]);
  const teamName = useMemo(() => new Map(teams.map((t) => [t.id, t.name])), [teams]);

  if (roleLoading || loading) return <div className="p-6 text-sm text-muted-foreground">Loading members…</div>;

  if (!canManage) {
    return (
      <div className="p-6 max-w-xl">
        <div className="flex items-start gap-3 rounded-md border border-warning/40 bg-warning/5 p-4">
          <ShieldAlert className="h-5 w-5 text-warning mt-0.5" />
          <div>
            <div className="font-medium">Members are read-only</div>
            <p className="text-sm text-muted-foreground mt-1">
              Only the workflow admin or a super admin can add or change members.
            </p>
          </div>
        </div>
        <div className="mt-6">
          <h3 className="text-sm font-semibold mb-3">Current members ({members.length})</h3>
          <ul className="divide-y rounded-md border">
            {members.map((m) => (
              <li key={m.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span>{m.name ?? m.email}</span>
                <Badge variant="outline">{ROLE_LABEL[m.role]}</Badge>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Workflow members</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Only listed people can see this workflow. Workflow admins manage access.
        </p>
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center gap-2"><UserPlus className="h-4 w-4" /><span className="font-medium text-sm">Add a member</span></div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="md:col-span-2">
            <Label className="text-xs">Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" />
          </div>
          <div>
            <Label className="text-xs">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Persona</Label>
            <Select value={personaId} onValueChange={setPersonaId}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {personas.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Team</Label>
            <Select value={teamId} onValueChange={setTeamId}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={add} disabled={busy || !email.trim()}>Add</Button>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">Members ({members.length})</h3>
        <div className="rounded-md border divide-y">
          {members.map((m) => (
            <div key={m.id} className="grid grid-cols-12 gap-3 items-center px-3 py-2 text-sm">
              <div className="col-span-4">
                <div className="font-medium truncate">{m.name ?? m.email}</div>
                <div className="text-xs text-muted-foreground truncate">{m.email}</div>
              </div>
              <div className="col-span-3">
                <Select value={m.role} onValueChange={(v) => update(m.id, { role: v as Role })}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                      <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Select
                  value={m.persona_id ?? "__none__"}
                  onValueChange={(v) => update(m.id, { persona_id: v === "__none__" ? null : v })}
                >
                  <SelectTrigger className="h-8"><SelectValue placeholder="Persona" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No persona</SelectItem>
                    {personas.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Select
                  value={m.team_id ?? "__none__"}
                  onValueChange={(v) => update(m.id, { team_id: v === "__none__" ? null : v })}
                >
                  <SelectTrigger className="h-8"><SelectValue placeholder="Team" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No team</SelectItem>
                    {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-1 flex justify-end">
                <Button size="icon" variant="ghost" onClick={() => remove(m.id)} title="Remove">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="col-span-12 text-xs text-muted-foreground -mt-1">
                {m.persona_id ? `Persona: ${personaName.get(m.persona_id) ?? "?"} · ` : ""}
                {m.team_id ? `Team: ${teamName.get(m.team_id) ?? "?"}` : ""}
              </div>
            </div>
          ))}
          {members.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">No members yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
