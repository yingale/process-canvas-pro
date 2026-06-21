/**
 * useWorkflowRole — per-workflow role + resolved permission set for current user.
 * Super admins resolve to role='workflow_admin' with the full permission set.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type WorkflowRole =
  | "workflow_admin"
  | "designer"
  | "approver"
  | "viewer"
  | null
  | string;  // allow custom role names

interface Entry { role: WorkflowRole; perms: string[] }
const cache = new Map<string, Entry>();
const listeners = new Map<string, Set<(e: Entry) => void>>();

function notify(key: string, e: Entry) {
  cache.set(key, e);
  listeners.get(key)?.forEach((cb) => cb(e));
}

export function invalidateWorkflowRole(workflowId?: string) {
  if (workflowId) cache.delete(`*:${workflowId}`);
  else cache.clear();
}

export function useWorkflowRole(workflowId: string | null | undefined) {
  const key = workflowId ? `*:${workflowId}` : "";
  const cached = key ? cache.get(key) : undefined;
  const [entry, setEntry] = useState<Entry>(cached ?? { role: null, perms: [] });
  const [loading, setLoading] = useState<boolean>(!!workflowId && !cached);

  useEffect(() => {
    if (!workflowId) { setEntry({ role: null, perms: [] }); setLoading(false); return; }
    if (cache.has(key)) { setEntry(cache.get(key)!); setLoading(false); }

    let active = true;
    const cb = (e: Entry) => active && setEntry(e);
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key)!.add(cb);

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { notify(key, { role: null, perms: [] }); if (active) setLoading(false); return; }
      const [{ data: roleData }, { data: permsData }] = await Promise.all([
        supabase.rpc("workflow_role", { _uid: user.id, _wf: workflowId }),
        supabase.rpc("workflow_permissions", { _uid: user.id, _wf: workflowId }),
      ]);
      const out: Entry = {
        role: (roleData as WorkflowRole) ?? null,
        perms: Array.isArray(permsData) ? (permsData as string[]) : [],
      };
      notify(key, out);
      if (active) setLoading(false);
    })();

    return () => { active = false; listeners.get(key)?.delete(cb); };
  }, [workflowId, key]);

  const { role, perms } = entry;
  const hasPerm = (k: string) => perms.includes(k);
  const canView    = role !== null || hasPerm("workflow.view");
  const canEdit    = hasPerm("workflow.edit") || role === "workflow_admin" || role === "designer";
  const canManage  = hasPerm("workflow.manage_members") || role === "workflow_admin";
  const canDeploy  = hasPerm("workflow.deploy") || role === "workflow_admin";
  const canApprove = hasPerm("node.approve") || role === "approver" || canEdit;
  const canAudit   = hasPerm("audit.view") || role === "workflow_admin";

  return { role, permissions: perms, loading, hasPerm, canView, canEdit, canManage, canDeploy, canApprove, canAudit };
}
