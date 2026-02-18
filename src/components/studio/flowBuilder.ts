/**
 * Converts a CaseIR into React Flow nodes and edges
 */
import type { Node, Edge } from "reactflow";
import type { CaseIR } from "@/types/caseIr";
import type { StepNodeData, StageHeaderNodeData, TriggerNodeData } from "./FlowNodes";

const STAGE_WIDTH = 240;
const STAGE_GAP = 60;
const STEP_HEIGHT = 100;
const STEP_GAP = 16;
const HEADER_HEIGHT = 80;
const TRIGGER_Y = -120;
const STAGES_START_Y = 0;

export function buildFlowGraph(
  caseIr: CaseIR,
  selectedStageId: string | null,
  selectedStepId: string | null,
  onSelectStage: (stageId: string) => void,
  onSelectStep: (stageId: string, stepId: string) => void,
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Trigger node
  nodes.push({
    id: "trigger",
    type: "triggerNode",
    position: { x: 0, y: TRIGGER_Y },
    data: {
      triggerType: caseIr.trigger.type,
      expression: caseIr.trigger.expression,
      name: caseIr.trigger.name,
    } satisfies TriggerNodeData,
    selectable: false,
    draggable: false,
  });

  let totalStagesWidth = 0;
  if (caseIr.stages.length > 0) {
    totalStagesWidth = caseIr.stages.length * STAGE_WIDTH + (caseIr.stages.length - 1) * STAGE_GAP;
  }

  // Center trigger over stages
  const stagesStartX = 0;

  // Position trigger over center of all stages
  nodes[0].position.x = stagesStartX + totalStagesWidth / 2 - 80;

  caseIr.stages.forEach((stage, si) => {
    const stageX = stagesStartX + si * (STAGE_WIDTH + STAGE_GAP);

    // Stage header node
    const headerNodeId = `stage_header_${stage.id}`;
    nodes.push({
      id: headerNodeId,
      type: "stageHeader",
      position: { x: stageX + 10, y: STAGES_START_Y },
      data: {
        stageName: stage.name,
        stageId: stage.id,
        stepCount: stage.steps.length,
        selected: selectedStageId === stage.id && !selectedStepId,
        onSelect: onSelectStage,
      } satisfies StageHeaderNodeData,
      draggable: false,
      selectable: false,
    });

    // Connect trigger → first stage header
    if (si === 0) {
      edges.push({
        id: `edge_trigger_stage_${stage.id}`,
        source: "trigger",
        target: headerNodeId,
        type: "smoothstep",
        animated: true,
        style: { strokeDasharray: "4 2" },
      });
    }

    // Connect stage headers left→right
    if (si > 0) {
      const prevStage = caseIr.stages[si - 1];
      const prevLastStepId = prevStage.steps.length > 0
        ? `step_${prevStage.steps[prevStage.steps.length - 1].id}`
        : `stage_header_${prevStage.id}`;

      edges.push({
        id: `edge_stage_${prevStage.id}_to_${stage.id}`,
        source: prevLastStepId,
        target: headerNodeId,
        type: "smoothstep",
      });
    }

    // Step nodes (vertical stack)
    stage.steps.forEach((step, stepIdx) => {
      const stepNodeId = `step_${step.id}`;
      const stepY = STAGES_START_Y + HEADER_HEIGHT + stepIdx * (STEP_HEIGHT + STEP_GAP);

      nodes.push({
        id: stepNodeId,
        type: "stepNode",
        position: { x: stageX + 10, y: stepY },
        data: {
          step,
          stageId: stage.id,
          selected: selectedStepId === step.id,
          onSelect: onSelectStep,
        } satisfies StepNodeData,
        draggable: false,
        selectable: false,
      });

      // Connect header → first step
      if (stepIdx === 0) {
        edges.push({
          id: `edge_header_to_step_${step.id}`,
          source: headerNodeId,
          target: stepNodeId,
          type: "smoothstep",
        });
      }

      // Connect steps sequentially
      if (stepIdx > 0) {
        const prevStep = stage.steps[stepIdx - 1];
        edges.push({
          id: `edge_step_${prevStep.id}_to_${step.id}`,
          source: `step_${prevStep.id}`,
          target: stepNodeId,
          type: "smoothstep",
        });
      }
    });
  });

  // End node
  const lastStage = caseIr.stages[caseIr.stages.length - 1];
  const endX = stagesStartX + totalStagesWidth / 2 - 60;
  const maxStepCount = Math.max(...caseIr.stages.map(s => s.steps.length), 0);
  const endY = STAGES_START_Y + HEADER_HEIGHT + maxStepCount * (STEP_HEIGHT + STEP_GAP) + 40;

  nodes.push({
    id: "end",
    type: "endNode",
    position: { x: endX, y: endY },
    data: {},
    selectable: false,
    draggable: false,
  });

  if (lastStage) {
    const lastStepId = lastStage.steps.length > 0
      ? `step_${lastStage.steps[lastStage.steps.length - 1].id}`
      : `stage_header_${lastStage.id}`;
    edges.push({
      id: "edge_to_end",
      source: lastStepId,
      target: "end",
      type: "smoothstep",
    });
  }

  return { nodes, edges };
}
