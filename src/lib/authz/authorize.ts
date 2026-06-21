/**
 * Client-side authorization engine.
 * Reads precomputed permission set + policies from AuthzContext and evaluates:
 *   1. Explicit DENY policies (deny wins)
 *   2. Explicit ALLOW policies
 *   3. Role permission match (wildcard aware)
 *   4. Default deny
 *
 * Also fetches policies once; callers in AuthzContext pass them in.
 */
import type { AuthzUser, Policy, PermissionKey } from "./types";
import { evaluateCondition, matchesAction, type ConditionNode } from "./conditionEvaluator";

export interface AuthorizeArgs {
  user: AuthzUser;
  permissions: Set<PermissionKey>;
  policies: Policy[];
  action: string;
  resource?: Record<string, unknown>;
}

export interface AuthorizeResult {
  allowed: boolean;
  reason: string;
  matched?: string;
}

export function authorize({ user, permissions, policies, action, resource }: AuthorizeArgs): AuthorizeResult {
  const ctx = { user: { id: user.id, email: user.email, attributes: user.attributes, appRoles: user.appRoles }, resource: resource ?? {}, env: { now: Date.now() } };
  const sorted = [...policies].filter(p => p.enabled).sort((a, b) => a.priority - b.priority);

  // 1. DENY first
  for (const p of sorted) {
    if (p.effect !== "DENY") continue;
    if (!matchesAction(p.action, action)) continue;
    if (evaluateCondition(p.condition as ConditionNode, ctx)) {
      return { allowed: false, reason: `Explicit DENY policy: ${p.name}`, matched: p.id };
    }
  }
  // 2. ALLOW policies
  for (const p of sorted) {
    if (p.effect !== "ALLOW") continue;
    if (!matchesAction(p.action, action)) continue;
    if (evaluateCondition(p.condition as ConditionNode, ctx)) {
      return { allowed: true, reason: `ALLOW policy: ${p.name}`, matched: p.id };
    }
  }
  // 3. Role permissions (wildcard)
  if (permissions.has(action) || permissions.has("*")) {
    return { allowed: true, reason: "Role permission" };
  }
  for (const key of permissions) {
    if (key.endsWith(".*") && matchesAction(key, action)) {
      return { allowed: true, reason: `Role permission (${key})` };
    }
  }
  // 4. Default deny
  return { allowed: false, reason: "Default deny" };
}
