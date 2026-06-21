/**
 * WorkflowMembersPanel — shell with sub-tabs:
 *   Members | Roles | Audit
 * Visible inside Studio when a workflow is loaded.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, UserPlus, ShieldAlert, Users, Layers, ScrollText, Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useWorkflowRole, invalidateWorkflowRole } from "@/hooks/use-workflow-role";
import { toast } from "sonner";
import WorkflowRolesPanel from "./WorkflowRolesPanel";
import AuditLogTable from "@/components/audit/AuditLogTable";
import { auditLog } from "@/lib/audit/log";

interface Member {
  id: string;
  user_id: string;
  role: string;
  template_id: string | null;
  custom_role_id: string | null;
  persona_id: string | null;
  team_id: string | null;
  email?: string;
  name?: string | null;
}

interface Template { id: string; key: string; name: string }
interface CustomRole { id: string; name: string }

interface Props { workflowId: string }

export default function WorkflowMembersPanel({ workflowId }: Props) {
  const { canManage, canAudit, loading: roleLoading } = useWorkflowRole(workflowId);
  const [members, setMembers] = useState<Member[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [personas, setPersonas] = useState<{ id: string; name: string }[]>([]);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [allUsers, setAllUsers] = useState<{ id: string; email: string; name: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  // add-member form
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [userPickerOpen, setUserPickerOpen] = useState(false);
  const [roleValue, setRoleValue] = useState<string>("template:"); // "template:<id>" or "custom:<id>"
  const [personaId, setPersonaId] = useState<string>("__none__");
  const [teamId, setTeamId] = useState<string>("__none__");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [mRes, tRes, crRes, pRes, teamsRes, uRes] = await Promise.all([
      supabase.from("workflow_members")
        .select("id,user_id,role,template_id,custom_role_id,persona_id,team_id,profiles:user_id(email,name)")
        .eq("workflow_id", workflowId),
      supabase.from("workflow_role_templates").select("id,key,name").order("name"),
      supabase.from("workflow_custom_roles").select("id,name").eq("workflow_id", workflowId).order("name"),
      supabase.from("personas").select("id,name").order("name"),
      supabase.from("teams").select("id,name").order("name"),
      supabase.from("profiles").select("id,email,name").order("email"),
    ]);
    setMembers(
      ((mRes.data ?? []) as unknown as Array<Member & { profiles: { email: string; name: string | null } | null }>)
        .map((r) => ({
          id: r.id, user_id: r.user_id, role: r.role,
          template_id: r.template_id, custom_role_id: r.custom_role_id,
          persona_id: r.persona_id, team_id: r.team_id,
          email: r.profiles?.email, name: r.profiles?.name,
        })),
    );
    setTemplates((tRes.data ?? []) as Template[]);
    setCustomRoles((crRes.data ?? []) as CustomRole[]);
    setPersonas((pRes.data ?? []) as { id: string; name: string }[]);
    setTeams((teamsRes.data ?? []) as { id: string; name: string }[]);
    setAllUsers((uRes.data ?? []) as { id: string; email: string; name: string | null }[]);
    if (tRes.data?.[0] && !roleValue.startsWith("template:") && !roleValue.startsWith("custom:")) {
      setRoleValue(`template:${tRes.data[0].id}`);
    } else if (roleValue === "template:" && tRes.data?.[0]) {
      setRoleValue(`template:${tRes.data[0].id}`);
    }
    setLoading(false);
  }, [workflowId, roleValue]);

  useEffect(() => { void load(); }, [load]);

  const parseRole = (v: string): { template_id: string | null; custom_role_id: string | null; legacy: string } => {
    if (v.startsWith("template:")) {
      const id = v.slice("template:".length);
      const t = templates.find((x) => x.id === id);
      return { template_id: id || null, custom_role_id: null, legacy: t?.key ?? "viewer" };
    }
    if (v.startsWith("custom:")) {
      return { template_id: null, custom_role_id: v.slice("custom:".length) || null, legacy: "viewer" };
    }
    return { template_id: null, custom_role_id: null, legacy: "viewer" };
  };

  const memberRoleValue = (m: Member): string =>
    m.custom_role_id ? `custom:${m.custom_role_id}`
      : m.template_id ? `template:${m.template_id}`
      : templates.find((t) => t.key === m.role)
        ? `template:${templates.find((t) => t.key === m.role)!.id}`
        : "";

  const roleLabel = (m: Member): string => {
    if (m.custom_role_id) return customRoles.find((c) => c.id === m.custom_role_id)?.name ?? "Custom";
    const t = m.template_id ? templates.find((x) => x.id === m.template_id) : templates.find((x) => x.key === m.role);
    return t?.name ?? m.role;
  };

  const add = useCallback(async () => {
    if (!selectedUserId) return;
    const prof = allUsers.find((u) => u.id === selectedUserId);
    if (!prof) { toast.error("Pick a user."); return; }
    if (members.some((m) => m.user_id === selectedUserId)) {
      toast.error("User is already a member."); return;
    }
    setBusy(true);
    try {
      const parsed = parseRole(roleValue);
      const { error } = await supabase.from("workflow_members").insert({
        workflow_id: workflowId,
        user_id: prof.id,
        role: parsed.legacy,
        template_id: parsed.template_id,
        custom_role_id: parsed.custom_role_id,
        persona_id: personaId === "__none__" ? null : personaId,
        team_id: teamId === "__none__" ? null : teamId,
      } as never);
      if (error) { toast.error(error.message); return; }
      await auditLog({
        action: "workflow.member.add", resourceType: "workflow_member", workflowId,
        decision: "ALLOW", metadata: { email: prof.email, role: parsed.legacy, template_id: parsed.template_id, custom_role_id: parsed.custom_role_id },
      });
      toast.success(`Added ${prof.email}`);
      setSelectedUserId("");
      setPersonaId("__none__"); setTeamId("__none__");
      invalidateWorkflowRole(workflowId);
      await load();
    } finally { setBusy(false); }
  }, [selectedUserId, allUsers, members, roleValue, personaId, teamId, workflowId, load, templates]);

  const updateMember = useCallback(async (id: string, patch: Record<string, unknown>) => {
    const { error } = await supabase.from("workflow_members").update(patch as never).eq("id", id);
    if (error) { toast.error(error.message); return; }
    await auditLog({ action: "workflow.member.update", resourceType: "workflow_member", resourceId: id, workflowId, decision: "ALLOW", metadata: patch });
    invalidateWorkflowRole(workflowId);
    await load();
  }, [workflowId, load]);

  const changeRole = (m: Member, v: string) => {
    const parsed = parseRole(v);
    void updateMember(m.id, { role: parsed.legacy, template_id: parsed.template_id, custom_role_id: parsed.custom_role_id });
  };

  const remove = useCallback(async (id: string) => {
    if (!confirm("Remove this user from the workflow?")) return;
    const { error } = await supabase.from("workflow_members").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    await auditLog({ action: "workflow.member.remove", resourceType: "workflow_member", resourceId: id, workflowId, decision: "ALLOW" });
    invalidateWorkflowRole(workflowId);
    await load();
  }, [workflowId, load]);

  const personaName = useMemo(() => new Map(personas.map((p) => [p.id, p.name])), [personas]);
  const teamName = useMemo(() => new Map(teams.map((t) => [t.id, t.name])), [teams]);

  const RolePicker = ({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) => (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel className="text-[10px] uppercase">Templates</SelectLabel>
          {templates.map((t) => <SelectItem key={t.id} value={`template:${t.id}`}>{t.name}</SelectItem>)}
        </SelectGroup>
        {customRoles.length > 0 && (
          <SelectGroup>
            <SelectLabel className="text-[10px] uppercase">Custom (this workflow)</SelectLabel>
            {customRoles.map((c) => <SelectItem key={c.id} value={`custom:${c.id}`}>{c.name}</SelectItem>)}
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  );

  if (roleLoading || loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="p-6 max-w-5xl">
      <Tabs defaultValue="members" className="space-y-4">
        <TabsList>
          <TabsTrigger value="members" className="text-xs gap-1"><Users size={12} /> Members</TabsTrigger>
          <TabsTrigger value="roles"   className="text-xs gap-1"><Layers size={12} /> Roles</TabsTrigger>
          {canAudit && (
            <TabsTrigger value="audit" className="text-xs gap-1"><ScrollText size={12} /> Audit</TabsTrigger>
          )}
        </TabsList>

        {/* MEMBERS TAB */}
        <TabsContent value="members" className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold">Workflow members</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Only listed people can see this workflow. Workflow admins manage access.
            </p>
          </div>

          {!canManage && (
            <div className="flex items-start gap-3 rounded-md border border-warning/40 bg-warning/5 p-4">
              <ShieldAlert className="h-5 w-5 text-warning mt-0.5" />
              <div>
                <div className="font-medium">Members are read-only</div>
                <p className="text-sm text-muted-foreground mt-1">
                  Only the workflow admin or a super admin can add or change members.
                </p>
              </div>
            </div>
          )}

          {canManage && (
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-2"><UserPlus className="h-4 w-4" /><span className="font-medium text-sm">Add a member</span></div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <div className="md:col-span-2">
                  <Label className="text-xs">User</Label>
                  {(() => {
                    const memberIds = new Set(members.map((m) => m.user_id));
                    const available = allUsers.filter((u) => !memberIds.has(u.id));
                    const selected = allUsers.find((u) => u.id === selectedUserId);
                    return (
                      <Popover open={userPickerOpen} onOpenChange={setUserPickerOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                            <span className="truncate">
                              {selected ? (selected.name ? `${selected.name} · ${selected.email}` : selected.email) : "Select a user…"}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
                          <Command>
                            <CommandInput placeholder="Search by name or email…" />
                            <CommandList>
                              <CommandEmpty>No users found.</CommandEmpty>
                              <CommandGroup>
                                {available.map((u) => (
                                  <CommandItem
                                    key={u.id}
                                    value={`${u.name ?? ""} ${u.email}`}
                                    onSelect={() => { setSelectedUserId(u.id); setUserPickerOpen(false); }}
                                  >
                                    <Check className={cn("mr-2 h-4 w-4", selectedUserId === u.id ? "opacity-100" : "opacity-0")} />
                                    <div className="flex flex-col">
                                      <span className="text-sm">{u.name ?? u.email}</span>
                                      {u.name && <span className="text-xs text-muted-foreground">{u.email}</span>}
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    );
                  })()}
                </div>
                <div>
                  <Label className="text-xs">Role</Label>
                  <RolePicker value={roleValue} onChange={setRoleValue} />
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
          )}

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
                    {canManage
                      ? <RolePicker value={memberRoleValue(m)} onChange={(v) => changeRole(m, v)} />
                      : <Badge variant="outline">{roleLabel(m)}</Badge>}
                  </div>
                  <div className="col-span-2">
                    {canManage ? (
                      <Select
                        value={m.persona_id ?? "__none__"}
                        onValueChange={(v) => updateMember(m.id, { persona_id: v === "__none__" ? null : v })}
                      >
                        <SelectTrigger className="h-8"><SelectValue placeholder="Persona" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">No persona</SelectItem>
                          {personas.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-xs text-muted-foreground">{m.persona_id ? personaName.get(m.persona_id) : "—"}</span>
                    )}
                  </div>
                  <div className="col-span-2">
                    {canManage ? (
                      <Select
                        value={m.team_id ?? "__none__"}
                        onValueChange={(v) => updateMember(m.id, { team_id: v === "__none__" ? null : v })}
                      >
                        <SelectTrigger className="h-8"><SelectValue placeholder="Team" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">No team</SelectItem>
                          {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-xs text-muted-foreground">{m.team_id ? teamName.get(m.team_id) : "—"}</span>
                    )}
                  </div>
                  <div className="col-span-1 flex justify-end">
                    {canManage && (
                      <Button size="icon" variant="ghost" onClick={() => remove(m.id)} title="Remove">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {members.length === 0 && (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">No members yet.</div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ROLES TAB */}
        <TabsContent value="roles">
          <WorkflowRolesPanel workflowId={workflowId} canManage={canManage} />
        </TabsContent>

        {/* AUDIT TAB */}
        {canAudit && (
          <TabsContent value="audit">
            <AuditLogTable workflowId={workflowId} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
