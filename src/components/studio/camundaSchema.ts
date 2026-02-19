/**
 * Camunda 7 property schema – static configuration derived from camunda-bpmn-moddle.
 * Defines every editable property group per BPMN element type, with:
 *  - label, type (text|boolean|select|expression|multiline|table), default/placeholder
 *  - which element types the group applies to
 */

export type PropFieldType = "text" | "boolean" | "select" | "expression" | "multiline" | "table";

export interface PropField {
  key: string;            // JSON key in tech/step object
  label: string;
  type: PropFieldType;
  placeholder?: string;
  default?: string | boolean;
  options?: { label: string; value: string }[];
  mono?: boolean;
  hint?: string;
}

export interface PropGroup {
  id: string;
  title: string;
  /** Which step.type values show this group. Empty = all. */
  appliesTo: string[];
  /** Fine-grained: also check step.source?.bpmnElementType */
  appliesIfBpmnType?: string[];
  fields: PropField[];
}

// ─── Shared field definitions ─────────────────────────────────────────────────

const asyncFields: PropField[] = [
  { key: "tech.asyncBefore", label: "Async Before", type: "boolean", default: false, hint: "Execute before token moves to this element" },
  { key: "tech.asyncAfter",  label: "Async After",  type: "boolean", default: false, hint: "Execute after token leaves this element" },
  { key: "tech.exclusive",   label: "Exclusive",     type: "boolean", default: true,  hint: "Limit to one active job" },
  { key: "tech.jobPriority", label: "Job Priority",  type: "expression", placeholder: "${priority}", hint: "Higher = executed first" },
];

const ioParamsGroup: PropGroup = {
  id: "io-params",
  title: "Input / Output Parameters",
  appliesTo: ["automation", "user", "foreach", "callActivity"],
  fields: [], // rendered specially as tables – see PropertiesPanel
};

// ─── All property groups ──────────────────────────────────────────────────────

export const CAMUNDA_PROP_GROUPS: PropGroup[] = [
  // ── General / Job ────────────────────────────────────────────────────────
  {
    id: "async",
    title: "Asynchronous Continuations",
    appliesTo: ["automation", "user", "decision", "foreach", "callActivity", "intermediateEvent"],
    fields: asyncFields,
  },

  // ── Service / External Task ───────────────────────────────────────────────
  {
    id: "service-task",
    title: "Service Task",
    appliesTo: ["automation"],
    appliesIfBpmnType: ["serviceTask", "sendTask", "businessRuleTask"],
    fields: [
      {
        key: "tech.implementationType",
        label: "Implementation",
        type: "select",
        default: "external",
        options: [
          { label: "External Task (topic)", value: "external" },
          { label: "Java Class", value: "class" },
          { label: "Expression", value: "expression" },
          { label: "Delegate Expression", value: "delegateExpression" },
          { label: "Connector", value: "connector" },
        ],
        hint: "How the task is executed"
      },
      { key: "tech.topic",              label: "External Task Topic",     type: "text",       placeholder: "my-worker-topic",   mono: true, hint: "Topic subscribed by the external worker" },
      { key: "tech.taskPriority",       label: "Task Priority",           type: "expression", placeholder: "${priority}",        hint: "Priority relative to other external tasks" },
      { key: "tech.class",              label: "Java Class",              type: "text",       placeholder: "org.example.MyDelegate", mono: true },
      { key: "tech.expression",         label: "Expression",              type: "expression", placeholder: "${myService.execute(execution)}" },
      { key: "tech.delegateExpression", label: "Delegate Expression",     type: "expression", placeholder: "${myDelegate}" },
      { key: "tech.resultVariable",     label: "Result Variable",         type: "text",       placeholder: "resultVar",         mono: true, hint: "Store return value in this process variable" },
    ],
  },

  // ── Script Task ───────────────────────────────────────────────────────────
  {
    id: "script-task",
    title: "Script Task",
    appliesTo: ["automation"],
    appliesIfBpmnType: ["scriptTask"],
    fields: [
      { key: "tech.scriptFormat",   label: "Script Format",   type: "text",      placeholder: "groovy",        mono: true },
      { key: "tech.script",         label: "Script",          type: "multiline", placeholder: "// groovy script...", mono: true },
      { key: "tech.resource",       label: "Resource",        type: "text",      placeholder: "scripts/myScript.groovy", hint: "External script file path" },
      { key: "tech.resultVariable", label: "Result Variable", type: "text",      placeholder: "resultVar",     mono: true },
    ],
  },

  // ── User Task ─────────────────────────────────────────────────────────────
  {
    id: "user-task",
    title: "User Task Assignment",
    appliesTo: ["user"],
    fields: [
      { key: "tech.assignee",           label: "Assignee",             type: "expression", placeholder: "${initiator}",       hint: "Single user assigned to this task" },
      { key: "tech.candidateUsers",     label: "Candidate Users",      type: "text",       placeholder: "user1, user2",       hint: "Comma-separated list of users" },
      { key: "tech.candidateGroups",    label: "Candidate Groups",     type: "text",       placeholder: "managers, hr",       hint: "Comma-separated list of groups" },
      { key: "tech.dueDate",            label: "Due Date",             type: "expression", placeholder: "${now() + duration('P3D')}", hint: "ISO 8601 date or FEEL expression" },
      { key: "tech.followUpDate",       label: "Follow-up Date",       type: "expression", placeholder: "${now() + duration('P1D')}" },
      { key: "tech.priority",           label: "Priority",             type: "expression", placeholder: "50",                 hint: "0–100, higher means more urgent" },
    ],
  },

  // ── User Task Form ────────────────────────────────────────────────────────
  {
    id: "user-task-form",
    title: "Form",
    appliesTo: ["user"],
    fields: [
      {
        key: "tech.formKey",
        label: "Form Key",
        type: "text",
        placeholder: "embedded:app:forms/my-form.html",
        hint: "embedded:app, deployment, or camunda-forms reference"
      },
      { key: "tech.formRef",        label: "Form Ref (Deployed)",  type: "text",   placeholder: "myForm",  mono: true },
      { key: "tech.formRefBinding", label: "Form Ref Binding",     type: "select", default: "latest",
        options: [{ label: "Latest", value: "latest" }, { label: "Version", value: "version" }, { label: "Version Tag", value: "versionTag" }]
      },
      { key: "tech.formRefVersion", label: "Form Ref Version",     type: "text",   placeholder: "1",       mono: true },
    ],
  },

  // ── Call Activity ─────────────────────────────────────────────────────────
  {
    id: "call-activity",
    title: "Called Process",
    appliesTo: ["callActivity"],
    fields: [
      { key: "calledElement",                       label: "Called Element",         type: "text",      placeholder: "mySubProcess",   mono: true },
      { key: "tech.calledElementBinding",           label: "Binding",                type: "select",    default: "latest",
        options: [{ label: "Latest", value: "latest" }, { label: "Version", value: "version" }, { label: "Version Tag", value: "versionTag" }, { label: "Deployment", value: "deployment" }]
      },
      { key: "tech.calledElementVersion",           label: "Version",                type: "text",      placeholder: "1",              mono: true },
      { key: "tech.calledElementVersionTag",        label: "Version Tag",            type: "text",      placeholder: "release-1.0",    mono: true },
      { key: "tech.calledElementTenantId",          label: "Tenant Id",              type: "expression", placeholder: "${tenantId}" },
      { key: "tech.variableMappingClass",           label: "Variable Mapping Class", type: "text",      placeholder: "org.example.VariableMapping", mono: true },
      { key: "tech.variableMappingDelegateExpression", label: "Variable Mapping Expr", type: "expression", placeholder: "${variableMapping}" },
    ],
  },

  // ── For Each (Multi-instance) ─────────────────────────────────────────────
  {
    id: "foreach",
    title: "Multi-Instance Loop",
    appliesTo: ["foreach"],
    fields: [
      { key: "collectionExpression",                   label: "Collection",           type: "expression", placeholder: "${items}", hint: "Process variable holding the collection" },
      { key: "elementVariable",                        label: "Element Variable",     type: "text",       placeholder: "item",    mono: true },
      { key: "isSequential",                           label: "Sequential",           type: "boolean",    default: false,         hint: "If false, all instances run in parallel" },
      { key: "tech.multiInstance.completionCondition", label: "Completion Condition", type: "expression", placeholder: "${nrOfCompletedInstances >= 1}", hint: "Early-terminate loop when true" },
    ],
  },

  // ── Gateway / Decision ────────────────────────────────────────────────────
  {
    id: "gateway",
    title: "Gateway",
    appliesTo: ["decision"],
    fields: [
      { key: "tech.asyncBefore",   label: "Async Before", type: "boolean", default: false },
      { key: "tech.asyncAfter",    label: "Async After",  type: "boolean", default: false },
      { key: "tech.exclusive",     label: "Exclusive",    type: "boolean", default: true },
      { key: "tech.jobPriority",   label: "Job Priority", type: "expression", placeholder: "${priority}" },
    ],
  },

  // ── Intermediate Event ────────────────────────────────────────────────────
  {
    id: "intermediate-event",
    title: "Event Definition",
    appliesTo: ["intermediateEvent"],
    fields: [
      { key: "eventSubType",   label: "Event Sub-type", type: "select",
        options: [
          { label: "Message",    value: "message" },
          { label: "Timer",      value: "timer" },
          { label: "Signal",     value: "signal" },
          { label: "Error",      value: "error" },
          { label: "Escalation", value: "escalation" },
          { label: "Generic",    value: "generic" },
        ]
      },
      { key: "messageRef",      label: "Message Name",      type: "text",       placeholder: "myMessage",    mono: true },
      { key: "timerExpression", label: "Timer Expression",  type: "expression", placeholder: "PT5M",         hint: "ISO 8601 duration, date, or cron" },
    ],
  },

  // ── Connector ─────────────────────────────────────────────────────────────
  {
    id: "connector",
    title: "Connector",
    appliesTo: ["automation"],
    appliesIfBpmnType: ["serviceTask"],
    fields: [
      { key: "tech.connectorId", label: "Connector Id", type: "text", placeholder: "http-connector", mono: true },
    ],
  },

  // ── Error Event Definition ────────────────────────────────────────────────
  {
    id: "error-event",
    title: "Error Definition",
    appliesTo: ["intermediateEvent"],
    appliesIfBpmnType: ["intermediateCatchEvent", "boundaryEvent"],
    fields: [
      { key: "tech.errorCodeVariable",   label: "Error Code Variable",    type: "text", placeholder: "errorCode",    mono: true },
      { key: "tech.errorMessageVariable",label: "Error Message Variable", type: "text", placeholder: "errorMessage", mono: true },
    ],
  },

  // ── Execution listeners (shown for all) ───────────────────────────────────
  {
    id: "job",
    title: "Job Configuration",
    appliesTo: ["automation", "user", "decision", "foreach", "callActivity"],
    fields: [
      { key: "tech.jobPriority", label: "Job Priority", type: "expression", placeholder: "${priority}", hint: "Relative job priority" },
    ],
  },
];
