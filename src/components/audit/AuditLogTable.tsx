/**
 * AuditLogTable — shared table for global (/admin/audit) and per-workflow audit views.
 * Pass workflowId to scope to a single workflow; omit for the global view (super admin).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ChevronDown, ChevronRight, Download, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AuditRow {
  id: string;
  ts: string;
  actor_user_id: string | null;
  actor_email: string | null;
  resource_type: string | null;
  resource_id: string | null;
  action: string;
  decision: string | null;
  reason: string | null;
  ip: string | null;
  metadata: Record<string, unknown> | null;
  workflow_id: string | null;
}

interface Props { workflowId?: string }

const PAGE = 50;

function toCsv(rows: AuditRow[]): string {
  const cols = ["ts","actor_email","action","resource_type","resource_id","decision","reason","ip","workflow_id"];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc((r as any)[c])).join(","))].join("\n");
}

export default function AuditLogTable({ workflowId }: Props) {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [actorFilter, setActorFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [decisionFilter, setDecisionFilter] = useState<string>("__any__");
  const [resourceFilter, setResourceFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("audit_events")
      .select("*", { count: "exact" })
      .order("ts", { ascending: false })
      .range(page * PAGE, page * PAGE + PAGE - 1);

    if (workflowId) q = q.eq("workflow_id", workflowId);
    if (actorFilter) q = q.ilike("actor_email", `%${actorFilter}%`);
    if (actionFilter) q = q.ilike("action", `%${actionFilter}%`);
    if (resourceFilter) q = q.ilike("resource_type", `%${resourceFilter}%`);
    if (decisionFilter !== "__any__") q = q.eq("decision", decisionFilter);

    const { data, count } = await q;
    setRows((data ?? []) as unknown as AuditRow[]);
    setTotal(count ?? 0);
    setLoading(false);
  }, [page, workflowId, actorFilter, actionFilter, decisionFilter, resourceFilter]);

  useEffect(() => { void load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE));
  const toggle = (id: string) => {
    const next = new Set(expanded);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpanded(next);
  };

  const exportCsv = () => {
    const blob = new Blob([toCsv(rows)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-${workflowId ?? "all"}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const decisionBadge = useMemo(() => (d: string | null) => {
    if (!d) return null;
    const v = d.toLowerCase();
    const variant = v === "allow" || v === "success" ? "default" : v === "deny" || v === "fail" ? "destructive" : "secondary";
    return <Badge variant={variant as any} className="text-[10px]">{d}</Badge>;
  }, []);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
        <Input placeholder="Actor email" value={actorFilter} onChange={(e) => { setPage(0); setActorFilter(e.target.value); }} className="h-8 text-xs" />
        <Input placeholder="Action" value={actionFilter} onChange={(e) => { setPage(0); setActionFilter(e.target.value); }} className="h-8 text-xs" />
        <Input placeholder="Resource type" value={resourceFilter} onChange={(e) => { setPage(0); setResourceFilter(e.target.value); }} className="h-8 text-xs" />
        <Select value={decisionFilter} onValueChange={(v) => { setPage(0); setDecisionFilter(v); }}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Decision" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__any__">Any decision</SelectItem>
            <SelectItem value="ALLOW">Allow</SelectItem>
            <SelectItem value="DENY">Deny</SelectItem>
            <SelectItem value="ERROR">Error</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" className="h-8 text-xs flex-1" onClick={() => load()}>
            <RefreshCw className="h-3 w-3 mr-1" /> Refresh
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={exportCsv}>
            <Download className="h-3 w-3 mr-1" /> CSV
          </Button>
        </div>
      </div>

      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-muted/50">
            <tr className="text-left text-[11px] text-muted-foreground">
              <th className="px-2 py-1.5 w-6"></th>
              <th className="px-2 py-1.5">When</th>
              <th className="px-2 py-1.5">Who</th>
              <th className="px-2 py-1.5">Action</th>
              <th className="px-2 py-1.5">Resource</th>
              <th className="px-2 py-1.5">Decision</th>
              <th className="px-2 py-1.5">IP</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-6 text-muted-foreground">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-6 text-muted-foreground">No events.</td></tr>
            ) : rows.map((r) => (
              <>
                <tr key={r.id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => toggle(r.id)}>
                  <td className="px-2 py-1.5">{expanded.has(r.id) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</td>
                  <td className="px-2 py-1.5 font-mono text-[11px]">{new Date(r.ts).toLocaleString()}</td>
                  <td className="px-2 py-1.5">{r.actor_email ?? r.actor_user_id ?? "—"}</td>
                  <td className="px-2 py-1.5"><code className="text-[11px]">{r.action}</code></td>
                  <td className="px-2 py-1.5">
                    {r.resource_type && <Badge variant="outline" className="text-[10px] mr-1">{r.resource_type}</Badge>}
                    <span className="text-[11px] text-muted-foreground">{r.resource_id}</span>
                  </td>
                  <td className="px-2 py-1.5">{decisionBadge(r.decision)}</td>
                  <td className="px-2 py-1.5 text-[11px] text-muted-foreground">{r.ip ?? "—"}</td>
                </tr>
                {expanded.has(r.id) && (
                  <tr key={r.id + "-d"} className="bg-muted/20">
                    <td></td>
                    <td colSpan={6} className="px-2 py-2">
                      {r.reason && <div className="mb-1"><span className="text-[10px] uppercase text-muted-foreground">Reason: </span>{r.reason}</div>}
                      <pre className="text-[10px] font-mono bg-background border rounded p-2 overflow-auto max-h-48">
                        {JSON.stringify(r.metadata ?? {}, null, 2)}
                      </pre>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{total} events</span>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" className="h-7 text-xs" disabled={page === 0} onClick={() => setPage(page - 1)}>Prev</Button>
          <span className="px-2 py-1">Page {page + 1} / {totalPages}</span>
          <Button size="sm" variant="outline" className="h-7 text-xs" disabled={page + 1 >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      </div>
    </div>
  );
}
