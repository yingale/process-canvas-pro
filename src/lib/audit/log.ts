/**
 * Tiny helper for inserting audit events from the client.
 * RLS enforces that actor_user_id == auth.uid().
 */
import { supabase } from "@/integrations/supabase/client";

export interface AuditEntry {
  action: string;
  resourceType?: string;
  resourceId?: string;
  workflowId?: string;
  decision?: "ALLOW" | "DENY" | "ERROR" | "SUCCESS";
  reason?: string;
  metadata?: Record<string, unknown>;
}

export async function auditLog(entry: AuditEntry): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("audit_events").insert({
      actor_user_id: user.id,
      actor_email: user.email ?? null,
      action: entry.action,
      resource_type: entry.resourceType ?? null,
      resource_id: entry.resourceId ?? null,
      workflow_id: entry.workflowId ?? null,
      decision: entry.decision ?? null,
      reason: entry.reason ?? null,
      metadata: entry.metadata ?? {},
    });
  } catch (e) {
    console.warn("auditLog failed:", e);
  }
}
