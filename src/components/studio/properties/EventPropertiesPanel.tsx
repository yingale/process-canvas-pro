/**
 * Trigger, EndEvent, and BoundaryEvent property editors.
 */
import { useState, useEffect, useCallback } from "react";
import type { Trigger, EndEvent, BoundaryEvent, JsonPatch } from "@/types/caseIr";
import { TRIGGER_PROP_GROUPS } from "../camundaSchema";
import {
  deepGet, deepSet, SectionHeader, Field, TextInput,
  ExpressionInput, Toggle, SelectInput, FieldRenderer,
} from "./PropertyFields";

// ─── Trigger ──────────────────────────────────────────────────────────────────

export function TriggerPropertiesPanel({
  trigger, onPatch,
}: {
  trigger: Trigger; onPatch: (p: JsonPatch) => void;
}) {
  const [draft, setDraft] = useState<Record<string, unknown>>(
    trigger as unknown as Record<string, unknown>
  );
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    new Set(["trigger-type", "trigger-async"])
  );
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDraft(trigger as unknown as Record<string, unknown>);
    setDirty(false);
  }, [trigger.type, trigger.expression, trigger.name]);

  const toggleGroup = (id: string) => setOpenGroups(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const handleChange = useCallback((key: string, value: unknown) => {
    setDraft(d => deepSet(d, key, value));
    setDirty(true);
  }, []);

  const handleSave = () => {
    onPatch([{ op: "replace", path: "/trigger", value: draft }]);
    setDirty(false);
  };

  const triggerType = String(draft.type ?? "none");

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 flex-wrap px-4 py-3 border-b border-border">
        <div className="type-badge--primary px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide">
          Start Event
        </div>
        {trigger.source?.bpmnElementId && (
          <span className="font-mono text-[10px] opacity-60 truncate max-w-full text-foreground-subtle" title={trigger.source.bpmnElementId}>
            #{trigger.source.bpmnElementId}
          </span>
        )}
      </div>

      {TRIGGER_PROP_GROUPS.map(group => {
        const isOpen = openGroups.has(group.id);
        return (
          <div key={group.id}>
            <SectionHeader title={group.title} open={isOpen} onToggle={() => toggleGroup(group.id)} />
            {isOpen && (
              <div className="px-4 py-3 space-y-3">
                {group.fields.map(field => {
                  if (field.key === "expression" && triggerType !== "timer") return null;
                  if (field.key === "messageRef" && triggerType !== "message") return null;
                  const val = deepGet(draft as Record<string, unknown>, field.key);
                  if (field.type === "boolean") {
                    const boolVal = typeof val === "boolean" ? val : (field.default as boolean ?? false);
                    return <Toggle key={field.key} checked={boolVal} onChange={v => handleChange(field.key, v)} label={field.label} />;
                  }
                  return (
                    <Field key={field.key} label={field.label} hint={field.hint}>
                      <FieldRenderer field={field} value={val} onChange={v => handleChange(field.key, v)} />
                    </Field>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <div className="p-4 border-t border-border mt-auto">
        <button className={`w-full py-2 rounded-md text-sm font-semibold transition-all ${dirty ? "save-btn--active" : "save-btn--inactive"}`} onClick={handleSave}>
          {dirty ? "Save Changes" : "No Changes"}
        </button>
      </div>
    </div>
  );
}

// ─── End Event ────────────────────────────────────────────────────────────────

export function EndEventPropertiesPanel({
  endEvent, onPatch,
}: {
  endEvent: EndEvent; onPatch: (p: JsonPatch) => void;
}) {
  const [draft, setDraft] = useState<Record<string, unknown>>(
    endEvent as unknown as Record<string, unknown>
  );
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDraft(endEvent as unknown as Record<string, unknown>);
    setDirty(false);
  }, [endEvent.id, endEvent.eventType]);

  const handleChange = useCallback((key: string, value: unknown) => {
    setDraft(d => deepSet(d, key, value));
    setDirty(true);
  }, []);

  const handleSave = () => {
    onPatch([{ op: "replace", path: "/endEvent", value: draft }]);
    setDirty(false);
  };

  const eventType = String(draft.eventType ?? "none");

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 flex-wrap px-4 py-3 border-b border-border">
        <div className="type-badge--end px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide">
          End Event
        </div>
        {endEvent.source?.bpmnElementId && (
          <span className="font-mono text-[10px] opacity-60 text-foreground-subtle">
            #{endEvent.source.bpmnElementId}
          </span>
        )}
      </div>
      <div className="px-4 py-3 space-y-3">
        <Field label="Event Type">
          <SelectInput value={eventType} onChange={v => handleChange("eventType", v)}
            options={[
              { label: "None", value: "none" }, { label: "Terminate", value: "terminate" },
              { label: "Error", value: "error" }, { label: "Message", value: "message" },
              { label: "Signal", value: "signal" }, { label: "Escalation", value: "escalation" },
              { label: "Compensate", value: "compensate" },
            ]}
          />
        </Field>
        <Field label="Name">
          <TextInput value={String(draft.name ?? "")} onChange={v => handleChange("name", v)} placeholder="End Event name" />
        </Field>
        {(eventType === "error" || eventType === "escalation") && (
          <Field label="Error/Escalation Code" hint="Reference code for the error or escalation">
            <TextInput value={String(draft.expression ?? "")} onChange={v => handleChange("expression", v)} placeholder="errorCode" mono />
          </Field>
        )}
      </div>
      <div className="px-4 py-3 space-y-3 border-t border-border">
        <Toggle checked={typeof deepGet(draft, "tech.asyncBefore") === "boolean" ? deepGet(draft, "tech.asyncBefore") as boolean : false}
          onChange={v => handleChange("tech.asyncBefore", v)} label="Async Before" />
        <Toggle checked={typeof deepGet(draft, "tech.asyncAfter") === "boolean" ? deepGet(draft, "tech.asyncAfter") as boolean : false}
          onChange={v => handleChange("tech.asyncAfter", v)} label="Async After" />
      </div>
      <div className="p-4 border-t border-border mt-auto">
        <button className={`w-full py-2 rounded-md text-sm font-semibold transition-all ${dirty ? "save-btn--active" : "save-btn--inactive"}`} onClick={handleSave}>
          {dirty ? "Save Changes" : "No Changes"}
        </button>
      </div>
    </div>
  );
}

// ─── Boundary Event ───────────────────────────────────────────────────────────

export function BoundaryEventPropertiesPanel({
  boundaryEvent, basePath, onPatch,
}: {
  boundaryEvent: BoundaryEvent; basePath: string; onPatch: (p: JsonPatch) => void;
}) {
  const [draft, setDraft] = useState<Record<string, unknown>>(
    boundaryEvent as unknown as Record<string, unknown>
  );
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDraft(boundaryEvent as unknown as Record<string, unknown>);
    setDirty(false);
  }, [boundaryEvent.id]);

  const handleChange = useCallback((key: string, value: unknown) => {
    setDraft(d => deepSet(d, key, value));
    setDirty(true);
  }, []);

  const handleSave = () => {
    onPatch([{ op: "replace", path: basePath, value: draft }]);
    setDirty(false);
  };

  const evtType = String(draft.eventType ?? "generic");

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 flex-wrap px-4 py-3 border-b border-border">
        <div className="type-badge--boundary px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide">
          Boundary · {evtType}
        </div>
      </div>
      <div className="px-4 py-3 space-y-3">
        <Field label="Event Type">
          <SelectInput value={evtType} onChange={v => handleChange("eventType", v)}
            options={[
              { label: "Timer", value: "timer" }, { label: "Message", value: "message" },
              { label: "Signal", value: "signal" }, { label: "Error", value: "error" },
              { label: "Escalation", value: "escalation" }, { label: "Conditional", value: "conditional" },
            ]}
          />
        </Field>
        <Field label="Name">
          <TextInput value={String(draft.name ?? "")} onChange={v => handleChange("name", v)} placeholder="Boundary event name" />
        </Field>
        <Toggle checked={draft.cancelActivity !== false} onChange={v => handleChange("cancelActivity", v)} label="Interrupting (Cancel Activity)" />
        {(evtType === "timer" || evtType === "error" || evtType === "message") && (
          <Field label="Expression" hint={evtType === "timer" ? "Timer duration/cycle" : evtType === "error" ? "Error code" : "Message name"}>
            <ExpressionInput value={String(draft.expression ?? "")} onChange={v => handleChange("expression", v)} placeholder={evtType === "timer" ? "PT5M" : "ref"} />
          </Field>
        )}
      </div>
      <div className="px-4 py-3 space-y-3 border-t border-border">
        <Toggle checked={typeof deepGet(draft, "tech.asyncBefore") === "boolean" ? deepGet(draft, "tech.asyncBefore") as boolean : false}
          onChange={v => handleChange("tech.asyncBefore", v)} label="Async Before" />
        <Toggle checked={typeof deepGet(draft, "tech.asyncAfter") === "boolean" ? deepGet(draft, "tech.asyncAfter") as boolean : false}
          onChange={v => handleChange("tech.asyncAfter", v)} label="Async After" />
      </div>
      <div className="p-4 border-t border-border mt-auto">
        <button className={`w-full py-2 rounded-md text-sm font-semibold transition-all ${dirty ? "save-btn--active" : "save-btn--inactive"}`} onClick={handleSave}>
          {dirty ? "Save Changes" : "No Changes"}
        </button>
      </div>
    </div>
  );
}
