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
  ChevronDown,
  ChevronRight,
  Plus,
  Copy,
  ArrowUp,
  ArrowDown,
  X,
  List,
  CircleDot,
  Type,
  AlignLeft,
  Calendar,
  CheckSquare,
  Hash,
  FileUp,
  LayoutList,
} from "lucide-react";
import { useState } from "react";
import type { QuestionType } from "@/types/questionnaire";

const TYPE_ICONS: Record<QuestionType, React.ReactNode> = {
  Dropdown: <List size={13} />,
  RadioButton: <CircleDot size={13} />,
  TextInput: <Type size={13} />,
  TextArea: <AlignLeft size={13} />,
  DatePicker: <Calendar size={13} />,
  MultiSelect: <CheckSquare size={13} />,
  NumberInput: <Hash size={13} />,
  FileUpload: <FileUp size={13} />,
};

export default function LeftPanel() {
  const {
    flow,
    questions,
    selectedQuestionId,
    setFlowField,
    addQuestion,
    addSection,
    duplicateQuestion,
    moveQuestion,
    selectQuestion,
    removeFirstQuestion,
  } = useQuestionnaireStore();

  const [settingsOpen, setSettingsOpen] = useState(true);
  const [questionsOpen, setQuestionsOpen] = useState(true);
  const [entryOpen, setEntryOpen] = useState(true);

  return (
    <div className="w-[280px] border-r border-border bg-card flex flex-col h-full flex-shrink-0">
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1">
          {/* Flow Settings */}
          <button
            className="flex items-center gap-1.5 w-full text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground py-1.5"
            onClick={() => setSettingsOpen(!settingsOpen)}
          >
            {settingsOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            Flow Settings
          </button>

          {settingsOpen && (
            <div className="space-y-2.5 pb-3">
              <div>
                <Label className="text-[11px]">Flow Name</Label>
                <Input
                  className="h-7 text-[12px] mt-1"
                  value={flow.flowName}
                  onChange={(e) => setFlowField("flowName", e.target.value)}
                />
              </div>
              <div>
                <Label className="text-[11px]">Flow ID</Label>
                <Input
                  className="h-7 text-[12px] mt-1 font-mono"
                  value={flow.flowId}
                  onChange={(e) => setFlowField("flowId", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px]">Category</Label>
                  <Input
                    className="h-7 text-[12px] mt-1"
                    value={flow.category}
                    onChange={(e) => setFlowField("category", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-[11px]">Sub Category</Label>
                  <Input
                    className="h-7 text-[12px] mt-1"
                    value={flow.subCategory}
                    onChange={(e) => setFlowField("subCategory", e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label className="text-[11px]">Status</Label>
                <Select
                  value={flow.status}
                  onValueChange={(v) => setFlowField("status", v)}
                >
                  <SelectTrigger className="h-7 text-[12px] mt-1">
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
                <Label className="text-[11px]">Tags (comma-separated)</Label>
                <Input
                  className="h-7 text-[12px] mt-1"
                  value={flow.tags.join(", ")}
                  onChange={(e) =>
                    setFlowField(
                      "tags",
                      e.target.value.split(",").map((t) => t.trim()).filter(Boolean)
                    )
                  }
                />
              </div>
            </div>
          )}

          {/* Separator */}
          <div className="h-px bg-border" />

          {/* Questions List */}
          <div className="flex items-center justify-between pt-1">
            <button
              className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground py-1.5"
              onClick={() => setQuestionsOpen(!questionsOpen)}
            >
              {questionsOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              Questions ({questions.length})
            </button>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => addQuestion()}
                title="Add Question"
              >
                <Plus size={12} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={addSection}
                title="Add Section"
              >
                <LayoutList size={12} />
              </Button>
            </div>
          </div>

          {questionsOpen && (
            <div className="space-y-0.5 pb-3">
              {questions.length === 0 && (
                <p className="text-[11px] text-muted-foreground italic px-2 py-3">
                  No questions yet. Click + to add one.
                </p>
              )}
              {questions.map((q, idx) => {
                const isSelected = q.questionId === selectedQuestionId;
                const isEntry = flow.firstQuestions.includes(q.questionId);
                const branchCount = Object.keys(q._branches ?? {}).filter(
                  (k) => (q._branches?.[k]?.nextEntityType ?? "none") !== "none"
                ).length;

                return (
                  <div
                    key={q.questionId}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer text-[11px] transition-colors group ${
                      isSelected
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "hover:bg-muted/60 border border-transparent"
                    }`}
                    onClick={() => selectQuestion(q.questionId)}
                  >
                    <span className="text-muted-foreground flex-shrink-0">
                      {TYPE_ICONS[q.questionType]}
                    </span>
                    <span className="truncate flex-1 font-medium">
                      {q.content || "Untitled"}
                    </span>
                    {isEntry && (
                      <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 bg-primary/15 text-primary">
                        EP
                      </Badge>
                    )}
                    {branchCount > 0 && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                        {branchCount}B
                      </Badge>
                    )}
                    <div className="hidden group-hover:flex gap-0.5">
                      <button
                        className="p-0.5 hover:text-primary"
                        onClick={(e) => { e.stopPropagation(); duplicateQuestion(q.questionId); }}
                        title="Duplicate"
                      >
                        <Copy size={10} />
                      </button>
                      {idx > 0 && (
                        <button
                          className="p-0.5 hover:text-primary"
                          onClick={(e) => { e.stopPropagation(); moveQuestion(q.questionId, "up"); }}
                        >
                          <ArrowUp size={10} />
                        </button>
                      )}
                      {idx < questions.length - 1 && (
                        <button
                          className="p-0.5 hover:text-primary"
                          onClick={(e) => { e.stopPropagation(); moveQuestion(q.questionId, "down"); }}
                        >
                          <ArrowDown size={10} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Separator */}
          <div className="h-px bg-border" />

          {/* First Questions (Entry Points) */}
          <button
            className="flex items-center gap-1.5 w-full text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground py-1.5"
            onClick={() => setEntryOpen(!entryOpen)}
          >
            {entryOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            Entry Points ({flow.firstQuestions.length})
          </button>

          {entryOpen && (
            <div className="space-y-1 pb-3">
              {flow.firstQuestions.length === 0 && (
                <p className="text-[11px] text-muted-foreground italic px-2 py-2">
                  No entry points. Mark questions as "Entry Point" in the editor.
                </p>
              )}
              {flow.firstQuestions.map((fqId) => {
                const q = questions.find((q) => q.questionId === fqId);
                return (
                  <div
                    key={fqId}
                    className="flex items-center gap-2 px-2 py-1 rounded-md bg-primary/5 text-[11px]"
                  >
                    <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 bg-primary/15 text-primary">
                      EP
                    </Badge>
                    <span className="truncate flex-1">
                      {q?.content || fqId}
                    </span>
                    <button
                      className="p-0.5 text-muted-foreground hover:text-destructive"
                      onClick={() => removeFirstQuestion(fqId)}
                    >
                      <X size={10} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
