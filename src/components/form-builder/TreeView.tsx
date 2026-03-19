/**
 * TreeView – Renders questions as a visual tree based on branching logic.
 * Entry points are root nodes; branches create child nodes with visual connectors.
 * Unlinked questions appear in a separate section at the bottom.
 */
import { useMemo } from "react";
import { useQuestionnaireStore } from "@/stores/questionnaireStore";
import QuestionCard from "./QuestionCard";
import { Badge } from "@/components/ui/badge";
import { GitBranch, Unlink, Flag, CornerDownRight, ExternalLink, XCircle } from "lucide-react";
import type { Question } from "@/types/questionnaire";

interface TreeNode {
  question: Question;
  children: { optionLabel: string; optionId: string; node: TreeNode; branchType?: "question" | "subprocess" | "end" }[];
  /** Whether this node also appears elsewhere (cycle detection) */
  isCycleRef?: boolean;
}

interface SubprocessRef {
  optionLabel: string;
  targetId: string;
}

interface EndRef {
  optionLabel: string;
  targetId: string;
}

function buildTree(
  questions: Question[],
  firstQuestions: string[]
): { roots: TreeNode[]; unlinked: Question[] } {
  const qMap = new Map(questions.map((q) => [q.questionId, q]));
  const visited = new Set<string>();

  function buildNode(qId: string, ancestors: Set<string>): TreeNode | null {
    const q = qMap.get(qId);
    if (!q) return null;

    // Cycle detection: if we're visiting an ancestor, mark as cycle ref
    if (ancestors.has(qId)) {
      return { question: q, children: [], isCycleRef: true };
    }

    // If already visited in another branch, still show but don't recurse deeply
    const alreadyVisited = visited.has(qId);
    visited.add(qId);

    const children: TreeNode["children"] = [];

    if (!alreadyVisited) {
      const branches = q._branches ?? {};
      for (const [optId, branch] of Object.entries(branches)) {
        if (branch.nextEntityType === "question" && branch.targetId) {
          const opt = q.options.find((o) => o.id === optId);
          const nextAncestors = new Set(ancestors);
          nextAncestors.add(qId);
          const childNode = buildNode(branch.targetId, nextAncestors);
          if (childNode) {
            children.push({
              optionLabel: opt?.display || optId,
              optionId: optId,
              node: childNode,
            });
          }
        }
      }
    }

    return { question: q, children };
  }

  // Build from entry points
  const roots: TreeNode[] = [];
  for (const id of firstQuestions) {
    const node = buildNode(id, new Set());
    if (node) roots.push(node);
  }

  // Also add questions that aren't entry points but aren't children of anything
  // (standalone roots not in firstQuestions)
  for (const q of questions) {
    if (!visited.has(q.questionId)) {
      const node = buildNode(q.questionId, new Set());
      if (node) roots.push(node);
    }
  }

  // Truly unlinked = none (all are now roots or children)
  // But let's separate: questions that were visited as children vs standalone
  const unlinked = questions.filter((q) => !visited.has(q.questionId));

  return { roots, unlinked };
}

interface TreeViewProps {
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
}

export default function TreeView({ expandedId, onToggleExpand }: TreeViewProps) {
  const { questions, flow } = useQuestionnaireStore();

  const { roots, unlinked } = useMemo(
    () => buildTree(questions, flow.firstQuestions),
    [questions, flow.firstQuestions]
  );

  if (questions.length === 0) return null;

  return (
    <div className="space-y-1">
      {/* Entry point roots */}
      {roots.map((root, i) => (
        <TreeNodeRenderer
          key={`root-${root.question.questionId}-${i}`}
          node={root}
          depth={0}
          expandedId={expandedId}
          onToggleExpand={onToggleExpand}
          totalQuestions={questions.length}
          questionIndex={questions.findIndex((q) => q.questionId === root.question.questionId)}
          isEntryPoint={flow.firstQuestions.includes(root.question.questionId)}
        />
      ))}

      {/* Unlinked questions */}
      {unlinked.length > 0 && (
        <div className="mt-6 pt-4 border-t border-dashed border-border">
          <div className="flex items-center gap-2 mb-2 px-1">
            <Unlink size={12} className="text-muted-foreground" />
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              Unlinked Questions
            </span>
            <Badge variant="outline" className="text-[9px] h-4">{unlinked.length}</Badge>
          </div>
          {unlinked.map((q) => (
            <div key={q.questionId} className="mb-1">
              <QuestionCard
                question={q}
                index={questions.findIndex((qq) => qq.questionId === q.questionId)}
                total={questions.length}
                isExpanded={expandedId === q.questionId}
                onToggle={() => onToggleExpand(q.questionId)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Recursive tree node renderer ── */
function TreeNodeRenderer({
  node,
  depth,
  expandedId,
  onToggleExpand,
  totalQuestions,
  questionIndex,
  isEntryPoint,
}: {
  node: TreeNode;
  depth: number;
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
  totalQuestions: number;
  questionIndex: number;
  isEntryPoint?: boolean;
}) {
  const { questions } = useQuestionnaireStore();

  if (node.isCycleRef) {
    return (
      <div className="ml-6 pl-4 py-1.5 flex items-center gap-2 text-[11px] text-muted-foreground italic" style={{ marginLeft: depth * 24 }}>
        <CornerDownRight size={12} className="text-orange-500" />
        <span>↩ Back to: {node.question.content || node.question.questionId}</span>
        <Badge variant="outline" className="text-[8px] px-1 h-3.5 text-orange-500 border-orange-500/30">cycle</Badge>
      </div>
    );
  }

  return (
    <div>
      {/* Entry point indicator */}
      {depth === 0 && isEntryPoint && (
        <div className="flex items-center gap-1.5 mb-1 px-1">
          <Flag size={10} className="text-primary" />
          <span className="text-[10px] font-medium text-primary uppercase tracking-wide">Entry Point</span>
        </div>
      )}

      {/* The question card */}
      <div style={{ marginLeft: depth > 0 ? depth * 24 : 0 }}>
        {/* Branch connector line */}
        {depth > 0 && (
          <div className="flex items-center gap-1.5 ml-2 mb-0.5">
            <div className="w-4 border-t-2 border-dashed border-primary/20" />
            <CornerDownRight size={10} className="text-primary/40" />
          </div>
        )}
        <QuestionCard
          question={node.question}
          index={questionIndex}
          total={totalQuestions}
          isExpanded={expandedId === node.question.questionId}
          onToggle={() => onToggleExpand(node.question.questionId)}
          depth={depth}
          isTreeChild={depth > 0}
        />
      </div>

      {/* Children (branched questions) */}
      {node.children.length > 0 && (
        <div className="relative">
          {/* Vertical connector line */}
          <div
            className="absolute left-3 top-0 bottom-2 border-l-2 border-dashed border-primary/15"
            style={{ marginLeft: depth * 24 }}
          />
          {node.children.map((child, i) => (
            <div key={`${child.optionId}-${i}`} className="relative">
              {/* Option label */}
              <div
                className="flex items-center gap-1.5 py-1 mt-1"
                style={{ marginLeft: (depth + 1) * 24 }}
              >
                <GitBranch size={10} className="text-primary/50" />
                <span className="text-[10px] text-muted-foreground font-medium bg-muted/50 px-1.5 py-0.5 rounded">
                  If "{child.optionLabel}"
                </span>
              </div>
              <TreeNodeRenderer
                node={child.node}
                depth={depth + 1}
                expandedId={expandedId}
                onToggleExpand={onToggleExpand}
                totalQuestions={totalQuestions}
                questionIndex={questions.findIndex((q) => q.questionId === child.node.question.questionId)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
