

# Automation Nodes — Full API Contract Documentation Page

## What We're Building
A new documentation page at `/docs/automation-nodes` with complete request/response JSON for every API endpoint related to automation nodes — registry, CRUD, I/O mapping, bulk retrieval, and MongoDB data models with sample documents.

## API Endpoints Documented (with full request + response JSON)

### Node Registry
| # | Method | Endpoint | Purpose |
|---|--------|----------|---------|
| 1 | GET | `/api/nodes` | List all 5 node definitions |
| 2 | GET | `/api/nodes/:nodeId` | Get single node definition |

### Node Instance CRUD
| # | Method | Endpoint | Purpose |
|---|--------|----------|---------|
| 3 | POST | `/api/workflows/:wfId/steps/:stepId/nodes` | Attach node to step |
| 4 | GET | `/api/workflows/:wfId/steps/:stepId/nodes` | List nodes on a step |
| 5 | GET | `/api/workflows/:wfId/steps/:stepId/nodes/:instanceId` | Get single node instance |
| 6 | PUT | `/api/workflows/:wfId/steps/:stepId/nodes/:instanceId` | Update full config + mappings |
| 7 | PATCH | `/api/workflows/:wfId/steps/:stepId/nodes/:instanceId/mappings` | Update I/O mappings only |
| 8 | DELETE | `/api/workflows/:wfId/steps/:stepId/nodes/:instanceId` | Remove node from step |
| 9 | GET | `/api/workflows/:wfId/node-configs` | All node configs for workflow |

### Each endpoint includes:
- **Headers** (Content-Type, Authorization)
- **Request body** — full JSON with all fields
- **Response body** — full JSON with realistic sample data
- **Status codes** — 200/201/400/404/409/500 with error response examples
- **curl example**

## Per-Node Config Examples
For each of the 5 nodes (Email Fetcher, Chunk Extractor, AI Processor, Column Extractor, Email Notification):
- Complete request body with all config fields populated
- Runtime output JSON that Camunda worker produces
- I/O mapping example showing how to chain to next node

## MongoDB Data Model (with full JSON)
Two collections with complete schemas and sample documents:

**`nodeDefinitions`** — static registry
```json
{
  "_id": "email-fetcher",
  "name": "Email Fetcher",
  "topic": "email-fetcher-fetch",
  "category": "communication",
  "configFields": [...],
  "inputs": [],
  "outputs": [...]
}
```

**`nodeInstanceConfigs`** — runtime per workflow+step
```json
{
  "_id": "uuid",
  "workflowId": "uuid",
  "stepId": "step-1",
  "nodeId": "email-fetcher",
  "nodeType": "email-fetcher",
  "config": { "emailId": "user@co.com", ... },
  "inputMappings": [...],
  "outputMappings": [...]
}
```

Including `$jsonSchema` validators, `createIndex()` commands, and design rationale.

## Variable Chaining Section
End-to-end example showing request/response for a 5-node chain:
Email Fetcher → Chunk Extractor → AI Processor → Column Extractor → Email Notification

## Error Response Contract
```json
{
  "error": "Node not found",
  "code": "NODE_NOT_FOUND",
  "field": "nodeId",
  "details": {}
}
```

## Files to Create/Modify

| File | Change |
|------|--------|
| `src/pages/docs/AutomationNodesDocsPage.tsx` | New — full API docs page with all request/response JSON blocks, copy buttons, using `ModuleDocLayout` |
| `src/App.tsx` | Add route `/docs/automation-nodes` |
| `src/pages/TechDocsPage.tsx` | Add "Automation Nodes" to `MODULE_SUMMARIES` |

Uses existing `ModuleDocLayout` pattern with badges: `["REST API", "MongoDB", "Camunda Topics", "I/O Mapping", "Request/Response", "Variable Chaining"]`

