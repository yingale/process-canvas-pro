/**
 * AutomationNodesDocsPage — Full API contract documentation for automation nodes
 */
import ModuleDocLayout from "@/components/docs/ModuleDocLayout";
import { DocCard, CardContent, CardHeader, CardTitle } from "@/components/docs/DocCard";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useState, useCallback } from "react";
import { Copy, Check } from "lucide-react";

function CopyBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div className="relative group/code">
      {label && <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>}
      <pre className="bg-muted/50 border border-border rounded-lg p-4 text-[11px] leading-relaxed font-mono overflow-x-auto whitespace-pre-wrap">{code}</pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 opacity-0 group-hover/code:opacity-100 transition-opacity inline-flex items-center gap-1 rounded border border-border bg-card/90 px-1.5 py-0.5 text-[9px] font-medium hover:bg-muted"
      >
        {copied ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy</>}
      </button>
    </div>
  );
}

function EndpointSection({ method, url, description, headers, requestBody, responseBody, statusCodes, curl }: {
  method: string; url: string; description: string; headers?: string;
  requestBody?: string; responseBody: string; statusCodes: string; curl: string;
}) {
  const methodColor = method === "GET" ? "text-emerald-600" : method === "POST" ? "text-blue-600" :
    method === "PUT" ? "text-amber-600" : method === "PATCH" ? "text-purple-600" : "text-red-600";
  return (
    <DocCard className="mb-6">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={`font-mono text-[10px] ${methodColor}`}>{method}</Badge>
          <code className="text-xs font-mono text-foreground">{url}</code>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <CopyBlock label="Headers" code={headers || `Content-Type: application/json\nAuthorization: Bearer <token>`} />
        {requestBody && <CopyBlock label="Request Body" code={requestBody} />}
        <CopyBlock label="Response — 200/201" code={responseBody} />
        <CopyBlock label="Status Codes" code={statusCodes} />
        <CopyBlock label="curl Example" code={curl} />
      </CardContent>
    </DocCard>
  );
}

export default function AutomationNodesDocsPage() {
  return (
    <ModuleDocLayout
      title="Automation Nodes — Full API Contract"
      subtitle="Complete REST API specification with request/response JSON for all 9 endpoints, MongoDB data models, I/O mapping contracts, variable chaining, and Camunda integration."
      badges={["REST API", "MongoDB", "Camunda Topics", "I/O Mapping", "Request/Response", "Variable Chaining"]}
      studioLink="/studio"
    >
      {/* ─── Section 1: Node Registry APIs ─── */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground">1. Node Registry APIs</h2>
        <p className="text-sm text-muted-foreground">Static node definitions — read-only registry of all 5 automation nodes.</p>

        <EndpointSection
          method="GET"
          url="/api/nodes"
          description="List all available node definitions with their config schemas, inputs, and outputs."
          responseBody={`{
  "nodes": [
    {
      "id": "email-fetcher",
      "name": "Email Fetcher",
      "description": "Fetch emails from mailbox via MS Graph API, optionally download attachments",
      "topic": "email-fetcher-fetch",
      "category": "communication",
      "icon": "mail",
      "version": "1.0.0",
      "configFields": [
        { "key": "emailId", "label": "Email Address", "type": "string", "required": true, "placeholder": "user@company.com" },
        { "key": "subjectFilter", "label": "Subject Filter", "type": "string", "required": false, "placeholder": "Invoice*" },
        { "key": "bodyFilter", "label": "Body Contains", "type": "string", "required": false },
        { "key": "downloadAttachment", "label": "Download Attachments", "type": "boolean", "required": false, "default": true },
        { "key": "maxEmails", "label": "Max Emails to Fetch", "type": "number", "required": false, "default": 10 },
        { "key": "moveAfterRead", "label": "Move After Read", "type": "select", "required": false, "default": "archive", "options": ["archive", "trash", "none"] }
      ],
      "inputs": [],
      "outputs": [
        { "name": "emails", "type": "array", "description": "Array of email objects with subject, body, sender, date" },
        { "name": "attachmentPaths", "type": "array", "description": "Array of downloaded attachment file paths / document IDs" },
        { "name": "emailCount", "type": "number", "description": "Total number of emails fetched" }
      ]
    },
    {
      "id": "chunk-extractor",
      "name": "Chunk Extractor",
      "description": "Extract rows/chunks from CSV/XLSX files with configurable chunk size",
      "topic": "chunk-extractor-process",
      "category": "data-processing",
      "icon": "file-spreadsheet",
      "version": "1.0.0",
      "configFields": [
        { "key": "chunkSize", "label": "Rows per Chunk", "type": "number", "required": true, "default": 100 },
        { "key": "startRow", "label": "Start Row", "type": "number", "required": false, "default": 1 },
        { "key": "sheetName", "label": "Sheet Name (XLSX)", "type": "string", "required": false, "default": "Sheet1" },
        { "key": "hasHeader", "label": "First Row is Header", "type": "boolean", "required": false, "default": true },
        { "key": "delimiter", "label": "Delimiter (CSV)", "type": "string", "required": false, "default": "," }
      ],
      "inputs": [
        { "name": "filePath", "type": "string", "description": "Path to input CSV/XLSX file" }
      ],
      "outputs": [
        { "name": "chunks", "type": "array", "description": "Array of row arrays, each containing up to chunkSize rows" },
        { "name": "headers", "type": "array", "description": "Column header names" },
        { "name": "totalRows", "type": "number", "description": "Total number of data rows in the file" }
      ]
    },
    {
      "id": "ai-processor",
      "name": "AI Processor",
      "description": "Run LLM prompts with variable substitution and structured JSON output",
      "topic": "ai-processor-run",
      "category": "intelligence",
      "icon": "brain",
      "version": "1.0.0",
      "configFields": [
        { "key": "prompt", "label": "Prompt Template", "type": "textarea", "required": true, "placeholder": "Analyze the following data: \${chunkData}" },
        { "key": "model", "label": "Model", "type": "select", "required": false, "default": "gpt-4", "options": ["gpt-4", "gpt-3.5-turbo", "gemini-pro"] },
        { "key": "outputFormat", "label": "Output Format", "type": "select", "required": false, "default": "json", "options": ["json", "text", "csv"] },
        { "key": "temperature", "label": "Temperature", "type": "number", "required": false, "default": 0.3 },
        { "key": "maxTokens", "label": "Max Tokens", "type": "number", "required": false, "default": 2000 },
        { "key": "outputSchema", "label": "Output JSON Schema", "type": "textarea", "required": false, "placeholder": "{ \\"columns\\": [\\"name\\", \\"amount\\"] }" }
      ],
      "inputs": [
        { "name": "chunkData", "type": "any", "description": "Data to process — rows, text, or structured input from previous step" },
        { "name": "context", "type": "string", "description": "Optional additional context for the prompt" }
      ],
      "outputs": [
        { "name": "result", "type": "any", "description": "LLM response — JSON object, text, or CSV string based on outputFormat" },
        { "name": "columnNames", "type": "array", "description": "Extracted column names if output is structured" },
        { "name": "tokensUsed", "type": "number", "description": "Total tokens consumed" }
      ]
    },
    {
      "id": "column-extractor",
      "name": "File Column Extractor",
      "description": "Extract specific columns from a data file and produce a filtered output file",
      "topic": "column-extractor-extract",
      "category": "data-processing",
      "icon": "columns",
      "version": "1.0.0",
      "configFields": [
        { "key": "outputFormat", "label": "Output File Format", "type": "select", "required": false, "default": "csv", "options": ["csv", "xlsx", "json"] },
        { "key": "includeHeader", "label": "Include Header Row", "type": "boolean", "required": false, "default": true },
        { "key": "outputFileName", "label": "Output File Name", "type": "string", "required": false, "default": "extracted_output" }
      ],
      "inputs": [
        { "name": "filePath", "type": "string", "description": "Path to the original full data file" },
        { "name": "columnNames", "type": "array", "description": "Array of column names to extract" }
      ],
      "outputs": [
        { "name": "outputFilePath", "type": "string", "description": "Path to the generated output file" },
        { "name": "rowCount", "type": "number", "description": "Number of rows in output" },
        { "name": "extractedColumns", "type": "array", "description": "Confirmed list of extracted column names" }
      ]
    },
    {
      "id": "email-notification",
      "name": "Email Notification",
      "description": "Send templated emails with optional file attachments via MS Graph API",
      "topic": "email-notification-send",
      "category": "communication",
      "icon": "send",
      "version": "1.0.0",
      "configFields": [
        { "key": "to", "label": "To (Recipients)", "type": "string", "required": true, "placeholder": "user@company.com, user2@company.com" },
        { "key": "cc", "label": "CC", "type": "string", "required": false },
        { "key": "subject", "label": "Subject Template", "type": "string", "required": true, "placeholder": "Report Ready: \${outputFileName}" },
        { "key": "bodyTemplate", "label": "Body Template (HTML)", "type": "textarea", "required": true, "placeholder": "<p>Please find attached the extracted report.</p>" },
        { "key": "attachFile", "label": "Attach Output File", "type": "boolean", "required": false, "default": true },
        { "key": "priority", "label": "Priority", "type": "select", "required": false, "default": "normal", "options": ["low", "normal", "high"] }
      ],
      "inputs": [
        { "name": "outputFilePath", "type": "string", "description": "Path to file to attach" },
        { "name": "recipientOverride", "type": "string", "description": "Optional dynamic recipient from previous step" }
      ],
      "outputs": [
        { "name": "messageId", "type": "string", "description": "MS Graph message ID of sent email" },
        { "name": "status", "type": "string", "description": "Delivery status: sent | queued | failed" },
        { "name": "sentAt", "type": "string", "description": "ISO 8601 timestamp of send" }
      ]
    }
  ],
  "total": 5
}`}
          statusCodes={`200 OK — List returned successfully
401 Unauthorized — Missing or invalid Bearer token
500 Internal Server Error — Unexpected failure`}
          curl={`curl -X GET https://api.example.com/api/nodes \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json"`}
        />

        <EndpointSection
          method="GET"
          url="/api/nodes/:nodeId"
          description="Get a single node definition by ID."
          responseBody={`{
  "id": "email-fetcher",
  "name": "Email Fetcher",
  "description": "Fetch emails from mailbox via MS Graph API, optionally download attachments",
  "topic": "email-fetcher-fetch",
  "category": "communication",
  "icon": "mail",
  "version": "1.0.0",
  "configFields": [
    { "key": "emailId", "label": "Email Address", "type": "string", "required": true, "placeholder": "user@company.com" },
    { "key": "subjectFilter", "label": "Subject Filter", "type": "string", "required": false },
    { "key": "bodyFilter", "label": "Body Contains", "type": "string", "required": false },
    { "key": "downloadAttachment", "label": "Download Attachments", "type": "boolean", "required": false, "default": true },
    { "key": "maxEmails", "label": "Max Emails to Fetch", "type": "number", "required": false, "default": 10 },
    { "key": "moveAfterRead", "label": "Move After Read", "type": "select", "required": false, "default": "archive", "options": ["archive", "trash", "none"] }
  ],
  "inputs": [],
  "outputs": [
    { "name": "emails", "type": "array", "description": "Array of email objects" },
    { "name": "attachmentPaths", "type": "array", "description": "Downloaded attachment paths" },
    { "name": "emailCount", "type": "number", "description": "Total emails fetched" }
  ]
}`}
          statusCodes={`200 OK — Node definition returned
404 Not Found — { "error": "Node not found", "code": "NODE_NOT_FOUND" }
401 Unauthorized — Missing token`}
          curl={`curl -X GET https://api.example.com/api/nodes/email-fetcher \\
  -H "Authorization: Bearer <token>"`}
        />
      </section>

      <Separator />

      {/* ─── Section 2: Node Instance CRUD APIs ─── */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground">2. Node Instance CRUD APIs</h2>
        <p className="text-sm text-muted-foreground">Create, read, update, and delete node instances attached to workflow steps.</p>

        {/* POST — Attach node */}
        <EndpointSection
          method="POST"
          url="/api/workflows/:wfId/steps/:stepId/nodes"
          description="Attach a node to a workflow step. Creates an instance with default config values from the node definition."
          requestBody={`{
  "nodeId": "email-fetcher",
  "nodeType": "email-fetcher",
  "config": {
    "emailId": "inbox@acme.com",
    "subjectFilter": "Invoice*",
    "bodyFilter": "",
    "downloadAttachment": true,
    "maxEmails": 50,
    "moveAfterRead": "archive"
  },
  "inputMappings": [],
  "outputMappings": [
    {
      "sourceField": "attachmentPaths",
      "targetVariable": "step-2",
      "targetField": "filePath"
    }
  ]
}`}
          responseBody={`{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "workflowId": "wf-001-uuid",
  "stepId": "step-1",
  "nodeId": "email-fetcher",
  "nodeType": "email-fetcher",
  "config": {
    "emailId": "inbox@acme.com",
    "subjectFilter": "Invoice*",
    "bodyFilter": "",
    "downloadAttachment": true,
    "maxEmails": 50,
    "moveAfterRead": "archive"
  },
  "inputMappings": [],
  "outputMappings": [
    {
      "sourceField": "attachmentPaths",
      "targetVariable": "step-2",
      "targetField": "filePath"
    }
  ],
  "createdAt": "2026-04-06T10:30:00.000Z",
  "updatedAt": "2026-04-06T10:30:00.000Z"
}`}
          statusCodes={`201 Created — Node instance created successfully
400 Bad Request — { "error": "Missing required field", "code": "VALIDATION_ERROR", "field": "nodeId" }
404 Not Found — { "error": "Workflow or step not found", "code": "STEP_NOT_FOUND" }
409 Conflict — { "error": "Node already attached to this step", "code": "DUPLICATE_NODE" }
401 Unauthorized — Missing or invalid token
500 Internal Server Error — Unexpected failure`}
          curl={`curl -X POST https://api.example.com/api/workflows/wf-001-uuid/steps/step-1/nodes \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "nodeId": "email-fetcher",
    "nodeType": "email-fetcher",
    "config": {
      "emailId": "inbox@acme.com",
      "subjectFilter": "Invoice*",
      "downloadAttachment": true,
      "maxEmails": 50,
      "moveAfterRead": "archive"
    },
    "inputMappings": [],
    "outputMappings": []
  }'`}
        />

        {/* GET — List nodes on step */}
        <EndpointSection
          method="GET"
          url="/api/workflows/:wfId/steps/:stepId/nodes"
          description="List all node instances attached to a specific workflow step."
          responseBody={`{
  "nodes": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "workflowId": "wf-001-uuid",
      "stepId": "step-1",
      "nodeId": "email-fetcher",
      "nodeType": "email-fetcher",
      "config": {
        "emailId": "inbox@acme.com",
        "subjectFilter": "Invoice*",
        "downloadAttachment": true,
        "maxEmails": 50,
        "moveAfterRead": "archive"
      },
      "inputMappings": [],
      "outputMappings": [
        { "sourceField": "attachmentPaths", "targetVariable": "step-2", "targetField": "filePath" }
      ],
      "createdAt": "2026-04-06T10:30:00.000Z",
      "updatedAt": "2026-04-06T10:30:00.000Z"
    }
  ],
  "total": 1
}`}
          statusCodes={`200 OK — List returned
404 Not Found — { "error": "Step not found", "code": "STEP_NOT_FOUND" }
401 Unauthorized`}
          curl={`curl -X GET https://api.example.com/api/workflows/wf-001-uuid/steps/step-1/nodes \\
  -H "Authorization: Bearer <token>"`}
        />

        {/* GET — Single instance */}
        <EndpointSection
          method="GET"
          url="/api/workflows/:wfId/steps/:stepId/nodes/:instanceId"
          description="Get a single node instance by its ID."
          responseBody={`{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "workflowId": "wf-001-uuid",
  "stepId": "step-1",
  "nodeId": "email-fetcher",
  "nodeType": "email-fetcher",
  "config": {
    "emailId": "inbox@acme.com",
    "subjectFilter": "Invoice*",
    "bodyFilter": "",
    "downloadAttachment": true,
    "maxEmails": 50,
    "moveAfterRead": "archive"
  },
  "inputMappings": [],
  "outputMappings": [
    { "sourceField": "attachmentPaths", "targetVariable": "step-2", "targetField": "filePath" }
  ],
  "createdAt": "2026-04-06T10:30:00.000Z",
  "updatedAt": "2026-04-06T10:30:00.000Z"
}`}
          statusCodes={`200 OK — Instance returned
404 Not Found — { "error": "Node instance not found", "code": "INSTANCE_NOT_FOUND" }
401 Unauthorized`}
          curl={`curl -X GET https://api.example.com/api/workflows/wf-001-uuid/steps/step-1/nodes/a1b2c3d4-e5f6-7890-abcd-ef1234567890 \\
  -H "Authorization: Bearer <token>"`}
        />

        {/* PUT — Update full config */}
        <EndpointSection
          method="PUT"
          url="/api/workflows/:wfId/steps/:stepId/nodes/:instanceId"
          description="Update the full configuration and I/O mappings for a node instance."
          requestBody={`{
  "config": {
    "emailId": "invoices@acme.com",
    "subjectFilter": "Monthly Report*",
    "bodyFilter": "Q1",
    "downloadAttachment": true,
    "maxEmails": 100,
    "moveAfterRead": "trash"
  },
  "inputMappings": [],
  "outputMappings": [
    {
      "sourceField": "attachmentPaths",
      "targetVariable": "step-2",
      "targetField": "filePath"
    },
    {
      "sourceField": "emailCount",
      "targetVariable": "step-5",
      "targetField": "context"
    }
  ]
}`}
          responseBody={`{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "workflowId": "wf-001-uuid",
  "stepId": "step-1",
  "nodeId": "email-fetcher",
  "nodeType": "email-fetcher",
  "config": {
    "emailId": "invoices@acme.com",
    "subjectFilter": "Monthly Report*",
    "bodyFilter": "Q1",
    "downloadAttachment": true,
    "maxEmails": 100,
    "moveAfterRead": "trash"
  },
  "inputMappings": [],
  "outputMappings": [
    { "sourceField": "attachmentPaths", "targetVariable": "step-2", "targetField": "filePath" },
    { "sourceField": "emailCount", "targetVariable": "step-5", "targetField": "context" }
  ],
  "createdAt": "2026-04-06T10:30:00.000Z",
  "updatedAt": "2026-04-06T11:45:00.000Z"
}`}
          statusCodes={`200 OK — Updated successfully
400 Bad Request — { "error": "Invalid config value", "code": "VALIDATION_ERROR", "field": "maxEmails", "details": { "expected": "number", "received": "string" } }
404 Not Found — { "error": "Node instance not found", "code": "INSTANCE_NOT_FOUND" }
401 Unauthorized
500 Internal Server Error`}
          curl={`curl -X PUT https://api.example.com/api/workflows/wf-001-uuid/steps/step-1/nodes/a1b2c3d4-uuid \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "config": { "emailId": "invoices@acme.com", "maxEmails": 100 },
    "inputMappings": [],
    "outputMappings": [{ "sourceField": "attachmentPaths", "targetVariable": "step-2", "targetField": "filePath" }]
  }'`}
        />

        {/* PATCH — Mappings only */}
        <EndpointSection
          method="PATCH"
          url="/api/workflows/:wfId/steps/:stepId/nodes/:instanceId/mappings"
          description="Update only the I/O mappings without changing the node configuration."
          requestBody={`{
  "inputMappings": [
    {
      "sourceVariable": "step-1",
      "sourceField": "attachmentPaths",
      "targetField": "filePath"
    }
  ],
  "outputMappings": [
    {
      "sourceField": "chunks",
      "targetVariable": "step-3",
      "targetField": "chunkData"
    },
    {
      "sourceField": "headers",
      "targetVariable": "step-4",
      "targetField": "columnNames"
    }
  ]
}`}
          responseBody={`{
  "id": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
  "workflowId": "wf-001-uuid",
  "stepId": "step-2",
  "nodeId": "chunk-extractor",
  "nodeType": "chunk-extractor",
  "config": {
    "chunkSize": 100,
    "startRow": 1,
    "sheetName": "Sheet1",
    "hasHeader": true,
    "delimiter": ","
  },
  "inputMappings": [
    { "sourceVariable": "step-1", "sourceField": "attachmentPaths", "targetField": "filePath" }
  ],
  "outputMappings": [
    { "sourceField": "chunks", "targetVariable": "step-3", "targetField": "chunkData" },
    { "sourceField": "headers", "targetVariable": "step-4", "targetField": "columnNames" }
  ],
  "createdAt": "2026-04-06T10:32:00.000Z",
  "updatedAt": "2026-04-06T12:00:00.000Z"
}`}
          statusCodes={`200 OK — Mappings updated
400 Bad Request — { "error": "Invalid mapping format", "code": "MAPPING_ERROR", "details": { "index": 0, "field": "sourceVariable" } }
404 Not Found — Instance not found
401 Unauthorized`}
          curl={`curl -X PATCH https://api.example.com/api/workflows/wf-001-uuid/steps/step-2/nodes/b2c3d4e5-uuid/mappings \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "inputMappings": [{ "sourceVariable": "step-1", "sourceField": "attachmentPaths", "targetField": "filePath" }],
    "outputMappings": [{ "sourceField": "chunks", "targetVariable": "step-3", "targetField": "chunkData" }]
  }'`}
        />

        {/* DELETE — Remove node */}
        <EndpointSection
          method="DELETE"
          url="/api/workflows/:wfId/steps/:stepId/nodes/:instanceId"
          description="Remove a node instance from a workflow step. Also cleans up any input mappings in downstream steps that reference this node's outputs."
          responseBody={`{
  "success": true,
  "deletedId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "cleanedMappings": 2,
  "message": "Node instance removed and 2 downstream mappings cleaned"
}`}
          statusCodes={`200 OK — Deleted successfully
404 Not Found — { "error": "Node instance not found", "code": "INSTANCE_NOT_FOUND" }
401 Unauthorized
500 Internal Server Error`}
          curl={`curl -X DELETE https://api.example.com/api/workflows/wf-001-uuid/steps/step-1/nodes/a1b2c3d4-uuid \\
  -H "Authorization: Bearer <token>"`}
        />

        {/* GET — All configs for workflow */}
        <EndpointSection
          method="GET"
          url="/api/workflows/:wfId/node-configs"
          description="Retrieve all node instance configurations for an entire workflow. Used by Camunda executor to bootstrap all External Task workers."
          responseBody={`{
  "workflowId": "wf-001-uuid",
  "configs": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "stepId": "step-1",
      "nodeId": "email-fetcher",
      "nodeType": "email-fetcher",
      "config": { "emailId": "inbox@acme.com", "subjectFilter": "Invoice*", "downloadAttachment": true, "maxEmails": 50, "moveAfterRead": "archive" },
      "inputMappings": [],
      "outputMappings": [{ "sourceField": "attachmentPaths", "targetVariable": "step-2", "targetField": "filePath" }]
    },
    {
      "id": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
      "stepId": "step-2",
      "nodeId": "chunk-extractor",
      "nodeType": "chunk-extractor",
      "config": { "chunkSize": 100, "startRow": 1, "hasHeader": true, "delimiter": "," },
      "inputMappings": [{ "sourceVariable": "step-1", "sourceField": "attachmentPaths", "targetField": "filePath" }],
      "outputMappings": [{ "sourceField": "chunks", "targetVariable": "step-3", "targetField": "chunkData" }, { "sourceField": "headers", "targetVariable": "step-4", "targetField": "columnNames" }]
    },
    {
      "id": "c3d4e5f6-a7b8-9012-cdef-345678901234",
      "stepId": "step-3",
      "nodeId": "ai-processor",
      "nodeType": "ai-processor",
      "config": { "prompt": "Analyze: \${chunkData}. Extract column names for financial data.", "model": "gpt-4", "outputFormat": "json", "temperature": 0.3, "maxTokens": 2000 },
      "inputMappings": [{ "sourceVariable": "step-2", "sourceField": "chunks", "targetField": "chunkData" }],
      "outputMappings": [{ "sourceField": "columnNames", "targetVariable": "step-4", "targetField": "columnNames" }]
    },
    {
      "id": "d4e5f6a7-b8c9-0123-defa-456789012345",
      "stepId": "step-4",
      "nodeId": "column-extractor",
      "nodeType": "column-extractor",
      "config": { "outputFormat": "csv", "includeHeader": true, "outputFileName": "financial_extract" },
      "inputMappings": [
        { "sourceVariable": "step-1", "sourceField": "attachmentPaths", "targetField": "filePath" },
        { "sourceVariable": "step-3", "sourceField": "columnNames", "targetField": "columnNames" }
      ],
      "outputMappings": [{ "sourceField": "outputFilePath", "targetVariable": "step-5", "targetField": "outputFilePath" }]
    },
    {
      "id": "e5f6a7b8-c9d0-1234-efab-567890123456",
      "stepId": "step-5",
      "nodeId": "email-notification",
      "nodeType": "email-notification",
      "config": { "to": "manager@acme.com", "subject": "Report Ready: \${outputFileName}", "bodyTemplate": "<p>Extracted \${rowCount} rows. File attached.</p>", "attachFile": true, "priority": "normal" },
      "inputMappings": [{ "sourceVariable": "step-4", "sourceField": "outputFilePath", "targetField": "outputFilePath" }],
      "outputMappings": []
    }
  ],
  "total": 5
}`}
          statusCodes={`200 OK — All configs returned
404 Not Found — { "error": "Workflow not found", "code": "WORKFLOW_NOT_FOUND" }
401 Unauthorized`}
          curl={`curl -X GET https://api.example.com/api/workflows/wf-001-uuid/node-configs \\
  -H "Authorization: Bearer <token>"`}
        />
      </section>

      <Separator />

      {/* ─── Section 3: I/O Mapping & Variable Chaining ─── */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground">3. I/O Mapping & Variable Chaining</h2>
        <p className="text-sm text-muted-foreground">How data flows between nodes via input/output mappings and the variable resolution pattern.</p>

        <DocCard>
          <CardHeader><CardTitle className="text-sm">Mapping Schema</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <CopyBlock label="inputMappings[] Schema" code={`{
  "sourceVariable": "string — stepId of the source step (e.g., 'step-1')",
  "sourceField": "string — output field name from source node (e.g., 'attachmentPaths')",
  "targetField": "string — input field name on current node (e.g., 'filePath')"
}`} />
            <CopyBlock label="outputMappings[] Schema" code={`{
  "sourceField": "string — output field name from current node (e.g., 'chunks')",
  "targetVariable": "string — stepId of the target step (e.g., 'step-3')",
  "targetField": "string — input field name on target node (e.g., 'chunkData')"
}`} />
          </CardContent>
        </DocCard>

        <DocCard>
          <CardHeader><CardTitle className="text-sm">Variable Resolution Pattern</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">At runtime, Camunda resolves variables using the <code className="text-foreground">${`\${stepId.fieldName}`}</code> pattern.</p>
            <CopyBlock label="Resolution Example" code={`// In AI Processor prompt config:
"prompt": "Analyze the following data: \${step-2.chunks}"

// At runtime, Camunda resolves:
// 1. Look up step-2 execution context
// 2. Get the "chunks" variable from step-2 output
// 3. Substitute into the prompt string
// 4. Result: "Analyze the following data: [[row1], [row2], ...]"`} />
          </CardContent>
        </DocCard>

        <DocCard>
          <CardHeader><CardTitle className="text-sm">End-to-End 5-Node Chain Example</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <CopyBlock label="Data Flow" code={`Step 1: Email Fetcher
  ├─ outputs: { emails, attachmentPaths, emailCount }
  └─ outputMappings: attachmentPaths → step-2.filePath

Step 2: Chunk Extractor
  ├─ inputs:  { filePath ← step-1.attachmentPaths }
  ├─ outputs: { chunks, headers, totalRows }
  └─ outputMappings: chunks → step-3.chunkData
                      headers → step-4.columnNames

Step 3: AI Processor
  ├─ inputs:  { chunkData ← step-2.chunks }
  ├─ outputs: { result, columnNames, tokensUsed }
  └─ outputMappings: columnNames → step-4.columnNames

Step 4: Column Extractor
  ├─ inputs:  { filePath ← step-1.attachmentPaths,
  │             columnNames ← step-3.columnNames }
  ├─ outputs: { outputFilePath, rowCount, extractedColumns }
  └─ outputMappings: outputFilePath → step-5.outputFilePath

Step 5: Email Notification
  ├─ inputs:  { outputFilePath ← step-4.outputFilePath }
  ├─ outputs: { messageId, status, sentAt }
  └─ outputMappings: (none — terminal node)`} />
          </CardContent>
        </DocCard>
      </section>

      <Separator />

      {/* ─── Section 4: MongoDB Data Model ─── */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground">4. MongoDB Data Model</h2>
        <p className="text-sm text-muted-foreground">Two collections with schema validators, indexes, and sample documents. Hybrid flat+JSONB design for optimal querying and flexibility.</p>

        <DocCard>
          <CardHeader><CardTitle className="text-sm">Collection: nodeDefinitions (Static Registry)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <CopyBlock label="Create Collection with Validator" code={`db.createCollection("nodeDefinitions", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["_id", "name", "topic", "category", "configFields", "inputs", "outputs"],
      properties: {
        _id: { bsonType: "string", description: "Unique node ID e.g. 'email-fetcher'" },
        name: { bsonType: "string", description: "Display name" },
        description: { bsonType: "string" },
        topic: { bsonType: "string", description: "Camunda External Task topic name" },
        category: { enum: ["communication", "data-processing", "intelligence"], description: "Node category" },
        icon: { bsonType: "string" },
        version: { bsonType: "string", pattern: "^\\\\d+\\\\.\\\\d+\\\\.\\\\d+$" },
        configFields: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["key", "label", "type"],
            properties: {
              key: { bsonType: "string" },
              label: { bsonType: "string" },
              type: { enum: ["string", "number", "boolean", "select", "textarea"] },
              required: { bsonType: "bool" },
              default: {},
              placeholder: { bsonType: "string" },
              options: { bsonType: "array", items: { bsonType: "string" } }
            }
          }
        },
        inputs: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["name", "type"],
            properties: {
              name: { bsonType: "string" },
              type: { bsonType: "string" },
              description: { bsonType: "string" }
            }
          }
        },
        outputs: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["name", "type"],
            properties: {
              name: { bsonType: "string" },
              type: { bsonType: "string" },
              description: { bsonType: "string" }
            }
          }
        }
      }
    }
  }
});`} />
            <CopyBlock label="Indexes" code={`db.nodeDefinitions.createIndex({ category: 1 });
db.nodeDefinitions.createIndex({ topic: 1 }, { unique: true });`} />
            <CopyBlock label="Sample Document" code={`{
  "_id": "email-fetcher",
  "name": "Email Fetcher",
  "description": "Fetch emails from mailbox via MS Graph API, optionally download attachments",
  "topic": "email-fetcher-fetch",
  "category": "communication",
  "icon": "mail",
  "version": "1.0.0",
  "configFields": [
    { "key": "emailId", "label": "Email Address", "type": "string", "required": true, "placeholder": "user@company.com" },
    { "key": "subjectFilter", "label": "Subject Filter", "type": "string", "required": false },
    { "key": "bodyFilter", "label": "Body Contains", "type": "string", "required": false },
    { "key": "downloadAttachment", "label": "Download Attachments", "type": "boolean", "required": false, "default": true },
    { "key": "maxEmails", "label": "Max Emails to Fetch", "type": "number", "required": false, "default": 10 },
    { "key": "moveAfterRead", "label": "Move After Read", "type": "select", "required": false, "default": "archive", "options": ["archive", "trash", "none"] }
  ],
  "inputs": [],
  "outputs": [
    { "name": "emails", "type": "array", "description": "Array of email objects with subject, body, sender, date" },
    { "name": "attachmentPaths", "type": "array", "description": "Array of downloaded attachment file paths" },
    { "name": "emailCount", "type": "number", "description": "Total number of emails fetched" }
  ]
}`} />
          </CardContent>
        </DocCard>

        <DocCard>
          <CardHeader><CardTitle className="text-sm">Collection: nodeInstanceConfigs (Runtime per Workflow+Step)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <CopyBlock label="Create Collection with Validator" code={`db.createCollection("nodeInstanceConfigs", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["workflowId", "stepId", "nodeId", "nodeType", "config"],
      properties: {
        _id: { bsonType: "objectId" },
        workflowId: { bsonType: "string", description: "UUID of the parent workflow" },
        stepId: { bsonType: "string", description: "Step identifier within the workflow" },
        nodeId: { bsonType: "string", description: "References nodeDefinitions._id" },
        nodeType: { bsonType: "string", description: "Denormalized node type for fast filtering" },
        config: {
          bsonType: "object",
          description: "Instance-specific configuration values (JSONB)"
        },
        inputMappings: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["sourceVariable", "sourceField", "targetField"],
            properties: {
              sourceVariable: { bsonType: "string" },
              sourceField: { bsonType: "string" },
              targetField: { bsonType: "string" }
            }
          }
        },
        outputMappings: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["sourceField", "targetVariable", "targetField"],
            properties: {
              sourceField: { bsonType: "string" },
              targetVariable: { bsonType: "string" },
              targetField: { bsonType: "string" }
            }
          }
        },
        createdAt: { bsonType: "date" },
        updatedAt: { bsonType: "date" }
      }
    }
  }
});`} />
            <CopyBlock label="Indexes" code={`// Compound unique — one node per step
db.nodeInstanceConfigs.createIndex(
  { workflowId: 1, stepId: 1, nodeId: 1 },
  { unique: true }
);

// Fast lookup: all configs for a workflow (Camunda bootstrap)
db.nodeInstanceConfigs.createIndex({ workflowId: 1 });

// Filter by node type across workflows
db.nodeInstanceConfigs.createIndex({ nodeType: 1 });

// Step-level queries
db.nodeInstanceConfigs.createIndex({ workflowId: 1, stepId: 1 });`} />
            <CopyBlock label="Sample Document" code={`{
  "_id": ObjectId("6652a1b2c3d4e5f6a7b8c9d0"),
  "workflowId": "wf-001-uuid",
  "stepId": "step-2",
  "nodeId": "chunk-extractor",
  "nodeType": "chunk-extractor",
  "config": {
    "chunkSize": 100,
    "startRow": 1,
    "sheetName": "Sheet1",
    "hasHeader": true,
    "delimiter": ","
  },
  "inputMappings": [
    {
      "sourceVariable": "step-1",
      "sourceField": "attachmentPaths",
      "targetField": "filePath"
    }
  ],
  "outputMappings": [
    {
      "sourceField": "chunks",
      "targetVariable": "step-3",
      "targetField": "chunkData"
    },
    {
      "sourceField": "headers",
      "targetVariable": "step-4",
      "targetField": "columnNames"
    }
  ],
  "createdAt": ISODate("2026-04-06T10:32:00.000Z"),
  "updatedAt": ISODate("2026-04-06T12:00:00.000Z")
}`} />
            <CopyBlock label="Design Rationale" code={`Why Hybrid Flat + JSONB?

FLAT indexed fields (workflowId, stepId, nodeId, nodeType):
  ✓ Fast compound queries for Camunda bootstrap
  ✓ Unique constraint enforcement at DB level
  ✓ Efficient filtering by nodeType across all workflows

JSONB flexible fields (config, inputMappings, outputMappings):
  ✓ Schema varies per node type — no need for sparse columns
  ✓ Config fields change with node version — no migrations needed
  ✓ Mappings are always read/written as a whole — no partial queries
  ✓ Supports nested objects and arrays natively

Alternative considered — fully embedded in workflow document:
  ✗ Workflow document grows unbounded
  ✗ Can't query/index node configs independently
  ✗ Concurrent edits cause write conflicts
  ✗ Can't enforce unique constraint per step+node`} />
          </CardContent>
        </DocCard>
      </section>

      <Separator />

      {/* ─── Section 5: Camunda Integration ─── */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground">5. Camunda Integration</h2>
        <p className="text-sm text-muted-foreground">How node configurations map to Camunda External Task workers and BPMN XML.</p>

        <DocCard>
          <CardHeader><CardTitle className="text-sm">Node Type → Camunda Topic Mapping</CardTitle></CardHeader>
          <CardContent>
            <CopyBlock code={`Node Type             │ Camunda Topic              │ Worker Behavior
──────────────────────┼────────────────────────────┼───────────────────────────────
email-fetcher         │ email-fetcher-fetch        │ Poll mailbox, download attachments
chunk-extractor       │ chunk-extractor-process     │ Parse file, split into row chunks
ai-processor          │ ai-processor-run            │ Call LLM API with resolved prompt
column-extractor      │ column-extractor-extract    │ Filter columns, generate output file
email-notification    │ email-notification-send     │ Send email with template + attachment`} />
          </CardContent>
        </DocCard>

        <DocCard>
          <CardHeader><CardTitle className="text-sm">BPMN XML Generation Example</CardTitle></CardHeader>
          <CardContent>
            <CopyBlock code={`<!-- Generated Service Task for Email Fetcher -->
<bpmn:serviceTask id="step-1-email-fetcher"
                  name="Fetch Invoices"
                  camunda:type="external"
                  camunda:topic="email-fetcher-fetch">
  <bpmn:extensionElements>
    <camunda:inputOutput>
      <camunda:inputParameter name="emailId">inbox@acme.com</camunda:inputParameter>
      <camunda:inputParameter name="subjectFilter">Invoice*</camunda:inputParameter>
      <camunda:inputParameter name="downloadAttachment">true</camunda:inputParameter>
      <camunda:inputParameter name="maxEmails">50</camunda:inputParameter>
      <camunda:inputParameter name="moveAfterRead">archive</camunda:inputParameter>
      <camunda:outputParameter name="attachmentPaths">\${attachmentPaths}</camunda:outputParameter>
      <camunda:outputParameter name="emailCount">\${emailCount}</camunda:outputParameter>
    </camunda:inputOutput>
  </bpmn:extensionElements>
</bpmn:serviceTask>`} />
          </CardContent>
        </DocCard>
      </section>

      <Separator />

      {/* ─── Section 6: Per-Node Config Reference ─── */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground">6. Per-Node Configuration Reference</h2>
        <p className="text-sm text-muted-foreground">Complete configuration, runtime output, and chaining example for each of the 5 nodes.</p>

        {/* Email Fetcher */}
        <DocCard>
          <CardHeader><CardTitle className="text-sm">📧 Email Fetcher — Complete Config</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <CopyBlock label="POST Request — Create Instance" code={`POST /api/workflows/wf-001/steps/step-1/nodes

{
  "nodeId": "email-fetcher",
  "nodeType": "email-fetcher",
  "config": {
    "emailId": "inbox@acme.com",
    "subjectFilter": "Invoice*",
    "bodyFilter": "Payment Due",
    "downloadAttachment": true,
    "maxEmails": 50,
    "moveAfterRead": "archive"
  },
  "inputMappings": [],
  "outputMappings": [
    { "sourceField": "attachmentPaths", "targetVariable": "step-2", "targetField": "filePath" }
  ]
}`} />
            <CopyBlock label="Runtime Output (Camunda Worker)" code={`{
  "emails": [
    { "id": "msg-001", "subject": "Invoice #1234", "from": "vendor@corp.com", "date": "2026-04-05T09:00:00Z", "bodyPreview": "Payment due..." },
    { "id": "msg-002", "subject": "Invoice #1235", "from": "vendor@corp.com", "date": "2026-04-05T10:00:00Z", "bodyPreview": "Monthly bill..." }
  ],
  "attachmentPaths": [
    "/storage/wf-001/step-1/invoice_1234.xlsx",
    "/storage/wf-001/step-1/invoice_1235.xlsx"
  ],
  "emailCount": 2
}`} />
          </CardContent>
        </DocCard>

        {/* Chunk Extractor */}
        <DocCard>
          <CardHeader><CardTitle className="text-sm">📄 Chunk Extractor — Complete Config</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <CopyBlock label="POST Request — Create Instance" code={`POST /api/workflows/wf-001/steps/step-2/nodes

{
  "nodeId": "chunk-extractor",
  "nodeType": "chunk-extractor",
  "config": {
    "chunkSize": 100,
    "startRow": 1,
    "sheetName": "Sheet1",
    "hasHeader": true,
    "delimiter": ","
  },
  "inputMappings": [
    { "sourceVariable": "step-1", "sourceField": "attachmentPaths", "targetField": "filePath" }
  ],
  "outputMappings": [
    { "sourceField": "chunks", "targetVariable": "step-3", "targetField": "chunkData" },
    { "sourceField": "headers", "targetVariable": "step-4", "targetField": "columnNames" }
  ]
}`} />
            <CopyBlock label="Runtime Output (Camunda Worker)" code={`{
  "chunks": [
    [
      { "Invoice No": "1234", "Vendor": "Acme Corp", "Amount": "5000.00", "Due Date": "2026-04-15" },
      { "Invoice No": "1235", "Vendor": "Beta LLC", "Amount": "3200.50", "Due Date": "2026-04-20" }
    ]
  ],
  "headers": ["Invoice No", "Vendor", "Amount", "Due Date"],
  "totalRows": 2
}`} />
          </CardContent>
        </DocCard>

        {/* AI Processor */}
        <DocCard>
          <CardHeader><CardTitle className="text-sm">🧠 AI Processor — Complete Config</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <CopyBlock label="POST Request — Create Instance" code={`POST /api/workflows/wf-001/steps/step-3/nodes

{
  "nodeId": "ai-processor",
  "nodeType": "ai-processor",
  "config": {
    "prompt": "Analyze the following invoice data and identify the columns needed for a summary report: \${step-2.chunks}. Return column names as a JSON array.",
    "model": "gpt-4",
    "outputFormat": "json",
    "temperature": 0.3,
    "maxTokens": 2000,
    "outputSchema": "{ \\"columns\\": [\\"string\\"] }"
  },
  "inputMappings": [
    { "sourceVariable": "step-2", "sourceField": "chunks", "targetField": "chunkData" }
  ],
  "outputMappings": [
    { "sourceField": "columnNames", "targetVariable": "step-4", "targetField": "columnNames" }
  ]
}`} />
            <CopyBlock label="Runtime Output (Camunda Worker)" code={`{
  "result": {
    "columns": ["Invoice No", "Amount", "Due Date"],
    "reasoning": "Selected financial summary columns: identifier, monetary value, and deadline"
  },
  "columnNames": ["Invoice No", "Amount", "Due Date"],
  "tokensUsed": 487
}`} />
          </CardContent>
        </DocCard>

        {/* Column Extractor */}
        <DocCard>
          <CardHeader><CardTitle className="text-sm">📊 Column Extractor — Complete Config</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <CopyBlock label="POST Request — Create Instance" code={`POST /api/workflows/wf-001/steps/step-4/nodes

{
  "nodeId": "column-extractor",
  "nodeType": "column-extractor",
  "config": {
    "outputFormat": "csv",
    "includeHeader": true,
    "outputFileName": "invoice_summary"
  },
  "inputMappings": [
    { "sourceVariable": "step-1", "sourceField": "attachmentPaths", "targetField": "filePath" },
    { "sourceVariable": "step-3", "sourceField": "columnNames", "targetField": "columnNames" }
  ],
  "outputMappings": [
    { "sourceField": "outputFilePath", "targetVariable": "step-5", "targetField": "outputFilePath" },
    { "sourceField": "rowCount", "targetVariable": "step-5", "targetField": "context" }
  ]
}`} />
            <CopyBlock label="Runtime Output (Camunda Worker)" code={`{
  "outputFilePath": "/storage/wf-001/step-4/invoice_summary.csv",
  "rowCount": 2,
  "extractedColumns": ["Invoice No", "Amount", "Due Date"]
}`} />
          </CardContent>
        </DocCard>

        {/* Email Notification */}
        <DocCard>
          <CardHeader><CardTitle className="text-sm">📤 Email Notification — Complete Config</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <CopyBlock label="POST Request — Create Instance" code={`POST /api/workflows/wf-001/steps/step-5/nodes

{
  "nodeId": "email-notification",
  "nodeType": "email-notification",
  "config": {
    "to": "manager@acme.com, finance@acme.com",
    "cc": "audit@acme.com",
    "subject": "Invoice Summary Ready: \${step-4.outputFileName}",
    "bodyTemplate": "<h2>Invoice Summary Report</h2><p>Extracted <strong>\${step-4.rowCount}</strong> rows from \${step-1.emailCount} emails.</p><p>Columns: \${step-4.extractedColumns}</p><p>File attached below.</p>",
    "attachFile": true,
    "priority": "high"
  },
  "inputMappings": [
    { "sourceVariable": "step-4", "sourceField": "outputFilePath", "targetField": "outputFilePath" }
  ],
  "outputMappings": []
}`} />
            <CopyBlock label="Runtime Output (Camunda Worker)" code={`{
  "messageId": "AAMkAGI2TG93AAA=",
  "status": "sent",
  "sentAt": "2026-04-06T12:15:30.000Z"
}`} />
          </CardContent>
        </DocCard>
      </section>

      <Separator />

      {/* ─── Section 7: Error Response Contract ─── */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground">7. Error Response Contract</h2>
        <p className="text-sm text-muted-foreground">Standardized error envelope used across all endpoints.</p>

        <DocCard>
          <CardHeader><CardTitle className="text-sm">Error Response Schema</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <CopyBlock label="Error Envelope" code={`{
  "error": "string — Human-readable error message",
  "code": "string — Machine-readable error code (e.g., NODE_NOT_FOUND)",
  "field": "string | null — Specific field that caused the error",
  "details": "object | null — Additional context"
}`} />
            <CopyBlock label="Error Codes Reference" code={`Code                    │ HTTP │ Description
────────────────────────┼──────┼──────────────────────────────────────
VALIDATION_ERROR        │ 400  │ Request body failed schema validation
MISSING_REQUIRED_FIELD  │ 400  │ A required field is missing
INVALID_FIELD_TYPE      │ 400  │ Field value type doesn't match schema
NODE_NOT_FOUND          │ 404  │ Node definition ID doesn't exist
WORKFLOW_NOT_FOUND      │ 404  │ Workflow ID doesn't exist
STEP_NOT_FOUND          │ 404  │ Step ID doesn't exist in workflow
INSTANCE_NOT_FOUND      │ 404  │ Node instance ID doesn't exist
DUPLICATE_NODE          │ 409  │ Node already attached to this step
MAPPING_ERROR           │ 400  │ I/O mapping references invalid field
CIRCULAR_DEPENDENCY     │ 400  │ Mapping creates a circular variable chain
UNAUTHORIZED            │ 401  │ Missing or invalid auth token
FORBIDDEN               │ 403  │ Insufficient permissions
INTERNAL_ERROR          │ 500  │ Unexpected server error`} />
            <CopyBlock label="Example Error Responses" code={`// 400 — Validation Error
{
  "error": "Missing required field",
  "code": "MISSING_REQUIRED_FIELD",
  "field": "nodeId",
  "details": { "requiredFields": ["nodeId", "nodeType"] }
}

// 404 — Not Found
{
  "error": "Node instance not found",
  "code": "INSTANCE_NOT_FOUND",
  "field": null,
  "details": { "instanceId": "a1b2c3d4-uuid", "stepId": "step-1" }
}

// 409 — Conflict
{
  "error": "Node already attached to this step",
  "code": "DUPLICATE_NODE",
  "field": "nodeId",
  "details": { "existingInstanceId": "x9y8z7-uuid", "nodeId": "email-fetcher", "stepId": "step-1" }
}

// 400 — Mapping Error
{
  "error": "Output field 'invalidField' does not exist on node 'email-fetcher'",
  "code": "MAPPING_ERROR",
  "field": "outputMappings[0].sourceField",
  "details": { "availableFields": ["emails", "attachmentPaths", "emailCount"] }
}`} />
          </CardContent>
        </DocCard>
      </section>

      <Separator />

      {/* ─── Section 8: Production Checklist ─── */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground">8. Production Readiness Checklist</h2>
        <DocCard>
          <CardContent>
            <CopyBlock code={`✅ API Implementation
  □ All 9 REST endpoints implemented with proper HTTP methods
  □ Request body validation using JSON Schema or Zod
  □ Proper HTTP status codes for all scenarios
  □ Standard error envelope on all error responses
  □ Authentication middleware on all endpoints
  □ Rate limiting on write endpoints (POST/PUT/PATCH/DELETE)
  □ Request/response logging with correlation IDs

✅ Database
  □ nodeDefinitions collection seeded with all 5 node types
  □ nodeInstanceConfigs collection with validators and indexes
  □ Compound unique index on (workflowId, stepId, nodeId)
  □ TTL index on soft-deleted records (if applicable)
  □ Backup strategy configured

✅ Camunda Integration
  □ All 5 External Task workers implemented and registered
  □ Workers subscribe to correct topic names
  □ Variable resolution engine handles \${step.field} pattern
  □ Worker error handling with retry + incident creation
  □ Worker health checks and monitoring

✅ I/O Mapping
  □ Input mapping resolution at task start
  □ Output mapping write-back at task completion
  □ Circular dependency detection on mapping save
  □ Orphaned mapping cleanup on node deletion

✅ Testing
  □ Unit tests for each endpoint (happy path + error cases)
  □ Integration tests for 5-node chain workflow
  □ Load tests for bulk config retrieval endpoint
  □ E2E test: create workflow → attach all nodes → configure → execute`} />
          </CardContent>
        </DocCard>
      </section>
    </ModuleDocLayout>
  );
}
