import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquarePlus, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { importBpmn } from "@/lib/bpmnImporter";
import { toast } from "sonner";

export default function GenerateFromDescriptionCard() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (description.trim().length < 5) {
      toast.error("Please provide a longer description.");
      return;
    }

    setGenerating(true);
    try {
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

      const { bpmnXml } = await res.json();
      const result = await importBpmn(bpmnXml, "ai-generated.bpmn");

      setOpen(false);
      setDescription("");
      navigate("/studio", {
        state: { generatedIr: result.caseIr, generatedWarnings: result.warnings },
      });
    } catch (err: any) {
      console.error("Generate BPMN error:", err);
      toast.error(err.message || "Failed to generate workflow. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <div className="landing-template-card">
        <div className="landing-template-preview">
          <div className="landing-template-preview-lines">
            <div className="landing-template-line landing-template-line--long" />
            <div className="landing-template-line landing-template-line--med" />
            <div className="landing-template-line landing-template-line--short" />
            <div className="landing-template-line landing-template-line--long" />
            <div className="landing-template-line landing-template-line--med" />
          </div>
        </div>

        <div className="landing-template-body">
          <div className="landing-template-meta">
            <span className="landing-template-label">AI Generate</span>
            <div className="landing-template-name-row">
              <div className="landing-template-icon">
                <MessageSquarePlus size={16} />
              </div>
              <h3 className="landing-template-name">Describe a Workflow</h3>
            </div>
          </div>
          <p className="landing-template-desc">
            Describe your workflow in plain English and let AI generate a complete BPMN process for you automatically.
          </p>
          <button className="landing-create-btn" onClick={() => setOpen(true)}>
            Describe
          </button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Describe Your Workflow</DialogTitle>
            <DialogDescription>
              Describe the process you want to create in plain English. AI will generate a complete workflow for you.
            </DialogDescription>
          </DialogHeader>

          <textarea
            className="w-full min-h-[140px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
            placeholder="e.g. An invoice approval process where invoices are received, reviewed by a manager, and either approved for payment or rejected with a reason..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={generating}
          />

          <DialogFooter>
            <button
              className="landing-create-btn"
              onClick={handleGenerate}
              disabled={generating || description.trim().length < 5}
              style={{ opacity: generating || description.trim().length < 5 ? 0.6 : 1 }}
            >
              {generating ? (
                <>
                  <Loader2 size={14} className="animate-spin mr-1 inline" />
                  Generating…
                </>
              ) : (
                "Generate Workflow"
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
