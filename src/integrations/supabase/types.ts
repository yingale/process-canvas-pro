export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_events: {
        Row: {
          action: string
          actor_email: string | null
          actor_personas: string[]
          actor_teams: string[]
          actor_user_id: string | null
          decision: Database["public"]["Enums"]["authz_decision"] | null
          id: string
          ip: string | null
          metadata: Json
          reason: string | null
          resource_id: string | null
          resource_type: string | null
          ts: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_personas?: string[]
          actor_teams?: string[]
          actor_user_id?: string | null
          decision?: Database["public"]["Enums"]["authz_decision"] | null
          id?: string
          ip?: string | null
          metadata?: Json
          reason?: string | null
          resource_id?: string | null
          resource_type?: string | null
          ts?: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_personas?: string[]
          actor_teams?: string[]
          actor_user_id?: string | null
          decision?: Database["public"]["Enums"]["authz_decision"] | null
          id?: string
          ip?: string | null
          metadata?: Json
          reason?: string | null
          resource_id?: string | null
          resource_type?: string | null
          ts?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      node_instance_configs: {
        Row: {
          config: Json
          created_at: string
          id: string
          input_mappings: Json
          node_id: string
          node_type: string
          output_mappings: Json
          personas: Json
          step_id: string
          updated_at: string
          workflow_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          input_mappings?: Json
          node_id: string
          node_type: string
          output_mappings?: Json
          personas?: Json
          step_id: string
          updated_at?: string
          workflow_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          input_mappings?: Json
          node_id?: string
          node_type?: string
          output_mappings?: Json
          personas?: Json
          step_id?: string
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "node_instance_configs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          action: string
          created_at: string
          description: string | null
          id: string
          key: string
          resource: string
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          id?: string
          key: string
          resource: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          resource?: string
        }
        Relationships: []
      }
      persona_roles: {
        Row: {
          created_at: string
          persona_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          persona_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          persona_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "persona_roles_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "persona_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      personas: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      policies: {
        Row: {
          action: string
          condition: Json
          created_at: string
          effect: Database["public"]["Enums"]["policy_effect"]
          enabled: boolean
          id: string
          name: string
          priority: number
          resource_pattern: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          action: string
          condition?: Json
          created_at?: string
          effect: Database["public"]["Enums"]["policy_effect"]
          enabled?: boolean
          id?: string
          name: string
          priority?: number
          resource_pattern?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          action?: string
          condition?: Json
          created_at?: string
          effect?: Database["public"]["Enums"]["policy_effect"]
          enabled?: boolean
          id?: string
          name?: string
          priority?: number
          resource_pattern?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          attributes: Json
          created_at: string
          email: string
          id: string
          name: string | null
          status: Database["public"]["Enums"]["user_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          attributes?: Json
          created_at?: string
          email: string
          id: string
          name?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          attributes?: Json
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          attributes: Json
          created_at: string
          external_id: string | null
          id: string
          name: string
          tenant_id: string
          type: string
          updated_at: string
        }
        Insert: {
          attributes?: Json
          created_at?: string
          external_id?: string | null
          id?: string
          name: string
          tenant_id?: string
          type: string
          updated_at?: string
        }
        Update: {
          attributes?: Json
          created_at?: string
          external_id?: string | null
          id?: string
          name?: string
          tenant_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      reusable_modules: {
        Row: {
          allowed_personas: string[] | null
          category: string
          config_schema: Json
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          steps: Json
          updated_at: string
        }
        Insert: {
          allowed_personas?: string[] | null
          category?: string
          config_schema?: Json
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          steps?: Json
          updated_at?: string
        }
        Update: {
          allowed_personas?: string[] | null
          category?: string
          config_schema?: Json
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          steps?: Json
          updated_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_personas: {
        Row: {
          created_at: string
          persona_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          persona_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          persona_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_personas_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_teams: {
        Row: {
          created_at: string
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_teams_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_business_rules: {
        Row: {
          applies_to: string | null
          created_at: string
          description: string | null
          expression: string | null
          id: string
          name: string
          rule_type: string
          updated_at: string
          workflow_id: string
        }
        Insert: {
          applies_to?: string | null
          created_at?: string
          description?: string | null
          expression?: string | null
          id?: string
          name: string
          rule_type?: string
          updated_at?: string
          workflow_id: string
        }
        Update: {
          applies_to?: string | null
          created_at?: string
          description?: string | null
          expression?: string | null
          id?: string
          name?: string
          rule_type?: string
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_business_rules_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_data_model: {
        Row: {
          created_at: string
          data_type: string
          default_value: string | null
          description: string | null
          id: string
          name: string
          required: boolean
          updated_at: string
          workflow_id: string
        }
        Insert: {
          created_at?: string
          data_type?: string
          default_value?: string | null
          description?: string | null
          id?: string
          name: string
          required?: boolean
          updated_at?: string
          workflow_id: string
        }
        Update: {
          created_at?: string
          data_type?: string
          default_value?: string | null
          description?: string | null
          id?: string
          name?: string
          required?: boolean
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_data_model_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_deployments: {
        Row: {
          created_at: string
          deployed_at: string | null
          deployed_by: string | null
          id: string
          notes: string | null
          status: string
          target_environment: string
          updated_at: string
          version: string | null
          workflow_id: string
        }
        Insert: {
          created_at?: string
          deployed_at?: string | null
          deployed_by?: string | null
          id?: string
          notes?: string | null
          status?: string
          target_environment?: string
          updated_at?: string
          version?: string | null
          workflow_id: string
        }
        Update: {
          created_at?: string
          deployed_at?: string | null
          deployed_by?: string | null
          id?: string
          notes?: string | null
          status?: string
          target_environment?: string
          updated_at?: string
          version?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_deployments_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_members: {
        Row: {
          added_by: string | null
          created_at: string
          id: string
          persona_id: string | null
          role: string
          team_id: string | null
          updated_at: string
          user_id: string
          workflow_id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          id?: string
          persona_id?: string | null
          role: string
          team_id?: string | null
          updated_at?: string
          user_id: string
          workflow_id: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          id?: string
          persona_id?: string | null
          role?: string
          team_id?: string | null
          updated_at?: string
          user_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_members_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_members_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_personas: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          permissions: string[] | null
          role: string
          updated_at: string
          workflow_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          permissions?: string[] | null
          role?: string
          updated_at?: string
          workflow_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          permissions?: string[] | null
          role?: string
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_personas_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_team_members: {
        Row: {
          created_at: string
          department: string | null
          email: string | null
          id: string
          name: string
          persona_id: string | null
          updated_at: string
          workflow_id: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          email?: string | null
          id?: string
          name: string
          persona_id?: string | null
          updated_at?: string
          workflow_id: string
        }
        Update: {
          created_at?: string
          department?: string | null
          email?: string | null
          id?: string
          name?: string
          persona_id?: string | null
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_team_members_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "workflow_personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_team_members_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          bpmn_template: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          owner: string
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          bpmn_template?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          owner?: string
          status?: string
          type?: string
          updated_at?: string
        }
        Update: {
          bpmn_template?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          owner?: string
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_edit_workflow: {
        Args: { _uid: string; _wf: string }
        Returns: boolean
      }
      can_manage_workflow: {
        Args: { _uid: string; _wf: string }
        Returns: boolean
      }
      can_view_workflow: {
        Args: { _uid: string; _wf: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _uid: string }; Returns: boolean }
      workflow_role: { Args: { _uid: string; _wf: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "designer" | "reviewer" | "viewer"
      authz_decision: "ALLOW" | "DENY"
      policy_effect: "ALLOW" | "DENY"
      user_status: "ACTIVE" | "INACTIVE" | "SUSPENDED"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "designer", "reviewer", "viewer"],
      authz_decision: ["ALLOW", "DENY"],
      policy_effect: ["ALLOW", "DENY"],
      user_status: ["ACTIVE", "INACTIVE", "SUSPENDED"],
    },
  },
} as const
