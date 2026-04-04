/**
 * Automation Node definitions for the Studio Nodes Panel.
 * Each node maps to a Camunda External Task topic with specific I/O configuration.
 */
import type { ModuleConfigField } from "@/types/caseIr";

export interface AutomationNodeDef {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide icon name
  color: string;
  topic: string; // Camunda external task topic
  category: "communication" | "extraction" | "ai" | "notification";
  inputs: NodeIoField[];
  outputs: NodeIoField[];
  configFields: ModuleConfigField[];
}

export interface NodeIoField {
  name: string;
  type: "string" | "file" | "object" | "array";
  description: string;
}

export const AUTOMATION_NODES: AutomationNodeDef[] = [
  {
    id: "email-fetcher",
    name: "Email Fetcher",
    description: "Fetch emails from mailbox with filters, optionally download attachments",
    icon: "Mail",
    color: "hsl(213 88% 42%)",
    topic: "email-fetcher-fetch",
    category: "communication",
    inputs: [],
    outputs: [
      { name: "emails", type: "array", description: "List of fetched email objects" },
      { name: "attachmentDocIds", type: "array", description: "Document IDs of downloaded attachments" },
      { name: "attachmentPaths", type: "array", description: "File paths of downloaded attachments" },
    ],
    configFields: [
      { key: "emailId", label: "Email ID / Mailbox", type: "string", required: true, hint: "e.g. user@company.com" },
      { key: "subjectFilter", label: "Subject Filter", type: "string", required: false, hint: "Filter emails by subject (contains)" },
      { key: "bodyFilter", label: "Body Filter", type: "string", required: false, hint: "Filter emails by body content" },
      { key: "downloadAttachment", label: "Download Attachments", type: "boolean", required: false, defaultValue: "true" },
      { key: "maxEmails", label: "Max Emails to Fetch", type: "number", required: false, defaultValue: "10", min: 1, max: 100 },
      { key: "moveAfterRead", label: "Move After Read", type: "select", required: false, defaultValue: "archive", options: ["archive", "trash", "none", "custom-folder"] },
      { key: "outputVariable", label: "Output Variable", type: "string", required: true, defaultValue: "emailFetcherResult", hint: "Variable name for downstream nodes" },
    ],
  },
  {
    id: "chunk-extractor",
    name: "Chunk Extractor",
    description: "Extract rows/chunks from a file (CSV, XLSX) for processing",
    icon: "FileSpreadsheet",
    color: "hsl(32 90% 48%)",
    topic: "chunk-extractor-execute",
    category: "extraction",
    inputs: [
      { name: "inputFile", type: "file", description: "File document ID or path from previous node" },
    ],
    outputs: [
      { name: "chunks", type: "array", description: "Array of extracted data chunks" },
      { name: "totalRows", type: "string", description: "Total number of rows in the file" },
    ],
    configFields: [
      { key: "inputVariable", label: "Input Variable", type: "string", required: true, hint: "Variable from previous node (e.g. emailFetcherResult.attachmentPaths[0])" },
      { key: "chunkSize", label: "Rows per Chunk", type: "number", required: true, defaultValue: "100", min: 1, max: 10000 },
      { key: "startRow", label: "Start Row", type: "number", required: false, defaultValue: "1", min: 1 },
      { key: "hasHeader", label: "File Has Header Row", type: "boolean", required: false, defaultValue: "true" },
      { key: "outputVariable", label: "Output Variable", type: "string", required: true, defaultValue: "chunkExtractorResult" },
    ],
  },
  {
    id: "ai-processor",
    name: "AI Processor",
    description: "Process data with AI using custom prompts and output formats",
    icon: "Brain",
    color: "hsl(268 62% 52%)",
    topic: "ai-processor-execute",
    category: "ai",
    inputs: [
      { name: "inputData", type: "object", description: "Data from previous node to process" },
    ],
    outputs: [
      { name: "aiResponse", type: "object", description: "AI-generated response" },
      { name: "columnNames", type: "array", description: "Extracted column names (when applicable)" },
    ],
    configFields: [
      { key: "inputVariable", label: "Input Variable", type: "string", required: true, hint: "Variable from previous node (e.g. chunkExtractorResult.chunks)" },
      { key: "prompt", label: "AI Prompt", type: "multiline", required: true, hint: "Prompt template. Use ${variable} for interpolation." },
      { key: "outputFormat", label: "Output Format", type: "select", required: true, defaultValue: "json", options: ["json", "csv", "text", "column-names"] },
      { key: "model", label: "AI Model", type: "select", required: false, defaultValue: "auto", options: ["auto", "gpt-4", "gpt-3.5", "gemini-pro"] },
      { key: "temperature", label: "Temperature", type: "slider", required: false, defaultValue: "0.3", min: 0, max: 1, step: 0.1 },
      { key: "outputVariable", label: "Output Variable", type: "string", required: true, defaultValue: "aiProcessorResult" },
    ],
  },
  {
    id: "column-extractor",
    name: "File Column Extractor",
    description: "Extract specific columns from a file and create a new output file",
    icon: "Columns3",
    color: "hsl(152 68% 38%)",
    topic: "column-extractor-execute",
    category: "extraction",
    inputs: [
      { name: "inputFile", type: "file", description: "Original file to extract columns from" },
      { name: "columnNames", type: "array", description: "Column names to extract" },
    ],
    outputs: [
      { name: "outputFile", type: "file", description: "New file with extracted columns" },
      { name: "outputDocId", type: "string", description: "Document ID of the output file" },
    ],
    configFields: [
      { key: "inputFileVariable", label: "Input File Variable", type: "string", required: true, hint: "Variable pointing to the source file" },
      { key: "columnsVariable", label: "Columns Variable", type: "string", required: false, hint: "Variable from AI processor with column names" },
      { key: "manualColumns", label: "Manual Column Names", type: "string", required: false, hint: "Comma-separated column names (if not using variable)" },
      { key: "outputFormat", label: "Output File Format", type: "select", required: true, defaultValue: "csv", options: ["csv", "xlsx", "json"] },
      { key: "includeHeader", label: "Include Header Row", type: "boolean", required: false, defaultValue: "true" },
      { key: "outputVariable", label: "Output Variable", type: "string", required: true, defaultValue: "columnExtractorResult" },
    ],
  },
  {
    id: "email-notification",
    name: "Email Notification",
    description: "Send email notification with optional file attachments",
    icon: "Send",
    color: "hsl(199 80% 42%)",
    topic: "email-notification-send",
    category: "notification",
    inputs: [
      { name: "attachmentFile", type: "file", description: "File to attach (optional)" },
    ],
    outputs: [
      { name: "sentStatus", type: "string", description: "Email send status" },
      { name: "messageId", type: "string", description: "Sent message ID" },
    ],
    configFields: [
      { key: "to", label: "To (Recipients)", type: "string", required: true, hint: "Comma-separated email addresses or ${variable}" },
      { key: "cc", label: "CC", type: "string", required: false },
      { key: "subject", label: "Subject", type: "string", required: true, hint: "Email subject. Use ${variable} for dynamic values." },
      { key: "body", label: "Email Body", type: "multiline", required: true, hint: "Email body (HTML supported). Use ${variable} for interpolation." },
      { key: "attachFileVariable", label: "Attach File Variable", type: "string", required: false, hint: "Variable pointing to file from previous node" },
      { key: "fromAlias", label: "From Alias", type: "string", required: false, hint: "Display name for the sender" },
      { key: "outputVariable", label: "Output Variable", type: "string", required: true, defaultValue: "emailNotificationResult" },
    ],
  },
];

export function getNodeDef(nodeId: string): AutomationNodeDef | undefined {
  return AUTOMATION_NODES.find(n => n.id === nodeId);
}
