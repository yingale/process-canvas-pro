/**
 * CanOnWorkflow — gates children behind a per-workflow capability or specific permission.
 */
import type { ReactNode } from "react";
import { useWorkflowRole } from "@/hooks/use-workflow-role";

type Action = "view" | "edit" | "manage" | "approve" | "deploy" | "audit";

interface Props {
  workflowId: string | null | undefined;
  action?: Action;
  permission?: string;   // alternative to `action`
  fallback?: ReactNode;
  children: ReactNode;
}

export function CanOnWorkflow({ workflowId, action, permission, fallback = null, children }: Props) {
  const r = useWorkflowRole(workflowId);
  if (r.loading) return null;

  let ok = false;
  if (permission) ok = r.hasPerm(permission);
  else if (action === "view") ok = r.canView;
  else if (action === "edit") ok = r.canEdit;
  else if (action === "manage") ok = r.canManage;
  else if (action === "approve") ok = r.canApprove;
  else if (action === "deploy") ok = r.canDeploy;
  else if (action === "audit") ok = r.canAudit;

  return <>{ok ? children : fallback}</>;
}
