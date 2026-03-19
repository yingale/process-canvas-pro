import { useState, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Upload, X, FileText, Image, File, Loader2,
  ChevronLeft, Check, Circle, Info,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { importBpmn } from "@/lib/bpmnImporter";
import { toast } from "sonner";
import "../components/studio/studio.css";

/* ------------------------------------------------------------------ */
/*  Quick-action presets                                               */
/* ------------------------------------------------------------------ */
const QUICK_ACTIONS = [
  {
    label: "Create An Approval Workflow",
    description: `1. Process Name: Approval Workflow
2. Purpose: Route items through one or more approval stages with accept/reject outcomes
3. Trigger: When a new request is submitted
4. Inputs: The request form with all relevant details
5. Outputs: Approved or rejected decision with comments
6. High Level:
   a. Receive the request and validate required fields
   b. Route to the appropriate approver based on type/amount
   c. Approver reviews and either approves or rejects
   d. If rejected, notify the requester with the reason
   e. If approved, proceed to the next stage or complete`,
  },
  {
    label: "Add A Service Task",
    description: `1. Process Name: Service Task Workflow
2. Purpose: Execute an automated service task that processes data without human intervention
3. Trigger: When triggered by an upstream process or schedule
4. Inputs: Data payload to be processed
5. Outputs: Processed result sent downstream
6. High Level:
   a. Receive the input data
   b. Validate and transform the data
   c. Execute the external service call
   d. Handle the response and update status
   e. Send notification on completion or failure`,
  },
  {
    label: "Generate Workflow Templates",
    description: `1. Process Name: Custom Workflow
2. Purpose: Describe your custom business process
3. Trigger: (describe what starts this workflow)
4. Inputs: (describe what data is needed)
5. Outputs: (describe the expected results)
6. High Level:
   a. (describe step 1)
   b. (describe step 2)
   c. (describe step 3)`,
  },
];

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  storagePath: string;
  publicUrl: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function CreateWorkflowWizard() {
  const navigate = useNavigate();
  const location = useLocation();
  const routerState = location.state as {
    templateId?: string;
    templateName?: string;
  } | null;

  const [step, setStep] = useState(1);
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genStatus, setGenStatus] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ---------- file upload ---------- */
  const uploadFiles = useCallback(async (fileList: FileList) => {
    setUploading(true);
    const maxSize = 25 * 1024 * 1024; // 25 MB
    const newFiles: UploadedFile[] = [];

    for (const file of Array.from(fileList)) {
      if (file.size > maxSize) {
        toast.error(`${file.name} exceeds 25 MB limit`);
        continue;
      }
      const path = `uploads/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage
        .from("workflow-attachments")
        .upload(path, file);
      if (error) {
        toast.error(`Failed to upload ${file.name}`);
        console.error(error);
        continue;
      }
      const { data: urlData } = supabase.storage
        .from("workflow-attachments")
        .getPublicUrl(path);

      newFiles.push({
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        type: file.type,
        storagePath: path,
        publicUrl: urlData.publicUrl,
      });
    }

    setFiles((prev) => [...prev, ...newFiles]);
    setUploading(false);
  }, []);

  const removeFile = async (file: UploadedFile) => {
    await supabase.storage
      .from("workflow-attachments")
      .remove([file.storagePath]);
    setFiles((prev) => prev.filter((f) => f.id !== file.id));
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
    },
    [uploadFiles]
  );

  /* ---------- generate ---------- */
  const handleGenerate = async () => {
    if (description.trim().length < 5) {
      toast.error("Please provide a longer description.");
      return;
    }

    setGenerating(true);
    setGenStatus("Preparing your workflow description…");
    try {
      // If a template was selected, fetch the template BPMN first
      let templateBpmn: string | undefined;
      if (routerState?.templateId) {
        const res = await fetch(`/samples/${routerState.templateId}.bpmn`);
        if (res.ok) templateBpmn = await res.text();
      }

      setGenStatus("AI is generating your workflow diagram…");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-bpmn`,
        {
          method: "POST",
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ description: description.trim() }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error || `Error ${res.status}`);
      }

      setGenStatus("Processing the generated workflow…");

      const { bpmnXml } = await res.json();
      const result = await importBpmn(bpmnXml, "ai-generated.bpmn");

      setGenStatus("Done! Redirecting to case view configuration…");

      navigate("/create/case-view-config", {
        state: {
          generatedIr: result.caseIr,
          generatedWarnings: result.warnings,
        },
      });
    } catch (err: any) {
      console.error("Generate error:", err);
      toast.error(err.message || "Failed to generate workflow.");
    } finally {
      setGenerating(false);
      setGenStatus("");
    }
  };

  /* ---------- file icon helper ---------- */
  const fileIcon = (type: string) => {
    if (type.startsWith("image/")) return <Image size={16} />;
    if (type.includes("pdf") || type.includes("word") || type.includes("document"))
      return <FileText size={16} />;
    return <File size={16} />;
  };

  const formatSize = (bytes: number) =>
    bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(0)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */
  return (
    <div className="landing-page" style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 8 }}>
        <button
          className="landing-page-btn"
          onClick={() => navigate("/")}
          style={{ display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 12 }}
        >
          <ChevronLeft size={14} /> Back
        </button>
        <h1 className="landing-hero-title" style={{ fontSize: "1.5rem", marginBottom: 4 }}>
          {step === 1 ? "Create New Workflow" : "AI Automated Workflow"}
        </h1>
        <p className="landing-hero-subtitle" style={{ fontSize: "0.85rem", marginBottom: 0 }}>
          {step === 1
            ? "Describe the workflow you are trying to design as much detail as possible and in a structured format."
            : "Set up your new AI Automated Workflow. Please follow the guided templates or provide your business requirements."}
        </p>
      </div>

      {/* ============ STEP 1 ============ */}
      {step === 1 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {/* Left: Description */}
          <div>
            {/* Quick actions */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              {QUICK_ACTIONS.map((qa) => (
                <button
                  key={qa.label}
                  className="landing-create-btn"
                  style={{ fontSize: "0.75rem", padding: "4px 10px" }}
                  onClick={() => setDescription(qa.description)}
                >
                  {qa.label}
                </button>
              ))}
            </div>

            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
              style={{ minHeight: 340 }}
              placeholder={`Describe the workflow you are trying to design as much detail as possible and in a structured format, so that your questions and workflow design can be as close to your specifications as possible.

Example: Beverly Workflow
1. Process Name: Email Semantic Search (Legal)
2. Purpose: Automatically retrieve information from one mailbox...
3. Business Owner: Beverly owns this workflow...
4. Trigger: A new email arrives...
5. Inputs: The input is the email account...
6. Outputs: Send an email to the new address...
7. High Level:
   a. When the workflow is triggered...
   b. Analyze the information...
   c. Send an attachment...`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Right: Attachments */}
          <div>
            <h3
              style={{
                fontSize: "0.9rem",
                fontWeight: 600,
                color: "hsl(var(--foreground))",
                marginBottom: 8,
              }}
            >
              Add attachment
            </h3>
            <p style={{ fontSize: "0.8rem", color: "hsl(var(--foreground-muted))", marginBottom: 12 }}>
              To add attached files to this Case, click "Add"
            </p>

            {/* Drop zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: "2px dashed hsl(var(--primary) / 0.3)",
                borderRadius: 8,
                padding: "32px 16px",
                textAlign: "center",
                cursor: "pointer",
                backgroundColor: "hsl(var(--primary-dim))",
                marginBottom: 12,
              }}
            >
              <Upload
                size={28}
                style={{ margin: "0 auto 8px", color: "hsl(var(--primary))" }}
              />
              <p style={{ fontSize: "0.85rem", color: "hsl(var(--foreground))" }}>
                Drag & Drop or{" "}
                <span style={{ color: "hsl(var(--primary))", fontWeight: 600 }}>Browse files</span>{" "}
                to upload
              </p>
              <p style={{ fontSize: "0.75rem", color: "hsl(var(--foreground-muted))", marginTop: 4 }}>
                (Maximum single file size: 25mb; Maximum total file size: 25mb)
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              style={{ display: "none" }}
              onChange={(e) => e.target.files && uploadFiles(e.target.files)}
            />

            <p style={{ fontSize: "0.75rem", color: "hsl(var(--foreground-muted))", marginBottom: 8 }}>
              Files {files.length}
            </p>
            <p style={{ fontSize: "0.75rem", color: "hsl(var(--foreground-muted))", marginBottom: 16 }}>
              Recommended Files: <strong>BPMN File</strong> with workflow or flow diagrams,{" "}
              <strong>Images</strong> with diagrams or examples and Instruction or Prompt files in{" "}
              <strong>PDF or Word</strong>
            </p>

            {/* File list */}
            {files.length > 0 && (
              <div>
                <p style={{ fontSize: "0.8rem", fontWeight: 600, marginBottom: 8, color: "hsl(var(--foreground))" }}>
                  Attached ({files.length})
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {files.map((f) => (
                    <div
                      key={f.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "6px 10px",
                        borderRadius: 6,
                        backgroundColor: "hsl(var(--primary-dim))",
                        fontSize: "0.8rem",
                      }}
                    >
                      {fileIcon(f.type)}
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {f.name}
                      </span>
                      <span style={{ color: "hsl(var(--foreground-muted))", fontSize: "0.7rem" }}>
                        {formatSize(f.size)}
                      </span>
                      <button onClick={() => removeFile(f)} style={{ color: "hsl(var(--foreground-muted))" }}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {uploading && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: "0.8rem" }}>
                <Loader2 size={14} className="animate-spin" /> Uploading…
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ STEP 2: CHECKLIST ============ */}
      {step === 2 && (
        <div>
          <div
            style={{
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              padding: 24,
              marginBottom: 24,
            }}
          >
            <h3
              style={{
                fontSize: "0.85rem",
                fontWeight: 700,
                letterSpacing: "0.03em",
                textTransform: "uppercase",
                color: "hsl(var(--primary))",
                marginBottom: 20,
              }}
            >
              Checklist – For Application Setup
            </h3>

            {/* Step 1: Details */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 20 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  backgroundColor: "hsl(var(--primary))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Check size={14} color="white" />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                    Details and Workflow Configuration
                  </span>
                  <Info size={14} style={{ color: "hsl(var(--foreground-muted))" }} />
                </div>
                <p style={{ fontSize: "0.75rem", color: "hsl(var(--foreground-muted))", marginTop: 2 }}>
                  Description provided · {files.length} file{files.length !== 1 ? "s" : ""} attached
                </p>
              </div>
            </div>

            {/* Step 2: Review */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 20 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  backgroundColor: "hsl(var(--primary))",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: "0.8rem",
                  fontWeight: 700,
                }}
              >
                2
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>Review and Overview</span>
                  <Info size={14} style={{ color: "hsl(var(--foreground-muted))" }} />
                </div>
                <p style={{ fontSize: "0.75rem", color: "hsl(var(--foreground-muted))", marginTop: 2 }}>
                  Review the workflow designed by the AI, and see an overall summary.
                </p>
              </div>
            </div>

            {/* Step 3: Deployment */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  border: "2px solid hsl(var(--border))",
                  color: "hsl(var(--foreground-muted))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: "0.8rem",
                  fontWeight: 700,
                }}
              >
                3
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "hsl(var(--foreground-muted))" }}>
                    Deployment
                  </span>
                  <Info size={14} style={{ color: "hsl(var(--foreground-subtle))" }} />
                </div>
              </div>
            </div>
          </div>

          {/* Ready message */}
          <div style={{ marginBottom: 24 }}>
            {generating ? (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <Loader2 size={32} className="animate-spin" style={{ margin: "0 auto 12px", color: "hsl(var(--primary))" }} />
                <h3 style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: 6 }}>
                  Generating your workflow…
                </h3>
                <p style={{ fontSize: "0.8rem", color: "hsl(var(--foreground-muted))", lineHeight: 1.5 }}>
                  {genStatus}
                </p>
                <p style={{ fontSize: "0.75rem", color: "hsl(var(--foreground-muted))", marginTop: 8 }}>
                  This typically takes 10–20 seconds depending on complexity.
                </p>
              </div>
            ) : (
              <>
                <h3 style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: 6 }}>
                  The Workflow is now ready to be designed!
                </h3>
                <p style={{ fontSize: "0.8rem", color: "hsl(var(--foreground-muted))", lineHeight: 1.5 }}>
                  You are ready to proceed. Our AI will generate a customized workflow tailored to your
                  specific requirements—no technical expertise required. Please review each section
                  carefully. Should you need to make adjustments, your workflow can be refined at any
                  time.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* ============ FOOTER BUTTONS ============ */}
      <div
        style={{
          display: "flex",
          justifyContent: step === 1 ? "flex-end" : "space-between",
          marginTop: 20,
          paddingTop: 16,
          borderTop: "1px solid hsl(var(--border))",
        }}
      >
        {step === 2 && (
          <button
            className="landing-create-btn"
            style={{ backgroundColor: "hsl(var(--muted))", color: "hsl(var(--foreground))" }}
            onClick={() => setStep(1)}
          >
            Back
          </button>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          {step === 2 && (
            <button
              className="landing-create-btn"
              style={{
                backgroundColor: "transparent",
                border: "1px solid hsl(var(--border))",
                color: "hsl(var(--foreground))",
              }}
              onClick={() => toast.info("Draft saved (feature coming soon)")}
            >
              Save as Draft
            </button>
          )}

          {step === 1 && (
            <button
              className="landing-create-btn"
              onClick={() => setStep(2)}
              disabled={description.trim().length < 5}
              style={{ opacity: description.trim().length < 5 ? 0.5 : 1 }}
            >
              Next
            </button>
          )}

          {step === 2 && (
            <button
              className="landing-create-btn"
              onClick={handleGenerate}
              disabled={generating}
              style={{ minWidth: 100 }}
            >
              {generating ? (
                <>
                  <Loader2 size={14} className="animate-spin" style={{ marginRight: 4, display: "inline" }} />
                  Generating…
                </>
              ) : (
                "Next"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
