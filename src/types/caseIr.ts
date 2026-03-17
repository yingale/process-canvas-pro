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
  value: string;
}

// Camunda 7 technical extensions
export interface Camunda7Tech {
  async?: boolean;
  asyncBefore?: boolean;
  asyncAfter?: boolean;
  exclusive?: boolean;
  jobPriority?: string;
  taskPriority?: string;
  implementationType?: "external" | "class" | "expression" | "delegateExpression" | "connector";
  topic?: string;
  class?: string;
  expression?: string;
  delegateExpression?: string;
  resultVariable?: string;
  connectorId?: string;
  scriptFormat?: string;
  script?: string;
  resource?: string;
  assignee?: string;
  candidateUsers?: string;
  candidateGroups?: string;
  dueDate?: string;
  followUpDate?: string;
  priority?: string;
  formHandlerClass?: string;
  formKey?: string;
  formRef?: string;
  formRefBinding?: "latest" | "version" | "versionTag";
  formRefVersion?: string;
  calledElementBinding?: "latest" | "version" | "versionTag" | "deployment";
  calledElementVersion?: string;
  calledElementVersionTag?: string;
  calledElementTenantId?: string;
  variableMappingClass?: string;
  variableMappingDelegateExpression?: string;
  decisionRef?: string;
  decisionRefBinding?: "latest" | "version" | "versionTag";
  decisionRefVersion?: string;
  mapDecisionResult?: string;
  decisionRefTenantId?: string;
  errorCodeVariable?: string;
  errorMessageVariable?: string;
  escalationCodeVariable?: string;
  inputParameters?: IoParam[];
  outputParameters?: IoParam[];
  multiInstance?: {
    isSequential: boolean;
    collectionExpression: string;
    elementVariable: string;
    completionCondition?: string;
  };
}

export interface DecisionBranch {
  id: string;
  label: string;
  condition: string;
  targetStepId?: string;
}

export interface SourceMeta {
  bpmnElementId?: string;
  bpmnElementType?: string;
}

// ─── Boundary Event ───────────────────────────────────────────────────────────

export type BoundaryEventType = "timer" | "message" | "signal" | "error" | "escalation" | "conditional" | "generic";

export interface BoundaryEvent {
  id: string;
  name: string;
  eventType: BoundaryEventType;
  cancelActivity?: boolean;
  expression?: string;
  tech?: Camunda7Tech;
  source?: SourceMeta;
}

// ─── End Event ────────────────────────────────────────────────────────────────

export type EndEventType = "none" | "message" | "signal" | "error" | "escalation" | "terminate" | "compensate";

export interface EndEvent {
  id: string;
  name?: string;
  eventType: EndEventType;
  expression?: string;
  tech?: Camunda7Tech;
  source?: SourceMeta;
}

// ─── Process Properties ───────────────────────────────────────────────────────

export interface ProcessProperties {
  isExecutable?: boolean;
  versionTag?: string;
  historyTimeToLive?: string;
  candidateStarterGroups?: string;
  candidateStarterUsers?: string;
  jobPriority?: string;
  taskPriority?: string;
}

// ─── Steps ────────────────────────────────────────────────────────────────────

export type FormFieldType =
  | "string" | "number" | "boolean" | "select" | "multiline"
  | "file" | "date" | "radio" | "checkbox-group" | "email" | "url" | "password"
  | "richtext" | "color" | "slider" | "rating" | "repeatable";

export interface ModuleConfigField {
  key: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  defaultValue?: string;
  options?: string[];
  hint?: string;
  group?: string;
  min?: number;
  max?: number;
  step?: number;
  accept?: string; // file accept types
  repeatableFields?: ModuleConfigField[]; // for repeatable groups
}

export interface ModuleRef {
  moduleId: string;
  instanceConfig: Record<string, unknown>;
}

// ─── Form Template & Step Binding ─────────────────────────────────────────────

export interface FormTemplate {
  id: string;
  name: string;
  description?: string;
  fields: ModuleConfigField[];
}

export interface FormRef {
  formId: string;
  /** Per-step overrides: hide fields, change defaults, make required, etc. */
  fieldOverrides?: Record<string, Partial<ModuleConfigField>>;
}

export interface BaseStep {
  id: string;
  name: string;
  description?: string;
  tech?: Camunda7Tech;
  source?: SourceMeta;
  boundaryEvents?: BoundaryEvent[];
  moduleRef?: ModuleRef;
  formRef?: FormRef;
}

export interface AutomationStep extends BaseStep { type: "automation"; }

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
  steps: Step[];
}

export interface CallActivityStep extends BaseStep {
  type: "callActivity";
  calledElement: string;
  inMappings?: Array<{ source: string; target: string }>;
  outMappings?: Array<{ source: string; target: string }>;
}

export interface IntermediateEventStep extends BaseStep {
  type: "intermediateEvent";
  eventSubType: string;
  messageRef?: string;
  timerExpression?: string;
}

export type Step =
  | AutomationStep
  | UserStep
  | DecisionStep
  | ForeachStep
  | CallActivityStep
  | IntermediateEventStep;

// ─── Group & Stage ────────────────────────────────────────────────────────────

export interface Group {
  id: string;
  name: string;
  steps: Step[];
}

export interface Stage {
  id: string;
  name: string;
  color?: string;
  groups: Group[];
  source?: SourceMeta;
}

// ─── Trigger ──────────────────────────────────────────────────────────────────

export type TriggerType = "none" | "timer" | "message" | "signal" | "manual";

export interface Trigger {
  type: TriggerType;
  expression?: string;
  name?: string;
  tech?: Camunda7Tech;
  source?: SourceMeta;
}

// ─── Lifecycle Entities ────────────────────────────────────────────────────────

export interface Persona {
  id: string;
  name: string;
  role: string;
  description?: string;
  permissions: string[];
}

export interface TeamMember {
  id: string;
  name: string;
  email?: string;
  personaId?: string;
  department?: string;
}

export type BusinessRuleType = "validation" | "routing" | "sla" | "condition";

export interface BusinessRule {
  id: string;
  name: string;
  ruleType: BusinessRuleType;
  expression: string;
  description?: string;
  appliesTo?: string;
}

export type DataFieldType = "string" | "number" | "boolean" | "date" | "object" | "array";

export interface DataField {
  id: string;
  name: string;
  dataType: DataFieldType;
  required: boolean;
  defaultValue?: string;
  description?: string;
}

export type DeploymentStatus = "draft" | "staging" | "production";

export interface DeploymentConfig {
  targetEnvironment: string;
  version: string;
  status: DeploymentStatus;
  deployedAt?: string;
  deployedBy?: string;
  notes?: string;
}

export interface ReusableModule {
  id: string;
  name: string;
  description?: string;
  category: string;
  icon?: string;
  steps: Step[];
  configSchema: ModuleConfigField[];
  allowedPersonas?: string[];
}

// ─── Case IR Root ─────────────────────────────────────────────────────────────

export interface CaseIR {
  id: string;
  name: string;
  version: string;
  trigger: Trigger;
  endEvent: EndEvent;
  processProperties?: ProcessProperties;
  stages: Stage[];
  alternativePaths?: Stage[];
  personas?: Persona[];
  teamMembers?: TeamMember[];
  businessRules?: BusinessRule[];
  dataModel?: DataField[];
  deployment?: DeploymentConfig;
  reusableModules?: ReusableModule[];
  formTemplates?: FormTemplate[];
  metadata: {
    createdAt: string;
    updatedAt: string;
    sourceFile?: string;
    exportedFrom?: "bpmn" | "manual";
    originalDiagramXml?: string;
    originalDefinitionsAttrs?: Record<string, string>;
    originalSequenceFlowIds?: Record<string, { sourceRef: string; targetRef: string }>;
    originalStartEventId?: string;
    originalEndEventId?: string;
    originalSubProcessEventIds?: Record<string, { startId: string; endId: string; flowIds: string[] }>;
    originalTopLevelFlowIds?: string[];
    originalBpmnXml?: string;
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
  | { kind: "trigger" }
  | { kind: "endEvent" }
  | { kind: "process" }
  | { kind: "boundaryEvent"; stageId: string; groupId: string; stepId: string; boundaryEventId: string }
  | null;
