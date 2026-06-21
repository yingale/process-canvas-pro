/**
 * Permission catalog — must stay in sync with the seed in the auth migration.
 * Single source of truth for the role editor UI.
 */
export interface CatalogEntry {
  key: string;
  resource: string;
  action: string;
  description: string;
  group: string;
}

export const PERMISSION_CATALOG: CatalogEntry[] = [
  // Navigation
  { key: "navigation.view.dashboard",      resource: "navigation", action: "view.dashboard",      description: "View Dashboard",          group: "Navigation" },
  { key: "navigation.view.workflowStudio", resource: "navigation", action: "view.workflowStudio", description: "View Workflow Studio",    group: "Navigation" },
  { key: "navigation.view.templates",      resource: "navigation", action: "view.templates",      description: "View Templates",          group: "Navigation" },
  { key: "navigation.view.instances",      resource: "navigation", action: "view.instances",      description: "View Workflow Instances", group: "Navigation" },
  { key: "navigation.view.audit",          resource: "navigation", action: "view.audit",          description: "View Audit Log",          group: "Navigation" },
  { key: "navigation.view.admin",          resource: "navigation", action: "view.admin",          description: "View Admin Section",      group: "Navigation" },
  // Workflow
  { key: "workflow.create",         resource: "workflow", action: "create",         description: "Create workflow",     group: "Workflow" },
  { key: "workflow.read",           resource: "workflow", action: "read",           description: "Read workflow",       group: "Workflow" },
  { key: "workflow.update",         resource: "workflow", action: "update",         description: "Update workflow",     group: "Workflow" },
  { key: "workflow.delete",         resource: "workflow", action: "delete",         description: "Delete workflow",     group: "Workflow" },
  { key: "workflow.clone",          resource: "workflow", action: "clone",          description: "Clone workflow",      group: "Workflow" },
  { key: "workflow.publish",        resource: "workflow", action: "publish",        description: "Publish workflow",    group: "Workflow" },
  { key: "workflow.archive",        resource: "workflow", action: "archive",        description: "Archive workflow",    group: "Workflow" },
  { key: "workflow.deploy.nonprod", resource: "workflow", action: "deploy.nonprod", description: "Deploy to non-prod",  group: "Workflow" },
  { key: "workflow.deploy.prod",    resource: "workflow", action: "deploy.prod",    description: "Deploy to prod",      group: "Workflow" },
  // Workflow Instance
  { key: "workflowInstance.read",          resource: "workflowInstance", action: "read",          description: "Read instance",          group: "Instance" },
  { key: "workflowInstance.retry",         resource: "workflowInstance", action: "retry",         description: "Retry instance",         group: "Instance" },
  { key: "workflowInstance.restart",       resource: "workflowInstance", action: "restart",       description: "Restart instance",       group: "Instance" },
  { key: "workflowInstance.cancel",        resource: "workflowInstance", action: "cancel",        description: "Cancel instance",        group: "Instance" },
  { key: "workflowInstance.forceComplete", resource: "workflowInstance", action: "forceComplete", description: "Force-complete instance", group: "Instance" },
  // Node
  { key: "node.add",     resource: "node", action: "add",     description: "Add node",     group: "Node" },
  { key: "node.edit",    resource: "node", action: "edit",    description: "Edit node",    group: "Node" },
  { key: "node.delete",  resource: "node", action: "delete",  description: "Delete node",  group: "Node" },
  { key: "node.execute", resource: "node", action: "execute", description: "Execute node", group: "Node" },
  { key: "node.read",    resource: "node", action: "read",    description: "Read node",    group: "Node" },
  // Template
  { key: "template.create",  resource: "template", action: "create",  description: "Create template",  group: "Template" },
  { key: "template.edit",    resource: "template", action: "edit",    description: "Edit template",    group: "Template" },
  { key: "template.delete",  resource: "template", action: "delete",  description: "Delete template",  group: "Template" },
  { key: "template.publish", resource: "template", action: "publish", description: "Publish template", group: "Template" },
  { key: "template.read",    resource: "template", action: "read",    description: "Read template",    group: "Template" },
  // User
  { key: "user.create",    resource: "user", action: "create",         description: "Create user",            group: "User Admin" },
  { key: "user.read",      resource: "user", action: "read",           description: "Read users",             group: "User Admin" },
  { key: "user.update",    resource: "user", action: "update",         description: "Update user",            group: "User Admin" },
  { key: "user.delete",    resource: "user", action: "delete",         description: "Delete user",            group: "User Admin" },
  { key: "persona.assign", resource: "user", action: "persona.assign", description: "Assign persona to user", group: "User Admin" },
  { key: "team.assign",    resource: "user", action: "team.assign",    description: "Assign team to user",    group: "User Admin" },
  // Team
  { key: "team.create", resource: "team", action: "create", description: "Create team", group: "Team Admin" },
  { key: "team.update", resource: "team", action: "update", description: "Update team", group: "Team Admin" },
  { key: "team.delete", resource: "team", action: "delete", description: "Delete team", group: "Team Admin" },
  { key: "team.read",   resource: "team", action: "read",   description: "Read teams",  group: "Team Admin" },
  // Persona
  { key: "persona.create", resource: "persona", action: "create", description: "Create persona", group: "Persona Admin" },
  { key: "persona.update", resource: "persona", action: "update", description: "Update persona", group: "Persona Admin" },
  { key: "persona.delete", resource: "persona", action: "delete", description: "Delete persona", group: "Persona Admin" },
  { key: "persona.read",   resource: "persona", action: "read",   description: "Read personas",  group: "Persona Admin" },
  // Role
  { key: "role.create", resource: "role", action: "create", description: "Create role", group: "Role Admin" },
  { key: "role.update", resource: "role", action: "update", description: "Update role", group: "Role Admin" },
  { key: "role.delete", resource: "role", action: "delete", description: "Delete role", group: "Role Admin" },
  { key: "role.read",   resource: "role", action: "read",   description: "Read roles",  group: "Role Admin" },
  // Policy
  { key: "policy.create", resource: "policy", action: "create", description: "Create policy", group: "Policy Admin" },
  { key: "policy.update", resource: "policy", action: "update", description: "Update policy", group: "Policy Admin" },
  { key: "policy.delete", resource: "policy", action: "delete", description: "Delete policy", group: "Policy Admin" },
  { key: "policy.read",   resource: "policy", action: "read",   description: "Read policies", group: "Policy Admin" },
  // Audit
  { key: "audit.read",   resource: "audit", action: "read",   description: "Read audit log",   group: "Audit" },
  { key: "audit.export", resource: "audit", action: "export", description: "Export audit log", group: "Audit" },
];

export const CATALOG_BY_GROUP = PERMISSION_CATALOG.reduce<Record<string, CatalogEntry[]>>((acc, p) => {
  (acc[p.group] ||= []).push(p);
  return acc;
}, {});
