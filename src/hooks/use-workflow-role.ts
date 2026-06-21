/**
 * useWorkflowRole — per-workflow role for the current user.
 * Returns one of: 'workflow_admin' | 'designer' | 'approver' | 'viewer' | null.
 * Super admins always resolve to 'workflow_admin'.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type WorkflowRole =
  | "workflow_admin"
  | "designer"
  | "approver"
  | "viewer"
  | null;

const cache = new Map<string, WorkflowRole>();
const listeners = new Map<string, Set<(r: WorkflowRole) => void>>();

function notify(key: string, r: WorkflowRole) {
  cache.set(key, r);
  listeners.get(key)?.forEach((cb) => cb(r));
}

export function invalidateWorkflowRole(workflowId?: string) {
  if (workflowId) {
    cache.delete(`*:${workflowId}`);
  } else {
    cache.clear();
  }
}

export function useWorkflowRole(workflowId: string | null | undefined): {
  role: WorkflowRole;
  loading: boolean;
  canView: boolean;
  canEdit: boolean;
  canManage: boolean;
  canApprove: boolean;
} {
  const [role, setRole] = useState<WorkflowRole>(
    workflowId ? cache.get(`*:${workflowId}`) ?? null : null,
  );
  const [loading, setLoading] = useState<boolean>(!!workflowId && !cache.has(`*:${workflowId}`));

  useEffect(() => {
    if (!workflowId) {
      setRole(null);
      setLoading(false);
      return;
    }
    const key = `*:${workflowId}`;
    if (cache.has(key)) {
      setRole(cache.get(key) ?? null);
      setLoading(false);
    }

    let active = true;
    const cb = (r: WorkflowRole) => active && setRole(r);
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key)!.add(cb);

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        notify(key, null);
        if (active) setLoading(false);
        return;
      }
      const { data, error } = await supabase.rpc("workflow_role", {
        _uid: user.id,
        _wf: workflowId,
      });
      if (active) {
        notify(key, error ? null : ((data as WorkflowRole) ?? null));
        setLoading(false);
      }
    })();

    return () => {
      active = false;
      listeners.get(key)?.delete(cb);
    };
  }, [workflowId]);

  const canView = role !== null;
  const canEdit = role === "workflow_admin" || role === "designer";
  const canManage = role === "workflow_admin";
  const canApprove = role === "approver" || canEdit;
  return { role, loading, canView, canEdit, canManage, canApprove };
}
