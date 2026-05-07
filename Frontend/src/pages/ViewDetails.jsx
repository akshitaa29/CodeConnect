import { useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { seedProjects } from "../data/projects";
import "../styles/ViewDetail.css";

const STORAGE_KEY = "seniorPageProjects";

function loadProjects() {
  const savedProjects = localStorage.getItem(STORAGE_KEY);

  if (!savedProjects) {
    return seedProjects;
  }

  try {
    const parsedProjects = JSON.parse(savedProjects);
    return Array.isArray(parsedProjects) ? parsedProjects : seedProjects;
  } catch {
    return seedProjects;
  }
}

export default function ViewDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const project = useMemo(() => {
    if (location.state?.project?.id === id) {
      return location.state.project;
    }

    return loadProjects().find((item) => item.id === id) ?? null;
  }, [id, location.state]);

  if (!project) {
    return (
      <div className="view-wrapper">
        <div className="view-container">
          <button className="back-btn" onClick={() => navigate(-1)}>
            Back
          </button>
          <h1 className="project-title">Project not found</h1>
          <p className="project-description">
            The requested project could not be loaded.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="view-wrapper">
      <div className="view-container">
        <button className="back-btn" onClick={() => navigate(-1)}>
          Back
        </button>

        <div className="project-banner">
          <img src={project.image} alt={project.title} />
        </div>

        <h1 className="project-title">{project.title}</h1>
        <p className="project-description">{project.description}</p>

        <div className="details-section">
          <div className="section-label">Category</div>
          <div className="repo-link">{project.category.toUpperCase()}</div>
        </div>

        <div className="details-section">
          <div className="section-label">Git Repository</div>
          <a
            href={project.repoLink}
            target="_blank"
            rel="noreferrer"
            className="repo-link"
          >
            {project.repoLink}
          </a>
        </div>

        <div className="details-section">
          <div className="section-label">Team Members</div>
          <div className="members-grid">
            {(project.members?.length
              ? project.members
              : [{ name: "Project Owner" }]
            ).map((member, index) => (
              <div className="member-card" key={index}>
                <div className="member-name">{member.name}</div>
                {member.linkedin ? (
                  <a href={member.linkedin} target="_blank" rel="noreferrer">
                    <button className="linkedin-btn">View LinkedIn</button>
                  </a>
                ) : (
                  <div className="linkedin-link">LinkedIn not provided</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
