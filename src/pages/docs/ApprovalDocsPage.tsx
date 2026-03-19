/**
 * Approval / Reviewer Module – Documentation Page
 */
import ModuleDocLayout from "@/components/docs/ModuleDocLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Shield, Settings2, Database, Zap, GitBranch, Users, AlertTriangle } from "lucide-react";

export default function ApprovalDocsPage() {
  return (
    <ModuleDocLayout
      title="Approval / Reviewer — Technical Documentation"
      subtitle="Enterprise approval workflow with configurable levels, escalation rules, auto-approve conditions, and multi-reviewer support. Integrates with persona-based routing."
      badges={["Multi-Level", "Escalation", "Auto-Approve", "User Tasks", "SLA", "Camunda Topics"]}
    >
      {/* Purpose */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Shield size={18} className="text-primary" /> Purpose & Scope
        </h2>
        <Card>
          <CardContent className="pt-4 text-sm text-muted-foreground space-y-2">
            <p>The Approval / Reviewer module implements enterprise governance workflows:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Configurable approval levels (single, sequential, parallel)</li>
              <li>Auto-approve conditions based on business rules</li>
              <li>Escalation paths with SLA timers</li>
              <li>Rejection handling with return-to-submitter or alternate routing</li>
              <li>Audit trail with timestamps, comments, and decision history</li>
            </ul>
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* Config */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Settings2 size={18} className="text-primary" /> Configuration Schema
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-primary">Approval Structure</CardTitle>
            </CardHeader>
            <CardContent className="text-[11px] font-mono">
              <div className="bg-muted/50 rounded p-3 space-y-1">
                <p><span className="text-primary">approvalType</span>: "single" | "sequential" | "parallel"</p>
                <p><span className="text-primary">levels</span>: ApprovalLevel[] — ordered approval stages</p>
                <p><span className="text-primary">levels[].approver</span>: string — persona or user ref</p>
                <p><span className="text-primary">levels[].required</span>: boolean</p>
                <p><span className="text-primary">levels[].slaHours</span>: number — deadline in hours</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-primary">Automation Rules</CardTitle>
            </CardHeader>
            <CardContent className="text-[11px] font-mono">
              <div className="bg-muted/50 rounded p-3 space-y-1">
                <p><span className="text-primary">autoApproveCondition</span>: string — expression (e.g. "amount &lt; 1000")</p>
                <p><span className="text-primary">escalateTo</span>: string — persona for SLA breach</p>
                <p><span className="text-primary">escalateAfterHours</span>: number</p>
                <p><span className="text-primary">onReject</span>: "return" | "terminate" | "reroute"</p>
                <p><span className="text-primary">rerouteTo</span>: string — if onReject = "reroute"</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator />

      {/* Approval Flow Diagram */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Users size={18} className="text-primary" /> Approval Flow
        </h2>
        <Card>
          <CardContent className="pt-4 text-[11px] font-mono text-muted-foreground">
            <div className="bg-muted/50 rounded p-3 space-y-1">
              <p>Submit → [Auto-approve check]</p>
              <p className="pl-8">├── condition met → ✅ Auto-approved</p>
              <p className="pl-8">└── condition not met → Level 1 Reviewer</p>
              <p className="pl-16">├── ✅ Approved → Level 2 (if sequential)</p>
              <p className="pl-16">├── ❌ Rejected → onReject handler</p>
              <p className="pl-16">└── ⏰ SLA breach → Escalate</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* Output */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Database size={18} className="text-primary" /> Output Variables
        </h2>
        <Card>
          <CardContent className="pt-4 text-[11px] font-mono">
            <div className="bg-muted/50 rounded p-3 space-y-1">
              <p><span className="text-primary">approvalOutput</span>: object</p>
              <p className="pl-4"><span className="text-primary">.status</span>: "approved" | "rejected" | "escalated" | "pending"</p>
              <p className="pl-4"><span className="text-primary">.approverEmail</span>: string — final approver</p>
              <p className="pl-4"><span className="text-primary">.comments</span>: string — reviewer comments</p>
              <p className="pl-4"><span className="text-primary">.decidedAt</span>: ISO timestamp</p>
              <p className="pl-4"><span className="text-primary">.history</span>: Decision[] — full audit trail</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* Camunda */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Zap size={18} className="text-primary" /> Camunda Topics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-xs font-bold text-foreground mb-1">approval-submit</p>
            <p className="text-[11px] text-muted-foreground">Evaluates auto-approve conditions, creates approval task if needed.</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-bold text-foreground mb-1">approval-review</p>
            <p className="text-[11px] text-muted-foreground">User task assigned to approver persona. Captures decision and comments.</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-bold text-foreground mb-1">approval-escalate</p>
            <p className="text-[11px] text-muted-foreground">Triggered on SLA breach, reassigns to escalation target.</p>
          </Card>
        </div>
      </section>

      <Separator />

      {/* Chaining */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <GitBranch size={18} className="text-primary" /> Variable Chaining
        </h2>
        <Card>
          <CardContent className="pt-4 text-[11px] text-muted-foreground space-y-2">
            <div className="bg-muted/50 rounded p-3 space-y-1 font-mono">
              <p><span className="text-primary">Form Builder</span> → Approval: form submission triggers review</p>
              <p>Approval → <span className="text-primary">Send Email</span>: $&#123;approvalOutput.approverEmail&#125;, $&#123;approvalOutput.status&#125;</p>
              <p>Approval → <span className="text-primary">AI Processor</span>: approvalOutput.comments for analysis</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* Warnings */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <AlertTriangle size={18} className="text-primary" /> Configuration Warnings
        </h2>
        <Card>
          <CardContent className="pt-4 text-sm text-muted-foreground space-y-2">
            <ul className="list-disc pl-6 space-y-1">
              <li>Sequential approval with no SLA → may block workflow indefinitely</li>
              <li>Auto-approve without audit logging → compliance risk</li>
              <li>Missing escalation target → SLA breach handled as rejection</li>
              <li>Parallel approval requires all approvers → may cause delays</li>
            </ul>
          </CardContent>
        </Card>
      </section>
    </ModuleDocLayout>
  );
}
