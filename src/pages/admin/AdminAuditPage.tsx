import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";
import { Can } from "@/components/authz/Can";

interface AuditRow {
  id: string; ts: string; actor_email: string | null; action: string;
  decision: "ALLOW" | "DENY" | null; reason: string | null;
  resource_type: string | null; resource_id: string | null; metadata: Record<string, unknown>;
}

export default function AdminAuditPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("audit_events")
      .select("id,ts,actor_email,action,decision,reason,resource_type,resource_id,metadata")
      .order("ts", { ascending: false }).limit(500);
    setRows((data ?? []) as AuditRow[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = rows.filter(r => {
    if (!filter.trim()) return true;
    const q = filter.toLowerCase();
    return (r.actor_email ?? "").toLowerCase().includes(q)
      || r.action.toLowerCase().includes(q)
      || (r.resource_type ?? "").toLowerCase().includes(q)
      || (r.resource_id ?? "").toLowerCase().includes(q);
  });

  const exportCsv = () => {
    const header = ["ts","actor","action","decision","resource_type","resource_id","reason"];
    const csv = [header.join(",")].concat(filtered.map(r =>
      [r.ts, r.actor_email ?? "", r.action, r.decision ?? "", r.resource_type ?? "", r.resource_id ?? "", (r.reason ?? "").replace(/[\n,"]/g, " ")]
        .map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")
    )).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `audit-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold">Audit Log</h2>
        <div className="flex gap-2">
          <Input placeholder="Filter by user / action / resource…" className="w-72" value={filter} onChange={e => setFilter(e.target.value)} />
          <Can perm="audit.export">
            <Button size="sm" variant="outline" onClick={exportCsv}><Download size={14} /> Export CSV</Button>
          </Can>
        </div>
      </div>
      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead><TableHead>Actor</TableHead><TableHead>Action</TableHead>
              <TableHead>Decision</TableHead><TableHead>Resource</TableHead><TableHead>Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground text-sm py-8">No events</TableCell></TableRow>
            ) : filtered.map(r => (
              <TableRow key={r.id}>
                <TableCell className="text-xs whitespace-nowrap">{new Date(r.ts).toLocaleString()}</TableCell>
                <TableCell className="text-xs">{r.actor_email ?? "—"}</TableCell>
                <TableCell className="text-xs"><code>{r.action}</code></TableCell>
                <TableCell>{r.decision ? <Badge variant={r.decision === "DENY" ? "destructive" : "secondary"} className="text-[10px]">{r.decision}</Badge> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                <TableCell className="text-xs">{r.resource_type ? `${r.resource_type}${r.resource_id ? ` / ${r.resource_id.slice(0,8)}…` : ""}` : "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[280px] truncate">{r.reason ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
