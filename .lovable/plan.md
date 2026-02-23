

# AI-Powered BPMN Generation from Text Descriptions

## Overview

Create a new feature that lets users describe a workflow in plain English and have AI generate valid BPMN 2.0 XML, which then gets fed through the existing deterministic parser to produce a Case IR. This keeps the reliable round-trip pipeline intact while adding a creative "generate from scratch" capability.

## How It Works

1. User types a workflow description (e.g., "An invoice approval process where invoices are received, reviewed by a manager, and either approved or rejected")
2. A new edge function sends this to the AI model with a system prompt containing BPMN 2.0 XML generation instructions
3. AI returns valid Camunda-compatible BPMN XML
4. The existing `importBpmn()` parser converts it to Case IR -- no changes needed to the parser
5. The workflow appears in the studio ready for editing

## Changes

### 1. New Edge Function: `supabase/functions/generate-bpmn/index.ts`

- Accepts a `{ description: string }` body
- System prompt instructs the AI to output raw, valid BPMN 2.0 XML (Camunda namespace) with proper structure: definitions, process, start/end events, tasks, gateways, sequence flows
- Uses `google/gemini-3-flash-preview` model
- Returns `{ bpmnXml: string }` on success
- Handles 429/402 rate limit and credit errors

### 2. New UI: "Create from Description" option on Landing Page

- Add a button/card on the landing page (alongside the existing templates) labeled something like "Describe a workflow"
- Clicking it opens a dialog/modal with a text area for the description
- On submit, calls the edge function, parses the returned BPMN, and navigates to `/studio` with the generated IR

### 3. Update `supabase/config.toml`

- Register the new `generate-bpmn` function with `verify_jwt = false`

### 4. Studio Page Update

- Accept generated IR via React Router state (no URL params needed) so the studio can load AI-generated workflows the same way it loads templates

## Technical Details

### System Prompt Strategy

The AI prompt will include:
- A minimal but complete BPMN 2.0 XML template showing the expected structure
- Rules: always include `bpmn:definitions`, `bpmn:process`, `bpmn:startEvent`, `bpmn:endEvent`, and `bpmn:sequenceFlow` elements
- Camunda namespace for service tasks (`camunda:type="external"`, `camunda:topic`)
- Instructions to use subProcess with multiInstance for loops
- Instructions to use exclusiveGateway for decisions with conditionExpressions
- Output must be raw XML only, no markdown fences

### Flow

```text
Landing Page
  [Describe a workflow] button
       |
       v
  Modal with textarea
  "Describe your process..."
       |  (submit)
       v
  POST /functions/v1/generate-bpmn
  { description: "..." }
       |
       v
  AI returns BPMN XML string
       |
       v
  Client: importBpmn(xml) -> CaseIR
       |
       v
  Navigate to /studio with CaseIR in router state
```

### No Parser Changes

The existing `bpmnImporter.ts` remains untouched. All the round-trip metadata preservation (original XML, element IDs, layout, sequence flows) works automatically since the AI-generated XML goes through the same import path.

