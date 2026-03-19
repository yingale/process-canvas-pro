/**
 * FlowGraphView – ReactFlow-based visual flowchart for the questionnaire.
 * Shows question nodes, branching edges (with option labels), converging paths,
 * subprocess references, and entry-point markers. Click a node to select it.
 */
import { useMemo, useCallback } from "react";
import ReactFlow, {
  Node,
  Edge,
  Position,
  MarkerType,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
} from "reactflow";
import "reactflow/dist/style.css";
import { useQuestionnaireStore } from "@/stores/questionnaireStore";
import type { Question } from "@/types/questionnaire";
import { memo } from "react";
import { Handle } from "reactflow";
import {
  Flag, List, CircleDot, Type, AlignLeft, Calendar, CheckSquare,
  Hash, FileUp, GitBranch, ExternalLink,
} from "lucide-react";
import type { QuestionType } from "@/types/questionnaire";

/* ─── Custom Node Components ─── */

const TYPE_ICONS: Record<QuestionType, React.ReactNode> = {
  Dropdown: <List size={11} />,
  RadioButton: <CircleDot size={11} />,
  TextInput: <Type size={11} />,
  TextArea: <AlignLeft size={11} />,
  DatePicker: <Calendar size={11} />,
  MultiSelect: <CheckSquare size={11} />,
  NumberInput: <Hash size={11} />,
  FileUpload: <FileUp size={11} />,
};

interface QuestionNodeData {
  label: string;
  questionType: QuestionType;
  isEntry: boolean;
  isSelected: boolean;
  optionCount: number;
  branchCount: number;
  mandatory: boolean;
}

const QuestionNode = memo(({ data }: { data: QuestionNodeData }) => (
  <div
    className={`rounded-lg border-2 px-3 py-2 min-w-[180px] max-w-[220px] shadow-sm transition-all ${
      data.isSelected
        ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
        : "border-border bg-card hover:border-primary/40"
    }`}
  >
    <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-primary/40 !border-primary/60" />
    <div className="flex items-center gap-1.5 mb-1">
      {data.isEntry && <Flag size={10} className="text-primary flex-shrink-0" />}
      <span className="text-muted-foreground flex-shrink-0">{TYPE_ICONS[data.questionType]}</span>
      <span className="text-[9px] px-1 py-0 rounded bg-muted text-muted-foreground">{data.questionType}</span>
      {data.mandatory && (
        <span className="text-[8px] px-1 py-0 rounded bg-destructive/10 text-destructive">Req</span>
      )}
    </div>
    <div className="text-[11px] font-medium text-foreground leading-tight truncate">{data.label || "Untitled"}</div>
    {(data.optionCount > 0 || data.branchCount > 0) && (
      <div className="flex items-center gap-2 mt-1 text-[9px] text-muted-foreground">
        {data.optionCount > 0 && <span>{data.optionCount} opt{data.optionCount !== 1 ? "s" : ""}</span>}
        {data.branchCount > 0 && (
          <span className="flex items-center gap-0.5">
            <GitBranch size={8} /> {data.branchCount}
          </span>
        )}
      </div>
    )}
    <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-primary/40 !border-primary/60" />
  </div>
));
QuestionNode.displayName = "QuestionNode";

interface SubprocessNodeData {
  label: string;
}

const SubprocessNode = memo(({ data }: { data: SubprocessNodeData }) => (
  <div className="rounded-lg border-2 border-dashed border-amber-500/60 bg-amber-500/5 px-3 py-2 min-w-[160px] shadow-sm">
    <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-amber-500/40 !border-amber-500/60" />
    <div className="flex items-center gap-1.5 mb-1">
      <ExternalLink size={11} className="text-amber-600" />
      <span className="text-[9px] px-1 py-0 rounded bg-amber-500/10 text-amber-700">Subprocess</span>
    </div>
    <div className="text-[11px] font-medium text-amber-800 leading-tight truncate">{data.label}</div>
  </div>
));
SubprocessNode.displayName = "SubprocessNode";

const EndNode = memo(() => (
  <div className="rounded-full border-2 border-destructive/40 bg-destructive/5 w-10 h-10 flex items-center justify-center shadow-sm">
    <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-destructive/40 !border-destructive/60" />
    <span className="text-[9px] font-bold text-destructive">END</span>
  </div>
));
EndNode.displayName = "EndNode";

const nodeTypes = {
  question: QuestionNode,
  subprocess: SubprocessNode,
  end: EndNode,
};

/* ─── Layout helpers ─── */

/** Simple layered layout using BFS from entry points */
function layoutGraph(
  questions: Question[],
  firstQuestions: string[],
): { nodes: Node[]; edges: Edge[] } {
  const qMap = new Map(questions.map((q) => [q.questionId, q]));
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const nodeIds = new Set<string>();
  const subprocessIds = new Set<string>();
  const endIds = new Set<string>();

  // Track all targets for converging detection
  const allTargets = new Map<string, string[]>(); // targetId -> sourceIds

  // Collect all branches first
  for (const q of questions) {
    const branches = q._branches ?? {};
    for (const [optId, branch] of Object.entries(branches)) {
      if (branch.nextEntityType === "none") continue;
      const targetKey = branch.nextEntityType === "end" ? `end_${branch.targetId}` : branch.targetId;
      if (!allTargets.has(targetKey)) allTargets.set(targetKey, []);
      allTargets.get(targetKey)!.push(q.questionId);
    }
  }

  // BFS to assign layers
  const layers = new Map<string, number>(); // nodeId -> layer
  const queue: string[] = [];

  // Entry points at layer 0
  const entryPoints = firstQuestions.length > 0 ? firstQuestions : questions.length > 0 ? [questions[0].questionId] : [];
  for (const id of entryPoints) {
    if (qMap.has(id)) {
      layers.set(id, 0);
      queue.push(id);
    }
  }

  // BFS
  while (queue.length > 0) {
    const qId = queue.shift()!;
    const q = qMap.get(qId);
    if (!q) continue;
    const currentLayer = layers.get(qId) ?? 0;
    const branches = q._branches ?? {};

    for (const [, branch] of Object.entries(branches)) {
      if (branch.nextEntityType === "none") continue;

      let targetId = branch.targetId;
      if (branch.nextEntityType === "subprocess") {
        targetId = `sub_${branch.targetId}`;
        subprocessIds.add(targetId);
      } else if (branch.nextEntityType === "end") {
        targetId = `end_${branch.targetId}`;
        endIds.add(targetId);
      }

      const nextLayer = currentLayer + 1;
      if (!layers.has(targetId) || layers.get(targetId)! < nextLayer) {
        layers.set(targetId, nextLayer);
      }
      if (!layers.has(targetId) || !nodeIds.has(targetId)) {
        if (branch.nextEntityType === "question" && qMap.has(branch.targetId) && !layers.has(branch.targetId)) {
          layers.set(branch.targetId, nextLayer);
          queue.push(branch.targetId);
        }
      }
    }
  }

  // Add questions not yet layered
  for (const q of questions) {
    if (!layers.has(q.questionId)) {
      layers.set(q.questionId, 0);
    }
  }

  // Group by layer for x positioning
  const layerGroups = new Map<number, string[]>();
  for (const [id, layer] of layers) {
    if (!layerGroups.has(layer)) layerGroups.set(layer, []);
    layerGroups.get(layer)!.push(id);
  }

  const X_GAP = 260;
  const Y_GAP = 120;

  // Create question nodes
  for (const q of questions) {
    const layer = layers.get(q.questionId) ?? 0;
    const siblings = layerGroups.get(layer) ?? [];
    const colIndex = siblings.indexOf(q.questionId);
    const totalCols = siblings.length;
    const xOffset = (colIndex - (totalCols - 1) / 2) * X_GAP;
    const branchCount = Object.values(q._branches ?? {}).filter((b) => b.nextEntityType !== "none").length;

    nodes.push({
      id: q.questionId,
      type: "question",
      position: { x: 400 + xOffset, y: layer * Y_GAP + 40 },
      data: {
        label: q.content,
        questionType: q.questionType,
        isEntry: firstQuestions.includes(q.questionId),
        isSelected: false,
        optionCount: q.options.length,
        branchCount,
        mandatory: q.mandatory === "True",
      } as QuestionNodeData,
    });
    nodeIds.add(q.questionId);
  }

  // Create subprocess & end nodes
  for (const subId of subprocessIds) {
    const realId = subId.replace("sub_", "");
    const layer = layers.get(subId) ?? layers.get(realId) ?? 1;
    const siblings = layerGroups.get(layer) ?? [];
    const colIndex = siblings.indexOf(subId);
    const totalCols = Math.max(siblings.length, 1);
    const xOffset = (colIndex - (totalCols - 1) / 2) * X_GAP;

    nodes.push({
      id: subId,
      type: "subprocess",
      position: { x: 400 + xOffset, y: layer * Y_GAP + 40 },
      data: { label: realId } as SubprocessNodeData,
    });
  }

  for (const endId of endIds) {
    const layer = layers.get(endId) ?? 1;
    const siblings = layerGroups.get(layer) ?? [];
    const colIndex = siblings.indexOf(endId);
    const totalCols = Math.max(siblings.length, 1);
    const xOffset = (colIndex - (totalCols - 1) / 2) * X_GAP;

    nodes.push({
      id: endId,
      type: "end",
      position: { x: 400 + xOffset, y: layer * Y_GAP + 40 },
      data: {},
    });
  }

  // Create edges
  for (const q of questions) {
    const branches = q._branches ?? {};
    for (const [optId, branch] of Object.entries(branches)) {
      if (branch.nextEntityType === "none") continue;

      let targetId = branch.targetId;
      if (branch.nextEntityType === "subprocess") targetId = `sub_${branch.targetId}`;
      else if (branch.nextEntityType === "end") targetId = `end_${branch.targetId}`;

      const opt = q.options.find((o) => o.id === optId);
      const edgeLabel = opt?.display || optId;

      edges.push({
        id: `${q.questionId}-${optId}-${targetId}`,
        source: q.questionId,
        target: targetId,
        label: edgeLabel,
        type: "smoothstep",
        animated: branch.nextEntityType === "subprocess",
        style: {
          stroke: branch.nextEntityType === "end"
            ? "hsl(var(--destructive))"
            : branch.nextEntityType === "subprocess"
            ? "#f59e0b"
            : "hsl(var(--primary) / 0.5)",
          strokeWidth: 1.5,
        },
        labelStyle: { fontSize: 9, fill: "hsl(var(--muted-foreground))" },
        labelBgStyle: { fill: "hsl(var(--card))", fillOpacity: 0.9 },
        labelBgPadding: [4, 2] as [number, number],
        labelBgBorderRadius: 3,
        markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12 },
      });
    }
  }

  return { nodes, edges };
}

/* ─── Main Component ─── */

interface FlowGraphViewProps {
  onSelectQuestion: (id: string) => void;
  selectedQuestionId: string | null;
}

export default function FlowGraphView({ onSelectQuestion, selectedQuestionId }: FlowGraphViewProps) {
  const { questions, flow } = useQuestionnaireStore();

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const result = layoutGraph(questions, flow.firstQuestions);
    // Mark selected node
    return {
      nodes: result.nodes.map((n) => {
        if (n.type === "question" && n.data) {
          return { ...n, data: { ...n.data, isSelected: n.id === selectedQuestionId } };
        }
        return n;
      }),
      edges: result.edges,
    };
  }, [questions, flow.firstQuestions, selectedQuestionId]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.type === "question") {
        onSelectQuestion(node.id);
      }
    },
    [onSelectQuestion],
  );

  // Converging paths count
  const convergingCount = useMemo(() => {
    const targetCounts = new Map<string, number>();
    for (const e of initialEdges) {
      targetCounts.set(e.target, (targetCounts.get(e.target) ?? 0) + 1);
    }
    return Array.from(targetCounts.values()).filter((c) => c > 1).length;
  }, [initialEdges]);

  // Subprocess count
  const subprocessCount = initialNodes.filter((n) => n.type === "subprocess").length;

  if (questions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        No questions to visualize.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Stats bar */}
      <div className="flex items-center gap-3 px-3 py-1.5 border-b border-border bg-card text-[10px] text-muted-foreground">
        <span>{initialNodes.filter((n) => n.type === "question").length} questions</span>
        <span>{initialEdges.length} connections</span>
        {convergingCount > 0 && (
          <span className="text-primary font-medium">{convergingCount} converging path{convergingCount !== 1 ? "s" : ""}</span>
        )}
        {subprocessCount > 0 && (
          <span className="text-amber-600 font-medium">{subprocessCount} subprocess{subprocessCount !== 1 ? "es" : ""}</span>
        )}
      </div>

      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.1}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="hsl(var(--border))" />
          <Controls className="!shadow-md !border-border !bg-card" />
          <MiniMap
            nodeStrokeColor="hsl(var(--border))"
            nodeColor={(n) =>
              n.type === "subprocess"
                ? "#f59e0b30"
                : n.type === "end"
                ? "hsl(var(--destructive) / 0.2)"
                : "hsl(var(--primary) / 0.15)"
            }
            maskColor="hsl(var(--background) / 0.8)"
            className="!border-border !bg-card/80"
          />
        </ReactFlow>
      </div>
    </div>
  );
}
