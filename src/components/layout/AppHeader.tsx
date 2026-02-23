import { Settings, User } from "lucide-react";
import { Link } from "react-router-dom";
import "../studio/studio.css";

export default function AppHeader() {
  return (
    <header className="app-header">
      <div className="app-header-brand">
        <div className="app-header-logo">
          <div className="app-header-logo-inner" />
        </div>
        <span className="app-header-title">AI Automated Workflow</span>
      </div>
      <div className="app-header-actions">
        <Link to="/" className="app-header-nav-link">
          <User size={16} />
          <span>Profile</span>
        </Link>
        <Link to="/" className="app-header-nav-link">
          <Settings size={16} />
          <span>Settings</span>
        </Link>
      </div>
    </header>
  );
}
