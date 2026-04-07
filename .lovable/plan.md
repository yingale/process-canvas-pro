

# Refactor Automation Nodes to inputSchema/outputSchema Pattern + Update Docs

## What Changes

Refactor `automationNodes.ts` from flat `configFields[]` arrays to a structured `inputSchema`/`outputSchema`/`defaultConfig` pattern matching the user's proposed schema. Update all consuming components and both documentation pages.

## 1. Refactor `automationNodes.ts` — New Interface & Data

**New interface structure:**
```text
AutomationNodeDef {
  id, name, description, icon, color, topic, category, version
  inputSchema: {                    // JSON Schema for config inputs
    type: "object",
    properties: { [key]: { type, description, enum?, default?, minimum?, maximum? } },
    required: string[]
  }
  outputSchema: {                   // JSON Schema for outputs
    type: "object", 
    properties: { [key]: { type, description, items? } }
  }
  defaultConfig: Record<string,any> // Centralized defaults
  additionalOutputs?: NodeIoField[] // Conditional/optional outputs
  configFields: ModuleConfigField[] // KEPT for backward compat (UI rendering)
}
```

Each of the 5 nodes gets `inputSchema`, `outputSchema`, `defaultConfig`, and `version` fields added alongside existing `configFields` (which the UI components already consume). This is additive — no breaking changes.

## 2. Update Consuming Components

| File | Change |
|------|--------|
| `WorkflowStudio.tsx` | Use `defaultConfig` instead of iterating `configFields` for defaults |
| `NodeConfigDialog.tsx` | Use `defaultConfig` for initial values fallback |
| `StepPropertiesPanel.tsx` | No change needed (still uses `configFields` for UI) |

## 3. Update `AutomationNodesDocsPage.tsx`

- Replace `configFields` in all API response JSON with `inputSchema`/`outputSchema`/`defaultConfig` pattern
- Update MongoDB data model section to show new schema structure
- Update per-node config examples with the new format

## 4. Update `CamundaTopicsDocsPage.tsx`

- Update worker code examples to reference `inputSchema`/`outputSchema` where node definitions are shown
- Update variable resolution examples to align with new schema property names

## Files Modified

| File | Change |
|------|--------|
| `src/components/studio/automationNodes.ts` | Add `inputSchema`, `outputSchema`, `defaultConfig`, `version` to interface and all 5 nodes |
| `src/components/studio/WorkflowStudio.tsx` | Use `defaultConfig` for initial config |
| `src/components/studio/NodeConfigDialog.tsx` | Use `defaultConfig` for fallback |
| `src/pages/docs/AutomationNodesDocsPage.tsx` | Update all API JSON to new schema format |
| `src/pages/docs/CamundaTopicsDocsPage.tsx` | Update worker examples with new schema references |

