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
      "inputSchema": {
        "type": "object",
        "properties": {
          "emailId": { "type": "string", "description": "Email address / mailbox identifier" },
          "subjectFilter": { "type": "string", "description": "Filter emails by subject" },
          "bodyFilter": { "type": "string", "description": "Filter emails by body content" },
          "downloadAttachment": { "type": "boolean", "description": "Download attachments", "default": true },
          "maxEmails": { "type": "integer", "description": "Max emails to fetch", "default": 10, "minimum": 1, "maximum": 100 },
          "moveAfterRead": { "type": "string", "enum": ["archive","trash","none","custom-folder"], "default": "archive" },
          "outputVariable": { "type": "string", "default": "emailFetcherResult" }
        },
        "required": ["emailId", "outputVariable"]
      },
      "outputSchema": {
        "type": "object",
        "properties": {
          "emails": { "type": "array", "description": "Array of email objects", "items": { "type": "object" } },
          "attachmentDocIds": { "type": "array", "items": { "type": "string" } },
          "attachmentPaths": { "type": "array", "items": { "type": "string" } },
          "emailCount": { "type": "integer" },
          "fetchedAt": { "type": "string" }
        }
      },
      "defaultConfig": {
        "emailId": "", "subjectFilter": "", "bodyFilter": "",
        "downloadAttachment": true, "maxEmails": 10,
        "moveAfterRead": "archive", "outputVariable": "emailFetcherResult"
      }
    },
    {
      "id": "chunk-extractor",
      "name": "Chunk Extractor",
      "description": "Extract rows/chunks from CSV/XLSX files",
      "topic": "chunk-extractor-execute",
      "category": "extraction",
      "version": "1.0.0",
      "inputSchema": {
        "type": "object",
        "properties": {
          "inputVariable": { "type": "string", "description": "Variable from previous node" },
          "chunkSize": { "type": "integer", "default": 100, "minimum": 1, "maximum": 10000 },
          "startRow": { "type": "integer", "default": 1, "minimum": 1 },
          "hasHeader": { "type": "boolean", "default": true },
          "outputVariable": { "type": "string", "default": "chunkExtractorResult" }
        },
        "required": ["inputVariable", "chunkSize", "outputVariable"]
      },
      "outputSchema": {
        "type": "object",
        "properties": {
          "chunks": { "type": "array", "items": { "type": "object" } },
          "totalRows": { "type": "integer" },
          "headers": { "type": "array", "items": { "type": "string" } }
        }
      },
      "defaultConfig": { "inputVariable": "", "chunkSize": 100, "startRow": 1, "hasHeader": true, "outputVariable": "chunkExtractorResult" }
    },
    {
      "id": "ai-processor",
      "name": "AI Processor",
      "description": "Process data with AI using custom prompts and structured output",
      "topic": "ai-processor-execute",
      "category": "ai",
      "version": "1.0.0",
      "inputSchema": {
        "type": "object",
        "properties": {
          "inputVariable": { "type": "string" },
          "prompt": { "type": "string", "description": "AI prompt template" },
          "outputFormat": { "type": "string", "enum": ["json","csv","text","column-names"], "default": "json" },
          "model": { "type": "string", "enum": ["auto","gpt-4","gpt-3.5","gemini-pro"], "default": "auto" },
          "temperature": { "type": "number", "default": 0.3, "minimum": 0, "maximum": 1 },
          "outputVariable": { "type": "string", "default": "aiProcessorResult" }
        },
        "required": ["inputVariable", "prompt", "outputFormat", "outputVariable"]
      },
      "outputSchema": {
        "type": "object",
        "properties": {
          "aiResponse": { "type": "object" },
          "columnNames": { "type": "array", "items": { "type": "string" } },
          "tokensUsed": { "type": "integer" }
        }
      },
      "defaultConfig": { "inputVariable": "", "prompt": "", "outputFormat": "json", "model": "auto", "temperature": 0.3, "outputVariable": "aiProcessorResult" }
    },
    {
      "id": "column-extractor",
      "name": "File Column Extractor",
      "description": "Extract specific columns and produce filtered output file",
      "topic": "column-extractor-execute",
      "category": "extraction",
      "version": "1.0.0",
      "inputSchema": {
        "type": "object",
        "properties": {
          "inputFileVariable": { "type": "string" },
          "columnsVariable": { "type": "string" },
          "manualColumns": { "type": "string" },
          "outputFormat": { "type": "string", "enum": ["csv","xlsx","json"], "default": "csv" },
          "includeHeader": { "type": "boolean", "default": true },
          "outputVariable": { "type": "string", "default": "columnExtractorResult" }
        },
        "required": ["inputFileVariable", "outputFormat", "outputVariable"]
      },
      "outputSchema": {
        "type": "object",
        "properties": {
          "outputFile": { "type": "string" },
          "outputDocId": { "type": "string" },
          "extractedColumns": { "type": "array", "items": { "type": "string" } },
          "totalRows": { "type": "integer" }
        }
      },
      "defaultConfig": { "inputFileVariable": "", "columnsVariable": "", "manualColumns": "", "outputFormat": "csv", "includeHeader": true, "outputVariable": "columnExtractorResult" }
    },
    {
      "id": "email-notification",
      "name": "Email Notification",
      "description": "Send templated emails with optional file attachments",
      "topic": "email-notification-send",
      "category": "notification",
      "version": "1.0.0",
      "inputSchema": {
        "type": "object",
        "properties": {
          "to": { "type": "string", "description": "Comma-separated recipients" },
          "cc": { "type": "string" },
          "subject": { "type": "string" },
          "body": { "type": "string", "description": "HTML body template" },
          "attachFileVariable": { "type": "string" },
          "fromAlias": { "type": "string" },
          "priority": { "type": "string", "enum": ["low","normal","high"], "default": "normal" },
          "outputVariable": { "type": "string", "default": "emailNotificationResult" }
        },
        "required": ["to", "subject", "body", "outputVariable"]
      },
      "outputSchema": {
        "type": "object",
        "properties": {
          "sentStatus": { "type": "string" },
          "messageId": { "type": "string" },
          "recipients": { "type": "integer" },
          "sentAt": { "type": "string" }
        }
      },
      "defaultConfig": { "to": "", "cc": "", "subject": "", "body": "", "attachFileVariable": "", "fromAlias": "", "priority": "normal", "outputVariable": "emailNotificationResult" }
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
  "inputSchema": {
    "type": "object",
    "properties": {
      "emailId": { "type": "string", "description": "Email address / mailbox identifier" },
      "subjectFilter": { "type": "string", "description": "Filter by subject" },
      "bodyFilter": { "type": "string", "description": "Filter by body content" },
      "downloadAttachment": { "type": "boolean", "default": true },
      "maxEmails": { "type": "integer", "default": 10, "minimum": 1, "maximum": 100 },
      "moveAfterRead": { "type": "string", "enum": ["archive","trash","none","custom-folder"], "default": "archive" },
      "outputVariable": { "type": "string", "default": "emailFetcherResult" }
    },
    "required": ["emailId", "outputVariable"]
  },
  "outputSchema": {
    "type": "object",
    "properties": {
      "emails": { "type": "array", "items": { "type": "object" } },
      "attachmentPaths": { "type": "array", "items": { "type": "string" } },
      "emailCount": { "type": "integer" }
    }
  },
  "defaultConfig": {
    "emailId": "", "subjectFilter": "", "bodyFilter": "",
    "downloadAttachment": true, "maxEmails": 10,
    "moveAfterRead": "archive", "outputVariable": "emailFetcherResult"
  }
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

      {/* ─── Section 8: API Call Flow — When Which API Is Called ─── */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground">8. API Call Flow — When Which API Is Called</h2>
        <p className="text-sm text-muted-foreground">
          Sequence of API calls for each user action in the Studio, from workflow creation to Camunda execution.
        </p>

        <DocCard>
          <CardHeader><CardTitle>Flow 1: Studio Page Load</CardTitle></CardHeader>
          <CardContent>
            <CopyBlock label="Sequence" code={`1. GET /api/nodes
   → Load node registry (all 5 definitions) for the Nodes Panel palette
   → Cached in-memory; called once on Studio mount

2. GET /api/workflows/:wfId/node-configs
   → Load ALL existing node instances for this workflow
   → Populates badges on steps + restores previous config`} />
          </CardContent>
        </DocCard>

        <DocCard>
          <CardHeader><CardTitle>Flow 2: Drag & Drop Node onto Step</CardTitle></CardHeader>
          <CardContent>
            <CopyBlock label="Sequence" code={`1. User drags "Email Fetcher" from Nodes Panel onto Step-1
   → Frontend reads node definition from cached registry (no API call)

2. POST /api/workflows/:wfId/steps/step-1/nodes
   Body: { "nodeId": "email-fetcher", "nodeType": "email-fetcher", "config": {}, "inputMappings": [], "outputMappings": [] }
   → Creates node instance record
   → Returns instanceId (UUID)

3. Frontend opens Node Config Dialog (3-column popup)
   → No additional API call yet — dialog pre-fills defaults from registry`} />
          </CardContent>
        </DocCard>

        <DocCard>
          <CardHeader><CardTitle>Flow 3: Configure Node (Save Config)</CardTitle></CardHeader>
          <CardContent>
            <CopyBlock label="Sequence" code={`1. User fills in config fields (emailId, filters, etc.)
   User drags output variables from Previous Step → Current Step input mapping
   User configures output mappings

2. PUT /api/workflows/:wfId/steps/step-1/nodes/:instanceId
   Body: {
     "config": { "emailId": "invoices@acme.com", "subjectFilter": "Invoice*", ... },
     "inputMappings": [],
     "outputMappings": [
       { "sourceField": "attachmentPaths", "targetVariable": "emailFetcherResult", "targetField": "attachmentPaths" }
     ]
   }
   → Saves full config + mappings in one call
   → Returns updated node instance`} />
          </CardContent>
        </DocCard>

        <DocCard>
          <CardHeader><CardTitle>Flow 4: Update Only I/O Mappings (Quick Edit)</CardTitle></CardHeader>
          <CardContent>
            <CopyBlock label="Sequence" code={`1. User re-opens node config dialog, only changes input/output wiring

2. PATCH /api/workflows/:wfId/steps/step-1/nodes/:instanceId/mappings
   Body: {
     "inputMappings": [
       { "sourceVariable": "emailFetcherResult", "sourceField": "attachmentPaths[0]", "targetField": "inputFile" }
     ],
     "outputMappings": [
       { "sourceField": "chunks", "targetVariable": "chunkExtractorResult", "targetField": "chunks" }
     ]
   }
   → Lightweight update — does NOT touch config fields
   → Useful when rewiring chains without reconfiguring node`} />
          </CardContent>
        </DocCard>

        <DocCard>
          <CardHeader><CardTitle>Flow 5: Remove Node from Step</CardTitle></CardHeader>
          <CardContent>
            <CopyBlock label="Sequence" code={`1. User clicks "Remove" on node badge or inside config dialog

2. DELETE /api/workflows/:wfId/steps/step-1/nodes/:instanceId
   → Removes node instance config
   → Frontend removes badge from step
   → ⚠️ Downstream nodes referencing this node's output become orphaned
     → Frontend shows warning: "Node X references removed variable"`} />
          </CardContent>
        </DocCard>

        <DocCard>
          <CardHeader><CardTitle>Flow 6: View Single Node Details</CardTitle></CardHeader>
          <CardContent>
            <CopyBlock label="Sequence" code={`1. User clicks node badge on a step to open config dialog

2. GET /api/workflows/:wfId/steps/step-1/nodes/:instanceId
   → Returns full node instance with config + mappings
   → Dialog pre-fills all fields

3. GET /api/nodes/:nodeId  (if definition not cached)
   → Fetches schema for config fields, inputs, outputs
   → Usually served from cache`} />
          </CardContent>
        </DocCard>

        <DocCard>
          <CardHeader><CardTitle>Flow 7: BPMN Export / Deploy to Camunda</CardTitle></CardHeader>
          <CardContent>
            <CopyBlock label="Sequence" code={`1. User clicks "Export BPMN" or "Deploy"

2. GET /api/workflows/:wfId/node-configs
   → Fetches ALL node instances across ALL steps for this workflow
   → Returns array grouped by stepId

3. For each node instance, the exporter:
   a. Looks up topic from nodeDefinitions registry
   b. Generates <bpmn:serviceTask camunda:type="external" camunda:topic="email-fetcher-fetch">
   c. Converts inputMappings → <camunda:inputParameter>
   d. Converts outputMappings → <camunda:outputParameter>

4. Deploy BPMN XML to Camunda engine
   → Camunda creates process definition`} />
          </CardContent>
        </DocCard>

        <DocCard>
          <CardHeader><CardTitle>Flow 8: Camunda Execution (Runtime)</CardTitle></CardHeader>
          <CardContent>
            <CopyBlock label="Sequence" code={`1. Process instance reaches ServiceTask with topic "email-fetcher-fetch"

2. External Task Worker polls Camunda:
   GET /engine-rest/external-task/fetchAndLock
   → Worker receives task with process variables

3. Worker calls YOUR API to get config:
   GET /api/workflows/:wfId/steps/:stepId/nodes/:instanceId
   → Gets config (emailId, filters, etc.) and mappings

4. Worker executes business logic:
   → Connects to MS Graph API
   → Fetches emails matching filters
   → Downloads attachments

5. Worker completes task with output variables:
   POST /engine-rest/external-task/:taskId/complete
   Body: { "variables": {
     "emailFetcherResult": {
       "value": "{ \\"emails\\": [...], \\"attachmentPaths\\": [...] }",
       "type": "Json"
     }
   }}

6. Camunda resolves next task's inputMappings using \${emailFetcherResult.attachmentPaths}
   → Cycle repeats for next node (Chunk Extractor, AI Processor, etc.)`} />
          </CardContent>
        </DocCard>

        <DocCard>
          <CardHeader><CardTitle>Flow 9: Full 5-Node Chain — Complete API Sequence</CardTitle></CardHeader>
          <CardContent>
            <CopyBlock label="End-to-End API Call Timeline" code={`═══════════════════════════════════════════════════════════════
  DESIGN TIME (Studio UI)
═══════════════════════════════════════════════════════════════

① Page Load
   GET /api/nodes                                    → Load palette
   GET /api/workflows/wf-001/node-configs            → Load existing configs

② Drag Email Fetcher → Step 1
   POST /api/workflows/wf-001/steps/step-1/nodes     → Create instance → inst-001

③ Configure Email Fetcher
   PUT  /api/workflows/wf-001/steps/step-1/nodes/inst-001  → Save config

④ Drag Chunk Extractor → Step 2
   POST /api/workflows/wf-001/steps/step-2/nodes     → Create instance → inst-002

⑤ Configure Chunk Extractor + wire input from Step 1
   PUT  /api/workflows/wf-001/steps/step-2/nodes/inst-002  → Save config + inputMappings

⑥ Drag AI Processor → Step 3
   POST /api/workflows/wf-001/steps/step-3/nodes     → Create instance → inst-003

⑦ Configure AI Processor + wire input from Step 2
   PUT  /api/workflows/wf-001/steps/step-3/nodes/inst-003  → Save config + inputMappings

⑧ Drag Column Extractor → Step 4
   POST /api/workflows/wf-001/steps/step-4/nodes     → Create instance → inst-004

⑨ Configure Column Extractor + wire inputs from Step 1 (file) & Step 3 (columns)
   PUT  /api/workflows/wf-001/steps/step-4/nodes/inst-004  → Save config + inputMappings

⑩ Drag Email Notification → Step 5
   POST /api/workflows/wf-001/steps/step-5/nodes     → Create instance → inst-005

⑪ Configure Email Notification + wire attachment from Step 4
   PUT  /api/workflows/wf-001/steps/step-5/nodes/inst-005  → Save config + inputMappings

⑫ Export BPMN
   GET  /api/workflows/wf-001/node-configs            → Fetch all 5 configs
   → Generate BPMN XML with 5 ServiceTasks + topics + mappings

═══════════════════════════════════════════════════════════════
  RUNTIME (Camunda Execution)
═══════════════════════════════════════════════════════════════

⑬ Email Fetcher Worker
   GET  /api/workflows/wf-001/steps/step-1/nodes/inst-001  → Get config
   → Execute: fetch emails, download attachments
   → Complete task: set emailFetcherResult variable

⑭ Chunk Extractor Worker
   GET  /api/workflows/wf-001/steps/step-2/nodes/inst-002  → Get config
   → Execute: read \${emailFetcherResult.attachmentPaths[0]}, extract 100 rows
   → Complete task: set chunkExtractorResult variable

⑮ AI Processor Worker
   GET  /api/workflows/wf-001/steps/step-3/nodes/inst-003  → Get config
   → Execute: send \${chunkExtractorResult.chunks} to LLM with prompt
   → Complete task: set aiProcessorResult variable

⑯ Column Extractor Worker
   GET  /api/workflows/wf-001/steps/step-4/nodes/inst-004  → Get config
   → Execute: extract columns \${aiProcessorResult.columnNames} from source file
   → Complete task: set columnExtractorResult variable

⑰ Email Notification Worker
   GET  /api/workflows/wf-001/steps/step-5/nodes/inst-005  → Get config
   → Execute: send email with \${columnExtractorResult.outputFile} attached
   → Complete task: set emailNotificationResult variable

═══════════════════════════════════════════════════════════════
  TOTAL API CALLS: 17 (12 design-time + 5 runtime)
═══════════════════════════════════════════════════════════════`} />
          </CardContent>
        </DocCard>
      </section>

      <Separator />

      {/* ─── Section 9: Camunda Topic Worker Code & Variable Setting ─── */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground">9. Camunda External Task Workers — Code & Variable Setting</h2>
        <p className="text-sm text-muted-foreground">
          Each automation node runs as a Camunda External Task Worker that subscribes to a specific topic.
          Below is the complete worker lifecycle, code examples, and variable resolution logic for every node.
        </p>

        {/* Worker Architecture */}
        <DocCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-primary">Worker Architecture Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <CopyBlock label="Worker Registration Pattern (Node.js / TypeScript)" code={`import { Client, Variables } from "camunda-external-task-client-js";

const camundaClient = new Client({
  baseUrl: "http://camunda-engine:8080/engine-rest",
  workerId: "automation-worker-01",
  maxTasks: 5,
  asyncResponseTimeout: 30000,  // long-polling timeout
  use: [logger],                // middleware
});

// Each node registers a separate topic subscription
camundaClient.subscribe("email-fetcher-fetch", async ({ task, taskService }) => {
  try {
    // 1. Read input variables set by Camunda from BPMN inputParameters
    const instanceId  = task.variables.get("nodeInstanceId");
    const workflowId  = task.variables.get("workflowId");
    const stepId      = task.variables.get("stepId");

    // 2. Fetch full config from API
    const config = await fetch(
      \`\${API_BASE}/api/workflows/\${workflowId}/steps/\${stepId}/nodes/\${instanceId}\`
    ).then(r => r.json());

    // 3. Execute business logic using config
    const result = await executeEmailFetcher(config.config);

    // 4. Set output variables for downstream nodes
    const processVars = new Variables();
    processVars.set("emailFetcherResult", JSON.stringify(result));
    
    // 5. Complete the task — Camunda advances to next step
    await taskService.complete(task, processVars);
  } catch (err) {
    // 6. Handle failure with retry
    await taskService.handleFailure(task, {
      errorMessage: err.message,
      errorDetails: err.stack,
      retries: (task.retries ?? 3) - 1,
      retryTimeout: 5000,
    });
  }
});`} />
          </CardContent>
        </DocCard>

        <Separator />

        {/* Topic → Worker mapping table */}
        <DocCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-primary">Topic → Worker Mapping</CardTitle>
          </CardHeader>
          <CardContent>
            <CopyBlock code={`┌─────────────────────────┬──────────────────────────┬─────────────────────────────┐
│ Node                    │ Camunda Topic            │ Worker Function             │
├─────────────────────────┼──────────────────────────┼─────────────────────────────┤
│ Email Fetcher           │ email-fetcher-fetch      │ executeEmailFetcher()       │
│ Chunk Extractor         │ chunk-extractor-execute  │ executeChunkExtractor()     │
│ AI Processor            │ ai-processor-execute     │ executeAiProcessor()        │
│ File Column Extractor   │ column-extractor-execute │ executeColumnExtractor()    │
│ Email Notification      │ email-notification-send  │ executeEmailNotification()  │
└─────────────────────────┴──────────────────────────┴─────────────────────────────┘`} />
          </CardContent>
        </DocCard>

        <Separator />

        {/* BPMN XML generation */}
        <DocCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-primary">BPMN XML — How Topics & Variables Are Set</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              During BPMN export, each automation node generates a ServiceTask with <code>camunda:type="external"</code>,
              the topic name, and inputParameter elements for every config field and I/O mapping.
            </p>
            <CopyBlock label="Generated BPMN XML for Email Fetcher Step" code={`<bpmn:serviceTask id="step-1" name="Fetch Emails"
    camunda:type="external"
    camunda:topic="email-fetcher-fetch">
  <bpmn:extensionElements>
    <camunda:inputOutput>
      <!-- System variables (always injected) -->
      <camunda:inputParameter name="nodeInstanceId">inst-001</camunda:inputParameter>
      <camunda:inputParameter name="workflowId">wf-001</camunda:inputParameter>
      <camunda:inputParameter name="stepId">step-1</camunda:inputParameter>
      
      <!-- Config fields from nodeInstanceConfig.config -->
      <camunda:inputParameter name="emailId">invoices@company.com</camunda:inputParameter>
      <camunda:inputParameter name="subjectFilter">Invoice</camunda:inputParameter>
      <camunda:inputParameter name="downloadAttachment">true</camunda:inputParameter>
      <camunda:inputParameter name="maxEmails">10</camunda:inputParameter>
      <camunda:inputParameter name="moveAfterRead">archive</camunda:inputParameter>
      <camunda:inputParameter name="outputVariable">emailFetcherResult</camunda:inputParameter>

      <!-- Output mappings — write worker result to process scope -->
      <camunda:outputParameter name="emailFetcherResult">
        \${emailFetcherResult}
      </camunda:outputParameter>
    </camunda:inputOutput>
  </bpmn:extensionElements>
</bpmn:serviceTask>`} />

            <CopyBlock label="Generated BPMN XML for Chunk Extractor (with input from previous step)" code={`<bpmn:serviceTask id="step-2" name="Extract Chunks"
    camunda:type="external"
    camunda:topic="chunk-extractor-execute">
  <bpmn:extensionElements>
    <camunda:inputOutput>
      <!-- System variables -->
      <camunda:inputParameter name="nodeInstanceId">inst-002</camunda:inputParameter>
      <camunda:inputParameter name="workflowId">wf-001</camunda:inputParameter>
      <camunda:inputParameter name="stepId">step-2</camunda:inputParameter>

      <!-- Input mapping from previous step (resolved at runtime by Camunda) -->
      <camunda:inputParameter name="inputVariable">
        \${emailFetcherResult.attachmentPaths[0]}
      </camunda:inputParameter>

      <!-- Config fields -->
      <camunda:inputParameter name="chunkSize">100</camunda:inputParameter>
      <camunda:inputParameter name="startRow">1</camunda:inputParameter>
      <camunda:inputParameter name="hasHeader">true</camunda:inputParameter>
      <camunda:inputParameter name="outputVariable">chunkExtractorResult</camunda:inputParameter>

      <!-- Output mapping -->
      <camunda:outputParameter name="chunkExtractorResult">
        \${chunkExtractorResult}
      </camunda:outputParameter>
    </camunda:inputOutput>
  </bpmn:extensionElements>
</bpmn:serviceTask>`} />
          </CardContent>
        </DocCard>

        <Separator />

        {/* Per-node worker code */}
        <DocCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-primary">① Email Fetcher Worker — Full Code</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <CopyBlock label="Worker Implementation" code={`camundaClient.subscribe("email-fetcher-fetch", async ({ task, taskService }) => {
  const instanceId = task.variables.get("nodeInstanceId");
  const workflowId = task.variables.get("workflowId");
  const stepId     = task.variables.get("stepId");

  // Fetch config from API
  const { config } = await fetchNodeConfig(workflowId, stepId, instanceId);
  // config = {
  //   emailId: "invoices@company.com",
  //   subjectFilter: "Invoice",
  //   bodyFilter: "",
  //   downloadAttachment: true,
  //   maxEmails: 10,
  //   moveAfterRead: "archive",
  //   outputVariable: "emailFetcherResult"
  // }

  // Execute: Connect to mailbox via Core API (MS Graph)
  const emails = await coreApi.fetchEmails({
    mailbox: config.emailId,
    filters: {
      subject: config.subjectFilter || undefined,
      body: config.bodyFilter || undefined,
    },
    limit: config.maxEmails,
  });

  // Download attachments if enabled
  let attachmentDocIds = [];
  let attachmentPaths = [];
  if (config.downloadAttachment) {
    for (const email of emails) {
      for (const att of email.attachments) {
        const doc = await coreApi.downloadAttachment(att.id);
        attachmentDocIds.push(doc.documentId);
        attachmentPaths.push(doc.filePath);
      }
    }
  }

  // Move emails after read
  if (config.moveAfterRead !== "none") {
    await coreApi.moveEmails(
      emails.map(e => e.id), 
      config.moveAfterRead
    );
  }

  // Set output variable
  const result = {
    emails: emails.map(e => ({
      id: e.id, subject: e.subject, from: e.from,
      receivedAt: e.receivedAt, hasAttachments: e.attachments.length > 0,
    })),
    attachmentDocIds,
    attachmentPaths,
    fetchedAt: new Date().toISOString(),
    totalEmails: emails.length,
  };

  const vars = new Variables();
  vars.set(config.outputVariable, JSON.stringify(result));
  // → Sets: emailFetcherResult = { emails: [...], attachmentPaths: [...], ... }

  await taskService.complete(task, vars);
});`} />
            <CopyBlock label="Output Variable Shape" code={`// Variable: emailFetcherResult
{
  "emails": [
    {
      "id": "msg-abc123",
      "subject": "Invoice #2024-0312",
      "from": "vendor@example.com",
      "receivedAt": "2024-03-12T09:15:00Z",
      "hasAttachments": true
    }
  ],
  "attachmentDocIds": ["doc-001", "doc-002"],
  "attachmentPaths": ["/tmp/wf-001/invoice_march.xlsx", "/tmp/wf-001/receipt.pdf"],
  "fetchedAt": "2024-03-12T10:00:00Z",
  "totalEmails": 3
}`} />
          </CardContent>
        </DocCard>

        <DocCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-primary">② Chunk Extractor Worker — Full Code</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <CopyBlock label="Worker Implementation" code={`camundaClient.subscribe("chunk-extractor-execute", async ({ task, taskService }) => {
  const { config, inputMappings } = await fetchNodeConfig(
    task.variables.get("workflowId"),
    task.variables.get("stepId"),
    task.variables.get("nodeInstanceId")
  );
  // config = { chunkSize: 100, startRow: 1, hasHeader: true, outputVariable: "chunkExtractorResult" }

  // Resolve input variable — Camunda already resolved \${emailFetcherResult.attachmentPaths[0]}
  const inputFilePath = task.variables.get("inputVariable");
  // inputFilePath = "/tmp/wf-001/invoice_march.xlsx"

  // Execute: Read file and extract chunks
  const fileData = await fileService.readFile(inputFilePath);
  const allRows = parseSpreadsheet(fileData, { hasHeader: config.hasHeader });
  
  const startIdx = (config.startRow || 1) - 1;
  const chunkSize = config.chunkSize || 100;
  const chunks = [];
  
  for (let i = startIdx; i < allRows.length; i += chunkSize) {
    chunks.push({
      chunkIndex: Math.floor(i / chunkSize),
      rows: allRows.slice(i, i + chunkSize),
      startRow: i + 1,
      endRow: Math.min(i + chunkSize, allRows.length),
    });
  }

  const result = {
    chunks,
    totalRows: allRows.length,
    totalChunks: chunks.length,
    headers: config.hasHeader ? allRows[0] : null,
    sourceFile: inputFilePath,
    processedAt: new Date().toISOString(),
  };

  const vars = new Variables();
  vars.set(config.outputVariable, JSON.stringify(result));
  // → Sets: chunkExtractorResult = { chunks: [...], totalRows: 5000, ... }

  await taskService.complete(task, vars);
});`} />
            <CopyBlock label="Output Variable Shape" code={`// Variable: chunkExtractorResult
{
  "chunks": [
    {
      "chunkIndex": 0,
      "rows": [["John", "Doe", "50000"], ["Jane", "Smith", "62000"]],
      "startRow": 1,
      "endRow": 100
    },
    {
      "chunkIndex": 1,
      "rows": [["Bob", "Wilson", "45000"]],
      "startRow": 101,
      "endRow": 200
    }
  ],
  "totalRows": 5000,
  "totalChunks": 50,
  "headers": ["FirstName", "LastName", "Salary"],
  "sourceFile": "/tmp/wf-001/invoice_march.xlsx",
  "processedAt": "2024-03-12T10:02:00Z"
}`} />
          </CardContent>
        </DocCard>

        <DocCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-primary">③ AI Processor Worker — Full Code</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <CopyBlock label="Worker Implementation" code={`camundaClient.subscribe("ai-processor-execute", async ({ task, taskService }) => {
  const { config } = await fetchNodeConfig(
    task.variables.get("workflowId"),
    task.variables.get("stepId"),
    task.variables.get("nodeInstanceId")
  );
  // config = {
  //   prompt: "Analyze the following data and identify relevant column names...",
  //   outputFormat: "json",
  //   model: "auto",
  //   temperature: 0.3,
  //   outputVariable: "aiProcessorResult"
  // }

  // Resolve input — Camunda already resolved \${chunkExtractorResult.chunks}
  const inputData = JSON.parse(task.variables.get("inputVariable"));

  // Build prompt with variable substitution
  let finalPrompt = config.prompt;
  // Replace \${variable} placeholders in prompt template
  finalPrompt = finalPrompt.replace(
    /\\$\\{([^}]+)\\}/g,
    (_, varName) => {
      const val = resolveVariable(varName, task.variables);
      return typeof val === "object" ? JSON.stringify(val) : String(val);
    }
  );

  // Call LLM via AI service
  const llmResponse = await aiService.complete({
    model: config.model === "auto" ? selectBestModel(inputData) : config.model,
    prompt: finalPrompt,
    temperature: config.temperature,
    responseFormat: config.outputFormat === "json" ? { type: "json_object" } : undefined,
  });

  // Parse response based on output format
  let parsedResult;
  if (config.outputFormat === "json") {
    parsedResult = JSON.parse(llmResponse.text);
  } else if (config.outputFormat === "column-names") {
    parsedResult = { columnNames: extractColumnNames(llmResponse.text) };
  } else if (config.outputFormat === "csv") {
    parsedResult = { csv: llmResponse.text };
  } else {
    parsedResult = { text: llmResponse.text };
  }

  const result = {
    ...parsedResult,
    model: llmResponse.model,
    tokensUsed: llmResponse.usage.totalTokens,
    processedAt: new Date().toISOString(),
  };

  const vars = new Variables();
  vars.set(config.outputVariable, JSON.stringify(result));
  // → Sets: aiProcessorResult = { columnNames: [...], model: "gpt-4", ... }

  await taskService.complete(task, vars);
});`} />
            <CopyBlock label="Output Variable Shape (column-names format)" code={`// Variable: aiProcessorResult
{
  "columnNames": ["FirstName", "LastName", "Salary", "Department"],
  "model": "gpt-4",
  "tokensUsed": 1250,
  "processedAt": "2024-03-12T10:05:00Z"
}`} />
          </CardContent>
        </DocCard>

        <DocCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-primary">④ File Column Extractor Worker — Full Code</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <CopyBlock label="Worker Implementation" code={`camundaClient.subscribe("column-extractor-execute", async ({ task, taskService }) => {
  const { config, inputMappings } = await fetchNodeConfig(
    task.variables.get("workflowId"),
    task.variables.get("stepId"),
    task.variables.get("nodeInstanceId")
  );
  // config = {
  //   outputFormat: "csv",
  //   includeHeader: true,
  //   outputVariable: "columnExtractorResult"
  // }

  // Resolve two inputs:
  // 1. Source file from Email Fetcher (step-1)
  const sourceFilePath = task.variables.get("inputFileVariable");
  // = "/tmp/wf-001/invoice_march.xlsx" (resolved from \${emailFetcherResult.attachmentPaths[0]})

  // 2. Column names from AI Processor (step-3) or manual config
  let columnNames;
  const columnsVar = task.variables.get("columnsVariable");
  if (columnsVar) {
    const aiResult = JSON.parse(columnsVar);
    columnNames = aiResult.columnNames || aiResult;
    // = ["FirstName", "LastName", "Salary", "Department"]
  } else if (config.manualColumns) {
    columnNames = config.manualColumns.split(",").map(c => c.trim());
  }

  // Execute: Read source file and extract specified columns
  const fileData = await fileService.readFile(sourceFilePath);
  const allRows = parseSpreadsheet(fileData, { hasHeader: true });
  const headers = allRows[0];
  
  // Find column indices
  const colIndices = columnNames.map(name => 
    headers.findIndex(h => h.toLowerCase() === name.toLowerCase())
  ).filter(i => i !== -1);

  // Extract columns
  const extractedRows = allRows.map(row => 
    colIndices.map(i => row[i])
  );

  // Create output file
  const outputFileName = \`extracted_\${Date.now()}.\${config.outputFormat}\`;
  const outputPath = \`/tmp/\${task.variables.get("workflowId")}/\${outputFileName}\`;
  
  if (config.outputFormat === "csv") {
    await fileService.writeCsv(outputPath, extractedRows, {
      includeHeader: config.includeHeader,
    });
  } else if (config.outputFormat === "xlsx") {
    await fileService.writeXlsx(outputPath, extractedRows);
  } else {
    await fileService.writeJson(outputPath, extractedRows);
  }

  // Upload to document store
  const docId = await documentStore.upload(outputPath);

  const result = {
    outputFile: outputPath,
    outputDocId: docId,
    extractedColumns: columnNames,
    totalRows: extractedRows.length - (config.includeHeader ? 1 : 0),
    outputFormat: config.outputFormat,
    processedAt: new Date().toISOString(),
  };

  const vars = new Variables();
  vars.set(config.outputVariable, JSON.stringify(result));
  // → Sets: columnExtractorResult = { outputFile: "...", outputDocId: "doc-005", ... }

  await taskService.complete(task, vars);
});`} />
            <CopyBlock label="Output Variable Shape" code={`// Variable: columnExtractorResult
{
  "outputFile": "/tmp/wf-001/extracted_1710245100.csv",
  "outputDocId": "doc-005",
  "extractedColumns": ["FirstName", "LastName", "Salary", "Department"],
  "totalRows": 4999,
  "outputFormat": "csv",
  "processedAt": "2024-03-12T10:08:00Z"
}`} />
          </CardContent>
        </DocCard>

        <DocCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-primary">⑤ Email Notification Worker — Full Code</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <CopyBlock label="Worker Implementation" code={`camundaClient.subscribe("email-notification-send", async ({ task, taskService }) => {
  const { config } = await fetchNodeConfig(
    task.variables.get("workflowId"),
    task.variables.get("stepId"),
    task.variables.get("nodeInstanceId")
  );
  // config = {
  //   to: "manager@company.com,team-lead@company.com",
  //   cc: "",
  //   subject: "Processed Data Report - \${emailFetcherResult.emails[0].subject}",
  //   body: "<h1>Report Ready</h1><p>Extracted \${columnExtractorResult.totalRows} rows...</p>",
  //   attachFileVariable: "columnExtractorResult.outputFile",
  //   fromAlias: "Automation Bot",
  //   outputVariable: "emailNotificationResult"
  // }

  // Resolve template variables in subject and body
  const subject = resolveTemplateVars(config.subject, task.variables);
  // = "Processed Data Report - Invoice #2024-0312"

  const body = resolveTemplateVars(config.body, task.variables);
  // = "<h1>Report Ready</h1><p>Extracted 4999 rows...</p>"

  // Resolve attachment file path
  let attachments = [];
  if (config.attachFileVariable) {
    const filePath = resolveVariable(config.attachFileVariable, task.variables);
    // = "/tmp/wf-001/extracted_1710245100.csv"
    attachments.push({ path: filePath, filename: path.basename(filePath) });
  }

  // Send email via Core API (MS Graph)
  const sendResult = await coreApi.sendEmail({
    from: config.fromAlias || "noreply@company.com",
    to: config.to.split(",").map(e => e.trim()),
    cc: config.cc ? config.cc.split(",").map(e => e.trim()) : [],
    subject,
    htmlBody: body,
    attachments,
  });

  const result = {
    sentStatus: sendResult.status,       // "sent"
    messageId: sendResult.messageId,     // "AAMkAGI2..."
    recipients: config.to.split(",").length,
    attachmentCount: attachments.length,
    sentAt: new Date().toISOString(),
  };

  const vars = new Variables();
  vars.set(config.outputVariable, JSON.stringify(result));
  // → Sets: emailNotificationResult = { sentStatus: "sent", messageId: "...", ... }

  await taskService.complete(task, vars);
});`} />
            <CopyBlock label="Output Variable Shape" code={`// Variable: emailNotificationResult
{
  "sentStatus": "sent",
  "messageId": "AAMkAGI2TG93AAA=",
  "recipients": 2,
  "attachmentCount": 1,
  "sentAt": "2024-03-12T10:10:00Z"
}`} />
          </CardContent>
        </DocCard>

        <Separator />

        {/* Variable Resolution Engine */}
        <DocCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-primary">Variable Resolution Engine — How \${"{"}variable{"}"} Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <CopyBlock label="resolveVariable() — Core Utility" code={`/**
 * Resolves a dot-notation variable path against Camunda process variables.
 * 
 * Examples:
 *   "emailFetcherResult.attachmentPaths[0]"  → "/tmp/wf-001/invoice.xlsx"
 *   "aiProcessorResult.columnNames"           → ["FirstName", "LastName"]
 *   "chunkExtractorResult.totalRows"          → 5000
 */
function resolveVariable(path: string, variables: Variables): any {
  const parts = path.split(".");
  const rootVarName = parts[0];
  
  // Get root variable from Camunda process scope
  let value = variables.get(rootVarName);
  
  // If stored as JSON string, parse it
  if (typeof value === "string") {
    try { value = JSON.parse(value); } catch {}
  }
  
  // Traverse nested path
  for (let i = 1; i < parts.length; i++) {
    if (value == null) return undefined;
    
    const part = parts[i];
    // Handle array indexing: "attachmentPaths[0]"
    const arrayMatch = part.match(/^(\\w+)\\[(\\d+)\\]$/);
    if (arrayMatch) {
      value = value[arrayMatch[1]];
      value = value?.[parseInt(arrayMatch[2])];
    } else {
      value = value[part];
    }
  }
  
  return value;
}

/**
 * Resolves all \${...} placeholders in a template string.
 * Used for email subject, body, and AI prompt templates.
 */
function resolveTemplateVars(template: string, variables: Variables): string {
  return template.replace(/\\$\\{([^}]+)\\}/g, (_, varPath) => {
    const resolved = resolveVariable(varPath, variables);
    if (resolved == null) return "";
    return typeof resolved === "object" ? JSON.stringify(resolved) : String(resolved);
  });
}`} />

            <CopyBlock label="Variable Flow Through 5-Node Chain" code={`┌─────────────────────────────────────────────────────────────────────┐
│                    CAMUNDA PROCESS VARIABLE SCOPE                   │
│                                                                     │
│  Step 1 (Email Fetcher) WRITES:                                    │
│    emailFetcherResult = {                                          │
│      emails: [...],                                                │
│      attachmentPaths: ["/tmp/wf-001/invoice.xlsx"],                │
│      attachmentDocIds: ["doc-001"]                                 │
│    }                                                                │
│                                          ↓                          │
│  Step 2 (Chunk Extractor) READS:                                   │
│    inputVariable ← \${emailFetcherResult.attachmentPaths[0]}       │
│  Step 2 WRITES:                                                    │
│    chunkExtractorResult = {                                        │
│      chunks: [{rows: [...]}, ...],                                 │
│      totalRows: 5000, headers: ["Name","Salary"]                   │
│    }                                                                │
│                                          ↓                          │
│  Step 3 (AI Processor) READS:                                      │
│    inputVariable ← \${chunkExtractorResult.chunks}                 │
│  Step 3 WRITES:                                                    │
│    aiProcessorResult = {                                           │
│      columnNames: ["FirstName","LastName","Salary"],                │
│      model: "gpt-4", tokensUsed: 1250                              │
│    }                                                                │
│                                          ↓                          │
│  Step 4 (Column Extractor) READS:                                  │
│    inputFileVariable ← \${emailFetcherResult.attachmentPaths[0]}   │
│    columnsVariable   ← \${aiProcessorResult.columnNames}           │
│  Step 4 WRITES:                                                    │
│    columnExtractorResult = {                                       │
│      outputFile: "/tmp/wf-001/extracted.csv",                      │
│      outputDocId: "doc-005", totalRows: 4999                       │
│    }                                                                │
│                                          ↓                          │
│  Step 5 (Email Notification) READS:                                │
│    attachFileVariable ← \${columnExtractorResult.outputFile}       │
│    subject template   ← "Report: \${emailFetcherResult.emails...}" │
│    body template      ← "Extracted \${columnExtractorResult...}"   │
│  Step 5 WRITES:                                                    │
│    emailNotificationResult = {                                     │
│      sentStatus: "sent", messageId: "AAMk..."                      │
│    }                                                                │
└─────────────────────────────────────────────────────────────────────┘`} />

            <CopyBlock label="fetchNodeConfig() — Helper Used by All Workers" code={`/**
 * Fetches node instance configuration from the API.
 * Called by every worker after receiving a task from Camunda.
 */
async function fetchNodeConfig(
  workflowId: string, 
  stepId: string, 
  instanceId: string
): Promise<{
  config: Record<string, any>;
  inputMappings: Array<{ source: string; target: string; sourceStep: string }>;
  outputMappings: Array<{ source: string; target: string }>;
}> {
  const response = await fetch(
    \`\${API_BASE}/api/workflows/\${workflowId}/steps/\${stepId}/nodes/\${instanceId}\`,
    { headers: { Authorization: \`Bearer \${SERVICE_TOKEN}\` } }
  );
  
  if (!response.ok) {
    throw new Error(\`Failed to fetch node config: \${response.status}\`);
  }
  
  return response.json();
}

// Usage in worker:
// const { config, inputMappings, outputMappings } = await fetchNodeConfig(wfId, stepId, instId);
// config.emailId → "invoices@company.com"
// inputMappings  → [{ source: "emailFetcherResult.attachmentPaths[0]", target: "inputVariable", sourceStep: "step-1" }]`} />
          </CardContent>
        </DocCard>

        <Separator />

        {/* Error handling */}
        <DocCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-primary">Worker Error Handling & Retry Strategy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <CopyBlock label="Error Handling Pattern" code={`// Every worker wraps execution in try/catch with structured error handling

try {
  // ... worker logic ...
  await taskService.complete(task, processVars);
} catch (err) {
  if (err instanceof ConfigNotFoundError) {
    // Permanent failure — don't retry, create incident
    await taskService.handleFailure(task, {
      errorMessage: "Node configuration not found",
      errorDetails: \`instanceId=\${instanceId} not found in API\`,
      retries: 0,  // No retries → creates Camunda Incident
      retryTimeout: 0,
    });
  } else if (err instanceof VariableResolutionError) {
    // Variable from previous step not available yet or invalid path
    await taskService.handleFailure(task, {
      errorMessage: \`Variable resolution failed: \${err.variablePath}\`,
      errorDetails: err.stack,
      retries: 0,
      retryTimeout: 0,
    });
  } else if (err instanceof ExternalServiceError) {
    // Transient failure (API timeout, rate limit) — retry with backoff
    const remainingRetries = (task.retries ?? 3) - 1;
    await taskService.handleFailure(task, {
      errorMessage: err.message,
      errorDetails: err.stack,
      retries: remainingRetries,
      retryTimeout: remainingRetries > 1 ? 10000 : 30000,  // exponential backoff
    });
  } else {
    // Unknown error — retry once then create incident
    await taskService.handleFailure(task, {
      errorMessage: err.message,
      errorDetails: err.stack,
      retries: Math.min((task.retries ?? 1) - 1, 0),
      retryTimeout: 5000,
    });
  }
}`} />

            <CopyBlock label="BPMN Error Events (for business-level errors)" code={`// Workers can also throw BPMN errors for business-level handling
// These are caught by Error Boundary Events in the BPMN diagram

if (emails.length === 0) {
  await taskService.handleBpmnError(task, "NO_EMAILS_FOUND", 
    "No emails matched the configured filters");
  // → Camunda routes to the attached Error Boundary Event
  // → Workflow can take alternative path (e.g., send "no data" notification)
  return;
}

if (llmResponse.tokensUsed > MAX_TOKEN_BUDGET) {
  await taskService.handleBpmnError(task, "TOKEN_BUDGET_EXCEEDED",
    \`Used \${llmResponse.tokensUsed} tokens, budget is \${MAX_TOKEN_BUDGET}\`);
  return;
}`} />
          </CardContent>
        </DocCard>
      </section>

      <Separator />

      {/* ─── Section 10: Production Checklist ─── */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground">10. Production Readiness Checklist</h2>
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
