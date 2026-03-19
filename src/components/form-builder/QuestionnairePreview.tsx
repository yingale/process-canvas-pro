/**
 * QuestionnairePreview – Step-by-step form preview with branching navigation & progress.
 */
import { useState, useCallback, useMemo } from "react";
import {
  ChevronLeft, ChevronRight, RotateCcw, CheckCircle2, Circle,
  ChevronDown, Type, Hash, Calendar, Upload, List, ToggleLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useQuestionnaireStore } from "@/stores/questionnaireStore";
import type { Question, QuestionType } from "@/types/questionnaire";

const TYPE_ICONS: Record<QuestionType, React.ReactNode> = {
  Dropdown: <ChevronDown size={14} />,
  RadioButton: <Circle size={14} />,
  TextInput: <Type size={14} />,
  TextArea: <Type size={14} />,
  DatePicker: <Calendar size={14} />,
  MultiSelect: <List size={14} />,
  NumberInput: <Hash size={14} />,
  FileUpload: <Upload size={14} />,
};

interface PreviewState {
  path: string[][]; // each step is an array of questionIds (first page = all firstQuestions)
  answers: Record<string, string | string[]>;
  currentIndex: number;
  completed: boolean;
}

export default function QuestionnairePreview() {
  const { questions, flow } = useQuestionnaireStore();

  const questionMap = useMemo(() => {
    const m = new Map<string, Question>();
    for (const q of questions) m.set(q.questionId, q);
    return m;
  }, [questions]);

  const firstQuestionId = flow.firstQuestions[0] ?? questions[0]?.questionId;

  const [state, setState] = useState<PreviewState>({
    path: firstQuestionId ? [firstQuestionId] : [],
    answers: {},
    currentIndex: 0,
    completed: false,
  });

  const currentQId = state.path[state.currentIndex];
  const currentQuestion = currentQId ? questionMap.get(currentQId) : undefined;

  const isOptionType = (t: QuestionType) =>
    ["Dropdown", "RadioButton", "MultiSelect"].includes(t);

  // Resolve next question based on branching
  const resolveNext = useCallback(
    (question: Question, answer: string | string[]): string | null => {
      const branches = question._branches ?? {};

      if (isOptionType(question.questionType) && question.options.length > 0) {
        // For single-select, check the selected option's branch
        const selectedOpt = typeof answer === "string" ? answer : answer[0];
        const opt = question.options.find((o) => o.display === selectedOpt || o.id === selectedOpt);
        if (opt) {
          const branch = branches[opt.id];
          if (branch) {
            if (branch.nextEntityType === "end") return "__end__";
            if (branch.nextEntityType === "question" && branch.targetId) return branch.targetId;
          }
        }
      }

      // Default: go to next question in the list order
      const idx = questions.findIndex((q) => q.questionId === question.questionId);
      if (idx >= 0 && idx < questions.length - 1) return questions[idx + 1].questionId;
      return null;
    },
    [questions]
  );

  const handleAnswer = useCallback(
    (value: string | string[]) => {
      setState((s) => ({
        ...s,
        answers: { ...s.answers, [currentQId]: value },
      }));
    },
    [currentQId]
  );

  const handleNext = useCallback(() => {
    if (!currentQuestion) return;
    const answer = state.answers[currentQId] ?? "";
    const nextId = resolveNext(currentQuestion, answer);

    if (!nextId || nextId === "__end__") {
      setState((s) => ({ ...s, completed: true }));
      return;
    }

    setState((s) => {
      // If going forward from a past point, trim the future path
      const newPath = [...s.path.slice(0, s.currentIndex + 1), nextId];
      return { ...s, path: newPath, currentIndex: newPath.length - 1 };
    });
  }, [currentQuestion, currentQId, state.answers, resolveNext]);

  const handleBack = useCallback(() => {
    setState((s) => {
      if (s.completed) return { ...s, completed: false };
      if (s.currentIndex <= 0) return s;
      return { ...s, currentIndex: s.currentIndex - 1 };
    });
  }, []);

  const handleRestart = useCallback(() => {
    setState({
      path: firstQuestionId ? [firstQuestionId] : [],
      answers: {},
      currentIndex: 0,
      completed: false,
    });
  }, [firstQuestionId]);

  // Progress calculation
  const progressPercent = state.completed
    ? 100
    : questions.length > 0
    ? Math.round(((state.currentIndex + 1) / questions.length) * 100)
    : 0;

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-sm">
        <p>No questions to preview. Add questions first.</p>
      </div>
    );
  }

  if (!firstQuestionId) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-sm">
        <p>No entry point defined. Mark a question as the first question.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Progress header */}
      <div className="px-6 pt-5 pb-3 space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Question {state.currentIndex + 1} of ~{questions.length}
          </span>
          <span>{progressPercent}%</span>
        </div>
        <Progress value={progressPercent} className="h-2" />
        {/* Breadcrumb dots */}
        <div className="flex items-center gap-1 pt-1 flex-wrap">
          {state.path.map((qId, i) => {
            const q = questionMap.get(qId);
            const isCurrent = i === state.currentIndex && !state.completed;
            const isPast = i < state.currentIndex || state.completed;
            return (
              <button
                key={`${qId}-${i}`}
                onClick={() => !state.completed && setState((s) => ({ ...s, currentIndex: i }))}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                  isCurrent
                    ? "bg-primary text-primary-foreground"
                    : isPast
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
                title={q?.content || qId}
              >
                {isPast ? <CheckCircle2 size={10} /> : <Circle size={10} />}
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Question area */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {state.completed ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <CheckCircle2 size={48} className="text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Form Complete</h3>
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              All questions have been answered. Review your answers below.
            </p>
            {/* Answer summary */}
            <div className="w-full max-w-md space-y-2 mt-4">
              {state.path.map((qId) => {
                const q = questionMap.get(qId);
                const ans = state.answers[qId];
                return (
                  <div key={qId} className="flex justify-between items-start gap-3 text-sm border-b border-border pb-2">
                    <span className="text-muted-foreground truncate max-w-[60%]">{q?.content || qId}</span>
                    <span className="font-medium text-foreground text-right">
                      {Array.isArray(ans) ? ans.join(", ") : ans || "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : currentQuestion ? (
          <div className="max-w-lg mx-auto space-y-5">
            {/* Question header */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{TYPE_ICONS[currentQuestion.questionType]}</span>
                <Badge variant="outline" className="text-[9px]">{currentQuestion.questionType}</Badge>
                {currentQuestion.mandatory === "True" && (
                  <Badge variant="destructive" className="text-[9px]">Required</Badge>
                )}
              </div>
              <h2 className="text-xl font-semibold text-foreground leading-tight">
                {currentQuestion.content || "Untitled Question"}
              </h2>
              {currentQuestion.contentAbstract && (
                <p className="text-sm text-muted-foreground">{currentQuestion.contentAbstract}</p>
              )}
            </div>

            {/* Answer input */}
            <div className="space-y-2">
              <QuestionInput
                question={currentQuestion}
                value={state.answers[currentQId]}
                onChange={handleAnswer}
              />
            </div>
          </div>
        ) : null}
      </div>

      {/* Navigation footer */}
      <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-card">
        <Button
          variant="outline"
          size="sm"
          onClick={handleBack}
          disabled={state.currentIndex === 0 && !state.completed}
        >
          <ChevronLeft size={14} className="mr-1" /> Back
        </Button>

        <Button variant="ghost" size="sm" onClick={handleRestart} className="text-muted-foreground">
          <RotateCcw size={14} className="mr-1" /> Restart
        </Button>

        {!state.completed && (
          <Button size="sm" onClick={handleNext}>
            Next <ChevronRight size={14} className="ml-1" />
          </Button>
        )}
        {state.completed && (
          <Button size="sm" variant="outline" onClick={handleRestart}>
            Start Over
          </Button>
        )}
      </div>
    </div>
  );
}

/* ─── Input renderer per question type ─── */
function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: Question;
  value?: string | string[];
  onChange: (v: string | string[]) => void;
}) {
  const strVal = (typeof value === "string" ? value : "") ?? "";
  const arrVal = Array.isArray(value) ? value : [];

  switch (question.questionType) {
    case "Dropdown":
      return (
        <select
          className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">— Select an option —</option>
          {question.options.map((opt) => (
            <option key={opt.id} value={opt.display}>{opt.display || opt.id}</option>
          ))}
        </select>
      );

    case "RadioButton":
      return (
        <div className="space-y-2">
          {question.options.map((opt) => (
            <label
              key={opt.id}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                strVal === opt.display
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <input
                type="radio"
                name={question.questionId}
                checked={strVal === opt.display}
                onChange={() => onChange(opt.display)}
                className="accent-primary"
              />
              <span className="text-sm text-foreground">{opt.display || opt.id}</span>
            </label>
          ))}
        </div>
      );

    case "MultiSelect":
      return (
        <div className="space-y-2">
          {question.options.map((opt) => {
            const checked = arrVal.includes(opt.display);
            return (
              <label
                key={opt.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  checked ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    onChange(checked ? arrVal.filter((v) => v !== opt.display) : [...arrVal, opt.display])
                  }
                  className="accent-primary"
                />
                <span className="text-sm text-foreground">{opt.display || opt.id}</span>
              </label>
            );
          })}
        </div>
      );

    case "TextInput":
      return (
        <input
          type="text"
          className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Type your answer..."
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "TextArea":
      return (
        <textarea
          className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          placeholder="Type your answer..."
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
        />
      );

    case "DatePicker":
      return (
        <input
          type="date"
          className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "NumberInput":
      return (
        <input
          type="number"
          className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Enter a number..."
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "FileUpload":
      return (
        <div className="flex flex-col items-center justify-center p-8 rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors">
          <Upload size={24} className="text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">File upload (preview only)</p>
        </div>
      );

    default:
      return (
        <input
          type="text"
          className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}
