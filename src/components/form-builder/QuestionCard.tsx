import { useState } from "react";
import { useQuestionnaireStore } from "@/stores/questionnaireStore";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  GripVertical,
  Plus,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Settings2,
  GitBranch,
  List,
  CircleDot,
  Type,
  AlignLeft,
  Calendar,
  CheckSquare,
  Hash,
  FileUp,
} from "lucide-react";
import type { Question, QuestionType, OptionBranch } from "@/types/questionnaire";

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: "Dropdown", label: "Dropdown" },
  { value: "RadioButton", label: "Radio Button" },
  { value: "TextInput", label: "Text Input" },
  { value: "TextArea", label: "Text Area" },
  { value: "DatePicker", label: "Date Picker" },
  { value: "MultiSelect", label: "Multi Select" },
  { value: "NumberInput", label: "Number Input" },
  { value: "FileUpload", label: "File Upload" },
];

const TYPE_ICONS: Record<QuestionType, React.ReactNode> = {
  Dropdown: <List size={14} />,
  RadioButton: <CircleDot size={14} />,
  TextInput: <Type size={14} />,
  TextArea: <AlignLeft size={14} />,
  DatePicker: <Calendar size={14} />,
  MultiSelect: <CheckSquare size={14} />,
  NumberInput: <Hash size={14} />,
  FileUpload: <FileUp size={14} />,
};

const HAS_OPTIONS: QuestionType[] = ["Dropdown", "RadioButton", "MultiSelect"];

interface QuestionCardProps {
  question: Question;
  index: number;
  total: number;
  isExpanded: boolean;
  onToggle: () => void;
}

export default function QuestionCard({ question, index, total, isExpanded, onToggle }: QuestionCardProps) {
  const {
    flow,
    questions,
    updateQuestion,
    removeQuestion,
    duplicateQuestion,
    moveQuestion,
    addOption,
    updateOption,
    removeOption,
    toggleFirstQuestion,
    setBranch,
  } = useQuestionnaireStore();

  const [advancedOpen, setAdvancedOpen] = useState(false);

  const isEntry = flow.firstQuestions.includes(question.questionId);
  const showOptions = HAS_OPTIONS.includes(question.questionType);
  const branchCount = Object.keys(question._branches ?? {}).filter(
    (k) => (question._branches?.[k]?.nextEntityType ?? "none") !== "none"
  ).length;

  // Collapsed view
  if (!isExpanded) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-card hover:border-primary/30 hover:shadow-sm cursor-pointer transition-all group"
        onClick={onToggle}
      >
        <GripVertical size={14} className="text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        <span className="text-muted-foreground flex-shrink-0 w-5 text-center text-[11px] font-mono">{index + 1}</span>
        <span className="text-muted-foreground flex-shrink-0">{TYPE_ICONS[question.questionType]}</span>
        <span className="text-[13px] font-medium text-foreground truncate flex-1">
          {question.content || <span className="text-muted-foreground italic">Untitled question</span>}
        </span>
        {isEntry && (
          <Badge variant="secondary" className="text-[9px] px-1.5 h-4 bg-primary/10 text-primary border-primary/20 flex-shrink-0">
            EP
          </Badge>
        )}
        {branchCount > 0 && (
          <Badge variant="outline" className="text-[9px] px-1.5 h-4 flex-shrink-0">
            <GitBranch size={9} className="mr-0.5" /> {branchCount}
          </Badge>
        )}
        <ChevronRight size={14} className="text-muted-foreground flex-shrink-0" />
      </div>
    );
  }

  // Expanded view
  return (
    <div className="rounded-lg border-2 border-primary/30 bg-card shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border-b border-border">
        <GripVertical size={14} className="text-muted-foreground flex-shrink-0 cursor-grab" />
        <span className="text-[11px] font-mono text-muted-foreground">{index + 1}</span>
        <span className="text-muted-foreground flex-shrink-0">{TYPE_ICONS[question.questionType]}</span>
        <span className="text-[13px] font-semibold text-foreground flex-1 truncate">
          {question.content || "Untitled question"}
        </span>
        {isEntry && (
          <Badge variant="secondary" className="text-[9px] px-1.5 h-4 bg-primary/10 text-primary border-primary/20">EP</Badge>
        )}
        <div className="flex items-center gap-0.5">
          {index > 0 && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveQuestion(question.questionId, "up")}>
              <ArrowUp size={12} />
            </Button>
          )}
          {index < total - 1 && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveQuestion(question.questionId, "down")}>
              <ArrowDown size={12} />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => duplicateQuestion(question.questionId)}>
            <Copy size={12} />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => removeQuestion(question.questionId)}>
            <Trash2 size={12} />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onToggle}>
            <ChevronDown size={14} />
          </Button>
        </div>
      </div>

      {/* Card body */}
      <div className="p-4 space-y-3">
        {/* Core: Type + Label */}
        <div className="grid grid-cols-[140px_1fr] gap-3">
          <div>
            <Label className="text-[11px] text-muted-foreground">Type</Label>
            <Select
              value={question.questionType}
              onValueChange={(v) => updateQuestion(question.questionId, { questionType: v as QuestionType })}
            >
              <SelectTrigger className="h-8 text-[12px] mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUESTION_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Question Label</Label>
            <Input
              className="h-8 text-[12px] mt-1"
              value={question.content}
              onChange={(e) => updateQuestion(question.questionId, { content: e.target.value })}
              placeholder="Enter your question text..."
              autoFocus
            />
          </div>
        </div>

        {/* Help text */}
        <div>
          <Label className="text-[11px] text-muted-foreground">Help Text</Label>
          <Input
            className="h-8 text-[12px] mt-1"
            value={question.contentAbstract}
            onChange={(e) => updateQuestion(question.questionId, { contentAbstract: e.target.value })}
            placeholder="Optional description..."
          />
        </div>

        {/* Mandatory + Entry Point */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id={`mandatory-${question.questionId}`}
              checked={question.mandatory === "True"}
              onCheckedChange={(v) => updateQuestion(question.questionId, { mandatory: v ? "True" : "False" })}
            />
            <label htmlFor={`mandatory-${question.questionId}`} className="text-[12px] cursor-pointer">Required</label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id={`entry-${question.questionId}`}
              checked={isEntry}
              onCheckedChange={() => toggleFirstQuestion(question.questionId)}
            />
            <label htmlFor={`entry-${question.questionId}`} className="text-[12px] cursor-pointer">Entry Point</label>
          </div>
        </div>

        {/* Options + Inline Branching */}
        {showOptions && (
          <div className="border border-border rounded-lg p-3 space-y-2 bg-muted/20">
            <div className="flex items-center justify-between">
              <h4 className="text-[12px] font-semibold text-foreground">Options</h4>
              <Button variant="ghost" size="sm" className="h-6 text-[11px]" onClick={() => addOption(question.questionId)}>
                <Plus size={11} className="mr-1" /> Add
              </Button>
            </div>

            {question.options.length === 0 && (
              <p className="text-[11px] text-muted-foreground italic py-2">No options yet. Click "+ Add" to create one.</p>
            )}

            {question.options.map((opt, idx) => {
              const branch = question._branches?.[opt.id];
              const branchType = branch?.nextEntityType ?? "none";
              const hasBranch = branchType !== "none";

              return (
                <div key={opt.id} className="space-y-1.5">
                  {/* Option row */}
                  <div className="flex items-center gap-2 p-2 rounded-md bg-card border border-border/50">
                    <GripVertical size={11} className="text-muted-foreground flex-shrink-0 cursor-grab" />
                    <Input
                      className="h-7 text-[11px] w-20 font-mono flex-shrink-0"
                      value={opt.id}
                      onChange={(e) => updateOption(question.questionId, idx, "id", e.target.value)}
                      placeholder="ID"
                    />
                    <Input
                      className="h-7 text-[11px] flex-1"
                      value={opt.display}
                      onChange={(e) => updateOption(question.questionId, idx, "display", e.target.value)}
                      placeholder="Display text"
                    />
                    <Checkbox
                      checked={opt.default ?? false}
                      onCheckedChange={(v) => updateOption(question.questionId, idx, "default", v)}
                      title="Default"
                    />
                    {/* Branch toggle */}
                    <Button
                      variant={hasBranch ? "secondary" : "ghost"}
                      size="icon"
                      className={`h-6 w-6 flex-shrink-0 ${hasBranch ? "text-primary" : "text-muted-foreground"}`}
                      title="Configure branching"
                      onClick={() => {
                        if (hasBranch) {
                          setBranch(question.questionId, opt.id, { id: opt.id, nextEntityType: "none", targetId: "" });
                        } else {
                          setBranch(question.questionId, opt.id, { id: opt.id, nextEntityType: "question", targetId: "" });
                        }
                      }}
                    >
                      <GitBranch size={11} />
                    </Button>
                    <button
                      className="p-1 text-muted-foreground hover:text-destructive flex-shrink-0"
                      onClick={() => removeOption(question.questionId, idx)}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>

                  {/* Inline branch config */}
                  {hasBranch && (
                    <div className="ml-6 pl-3 border-l-2 border-primary/20 flex items-center gap-2 py-1">
                      <GitBranch size={10} className="text-primary flex-shrink-0" />
                      <Select
                        value={branchType}
                        onValueChange={(v) => {
                          setBranch(question.questionId, opt.id, {
                            id: opt.id,
                            nextEntityType: v as OptionBranch["nextEntityType"],
                            targetId: branch?.targetId ?? "",
                          });
                        }}
                      >
                        <SelectTrigger className="h-6 text-[10px] w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="question">Go to Question</SelectItem>
                          <SelectItem value="end">End Flow</SelectItem>
                          <SelectItem value="subprocess">Subprocess</SelectItem>
                        </SelectContent>
                      </Select>

                      {branchType === "question" && (
                        <Select
                          value={branch?.targetId ?? ""}
                          onValueChange={(v) => {
                            setBranch(question.questionId, opt.id, { id: opt.id, nextEntityType: "question", targetId: v });
                          }}
                        >
                          <SelectTrigger className="h-6 text-[10px] flex-1">
                            <SelectValue placeholder="Select question..." />
                          </SelectTrigger>
                          <SelectContent>
                            {questions.filter((q) => q.questionId !== question.questionId).map((q) => (
                              <SelectItem key={q.questionId} value={q.questionId}>
                                {q.content || q.questionId}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      {branchType === "end" && (
                        <Input
                          className="h-6 text-[10px] flex-1 font-mono"
                          value={branch?.targetId ?? ""}
                          onChange={(e) => setBranch(question.questionId, opt.id, { id: opt.id, nextEntityType: "end", targetId: e.target.value })}
                          placeholder="e.g., end-approved"
                        />
                      )}

                      {branchType === "subprocess" && (
                        <Input
                          className="h-6 text-[10px] flex-1 font-mono"
                          value={branch?.targetId ?? ""}
                          onChange={(e) => setBranch(question.questionId, opt.id, { id: opt.id, nextEntityType: "subprocess", targetId: e.target.value })}
                          placeholder="e.g., INVESTIGATION_WF1"
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Advanced fields toggle */}
        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 text-[11px] text-muted-foreground w-full justify-start">
              <Settings2 size={12} className="mr-1.5" />
              Advanced Settings
              {advancedOpen ? <ChevronDown size={12} className="ml-auto" /> : <ChevronRight size={12} className="ml-auto" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2.5 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] text-muted-foreground">Question ID</Label>
                <Input
                  className="h-7 text-[11px] mt-1 font-mono"
                  value={question.questionId}
                  onChange={(e) => updateQuestion(question.questionId, { questionId: e.target.value, _id: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground">Default Value</Label>
                <Input
                  className="h-7 text-[11px] mt-1"
                  value={question.default}
                  onChange={(e) => updateQuestion(question.questionId, { default: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] text-muted-foreground">Category</Label>
                <Input
                  className="h-7 text-[11px] mt-1"
                  value={question.category}
                  onChange={(e) => updateQuestion(question.questionId, { category: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground">Subcategory</Label>
                <Input
                  className="h-7 text-[11px] mt-1"
                  value={question.subcategory}
                  onChange={(e) => updateQuestion(question.questionId, { subcategory: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] text-muted-foreground">Access Roles</Label>
                <Input
                  className="h-7 text-[11px] mt-1"
                  value={question.accessRoles}
                  onChange={(e) => updateQuestion(question.questionId, { accessRoles: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground">Tags (comma-separated)</Label>
                <Input
                  className="h-7 text-[11px] mt-1"
                  value={question.tags.join(", ")}
                  onChange={(e) => updateQuestion(question.questionId, { tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
