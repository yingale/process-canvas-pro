/**
 * Send Email Notification Module – Documentation Page
 */
import ModuleDocLayout from "@/components/docs/ModuleDocLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Send, Settings2, Database, Zap, GitBranch, FileText } from "lucide-react";

export default function SendEmailDocsPage() {
  return (
    <ModuleDocLayout
      title="Send Email Notification — Technical Documentation"
      subtitle="Send templated emails via Core API (MS Graph) with variable substitution, optional attachments from upstream modules, and recipient list management."
      badges={["MS Graph", "Templates", "Attachments", "Variable Body", "CC/BCC", "Camunda Topics"]}
    >
      {/* Purpose */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Send size={18} className="text-primary" /> Purpose & Scope
        </h2>
        <Card>
          <CardContent className="pt-4 text-sm text-muted-foreground space-y-2">
            <p>The Send Email Notification module dispatches formatted emails through the Core API:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>HTML and plain text email templates with variable substitution</li>
              <li>Dynamic recipient lists from workflow variables or static config</li>
              <li>Attach files from upstream modules (Email Reader, Data Extractor)</li>
              <li>CC/BCC support with configurable sender identity</li>
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
              <CardTitle className="text-xs font-bold text-primary">Recipients</CardTitle>
            </CardHeader>
            <CardContent className="text-[11px] font-mono">
              <div className="bg-muted/50 rounded p-3 space-y-1">
                <p><span className="text-primary">to</span>: string[] — recipient emails or $&#123;variable&#125;</p>
                <p><span className="text-primary">cc</span>: string[] — optional CC list</p>
                <p><span className="text-primary">bcc</span>: string[] — optional BCC list</p>
                <p><span className="text-primary">fromAlias</span>: string — sender display name</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-primary">Content</CardTitle>
            </CardHeader>
            <CardContent className="text-[11px] font-mono">
              <div className="bg-muted/50 rounded p-3 space-y-1">
                <p><span className="text-primary">subject</span>: string — supports $&#123;var&#125; substitution</p>
                <p><span className="text-primary">body</span>: string — HTML template with variables</p>
                <p><span className="text-primary">bodyFormat</span>: "html" | "text" — default: "html"</p>
                <p><span className="text-primary">attachFromVariable</span>: string — upstream file refs</p>
                <p><span className="text-primary">priority</span>: "low" | "normal" | "high"</p>
              </div>
            </CardContent>
          </Card>
        </div>
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
              <p><span className="text-primary">sendEmailOutput</span>: object</p>
              <p className="pl-4"><span className="text-primary">.messageId</span>: string — MS Graph message ID</p>
              <p className="pl-4"><span className="text-primary">.sentTo</span>: string[] — actual recipients</p>
              <p className="pl-4"><span className="text-primary">.sentAt</span>: ISO timestamp</p>
              <p className="pl-4"><span className="text-primary">.status</span>: "sent" | "queued" | "failed"</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-4">
            <p className="text-xs font-bold text-foreground mb-1">send-email-prepare</p>
            <p className="text-[11px] text-muted-foreground">Resolves all variable references in subject, body, and recipient lists. Collects attachment files.</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-bold text-foreground mb-1">send-email-dispatch</p>
            <p className="text-[11px] text-muted-foreground">Sends the email via Core API (MS Graph), handles delivery status and retry logic.</p>
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
              <p><span className="text-primary">AI Processor</span> → Send Email: $&#123;aiProcessorOutput.result&#125; in body</p>
              <p><span className="text-primary">Email Reader</span> → Send Email: emailReaderOutput.attachments (forward)</p>
              <p><span className="text-primary">Approval</span> → Send Email: $&#123;approvalOutput.approverEmail&#125; as recipient</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* Templates */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <FileText size={18} className="text-primary" /> Template Examples
        </h2>
        <Card>
          <CardContent className="pt-4 text-[11px] font-mono">
            <div className="bg-muted/50 rounded p-3 space-y-2">
              <p className="text-muted-foreground">// Approval notification template</p>
              <p>Subject: "Action Required: $&#123;caseType&#125; — $&#123;caseId&#125;"</p>
              <p>Body: "&lt;h2&gt;New $&#123;caseType&#125; for review&lt;/h2&gt;</p>
              <p className="pl-4">&lt;p&gt;Submitted by $&#123;submitterName&#125;&lt;/p&gt;</p>
              <p className="pl-4">&lt;p&gt;AI Summary: $&#123;aiProcessorOutput.result&#125;&lt;/p&gt;"</p>
            </div>
          </CardContent>
        </Card>
      </section>
    </ModuleDocLayout>
  );
}
