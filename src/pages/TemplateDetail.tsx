import { useSearchParams } from "react-router-dom";
import { Settings as SettingsIcon, ArrowLeft, FileText, Clock, User } from "lucide-react";
import "../components/studio/studio.css";

const templateData: Record<string, { name: string; description: string; details: string }> = {
  blank: {
    name: "Create New Workflow",
    description: "Basic core functionality to create a new workflow using our AI workflow assistant.",
    details:
      "This framework provides the foundational structure required to build workflows from scratch. It includes AI-assisted step generation, form creation, and persona/user configuration. Ideal for starting a completely custom process.",
  },
  "email-fetcher": {
    name: "Email Miner",
    description:
      "Automated email processing workflow that validates, categorizes, and routes incoming emails.",
    details:
      "The Email Miner template automates the entire lifecycle of incoming email processing. It validates sender authenticity, categorizes the email by intent, extracts key data, and routes it to the appropriate case action — whether creating a new case, updating an existing one, or cloning a reference.",
  },
  "file-processing": {
    name: "File Processing Workflow",
    description:
      "Scheduled workflow that fetches emails, processes attachments in parallel, and sends notifications.",
    details:
      "This template sets up a scheduled workflow that periodically polls for new emails, extracts and processes file attachments in parallel lanes, validates file integrity, and triggers notification emails upon successful completion.",
  },
};

export default function TemplateDetail() {
  const [params] = useSearchParams();
  const id = params.get("id") ?? "blank";
  const template = templateData[id] ?? templateData["blank"];

  return (
    <div className="landing-page" style={{ maxWidth: 800 }}>
      <a href="/" className="landing-back-link">
        <ArrowLeft size={14} /> Back to Dashboard
      </a>

      <div className="detail-card">
        <div className="detail-card-header">
          <div className="landing-template-icon" style={{ width: 40, height: 40 }}>
            <SettingsIcon size={20} />
          </div>
          <div>
            <span className="landing-template-label">Template</span>
            <h1 className="detail-title">{template.name}</h1>
          </div>
        </div>

        <p className="detail-description">{template.description}</p>

        <div className="detail-section">
          <h2 className="detail-section-title">
            <FileText size={14} /> Details
          </h2>
          <p className="detail-body">{template.details}</p>
        </div>

        <div className="detail-meta-row">
          <span className="detail-meta">
            <Clock size={12} /> Last updated: Feb 2026
          </span>
          <span className="detail-meta">
            <User size={12} /> System Template
          </span>
        </div>
      </div>
    </div>
  );
}
