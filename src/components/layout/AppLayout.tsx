import { Outlet } from "react-router-dom";
import AppHeader from "./AppHeader";
import AppSidebar from "./AppSidebar";
import AppFooter from "./AppFooter";
import "../studio/studio.css";

export default function AppLayout() {
  return (
    <div className="app-layout">
      <AppHeader />
      <div className="app-layout-body">
        <AppSidebar />
        <main className="app-layout-main">
          <Outlet />
        </main>
      </div>
      <AppFooter />
    </div>
  );
}
