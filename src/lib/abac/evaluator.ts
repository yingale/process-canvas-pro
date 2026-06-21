/**
 * Pure ABAC expression evaluator. Same code runs in Studio preview and the worker.
 */
import type { AbacCondition, AbacContext, AbacExpression } from "./types";

function getFact(ctx: AbacContext, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = ctx;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else return undefined;
  }
  return cur;
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : v === undefined || v === null ? [] : [v];
}

function compare(actual: unknown, op: AbacCondition["op"], expected: unknown): boolean {
  switch (op) {
    case "==": return Array.isArray(actual) ? actual.includes(expected) : actual === expected;
    case "!=": return !compare(actual, "==", expected);
    case ">":  return Number(actual) >   Number(expected);
    case ">=": return Number(actual) >=  Number(expected);
    case "<":  return Number(actual) <   Number(expected);
    case "<=": return Number(actual) <=  Number(expected);
    case "in": {
      const list = asArray(expected);
      return asArray(actual).some((a) => list.includes(a));
    }
    case "not_in": return !compare(actual, "in", expected);
    case "contains":
      if (typeof actual === "string") return actual.includes(String(expected));
      if (Array.isArray(actual)) return actual.includes(expected);
      return false;
    case "matches":
      try { return new RegExp(String(expected)).test(String(actual)); }
      catch { return false; }
    default: return false;
  }
}

export function evaluateRule(expr: AbacExpression, ctx: AbacContext): boolean {
  if (!expr || typeof expr !== "object") return true;
  if ("all" in expr) return expr.all.every((c) => evaluateRule(c, ctx));
  if ("any" in expr) return expr.any.length === 0 ? false : expr.any.some((c) => evaluateRule(c, ctx));
  if ("not" in expr) return !evaluateRule(expr.not, ctx);
  if ("fact" in expr && "op" in expr) {
    return compare(getFact(ctx, expr.fact), expr.op, expr.value);
  }
  // empty object {} → vacuously true
  return true;
}

export interface NodeRuleRecord {
  id: string;
  effect: "allow" | "deny";
  action: "view" | "edit" | "execute" | "approve";
  expression: AbacExpression;
  priority: number;
  enabled: boolean;
}

/**
 * Apply all rules for a given action. Lower priority is evaluated first.
 * Returns the first matching rule's effect, or null if none match (default = allow).
 */
export function decide(
  rules: NodeRuleRecord[],
  action: NodeRuleRecord["action"],
  ctx: AbacContext,
): { allowed: boolean; matchedRule: NodeRuleRecord | null } {
  const sorted = rules
    .filter((r) => r.enabled && r.action === action)
    .sort((a, b) => a.priority - b.priority);
  for (const r of sorted) {
    if (evaluateRule(r.expression, ctx)) {
      return { allowed: r.effect === "allow", matchedRule: r };
    }
  }
  return { allowed: true, matchedRule: null };
}
