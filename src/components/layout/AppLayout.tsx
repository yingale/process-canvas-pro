import { Outlet } from "react-router-dom";
import AppHeader from "./AppHeader";
import AppSidebar from "./AppSidebar";
import AppFooter from "./AppFooter";
import "../studio/studio.css";

export default function AppLayout() {
  return (
    <div className="app-layout">
      <AppSidebar />
      <div className="app-layout-right">
        <AppHeader />
        <main className="app-layout-main">
          <Outlet />
        </main>
        <AppFooter />
      </div>
    </div>
  );
}
