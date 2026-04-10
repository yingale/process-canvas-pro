/**
 * BpmnDiagramView – Traditional BPMN diagram rendered with ReactFlow
 * Converts CaseIR to BPMN nodes: circles (events), rectangles (tasks),
 * diamonds (gateways), and arrows (sequence flows).
 */
import { useMemo, useCallback } from "react";
import ReactFlow, {
  Background,
  Controls,
  type Node,
  type Edge,
  MarkerType,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import type { CaseIR, Step, Stage, DecisionStep } from "@/types/caseIr";

// ─── Custom Node Components ──────────────────────────────────────────────────

function StartEventNode({ data }: { data: { label: string; subLabel?: string } }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="w-10 h-10 rounded-full border-[3px] flex items-center justify-center"
        style={{ borderColor: "hsl(134 60% 42%)", background: "hsl(134 60% 95%)" }}
      >
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(134 60% 42%)" }} />
      </div>
      <span className="text-[10px] font-medium text-foreground max-w-[80px] text-center leading-tight">
        {data.label}
      </span>
      {data.subLabel && (
        <span className="text-[8px] text-foreground-muted">{data.subLabel}</span>
      )}
    </div>
  );
}

function EndEventNode({ data }: { data: { label: string } }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="w-10 h-10 rounded-full border-[4px] flex items-center justify-center"
        style={{ borderColor: "hsl(0 68% 50%)", background: "hsl(0 68% 96%)" }}
      >
        <div className="w-3 h-3 rounded-full" style={{ background: "hsl(0 68% 50%)" }} />
      </div>
      <span className="text-[10px] font-medium text-foreground">{data.label}</span>
    </div>
  );
}

function TaskNode({ data }: { data: { label: string; taskType: string; moduleName?: string; color: string } }) {
  return (
    <div
      className="rounded-lg border-2 px-4 py-2.5 min-w-[140px] max-w-[200px] bg-background shadow-sm"
      style={{ borderColor: data.color }}
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <div className="w-2 h-2 rounded-sm" style={{ background: data.color }} />
        <span className="text-[9px] font-medium uppercase tracking-wider" style={{ color: data.color }}>
          {data.taskType}
        </span>
      </div>
      <div className="text-xs font-semibold text-foreground leading-tight">{data.label}</div>
      {data.moduleName && (
        <div className="text-[9px] mt-1 text-foreground-muted">◆ {data.moduleName}</div>
      )}
    </div>
  );
}

function GatewayNode({ data }: { data: { label: string; branches?: string[] } }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="w-12 h-12 flex items-center justify-center"
        style={{ transform: "rotate(45deg)" }}
      >
        <div
          className="w-full h-full border-[3px] flex items-center justify-center"
          style={{ borderColor: "hsl(45 90% 42%)", background: "hsl(45 90% 95%)" }}
        >
          <span
            className="text-lg font-bold"
            style={{ transform: "rotate(-45deg)", color: "hsl(45 90% 32%)" }}
          >
            ✕
          </span>
        </div>
      </div>
      <span className="text-[10px] font-medium text-foreground max-w-[100px] text-center leading-tight mt-1">
        {data.label}
      </span>
    </div>
  );
}

// ─── Node type registry ──────────────────────────────────────────────────────

const nodeTypes = {
  startEvent: StartEventNode,
  endEvent: EndEventNode,
  task: TaskNode,
  gateway: GatewayNode,
};

// ─── Step type metadata ──────────────────────────────────────────────────────

const STEP_COLORS: Record<string, string> = {
  automation: "hsl(213 88% 42%)",
  user: "hsl(32 90% 48%)",
  decision: "hsl(134 60% 42%)",
  foreach: "hsl(268 62% 52%)",
  callActivity: "hsl(193 72% 40%)",
  intermediateEvent: "hsl(199 80% 42%)",
};

const STEP_LABELS: Record<string, string> = {
  automation: "Service Task",
  user: "User Task",
  decision: "Gateway",
  foreach: "Sub-Process",
  callActivity: "Call Activity",
  intermediateEvent: "Catch Event",
};

// ─── Layout constants ────────────────────────────────────────────────────────

const X_START = 60;
const X_GAP = 220;
const Y_MAIN = 200;
const Y_ALT = 500;
const NODE_Y_SPACING = 100;

// ─── Converter ───────────────────────────────────────────────────────────────

function caseIrToBpmnGraph(ir: CaseIR): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  let x = X_START;

  // Start event
  const startId = "bpmn_start";
  nodes.push({
    id: startId,
    type: "startEvent",
    position: { x, y: Y_MAIN },
    data: {
      label: ir.trigger.name || "Start",
      subLabel: ir.trigger.type !== "none" ? ir.trigger.type : undefined,
    },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  });

  let prevId = startId;
  x += X_GAP * 0.7;

  // Flatten all main-flow steps
  const allSteps: { step: Step; stageIdx: number; stageName: string }[] = [];
  ir.stages.forEach((stage, si) => {
    stage.groups.forEach(group => {
      group.steps.forEach(step => {
        allSteps.push({ step, stageIdx: si, stageName: stage.name });
      });
    });
  });

  // Place main-flow steps
  allSteps.forEach(({ step }, i) => {
    const isDecision = step.type === "decision";
    const nodeId = `bpmn_${step.id}`;
    const moduleName = step.moduleRef
      ? step.moduleRef.moduleId.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())
      : undefined;

    if (isDecision) {
      nodes.push({
        id: nodeId,
        type: "gateway",
        position: { x, y: Y_MAIN - 5 },
        data: {
          label: step.name,
          branches: (step as DecisionStep).branches?.map(b => b.label),
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      });
    } else {
      nodes.push({
        id: nodeId,
        type: "task",
        position: { x, y: Y_MAIN },
        data: {
          label: step.name,
          taskType: STEP_LABELS[step.type] || step.type,
          moduleName,
          color: STEP_COLORS[step.type] || "hsl(213 88% 42%)",
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      });
    }

    // Connect from previous
    edges.push({
      id: `e_${prevId}_${nodeId}`,
      source: prevId,
      target: nodeId,
      type: "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
      style: { stroke: "hsl(var(--border))", strokeWidth: 2 },
    });

    // If decision, connect branches
    if (isDecision) {
      const decStep = step as DecisionStep;
      decStep.branches?.forEach((br, bi) => {
        const targetNodeId = br.targetStepId ? `bpmn_${br.targetStepId}` : undefined;
        if (targetNodeId) {
          const isReject = br.label.includes("❌") || br.label.toLowerCase().includes("reject");
          edges.push({
            id: `e_branch_${step.id}_${bi}`,
            source: nodeId,
            target: targetNodeId,
            type: "smoothstep",
            label: br.label.replace(/[✅❌]/g, "").trim(),
            labelStyle: { fontSize: 10, fontWeight: 600 },
            markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
            style: {
              stroke: isReject ? "hsl(0 68% 50%)" : "hsl(134 60% 42%)",
              strokeWidth: 2,
            },
          });
        }
      });
    }

    prevId = nodeId;
    x += X_GAP;
  });

  // End event (connect from last non-decision step)
  const endId = "bpmn_end";
  // Find the last step in the main flow that isn't a decision (or connect from last anyway)
  const lastMainStep = allSteps[allSteps.length - 1];
  const lastMainNodeId = lastMainStep ? `bpmn_${lastMainStep.step.id}` : startId;

  nodes.push({
    id: endId,
    type: "endEvent",
    position: { x, y: Y_MAIN + 5 },
    data: { label: ir.endEvent?.name || "End" },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  });

  // Only connect if last step isn't a decision (decisions connect via branches)
  if (!lastMainStep || lastMainStep.step.type !== "decision") {
    edges.push({
      id: `e_${lastMainNodeId}_${endId}`,
      source: lastMainNodeId,
      target: endId,
      type: "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
      style: { stroke: "hsl(var(--border))", strokeWidth: 2 },
    });
  }

  // Alternative paths
  let altX = X_START + X_GAP * 0.7;
  ir.alternativePaths?.forEach((altStage) => {
    altStage.groups.forEach(group => {
      group.steps.forEach((step, si) => {
        const nodeId = `bpmn_${step.id}`;
        const moduleName = step.moduleRef
          ? step.moduleRef.moduleId.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())
          : undefined;

        // Only add if not already present (decision targets may already exist)
        if (!nodes.find(n => n.id === nodeId)) {
          nodes.push({
            id: nodeId,
            type: "task",
            position: { x: altX + si * X_GAP, y: Y_ALT },
            data: {
              label: step.name,
              taskType: STEP_LABELS[step.type] || step.type,
              moduleName,
              color: "hsl(0 68% 50%)",
            },
            sourcePosition: Position.Right,
            targetPosition: Position.Left,
          });
        }

        // Connect alt steps to end event
        if (si === group.steps.length - 1) {
          edges.push({
            id: `e_alt_${step.id}_end`,
            source: nodeId,
            target: endId,
            type: "smoothstep",
            markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
            style: { stroke: "hsl(0 68% 50%)", strokeWidth: 2, strokeDasharray: "6 3" },
          });
        }
      });
    });
  });

  return { nodes, edges };
}

// ─── Component ───────────────────────────────────────────────────────────────

interface BpmnDiagramViewProps {
  caseIr: CaseIR;
  onSelectStep?: (stageId: string, groupId: string, stepId: string) => void;
}

export default function BpmnDiagramView({ caseIr, onSelectStep }: BpmnDiagramViewProps) {
  const { nodes, edges } = useMemo(() => caseIrToBpmnGraph(caseIr), [caseIr]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (!onSelectStep || !node.id.startsWith("bpmn_")) return;
    const stepId = node.id.replace("bpmn_", "");
    // Find the step in the IR
    const allStages = [...caseIr.stages, ...(caseIr.alternativePaths ?? [])];
    for (const stage of allStages) {
      for (const group of stage.groups) {
        const step = group.steps.find(s => s.id === stepId);
        if (step) {
          onSelectStep(stage.id, group.id, step.id);
          return;
        }
      }
    }
  }, [caseIr, onSelectStep]);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
      >
        <Background gap={20} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
