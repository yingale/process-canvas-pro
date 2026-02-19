/**
 * Converts a CaseIR into React Flow nodes and edges
 * Pega-style: horizontal stage columns, steps stacked vertically below chevron headers
 */
import { MarkerType, type Node, type Edge } from "reactflow";
import type { CaseIR } from "@/types/caseIr";
import type { StepNodeData, StageHeaderNodeData, TriggerNodeData } from "./FlowNodes";

// Layout constants – horizontal Pega layout
const STAGE_COL_WIDTH = 200;   // width of each stage column
const STAGE_GAP = 0;           // no gap – chevrons touch/overlap slightly
const CHEVRON_OVERLAP = 18;    // how much next chevron overlaps previous
const CHEVRON_HEIGHT = 52;
const STEP_HEIGHT = 72;
const STEP_GAP = 8;
const STEP_PADDING_TOP = 12;   // space between chevron row bottom and first step
const STAGES_START_X = 0;
const STAGES_START_Y = 60;     // row of chevrons Y

// Stage colors in order (matches Pega palette: green, red, teal, blue, orange, purple)
export const STAGE_COLORS = [
  "hsl(134 58% 38%)",   // green
  "hsl(0 68% 50%)",     // red/coral
  "hsl(193 70% 42%)",   // teal
  "hsl(213 80% 50%)",   // blue
  "hsl(32 86% 48%)",    // orange
  "hsl(268 60% 50%)",   // purple
];

export function buildFlowGraph(
  caseIr: CaseIR,
  selectedStageId: string | null,
  selectedStepId: string | null,
  onSelectStage: (stageId: string) => void,
  onSelectStep: (stageId: string, stepId: string) => void,
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const stageCount = caseIr.stages.length;
  // Each stage column is STAGE_COL_WIDTH wide; chevrons overlap so total width is less
  const totalWidth = stageCount > 0
    ? STAGES_START_X + stageCount * STAGE_COL_WIDTH - (stageCount - 1) * CHEVRON_OVERLAP
    : STAGE_COL_WIDTH;

  // ── Trigger node (above the stage row, centered) ─────────────────────────
  nodes.push({
    id: "trigger",
    type: "triggerNode",
    position: { x: -80, y: STAGES_START_Y + CHEVRON_HEIGHT / 2 - 18 },
    data: {
      triggerType: caseIr.trigger.type,
      expression: caseIr.trigger.expression,
      name: caseIr.trigger.name,
    } satisfies TriggerNodeData,
    selectable: false,
    draggable: false,
  });

  // ── Stage columns ─────────────────────────────────────────────────────────
  caseIr.stages.forEach((stage, si) => {
    const stageColor = STAGE_COLORS[si % STAGE_COLORS.length];
    const stageX = STAGES_START_X + si * (STAGE_COL_WIDTH - CHEVRON_OVERLAP);

    // Stage chevron header
    const headerNodeId = `stage_header_${stage.id}`;
    nodes.push({
      id: headerNodeId,
      type: "stageHeader",
      position: { x: stageX, y: STAGES_START_Y },
      data: {
        stageName: stage.name,
        stageId: stage.id,
        stepCount: stage.steps.length,
        stageIndex: si,
        stageColor,
        isFirst: si === 0,
        isLast: si === stageCount - 1,
        selected: selectedStageId === stage.id && !selectedStepId,
        onSelect: onSelectStage,
      } satisfies StageHeaderNodeData,
      draggable: false,
      selectable: false,
    });

    // Connect trigger → first stage header (invisible edge just for layout)
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

    // Step cards stacked below the chevron
    stage.steps.forEach((step, stepIdx) => {
      const stepNodeId = `step_${step.id}`;
      const stepY = STAGES_START_Y + CHEVRON_HEIGHT + STEP_PADDING_TOP + stepIdx * (STEP_HEIGHT + STEP_GAP);

      nodes.push({
        id: stepNodeId,
        type: "stepNode",
        position: { x: stageX + 4, y: stepY },
        data: {
          step,
          stageId: stage.id,
          stageColor,
          selected: selectedStepId === step.id,
          onSelect: onSelectStep,
        } satisfies StepNodeData,
        draggable: false,
        selectable: false,
      });
    });
  });

  return { nodes, edges };
}
