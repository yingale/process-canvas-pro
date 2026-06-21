/**
 * CanOnWorkflow — gates children behind a per-workflow capability.
 * Usage: <CanOnWorkflow workflowId={id} action="edit">…</CanOnWorkflow>
 */
import type { ReactNode } from "react";
import { useWorkflowRole } from "@/hooks/use-workflow-role";

type Action = "view" | "edit" | "manage" | "approve";

interface Props {
  workflowId: string | null | undefined;
  action: Action;
  fallback?: ReactNode;
  children: ReactNode;
}

export function CanOnWorkflow({ workflowId, action, fallback = null, children }: Props) {
  const { canView, canEdit, canManage, canApprove, loading } = useWorkflowRole(workflowId);
  if (loading) return null;
  const ok =
    action === "view" ? canView :
    action === "edit" ? canEdit :
    action === "manage" ? canManage :
    canApprove;
  return <>{ok ? children : fallback}</>;
}
