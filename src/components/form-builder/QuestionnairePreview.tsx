/**
 * QuestionnairePreview – Step-by-step form preview with branching navigation & progress.
 * Page 1 always shows ALL firstQuestions together. Subsequent pages follow branching logic.
 */
import { useState, useCallback, useMemo } from "react";
import {
  ChevronLeft, ChevronRight, RotateCcw, CheckCircle2, Circle,
  ChevronDown, Type, Hash, Calendar, Upload, List,
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

/** Each page holds one or more questionIds displayed together */
interface PreviewState {
  pages: string[][]; // pages[0] = firstQuestions, pages[1+] = single-question pages from branching
  answers: Record<string, string | string[]>;
  currentPage: number;
  completed: boolean;
}

export default function QuestionnairePreview() {
  const { questions, flow } = useQuestionnaireStore();

  const questionMap = useMemo(() => {
    const m = new Map<string, Question>();
    for (const q of questions) m.set(q.questionId, q);
    return m;
  }, [questions]);

  const firstPage =
    flow.firstQuestions.length > 0
      ? flow.firstQuestions.filter((id) => questionMap.has(id))
      : questions.length > 0
      ? [questions[0].questionId]
      : [];

  const [state, setState] = useState<PreviewState>({
    pages: firstPage.length > 0 ? [firstPage] : [],
    answers: {},
    currentPage: 0,
    completed: false,
  });

  const currentPageQIds = state.pages[state.currentPage] ?? [];

  /** Resolve next question for a single question based on its answer */
  const resolveNextForQuestion = useCallback(
    (question: Question, answer: string | string[]): string | null => {
      const branches = question._branches ?? {};
      const isOpt = ["Dropdown", "RadioButton", "MultiSelect"].includes(question.questionType);

      if (isOpt && question.options.length > 0) {
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

      // Default: next in list order
      const idx = questions.findIndex((q) => q.questionId === question.questionId);
      if (idx >= 0 && idx < questions.length - 1) return questions[idx + 1].questionId;
      return null;
    },
    [questions],
  );

  const handleAnswer = useCallback(
    (questionId: string, value: string | string[]) => {
      setState((s) => ({
        ...s,
        answers: { ...s.answers, [questionId]: value },
      }));
    },
    [],
  );

  const handleNext = useCallback(() => {
    // Collect all next targets from current page's questions
    const nextIds = new Set<string>();
    let hasEnd = false;

    for (const qId of currentPageQIds) {
      const q = questionMap.get(qId);
      if (!q) continue;
      const answer = state.answers[qId] ?? "";
      const nextId = resolveNextForQuestion(q, answer);
      if (nextId === "__end__") hasEnd = true;
      else if (nextId) nextIds.add(nextId);
    }

    // Remove any IDs already on the current page (avoid self-loops)
    for (const qId of currentPageQIds) nextIds.delete(qId);

    if (nextIds.size === 0 || (hasEnd && nextIds.size === 0)) {
      setState((s) => ({ ...s, completed: true }));
      return;
    }

    // Each next target becomes its own page (single question per page after the first)
    const newPages: string[][] = [];
    for (const id of nextIds) {
      newPages.push([id]);
    }

    setState((s) => {
      const trimmed = s.pages.slice(0, s.currentPage + 1);
      // If multiple branches diverge, show first one; others queued
      const combined = [...trimmed, ...newPages];
      return { ...s, pages: combined, currentPage: trimmed.length };
    });
  }, [currentPageQIds, questionMap, state.answers, resolveNextForQuestion]);

  const handleBack = useCallback(() => {
    setState((s) => {
      if (s.completed) return { ...s, completed: false };
      if (s.currentPage <= 0) return s;
      return { ...s, currentPage: s.currentPage - 1 };
    });
  }, []);

  const handleRestart = useCallback(() => {
    setState({
      pages: firstPage.length > 0 ? [firstPage] : [],
      answers: {},
      currentPage: 0,
      completed: false,
    });
  }, [firstPage]);

  // Progress
  const totalEstimate = Math.max(questions.length, state.pages.length);
  const progressPercent = state.completed
    ? 100
    : totalEstimate > 0
    ? Math.round(((state.currentPage + 1) / totalEstimate) * 100)
    : 0;

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-sm">
        <p>No questions to preview. Add questions first.</p>
      </div>
    );
  }

  if (firstPage.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-sm">
        <p>No entry point defined. Mark a question as the first question.</p>
      </div>
    );
  }

  // Flatten all visited question IDs for the summary
  const allVisitedQIds = state.pages.slice(0, state.currentPage + 1).flat();

  return (
    <div className="flex flex-col h-full">
      {/* Progress header */}
      <div className="px-6 pt-5 pb-3 space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Page {state.currentPage + 1} of ~{totalEstimate}
            {currentPageQIds.length > 1 && ` (${currentPageQIds.length} questions)`}
          </span>
          <span>{progressPercent}%</span>
        </div>
        <Progress value={progressPercent} className="h-2" />
        {/* Page dots */}
        <div className="flex items-center gap-1 pt-1 flex-wrap">
          {state.pages.map((pageQIds, i) => {
            const isCurrent = i === state.currentPage && !state.completed;
            const isPast = i < state.currentPage || state.completed;
            const label = i === 0 && pageQIds.length > 1 ? `1 (${pageQIds.length})` : `${i + 1}`;
            return (
              <button
                key={i}
                onClick={() => !state.completed && i <= state.currentPage && setState((s) => ({ ...s, currentPage: i }))}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                  isCurrent
                    ? "bg-primary text-primary-foreground"
                    : isPast
                    ? "bg-primary/20 text-primary cursor-pointer"
                    : "bg-muted text-muted-foreground"
                }`}
                title={pageQIds.join(", ")}
              >
                {isPast ? <CheckCircle2 size={10} /> : <Circle size={10} />}
                {label}
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
            <div className="w-full max-w-md space-y-2 mt-4">
              {allVisitedQIds.map((qId) => {
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
        ) : (
          <div className="max-w-lg mx-auto space-y-8">
            {currentPageQIds.map((qId) => {
              const question = questionMap.get(qId);
              if (!question) return null;
              return (
                <div key={qId} className="space-y-4">
                  {/* Question header */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{TYPE_ICONS[question.questionType]}</span>
                      <Badge variant="outline" className="text-[9px]">{question.questionType}</Badge>
                      {question.mandatory === "True" && (
                        <Badge variant="destructive" className="text-[9px]">Required</Badge>
                      )}
                    </div>
                    <h2 className="text-xl font-semibold text-foreground leading-tight">
                      {question.content || "Untitled Question"}
                    </h2>
                    {question.contentAbstract && (
                      <p className="text-sm text-muted-foreground">{question.contentAbstract}</p>
                    )}
                  </div>
                  <QuestionInput
                    question={question}
                    value={state.answers[qId]}
                    onChange={(v) => handleAnswer(qId, v)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Navigation footer */}
      <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-card">
        <Button
          variant="outline"
          size="sm"
          onClick={handleBack}
          disabled={state.currentPage === 0 && !state.completed}
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
