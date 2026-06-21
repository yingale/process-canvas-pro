/**
 * Tiny JSON-AST safe condition evaluator for ABAC policies.
 * Supports: { "==": [a, b] }, "!=", "<", ">", "<=", ">=", "in", "and", "or", "not"
 * Operands can be literals or path strings starting with `user.`, `resource.`, `env.`
 */
export type ConditionNode =
  | { "==": [unknown, unknown] }
  | { "!=": [unknown, unknown] }
  | { "<": [unknown, unknown] }
  | { ">": [unknown, unknown] }
  | { "<=": [unknown, unknown] }
  | { ">=": [unknown, unknown] }
  | { in: [unknown, unknown[]] }
  | { and: ConditionNode[] }
  | { or: ConditionNode[] }
  | { not: ConditionNode }
  | Record<string, never>;

interface EvalContext {
  user: Record<string, unknown>;
  resource: Record<string, unknown>;
  env: Record<string, unknown>;
}

function getPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

function resolve(value: unknown, ctx: EvalContext): unknown {
  if (typeof value === "string") {
    if (value.startsWith("user.")) return getPath(ctx.user, value.slice(5));
    if (value.startsWith("resource.")) return getPath(ctx.resource, value.slice(9));
    if (value.startsWith("env.")) return getPath(ctx.env, value.slice(4));
  }
  return value;
}

export function evaluateCondition(node: ConditionNode | undefined | null, ctx: EvalContext): boolean {
  if (!node || Object.keys(node).length === 0) return true;
  const key = Object.keys(node)[0] as keyof ConditionNode;
  const val = (node as Record<string, unknown>)[key];

  switch (key) {
    case "==": { const [a, b] = val as [unknown, unknown]; return resolve(a, ctx) === resolve(b, ctx); }
    case "!=": { const [a, b] = val as [unknown, unknown]; return resolve(a, ctx) !== resolve(b, ctx); }
    case "<":  { const [a, b] = val as [unknown, unknown]; return (resolve(a, ctx) as number) <  (resolve(b, ctx) as number); }
    case ">":  { const [a, b] = val as [unknown, unknown]; return (resolve(a, ctx) as number) >  (resolve(b, ctx) as number); }
    case "<=": { const [a, b] = val as [unknown, unknown]; return (resolve(a, ctx) as number) <= (resolve(b, ctx) as number); }
    case ">=": { const [a, b] = val as [unknown, unknown]; return (resolve(a, ctx) as number) >= (resolve(b, ctx) as number); }
    case "in": { const [a, list] = val as [unknown, unknown[]]; return (list as unknown[]).map(v => resolve(v, ctx)).includes(resolve(a, ctx)); }
    case "and": return (val as ConditionNode[]).every(n => evaluateCondition(n, ctx));
    case "or":  return (val as ConditionNode[]).some(n => evaluateCondition(n, ctx));
    case "not": return !evaluateCondition(val as ConditionNode, ctx);
    default: return false;
  }
}

/** Wildcard-aware permission match: "workflow.*" matches "workflow.update". "*" matches anything. */
export function matchesAction(pattern: string, action: string): boolean {
  if (pattern === "*" || pattern === action) return true;
  if (pattern.endsWith(".*")) {
    const prefix = pattern.slice(0, -2);
    return action === prefix || action.startsWith(prefix + ".");
  }
  return false;
}
