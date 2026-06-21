import { useNavigate } from "react-router-dom";
import { MessageSquarePlus } from "lucide-react";
import { Can } from "@/components/authz/Can";

export default function GenerateFromDescriptionCard() {
  const navigate = useNavigate();

  return (
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
        <Can perm="workflow.create">
          <button className="landing-create-btn" onClick={() => navigate("/create")}>
            Describe
          </button>
        </Can>
      </div>
    </div>
  );
}
