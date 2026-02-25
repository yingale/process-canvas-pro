import { useState } from "react";
import { Plus, Trash2, Shield } from "lucide-react";
import type { CaseIR, JsonPatch, Persona } from "@/types/caseIr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

function uid() { return `persona_${Math.random().toString(36).slice(2, 8)}`; }

interface PersonasPanelProps {
  caseIr: CaseIR;
  onPatch: (patch: JsonPatch) => void;
}

export default function PersonasPanel({ caseIr, onPatch }: PersonasPanelProps) {
  const personas = caseIr.personas ?? [];
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("");

  const handleAdd = () => {
    if (!newName.trim()) return;
    const persona: Persona = { id: uid(), name: newName.trim(), role: newRole.trim(), permissions: [] };
    if (!caseIr.personas) {
      onPatch([{ op: "add", path: "/personas", value: [persona] }]);
    } else {
      onPatch([{ op: "add", path: "/personas/-", value: persona }]);
    }
    setNewName(""); setNewRole(""); setAdding(false);
  };

  const handleDelete = (idx: number) => {
    onPatch([{ op: "remove", path: `/personas/${idx}` }]);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Shield size={20} className="text-primary" /> Personas
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Define roles and permissions for your workflow participants.</p>
        </div>
        <Button size="sm" onClick={() => setAdding(true)} disabled={adding}>
          <Plus size={14} /> Add Persona
        </Button>
      </div>

      {adding && (
        <div className="flex items-center gap-2 mb-4 p-3 rounded-lg border bg-muted/30">
          <Input placeholder="Name" value={newName} onChange={e => setNewName(e.target.value)} className="max-w-[200px]" />
          <Input placeholder="Role" value={newRole} onChange={e => setNewRole(e.target.value)} className="max-w-[200px]" />
          <Button size="sm" onClick={handleAdd}>Save</Button>
          <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setNewName(""); setNewRole(""); }}>Cancel</Button>
        </div>
      )}

      {personas.length === 0 && !adding ? (
        <div className="text-center py-12 text-muted-foreground text-sm border rounded-lg border-dashed">
          No personas defined yet. Add one or ask the AI assistant.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {personas.map((p, i) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>{p.role}</TableCell>
                <TableCell>
                  {p.permissions.length > 0 ? p.permissions.map(perm => (
                    <Badge key={perm} variant="secondary" className="mr-1 text-[10px]">{perm}</Badge>
                  )) : <span className="text-muted-foreground text-xs">—</span>}
                </TableCell>
                <TableCell>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(i)}>
                    <Trash2 size={13} className="text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
