import { useNavigate } from "react-router-dom";
import { Star, Search, Download, Settings as SettingsIcon, Plus } from "lucide-react";
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

const sampleWorkflows = [
  {
    name: "Workflow Example",
    modified: "June 5, 2023",
    owner: "James Stewart",
    type: "App Framework Name 1",
    status: "DRAFT",
  },
  {
    name: "Name of Workflow",
    modified: "May 22, 2022",
    owner: "Mike Smith",
    type: "App Framework Name 1",
    status: "PUBLISHED",
  },
  {
    name: "Name of Workflow",
    modified: "March 8, 2021",
    owner: "Lisa Lang",
    type: "App Framework Name 1",
    status: "ARCHIVED",
  },
];

export default function Landing() {
  const navigate = useNavigate();

  const handleTemplateClick = (template: Template) => {
    if (template.isDefault) {
      navigate("/studio");
    } else {
      navigate(`/studio?template=${template.bpmnFile}`);
    }
  };

  return (
    <div className="landing-page">
      {/* Hero */}
      <div className="landing-hero">
        <h1 className="landing-hero-title">AI Automated Workflow</h1>
        <p className="landing-hero-subtitle">
          The AI Automated Workflow allows for automating mundane tasks and business processes. You
          can design your workflow from scratch or base it off an existing template.
        </p>
      </div>

      {/* Templates Section */}
      <section className="landing-section">
        <div className="landing-section-header">
          <h2 className="landing-section-title">My Favorite Templates</h2>
          <button className="landing-view-all-btn">View All &gt;</button>
        </div>

        <div className="landing-templates-grid">
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
      </section>

      {/* Your Workflows Section */}
      <section className="landing-section">
        <div className="landing-section-header">
          <h2 className="landing-section-title">Your Workflows</h2>
          <button className="landing-view-all-btn">View All &gt;</button>
          <div className="landing-workflows-actions">
            <button className="landing-export-btn">
              <Download size={14} />
              <span>Export</span>
            </button>
            <div className="landing-search-box">
              <Search size={14} />
              <input type="text" placeholder="Search" className="landing-search-input" />
            </div>
          </div>
        </div>

        <div className="landing-table-wrap">
          <table className="landing-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Modified</th>
                <th>Owner</th>
                <th>Type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sampleWorkflows.map((w, i) => (
                <tr key={i}>
                  <td>
                    <div className="landing-table-name-cell">
                      <div className="landing-table-icon">
                        <SettingsIcon size={14} />
                      </div>
                      <span>{w.name}</span>
                    </div>
                  </td>
                  <td>{w.modified}</td>
                  <td>{w.owner}</td>
                  <td>{w.type}</td>
                  <td>
                    <span
                      className={`landing-status-badge landing-status-badge--${w.status.toLowerCase()}`}
                    >
                      {w.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
