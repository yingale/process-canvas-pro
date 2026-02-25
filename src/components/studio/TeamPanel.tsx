import { useState } from "react";
import { Plus, Trash2, Users } from "lucide-react";
import type { CaseIR, JsonPatch, TeamMember } from "@/types/caseIr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

function uid() { return `tm_${Math.random().toString(36).slice(2, 8)}`; }

interface TeamPanelProps {
  caseIr: CaseIR;
  onPatch: (patch: JsonPatch) => void;
}

export default function TeamPanel({ caseIr, onPatch }: TeamPanelProps) {
  const members = caseIr.teamMembers ?? [];
  const personas = caseIr.personas ?? [];
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newDept, setNewDept] = useState("");

  const handleAdd = () => {
    if (!newName.trim()) return;
    const member: TeamMember = { id: uid(), name: newName.trim(), email: newEmail.trim(), department: newDept.trim() };
    if (!caseIr.teamMembers) {
      onPatch([{ op: "add", path: "/teamMembers", value: [member] }]);
    } else {
      onPatch([{ op: "add", path: "/teamMembers/-", value: member }]);
    }
    setNewName(""); setNewEmail(""); setNewDept(""); setAdding(false);
  };

  const handleDelete = (idx: number) => {
    onPatch([{ op: "remove", path: `/teamMembers/${idx}` }]);
  };

  const getPersonaName = (personaId?: string) => {
    if (!personaId) return "—";
    return personas.find(p => p.id === personaId)?.name ?? "—";
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Users size={20} className="text-primary" /> Team Members
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Assign people to workflow roles.</p>
        </div>
        <Button size="sm" onClick={() => setAdding(true)} disabled={adding}>
          <Plus size={14} /> Add Member
        </Button>
      </div>

      {adding && (
        <div className="flex items-center gap-2 mb-4 p-3 rounded-lg border bg-muted/30">
          <Input placeholder="Name" value={newName} onChange={e => setNewName(e.target.value)} className="max-w-[160px]" />
          <Input placeholder="Email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="max-w-[200px]" />
          <Input placeholder="Department" value={newDept} onChange={e => setNewDept(e.target.value)} className="max-w-[140px]" />
          <Button size="sm" onClick={handleAdd}>Save</Button>
          <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setNewName(""); setNewEmail(""); setNewDept(""); }}>Cancel</Button>
        </div>
      )}

      {members.length === 0 && !adding ? (
        <div className="text-center py-12 text-muted-foreground text-sm border rounded-lg border-dashed">
          No team members assigned yet. Add one or ask the AI assistant.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Persona</TableHead>
              <TableHead>Department</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m, i) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.name}</TableCell>
                <TableCell>{m.email || "—"}</TableCell>
                <TableCell>{getPersonaName(m.personaId)}</TableCell>
                <TableCell>{m.department || "—"}</TableCell>
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
