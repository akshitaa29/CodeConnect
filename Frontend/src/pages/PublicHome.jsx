import { useNavigate } from "react-router-dom";
import { useState,useEffect } from "react";
import "../styles/PublicHome.css";
import {
  Users,
  FolderGit2,
  MessageCircle,
  UserPlus
} from "lucide-react";


import logo from "../assets/CCLogo.png";


export default function PublicHome() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);

  const [profileMenu, setProfileMenu] = useState(false);

  useEffect(() => {
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

  const isLoggedIn = Boolean(
    user && (localStorage.getItem("idToken") || localStorage.getItem("token"))
  );

  const goLogin = () => navigate("/login");

  return (

  <div className="public-container">
 
   <header className="public-header">
  <div className="brand">
    <img src={logo} alt="CodeConnect" />
    <span>CodeConnect</span>
  </div>

 
    <div className="header-right">

                {!isLoggedIn && (
            <button
              className="login-btn"
              onClick={() => navigate("/login")}
            >
              Login
            </button>
          )}

               {isLoggedIn && (
            <>
              {/* {<button
                className="dashboard-btn"
                onClick={() => setSidebarOpen(true)}
              >
               Dashboard
              </button> } */}
              <button
                className="dashboard-btn"
                onClick={() => navigate("/dashboard/profile")}
              >
                Dashboard
                </button>

              <div className="profile-wrapper">
  <img
    src={user?.photoURL || user?.profilePhoto || "/default-avatar.png"}
    className="profile-avatar"
    alt="Profile"
    onClick={() => setProfileMenu(!profileMenu)}
    onError={(e) => {
      e.currentTarget.src = "/default-avatar.png";
    }}
  />

  {profileMenu && (
    <div className="profile-menu">
      {/* <p onClick={() => navigate("/profile")}>Profile</p>
      <p>Settings</p> */}
      <p
        className="logout"
        onClick={() => {
          localStorage.removeItem("idToken");
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.href = "/";
        }}
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



      {/* HERO SECTION */}
      <div className="hero-section">
        <div className="hero-left">
          <h1 className="hero-title">
  Connect. <span className="highlight">Build.</span> Grow.
</h1>

          

          <p className="hero-sub">
            Connect with developers, find coding matches, and collaborate
            on exciting projects.
          </p>

          <div className="hero-actions">
            <button
              className="primary-btn"
              onClick={() =>
                isLoggedIn ? navigate("dashboard/match") : navigate("/login")
              }
            >
              Find Matches
            </button>

            <button
              className="secondary-btn"
              onClick={() =>
                isLoggedIn ? navigate("dashboard/projects") : navigate("/login")
              }
            >
              Explore Projects
            </button>
          </div>
        </div>

        {/* Right Animated Visual Area */}
        <div className="hero-right">
          <img
            src="https://cdn-icons-png.flaticon.com/512/4712/4712109.png"
            className="floating-img"
            alt="developers"
          />
        </div>
      </div>

      {/* QUICK ACTIONS */}
      {/* QUICK ACTIONS */}
<div className="quick-actions">
  <h2>Quick Actions</h2>

  <div className="card-grid">

    <div className="action-card">
      <div className="action-icon">
        <Users size={42} />
      </div>
      <h3>Find Coding Partners</h3>
      <p>Connect with developers like you</p>
    </div>

    <div className="action-card">
      <div className="action-icon">
        <FolderGit2 size={42} />
      </div>
      <h3>Explore Projects</h3>
      <p>Join exciting real-world projects</p>
    </div>

    <div className="action-card">
      <div className="action-icon">
        <MessageCircle size={42} />
      </div>
      <h3>Developer Messages</h3>
      <p>Chat & collaborate instantly</p>
    </div>

    <div className="action-card">
      <div className="action-icon">
        <UserPlus size={42} />
      </div>
      <h3>Build Your Profile</h3>
      <p>Showcase your skills & work</p>
    </div>

  </div>
</div>


      {/* ABOUT SECTION */}
      <div className="about-section">
  <div className="about-container">

    {/* LEFT */}
    <div className="about-text">
      <h2>
        About <span className="gradient-text">CodeConnect</span>
      </h2>

      <p>
        CodeConnect is your ultimate developer network where ideas turn into
        real-world projects. Collaborate with like-minded coders, discover
        exciting opportunities, and grow together.
      </p>

      {/* <div className="about-features">
        <div>🚀 Find coding partners instantly</div>
        <div>💡 Work on real-world projects</div>
        <div>💬 Chat & collaborate seamlessly</div>
        <div>📈 Grow your developer profile</div>
      </div> */}
    </div>

    {/* RIGHT VISUAL */}
    {/* <div className="about-visual">
      <div className="about-glow"></div>
      <img
        src="https://cdn-icons-png.flaticon.com/512/1055/1055687.png"
        alt="collaboration"
      />
    </div> */}

  </div>
</div>
            <footer className="footer">
  <div className="footer-container">
    
    {/* LEFT */}
    <div className="footer-brand">
      <h2>CodeConnect</h2>
      <p>Connect. Build. Grow with Developers.</p>
    </div>

    {/* LINKS */}
    <div className="footer-links">
      <div>
        <h4>Platform</h4>
        <a href="#">Find Matches</a>
        <a href="#">Explore Projects</a>
        <a href="#">Messages</a>
      </div>

      <div>
        <h4>Company</h4>
        <a href="#">About</a>
        <a href="#">Contact</a>
        <a href="#">Privacy Policy</a>
      </div>

      <div>
        <h4>Resources</h4>
        <a href="#">Docs</a>
        <a href="#">Help Center</a>
        <a href="#">Community</a>
      </div>
    </div>

  </div>

  {/* BOTTOM */}
  <div className="footer-bottom">
    © {new Date().getFullYear()} CodeConnect. All rights reserved.
  </div>
</footer>

    
    </div>

    
    
  );
  
}
