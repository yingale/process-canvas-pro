import { useQuestionnaireStore } from "@/stores/questionnaireStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  GripVertical,
  FileUp,
  Pencil,
} from "lucide-react";
import type { QuestionType } from "@/types/questionnaire";

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

const HAS_OPTIONS: QuestionType[] = ["Dropdown", "RadioButton", "MultiSelect"];

interface CenterPanelProps {
  onImport: () => void;
}

export default function CenterPanel({ onImport }: CenterPanelProps) {
  const {
    questions,
    selectedQuestionId,
    flow,
    addQuestion,
    updateQuestion,
    removeQuestion,
    addOption,
    updateOption,
    removeOption,
    toggleFirstQuestion,
  } = useQuestionnaireStore();

  const selected = questions.find((q) => q.questionId === selectedQuestionId);

  // Empty state
  if (!selected) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Pencil size={28} className="text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Start Building Your Form</h2>
            <p className="text-[13px] text-muted-foreground mt-1">
              Add questions to begin designing your questionnaire flow.
            </p>
          </div>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => addQuestion()} size="sm">
              <Plus size={14} className="mr-1" /> Add Question
            </Button>
            <Button onClick={onImport} variant="outline" size="sm">
              <FileUp size={14} className="mr-1" /> Import JSON
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isEntry = flow.firstQuestions.includes(selected.questionId);
  const showOptions = HAS_OPTIONS.includes(selected.questionType);

  return (
    <div className="flex-1 flex flex-col bg-muted/20 h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <h2 className="text-[14px] font-bold text-foreground">Edit Question</h2>
          <Badge variant="outline" className="text-[10px] font-mono">
            {selected.questionId}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 text-[11px]"
          onClick={() => removeQuestion(selected.questionId)}
        >
          <Trash2 size={12} className="mr-1" /> Delete
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-5 space-y-4 max-w-2xl">
          {/* Core Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px]">Question ID</Label>
              <Input
                className="h-8 text-[12px] mt-1 font-mono"
                value={selected.questionId}
                onChange={(e) =>
                  updateQuestion(selected.questionId, {
                    questionId: e.target.value,
                    _id: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label className="text-[11px]">Question Type</Label>
              <Select
                value={selected.questionType}
                onValueChange={(v) =>
                  updateQuestion(selected.questionId, { questionType: v as QuestionType })
                }
              >
                <SelectTrigger className="h-8 text-[12px] mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUESTION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-[11px]">Label / Content</Label>
            <Input
              className="h-8 text-[12px] mt-1"
              value={selected.content}
              onChange={(e) =>
                updateQuestion(selected.questionId, { content: e.target.value })
              }
              placeholder="Enter question text..."
            />
          </div>

          <div>
            <Label className="text-[11px]">Description / Help Text</Label>
            <Input
              className="h-8 text-[12px] mt-1"
              value={selected.contentAbstract}
              onChange={(e) =>
                updateQuestion(selected.questionId, { contentAbstract: e.target.value })
              }
              placeholder="Optional help text..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px]">Category</Label>
              <Input
                className="h-8 text-[12px] mt-1"
                value={selected.category}
                onChange={(e) =>
                  updateQuestion(selected.questionId, { category: e.target.value })
                }
              />
            </div>
            <div>
              <Label className="text-[11px]">Subcategory</Label>
              <Input
                className="h-8 text-[12px] mt-1"
                value={selected.subcategory}
                onChange={(e) =>
                  updateQuestion(selected.questionId, { subcategory: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px]">Mandatory</Label>
              <Select
                value={selected.mandatory}
                onValueChange={(v) =>
                  updateQuestion(selected.questionId, { mandatory: v as "True" | "False" })
                }
              >
                <SelectTrigger className="h-8 text-[12px] mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="True">Yes</SelectItem>
                  <SelectItem value="False">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px]">Default Value</Label>
              <Input
                className="h-8 text-[12px] mt-1"
                value={selected.default}
                onChange={(e) =>
                  updateQuestion(selected.questionId, { default: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px]">Access Roles</Label>
              <Input
                className="h-8 text-[12px] mt-1"
                value={selected.accessRoles}
                onChange={(e) =>
                  updateQuestion(selected.questionId, { accessRoles: e.target.value })
                }
              />
            </div>
            <div>
              <Label className="text-[11px]">Tags (comma-separated)</Label>
              <Input
                className="h-8 text-[12px] mt-1"
                value={selected.tags.join(", ")}
                onChange={(e) =>
                  updateQuestion(selected.questionId, {
                    tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean),
                  })
                }
              />
            </div>
          </div>

          {/* Entry Point Checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <Checkbox
              id="entry-point"
              checked={isEntry}
              onCheckedChange={() => toggleFirstQuestion(selected.questionId)}
            />
            <label htmlFor="entry-point" className="text-[12px] font-medium cursor-pointer">
              Entry Point (First Question)
            </label>
          </div>

          {/* Options Panel */}
          {showOptions && (
            <div className="border border-border rounded-lg p-3 space-y-2 bg-card">
              <div className="flex items-center justify-between">
                <h3 className="text-[12px] font-bold text-foreground">Options</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[11px]"
                  onClick={() => addOption(selected.questionId)}
                >
                  <Plus size={11} className="mr-1" /> Add Option
                </Button>
              </div>

              {selected.options.length === 0 && (
                <p className="text-[11px] text-muted-foreground italic py-2">
                  No options. Click "+ Add Option" to create one.
                </p>
              )}

              {selected.options.map((opt, idx) => {
                const branch = selected._branches?.[opt.id];
                const hasBranch = branch && branch.nextEntityType !== "none";
                return (
                  <div
                    key={opt.id}
                    className="flex items-center gap-2 p-2 rounded-md bg-muted/40 border border-border/50"
                  >
                    <GripVertical size={12} className="text-muted-foreground flex-shrink-0 cursor-grab" />
                    <Input
                      className="h-7 text-[11px] flex-1 font-mono"
                      value={opt.id}
                      onChange={(e) =>
                        updateOption(selected.questionId, idx, "id", e.target.value)
                      }
                      placeholder="opt_id"
                    />
                    <Input
                      className="h-7 text-[11px] flex-[2]"
                      value={opt.display}
                      onChange={(e) =>
                        updateOption(selected.questionId, idx, "display", e.target.value)
                      }
                      placeholder="Display text"
                    />
                    <Checkbox
                      checked={opt.default ?? false}
                      onCheckedChange={(v) =>
                        updateOption(selected.questionId, idx, "default", v)
                      }
                      title="Default"
                    />
                    {hasBranch && (
                      <Badge variant="outline" className="text-[9px] px-1 h-4 flex-shrink-0">
                        →
                      </Badge>
                    )}
                    <button
                      className="p-1 text-muted-foreground hover:text-destructive"
                      onClick={() => removeOption(selected.questionId, idx)}
                    >
                      <Trash2 size={11} />
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
