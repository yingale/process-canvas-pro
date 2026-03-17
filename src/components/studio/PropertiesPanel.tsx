/**
 * Properties Panel – main shell that routes to sub-panels by selection type.
 */
import { X, Settings2, PanelRightClose, PanelRightOpen } from "lucide-react";
import type { CaseIR, SelectionTarget, Stage, Group, JsonPatch } from "@/types/caseIr";
import StepPropertiesPanel from "./properties/StepPropertiesPanel";
import { TriggerPropertiesPanel, EndEventPropertiesPanel, BoundaryEventPropertiesPanel } from "./properties/EventPropertiesPanel";
import { StagePropertiesPanel, GroupPropertiesPanel, ProcessPropertiesPanel } from "./properties/ProcessPropertiesPanel";
import "./studio.css";

// ─── Path helpers ─────────────────────────────────────────────────────────────

function findStageLocation(
  caseIr: CaseIR, stageId: string
): { arrayPath: string; index: number; stage: Stage } | null {
  const si = caseIr.stages.findIndex(s => s.id === stageId);
  if (si >= 0) return { arrayPath: "/stages", index: si, stage: caseIr.stages[si] };
  const altPaths = caseIr.alternativePaths ?? [];
  const ai = altPaths.findIndex(s => s.id === stageId);
  if (ai >= 0) return { arrayPath: "/alternativePaths", index: ai, stage: altPaths[ai] };
  return null;
}

function findGroupIndex(stage: Stage, groupId: string) {
  return stage.groups.findIndex(g => g.id === groupId);
}

function findStepIndex(group: Group, stepId: string) {
  return group.steps.findIndex(s => s.id === stepId);
}

// ─── Collapse button ──────────────────────────────────────────────────────────

function CollapseBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="hover-btn flex-shrink-0 w-7 h-7 rounded flex items-center justify-center transition-colors"
      onClick={onClick}
      title="Collapse Properties Panel"
    >
      <PanelRightClose size={14} />
    </button>
  );
}

// ─── Panel wrapper ────────────────────────────────────────────────────────────

function PanelShell({
  title, subtitle, onClose, onToggleCollapse, children,
}: {
  title: string; subtitle: string;
  onClose: () => void; onToggleCollapse: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="props-panel h-full flex flex-col border-l">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-widest text-foreground-muted">
            {title}
          </div>
          <div className="text-[13px] font-semibold mt-0.5 truncate text-foreground">
            {subtitle}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <CollapseBtn onClick={onToggleCollapse} />
          <button
            className="hover-btn flex-shrink-0 w-7 h-7 rounded flex items-center justify-center transition-colors"
            onClick={onClose}
          >
            <X size={14} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function PropertiesPanel({
  caseIr, selection, onClose, onPatch, collapsed, onToggleCollapse,
}: {
  caseIr: CaseIR; selection: SelectionTarget; onClose: () => void;
  onPatch: (p: JsonPatch) => void; collapsed: boolean; onToggleCollapse: () => void;
}) {
  if (collapsed) {
    return (
      <div className="props-collapsed h-full flex flex-col items-center border-l py-3 px-1">
        <button
          className="hover-btn w-7 h-7 rounded flex items-center justify-center transition-colors"
          onClick={onToggleCollapse}
          title="Expand Properties Panel"
        >
          <PanelRightOpen size={14} />
        </button>
      </div>
    );
  }

  if (!selection) {
    return (
      <div className="props-panel h-full flex flex-col border-l">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-[10px] font-bold uppercase tracking-widest text-foreground-muted">
            Properties
          </span>
          <CollapseBtn onClick={onToggleCollapse} />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
          <div className="props-empty-icon w-10 h-10 rounded-xl flex items-center justify-center">
            <Settings2 size={18} className="text-foreground-subtle" />
          </div>
          <p className="text-[12px] leading-relaxed text-foreground-muted">
            Select a trigger, stage, group, or step to view and edit its properties
          </p>
        </div>
      </div>
    );
  }

  if (selection.kind === "trigger") {
    return (
      <PanelShell title="Trigger Properties" subtitle="Start Event" onClose={onClose} onToggleCollapse={onToggleCollapse}>
        <TriggerPropertiesPanel trigger={caseIr.trigger} onPatch={onPatch} />
      </PanelShell>
    );
  }

  if (selection.kind === "endEvent") {
    return (
      <PanelShell title="End Event Properties" subtitle={caseIr.endEvent.name ?? "End Event"} onClose={onClose} onToggleCollapse={onToggleCollapse}>
        <EndEventPropertiesPanel endEvent={caseIr.endEvent} onPatch={onPatch} />
      </PanelShell>
    );
  }

  if (selection.kind === "process") {
    return (
      <PanelShell title="Process Properties" subtitle={caseIr.name} onClose={onClose} onToggleCollapse={onToggleCollapse}>
        <ProcessPropertiesPanel caseIr={caseIr} onPatch={onPatch} />
      </PanelShell>
    );
  }

  if (selection.kind === "boundaryEvent") {
    const loc = findStageLocation(caseIr, selection.stageId);
    if (!loc) return null;
    const gi = findGroupIndex(loc.stage, selection.groupId);
    const group = loc.stage.groups[gi];
    if (!group) return null;
    const sti = findStepIndex(group, selection.stepId);
    const step = group.steps[sti];
    if (!step?.boundaryEvents) return null;
    const be = step.boundaryEvents.find(b => b.id === selection.boundaryEventId);
    if (!be) return null;
    const bePath = `${loc.arrayPath}/${loc.index}/groups/${gi}/steps/${sti}/boundaryEvents/${step.boundaryEvents.indexOf(be)}`;
    return (
      <PanelShell title="Boundary Event" subtitle={be.name} onClose={onClose} onToggleCollapse={onToggleCollapse}>
        <BoundaryEventPropertiesPanel boundaryEvent={be} basePath={bePath} onPatch={onPatch} />
      </PanelShell>
    );
  }

  if (!('stageId' in selection)) return null;
  const loc = findStageLocation(caseIr, selection.stageId);
  if (!loc) return null;
  const { stage, arrayPath, index: si } = loc;
  const stagePath = `${arrayPath}/${si}`;

  let title = "Stage";
  let subtitle = stage.name;
  let content: React.ReactNode = (
    <StagePropertiesPanel stage={stage} basePath={stagePath} stageIndex={si} onPatch={onPatch} />
  );

  if (selection.kind === "group" || selection.kind === "step") {
    const gi = findGroupIndex(stage, selection.groupId);
    const group = stage.groups[gi];
    if (!group) return null;

    if (selection.kind === "group") {
      title = "Group";
      subtitle = group.name;
      content = <GroupPropertiesPanel group={group} basePath={`${stagePath}/groups/${gi}`} onPatch={onPatch} />;
    } else {
      const sti = findStepIndex(group, selection.stepId);
      const step = group.steps[sti];
      if (!step) return null;
      title = "Step";
      subtitle = step.name;
      content = <StepPropertiesPanel step={step} basePath={`${stagePath}/groups/${gi}/steps/${sti}`} onPatch={onPatch} formTemplates={caseIr.formTemplates ?? []} caseIr={caseIr} />;
    }
  }

  return (
    <PanelShell title={`${title} Properties`} subtitle={subtitle} onClose={onClose} onToggleCollapse={onToggleCollapse}>
      {content}
    </PanelShell>
  );
}
