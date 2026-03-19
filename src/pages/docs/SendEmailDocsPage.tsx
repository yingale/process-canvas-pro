/**
 * Send Email Notification Module – Documentation Page
 * Includes: Template Builder, Template Selection, MongoDB Schema, HTML Builder Design
 */
import ModuleDocLayout from "@/components/docs/ModuleDocLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, Settings2, Database, Zap, GitBranch, FileText, PaintBucket, LayoutTemplate, Variable, Eye, Code, Layers, Box, Plus, Search, CheckCircle2, AlertTriangle } from "lucide-react";

/* ─── Wireframe helpers ─── */
function WireframeBox({ label, children, className = "", accent = false }: {
  label: string; children?: React.ReactNode; className?: string; accent?: boolean;
}) {
  return (
    <div className={`border-2 border-dashed rounded-lg p-3 ${accent ? "border-primary/50 bg-primary/5" : "border-border bg-muted/30"} ${className}`}>
      <span className={`text-[10px] font-bold uppercase tracking-wider ${accent ? "text-primary" : "text-muted-foreground"}`}>
        {label}
      </span>
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}

function WireframePlaceholder({ text, h = "h-8" }: { text: string; h?: string }) {
  return (
    <div className={`${h} rounded bg-muted/60 border border-border flex items-center justify-center`}>
      <span className="text-[9px] text-muted-foreground font-medium">{text}</span>
    </div>
  );
}

export default function SendEmailDocsPage() {
  return (
    <ModuleDocLayout
      title="Send Email Notification — Technical Documentation"
      subtitle="Send templated emails via Core API (MS Graph) with variable substitution, optional attachments, HTML template builder, and template library management."
      badges={["MS Graph", "HTML Builder", "Template Library", "Variables", "Attachments", "CC/BCC", "MongoDB", "Camunda Topics"]}
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
              <li><strong>Create new templates</strong> via a drag-and-drop HTML builder with variable insertion</li>
              <li><strong>Select existing templates</strong> from a managed template library</li>
              <li>Dynamic recipient lists from workflow variables or static config</li>
              <li>Attach files from upstream modules (Email Reader, Data Extractor)</li>
              <li>CC/BCC support with configurable sender identity</li>
            </ul>
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* ═══════════════════════════════════════════════════════════
          TEMPLATE MANAGEMENT — THE BIG NEW SECTION
          ═══════════════════════════════════════════════════════════ */}
      <section className="space-y-6">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <LayoutTemplate size={18} className="text-primary" /> Email Template Management
        </h2>
        <p className="text-sm text-muted-foreground max-w-3xl">
          Users can <strong>create new</strong> or <strong>select existing</strong> email templates when configuring the Send Email step.
          Templates are stored in MongoDB and support variable placeholders that resolve at runtime.
        </p>

        <Tabs defaultValue="selection" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="selection" className="text-[11px]">Template Selection</TabsTrigger>
            <TabsTrigger value="builder" className="text-[11px]">HTML Builder</TabsTrigger>
            <TabsTrigger value="variables" className="text-[11px]">Variable System</TabsTrigger>
            <TabsTrigger value="preview" className="text-[11px]">Preview & Test</TabsTrigger>
          </TabsList>

          {/* ─── Template Selection ─── */}
          <TabsContent value="selection">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Template Selection Flow</CardTitle>
                <CardDescription className="text-[11px]">Choose between creating a new template or selecting from the library.</CardDescription>
              </CardHeader>
              <CardContent>
                <WireframeBox label="Template Picker Dialog" accent>
                  <div className="space-y-3">
                    {/* Mode toggle */}
                    <div className="flex gap-2">
                      <WireframePlaceholder text="📄 Select Existing" />
                      <WireframePlaceholder text="➕ Create New" />
                    </div>

                    <Separator />

                    {/* Search & filter */}
                    <WireframeBox label="Search & Filter">
                      <div className="flex gap-2">
                        <WireframePlaceholder text="🔍 Search templates..." />
                        <WireframePlaceholder text="Category ▾" />
                        <WireframePlaceholder text="Status ▾" />
                      </div>
                    </WireframeBox>

                    {/* Template grid */}
                    <WireframeBox label="Template Library Grid">
                      <div className="grid grid-cols-3 gap-2">
                        {["Approval Notification", "Welcome Email", "Invoice Summary", "Escalation Alert", "Weekly Report", "+ Create New"].map((t, i) => (
                          <WireframeBox key={i} label="" className={i === 5 ? "border-primary/40" : ""}>
                            <WireframePlaceholder text={t} h="h-16" />
                            {i < 5 && <div className="flex gap-1 mt-1">
                              <WireframePlaceholder text={i < 3 ? "Published" : "Draft"} h="h-4" />
                              <WireframePlaceholder text="3 vars" h="h-4" />
                            </div>}
                          </WireframeBox>
                        ))}
                      </div>
                    </WireframeBox>

                    {/* Selection info */}
                    <WireframeBox label="Selected Template Preview">
                      <div className="flex gap-3">
                        <WireframePlaceholder text="[HTML Preview Thumbnail]" h="h-24" />
                        <div className="flex-1 space-y-1">
                          <WireframePlaceholder text="Approval Notification" h="h-5" />
                          <WireframePlaceholder text="Variables: ${caseType}, ${approverName}, ${deadline}" h="h-5" />
                          <WireframePlaceholder text="Last edited: 2 days ago by Admin" h="h-5" />
                          <div className="flex gap-1">
                            <WireframePlaceholder text="✏️ Edit" h="h-5" />
                            <WireframePlaceholder text="📋 Clone" h="h-5" />
                            <WireframePlaceholder text="✅ Select" h="h-5" />
                          </div>
                        </div>
                      </div>
                    </WireframeBox>
                  </div>
                </WireframeBox>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── HTML Builder ─── */}
          <TabsContent value="builder">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">HTML Email Template Builder</CardTitle>
                <CardDescription className="text-[11px]">Drag-and-drop block-based editor for creating responsive email templates with variable placeholders.</CardDescription>
              </CardHeader>
              <CardContent>
                <WireframeBox label="HTML Builder — Full Layout" accent>
                  <div className="space-y-2">
                    {/* Top bar */}
                    <WireframeBox label="Builder Toolbar">
                      <div className="flex items-center justify-between">
                        <div className="flex gap-1">
                          <WireframePlaceholder text="Template Name" />
                          <WireframePlaceholder text="Category ▾" />
                          <WireframePlaceholder text="Status: Draft" />
                        </div>
                        <div className="flex gap-1">
                          <WireframePlaceholder text="↩ Undo" />
                          <WireframePlaceholder text="↪ Redo" />
                          <WireframePlaceholder text="📱 Mobile" />
                          <WireframePlaceholder text="🖥 Desktop" />
                          <WireframePlaceholder text="👁 Preview" />
                          <WireframePlaceholder text="</> Code" />
                          <WireframePlaceholder text="💾 Save" />
                        </div>
                      </div>
                    </WireframeBox>

                    {/* Three-panel layout */}
                    <div className="flex gap-2">
                      {/* Block palette */}
                      <WireframeBox label="Block Palette (200px)" className="w-48 flex-shrink-0">
                        <div className="space-y-1.5">
                          <p className="text-[9px] font-bold text-muted-foreground">STRUCTURE</p>
                          <WireframePlaceholder text="📐 1-Column" h="h-5" />
                          <WireframePlaceholder text="📐 2-Column" h="h-5" />
                          <WireframePlaceholder text="📐 3-Column" h="h-5" />
                          <WireframePlaceholder text="— Divider" h="h-5" />
                          <WireframePlaceholder text="⬜ Spacer" h="h-5" />

                          <p className="text-[9px] font-bold text-muted-foreground mt-2">CONTENT</p>
                          <WireframePlaceholder text="📝 Text Block" h="h-5" />
                          <WireframePlaceholder text="🖼 Image" h="h-5" />
                          <WireframePlaceholder text="🔘 Button / CTA" h="h-5" />
                          <WireframePlaceholder text="📊 Table" h="h-5" />
                          <WireframePlaceholder text="📎 Attachment Badge" h="h-5" />

                          <p className="text-[9px] font-bold text-muted-foreground mt-2">DYNAMIC</p>
                          <WireframePlaceholder text="${} Variable Block" h="h-5" />
                          <WireframePlaceholder text="🔄 Repeat Block" h="h-5" />
                          <WireframePlaceholder text="❓ Conditional" h="h-5" />
                        </div>
                      </WireframeBox>

                      {/* Canvas */}
                      <WireframeBox label="Email Canvas (flex-1)" className="flex-1" accent>
                        <div className="space-y-1.5">
                          <WireframeBox label="Header Section">
                            <WireframePlaceholder text="[Logo] Company Name" h="h-10" />
                          </WireframeBox>
                          <WireframeBox label="Body Section">
                            <div className="space-y-1">
                              <WireframePlaceholder text="Hello ${recipientName}," h="h-6" />
                              <WireframePlaceholder text="Your ${caseType} (ID: ${caseId}) has been submitted." h="h-6" />
                              <WireframePlaceholder text="[📊 Data Table — ${extractedData.rows}]" h="h-14" />
                              <WireframePlaceholder text="AI Summary: ${aiProcessorOutput.result}" h="h-10" />
                            </div>
                          </WireframeBox>
                          <WireframeBox label="CTA Section">
                            <WireframePlaceholder text="[🔘 Review Now → ${approvalLink}]" h="h-8" />
                          </WireframeBox>
                          <WireframeBox label="Footer Section">
                            <WireframePlaceholder text="© ${companyName} | Unsubscribe" h="h-6" />
                          </WireframeBox>
                        </div>
                      </WireframeBox>

                      {/* Properties panel */}
                      <WireframeBox label="Properties (220px)" className="w-52 flex-shrink-0">
                        <div className="space-y-1.5">
                          <p className="text-[9px] font-bold text-muted-foreground">SELECTED: Text Block</p>
                          <WireframePlaceholder text="Content (rich text)" h="h-12" />
                          <WireframePlaceholder text="Font Size: 14px ▾" h="h-5" />
                          <WireframePlaceholder text="Color: #333 🎨" h="h-5" />
                          <WireframePlaceholder text="Padding: T8 R16 B8 L16" h="h-5" />
                          <WireframePlaceholder text="Align: [L] [C] [R]" h="h-5" />

                          <Separator className="my-2" />

                          <p className="text-[9px] font-bold text-muted-foreground">INSERT VARIABLE</p>
                          <WireframePlaceholder text="🔍 Search variables..." h="h-5" />
                          <WireframePlaceholder text="${recipientName}" h="h-4" />
                          <WireframePlaceholder text="${caseType}" h="h-4" />
                          <WireframePlaceholder text="${caseId}" h="h-4" />
                          <WireframePlaceholder text="${aiProcessorOutput}" h="h-4" />
                          <WireframePlaceholder text="${extractedData}" h="h-4" />
                          <WireframePlaceholder text="+ Custom variable" h="h-4" />
                        </div>
                      </WireframeBox>
                    </div>
                  </div>
                </WireframeBox>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Variable System ─── */}
          <TabsContent value="variables">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Variable System</CardTitle>
                <CardDescription className="text-[11px]">Dynamic placeholders resolved at runtime from upstream module outputs and workflow context.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-bold text-primary flex items-center gap-1">
                        <Variable size={12} /> System Variables
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-[11px] font-mono">
                      <div className="bg-muted/50 rounded p-3 space-y-1">
                        <p><span className="text-primary">$&#123;recipientName&#125;</span> — resolved from recipient profile</p>
                        <p><span className="text-primary">$&#123;recipientEmail&#125;</span> — TO address</p>
                        <p><span className="text-primary">$&#123;senderName&#125;</span> — configured sender alias</p>
                        <p><span className="text-primary">$&#123;currentDate&#125;</span> — ISO date at send time</p>
                        <p><span className="text-primary">$&#123;workflowName&#125;</span> — parent workflow name</p>
                        <p><span className="text-primary">$&#123;caseId&#125;</span> — current case identifier</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-bold text-primary flex items-center gap-1">
                        <GitBranch size={12} /> Upstream Variables
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-[11px] font-mono">
                      <div className="bg-muted/50 rounded p-3 space-y-1">
                        <p><span className="text-primary">$&#123;emailReaderOutput.*&#125;</span> — email data</p>
                        <p><span className="text-primary">$&#123;extractedData.*&#125;</span> — parsed rows/columns</p>
                        <p><span className="text-primary">$&#123;aiProcessorOutput.*&#125;</span> — LLM result</p>
                        <p><span className="text-primary">$&#123;approvalOutput.*&#125;</span> — approval decision</p>
                        <p><span className="text-primary">$&#123;formData.*&#125;</span> — form submission data</p>
                        <p className="text-muted-foreground mt-1">Dot notation for nested: $&#123;extractedData.rows[0].Amount&#125;</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Advanced variable features */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-bold text-primary">Advanced: Conditional & Loop Blocks</CardTitle>
                  </CardHeader>
                  <CardContent className="text-[11px] font-mono">
                    <div className="bg-muted/50 rounded p-3 space-y-2">
                      <p className="text-muted-foreground">// Conditional rendering</p>
                      <p>&#123;&#123;#if approvalOutput.status === "rejected"&#125;&#125;</p>
                      <p className="pl-4">&lt;p class="alert"&gt;Your request was rejected.&lt;/p&gt;</p>
                      <p>&#123;&#123;/if&#125;&#125;</p>
                      <p className="text-muted-foreground mt-2">// Loop over data rows</p>
                      <p>&#123;&#123;#each extractedData.rows as row&#125;&#125;</p>
                      <p className="pl-4">&lt;tr&gt;&lt;td&gt;$&#123;row.Vendor&#125;&lt;/td&gt;&lt;td&gt;$&#123;row.Amount&#125;&lt;/td&gt;&lt;/tr&gt;</p>
                      <p>&#123;&#123;/each&#125;&#125;</p>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Preview & Test ─── */}
          <TabsContent value="preview">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Preview & Test Send</CardTitle>
                <CardDescription className="text-[11px]">Preview with sample data and send test emails before publishing.</CardDescription>
              </CardHeader>
              <CardContent>
                <WireframeBox label="Preview Panel" accent>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <WireframePlaceholder text="📱 Mobile Preview" />
                      <WireframePlaceholder text="🖥 Desktop Preview" />
                      <WireframePlaceholder text="</> HTML Source" />
                    </div>
                    <WireframeBox label="Sample Data">
                      <WireframePlaceholder text='{"recipientName": "John", "caseType": "Invoice Review", ...}' h="h-10" />
                    </WireframeBox>
                    <WireframeBox label="Rendered Preview">
                      <WireframePlaceholder text="[Fully rendered HTML email with resolved variables]" h="h-32" />
                    </WireframeBox>
                    <div className="flex gap-2">
                      <WireframePlaceholder text="📧 Send Test Email" />
                      <WireframePlaceholder text="Test recipient: ___@___" />
                    </div>
                  </div>
                </WireframeBox>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </section>

      <Separator />

      {/* ═══════════════════════════════════════════════════════════
          MONGODB SCHEMA
          ═══════════════════════════════════════════════════════════ */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Database size={18} className="text-primary" /> MongoDB Schema — Email Templates
        </h2>
        <p className="text-sm text-muted-foreground max-w-3xl">
          Templates are stored in MongoDB for flexible schema, versioning, and rich HTML content storage.
          The execution stack (Node.js + MongoDB) manages template CRUD and resolution at send time.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Main template collection */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-primary flex items-center gap-1">
                <Box size={12} /> Collection: email_templates
              </CardTitle>
            </CardHeader>
            <CardContent className="text-[11px] font-mono">
              <div className="bg-muted/50 rounded p-3 space-y-1">
                <p><span className="text-primary">_id</span>: ObjectId</p>
                <p><span className="text-primary">templateId</span>: string — unique slug ("approval-notification")</p>
                <p><span className="text-primary">name</span>: string — "Approval Notification"</p>
                <p><span className="text-primary">description</span>: string — template purpose</p>
                <p><span className="text-primary">category</span>: string — "Governance" | "Communication" | ...</p>
                <p><span className="text-primary">status</span>: "draft" | "published" | "archived"</p>
                <p><span className="text-primary">version</span>: number — incremented on publish</p>
                <p><span className="text-primary">subject</span>: string — email subject with $&#123;vars&#125;</p>
                <p><span className="text-primary">htmlBody</span>: string — full HTML with $&#123;vars&#125;</p>
                <p><span className="text-primary">textBody</span>: string — plain text fallback</p>
                <p><span className="text-primary">builderJson</span>: BuilderBlock[] — structured block data</p>
                <p><span className="text-primary">variables</span>: TemplateVariable[] — declared variables</p>
                <p><span className="text-primary">thumbnail</span>: string — base64 preview image</p>
                <p><span className="text-primary">tags</span>: string[]</p>
                <p><span className="text-primary">createdBy</span>: string — user/persona ID</p>
                <p><span className="text-primary">updatedBy</span>: string</p>
                <p><span className="text-primary">createdAt</span>: Date</p>
                <p><span className="text-primary">updatedAt</span>: Date</p>
              </div>
            </CardContent>
          </Card>

          {/* Embedded sub-schemas */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-primary flex items-center gap-1">
                  <Layers size={12} /> Sub-schema: BuilderBlock
                </CardTitle>
              </CardHeader>
              <CardContent className="text-[11px] font-mono">
                <div className="bg-muted/50 rounded p-3 space-y-1">
                  <p><span className="text-primary">blockId</span>: string — unique block identifier</p>
                  <p><span className="text-primary">type</span>: "text" | "image" | "button" | "table" | "divider" | "spacer" | "columns" | "variable" | "conditional" | "loop"</p>
                  <p><span className="text-primary">content</span>: string | object — block-specific content</p>
                  <p><span className="text-primary">styles</span>: BlockStyles — font, color, padding, alignment</p>
                  <p><span className="text-primary">children</span>: BuilderBlock[] — nested blocks (for columns)</p>
                  <p><span className="text-primary">condition</span>: string — for conditional blocks</p>
                  <p><span className="text-primary">loopVariable</span>: string — for loop blocks</p>
                  <p><span className="text-primary">order</span>: number — sort position</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-primary flex items-center gap-1">
                  <Variable size={12} /> Sub-schema: TemplateVariable
                </CardTitle>
              </CardHeader>
              <CardContent className="text-[11px] font-mono">
                <div className="bg-muted/50 rounded p-3 space-y-1">
                  <p><span className="text-primary">key</span>: string — "recipientName"</p>
                  <p><span className="text-primary">label</span>: string — "Recipient Name"</p>
                  <p><span className="text-primary">source</span>: "system" | "upstream" | "custom"</p>
                  <p><span className="text-primary">upstreamModule</span>: string — "aiProcessor" (if source=upstream)</p>
                  <p><span className="text-primary">path</span>: string — "result" (dot-path in output)</p>
                  <p><span className="text-primary">defaultValue</span>: string — fallback if unresolved</p>
                  <p><span className="text-primary">required</span>: boolean</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-primary flex items-center gap-1">
                  <PaintBucket size={12} /> Sub-schema: BlockStyles
                </CardTitle>
              </CardHeader>
              <CardContent className="text-[11px] font-mono">
                <div className="bg-muted/50 rounded p-3 space-y-1">
                  <p><span className="text-primary">fontSize</span>: string — "14px"</p>
                  <p><span className="text-primary">fontFamily</span>: string — "Arial, sans-serif"</p>
                  <p><span className="text-primary">color</span>: string — "#333333"</p>
                  <p><span className="text-primary">backgroundColor</span>: string</p>
                  <p><span className="text-primary">padding</span>: &#123; top, right, bottom, left &#125;</p>
                  <p><span className="text-primary">textAlign</span>: "left" | "center" | "right"</p>
                  <p><span className="text-primary">borderRadius</span>: string</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Indexes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-primary">MongoDB Indexes</CardTitle>
          </CardHeader>
          <CardContent className="text-[11px] font-mono">
            <div className="bg-muted/50 rounded p-3 space-y-1">
              <p className="text-muted-foreground">// Unique index for template lookup</p>
              <p>db.email_templates.createIndex(&#123; templateId: 1 &#125;, &#123; unique: true &#125;)</p>
              <p className="text-muted-foreground mt-2">// Compound index for library browsing</p>
              <p>db.email_templates.createIndex(&#123; status: 1, category: 1, updatedAt: -1 &#125;)</p>
              <p className="text-muted-foreground mt-2">// Text index for search</p>
              <p>db.email_templates.createIndex(&#123; name: "text", description: "text", tags: "text" &#125;)</p>
            </div>
          </CardContent>
        </Card>

        {/* Example document */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-primary">Example Document</CardTitle>
          </CardHeader>
          <CardContent className="text-[11px] font-mono">
            <div className="bg-muted/50 rounded p-3 overflow-auto max-h-[300px]">
              <pre className="text-muted-foreground whitespace-pre-wrap">{`{
  "_id": ObjectId("..."),
  "templateId": "approval-notification",
  "name": "Approval Notification",
  "description": "Sent when a case requires reviewer action",
  "category": "Governance",
  "status": "published",
  "version": 3,
  "subject": "Action Required: \${caseType} — \${caseId}",
  "htmlBody": "<html>...<h2>New \${caseType}</h2>...</html>",
  "textBody": "New \${caseType} for review...",
  "builderJson": [
    {
      "blockId": "hdr-01",
      "type": "image",
      "content": { "src": "/logo.png", "alt": "Company Logo" },
      "styles": { "textAlign": "center", "padding": { "top": 16, "bottom": 8 } },
      "order": 0
    },
    {
      "blockId": "body-01",
      "type": "text",
      "content": "Hello \${recipientName},\\nYour \${caseType} (ID: \${caseId}) needs review.",
      "styles": { "fontSize": "14px", "color": "#333" },
      "order": 1
    },
    {
      "blockId": "cta-01",
      "type": "button",
      "content": { "text": "Review Now", "url": "\${approvalLink}" },
      "styles": { "backgroundColor": "#0066CC", "color": "#FFF", "textAlign": "center" },
      "order": 2
    }
  ],
  "variables": [
    { "key": "recipientName", "label": "Recipient Name", "source": "system", "required": true },
    { "key": "caseType", "label": "Case Type", "source": "system", "required": true },
    { "key": "caseId", "label": "Case ID", "source": "system", "required": true },
    { "key": "approvalLink", "label": "Approval Link", "source": "system", "required": true },
    { "key": "aiProcessorOutput.result", "label": "AI Summary", "source": "upstream", "upstreamModule": "aiProcessor", "path": "result", "required": false, "defaultValue": "N/A" }
  ],
  "thumbnail": "data:image/png;base64,...",
  "tags": ["approval", "governance", "notification"],
  "createdBy": "admin-001",
  "updatedBy": "admin-001",
  "createdAt": ISODate("2025-01-15T10:00:00Z"),
  "updatedAt": ISODate("2025-03-10T14:30:00Z")
}`}</pre>
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* ═══════════════════════════════════════════════════════════
          HTML BUILDER ARCHITECTURE
          ═══════════════════════════════════════════════════════════ */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Layers size={18} className="text-primary" /> HTML Builder — Component Architecture
        </h2>
        <Card>
          <CardContent className="pt-4">
            <div className="font-mono text-[11px] space-y-1 text-foreground">
              <p className="font-bold text-primary">EmailTemplateBuilder</p>
              <p className="pl-4">├── <span className="text-primary">BuilderToolbar</span> — name, category, undo/redo, device toggle, save</p>
              <p className="pl-4">├── <span className="text-primary">BlockPalette</span> — draggable block catalog</p>
              <p className="pl-4">│   ├── Structure blocks (columns, divider, spacer)</p>
              <p className="pl-4">│   ├── Content blocks (text, image, button, table)</p>
              <p className="pl-4">│   └── Dynamic blocks (variable, conditional, loop)</p>
              <p className="pl-4">├── <span className="text-primary">BuilderCanvas</span> — drop zone, block rendering, DnD reorder</p>
              <p className="pl-4">│   ├── Block selection + inline editing</p>
              <p className="pl-4">│   ├── Variable chip insertion (${"{"}...{"}"} pills)</p>
              <p className="pl-4">│   └── Responsive container (mobile/desktop width)</p>
              <p className="pl-4">├── <span className="text-primary">PropertiesPanel</span> — selected block styling</p>
              <p className="pl-4">│   ├── Typography (font, size, color, weight)</p>
              <p className="pl-4">│   ├── Spacing (padding, margin)</p>
              <p className="pl-4">│   ├── Layout (alignment, width)</p>
              <p className="pl-4">│   └── Variable insertion search</p>
              <p className="pl-4">├── <span className="text-primary">VariableManager</span> — declare, browse, insert variables</p>
              <p className="pl-4">│   ├── System variables (auto-populated)</p>
              <p className="pl-4">│   ├── Upstream variables (from module chain)</p>
              <p className="pl-4">│   └── Custom variables (user-defined)</p>
              <p className="pl-4">├── <span className="text-primary">HtmlCodeEditor</span> — raw HTML view with syntax highlighting</p>
              <p className="pl-4">└── <span className="text-primary">PreviewPane</span> — rendered output with sample data</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* ═══════════════════════════════════════════════════════════
          API ENDPOINTS
          ═══════════════════════════════════════════════════════════ */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Code size={18} className="text-primary" /> API Endpoints (Node.js Server)
        </h2>
        <Card>
          <CardContent className="pt-4 text-[11px] font-mono">
            <div className="bg-muted/50 rounded p-3 space-y-2">
              <p className="text-muted-foreground">// Template CRUD</p>
              <p><span className="text-primary">GET</span>    /api/email-templates              — list templates (filter: status, category)</p>
              <p><span className="text-primary">GET</span>    /api/email-templates/:id           — get single template</p>
              <p><span className="text-primary">POST</span>   /api/email-templates               — create new template</p>
              <p><span className="text-primary">PUT</span>    /api/email-templates/:id           — update template (saves draft)</p>
              <p><span className="text-primary">POST</span>   /api/email-templates/:id/publish   — publish (increment version)</p>
              <p><span className="text-primary">POST</span>   /api/email-templates/:id/clone     — clone as new draft</p>
              <p><span className="text-primary">DELETE</span>  /api/email-templates/:id           — archive template</p>

              <p className="text-muted-foreground mt-3">// Template rendering</p>
              <p><span className="text-primary">POST</span>   /api/email-templates/:id/render    — resolve variables → final HTML</p>
              <p><span className="text-primary">POST</span>   /api/email-templates/:id/preview   — render with sample data</p>
              <p><span className="text-primary">POST</span>   /api/email-templates/:id/test-send — send test email to address</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* Config (original) */}
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
              <CardTitle className="text-xs font-bold text-primary">Content & Template</CardTitle>
            </CardHeader>
            <CardContent className="text-[11px] font-mono">
              <div className="bg-muted/50 rounded p-3 space-y-1">
                <p><span className="text-primary">templateSource</span>: "existing" | "new" | "inline"</p>
                <p><span className="text-primary">templateId</span>: string — if source = "existing"</p>
                <p><span className="text-primary">subject</span>: string — override or inline subject</p>
                <p><span className="text-primary">body</span>: string — inline HTML (if no template)</p>
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
              <p className="pl-4"><span className="text-primary">.templateUsed</span>: string — templateId resolved</p>
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
            <p className="text-xs font-bold text-foreground mb-1">send-email-resolve-template</p>
            <p className="text-[11px] text-muted-foreground">Fetches template from MongoDB by templateId, merges with inline overrides.</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-bold text-foreground mb-1">send-email-prepare</p>
            <p className="text-[11px] text-muted-foreground">Resolves all $&#123;var&#125; placeholders, evaluates conditionals and loops, renders final HTML.</p>
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
              <p><span className="text-primary">Data Extractor</span> → Send Email: $&#123;extractedData.rows&#125; in loop block</p>
              <p><span className="text-primary">Form Builder</span> → Send Email: $&#123;formData.*&#125; in body</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* User flows */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Eye size={18} className="text-primary" /> Key User Flows
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              title: "Create New Template",
              steps: [
                "Open Send Email step config → Template → Create New",
                "Name template, select category",
                "Drag blocks from palette onto canvas",
                "Insert variables via ${} chips or variable panel",
                "Style blocks using properties panel",
                "Preview with sample data",
                "Save as Draft → Publish when ready",
              ],
            },
            {
              title: "Select Existing Template",
              steps: [
                "Open Send Email step config → Template → Select Existing",
                "Browse/search template library",
                "Preview template with thumbnail",
                "Select template → auto-populate subject & body",
                "Override variables if needed",
                "Optionally clone & customize",
              ],
            },
            {
              title: "Edit Template Variables",
              steps: [
                "Open template in builder",
                "Click Variable Manager in properties panel",
                "Search available variables (system + upstream)",
                "Click to insert at cursor position",
                "Add custom variables with default values",
                "Mark required variables for validation",
              ],
            },
            {
              title: "Test & Publish",
              steps: [
                "Click Preview → enter sample data JSON",
                "Review rendered email (mobile + desktop)",
                "Send test email to verify formatting",
                "Fix issues → re-preview",
                "Publish template (creates new version)",
                "Previous version archived automatically",
              ],
            },
          ].map(flow => (
            <Card key={flow.title}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-foreground">{flow.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="text-[11px] text-muted-foreground space-y-1 list-decimal pl-4">
                  {flow.steps.map((s, i) => <li key={i}>{s}</li>)}
                </ol>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Separator />

      {/* Validation */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <CheckCircle2 size={18} className="text-primary" /> Template Validation Rules
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { level: "error", rule: "Template has no subject line" },
            { level: "error", rule: "Required variable has no source mapping" },
            { level: "error", rule: "Loop block references non-array variable" },
            { level: "warning", rule: "Template has no plain text fallback" },
            { level: "warning", rule: "Unused declared variable (never referenced in body)" },
            { level: "warning", rule: "Image block missing alt text" },
          ].map((v, i) => (
            <div key={i} className={`flex items-center gap-2 p-2.5 rounded-md text-[11px] border ${
              v.level === "error" ? "bg-destructive/5 border-destructive/20" : "bg-amber-500/5 border-amber-500/20"
            }`}>
              <AlertTriangle size={12} className={v.level === "error" ? "text-destructive" : "text-amber-500"} />
              <span className="text-foreground">{v.rule}</span>
              <Badge variant="outline" className="ml-auto text-[8px]">{v.level}</Badge>
            </div>
          ))}
        </div>
      </section>
    </ModuleDocLayout>
  );
}
