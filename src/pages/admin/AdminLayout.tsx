import { NavLink, Outlet } from "react-router-dom";
import { Users, Building2, UserCircle, ShieldCheck, FileWarning, ScrollText } from "lucide-react";

const tabs = [
  { to: "/admin/users",    icon: Users,        label: "Users" },
  { to: "/admin/teams",    icon: Building2,    label: "Teams" },
  { to: "/admin/personas", icon: UserCircle,   label: "Personas" },
  { to: "/admin/roles",    icon: ShieldCheck,  label: "Roles" },
  { to: "/admin/policies", icon: FileWarning,  label: "Policies" },
  { to: "/admin/audit",    icon: ScrollText,   label: "Audit Log" },
];

export default function AdminLayout() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <header className="mb-6">
        <h1 className="text-xl font-bold">Authorization Admin</h1>
        <p className="text-sm text-muted-foreground">Manage users, teams, personas, roles, policies, and audit.</p>
      </header>
      <nav className="flex gap-1 border-b mb-6">
        {tabs.map(t => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.to === "/admin/users"}
            className={({ isActive }) =>
              `inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                isActive ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`
            }
          >
            <t.icon size={14} />
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
