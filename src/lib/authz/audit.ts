import { supabase } from "@/integrations/supabase/client";

export interface AuditEventInput {
  action: string;
  decision?: "ALLOW" | "DENY";
  reason?: string;
  resource_type?: string;
  resource_id?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Append-only audit writer. Never throws to callers — audit failures are logged.
 */
export async function recordAudit(event: AuditEventInput): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const row: Record<string, unknown> = { action: event.action, metadata: event.metadata ?? {} };
    if (user?.id) row.actor_user_id = user.id;
    if (user?.email) row.actor_email = user.email;
    if (event.decision) row.decision = event.decision;
    if (event.reason) row.reason = event.reason;
    if (event.resource_type) row.resource_type = event.resource_type;
    if (event.resource_id) row.resource_id = event.resource_id;
    if (typeof navigator !== "undefined") row.user_agent = navigator.userAgent;
    await supabase.from("audit_events").insert(row as never);
  } catch (err) {
    console.warn("[audit] failed to record event", event.action, err);
  }
}
