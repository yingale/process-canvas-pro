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
    await supabase.from("audit_events").insert({
      actor_user_id: user?.id ?? null,
      actor_email: user?.email ?? null,
      action: event.action,
      decision: event.decision ?? null,
      reason: event.reason ?? null,
      resource_type: event.resource_type ?? null,
      resource_id: event.resource_id ?? null,
      metadata: event.metadata ?? {},
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
  } catch (err) {
    console.warn("[audit] failed to record event", event.action, err);
  }
}
