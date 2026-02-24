import { useState, useRef, useEffect } from "react";
import { Settings, User, LogOut, ChevronDown } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import "../studio/studio.css";

export default function AppHeader() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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
          <Settings size={16} />
          <span>Settings</span>
        </Link>

        {/* Profile dropdown */}
        <div ref={ref} style={{ position: "relative" }}>
          <button
            className="app-header-profile-btn"
            onClick={() => setOpen((v) => !v)}
          >
            <div className="app-header-avatar">
              <User size={14} />
            </div>
            <span>Admin</span>
            <ChevronDown size={12} style={{ opacity: 0.6 }} />
          </button>

          {open && (
            <div className="app-header-dropdown">
              <button
                className="app-header-dropdown-item"
                onClick={() => { setOpen(false); navigate("/profile"); }}
              >
                <User size={14} /> Profile
              </button>
              <div className="app-header-dropdown-divider" />
              <button
                className="app-header-dropdown-item app-header-dropdown-item--danger"
                onClick={() => { setOpen(false); }}
              >
                <LogOut size={14} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
