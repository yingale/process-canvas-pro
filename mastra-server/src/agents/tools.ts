/**
 * Shared tool definitions for Mastra agents.
 * These define the JSON-schema "tools" that agents can call.
 */

export const TOOLS = {
  /** Generates a JSON Patch array to modify the Case IR */
  generatePatch: {
    name: "generate_patch",
    description: "Generate RFC 6902 JSON Patch operations to modify the workflow Case IR.",
    parameters: {
      type: "object" as const,
      properties: {
        patch: {
          type: "array",
          description: "Array of RFC 6902 JSON Patch operations",
          items: {
            type: "object",
            properties: {
              op: { type: "string", enum: ["add", "remove", "replace", "move", "copy"] },
              path: { type: "string", description: "JSON Pointer path" },
              from: { type: "string", description: "Source path for move/copy" },
              value: { description: "Value for add/replace operations" },
            },
            required: ["op", "path"],
          },
        },
        reasoning: {
          type: "string",
          description: "Brief explanation of what the patch does and why",
        },
      },
      required: ["patch", "reasoning"],
    },
  },

  /** Returns an analysis report */
  analyzeWorkflow: {
    name: "analyze_workflow",
    description: "Analyze a workflow and return findings, issues, and suggestions.",
    parameters: {
      type: "object" as const,
      properties: {
        findings: {
          type: "array",
          items: {
            type: "object",
            properties: {
              category: { type: "string", enum: ["bottleneck", "missing_step", "naming", "structure", "best_practice", "security", "performance"] },
              severity: { type: "string", enum: ["info", "warning", "critical"] },
              title: { type: "string" },
              description: { type: "string" },
              suggestion: { type: "string" },
              affectedPath: { type: "string", description: "JSON Pointer to the affected element" },
            },
            required: ["category", "severity", "title", "description"],
          },
        },
        overallScore: {
          type: "number",
          description: "Workflow quality score from 0-100",
        },
        summary: { type: "string" },
      },
      required: ["findings", "overallScore", "summary"],
    },
  },

  /** Returns a review verdict */
  reviewChanges: {
    name: "review_changes",
    description: "Review proposed JSON Patch changes for correctness and best practices.",
    parameters: {
      type: "object" as const,
      properties: {
        approved: { type: "boolean", description: "Whether the changes are approved" },
        issues: {
          type: "array",
          items: {
            type: "object",
            properties: {
              severity: { type: "string", enum: ["info", "warning", "error"] },
              message: { type: "string" },
              patchIndex: { type: "number", description: "Index of the problematic patch operation" },
            },
            required: ["severity", "message"],
          },
        },
        suggestions: {
          type: "array",
          items: { type: "string" },
          description: "Optional improvement suggestions",
        },
        revisedPatch: {
          type: "array",
          description: "If not approved, a corrected version of the patch",
          items: {
            type: "object",
            properties: {
              op: { type: "string" },
              path: { type: "string" },
              from: { type: "string" },
              value: {},
            },
            required: ["op", "path"],
          },
        },
        summary: { type: "string" },
      },
      required: ["approved", "issues", "summary"],
    },
  },
};
