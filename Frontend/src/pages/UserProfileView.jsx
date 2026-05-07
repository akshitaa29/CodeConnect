import { useParams, useNavigate } from "react-router-dom";
// import { dummyUsers } from "../data/dummyUsers";
import "../styles/ProfileView.css";

export default function UserProfileView() {
  const { id } = useParams();
  const navigate = useNavigate();

  const user = dummyUsers.find((u) => u.id === Number(id));

  if (!user) {
    return <p className="not-found">User not found</p>;
  }

  return (
    <div className="profile-view-page">
      <button className="back-btn" onClick={() => navigate(-1)}>
        ← Back
      </button>

      <div className="profile-view-header">
        <img src={user.profilePhoto} alt={user.name} />
        <h2>{user.name}</h2>
        <p className="branch">{user.branch}</p>
      </div>

      <div className="profile-section">
        <h3>About</h3>
        <p>{user.about || "No description provided."}</p>
      </div>

      <div className="profile-section">
        <h3>Skills</h3>
        <div className="skills">
          {user.skills.map((skill) => (
            <span key={skill}>{skill}</span>
          ))}
        </div>
      </div>

      <div className="profile-section">
        <h3>Links</h3>
        <div className="links">
          {user.links?.github ? (
            <a href={user.links.github} target="_blank" rel="noreferrer">
              GitHub
            </a>
          ) : (
            <span className="muted">GitHub not added</span>
          )}

          {user.links?.linkedin ? (
            <a href={user.links.linkedin} target="_blank" rel="noreferrer">
              LinkedIn
            </a>
          ) : (
            <span className="muted">LinkedIn not added</span>
          )}
        </div>
      </div>
    </div>
  );
}
