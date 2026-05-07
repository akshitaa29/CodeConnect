import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import logo from "../assets/CCLogo.png";
import "../styles/Header.css";
import NotificationBell from "../component/NotificationBell";
import { apiFetch } from "../utils/api";
import { auth } from "../firebase";


export default function Header({
  isDashboard = false,
  sidebarOpen,
  toggleSidebar
}) {
  const navigate = useNavigate();
  const [profileMenu, setProfileMenu] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [notificationCount, setNotificationCount] = useState(0);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch {}

    localStorage.clear();
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    setIsLoggedIn(
      !!(localStorage.getItem("idToken") || localStorage.getItem("token"))
    );
    const syncUser = () => {
      const storedUser = localStorage.getItem("user");
      setUser(storedUser ? JSON.parse(storedUser) : null);
    };

    syncUser();

    const handleStorage = (event) => {
      if (event.key === "user") {
        syncUser();
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("userUpdated", syncUser);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("userUpdated", syncUser);
    };
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      setNotificationCount(0);
      return;
    }

    async function fetchCount() {
      try {
        const res = await apiFetch("/api/notifications/unread-count");
        if (res.success) {
          setNotificationCount(res.count || 0);
        }
      } catch (err) {
        console.error("Failed to fetch notification count", err);
      }
    }

    fetchCount();
  }, [isLoggedIn]);

  return (
    <header className={isDashboard ? "dashboard-header" : "public-header"}>
      
      {/* LEFT */}
      <div className="brand">
        {isDashboard && (
          <button
            className="sidebar-toggle"
            onClick={toggleSidebar}
          >
            {sidebarOpen ? "❮" : "☰"}
          </button>
        )}

        <img src={logo} alt="CodeConnect" onClick={() => navigate("/")} />
        <span>CodeConnect</span>
      </div>

      {/* RIGHT */}
      <div className="header-right">
        {!isLoggedIn && (
          <button className="login-btn" onClick={() => navigate("/login")}>
            Login
          </button>
        )}

       {isLoggedIn && (
  <>
    {/* 🔔 Notification Bell */}
    <NotificationBell count={notificationCount} />

    {/* 👤 Profile */}
    <div className="profile-wrapper">
      <img
        src={user?.photoURL || user?.profilePhoto || "/default-avatar.png"}
        className="profile-avatar"
        onClick={() => setProfileMenu(!profileMenu)}
        onError={(e) => {
          e.currentTarget.src = "/default-avatar.png";
        }}
      />

      {profileMenu && (
        <div className="profile-menu">
          {/* <p onClick={() => navigate("/dashboard/profile")}>Profile</p>
          <p>Settings</p> */}
          <p
            className="logout"
            onClick={handleLogout}
          >
            Logout
          </p>
        </div>
      )}
    </div>
  </>
)}
</div>
    </header>
  );
}
