/**
 * Converts a CaseIR into React Flow nodes/edges.
 * Updated for Section → Groups → Steps hierarchy.
 */
import { MarkerType, type Node, type Edge } from "reactflow";
import type { CaseIR } from "@/types/caseIr";
import type { StepNodeData, StageHeaderNodeData, TriggerNodeData, AddStepNodeData, AddStageNodeData } from "./FlowNodes";

const STAGE_COL_WIDTH = 210;
const CHEVRON_OVERLAP = 18;
const CHEVRON_HEIGHT = 56;
const STEP_HEIGHT = 76;
const STEP_GAP = 10;
const STEP_PADDING_TOP = 14;
const STAGES_START_X = 0;
const STAGES_START_Y = 60;

export const STAGE_COLORS = [
  "hsl(134 58% 38%)",
  "hsl(0 68% 50%)",
  "hsl(193 70% 42%)",
  "hsl(213 80% 50%)",
  "hsl(32 86% 48%)",
  "hsl(268 60% 50%)",
];

export function buildFlowGraph(
  caseIr: CaseIR,
  selectedStageId: string | null,
  selectedStepId: string | null,
  onSelectStage: (stageId: string) => void,
  onSelectStep: (stageId: string, stepId: string) => void,
  onAddStep: (stageId: string) => void,
  onAddStage: () => void,
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const stageCount = caseIr.stages.length;

  nodes.push({
    id: "trigger",
    type: "triggerNode",
    position: { x: -100, y: STAGES_START_Y + CHEVRON_HEIGHT / 2 - 18 },
    data: { triggerType: caseIr.trigger.type, expression: caseIr.trigger.expression, name: caseIr.trigger.name } satisfies TriggerNodeData,
    selectable: false, draggable: false,
  });

  caseIr.stages.forEach((stage, si) => {
    const stageColor = STAGE_COLORS[si % STAGE_COLORS.length];
    const stageX = STAGES_START_X + si * (STAGE_COL_WIDTH - CHEVRON_OVERLAP);

    // Flatten all steps across all groups for layout
    const allSteps = stage.groups.flatMap(g => g.steps);

    const headerNodeId = `stage_header_${stage.id}`;
    nodes.push({
      id: headerNodeId,
      type: "stageHeader",
      position: { x: stageX, y: STAGES_START_Y },
      data: {
        stageName: stage.name,
        stageId: stage.id,
        stepCount: allSteps.length,
        stageIndex: si,
        stageColor,
        isFirst: si === 0,
        isLast: si === stageCount - 1,
        selected: selectedStageId === stage.id && !selectedStepId,
        onSelect: onSelectStage,
      } satisfies StageHeaderNodeData,
      draggable: false,
    });

    if (si === 0) {
      edges.push({
        id: `edge_trigger_to_stage_${stage.id}`,
        source: "trigger",
        target: headerNodeId,
        type: "straight",
        style: { stroke: "hsl(213 80% 52%)", strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(213 80% 52%)" },
      });
    }

    allSteps.forEach((step, stepIdx) => {
      const stepY = STAGES_START_Y + CHEVRON_HEIGHT + STEP_PADDING_TOP + stepIdx * (STEP_HEIGHT + STEP_GAP);
      nodes.push({
        id: `step_${step.id}`,
        type: "stepNode",
        position: { x: stageX + 5, y: stepY },
        data: { step, stageId: stage.id, stageColor, selected: selectedStepId === step.id, onSelect: onSelectStep } satisfies StepNodeData,
        draggable: false,
      });
    });

    const addStepY = STAGES_START_Y + CHEVRON_HEIGHT + STEP_PADDING_TOP + allSteps.length * (STEP_HEIGHT + STEP_GAP);
    nodes.push({
      id: `add_step_${stage.id}`,
      type: "addStepNode",
      position: { x: stageX + 5, y: addStepY },
      data: { stageId: stage.id, stageColor, onAddStep } satisfies AddStepNodeData,
      draggable: false, selectable: false,
    });
  });

  const addStageX = STAGES_START_X + stageCount * (STAGE_COL_WIDTH - CHEVRON_OVERLAP) + 16;
  nodes.push({
    id: "add_stage",
    type: "addStageNode",
    position: { x: addStageX, y: STAGES_START_Y },
    data: { onAddStage } satisfies AddStageNodeData,
    draggable: false, selectable: false,
  });

  return { nodes, edges };
}
