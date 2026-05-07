import "../styles/MatchCard.css";
import { useNavigate } from "react-router-dom";

export default function MatchCard({
  user,
  position,
  animating,
  swipeDir,
  onLike,
  onDislike
}) {
  const navigate = useNavigate();

  const handleCardClick = () => {
    if (position !== "active") return;
    navigate(`/dashboard/user/${user.id}`);
  };

  return (
    <div
      className={`match-card ${position} ${
        animating && position === "active" ? swipeDir : ""
      }`}
      onClick={handleCardClick}
    >
      {/* Profile Photo */}
      <div className="avatar-wrapper">
        <img
          src={user.photoURL || "/default-avatar.png"}
          alt={user.name}
          onError={(e) => {
            e.target.src = "/default-avatar.png";
          }}
        />
      </div>

      {/* Name */}
      <h3 className="user-name">{user.name}</h3>

      {/* Meta */}
      <p className="user-meta">
        {user.batch} · {user.branch}
      </p>

      {/* Skills */}
      <div className="skills">
        {user.skills.map((skill, idx) => (
          <span key={idx}>{skill}</span>
        ))}
      </div>

      {/* Actions (ONLY for active card) */}
      {position === "active" && (
        <div className="actions">
          <button
            className="action-btn nope"
            onClick={(e) => {
              e.stopPropagation(); // IMPORTANT
              onDislike();
            }}
          >
            ✕
          </button>

          <button
            className="action-btn like"
            onClick={(e) => {
              e.stopPropagation(); // IMPORTANT
              onLike();
            }}
          >
            ❤
          </button>
        </div>
      )}
    </div>
  );
}
