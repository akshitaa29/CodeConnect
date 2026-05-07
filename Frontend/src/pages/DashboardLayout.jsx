import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../component/Sidebar";
import Header from "../component/Header";
import "../styles/DashboardLayout.css";

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <>
      <Header
        isDashboard
        sidebarOpen={sidebarOpen}
        toggleSidebar={() => setSidebarOpen(prev => !prev)}
      />

      <div className="dashboard-wrapper">
        {/* Sidebar ALWAYS mounted */}
        <Sidebar isOpen={sidebarOpen} />

        <main
          className={`dashboard-content ${
            sidebarOpen ? "with-sidebar" : "full"
          }`}
        >
          <Outlet />
        </main>
      </div>
    </>
  );
}
