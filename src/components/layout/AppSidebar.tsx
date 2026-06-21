import { LayoutGrid, Users, BookmarkCheck, Settings, LogOut, FileText, ShieldCheck } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthz } from "@/contexts/AuthzContext";
import { recordAudit } from "@/lib/authz/audit";
import "../studio/studio.css";

interface NavItem { to: string; icon: typeof LayoutGrid; label: string; perm?: string; }

const navItems: NavItem[] = [
  { to: "/", icon: LayoutGrid, label: "Dashboard", perm: "navigation.view.dashboard" },
  { to: "/workflows", icon: BookmarkCheck, label: "Workflows", perm: "navigation.view.workflowStudio" },
  { to: "/templates", icon: BookmarkCheck, label: "Templates", perm: "navigation.view.templates" },
  { to: "/docs", icon: FileText, label: "Tech Docs" },
  { to: "/admin", icon: ShieldCheck, label: "Admin", perm: "navigation.view.admin" },
  { to: "/profile", icon: Settings, label: "Profile" },
];

export default function AppSidebar() {
  const { can } = useAuthz();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await recordAudit({ action: "auth.logout", decision: "ALLOW" });
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  return (
    <aside className="app-sidebar">
      <nav className="app-sidebar-nav">
        {navItems.filter(i => !i.perm || can(i.perm)).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) => `app-sidebar-link ${isActive ? "app-sidebar-link--active" : ""}`}
            title={item.label}
          >
            <item.icon size={20} />
          </NavLink>
        ))}
      </nav>
      <div className="app-sidebar-bottom">
        <button className="app-sidebar-link" title="Logout" onClick={handleLogout}>
          <LogOut size={20} />
        </button>
      </div>
    </aside>
  );
}
