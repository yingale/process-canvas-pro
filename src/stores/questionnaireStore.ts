import { create } from "zustand";
import type {
  QuestionnaireDocument,
  Question,
  QuestionType,
  FlowStatus,
  FlowNode,
  FlowLink,
  ValidationIssue,
  OptionBranch,
} from "@/types/questionnaire";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function makeQuestion(overrides?: Partial<Question>): Question {
  const id = `Q_${uid()}`;
  return {
    _id: id,
    questionId: id,
    content: "",
    contentAbstract: "",
    questionType: "Dropdown",
    mandatory: "False",
    options: [],
    category: "",
    subcategory: "",
    accessRoles: "",
    tags: [],
    default: "",
    language: "en",
    region: "",
    status: "Draft",
    ...overrides,
  };
}

function makeEmptyFlow(): QuestionnaireDocument["flow"] {
  const now = new Date().toISOString();
  return {
    _id: `flow_${uid()}`,
    flowId: `FLOW_${uid().toUpperCase()}`,
    flowName: "Untitled Flow",
    status: "Draft",
    flowAbstract: "",
    accessRoles: "",
    category: "",
    subCategory: "",
    tags: [],
    path: [],
    firstQuestions: [],
    links: [],
    nodes: [],
    version: 1,
    createTime: now,
    updateTime: now,
  };
}

interface QuestionnaireStore {
  flow: QuestionnaireDocument["flow"];
  questions: Question[];
  selectedQuestionId: string | null;

  // Flow settings
  setFlowField: (field: string, value: unknown) => void;

  // Questions CRUD
  addQuestion: (type?: QuestionType) => void;
  addSection: () => void;
  updateQuestion: (id: string, updates: Partial<Question>) => void;
  removeQuestion: (id: string) => void;
  duplicateQuestion: (id: string) => void;
  moveQuestion: (id: string, direction: "up" | "down") => void;
  selectQuestion: (id: string | null) => void;

  // Options
  addOption: (questionId: string) => void;
  updateOption: (questionId: string, optionIndex: number, field: string, value: unknown) => void;
  removeOption: (questionId: string, optionIndex: number) => void;

  // Entry points
  toggleFirstQuestion: (questionId: string) => void;
  removeFirstQuestion: (questionId: string) => void;

  // Branching
  setBranch: (questionId: string, optionId: string, branch: OptionBranch) => void;

  // Import / Export
  importDocument: (doc: QuestionnaireDocument) => void;
  exportDocument: () => QuestionnaireDocument;

  // Validation
  validate: () => ValidationIssue[];

  // Utilities
  autoGenerateIds: () => void;
  clearAll: () => void;
}

export const useQuestionnaireStore = create<QuestionnaireStore>((set, get) => ({
  flow: makeEmptyFlow(),
  questions: [],
  selectedQuestionId: null,

  setFlowField: (field, value) =>
    set((s) => ({ flow: { ...s.flow, [field]: value, updateTime: new Date().toISOString() } })),

  addQuestion: (type = "Dropdown") => {
    const q = makeQuestion({ questionType: type });
    set((s) => ({
      questions: [...s.questions, q],
      selectedQuestionId: q.questionId,
    }));
  },

  addSection: () => {
    const q = makeQuestion({
      questionType: "TextArea",
      tags: ["section"],
      content: "New Section",
    });
    set((s) => ({
      questions: [...s.questions, q],
      selectedQuestionId: q.questionId,
    }));
  },

  updateQuestion: (id, updates) =>
    set((s) => ({
      questions: s.questions.map((q) =>
        q.questionId === id ? { ...q, ...updates } : q
      ),
    })),

  removeQuestion: (id) =>
    set((s) => ({
      questions: s.questions.filter((q) => q.questionId !== id),
      selectedQuestionId: s.selectedQuestionId === id ? null : s.selectedQuestionId,
      flow: {
        ...s.flow,
        firstQuestions: s.flow.firstQuestions.filter((fq) => fq !== id),
      },
    })),

  duplicateQuestion: (id) => {
    const { questions } = get();
    const original = questions.find((q) => q.questionId === id);
    if (!original) return;
    const newId = `Q_${uid()}`;
    const dupe: Question = {
      ...JSON.parse(JSON.stringify(original)),
      _id: newId,
      questionId: newId,
      content: `${original.content} (copy)`,
    };
    const idx = questions.findIndex((q) => q.questionId === id);
    const next = [...questions];
    next.splice(idx + 1, 0, dupe);
    set({ questions: next, selectedQuestionId: newId });
  },

  moveQuestion: (id, direction) =>
    set((s) => {
      const idx = s.questions.findIndex((q) => q.questionId === id);
      if (idx < 0) return s;
      const target = direction === "up" ? idx - 1 : idx + 1;
      if (target < 0 || target >= s.questions.length) return s;
      const next = [...s.questions];
      [next[idx], next[target]] = [next[target], next[idx]];
      return { questions: next };
    }),

  selectQuestion: (id) => set({ selectedQuestionId: id }),

  addOption: (questionId) =>
    set((s) => ({
      questions: s.questions.map((q) => {
        if (q.questionId !== questionId) return q;
        const optId = `opt_${uid()}`;
        return {
          ...q,
          options: [...q.options, { id: optId, display: "", default: false }],
        };
      }),
    })),

  updateOption: (questionId, optionIndex, field, value) =>
    set((s) => ({
      questions: s.questions.map((q) => {
        if (q.questionId !== questionId) return q;
        const opts = [...q.options];
        opts[optionIndex] = { ...opts[optionIndex], [field]: value };
        return { ...q, options: opts };
      }),
    })),

  removeOption: (questionId, optionIndex) =>
    set((s) => ({
      questions: s.questions.map((q) => {
        if (q.questionId !== questionId) return q;
        const opts = q.options.filter((_, i) => i !== optionIndex);
        const branches = { ...(q._branches ?? {}) };
        const removedOptId = q.options[optionIndex]?.id;
        if (removedOptId) delete branches[removedOptId];
        return { ...q, options: opts, _branches: branches };
      }),
    })),

  toggleFirstQuestion: (questionId) =>
    set((s) => {
      const fqs = s.flow.firstQuestions.includes(questionId)
        ? s.flow.firstQuestions.filter((id) => id !== questionId)
        : [...s.flow.firstQuestions, questionId];
      return { flow: { ...s.flow, firstQuestions: fqs } };
    }),

  removeFirstQuestion: (questionId) =>
    set((s) => ({
      flow: {
        ...s.flow,
        firstQuestions: s.flow.firstQuestions.filter((id) => id !== questionId),
      },
    })),

  setBranch: (questionId, optionId, branch) =>
    set((s) => ({
      questions: s.questions.map((q) => {
        if (q.questionId !== questionId) return q;
        return {
          ...q,
          _branches: { ...(q._branches ?? {}), [optionId]: branch },
        };
      }),
    })),

  importDocument: (doc) => {
    // Reconstruct _branches from path data
    const pathMap = new Map<string, FlowNode>();
    for (const node of doc.flow.path ?? []) {
      pathMap.set(node.id, node);
    }

    const questions: Question[] = doc.questions.map((q) => {
      const branches: Record<string, OptionBranch> = {};
      const pathNode = pathMap.get(q.questionId);
      if (pathNode?.options) {
        for (const pOpt of pathNode.options) {
          if (pOpt.next && pOpt.next.length > 0) {
            const n = pOpt.next[0];
            branches[pOpt.id] = {
              id: pOpt.id,
              nextEntityType: n.nextEntityType,
              targetId: n.id,
            };
          }
        }
      }
      return { ...q, _branches: branches };
    });

    set({
      flow: doc.flow,
      questions,
      selectedQuestionId: null,
    });
  },

  exportDocument: () => {
    const { flow, questions } = get();
    let hashId = 1;

    // Build path from branches
    const path: FlowNode[] = [];
    const links: FlowLink[] = [];
    const nodes: FlowNode[] = [];

    for (let qi = 0; qi < questions.length; qi++) {
      const q = questions[qi];
      const branches = q._branches ?? {};
      const hasOptions = ["Dropdown", "RadioButton", "MultiSelect"].includes(q.questionType);

      const pathEntry: FlowNode = { id: q.questionId, options: [] };

      if (hasOptions && q.options.length > 0) {
        for (const opt of q.options) {
          const branch = branches[opt.id];
          const nextArr: Array<{ id: string; nextEntityType: "question" | "end" | "subprocess" }> = [];

          if (branch && branch.nextEntityType !== "none") {
            nextArr.push({
              id: branch.targetId,
              nextEntityType: branch.nextEntityType as "question" | "end" | "subprocess",
            });

            const toId = branch.nextEntityType === "end"
              ? `${branch.targetId}-`
              : `${branch.targetId}-`;

            links.push({
              from: `${q.questionId}-`,
              to: toId,
              id: opt.id,
              text: opt.display,
              linkId: `link_${uid()}`,
              visible: true,
              relinkableTo: true,
              relinkableFrom: true,
              fromPort: "",
              toPort: "",
              editable: true,
              __gohashid: hashId++,
            });
          }

          pathEntry.options!.push({ id: opt.id, next: nextArr });
        }
      }

      path.push(pathEntry);

      nodes.push({
        id: q.questionId,
        loc: `${qi * 200} 0`,
        qOptions: q.options.map((o) => o.display),
        qType: q.questionType,
        __gohashid: hashId++,
      });
    }

    // Clean questions (remove _branches)
    const cleanQuestions = questions.map(({ _branches, ...rest }) => rest);

    return {
      flow: {
        ...flow,
        path,
        links,
        nodes,
        updateTime: new Date().toISOString(),
      },
      questions: cleanQuestions as Question[],
    };
  },

  validate: () => {
    const { flow, questions } = get();
    const issues: ValidationIssue[] = [];
    const qIds = new Set(questions.map((q) => q.questionId));

    // Check firstQuestions
    for (const fq of flow.firstQuestions) {
      if (!qIds.has(fq)) {
        issues.push({ type: "error", message: `Entry point "${fq}" does not reference a valid question`, questionId: fq });
      }
    }

    if (flow.firstQuestions.length === 0 && questions.length > 0) {
      issues.push({ type: "warning", message: "No entry points defined. Set at least one first question." });
    }

    for (const q of questions) {
      if (!q.questionId) {
        issues.push({ type: "error", message: "Question has empty ID", questionId: q._id });
      }
      if (!q.content) {
        issues.push({ type: "warning", message: `Question "${q.questionId}" has no label`, questionId: q.questionId });
      }
      const hasOptions = ["Dropdown", "RadioButton", "MultiSelect"].includes(q.questionType);
      if (hasOptions && q.options.length === 0) {
        issues.push({ type: "warning", message: `${q.questionType} "${q.questionId}" has no options`, questionId: q.questionId });
      }

      // Check branches point to valid targets
      const branches = q._branches ?? {};
      for (const [, branch] of Object.entries(branches)) {
        if (branch.nextEntityType === "question" && !qIds.has(branch.targetId)) {
          issues.push({
            type: "error",
            message: `Branch in "${q.questionId}" targets non-existent question "${branch.targetId}"`,
            questionId: q.questionId,
          });
        }
      }
    }

    return issues;
  },

  autoGenerateIds: () =>
    set((s) => ({
      questions: s.questions.map((q, i) => ({
        ...q,
        questionId: `Q${String(i + 1).padStart(3, "0")}`,
        _id: `Q${String(i + 1).padStart(3, "0")}`,
        options: q.options.map((o, oi) => ({
          ...o,
          id: `Q${String(i + 1).padStart(3, "0")}_opt${oi + 1}`,
        })),
      })),
    })),

  clearAll: () =>
    set({
      flow: makeEmptyFlow(),
      questions: [],
      selectedQuestionId: null,
    }),
}));
