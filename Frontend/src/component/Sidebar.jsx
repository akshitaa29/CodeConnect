import { NavLink } from "react-router-dom";
import "../styles/Sidebar.css";

export default function Sidebar({ isOpen }) {
  return (
    <aside className={`sidebar ${isOpen ? "open" : "closed"}`}>
      

      <nav className="sidebar-nav">
        <NavLink to="/dashboard/profile">Profile</NavLink>
        <NavLink to="/dashboard/match">Matches</NavLink>
        <NavLink to="/dashboard/projects">Projects</NavLink>
        <NavLink to="/dashboard/messages">Messages</NavLink>
        <NavLink to="/dashboard/groups">Groups</NavLink>
      </nav>

      <button
        className="logout-btn"
        onClick={() => {
          localStorage.removeItem("idToken");
          localStorage.removeItem("token");
          window.location.href = "/";
        }}
      >
        Logout
      </button>
    </aside>
  );
}

