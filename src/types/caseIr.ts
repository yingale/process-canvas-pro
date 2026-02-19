/**
 * Case IR – Intermediate Representation for Workflow Cases
 * Bridges BPMN source ↔ Pega-style visual model ↔ edited output
 */

// ─── Step Types ───────────────────────────────────────────────────────────────

export type StepType =
  | "automation"
  | "user"
  | "decision"
  | "foreach"
  | "callActivity"
  | "intermediateEvent";

// ─── I/O Parameter ────────────────────────────────────────────────────────────

export interface IoParam {
  name: string;
  value: string;   // FEEL expression or literal
}

// Camunda 7 technical extensions – covers the full camunda-bpmn-moddle schema
export interface Camunda7Tech {
  // ── Async / Job ────────────────────────────────────────────────────────────
  async?: boolean;
  asyncBefore?: boolean;
  asyncAfter?: boolean;
  exclusive?: boolean;
  jobPriority?: string;
  taskPriority?: string;

  // ── Service / External Task (ServiceTaskLike + ExternalCapable) ───────────
  implementationType?: "external" | "class" | "expression" | "delegateExpression" | "connector";
  topic?: string;
  class?: string;
  expression?: string;
  delegateExpression?: string;
  resultVariable?: string;
  connectorId?: string;

  // ── Script Task ────────────────────────────────────────────────────────────
  scriptFormat?: string;
  script?: string;
  resource?: string;

  // ── User Task (Assignable) ─────────────────────────────────────────────────
  assignee?: string;
  candidateUsers?: string;
  candidateGroups?: string;
  dueDate?: string;
  followUpDate?: string;
  priority?: string;

  // ── User Task Form ─────────────────────────────────────────────────────────
  formHandlerClass?: string;
  formKey?: string;
  formRef?: string;
  formRefBinding?: "latest" | "version" | "versionTag";
  formRefVersion?: string;

  // ── Call Activity ──────────────────────────────────────────────────────────
  calledElementBinding?: "latest" | "version" | "versionTag" | "deployment";
  calledElementVersion?: string;
  calledElementVersionTag?: string;
  calledElementTenantId?: string;
  variableMappingClass?: string;
  variableMappingDelegateExpression?: string;

  // ── Business Rule Task (DMN) ───────────────────────────────────────────────
  decisionRef?: string;
  decisionRefBinding?: "latest" | "version" | "versionTag";
  decisionRefVersion?: string;
  mapDecisionResult?: string;
  decisionRefTenantId?: string;

  // ── Error / Escalation Events ──────────────────────────────────────────────
  errorCodeVariable?: string;
  errorMessageVariable?: string;
  escalationCodeVariable?: string;

  // ── I/O Parameters ────────────────────────────────────────────────────────
  inputParameters?: IoParam[];
  outputParameters?: IoParam[];

  // ── Multi-instance ────────────────────────────────────────────────────────
  multiInstance?: {
    isSequential: boolean;
    collectionExpression: string;
    elementVariable: string;
    completionCondition?: string;
  };
}

// Decision branch
export interface DecisionBranch {
  id: string;
  label: string;
  condition: string;          // FEEL / Camunda expression
  targetStepId?: string;      // resolved after IR is fully built
}

// Source tracing
export interface SourceMeta {
  bpmnElementId?: string;
  bpmnElementType?: string;
}

// Base step fields (all step types share these)
export interface BaseStep {
  id: string;
  name: string;
  description?: string;
  tech?: Camunda7Tech;
  source?: SourceMeta;
}

export interface AutomationStep extends BaseStep {
  type: "automation";
}

export interface UserStep extends BaseStep {
  type: "user";
  assignee?: string;
  candidateGroups?: string[];
}

export interface DecisionStep extends BaseStep {
  type: "decision";
  branches: DecisionBranch[];
  defaultBranchId?: string;
}

export interface ForeachStep extends BaseStep {
  type: "foreach";
  collectionExpression: string;
  elementVariable: string;
  isSequential?: boolean;
  steps: Step[];   // nested steps inside the loop
}

export interface CallActivityStep extends BaseStep {
  type: "callActivity";
  calledElement: string;
  inMappings?: Array<{ source: string; target: string }>;
  outMappings?: Array<{ source: string; target: string }>;
}

/** Intermediate catch/throw event (message, timer, signal, etc.) */
export interface IntermediateEventStep extends BaseStep {
  type: "intermediateEvent";
  /** "message" | "timer" | "signal" | "error" | "escalation" | "generic" */
  eventSubType: string;
  /** Message name or ref (for message events) */
  messageRef?: string;
  /** Timer expression */
  timerExpression?: string;
}

export type Step =
  | AutomationStep
  | UserStep
  | DecisionStep
  | ForeachStep
  | CallActivityStep
  | IntermediateEventStep;

// ─── Group ────────────────────────────────────────────────────────────────────

/** A named group of steps within a Stage (Section → Groups → Steps) */
export interface Group {
  id: string;
  name: string;
  steps: Step[];
}

// ─── Stage ────────────────────────────────────────────────────────────────────

export interface Stage {
  id: string;
  name: string;
  groups: Group[];          // Section → Groups → Steps
  source?: SourceMeta;
}

// ─── Trigger ──────────────────────────────────────────────────────────────────

export type TriggerType = "none" | "timer" | "message" | "signal" | "manual";

export interface Trigger {
  type: TriggerType;
  expression?: string;   // e.g. cron for timer, message ref for message
  name?: string;
}

// ─── Case IR Root ─────────────────────────────────────────────────────────────

export interface CaseIR {
  id: string;
  name: string;
  version: string;          // semver string
  trigger: Trigger;
  stages: Stage[];
  metadata: {
    createdAt: string;
    updatedAt: string;
    sourceFile?: string;
    exportedFrom?: "bpmn" | "manual";
    /** Verbatim bpmndi:BPMNDiagram XML block captured from the original file */
    originalDiagramXml?: string;
    /** Original definitions-level attributes (targetNamespace, id, etc.) */
    originalDefinitionsAttrs?: Record<string, string>;
    /** Original top-level sequence flow IDs captured for edge references */
    originalSequenceFlowIds?: Record<string, { sourceRef: string; targetRef: string }>;
  };
}

// ─── JSON Patch ───────────────────────────────────────────────────────────────

export type PatchOperation =
  | { op: "add";     path: string; value: unknown }
  | { op: "remove";  path: string }
  | { op: "replace"; path: string; value: unknown }
  | { op: "move";    path: string; from: string }
  | { op: "copy";    path: string; from: string }
  | { op: "test";    path: string; value: unknown };

export type JsonPatch = PatchOperation[];

// ─── AI Plan result ───────────────────────────────────────────────────────────

export interface AiPlanResult {
  patch: JsonPatch;
  summary: string;
}

// ─── Import/Export results ────────────────────────────────────────────────────

export interface ImportResult {
  caseIr: CaseIR;
  warnings: string[];
}

export interface ExportBpmnResult {
  bpmnXml: string;
}

// ─── UI selection state ───────────────────────────────────────────────────────

export type SelectionTarget =
  | { kind: "stage"; stageId: string }
  | { kind: "group"; stageId: string; groupId: string }
  | { kind: "step"; stageId: string; groupId: string; stepId: string }
  | null;

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

import { z } from "zod";

const ioParamSchema = z.object({ name: z.string(), value: z.string() });

export const camunda7TechSchema = z.object({
  topic: z.string().optional(),
  asyncBefore: z.boolean().optional(),
  asyncAfter: z.boolean().optional(),
  inputParameters: z.array(ioParamSchema).optional(),
  outputParameters: z.array(ioParamSchema).optional(),
  multiInstance: z.object({
    isSequential: z.boolean(),
    collectionExpression: z.string(),
    elementVariable: z.string(),
    completionCondition: z.string().optional(),
  }).optional(),
  callActivity: z.object({
    calledElement: z.string(),
    inMappings: z.array(z.object({ source: z.string(), target: z.string() })),
    outMappings: z.array(z.object({ source: z.string(), target: z.string() })),
  }).optional(),
}).optional();

const sourceSchema = z.object({ bpmnElementId: z.string().optional(), bpmnElementType: z.string().optional() }).optional();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const stepSchema: z.ZodType<any> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({
      id: z.string().min(1), type: z.literal("automation"),
      name: z.string().min(1), description: z.string().optional(),
      tech: camunda7TechSchema, source: sourceSchema,
    }),
    z.object({
      id: z.string().min(1), type: z.literal("user"),
      name: z.string().min(1), description: z.string().optional(),
      assignee: z.string().optional(),
      candidateGroups: z.array(z.string()).optional(),
      tech: camunda7TechSchema, source: sourceSchema,
    }),
    z.object({
      id: z.string().min(1), type: z.literal("decision"),
      name: z.string().min(1), description: z.string().optional(),
      branches: z.array(z.object({
        id: z.string(), label: z.string(), condition: z.string(),
        targetStepId: z.string().optional(),
      })),
      defaultBranchId: z.string().optional(),
      tech: camunda7TechSchema, source: sourceSchema,
    }),
    z.object({
      id: z.string().min(1), type: z.literal("foreach"),
      name: z.string().min(1), description: z.string().optional(),
      collectionExpression: z.string(), elementVariable: z.string(),
      isSequential: z.boolean().optional(),
      steps: z.array(z.lazy(() => stepSchema)),
      tech: camunda7TechSchema, source: sourceSchema,
    }),
    z.object({
      id: z.string().min(1), type: z.literal("callActivity"),
      name: z.string().min(1), description: z.string().optional(),
      calledElement: z.string(),
      inMappings: z.array(z.object({ source: z.string(), target: z.string() })).optional(),
      outMappings: z.array(z.object({ source: z.string(), target: z.string() })).optional(),
      tech: camunda7TechSchema, source: sourceSchema,
    }),
    z.object({
      id: z.string().min(1), type: z.literal("intermediateEvent"),
      name: z.string().min(1), description: z.string().optional(),
      eventSubType: z.string(),
      messageRef: z.string().optional(),
      timerExpression: z.string().optional(),
      tech: camunda7TechSchema, source: sourceSchema,
    }),
  ])
);

export const groupSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  steps: z.array(stepSchema),
});

export const stageSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  groups: z.array(groupSchema),
  source: z.object({ bpmnElementId: z.string().optional(), bpmnElementType: z.string().optional() }).optional(),
});

export const caseIrSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.string(),
  trigger: z.object({
    type: z.enum(["none", "timer", "message", "signal", "manual"]),
    expression: z.string().optional(),
    name: z.string().optional(),
  }),
  stages: z.array(stageSchema),
  metadata: z.object({
    createdAt: z.string(),
    updatedAt: z.string(),
    sourceFile: z.string().optional(),
    exportedFrom: z.enum(["bpmn", "manual"]).optional(),
    originalDiagramXml: z.string().optional(),
    originalDefinitionsAttrs: z.record(z.string()).optional(),
    originalSequenceFlowIds: z.record(z.object({ sourceRef: z.string(), targetRef: z.string() })).optional(),
  }),
});

export function validateCaseIR(data: unknown): { success: true; data: CaseIR } | { success: false; errors: string[] } {
  const result = caseIrSchema.safeParse(data);
  if (result.success) return { success: true, data: result.data as CaseIR };
  return {
    success: false,
    errors: result.error.errors.map(e => `${e.path.join(".")}: ${e.message}`),
  };
}
