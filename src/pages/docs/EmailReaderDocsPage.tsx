/**
 * Email Reader Module – Documentation Page
 */
import ModuleDocLayout from "@/components/docs/ModuleDocLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Mail, Download, Filter, Shield, Zap, Database, Settings2, GitBranch } from "lucide-react";

export default function EmailReaderDocsPage() {
  return (
    <ModuleDocLayout
      title="Email Reader — Technical Documentation"
      subtitle="Connect to a mailbox via Core API (MS Graph), fetch emails matching filters, and optionally download attachments. No IMAP/SMTP config needed — the Core API handles authentication centrally."
      badges={["MS Graph", "Core API", "Attachment Download", "Filter Rules", "Variable Output", "Camunda Topics"]}
    >
      {/* Purpose & Scope */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Mail size={18} className="text-primary" /> Purpose & Scope
        </h2>
        <Card>
          <CardContent className="pt-4 text-sm text-muted-foreground space-y-2">
            <p>The Email Reader module provides automated email retrieval from Microsoft 365 mailboxes using the internal Core API abstraction layer. It handles:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Connecting to specified mailbox accounts via Core API (MS Graph)</li>
              <li>Filtering emails by folder, subject, sender, date range, and read status</li>
              <li>Downloading email attachments to workflow-accessible storage</li>
              <li>Outputting structured email data for downstream modules</li>
            </ul>
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* Config Schema */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Settings2 size={18} className="text-primary" /> Configuration Schema
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-primary">Connection Settings</CardTitle>
            </CardHeader>
            <CardContent className="text-[11px] font-mono">
              <div className="bg-muted/50 rounded p-3 space-y-1">
                <p><span className="text-primary">mailbox</span>: string — "invoices@company.com"</p>
                <p><span className="text-primary">folder</span>: string — "INBOX" (default) | "Sent" | custom</p>
                <p><span className="text-primary">fetchLimit</span>: number — max emails (default: 50)</p>
                <p><span className="text-primary">downloadAttachments</span>: boolean — default: true</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-primary">Filter Rules</CardTitle>
            </CardHeader>
            <CardContent className="text-[11px] font-mono">
              <div className="bg-muted/50 rounded p-3 space-y-1">
                <p><span className="text-primary">subjectContains</span>: string — partial match filter</p>
                <p><span className="text-primary">fromAddress</span>: string — sender filter</p>
                <p><span className="text-primary">dateFrom</span>: ISO date — start date filter</p>
                <p><span className="text-primary">dateTo</span>: ISO date — end date filter</p>
                <p><span className="text-primary">unreadOnly</span>: boolean — default: false</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator />

      {/* Output Variables */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Database size={18} className="text-primary" /> Output Variables
        </h2>
        <Card>
          <CardContent className="pt-4 text-[11px] font-mono">
            <div className="bg-muted/50 rounded p-3 space-y-1">
              <p><span className="text-primary">emailReaderOutput</span>: object</p>
              <p className="pl-4"><span className="text-primary">.emails</span>: Email[] — array of fetched emails</p>
              <p className="pl-4"><span className="text-primary">.attachments</span>: File[] — downloaded attachment references</p>
              <p className="pl-4"><span className="text-primary">.count</span>: number — total emails found</p>
              <p className="pl-4"><span className="text-primary">.fetchedAt</span>: ISO timestamp</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* Camunda Integration */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Zap size={18} className="text-primary" /> Camunda Topics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-4">
            <p className="text-xs font-bold text-foreground mb-1">email-reader-fetch</p>
            <p className="text-[11px] text-muted-foreground">External task that connects to Core API, applies filters, and retrieves email metadata and bodies.</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-bold text-foreground mb-1">email-reader-download-attachments</p>
            <p className="text-[11px] text-muted-foreground">Downloads binary attachments to workflow storage, returns file references for downstream modules.</p>
          </Card>
        </div>
      </section>

      <Separator />

      {/* Variable Chaining */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <GitBranch size={18} className="text-primary" /> Variable Chaining
        </h2>
        <Card>
          <CardContent className="pt-4 text-[11px] text-muted-foreground space-y-2">
            <p className="font-semibold text-foreground">Downstream consumers:</p>
            <div className="bg-muted/50 rounded p-3 space-y-1 font-mono">
              <p>Email Reader → <span className="text-primary">Data Extractor</span>: emailReaderOutput.attachments[0]</p>
              <p>Email Reader → <span className="text-primary">Send Email</span>: emailReaderOutput.attachments (forward)</p>
              <p>Email Reader → <span className="text-primary">AI Processor</span>: emailReaderOutput.emails[0].body</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* Security */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Shield size={18} className="text-primary" /> Security Considerations
        </h2>
        <Card>
          <CardContent className="pt-4 text-sm text-muted-foreground space-y-2">
            <ul className="list-disc pl-6 space-y-1">
              <li>Authentication delegated to Core API — no credentials stored in workflow config</li>
              <li>Mailbox access scoped via MS Graph permissions configured centrally</li>
              <li>Attachments stored in secure workflow storage with automatic cleanup</li>
              <li>Audit trail logged for each email fetch operation</li>
            </ul>
          </CardContent>
        </Card>
      </section>
    </ModuleDocLayout>
  );
}
