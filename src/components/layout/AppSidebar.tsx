import { LayoutGrid, Users, BookmarkCheck, Settings, LogOut, FileText } from "lucide-react";
import { NavLink } from "react-router-dom";
import "../studio/studio.css";

const navItems = [
  { to: "/", icon: LayoutGrid, label: "Dashboard" },
  { to: "/teams", icon: Users, label: "Teams" },
  { to: "/favorites", icon: BookmarkCheck, label: "Favorites" },
  { to: "/settings", icon: Settings, label: "Settings" },
  { to: "/docs", icon: FileText, label: "Tech Docs" },
];

export default function AppSidebar() {
  return (
    <aside className="app-sidebar">
      <nav className="app-sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end
            className={({ isActive }) =>
              `app-sidebar-link ${isActive ? "app-sidebar-link--active" : ""}`
            }
            title={item.label}
          >
            <item.icon size={20} />
          </NavLink>
        ))}
      </nav>
      <div className="app-sidebar-bottom">
        <button className="app-sidebar-link" title="Logout">
          <LogOut size={20} />
        </button>
      </div>
    </aside>
  );
}
