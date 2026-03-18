import { useQuestionnaireStore } from "@/stores/questionnaireStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronRight,
  Settings,
  List,
  CircleDot,
  Type,
  AlignLeft,
  Calendar,
  CheckSquare,
  Hash,
  FileUp,
  GitBranch,
} from "lucide-react";
import { useState } from "react";
import type { QuestionType } from "@/types/questionnaire";

const TYPE_ICONS: Record<QuestionType, React.ReactNode> = {
  Dropdown: <List size={12} />,
  RadioButton: <CircleDot size={12} />,
  TextInput: <Type size={12} />,
  TextArea: <AlignLeft size={12} />,
  DatePicker: <Calendar size={12} />,
  MultiSelect: <CheckSquare size={12} />,
  NumberInput: <Hash size={12} />,
  FileUpload: <FileUp size={12} />,
};

interface LeftPanelProps {
  expandedId: string | null;
  onSelectQuestion: (id: string) => void;
}

export default function LeftPanel({ expandedId, onSelectQuestion }: LeftPanelProps) {
  const { flow, questions, setFlowField } = useQuestionnaireStore();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="w-[220px] border-r border-border bg-card flex flex-col h-full flex-shrink-0">
      <div className="px-3 py-2 border-b border-border">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Navigator</h3>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {/* Flow Settings (collapsible) */}
          <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-1.5 w-full text-left text-[11px] font-semibold text-muted-foreground hover:text-foreground py-1.5 px-1 rounded-md hover:bg-muted/50 transition-colors">
                <Settings size={11} />
                Flow Settings
                {settingsOpen ? <ChevronDown size={11} className="ml-auto" /> : <ChevronRight size={11} className="ml-auto" />}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 px-1 pt-1 pb-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">Flow Name</Label>
                <Input className="h-6 text-[11px] mt-0.5" value={flow.flowName} onChange={(e) => setFlowField("flowName", e.target.value)} />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Flow ID</Label>
                <Input className="h-6 text-[11px] mt-0.5 font-mono" value={flow.flowId} onChange={(e) => setFlowField("flowId", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <Label className="text-[10px] text-muted-foreground">Category</Label>
                  <Input className="h-6 text-[11px] mt-0.5" value={flow.category} onChange={(e) => setFlowField("category", e.target.value)} />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Sub Cat.</Label>
                  <Input className="h-6 text-[11px] mt-0.5" value={flow.subCategory} onChange={(e) => setFlowField("subCategory", e.target.value)} />
                </div>
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Status</Label>
                <Select value={flow.status} onValueChange={(v) => setFlowField("status", v)}>
                  <SelectTrigger className="h-6 text-[11px] mt-0.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Published">Published</SelectItem>
                    <SelectItem value="Archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Tags</Label>
                <Input
                  className="h-6 text-[11px] mt-0.5"
                  value={flow.tags.join(", ")}
                  onChange={(e) => setFlowField("tags", e.target.value.split(",").map((t: string) => t.trim()).filter(Boolean))}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="h-px bg-border my-1" />

          {/* Question outline */}
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1 py-1">
            Questions ({questions.length})
          </div>

          {questions.length === 0 && (
            <p className="text-[10px] text-muted-foreground italic px-1 py-2">No questions yet.</p>
          )}

          {questions.map((q, idx) => {
            const isActive = q.questionId === expandedId;
            const isEntry = flow.firstQuestions.includes(q.questionId);
            const branchCount = Object.keys(q._branches ?? {}).filter(
              (k) => (q._branches?.[k]?.nextEntityType ?? "none") !== "none"
            ).length;

            return (
              <button
                key={q.questionId}
                className={`flex items-center gap-1.5 w-full text-left px-1.5 py-1.5 rounded-md text-[11px] transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "hover:bg-muted/50 border border-transparent"
                }`}
                onClick={() => onSelectQuestion(q.questionId)}
              >
                <span className="text-[10px] font-mono text-muted-foreground w-4 text-right flex-shrink-0">{idx + 1}</span>
                <span className="text-muted-foreground flex-shrink-0">{TYPE_ICONS[q.questionType]}</span>
                <span className="truncate flex-1 font-medium">{q.content || "Untitled"}</span>
                {isEntry && (
                  <Badge variant="secondary" className="text-[8px] px-1 py-0 h-3.5 bg-primary/10 text-primary flex-shrink-0">EP</Badge>
                )}
                {branchCount > 0 && (
                  <span className="flex-shrink-0 text-muted-foreground">
                    <GitBranch size={9} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
