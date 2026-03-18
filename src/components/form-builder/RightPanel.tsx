import { useQuestionnaireStore } from "@/stores/questionnaireStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Zap,
  AlertTriangle,
  Trash2,
  GitBranch,
  BarChart3,
  HelpCircle,
  Link2,
  Flag,
} from "lucide-react";
import type { OptionBranch } from "@/types/questionnaire";

const HAS_OPTIONS = ["Dropdown", "RadioButton", "MultiSelect"];

interface RightPanelProps {
  onValidate: () => void;
}

export default function RightPanel({ onValidate }: RightPanelProps) {
  const {
    questions,
    selectedQuestionId,
    flow,
    setBranch,
    autoGenerateIds,
    clearAll,
  } = useQuestionnaireStore();

  const selected = questions.find((q) => q.questionId === selectedQuestionId);
  const showBranching = selected && HAS_OPTIONS.includes(selected.questionType) && selected.options.length > 0;

  // Count links
  const linkCount = questions.reduce((acc, q) => {
    const branches = q._branches ?? {};
    return acc + Object.values(branches).filter((b) => b.nextEntityType !== "none").length;
  }, 0);

  return (
    <div className="w-[320px] border-l border-border bg-card flex flex-col h-full flex-shrink-0">
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Branching Logic */}
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              <GitBranch size={12} />
              Branching Logic
            </div>

            {!selected && (
              <p className="text-[11px] text-muted-foreground italic px-1">
                Select a question to configure branching.
              </p>
            )}

            {selected && !showBranching && (
              <p className="text-[11px] text-muted-foreground italic px-1">
                Branching is only available for Dropdown, Radio, and MultiSelect question types with options.
              </p>
            )}

            {showBranching && (
              <div className="space-y-2">
                {selected.options.map((opt) => {
                  const branch = selected._branches?.[opt.id];
                  const branchType = branch?.nextEntityType ?? "none";

                  return (
                    <div
                      key={opt.id}
                      className="border border-border/60 rounded-md p-2.5 space-y-2 bg-muted/20"
                    >
                      <div className="text-[11px] font-medium text-foreground">
                        If "<span className="text-primary">{opt.display || opt.id}</span>":
                      </div>

                      <Select
                        value={branchType}
                        onValueChange={(v) => {
                          const newBranch: OptionBranch = {
                            id: opt.id,
                            nextEntityType: v as OptionBranch["nextEntityType"],
                            targetId: branch?.targetId ?? "",
                          };
                          setBranch(selected.questionId, opt.id, newBranch);
                        }}
                      >
                        <SelectTrigger className="h-7 text-[11px]">
                          <SelectValue placeholder="No branch" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No branch</SelectItem>
                          <SelectItem value="question">Go to Question</SelectItem>
                          <SelectItem value="end">End Flow</SelectItem>
                          <SelectItem value="subprocess">Subprocess</SelectItem>
                        </SelectContent>
                      </Select>

                      {branchType === "question" && (
                        <Select
                          value={branch?.targetId ?? ""}
                          onValueChange={(v) => {
                            setBranch(selected.questionId, opt.id, {
                              id: opt.id,
                              nextEntityType: "question",
                              targetId: v,
                            });
                          }}
                        >
                          <SelectTrigger className="h-7 text-[11px]">
                            <SelectValue placeholder="Select target question" />
                          </SelectTrigger>
                          <SelectContent>
                            {questions
                              .filter((q) => q.questionId !== selected.questionId)
                              .map((q) => (
                                <SelectItem key={q.questionId} value={q.questionId}>
                                  {q.content || q.questionId}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      )}

                      {branchType === "end" && (
                        <div>
                          <Label className="text-[10px]">End ID</Label>
                          <Input
                            className="h-7 text-[11px] mt-0.5 font-mono"
                            value={branch?.targetId ?? ""}
                            onChange={(e) => {
                              setBranch(selected.questionId, opt.id, {
                                id: opt.id,
                                nextEntityType: "end",
                                targetId: e.target.value,
                              });
                            }}
                            placeholder="e.g., end-approved"
                          />
                        </div>
                      )}

                      {branchType === "subprocess" && (
                        <div>
                          <Label className="text-[10px]">Subprocess ID</Label>
                          <Input
                            className="h-7 text-[11px] mt-0.5 font-mono"
                            value={branch?.targetId ?? ""}
                            onChange={(e) => {
                              setBranch(selected.questionId, opt.id, {
                                id: opt.id,
                                nextEntityType: "subprocess",
                                targetId: e.target.value,
                              });
                            }}
                            placeholder="e.g., INVESTIGATION_WF1"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Separator */}
          <div className="h-px bg-border" />

          {/* Flow Summary */}
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              <BarChart3 size={12} />
              Flow Summary
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Card className="p-0">
                <CardContent className="p-2.5 text-center">
                  <div className="text-lg font-bold text-foreground">{questions.length}</div>
                  <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                    <HelpCircle size={10} /> Questions
                  </div>
                </CardContent>
              </Card>
              <Card className="p-0">
                <CardContent className="p-2.5 text-center">
                  <div className="text-lg font-bold text-foreground">{linkCount}</div>
                  <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                    <Link2 size={10} /> Links
                  </div>
                </CardContent>
              </Card>
              <Card className="p-0">
                <CardContent className="p-2.5 text-center">
                  <div className="text-lg font-bold text-foreground">{flow.firstQuestions.length}</div>
                  <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                    <Flag size={10} /> Entry Pts
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Separator */}
          <div className="h-px bg-border" />

          {/* Quick Actions */}
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              <Zap size={12} />
              Quick Actions
            </div>
            <div className="space-y-1.5">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start h-8 text-[11px]"
                onClick={autoGenerateIds}
              >
                <Zap size={12} className="mr-2" /> Auto-Generate IDs
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start h-8 text-[11px]"
                onClick={onValidate}
              >
                <AlertTriangle size={12} className="mr-2" /> Validate Workflow
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start h-8 text-[11px] text-destructive hover:text-destructive"
                onClick={clearAll}
              >
                <Trash2 size={12} className="mr-2" /> Clear All
              </Button>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
