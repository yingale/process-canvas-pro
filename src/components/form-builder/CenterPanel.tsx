import { useQuestionnaireStore } from "@/stores/questionnaireStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, FileUp, LayoutList } from "lucide-react";
import TreeView from "./TreeView";
import type { QuestionType } from "@/types/questionnaire";

const QUICK_TYPES: { type: QuestionType; label: string }[] = [
  { type: "Dropdown", label: "Dropdown" },
  { type: "TextInput", label: "Text" },
  { type: "RadioButton", label: "Radio" },
  { type: "DatePicker", label: "Date" },
  { type: "NumberInput", label: "Number" },
  { type: "FileUpload", label: "File" },
];

interface CenterPanelProps {
  onImport: () => void;
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
}

export default function CenterPanel({ onImport, expandedId, onToggleExpand }: CenterPanelProps) {
  const { questions, addQuestion, addSection } = useQuestionnaireStore();

  // Empty state
  if (questions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/10">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Pencil size={28} className="text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Start Building Your Form</h2>
            <p className="text-[13px] text-muted-foreground mt-1">
              Add questions to create your questionnaire flow. Questions will appear as a tree showing the branching logic.
            </p>
          </div>
          <div className="flex gap-2 justify-center flex-wrap">
            <Button onClick={() => addQuestion()} size="sm">
              <Plus size={14} className="mr-1" /> Add Question
            </Button>
            <Button onClick={addSection} variant="outline" size="sm">
              <LayoutList size={14} className="mr-1" /> Add Section
            </Button>
            <Button onClick={onImport} variant="outline" size="sm">
              <FileUp size={14} className="mr-1" /> Import JSON
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-muted/10 h-full overflow-hidden">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2 max-w-2xl mx-auto pb-24">
          {/* Tree-based question rendering */}
          <TreeView
            expandedId={expandedId}
            onToggleExpand={onToggleExpand}
          />

          {/* Add question bar */}
          <div className="flex items-center gap-2 pt-4 border-t border-dashed border-border mt-4">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-[12px] border-dashed"
              onClick={() => addQuestion()}
            >
              <Plus size={13} className="mr-1" /> Add Question
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-[12px] text-muted-foreground"
              onClick={addSection}
            >
              <LayoutList size={13} className="mr-1" /> Section
            </Button>
            <div className="h-4 w-px bg-border" />
            {QUICK_TYPES.map((qt) => (
              <Button
                key={qt.type}
                variant="ghost"
                size="sm"
                className="h-7 text-[10px] px-2 text-muted-foreground hover:text-foreground"
                onClick={() => addQuestion(qt.type)}
                title={`Add ${qt.label}`}
              >
                {qt.label}
              </Button>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
