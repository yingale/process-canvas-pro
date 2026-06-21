import { useState, useRef, useEffect } from "react";
import { Settings, User, LogOut, ChevronDown, ChevronRight, Home } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { recordAudit } from "@/lib/authz/audit";
import { toast } from "sonner";
import { useAuthz } from "@/contexts/AuthzContext";
import "../studio/studio.css";

const ROUTE_LABELS: Record<string, string> = {
  "/": "Dashboard",
  "/create": "Create Workflow",
  "/studio": "Studio",
  "/templates": "All Templates",
  "/workflows": "All Workflows",
  "/profile": "Profile",
  "/settings": "Settings",
  "/teams": "Teams",
  "/favorites": "Favorites",
};

function Breadcrumbs() {
  const { pathname } = useLocation();

  if (pathname === "/") return null;

  const label = ROUTE_LABELS[pathname] ?? pathname.replace("/", "");

  return (
    <nav className="app-breadcrumb">
      <Link to="/" className="app-breadcrumb-link">
        <Home size={12} />
        <span>Dashboard</span>
      </Link>
      <ChevronRight size={12} className="app-breadcrumb-sep" />
      <span className="app-breadcrumb-current">{label}</span>
    </nav>
  );
}

export default function AppHeader() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useAuthz();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header className="app-header">
      <div className="app-header-left">
        <div className="app-header-brand">
          <div className="app-header-logo">
            <div className="app-header-logo-inner" />
          </div>
          <span className="app-header-title">AI Automated Workflow</span>
        </div>
        <Breadcrumbs />
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
            <span>{user?.name || user?.email || "Profile"}</span>
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
                onClick={async () => {
                  setOpen(false);
                  try {
                    await recordAudit({ action: "auth.logout", decision: "ALLOW" });
                    await supabase.auth.signOut();
                    toast.success("Signed out");
                  } catch (e) {
                    console.error(e);
                  }
                  navigate("/auth", { replace: true });
                }}
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
