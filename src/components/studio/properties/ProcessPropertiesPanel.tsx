/**
 * Process, Stage, and Group property editors.
 */
import { useState, useEffect, useCallback } from "react";
import type { CaseIR, Stage, Group, ProcessProperties, JsonPatch } from "@/types/caseIr";
import { Field, TextInput, ExpressionInput, Toggle } from "./PropertyFields";

// ─── Stage ────────────────────────────────────────────────────────────────────

export function StagePropertiesPanel({
  stage, basePath, onPatch,
}: {
  stage: Stage; basePath: string; stageIndex: number; onPatch: (p: JsonPatch) => void;
}) {
  const [name, setName] = useState(stage.name);
  useEffect(() => setName(stage.name), [stage.id]);
  const totalSteps = stage.groups.reduce((n, g) => n + g.steps.length, 0);

  return (
    <div className="p-4 space-y-4">
      <Field label="Stage Name">
        <TextInput value={name} onChange={setName} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <div className="stat-card rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-foreground">{stage.groups.length}</div>
          <div className="text-[10px] text-foreground-muted">Groups</div>
        </div>
        <div className="stat-card rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-foreground">{totalSteps}</div>
          <div className="text-[10px] text-foreground-muted">Steps</div>
        </div>
      </div>
      <button
        className="save-btn--active w-full py-2 rounded-md text-sm font-semibold"
        onClick={() => {
          if (name !== stage.name) {
            onPatch([{ op: "replace", path: `${basePath}/name`, value: name }]);
          }
        }}
      >
        Save Stage
      </button>
    </div>
  );
}

// ─── Group ────────────────────────────────────────────────────────────────────

export function GroupPropertiesPanel({
  group, basePath, onPatch,
}: {
  group: Group; basePath: string; onPatch: (p: JsonPatch) => void;
}) {
  const [name, setName] = useState(group.name);
  useEffect(() => setName(group.name), [group.id]);

  return (
    <div className="p-4 space-y-4">
      <Field label="Group Name">
        <TextInput value={name} onChange={setName} />
      </Field>
      <div className="stat-card rounded-lg p-3 text-center">
        <div className="text-lg font-bold text-foreground">{group.steps.length}</div>
        <div className="text-[10px] text-foreground-muted">Steps</div>
      </div>
      <button
        className="save-btn--active w-full py-2 rounded-md text-sm font-semibold"
        onClick={() => {
          if (name !== group.name) {
            onPatch([{ op: "replace", path: `${basePath}/name`, value: name }]);
          }
        }}
      >
        Save Group
      </button>
    </div>
  );
}

// ─── Process ──────────────────────────────────────────────────────────────────

export function ProcessPropertiesPanel({
  caseIr, onPatch,
}: {
  caseIr: CaseIR; onPatch: (p: JsonPatch) => void;
}) {
  const props = caseIr.processProperties ?? {};
  const [draft, setDraft] = useState<Record<string, unknown>>({
    name: caseIr.name, id: caseIr.id, version: caseIr.version, ...props,
  });
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDraft({
      name: caseIr.name, id: caseIr.id, version: caseIr.version,
      ...(caseIr.processProperties ?? {}),
    });
    setDirty(false);
  }, [caseIr.id, caseIr.name]);

  const handleChange = useCallback((key: string, value: unknown) => {
    setDraft(d => ({ ...d, [key]: value }));
    setDirty(true);
  }, []);

  const handleSave = () => {
    const patch: JsonPatch = [];
    if (draft.name !== caseIr.name) patch.push({ op: "replace", path: "/name", value: draft.name });
    if (draft.version !== caseIr.version) patch.push({ op: "replace", path: "/version", value: draft.version });
    const procProps: ProcessProperties = {};
    if (draft.isExecutable !== undefined) procProps.isExecutable = draft.isExecutable as boolean;
    if (draft.versionTag) procProps.versionTag = String(draft.versionTag);
    if (draft.historyTimeToLive) procProps.historyTimeToLive = String(draft.historyTimeToLive);
    if (draft.candidateStarterGroups) procProps.candidateStarterGroups = String(draft.candidateStarterGroups);
    if (draft.candidateStarterUsers) procProps.candidateStarterUsers = String(draft.candidateStarterUsers);
    if (draft.jobPriority) procProps.jobPriority = String(draft.jobPriority);
    if (draft.taskPriority) procProps.taskPriority = String(draft.taskPriority);
    patch.push({ op: "replace", path: "/processProperties", value: procProps });
    if (patch.length) onPatch(patch);
    setDirty(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 flex-wrap px-4 py-3 border-b border-border">
        <div className="type-badge--primary px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide">Process</div>
        <span className="font-mono text-[10px] opacity-60 text-foreground-subtle">{caseIr.id}</span>
      </div>
      <div className="px-4 py-3 space-y-3">
        <Field label="Process Name">
          <TextInput value={String(draft.name ?? "")} onChange={v => handleChange("name", v)} placeholder="Process name" />
        </Field>
        <Field label="Version">
          <TextInput value={String(draft.version ?? "")} onChange={v => handleChange("version", v)} placeholder="1.0.0" mono />
        </Field>
        <Toggle checked={draft.isExecutable === true} onChange={v => handleChange("isExecutable", v)} label="Is Executable" />
      </div>
      <div className="px-4 py-3 space-y-3 border-t border-border">
        <Field label="Version Tag" hint="Camunda version tag for deployment">
          <TextInput value={String(draft.versionTag ?? "")} onChange={v => handleChange("versionTag", v)} placeholder="release-1.0" mono />
        </Field>
        <Field label="History Time To Live" hint="Days to keep process history (e.g., 180)">
          <TextInput value={String(draft.historyTimeToLive ?? "")} onChange={v => handleChange("historyTimeToLive", v)} placeholder="180" mono />
        </Field>
        <Field label="Candidate Starter Groups" hint="Comma-separated groups allowed to start this process">
          <TextInput value={String(draft.candidateStarterGroups ?? "")} onChange={v => handleChange("candidateStarterGroups", v)} placeholder="managers, admins" />
        </Field>
        <Field label="Candidate Starter Users" hint="Comma-separated users allowed to start this process">
          <TextInput value={String(draft.candidateStarterUsers ?? "")} onChange={v => handleChange("candidateStarterUsers", v)} placeholder="user1, user2" />
        </Field>
        <Field label="Default Job Priority" hint="Default priority for all jobs in this process">
          <ExpressionInput value={String(draft.jobPriority ?? "")} onChange={v => handleChange("jobPriority", v)} placeholder="${priority}" />
        </Field>
        <Field label="Default Task Priority" hint="Default priority for external tasks">
          <ExpressionInput value={String(draft.taskPriority ?? "")} onChange={v => handleChange("taskPriority", v)} placeholder="${priority}" />
        </Field>
      </div>
      <div className="p-4 border-t border-border mt-auto">
        <button className={`w-full py-2 rounded-md text-sm font-semibold transition-all ${dirty ? "save-btn--active" : "save-btn--inactive"}`} onClick={handleSave}>
          {dirty ? "Save Changes" : "No Changes"}
        </button>
      </div>
    </div>
  );
}
