/**
 * RbacDocsPage — RBAC Architecture, Role Mapping, APIs & MongoDB Data Models
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

/* ─────────── constants ─────────── */

const ARCHITECTURE_DIAGRAM = `┌──────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
│  ┌──────────┐   ┌──────────────┐   ┌─────────────────────────┐  │
│  │ Okta SDK │──▸│ JWT (Bearer) │──▸│ useWorkflowRole() hook  │  │
│  └──────────┘   └──────────────┘   │ can("workflow:deploy")  │  │
│                                     └─────────────────────────┘  │
└───────────────────────────┬──────────────────────────────────────┘
                            │ Authorization: Bearer <okta_jwt>
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                        API GATEWAY / SERVER                      │
│                                                                  │
│  ┌─────────────────────┐   ┌──────────────────────────────────┐  │
│  │ 1. authMiddleware    │──▸│ 2. Verify Okta JWT (JWKS)       │  │
│  │    (every request)   │   │    Extract: sub, email, name    │  │
│  └─────────────────────┘   └──────────────┬───────────────────┘  │
│                                            ▼                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ 3. Upsert platform_users (find by okta_sub)                │  │
│  │    → Creates user record on first login                    │  │
│  │    → Updates last_login_at on subsequent logins            │  │
│  └─────────────────────────────┬───────────────────────────────┘  │
│                                ▼                                 │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ 4. requirePermission("workflow:edit_steps")                │  │
│  │    → Check is_super_admin (bypass if true)                 │  │
│  │    → Lookup workflow_user_roles(user_id, workflow_id)      │  │
│  │    → Lookup role_permissions[role].permissions              │  │
│  │    → Allow or reject (403)                                 │  │
│  └─────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                      MONGODB ATLAS                               │
│  ┌──────────────┐  ┌─────────────────────┐  ┌────────────────┐  │
│  │platform_users│  │workflow_user_roles   │  │role_permissions│  │
│  └──────────────┘  └─────────────────────┘  └────────────────┘  │
└──────────────────────────────────────────────────────────────────┘`;

const AUTH_FLOW = `1. User opens platform
2. Okta SDK redirects to Okta login (if no session)
3. User authenticates → Okta returns JWT (id_token + access_token)
4. Client stores JWT and sends with every API request
5. API authMiddleware:
   a. Extracts Bearer token from Authorization header
   b. Verifies JWT signature using Okta JWKS endpoint
   c. Validates claims: iss, aud, exp, iat
   d. Extracts: sub (unique user ID), email, preferred_username
   e. Upserts platform_users record (find by okta_sub)
      - If not found → INSERT (first login provisioning)
      - If found → UPDATE last_login_at
   f. Attaches user object to request context (req.user)
6. Subsequent middleware (requirePermission) uses req.user for authorization`;

const ROLE_MAPPING_FLOW = `┌─────────────────────────────────────────────────────────────┐
│                   ROLE MAPPING FLOW                          │
│                                                              │
│  Okta JWT                                                    │
│  ┌─────────────────────────────────────┐                     │
│  │ { sub: "00u1abc...",                │                     │
│  │   email: "john@co.com",            │                     │
│  │   name: "John Doe" }               │                     │
│  └──────────────────┬──────────────────┘                     │
│                     │ okta_sub                               │
│                     ▼                                        │
│  platform_users                                              │
│  ┌─────────────────────────────────────┐                     │
│  │ { _id: ObjectId("usr_001"),         │                     │
│  │   okta_sub: "00u1abc...",           │  ◀── Linked by     │
│  │   email: "john@co.com",            │      okta_sub       │
│  │   is_super_admin: false }           │                     │
│  └──────────────────┬──────────────────┘                     │
│                     │ _id (user_id)                          │
│                     ▼                                        │
│  workflow_user_roles (one per workflow)                       │
│  ┌─────────────────────────────────────┐                     │
│  │ { user_id: ObjectId("usr_001"),     │                     │
│  │   workflow_id: "wf_123",           │  ◀── Per-workflow   │
│  │   role: "admin" }                  │      assignment      │
│  └──────────────────┬──────────────────┘                     │
│                     │ role                                   │
│                     ▼                                        │
│  role_permissions                                            │
│  ┌─────────────────────────────────────┐                     │
│  │ { role: "admin",                   │                     │
│  │   permissions: [                   │  ◀── Permission     │
│  │     "workflow:view",               │      lookup          │
│  │     "workflow:edit_design",        │                     │
│  │     "workflow:manage_users", ...   │                     │
│  │   ] }                              │                     │
│  └─────────────────────────────────────┘                     │
│                                                              │
│  KEY: Okta does NOT store roles. Okta only provides          │
│  identity (sub/email). All role mapping happens in           │
│  MongoDB via platform_users → workflow_user_roles →          │
│  role_permissions chain.                                     │
└─────────────────────────────────────────────────────────────┘`;

/* ─── MongoDB Schemas ─── */
const PLATFORM_USERS_SCHEMA = `// Collection: platform_users
// Purpose: Maps Okta identity to internal user record
// Created: On first login (auto-provisioned from JWT claims)
{
  "$jsonSchema": {
    "bsonType": "object",
    "required": ["okta_sub", "email", "created_at"],
    "properties": {
      "_id":            { "bsonType": "objectId" },
      "okta_sub":       { "bsonType": "string", "description": "Okta subject claim (unique)" },
      "email":          { "bsonType": "string" },
      "display_name":   { "bsonType": "string", "description": "From Okta profile or manually set" },
      "avatar_url":     { "bsonType": "string" },
      "is_super_admin": { "bsonType": "bool", "description": "Platform-wide admin bypass" },
      "is_active":      { "bsonType": "bool", "description": "Soft disable user without deleting" },
      "last_login_at":  { "bsonType": "date" },
      "created_at":     { "bsonType": "date" },
      "updated_at":     { "bsonType": "date" },
      "metadata": {
        "bsonType": "object",
        "description": "Extra Okta claims or custom fields",
        "properties": {
          "okta_groups":  { "bsonType": "array", "items": { "bsonType": "string" } },
          "department":   { "bsonType": "string" },
          "job_title":    { "bsonType": "string" }
        }
      }
    }
  }
}

// Indexes
{ "okta_sub": 1 }         // unique — primary lookup key
{ "email": 1 }            // unique — search by email
{ "is_super_admin": 1 }   // filter super admins`;

const PLATFORM_USERS_SAMPLE = `// Sample Document
{
  "_id": ObjectId("665a1b2c3d4e5f6a7b8c9d0e"),
  "okta_sub": "00u1abc2def3ghi4jkl5",
  "email": "john.doe@company.com",
  "display_name": "John Doe",
  "avatar_url": "https://company.okta.com/photos/john.jpg",
  "is_super_admin": false,
  "is_active": true,
  "last_login_at": ISODate("2026-04-07T10:30:00Z"),
  "created_at": ISODate("2026-01-15T08:00:00Z"),
  "updated_at": ISODate("2026-04-07T10:30:00Z"),
  "metadata": {
    "okta_groups": ["Engineering", "Platform-Users"],
    "department": "Engineering",
    "job_title": "Senior Developer"
  }
}`;

const WORKFLOW_USER_ROLES_SCHEMA = `// Collection: workflow_user_roles
// Purpose: Per-workflow role assignment (one doc per user-workflow pair)
// Created: Auto on workflow creation (creator=admin) + manual by admin
{
  "$jsonSchema": {
    "bsonType": "object",
    "required": ["user_id", "workflow_id", "role", "created_at"],
    "properties": {
      "_id":          { "bsonType": "objectId" },
      "user_id":      { "bsonType": "objectId", "description": "Ref: platform_users._id" },
      "workflow_id":  { "bsonType": "string", "description": "Ref: workflows.id (UUID)" },
      "role": {
        "enum": ["admin", "editor", "executor", "viewer"],
        "description": "Workflow-level role"
      },
      "assigned_by":  { "bsonType": "objectId", "description": "Ref: platform_users._id (who assigned)" },
      "assigned_at":  { "bsonType": "date" },
      "expires_at":   { "bsonType": "date", "description": "Optional: temporary access expiry" },
      "notes":        { "bsonType": "string", "description": "Why this role was assigned" },
      "created_at":   { "bsonType": "date" },
      "updated_at":   { "bsonType": "date" }
    }
  }
}

// Indexes
{ "user_id": 1, "workflow_id": 1 }   // unique compound — one role per user per workflow
{ "workflow_id": 1 }                   // list all users for a workflow
{ "user_id": 1 }                       // list all workflows for a user
{ "expires_at": 1 }                    // TTL or cleanup of expired access`;

const WORKFLOW_USER_ROLES_SAMPLE = `// Sample Document — Creator auto-assigned as admin
{
  "_id": ObjectId("665b2c3d4e5f6a7b8c9d0e1f"),
  "user_id": ObjectId("665a1b2c3d4e5f6a7b8c9d0e"),
  "workflow_id": "550e8400-e29b-41d4-a716-446655440000",
  "role": "admin",
  "assigned_by": ObjectId("665a1b2c3d4e5f6a7b8c9d0e"),
  "assigned_at": ISODate("2026-04-07T10:35:00Z"),
  "expires_at": null,
  "notes": "Auto-assigned: workflow creator",
  "created_at": ISODate("2026-04-07T10:35:00Z"),
  "updated_at": ISODate("2026-04-07T10:35:00Z")
}

// Sample Document — Admin invited an editor
{
  "_id": ObjectId("665c3d4e5f6a7b8c9d0e1f2a"),
  "user_id": ObjectId("665d4e5f6a7b8c9d0e1f2a3b"),
  "workflow_id": "550e8400-e29b-41d4-a716-446655440000",
  "role": "editor",
  "assigned_by": ObjectId("665a1b2c3d4e5f6a7b8c9d0e"),
  "assigned_at": ISODate("2026-04-07T11:00:00Z"),
  "expires_at": ISODate("2026-07-07T11:00:00Z"),
  "notes": "Temporary access for Q2 project",
  "created_at": ISODate("2026-04-07T11:00:00Z"),
  "updated_at": ISODate("2026-04-07T11:00:00Z")
}`;

const ROLE_PERMISSIONS_SCHEMA = `// Collection: role_permissions
// Purpose: Reference/seed collection — maps role to permission strings
// Created: Seeded on platform setup, rarely changes
{
  "$jsonSchema": {
    "bsonType": "object",
    "required": ["role", "permissions"],
    "properties": {
      "_id":          { "bsonType": "objectId" },
      "role":         { "enum": ["admin", "editor", "executor", "viewer"] },
      "display_name": { "bsonType": "string" },
      "description":  { "bsonType": "string" },
      "permissions": {
        "bsonType": "array",
        "items": { "bsonType": "string" },
        "description": "List of permission strings"
      },
      "is_default":   { "bsonType": "bool", "description": "Default role for new invites" },
      "priority":     { "bsonType": "int", "description": "Role hierarchy (higher = more access)" }
    }
  }
}

// Index
{ "role": 1 }   // unique — primary lookup`;

const ROLE_PERMISSIONS_SEED = `// Seed Data — All 4 roles with full permission sets

// Admin — Full workflow control
{
  "role": "admin",
  "display_name": "Admin",
  "description": "Full control over workflow design, deployment, and team management",
  "priority": 100,
  "is_default": false,
  "permissions": [
    "workflow:view",
    "workflow:edit_design",
    "workflow:edit_steps",
    "workflow:edit_forms",
    "workflow:edit_data_model",
    "workflow:edit_business_rules",
    "workflow:edit_personas",
    "workflow:deploy",
    "workflow:execute",
    "workflow:manage_users",
    "workflow:delete",
    "workflow:export_bpmn",
    "workflow:view_audit_log",
    "workflow:manage_settings"
  ]
}

// Editor — Design & build, no deploy/manage
{
  "role": "editor",
  "display_name": "Editor",
  "description": "Can modify workflow design, steps, forms, and data models",
  "priority": 75,
  "is_default": false,
  "permissions": [
    "workflow:view",
    "workflow:edit_design",
    "workflow:edit_steps",
    "workflow:edit_forms",
    "workflow:edit_data_model",
    "workflow:edit_business_rules",
    "workflow:edit_personas",
    "workflow:export_bpmn",
    "workflow:view_audit_log"
  ]
}

// Executor — Run & monitor
{
  "role": "executor",
  "display_name": "Executor",
  "description": "Can trigger workflow runs and monitor execution",
  "priority": 50,
  "is_default": false,
  "permissions": [
    "workflow:view",
    "workflow:execute",
    "workflow:export_bpmn",
    "workflow:view_audit_log"
  ]
}

// Viewer — Read-only
{
  "role": "viewer",
  "display_name": "Viewer",
  "description": "Read-only access to workflow design and status",
  "priority": 25,
  "is_default": true,
  "permissions": [
    "workflow:view",
    "workflow:export_bpmn"
  ]
}`;

const AUDIT_LOG_SCHEMA = `// Collection: rbac_audit_log
// Purpose: Track all role changes, user additions, permission checks
// Immutable — append-only, never update or delete
{
  "$jsonSchema": {
    "bsonType": "object",
    "required": ["action", "actor_id", "timestamp"],
    "properties": {
      "_id":          { "bsonType": "objectId" },
      "action": {
        "enum": [
          "user_provisioned",
          "role_assigned",
          "role_changed",
          "role_revoked",
          "super_admin_granted",
          "super_admin_revoked",
          "permission_denied",
          "workflow_created",
          "user_deactivated",
          "user_reactivated"
        ]
      },
      "actor_id":     { "bsonType": "objectId", "description": "Who performed the action" },
      "target_user_id": { "bsonType": "objectId", "description": "User affected" },
      "workflow_id":  { "bsonType": "string", "description": "Workflow context (if applicable)" },
      "old_value":    { "bsonType": "string", "description": "Previous role/state" },
      "new_value":    { "bsonType": "string", "description": "New role/state" },
      "ip_address":   { "bsonType": "string" },
      "user_agent":   { "bsonType": "string" },
      "timestamp":    { "bsonType": "date" },
      "metadata":     { "bsonType": "object" }
    }
  }
}

// Indexes
{ "actor_id": 1, "timestamp": -1 }      // actions by user
{ "target_user_id": 1, "timestamp": -1 } // actions on user
{ "workflow_id": 1, "timestamp": -1 }    // actions on workflow
{ "action": 1, "timestamp": -1 }         // filter by action type
{ "timestamp": 1, "expireAfterSeconds": 31536000 }  // TTL: 1 year retention`;

const AUDIT_LOG_SAMPLE = `// Sample: Auto-assignment on workflow creation
{
  "_id": ObjectId("665e5f6a7b8c9d0e1f2a3b4c"),
  "action": "role_assigned",
  "actor_id": ObjectId("665a1b2c3d4e5f6a7b8c9d0e"),
  "target_user_id": ObjectId("665a1b2c3d4e5f6a7b8c9d0e"),
  "workflow_id": "550e8400-e29b-41d4-a716-446655440000",
  "old_value": null,
  "new_value": "admin",
  "ip_address": "10.0.1.42",
  "user_agent": "Mozilla/5.0...",
  "timestamp": ISODate("2026-04-07T10:35:00Z"),
  "metadata": {
    "reason": "auto_assign_creator",
    "trigger": "workflow_creation"
  }
}

// Sample: Permission denied
{
  "_id": ObjectId("665f6a7b8c9d0e1f2a3b4c5d"),
  "action": "permission_denied",
  "actor_id": ObjectId("665d4e5f6a7b8c9d0e1f2a3b"),
  "target_user_id": null,
  "workflow_id": "550e8400-e29b-41d4-a716-446655440000",
  "old_value": null,
  "new_value": "workflow:deploy",
  "ip_address": "10.0.1.55",
  "timestamp": ISODate("2026-04-07T12:15:00Z"),
  "metadata": {
    "current_role": "editor",
    "endpoint": "PUT /api/workflows/:id/deploy",
    "http_status": 403
  }
}`;

/* ─── API Contracts ─── */

const API_AUTH_MIDDLEWARE = `// authMiddleware.js — Runs on EVERY request
// Verifies Okta JWT and provisions/resolves platform user

const OktaJwtVerifier = require("@okta/jwt-verifier");

const verifier = new OktaJwtVerifier({
  issuer: process.env.OKTA_ISSUER,        // https://company.okta.com/oauth2/default
  clientId: process.env.OKTA_CLIENT_ID,
  assertClaims: {
    aud: process.env.OKTA_AUDIENCE          // api://default or custom
  }
});

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing authorization header" });
  }

  try {
    // Step 1: Verify JWT with Okta JWKS
    const token = authHeader.split("Bearer ")[1];
    const jwt = await verifier.verifyAccessToken(token, process.env.OKTA_AUDIENCE);

    // Step 2: Upsert platform_users (auto-provision on first login)
    const user = await db.collection("platform_users").findOneAndUpdate(
      { okta_sub: jwt.claims.sub },
      {
        $set: {
          email: jwt.claims.email || jwt.claims.preferred_username,
          display_name: jwt.claims.name || "",
          last_login_at: new Date(),
          updated_at: new Date()
        },
        $setOnInsert: {
          okta_sub: jwt.claims.sub,
          is_super_admin: false,
          is_active: true,
          created_at: new Date(),
          metadata: {
            okta_groups: jwt.claims.groups || []
          }
        }
      },
      { upsert: true, returnDocument: "after" }
    );

    // Step 3: Check if user is active
    if (!user.is_active) {
      return res.status(403).json({ error: "Account deactivated" });
    }

    // Step 4: Attach to request
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}`;

const API_PERMISSION_MIDDLEWARE = `// requirePermission.js — Workflow-level authorization
// Checks if user has specific permission on a workflow

function requirePermission(permission) {
  return async (req, res, next) => {
    // Super admin bypasses all checks
    if (req.user.is_super_admin) {
      return next();
    }

    // Extract workflow_id from route params or body
    const workflowId = req.params.workflowId 
      || req.params.id 
      || req.body.workflow_id;

    if (!workflowId) {
      return res.status(400).json({ error: "workflow_id required" });
    }

    // Lookup user's role for this workflow
    const roleDoc = await db.collection("workflow_user_roles").findOne({
      user_id: req.user._id,
      workflow_id: workflowId
    });

    if (!roleDoc) {
      // Log denial
      await logAudit("permission_denied", req, { permission, reason: "no_role" });
      return res.status(403).json({ error: "No access to this workflow" });
    }

    // Check expiry if set
    if (roleDoc.expires_at && new Date() > roleDoc.expires_at) {
      await logAudit("permission_denied", req, { permission, reason: "expired" });
      return res.status(403).json({ error: "Access expired" });
    }

    // Lookup permissions for this role
    const permDoc = await db.collection("role_permissions").findOne({ 
      role: roleDoc.role 
    });

    if (!permDoc?.permissions?.includes(permission)) {
      await logAudit("permission_denied", req, {
        permission,
        current_role: roleDoc.role,
        reason: "insufficient_permission"
      });
      return res.status(403).json({
        error: "Insufficient permissions",
        required: permission,
        current_role: roleDoc.role
      });
    }

    // Attach role info to request for downstream use
    req.workflowRole = roleDoc.role;
    req.workflowPermissions = permDoc.permissions;
    next();
  };
}`;

/* ─── REST APIs ─── */

const API_USER_PROVISION = `// POST /api/auth/callback
// Called after Okta redirect — provisions user if needed
// NOTE: This happens automatically in authMiddleware.
//       This explicit endpoint is for the frontend to call
//       to get the user profile after login.

// Request: None (uses JWT from Authorization header)

// Response 200:
{
  "user": {
    "_id": "665a1b2c3d4e5f6a7b8c9d0e",
    "email": "john@company.com",
    "display_name": "John Doe",
    "is_super_admin": false,
    "is_active": true,
    "workflows": [
      {
        "workflow_id": "550e8400-e29b-41d4-a716-446655440000",
        "workflow_name": "Invoice Processing",
        "role": "admin"
      },
      {
        "workflow_id": "660f9500-f39c-52e5-b827-557766551111",
        "workflow_name": "Employee Onboarding",
        "role": "viewer"
      }
    ]
  }
}`;

const API_WORKFLOW_CREATE = `// POST /api/workflows
// Creates workflow + auto-assigns creator as admin
// Auth: authMiddleware (any authenticated user)

// Request:
{
  "name": "Invoice Processing Workflow",
  "type": "automation",
  "bpmn_template": null
}

// Response 201:
{
  "workflow": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Invoice Processing Workflow",
    "type": "automation",
    "owner": "665a1b2c3d4e5f6a7b8c9d0e",
    "status": "draft",
    "created_at": "2026-04-07T10:35:00Z"
  },
  "role_assignment": {
    "user_id": "665a1b2c3d4e5f6a7b8c9d0e",
    "workflow_id": "550e8400-e29b-41d4-a716-446655440000",
    "role": "admin",
    "auto_assigned": true
  }
}

// Server-side logic:
// 1. Insert workflow into DB
// 2. Insert workflow_user_roles { user_id, workflow_id, role: "admin" }
// 3. Insert rbac_audit_log { action: "role_assigned", ... }`;

const API_GET_MY_ROLE = `// GET /api/workflows/:workflowId/my-role
// Returns current user's role + permissions for a specific workflow
// Auth: authMiddleware

// Response 200:
{
  "workflow_id": "550e8400-e29b-41d4-a716-446655440000",
  "role": "admin",
  "permissions": [
    "workflow:view",
    "workflow:edit_design",
    "workflow:edit_steps",
    "workflow:edit_forms",
    "workflow:edit_data_model",
    "workflow:edit_business_rules",
    "workflow:edit_personas",
    "workflow:deploy",
    "workflow:execute",
    "workflow:manage_users",
    "workflow:delete",
    "workflow:export_bpmn",
    "workflow:view_audit_log",
    "workflow:manage_settings"
  ],
  "expires_at": null,
  "is_super_admin": false
}

// Response 403 (no access):
{
  "error": "No access to this workflow"
}`;

const API_LIST_WORKFLOW_MEMBERS = `// GET /api/workflows/:workflowId/members
// Lists all users with roles on a workflow
// Auth: requirePermission("workflow:view")

// Response 200:
{
  "workflow_id": "550e8400-e29b-41d4-a716-446655440000",
  "members": [
    {
      "user_id": "665a1b2c3d4e5f6a7b8c9d0e",
      "email": "john@company.com",
      "display_name": "John Doe",
      "role": "admin",
      "assigned_at": "2026-04-07T10:35:00Z",
      "assigned_by": null,
      "expires_at": null,
      "is_creator": true
    },
    {
      "user_id": "665d4e5f6a7b8c9d0e1f2a3b",
      "email": "jane@company.com",
      "display_name": "Jane Smith",
      "role": "editor",
      "assigned_at": "2026-04-07T11:00:00Z",
      "assigned_by": "665a1b2c3d4e5f6a7b8c9d0e",
      "expires_at": "2026-07-07T11:00:00Z",
      "is_creator": false
    }
  ],
  "total": 2
}`;

const API_ASSIGN_ROLE = `// POST /api/workflows/:workflowId/members
// Assign a user to a workflow with a specific role
// Auth: requirePermission("workflow:manage_users")

// Request:
{
  "email": "jane@company.com",
  "role": "editor",
  "expires_at": "2026-07-07T11:00:00Z",   // optional
  "notes": "Temporary access for Q2 project"  // optional
}

// Response 201:
{
  "assignment": {
    "_id": "665c3d4e5f6a7b8c9d0e1f2a",
    "user_id": "665d4e5f6a7b8c9d0e1f2a3b",
    "workflow_id": "550e8400-e29b-41d4-a716-446655440000",
    "role": "editor",
    "assigned_by": "665a1b2c3d4e5f6a7b8c9d0e",
    "expires_at": "2026-07-07T11:00:00Z"
  }
}

// Error 404 — user not found:
{ "error": "User with email jane@company.com not found on platform" }

// Error 409 — already assigned:
{ "error": "User already has role on this workflow", "current_role": "viewer" }

// Error 400 — admin cannot demote last admin:
{ "error": "Cannot remove the last admin from a workflow" }`;

const API_UPDATE_ROLE = `// PUT /api/workflows/:workflowId/members/:userId
// Change a user's role on a workflow
// Auth: requirePermission("workflow:manage_users")

// Request:
{
  "role": "admin",
  "expires_at": null,
  "notes": "Promoted to admin for full access"
}

// Response 200:
{
  "assignment": {
    "user_id": "665d4e5f6a7b8c9d0e1f2a3b",
    "workflow_id": "550e8400-e29b-41d4-a716-446655440000",
    "old_role": "editor",
    "new_role": "admin",
    "updated_at": "2026-04-07T14:00:00Z"
  }
}

// Validation Rules:
// - Cannot demote the last admin (must always have ≥1 admin)
// - Cannot change your own role (prevents accidental self-lockout)
// - Only admin can promote to admin`;

const API_REVOKE_ROLE = `// DELETE /api/workflows/:workflowId/members/:userId
// Remove a user's access from a workflow
// Auth: requirePermission("workflow:manage_users")

// Response 200:
{
  "revoked": {
    "user_id": "665d4e5f6a7b8c9d0e1f2a3b",
    "workflow_id": "550e8400-e29b-41d4-a716-446655440000",
    "previous_role": "editor",
    "revoked_by": "665a1b2c3d4e5f6a7b8c9d0e",
    "revoked_at": "2026-04-07T15:00:00Z"
  }
}

// Error 400 — cannot remove last admin:
{ "error": "Cannot remove the last admin. Transfer admin role first." }

// Error 400 — cannot remove self:
{ "error": "Cannot remove yourself. Ask another admin." }`;

const API_SEARCH_USERS = `// GET /api/users/search?q=jane&limit=10
// Search platform users by email or name (for invite autocomplete)
// Auth: authMiddleware (any authenticated user)

// Response 200:
{
  "users": [
    {
      "_id": "665d4e5f6a7b8c9d0e1f2a3b",
      "email": "jane@company.com",
      "display_name": "Jane Smith",
      "avatar_url": "https://..."
    },
    {
      "_id": "665e5f6a7b8c9d0e1f2a3b4c",
      "email": "janet@company.com",
      "display_name": "Janet Williams",
      "avatar_url": null
    }
  ],
  "total": 2
}`;

const API_MY_WORKFLOWS = `// GET /api/workflows/my-workflows
// Returns all workflows where the user has a role
// Auth: authMiddleware
// Super admin: returns ALL workflows

// Response 200:
{
  "workflows": [
    {
      "workflow_id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Invoice Processing",
      "type": "automation",
      "status": "active",
      "my_role": "admin",
      "member_count": 5,
      "created_at": "2026-04-07T10:35:00Z"
    },
    {
      "workflow_id": "660f9500-f39c-52e5-b827-557766551111",
      "name": "Employee Onboarding",
      "type": "case_management",
      "status": "draft",
      "my_role": "viewer",
      "member_count": 3,
      "created_at": "2026-04-05T09:00:00Z"
    }
  ],
  "total": 2
}`;

const API_SUPER_ADMIN = `// ── Super Admin APIs ──
// All require: is_super_admin = true (checked in middleware)

// GET /api/admin/users?page=1&limit=20&search=john
// List all platform users
// Response 200:
{
  "users": [
    {
      "_id": "665a1b2c3d4e5f6a7b8c9d0e",
      "email": "john@company.com",
      "display_name": "John Doe",
      "is_super_admin": false,
      "is_active": true,
      "workflow_count": 5,
      "last_login_at": "2026-04-07T10:30:00Z"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}

// PUT /api/admin/users/:userId/super-admin
// Grant or revoke super admin
// Request:
{ "is_super_admin": true }
// Response 200:
{ "user_id": "...", "is_super_admin": true, "updated_at": "..." }

// PUT /api/admin/users/:userId/status
// Activate or deactivate a user
// Request:
{ "is_active": false, "reason": "Left the company" }
// Response 200:
{ "user_id": "...", "is_active": false, "updated_at": "..." }

// GET /api/admin/audit-log?workflow_id=...&user_id=...&action=...&page=1
// Query audit log with filters
// Response 200:
{
  "entries": [
    {
      "action": "role_assigned",
      "actor": { "email": "john@co.com", "display_name": "John Doe" },
      "target_user": { "email": "jane@co.com", "display_name": "Jane Smith" },
      "workflow_id": "550e8400...",
      "old_value": null,
      "new_value": "editor",
      "timestamp": "2026-04-07T11:00:00Z"
    }
  ],
  "total": 156,
  "page": 1
}`;

const UI_HOOK_CODE = `// useWorkflowRole.ts — Frontend permission hook

import { useQuery } from "@tanstack/react-query";

interface WorkflowRoleResult {
  role: "admin" | "editor" | "executor" | "viewer" | null;
  permissions: string[];
  isSuperAdmin: boolean;
  isLoading: boolean;
  can: (permission: string) => boolean;
}

export function useWorkflowRole(workflowId: string | undefined): WorkflowRoleResult {
  const { data, isLoading } = useQuery({
    queryKey: ["workflow-role", workflowId],
    queryFn: async () => {
      const res = await fetch(\`/api/workflows/\${workflowId}/my-role\`, {
        headers: { Authorization: \`Bearer \${getOktaToken()}\` }
      });
      if (res.status === 403) return { role: null, permissions: [] };
      return res.json();
    },
    enabled: !!workflowId,
    staleTime: 5 * 60 * 1000,   // Cache for 5 minutes
    retry: false
  });

  const can = (permission: string) => {
    if (data?.is_super_admin) return true;
    return data?.permissions?.includes(permission) ?? false;
  };

  return {
    role: data?.role ?? null,
    permissions: data?.permissions ?? [],
    isSuperAdmin: data?.is_super_admin ?? false,
    isLoading,
    can
  };
}

// ── Usage in components ──

function StudioToolbar({ workflowId }) {
  const { can, role, isLoading } = useWorkflowRole(workflowId);

  if (isLoading) return <Skeleton />;

  return (
    <div className="flex gap-2">
      <Badge>{role}</Badge>

      {/* Everyone sees these */}
      <Button>View Flow</Button>
      <Button>Export BPMN</Button>

      {/* Edit permissions */}
      {can("workflow:edit_design") && <Button>Edit Flow</Button>}
      {can("workflow:edit_steps") && <Button>Edit Steps</Button>}
      {can("workflow:edit_forms") && <Button>Form Builder</Button>}

      {/* Admin only */}
      {can("workflow:deploy") && <Button>Deploy</Button>}
      {can("workflow:manage_users") && <Button>Manage Team</Button>}
      {can("workflow:delete") && <Button variant="destructive">Delete</Button>}

      {/* Executor */}
      {can("workflow:execute") && <Button>Run Workflow</Button>}
    </div>
  );
}`;

const API_FLOW_SEQUENCE = `┌─────────────────────────────────────────────────────────────────────┐
│                     COMPLETE API FLOW SEQUENCE                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ── PHASE 1: Authentication & User Provisioning ──                  │
│                                                                     │
│  1. GET /api/auth/callback                                          │
│     └─▸ Verify Okta JWT → Upsert platform_users → Return profile   │
│                                                                     │
│  ── PHASE 2: Workflow Creation & Auto Role ──                       │
│                                                                     │
│  2. POST /api/workflows                                             │
│     └─▸ Create workflow                                             │
│     └─▸ AUTO: Insert workflow_user_roles (creator = admin)          │
│     └─▸ AUTO: Insert rbac_audit_log (role_assigned)                 │
│                                                                     │
│  ── PHASE 3: Accessing Workflow (Permission Check) ──               │
│                                                                     │
│  3. GET /api/workflows/:id/my-role                                  │
│     └─▸ Frontend calls on Studio mount                              │
│     └─▸ Returns role + permissions array                            │
│     └─▸ Frontend caches & uses can() for UI gating                  │
│                                                                     │
│  4. ANY /api/workflows/:id/* (edit steps, deploy, etc.)             │
│     └─▸ requirePermission("workflow:edit_steps")                    │
│     └─▸ Middleware checks role → permission lookup → allow/deny     │
│                                                                     │
│  ── PHASE 4: Team Management (Admin Only) ──                        │
│                                                                     │
│  5. GET /api/users/search?q=jane                                    │
│     └─▸ Admin searches for users to invite                          │
│                                                                     │
│  6. POST /api/workflows/:id/members                                 │
│     └─▸ Assign role to user (email + role)                          │
│     └─▸ AUTO: Insert rbac_audit_log (role_assigned)                 │
│                                                                     │
│  7. GET /api/workflows/:id/members                                  │
│     └─▸ List all members with roles                                 │
│                                                                     │
│  8. PUT /api/workflows/:id/members/:userId                          │
│     └─▸ Change user's role (e.g., editor → admin)                   │
│     └─▸ AUTO: Insert rbac_audit_log (role_changed)                  │
│                                                                     │
│  9. DELETE /api/workflows/:id/members/:userId                       │
│     └─▸ Revoke access                                               │
│     └─▸ AUTO: Insert rbac_audit_log (role_revoked)                  │
│                                                                     │
│  ── PHASE 5: My Workflows (Dashboard) ──                            │
│                                                                     │
│  10. GET /api/workflows/my-workflows                                │
│      └─▸ Return workflows where user has any role                   │
│      └─▸ Each item includes my_role for UI badge                    │
│                                                                     │
│  ── PHASE 6: Super Admin Operations ──                              │
│                                                                     │
│  11. GET /api/admin/users                                           │
│  12. PUT /api/admin/users/:id/super-admin                           │
│  13. PUT /api/admin/users/:id/status                                │
│  14. GET /api/admin/audit-log                                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘`;

const SECURITY_CONSIDERATIONS = `Security Design Principles:

1. NEVER TRUST THE FRONTEND
   - UI permission gating (can()) is cosmetic only
   - Every API endpoint MUST check permissions via middleware
   - Never send role/permission data that could be tampered with

2. JWT VALIDATION
   - Always verify JWT signature using Okta JWKS (rotated keys)
   - Validate: iss, aud, exp, iat, nbf claims
   - Reject tokens within clock skew tolerance (default 5 min)
   - Never decode JWT without verification

3. ROLE ESCALATION PREVENTION
   - Only admin can assign admin role
   - Cannot change your own role (prevents self-escalation)
   - Cannot remove the last admin (prevents lockout)
   - role_permissions is read-only at API level (seed data only)

4. AUDIT EVERYTHING
   - Every role change → rbac_audit_log
   - Every permission denial → rbac_audit_log
   - Include IP address and user agent
   - Immutable: never update or delete audit entries
   - TTL index for retention policy (e.g., 1 year)

5. TOKEN CACHING
   - Cache role lookups for 5 minutes (staleTime in react-query)
   - Invalidate cache on role change events
   - Consider WebSocket for real-time role revocation

6. OKTA ↔ MONGODB SYNC
   - Okta provides IDENTITY only (sub, email, name)
   - MongoDB provides AUTHORIZATION (roles, permissions)
   - No roles stored in Okta — clean separation
   - User deactivated in Okta → JWT stops being valid
   - User deactivated in MongoDB → is_active check in middleware`;

export default function RbacDocsPage() {
  return (
    <ModuleDocLayout
      title="RBAC — Role-Based Access Control"
      subtitle="Complete architecture for Okta-authenticated, MongoDB-backed role and permission management with per-workflow access control, auto-provisioning, and audit logging."
      badges={["Okta JWT", "MongoDB Atlas", "Per-Workflow Roles", "Permission Middleware", "Audit Log", "REST API"]}
    >
      {/* ── Architecture Overview ── */}
      <section className="space-y-4">
        <h3 className="text-base font-bold text-foreground">Architecture Overview</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          The RBAC system uses a three-layer design: <strong>Okta</strong> handles identity & authentication (JWT),
          <strong> MongoDB Atlas</strong> stores role assignments & permissions, and the <strong>API middleware</strong> enforces
          access control on every request. Okta does NOT store any role information — it only provides the user's identity
          (sub, email, name). All authorization decisions happen in MongoDB.
        </p>
        <CopyBlock code={ARCHITECTURE_DIAGRAM} label="System Architecture" />
      </section>

      <Separator />

      {/* ── Auth Flow ── */}
      <section className="space-y-4">
        <h3 className="text-base font-bold text-foreground">Authentication Flow (Okta → Platform)</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Step-by-step flow from Okta login to user provisioning. The key insight is that <strong>user provisioning
          happens automatically</strong> — the first time a valid Okta JWT hits the API, a platform_users record is created.
        </p>
        <CopyBlock code={AUTH_FLOW} label="Auth Flow Steps" />
      </section>

      <Separator />

      {/* ── Role Mapping ── */}
      <section className="space-y-4">
        <h3 className="text-base font-bold text-foreground">How Roles Map to Users (Okta JWT → MongoDB)</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          This is the critical design decision: <strong>Okta provides identity, MongoDB provides authorization</strong>.
          The mapping chain is: JWT <code>sub</code> → <code>platform_users.okta_sub</code> → <code>workflow_user_roles.user_id</code> → <code>role_permissions.role</code>.
        </p>
        <CopyBlock code={ROLE_MAPPING_FLOW} label="Role Mapping Chain" />
      </section>

      <Separator />

      {/* ── Roles & Permissions Matrix ── */}
      <section className="space-y-4">
        <h3 className="text-base font-bold text-foreground">Roles & Permissions Matrix</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] border border-border rounded-lg">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left p-2 border-b border-border font-semibold">Permission</th>
                <th className="text-center p-2 border-b border-border font-semibold">Admin</th>
                <th className="text-center p-2 border-b border-border font-semibold">Editor</th>
                <th className="text-center p-2 border-b border-border font-semibold">Executor</th>
                <th className="text-center p-2 border-b border-border font-semibold">Viewer</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["workflow:view", true, true, true, true],
                ["workflow:edit_design", true, true, false, false],
                ["workflow:edit_steps", true, true, false, false],
                ["workflow:edit_forms", true, true, false, false],
                ["workflow:edit_data_model", true, true, false, false],
                ["workflow:edit_business_rules", true, true, false, false],
                ["workflow:edit_personas", true, true, false, false],
                ["workflow:deploy", true, false, false, false],
                ["workflow:execute", true, false, true, false],
                ["workflow:manage_users", true, false, false, false],
                ["workflow:delete", true, false, false, false],
                ["workflow:export_bpmn", true, true, true, true],
                ["workflow:view_audit_log", true, true, true, false],
                ["workflow:manage_settings", true, false, false, false],
              ].map(([perm, admin, editor, executor, viewer]) => (
                <tr key={String(perm)} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="p-2 font-mono text-foreground">{String(perm)}</td>
                  <td className="text-center p-2">{admin ? "✅" : "❌"}</td>
                  <td className="text-center p-2">{editor ? "✅" : "❌"}</td>
                  <td className="text-center p-2">{executor ? "✅" : "❌"}</td>
                  <td className="text-center p-2">{viewer ? "✅" : "❌"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="text-[10px]">Platform Role: super_admin — bypasses all workflow checks</Badge>
          <Badge variant="secondary" className="text-[10px]">Platform Role: user (default) — can create workflows, auto-assigned admin</Badge>
        </div>
      </section>

      <Separator />

      {/* ── MongoDB Data Models ── */}
      <section className="space-y-6">
        <h3 className="text-base font-bold text-foreground">MongoDB Collections & Data Models</h3>

        <DocCard>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2">
            <Badge variant="outline" className="text-[9px]">Collection</Badge> platform_users
          </CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">Auto-provisioned from Okta JWT on first login. Maps external identity to internal user record.</p>
            <CopyBlock code={PLATFORM_USERS_SCHEMA} label="$jsonSchema + Indexes" />
            <CopyBlock code={PLATFORM_USERS_SAMPLE} label="Sample Document" />
          </CardContent>
        </DocCard>

        <DocCard>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2">
            <Badge variant="outline" className="text-[9px]">Collection</Badge> workflow_user_roles
          </CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">One document per user-workflow pair. Auto-created for workflow creator, manually managed by admins.</p>
            <CopyBlock code={WORKFLOW_USER_ROLES_SCHEMA} label="$jsonSchema + Indexes" />
            <CopyBlock code={WORKFLOW_USER_ROLES_SAMPLE} label="Sample Documents" />
          </CardContent>
        </DocCard>

        <DocCard>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2">
            <Badge variant="outline" className="text-[9px]">Collection</Badge> role_permissions
          </CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">Reference/seed collection — maps role names to permission string arrays. Rarely changes after initial setup.</p>
            <CopyBlock code={ROLE_PERMISSIONS_SCHEMA} label="$jsonSchema + Index" />
            <CopyBlock code={ROLE_PERMISSIONS_SEED} label="Seed Data — All 4 Roles" />
          </CardContent>
        </DocCard>

        <DocCard>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2">
            <Badge variant="outline" className="text-[9px]">Collection</Badge> rbac_audit_log
          </CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">Append-only audit trail for all role changes, user provisioning, and permission denials. TTL index for retention.</p>
            <CopyBlock code={AUDIT_LOG_SCHEMA} label="$jsonSchema + Indexes" />
            <CopyBlock code={AUDIT_LOG_SAMPLE} label="Sample Documents" />
          </CardContent>
        </DocCard>
      </section>

      <Separator />

      {/* ── Middleware ── */}
      <section className="space-y-6">
        <h3 className="text-base font-bold text-foreground">API Middleware — Auth & Permission Enforcement</h3>

        <DocCard>
          <CardHeader><CardTitle className="text-sm">authMiddleware — JWT Verification + User Provisioning</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">Runs on every request. Verifies Okta JWT, auto-provisions user on first login, attaches user to request context.</p>
            <CopyBlock code={API_AUTH_MIDDLEWARE} label="authMiddleware.js" />
          </CardContent>
        </DocCard>

        <DocCard>
          <CardHeader><CardTitle className="text-sm">requirePermission — Workflow-Level Authorization</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">Checks user's role on specific workflow, validates permission, logs denials to audit log.</p>
            <CopyBlock code={API_PERMISSION_MIDDLEWARE} label="requirePermission.js" />
          </CardContent>
        </DocCard>
      </section>

      <Separator />

      {/* ── API Flow Sequence ── */}
      <section className="space-y-4">
        <h3 className="text-base font-bold text-foreground">Complete API Flow Sequence</h3>
        <p className="text-sm text-muted-foreground">End-to-end sequence showing when each API is called during the user journey.</p>
        <CopyBlock code={API_FLOW_SEQUENCE} label="API Call Sequence" />
      </section>

      <Separator />

      {/* ── REST API Contracts ── */}
      <section className="space-y-6">
        <h3 className="text-base font-bold text-foreground">REST API Contracts — Request & Response</h3>

        <DocCard>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2">
            <Badge className="text-[9px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20">GET</Badge>
            /api/auth/callback — User Provisioning
          </CardTitle></CardHeader>
          <CardContent><CopyBlock code={API_USER_PROVISION} /></CardContent>
        </DocCard>

        <DocCard>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2">
            <Badge className="text-[9px] bg-amber-500/10 text-amber-500 border-amber-500/20">POST</Badge>
            /api/workflows — Create Workflow + Auto Role
          </CardTitle></CardHeader>
          <CardContent><CopyBlock code={API_WORKFLOW_CREATE} /></CardContent>
        </DocCard>

        <DocCard>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2">
            <Badge className="text-[9px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20">GET</Badge>
            /api/workflows/:workflowId/my-role — Get My Permissions
          </CardTitle></CardHeader>
          <CardContent><CopyBlock code={API_GET_MY_ROLE} /></CardContent>
        </DocCard>

        <DocCard>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2">
            <Badge className="text-[9px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20">GET</Badge>
            /api/workflows/:workflowId/members — List Members
          </CardTitle></CardHeader>
          <CardContent><CopyBlock code={API_LIST_WORKFLOW_MEMBERS} /></CardContent>
        </DocCard>

        <DocCard>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2">
            <Badge className="text-[9px] bg-amber-500/10 text-amber-500 border-amber-500/20">POST</Badge>
            /api/workflows/:workflowId/members — Assign Role
          </CardTitle></CardHeader>
          <CardContent><CopyBlock code={API_ASSIGN_ROLE} /></CardContent>
        </DocCard>

        <DocCard>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2">
            <Badge className="text-[9px] bg-blue-500/10 text-blue-500 border-blue-500/20">PUT</Badge>
            /api/workflows/:workflowId/members/:userId — Update Role
          </CardTitle></CardHeader>
          <CardContent><CopyBlock code={API_UPDATE_ROLE} /></CardContent>
        </DocCard>

        <DocCard>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2">
            <Badge className="text-[9px] bg-red-500/10 text-red-500 border-red-500/20">DELETE</Badge>
            /api/workflows/:workflowId/members/:userId — Revoke Access
          </CardTitle></CardHeader>
          <CardContent><CopyBlock code={API_REVOKE_ROLE} /></CardContent>
        </DocCard>

        <DocCard>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2">
            <Badge className="text-[9px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20">GET</Badge>
            /api/users/search — Search Users (Invite Autocomplete)
          </CardTitle></CardHeader>
          <CardContent><CopyBlock code={API_SEARCH_USERS} /></CardContent>
        </DocCard>

        <DocCard>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2">
            <Badge className="text-[9px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20">GET</Badge>
            /api/workflows/my-workflows — My Workflow List
          </CardTitle></CardHeader>
          <CardContent><CopyBlock code={API_MY_WORKFLOWS} /></CardContent>
        </DocCard>

        <DocCard>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2">
            <Badge className="text-[9px] bg-purple-500/10 text-purple-500 border-purple-500/20">ADMIN</Badge>
            Super Admin APIs — User & Audit Management
          </CardTitle></CardHeader>
          <CardContent><CopyBlock code={API_SUPER_ADMIN} /></CardContent>
        </DocCard>
      </section>

      <Separator />

      {/* ── UI Enforcement ── */}
      <section className="space-y-4">
        <h3 className="text-base font-bold text-foreground">UI-Level Permission Enforcement</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          The frontend uses a <code>useWorkflowRole</code> hook to fetch the user's role and permissions for the current workflow.
          The <code>can(permission)</code> helper conditionally renders UI elements. <strong>This is cosmetic only</strong> —
          the real enforcement happens in API middleware.
        </p>
        <CopyBlock code={UI_HOOK_CODE} label="useWorkflowRole Hook + Component Usage" />
      </section>

      <Separator />

      {/* ── Security ── */}
      <section className="space-y-4">
        <h3 className="text-base font-bold text-foreground">Security Considerations</h3>
        <CopyBlock code={SECURITY_CONSIDERATIONS} label="Security Design Principles" />
      </section>

      <Separator />

      {/* ── Gaps / Future ── */}
      <section className="space-y-4">
        <h3 className="text-base font-bold text-foreground">Identified Gaps & Future Enhancements</h3>
        <div className="space-y-3">
          {[
            { title: "Email Invitation Flow", desc: "Currently users must exist on the platform (have logged in via Okta at least once) before they can be added to a workflow. Future: send invite emails to users who haven't logged in yet, with pending_invitations collection.", status: "gap" },
            { title: "Real-time Role Revocation", desc: "Currently roles are cached for 5 minutes. If an admin revokes access, the user can still act for up to 5 minutes. Future: WebSocket push to invalidate cache instantly.", status: "gap" },
            { title: "Custom Roles", desc: "Currently 4 fixed roles. Future: allow admins to create custom roles with specific permission sets per workflow.", status: "future" },
            { title: "Bulk Role Operations", desc: "No API for bulk assigning roles (e.g., 'add entire team'). Future: POST /api/workflows/:id/members/bulk.", status: "future" },
            { title: "Role Inheritance", desc: "No hierarchy (admin doesn't auto-inherit editor permissions — they're listed explicitly). Trade-off: explicit is safer but more to maintain.", status: "design-decision" },
            { title: "Okta Group → Role Sync", desc: "Could auto-assign roles based on Okta groups (e.g., 'Engineering' group → editor on all workflows). Not implemented — requires Okta admin config.", status: "future" },
            { title: "API Rate Limiting", desc: "No rate limiting on role management APIs. Should add to prevent abuse.", status: "gap" },
            { title: "Session Invalidation", desc: "If user is deactivated, existing JWTs remain valid until expiry. Could add a token blacklist or reduce JWT expiry time.", status: "gap" },
          ].map((item) => (
            <div key={item.title} className="rounded-lg border border-border p-3 bg-card">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-foreground">{item.title}</span>
                <Badge variant={item.status === "gap" ? "destructive" : "secondary"} className="text-[9px]">
                  {item.status === "gap" ? "Gap" : item.status === "future" ? "Future" : "Design Decision"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </ModuleDocLayout>
  );
}
