/**
 * ABAC expression DSL — small, JSON-serialisable.
 * Used by the rule builder UI, the in-Studio preview evaluator,
 * and (eventually) the runtime worker.
 */

export type AbacOp =
  | "==" | "!=" | ">" | ">=" | "<" | "<="
  | "in" | "not_in" | "contains" | "matches";

export interface AbacCondition {
  fact: string;          // e.g. "user.persona", "case.amount", "node.type"
  op: AbacOp;
  value: unknown;        // primitive or array (for in / not_in)
}

export type AbacExpression =
  | { all: AbacExpression[] }
  | { any: AbacExpression[] }
  | { not: AbacExpression }
  | AbacCondition
  | Record<string, never>;   // empty {} = vacuously true

/** Facts available to rule evaluation. */
export interface AbacContext {
  user: {
    id?: string;
    email?: string;
    role?: string;
    persona?: string[];        // a user can have multiple personas
    team?: string[];
    permission?: string[];     // resolved per-workflow permission keys
  };
  case: Record<string, unknown>; // data-model fields
  node: { id: string; type?: string };
  time: { now: string; dayOfWeek: number };
}

export const ABAC_FACTS = [
  { key: "user.id",        label: "User ID",        type: "string" },
  { key: "user.email",     label: "User email",     type: "string" },
  { key: "user.role",      label: "Workflow role",  type: "string" },
  { key: "user.persona",   label: "User persona",   type: "string[]" },
  { key: "user.team",      label: "User team",      type: "string[]" },
  { key: "user.permission",label: "User permission",type: "string[]" },
  { key: "node.id",        label: "Node ID",        type: "string" },
  { key: "node.type",      label: "Node type",      type: "string" },
  { key: "time.dayOfWeek", label: "Day of week (0–6)", type: "number" },
  { key: "time.now",       label: "Current time (ISO)", type: "string" },
] as const;

export const ABAC_OPS: { op: AbacOp; label: string }[] = [
  { op: "==",       label: "equals" },
  { op: "!=",       label: "not equals" },
  { op: ">",        label: ">" },
  { op: ">=",       label: "≥" },
  { op: "<",        label: "<" },
  { op: "<=",       label: "≤" },
  { op: "in",       label: "in" },
  { op: "not_in",   label: "not in" },
  { op: "contains", label: "contains" },
  { op: "matches",  label: "matches regex" },
];
