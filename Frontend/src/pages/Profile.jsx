import "../styles/Profile.css";
import "../component/Header";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiFetch, getUserFriendlyErrorMessage, getUserProfile } from "../utils/api";


const calculateCompletion = (user) => {
  if (!user) return 0;

  let completed = 0;
  const total = 7;

  if (user.name) completed++;
  if (user.bio || user.about || user.profile) completed++;
  if (user.skills && user.skills.length > 0) completed++;
  if (user.batch) completed++;
  if (user.branch) completed++;
  if (user.photoURL || user.profilePhoto) completed++;
  if (user.links?.github || user.links?.linkedin) completed++;

  return Math.round((completed / total) * 100);
};


export default function Profile() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ matches: 0, projects: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const currentUserId =
    JSON.parse(localStorage.getItem("user") || "null")?.email ||
    localStorage.getItem("email") ||
    "";

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      setLoading(true);
      setError("");
      try {
        const profile = await getUserProfile();
        if (!isMounted) return;
        setUser(profile);
        localStorage.setItem("user", JSON.stringify(profile));
        window.dispatchEvent(new Event("userUpdated"));
      } catch (err) {
        if (!isMounted) return;
        setError(getUserFriendlyErrorMessage(err, "Failed to load profile"));
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadStats = async () => {
      if (!currentUserId) {
        if (isMounted) {
          setStats({ matches: 0, projects: 0 });
        }
        return;
      }

      try {
        const data = await apiFetch(`/api/profile/stats/${currentUserId}`);
        if (!isMounted) return;
        setStats({
          matches: data.matches || 0,
          projects: data.projects || 0,
        });
      } catch {
        if (!isMounted) return;
        setStats({ matches: 0, projects: 0 });
      }
    };

    loadStats();

    return () => {
      isMounted = false;
    };
  }, [currentUserId]);

  const completion = calculateCompletion(user);


  if (loading) {
    return (
      <div className="profile-page">
        <p style={{ color: "#c7c7c7" }}>Loading profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-page">
        <p style={{ color: "#ff6b6b" }}>{error}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile-page">
        <p style={{ color: "#c7c7c7" }}>
          No profile found. Please create your profile.
        </p>
      </div>
    );
  }

  const avatarSrc = user?.photoURL || user?.profilePhoto || "/default-avatar.png";


  return (
    <div className="profile-page">

      <h2 className="profile-page-title">My Profile</h2>

      <div className="profile-completion-card">
  <div className="completion-header">
    <span>Profile Completion</span>
    <span>{completion}%</span>
  </div>

  <div className="completion-bar">
    <div
      className="completion-fill"
      style={{ width: `${completion}%` }}
    />
  </div>

  {completion < 100 && (
    <p className="completion-hint">
      Complete your profile to get better matches
    </p>
  )}
</div>


      {/* HEADER CARD */}
      <div className="profile-header-card">
        <div className="profile-avatar-large">
  <img
    src={avatarSrc}
    alt="Profile"
    onError={(e) => {
      e.currentTarget.src = "/default-avatar.png";
    }}
  />
</div>


        <div className="profile-header-info">
          <h1>{user.name || "Your Name"}</h1>
          

          <button className="edit-profile-btn" onClick={() => navigate("/dashboard/edit-profile")}>
            Edit Profile
          </button>
        </div>
      </div>

      {/* GRID */}
      <div className="profile-grid">

        {/* LEFT */}
        <div className="profile-card1">
          <h3>About</h3>
          <p>
            {user.bio || user.about || user.profile || "Tell something about yourself"}
          </p>

          <h3>Skills</h3>
          <div className="skill-tags">
            {user.skills?.length > 0 ? (
              user.skills.map((skill, index) => (
                <span key={index}>{skill}</span>
              ))
            ) : (
              <span>Add skills</span>
            )}
          </div>

         <div className="academic-info">
  <div>
    <span className="label">Batch</span>
    <span className="value">{user.batch || "—"}</span>
  </div>

  <div>
    <span className="label">Branch</span>
    <span className="value">{user.branch || "—"}</span>
  </div>
</div>
</div>

        {/* RIGHT */}
        <div className="profile-card1">
          <h3>Stats</h3>
          <div className="stats-grid">
            <div>
              <strong>{stats.projects}</strong>
              <span>Projects</span>
            </div>
            <div>
              <strong>{stats.matches}</strong>
              <span>Matches</span>
            </div>
          </div>
        
  <h3>Links</h3>

  <div className="profile-links">
    {user?.links?.github && (
      <a
        href={user.links.github}
        target="_blank"
        rel="noopener noreferrer"
      >
        GitHub
      </a>
    )}

    {user?.links?.linkedin && (
      <a
        href={user.links.linkedin}
        target="_blank"
        rel="noopener noreferrer"
      >
        LinkedIn
      </a>
    )}

    {!user?.links?.github && !user?.links?.linkedin && (
      <span className="empty-text">No links added yet</span>
    )}
  </div>
       </div>


           </div>
         </div>
    
  );
}
