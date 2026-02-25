import { useState } from "react";
import { Plus, Trash2, Scale } from "lucide-react";
import type { CaseIR, JsonPatch, BusinessRule, BusinessRuleType } from "@/types/caseIr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

function uid() { return `rule_${Math.random().toString(36).slice(2, 8)}`; }

const RULE_TYPES: { value: BusinessRuleType; label: string }[] = [
  { value: "condition", label: "Condition" },
  { value: "validation", label: "Validation" },
  { value: "routing", label: "Routing" },
  { value: "sla", label: "SLA" },
];

const RULE_BADGE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  condition: "default",
  validation: "secondary",
  routing: "outline",
  sla: "destructive",
};

interface BusinessRulesPanelProps {
  caseIr: CaseIR;
  onPatch: (patch: JsonPatch) => void;
}

export default function BusinessRulesPanel({ caseIr, onPatch }: BusinessRulesPanelProps) {
  const rules = caseIr.businessRules ?? [];
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<BusinessRuleType>("condition");
  const [newExpr, setNewExpr] = useState("");

  const handleAdd = () => {
    if (!newName.trim()) return;
    const rule: BusinessRule = { id: uid(), name: newName.trim(), ruleType: newType, expression: newExpr.trim() };
    if (!caseIr.businessRules) {
      onPatch([{ op: "add", path: "/businessRules", value: [rule] }]);
    } else {
      onPatch([{ op: "add", path: "/businessRules/-", value: rule }]);
    }
    setNewName(""); setNewExpr(""); setNewType("condition"); setAdding(false);
  };

  const handleDelete = (idx: number) => {
    onPatch([{ op: "remove", path: `/businessRules/${idx}` }]);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Scale size={20} className="text-primary" /> Business Rules
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Define conditions, validations, SLAs and routing logic.</p>
        </div>
        <Button size="sm" onClick={() => setAdding(true)} disabled={adding}>
          <Plus size={14} /> Add Rule
        </Button>
      </div>

      {adding && (
        <div className="flex items-center gap-2 mb-4 p-3 rounded-lg border bg-muted/30 flex-wrap">
          <Input placeholder="Rule name" value={newName} onChange={e => setNewName(e.target.value)} className="max-w-[180px]" />
          <Select value={newType} onValueChange={v => setNewType(v as BusinessRuleType)}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {RULE_TYPES.map(rt => <SelectItem key={rt.value} value={rt.value}>{rt.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Expression" value={newExpr} onChange={e => setNewExpr(e.target.value)} className="max-w-[220px]" />
          <Button size="sm" onClick={handleAdd}>Save</Button>
          <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setNewName(""); setNewExpr(""); }}>Cancel</Button>
        </div>
      )}

      {rules.length === 0 && !adding ? (
        <div className="text-center py-12 text-muted-foreground text-sm border rounded-lg border-dashed">
          No business rules defined. Add one or ask the AI assistant.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Expression</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((r, i) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell>
                  <Badge variant={RULE_BADGE_VARIANT[r.ruleType] ?? "default"} className="text-[10px]">
                    {r.ruleType}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">{r.expression || "—"}</TableCell>
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
