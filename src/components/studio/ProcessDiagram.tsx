/**
 * Process Diagram – React Flow canvas for the Pega-style workflow view
 * Uses ReactFlow's onNodeClick to reliably handle all click events,
 * including stage header clicks, step clicks, and add buttons.
 */
import ReactFlow, {
  Background,
  Controls,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeMouseHandler,
} from "reactflow";
import "reactflow/dist/style.css";
import { useEffect, useCallback } from "react";
import { NODE_TYPES } from "./FlowNodes";
import { buildFlowGraph } from "./flowBuilder";
import type { CaseIR } from "@/types/caseIr";
import type { SelectionTarget } from "@/types/caseIr";

interface ProcessDiagramProps {
  caseIr: CaseIR;
  selection: SelectionTarget;
  onSelectStage: (stageId: string) => void;
  onSelectStep: (stageId: string, stepId: string) => void;
  onAddStep: (stageId: string) => void;
  onAddStage: () => void;
}

export default function ProcessDiagram({
  caseIr,
  selection,
  onSelectStage,
  onSelectStep,
  onAddStep,
  onAddStage,
}: ProcessDiagramProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node[]>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([]);

  useEffect(() => {
    const selectedStageId = (selection && 'stageId' in selection) ? selection.stageId : null;
    const selectedStepId = selection?.kind === "step" ? selection.stepId : null;
    const { nodes: n, edges: e } = buildFlowGraph(
      caseIr,
      selectedStageId,
      selectedStepId,
      onSelectStage,
      onSelectStep,
      onAddStep,
      onAddStage,
    );
    setNodes(n);
    setEdges(e);
  }, [caseIr, selection, onSelectStage, onSelectStep, onAddStep, onAddStage, setNodes, setEdges]);

  // Route all node clicks through ReactFlow's handler to bypass event blocking
  const handleNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    const id = node.id;

    // Add stage button
    if (id === "add_stage") {
      onAddStage();
      return;
    }

    // Add step button — id: add_step_<stageId>
    if (id.startsWith("add_step_")) {
      const stageId = id.slice("add_step_".length);
      onAddStep(stageId);
      return;
    }

    // Stage header — id: stage_header_<stageId>
    if (id.startsWith("stage_header_")) {
      const stageId = id.slice("stage_header_".length);
      onSelectStage(stageId);
      return;
    }

    // Step node — id: step_<stepId>; data contains stageId
    if (id.startsWith("step_")) {
      const data = node.data as { stageId: string; step: { id: string } };
      onSelectStep(data.stageId, data.step.id);
      return;
    }
  }, [onAddStage, onAddStep, onSelectStage, onSelectStep]);

  return (
    <div className="w-full h-full" style={{ background: "hsl(var(--canvas-bg))" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={NODE_TYPES}
        onNodeClick={handleNodeClick}
        fitView
        fitViewOptions={{ padding: 0.15, maxZoom: 1.0 }}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        // Allow clicking on non-selectable nodes (add buttons) via onNodeClick
        nodesFocusable={false}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.2}
          color="hsl(var(--canvas-dot))"
        />
        <Controls />
      </ReactFlow>
    </div>
  );
}
