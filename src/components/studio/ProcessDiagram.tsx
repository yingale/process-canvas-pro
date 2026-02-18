/**
 * Process Diagram – React Flow canvas for the Pega-style workflow view
 */
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from "reactflow";
import "reactflow/dist/style.css";
import { useEffect } from "react";
import { NODE_TYPES } from "./FlowNodes";
import { buildFlowGraph } from "./flowBuilder";
import type { CaseIR } from "@/types/caseIr";
import type { SelectionTarget } from "@/types/caseIr";

interface ProcessDiagramProps {
  caseIr: CaseIR;
  selection: SelectionTarget;
  onSelectStage: (stageId: string) => void;
  onSelectStep: (stageId: string, stepId: string) => void;
}

export default function ProcessDiagram({
  caseIr,
  selection,
  onSelectStage,
  onSelectStep,
}: ProcessDiagramProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node[]>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([]);

  useEffect(() => {
    const selectedStageId = selection?.stageId ?? null;
    const selectedStepId = selection?.kind === "step" ? selection.stepId : null;
    const { nodes: n, edges: e } = buildFlowGraph(
      caseIr,
      selectedStageId,
      selectedStepId,
      onSelectStage,
      onSelectStep,
    );
    setNodes(n);
    setEdges(e);
  }, [caseIr, selection, onSelectStage, onSelectStep, setNodes, setEdges]);

  return (
    <div className="w-full h-full" style={{ background: "hsl(var(--canvas-bg))" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.15, maxZoom: 1.2 }}
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.5}
          color="hsl(var(--canvas-dot))"
        />
        <Controls />
        <MiniMap
          nodeColor={(n) => {
            if (n.type === "triggerNode") return "hsl(var(--primary))";
            if (n.type === "endNode") return "hsl(var(--foreground-subtle))";
            if (n.type === "stageHeader") return "hsl(var(--surface-overlay))";
            return "hsl(var(--surface-raised))";
          }}
          maskColor="hsl(var(--canvas-bg) / 0.8)"
        />
      </ReactFlow>
    </div>
  );
}
