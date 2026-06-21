import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { recordAudit } from "@/lib/authz/audit";

interface Row { id: string; name: string; description: string | null; }

export default function AdminTeamsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  const load = async () => {
    const { data } = await supabase.from("teams").select("id,name,description").order("name");
    setRows((data ?? []) as Row[]);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!name.trim()) return;
    const { error, data } = await supabase.from("teams").insert({ name: name.trim(), description: desc.trim() || null }).select().single();
    if (error) { toast.error(error.message); return; }
    await recordAudit({ action: "team.create", decision: "ALLOW", resource_type: "team", resource_id: data?.id });
    setName(""); setDesc(""); load();
  };

  const del = async (r: Row) => {
    if (!confirm(`Delete team "${r.name}"?`)) return;
    const { error } = await supabase.from("teams").delete().eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    await recordAudit({ action: "team.delete", decision: "ALLOW", resource_type: "team", resource_id: r.id, metadata: { name: r.name } });
    load();
  };

  return (
    <div>
      <h2 className="text-base font-semibold mb-3">Teams</h2>
      <div className="flex gap-2 mb-4 p-3 rounded-lg border bg-muted/30">
        <Input placeholder="Team name" value={name} onChange={e => setName(e.target.value)} className="max-w-xs" />
        <Input placeholder="Description (optional)" value={desc} onChange={e => setDesc(e.target.value)} />
        <Button onClick={add}><Plus size={14} /> Add</Button>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Description</TableHead><TableHead className="w-[60px]"></TableHead></TableRow></TableHeader>
        <TableBody>
          {rows.map(r => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">{r.name}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{r.description ?? "—"}</TableCell>
              <TableCell><Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => del(r)}><Trash2 size={13} className="text-destructive" /></Button></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
