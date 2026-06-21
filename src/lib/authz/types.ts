export type PermissionKey = string; // e.g. "workflow.deploy.prod"

export interface AuthzUser {
  id: string;
  email: string;
  name: string | null;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  attributes: Record<string, unknown>;
  appRoles: string[]; // platform roles ("admin", "designer", etc.)
}

export interface AuthzContextValue {
  user: AuthzUser | null;
  permissions: Set<PermissionKey>;
  personas: Array<{ id: string; name: string }>;
  teams: Array<{ id: string; name: string }>;
  roles: Array<{ id: string; name: string }>;
  loading: boolean;
  can: (perm: PermissionKey, resource?: Record<string, unknown>) => boolean;
  cannot: (perm: PermissionKey, resource?: Record<string, unknown>) => boolean;
  refresh: () => Promise<void>;
}

export interface Policy {
  id: string;
  name: string;
  effect: "ALLOW" | "DENY";
  action: string;
  resource_pattern: string | null;
  condition: Record<string, unknown>;
  priority: number;
  enabled: boolean;
}
