import { useNavigate } from "react-router-dom";
import { Star, Plus, Settings as SettingsIcon } from "lucide-react";
import GenerateFromDescriptionCard from "@/components/landing/GenerateFromDescriptionCard";
import "../components/studio/studio.css";

interface Template {
  id: string;
  name: string;
  description: string;
  bpmnFile: string;
  isDefault?: boolean;
}

const templates: Template[] = [
  {
    id: "blank",
    name: "Create New Workflow",
    description:
      "This framework has basic core functionality required in order to create a new workflow using our AI workflow assistant, forms and unique personas and users",
    bpmnFile: "",
    isDefault: true,
  },
  {
    id: "email-fetcher",
    name: "Email Miner",
    description:
      "Automated email processing workflow that validates, categorizes, and routes incoming emails to appropriate case actions (new, update, clone)",
    bpmnFile: "email_fetcher",
  },
  {
    id: "file-processing",
    name: "File Processing Workflow",
    description:
      "Scheduled workflow that fetches emails, processes attachments in parallel, and sends notification emails upon completion",
    bpmnFile: "file_processing",
  },
];

export default function AllTemplates() {
  const navigate = useNavigate();

  const handleTemplateClick = (template: Template) => {
    if (template.isDefault) {
      navigate("/create");
    } else {
      navigate("/create", {
        state: { templateId: template.bpmnFile, templateName: template.name },
      });
    }
  };

  return (
    <div className="landing-page">
      <h1 className="landing-hero-title" style={{ fontSize: 22 }}>All Templates</h1>
      <p className="landing-hero-subtitle" style={{ marginBottom: 28 }}>
        Browse all available workflow templates. Pick one to get started quickly.
      </p>

      <div className="landing-templates-grid">
        <GenerateFromDescriptionCard />
        {templates.map((t) => (
          <div key={t.id} className="landing-template-card">
            <div className="landing-template-preview">
              <div className="landing-template-preview-lines">
                <div className="landing-template-line landing-template-line--long" />
                <div className="landing-template-line landing-template-line--med" />
                <div className="landing-template-line landing-template-line--short" />
                <div className="landing-template-line landing-template-line--long" />
                <div className="landing-template-line landing-template-line--med" />
              </div>
              {!t.isDefault && (
                <button className="landing-template-star">
                  <Star size={18} />
                </button>
              )}
            </div>

            <div className="landing-template-body">
              <div className="landing-template-meta">
                <span className="landing-template-label">
                  {t.isDefault ? "Default" : "Template"}
                </span>
                <div className="landing-template-name-row">
                  <div className="landing-template-icon">
                    {t.isDefault ? <Plus size={16} /> : <SettingsIcon size={16} />}
                  </div>
                  <h3 className="landing-template-name">{t.name}</h3>
                </div>
              </div>
              <p className="landing-template-desc">{t.description}</p>
              <button
                className="landing-create-btn"
                onClick={() => handleTemplateClick(t)}
              >
                Create
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
