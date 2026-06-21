/**
 * Visual builder for ABAC expressions. Editable nested groups (all/any/not)
 * plus condition rows. Falls back to raw JSON in "Advanced" mode.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus, Code2 } from "lucide-react";
import {
  ABAC_FACTS, ABAC_OPS, type AbacCondition, type AbacExpression,
} from "@/lib/abac/types";

interface Props {
  value: AbacExpression;
  onChange: (v: AbacExpression) => void;
}

const EMPTY_COND: AbacCondition = { fact: "user.role", op: "==", value: "" };

function isCondition(e: AbacExpression): e is AbacCondition {
  return !!e && typeof e === "object" && "fact" in e && "op" in e;
}
function isGroup(e: AbacExpression, kind: "all" | "any" | "not"): boolean {
  return !!e && typeof e === "object" && kind in e;
}

function Node({ expr, onChange, onDelete, depth }: {
  expr: AbacExpression; onChange: (e: AbacExpression) => void; onDelete?: () => void; depth: number;
}) {
  if (isCondition(expr)) {
    return (
      <div className="flex items-center gap-2 py-1">
        <Select value={expr.fact} onValueChange={(v) => onChange({ ...expr, fact: v })}>
          <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ABAC_FACTS.map((f) => <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={expr.op} onValueChange={(v) => onChange({ ...expr, op: v as AbacCondition["op"] })}>
          <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ABAC_OPS.map((o) => <SelectItem key={o.op} value={o.op}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input
          className="h-8 text-xs flex-1"
          placeholder={expr.op === "in" || expr.op === "not_in" ? "comma,separated,values" : "value"}
          value={
            Array.isArray(expr.value) ? expr.value.join(",") :
            expr.value === undefined || expr.value === null ? "" : String(expr.value)
          }
          onChange={(e) => {
            const raw = e.target.value;
            const parsed: unknown =
              expr.op === "in" || expr.op === "not_in"
                ? raw.split(",").map((s) => s.trim()).filter(Boolean)
                : /^-?\d+(\.\d+)?$/.test(raw) ? Number(raw)
                : raw === "true" ? true
                : raw === "false" ? false
                : raw;
            onChange({ ...expr, value: parsed });
          }}
        />
        {onDelete && (
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        )}
      </div>
    );
  }

  if (isGroup(expr, "not")) {
    const inner = (expr as { not: AbacExpression }).not;
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 p-2 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase text-destructive">NOT</span>
          {onDelete && (
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          )}
        </div>
        <Node expr={inner} onChange={(v) => onChange({ not: v })} depth={depth + 1} />
      </div>
    );
  }

  const kind: "all" | "any" = isGroup(expr, "all") ? "all" : "any";
  const items: AbacExpression[] =
    kind === "all"
      ? (expr as { all: AbacExpression[] }).all
      : (expr as { any: AbacExpression[] }).any;

  const replace = (newItems: AbacExpression[]) =>
    onChange(kind === "all" ? { all: newItems } : { any: newItems });

  return (
    <div className="rounded-md border bg-muted/30 p-2 space-y-1.5">
      <div className="flex items-center justify-between">
        <Select
          value={kind}
          onValueChange={(v) => onChange(v === "all" ? { all: items } : { any: items })}
        >
          <SelectTrigger className="h-7 w-24 text-[11px] font-semibold uppercase"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ALL of</SelectItem>
            <SelectItem value="any">ANY of</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" className="h-7 text-xs"
            onClick={() => replace([...items, { ...EMPTY_COND }])}>
            <Plus className="h-3 w-3 mr-1" /> Condition
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs"
            onClick={() => replace([...items, { all: [] }])}>
            <Plus className="h-3 w-3 mr-1" /> Group
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs"
            onClick={() => replace([...items, { not: { ...EMPTY_COND } }])}>
            <Plus className="h-3 w-3 mr-1" /> NOT
          </Button>
          {onDelete && (
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          )}
        </div>
      </div>
      <div className="pl-2 space-y-1.5">
        {items.length === 0 && <p className="text-[11px] text-muted-foreground italic">No conditions yet.</p>}
        {items.map((it, i) => (
          <Node
            key={i}
            expr={it}
            onChange={(v) => replace(items.map((x, j) => (j === i ? v : x)))}
            onDelete={() => replace(items.filter((_, j) => j !== i))}
            depth={depth + 1}
          />
        ))}
      </div>
    </div>
  );
}

export default function RuleBuilder({ value, onChange }: Props) {
  const [advanced, setAdvanced] = useState(false);
  const [raw, setRaw] = useState(() => JSON.stringify(value ?? { all: [] }, null, 2));
  const [rawError, setRawError] = useState<string | null>(null);

  const root: AbacExpression = value && Object.keys(value).length > 0 ? value : { all: [] };

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button size="sm" variant="ghost" className="h-7 text-xs"
          onClick={() => {
            if (!advanced) setRaw(JSON.stringify(root, null, 2));
            setAdvanced(!advanced);
          }}>
          <Code2 className="h-3 w-3 mr-1" /> {advanced ? "Visual" : "Advanced (JSON)"}
        </Button>
      </div>
      {advanced ? (
        <div className="space-y-1">
          <textarea
            className="w-full h-48 text-xs font-mono p-2 rounded border bg-background"
            value={raw}
            onChange={(e) => {
              setRaw(e.target.value);
              try {
                const parsed = JSON.parse(e.target.value) as AbacExpression;
                setRawError(null);
                onChange(parsed);
              } catch (err) {
                setRawError((err as Error).message);
              }
            }}
          />
          {rawError && <p className="text-[11px] text-destructive">{rawError}</p>}
        </div>
      ) : (
        <Node expr={root} onChange={onChange} depth={0} />
      )}
    </div>
  );
}
