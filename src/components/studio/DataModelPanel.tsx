import { useState } from "react";
import { Plus, Trash2, Database } from "lucide-react";
import type { CaseIR, JsonPatch, DataField, DataFieldType } from "@/types/caseIr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

function uid() { return `field_${Math.random().toString(36).slice(2, 8)}`; }

const DATA_TYPES: DataFieldType[] = ["string", "number", "boolean", "date", "object", "array"];

interface DataModelPanelProps {
  caseIr: CaseIR;
  onPatch: (patch: JsonPatch) => void;
}

export default function DataModelPanel({ caseIr, onPatch }: DataModelPanelProps) {
  const fields = caseIr.dataModel ?? [];
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<DataFieldType>("string");
  const [newReq, setNewReq] = useState(false);

  const handleAdd = () => {
    if (!newName.trim()) return;
    const field: DataField = { id: uid(), name: newName.trim(), dataType: newType, required: newReq };
    if (!caseIr.dataModel) {
      onPatch([{ op: "add", path: "/dataModel", value: [field] }]);
    } else {
      onPatch([{ op: "add", path: "/dataModel/-", value: field }]);
    }
    setNewName(""); setNewType("string"); setNewReq(false); setAdding(false);
  };

  const handleDelete = (idx: number) => {
    onPatch([{ op: "remove", path: `/dataModel/${idx}` }]);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Database size={20} className="text-primary" /> Data Model
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Define the data fields your workflow uses.</p>
        </div>
        <Button size="sm" onClick={() => setAdding(true)} disabled={adding}>
          <Plus size={14} /> Add Field
        </Button>
      </div>

      {adding && (
        <div className="flex items-center gap-2 mb-4 p-3 rounded-lg border bg-muted/30">
          <Input placeholder="Field name" value={newName} onChange={e => setNewName(e.target.value)} className="max-w-[180px]" />
          <Select value={newType} onValueChange={v => setNewType(v as DataFieldType)}>
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DATA_TYPES.map(dt => <SelectItem key={dt} value={dt}>{dt}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1.5">
            <Checkbox checked={newReq} onCheckedChange={v => setNewReq(!!v)} id="req-check" />
            <label htmlFor="req-check" className="text-xs text-muted-foreground">Required</label>
          </div>
          <Button size="sm" onClick={handleAdd}>Save</Button>
          <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setNewName(""); }}>Cancel</Button>
        </div>
      )}

      {fields.length === 0 && !adding ? (
        <div className="text-center py-12 text-muted-foreground text-sm border rounded-lg border-dashed">
          No data fields defined. Add one or ask the AI assistant.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Required</TableHead>
              <TableHead>Default</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((f, i) => (
              <TableRow key={f.id}>
                <TableCell className="font-medium">{f.name}</TableCell>
                <TableCell><Badge variant="outline" className="text-[10px] font-mono">{f.dataType}</Badge></TableCell>
                <TableCell>{f.required ? "✓" : "—"}</TableCell>
                <TableCell className="text-xs">{f.defaultValue || "—"}</TableCell>
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
