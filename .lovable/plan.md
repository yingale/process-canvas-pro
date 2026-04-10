

# Add Approval Node to Automation Nodes + Example Pipeline Documentation

## What We're Building

1. A new **Approval** automation node in the nodes palette — a decision gate where a human reviewer approves or rejects AI-processed results before the pipeline continues.
2. Update the **Example Pipeline** hint in NodesPanel to show the full approval flow: Email Fetcher → Chunk Extractor → AI Processor → **Approval** → Column Extractor (approved) / Failure (rejected).
3. Update the **Automation Nodes docs page** with the new node's API spec.

## Approval Node Design

The Approval node is a **user task** (not an external task) that pauses the workflow until a human decides. It receives data from the previous step (e.g., AI-detected column names + preview rows) and outputs the decision.

**Key config fields:**
- `inputVariable` — data to present to the reviewer (e.g. `aiProcessorResult`)
- `approverRole` / `approverEmail` — who reviews
- `approvalType` — single / sequential / parallel
- `slaHours` — auto-escalate after N hours
- `escalateTo` — escalation target
- `onReject` — "terminate" | "reroute" | "return"
- `outputVariable` — result variable (approved/rejected + comments)

**Outputs:** `decision` (approved/rejected), `reviewerEmail`, `comments`, `decidedAt`

## Example Pipeline (the user's scenario)

```text
Email Fetcher → Chunk Extractor → AI Processor → Approval → Column Extractor
                                                    ↓ (rejected)
                                                  Failure / End
```

The AI Processor outputs column names + first 10 rows as a preview. The Approval node presents this to the reviewer. On "approved", the Column Extractor runs on the full dataset. On "rejected", the workflow routes to a failure/termination path.

## Files to Change

| File | Change |
|------|--------|
| `src/components/studio/automationNodes.ts` | Add new `approval` node definition with `inputSchema`, `outputSchema`, `defaultConfig`, category `"governance"` |
| `src/components/studio/NodesPanel.tsx` | Add `ShieldCheck` to icon imports, add `"governance"` to `CATEGORY_LABELS`, update example pipeline to include Approval node |
| `src/components/studio/FlowNodes.tsx` | No change needed — approval maps to existing `user` step type |
| `src/pages/docs/AutomationNodesDocsPage.tsx` | Add Approval node API spec section with the full example pipeline scenario |

## Technical Details

- **Category**: New category `"governance"` in the nodes palette
- **Icon**: `ShieldCheck` from lucide-react
- **Color**: `hsl(45 90% 48%)` (amber/gold — distinct from existing nodes)
- **Topic**: `approval-review` (Camunda user task topic for task assignment)
- **Node type in category union**: Extend the `AutomationNodeDef.category` type to include `"governance"`
- The node definition follows the exact same `inputSchema`/`outputSchema`/`defaultConfig` pattern as all other nodes

