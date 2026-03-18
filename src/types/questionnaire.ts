/**
 * QuestionnaireDocument – Core data model for the Form Builder
 */

export type QuestionType =
  | "Dropdown"
  | "RadioButton"
  | "TextInput"
  | "TextArea"
  | "DatePicker"
  | "MultiSelect"
  | "NumberInput"
  | "FileUpload";

export type FlowStatus = "Draft" | "Published" | "Archived";

export interface QuestionOption {
  id: string;
  display: string;
  default?: boolean;
  next?: Array<{
    id: string;
    nextEntityType: "question" | "end" | "subprocess";
  }>;
}

// Internal branching data used during editing (stripped on export)
export interface OptionBranch {
  id: string;
  nextEntityType: "question" | "end" | "subprocess" | "none";
  targetId: string; // questionId, end-id, or subprocess-id
}

export interface Question {
  _id: string;
  questionId: string;
  content: string;
  contentAbstract: string;
  questionType: QuestionType;
  mandatory: "True" | "False";
  options: QuestionOption[];
  category: string;
  subcategory: string;
  accessRoles: string;
  tags: string[];
  default: string;
  language: string;
  region: string;
  status: string;
  // Internal editing state (not exported)
  _branches?: Record<string, OptionBranch>;
}

export interface FlowLink {
  from: string;
  to: string;
  id: string;
  text: string;
  linkId: string;
  visible: boolean;
  relinkableTo: boolean;
  relinkableFrom: boolean;
  fromPort: string;
  toPort: string;
  editable: boolean;
  __gohashid: number;
}

export interface FlowNode {
  id: string;
  options?: Array<{
    id: string;
    next: Array<{
      id: string;
      nextEntityType: "question" | "end" | "subprocess";
    }>;
  }>;
  // GoJS visual metadata
  loc?: string;
  qOptions?: string[];
  qType?: string;
  __gohashid?: number;
}

export interface Flow {
  _id: string;
  flowId: string;
  flowName: string;
  status: FlowStatus;
  flowAbstract: string;
  accessRoles: string;
  category: string;
  subCategory: string;
  tags: string[];
  path: FlowNode[];
  firstQuestions: string[];
  links: FlowLink[];
  nodes: FlowNode[];
  version: number;
  createTime: string;
  updateTime: string;
}

export interface QuestionnaireDocument {
  flow: Flow;
  questions: Question[];
}

// Validation
export interface ValidationIssue {
  type: "error" | "warning";
  message: string;
  questionId?: string;
}
