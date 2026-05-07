import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/SeniorPage.css";
import { getUserFriendlyErrorMessage } from "../utils/api";
import { uploadFile } from "../utils/uploadFile";

function buildMembers(linkedInLinks) {
  return linkedInLinks
    .split(/[\n,]/)
    .map((link) => link.trim())
    .filter(Boolean)
    .map((linkedin, index) => ({
      name: `Team Member ${index + 1}`,
      linkedin,
    }));
}

export default function SeniorPage() {
  const navigate = useNavigate();
  const currentUserId = "user123";
  const projectImagePlaceholder = "https://placehold.co/900x420?text=Project+Image";

  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [description, setDescription] = useState("");
  const [repoLink, setRepoLink] = useState("");
  const [linkedInLinks, setLinkedInLinks] = useState("");
  const [projectCategory, setProjectCategory] = useState("web");
  const [projectImageFile, setProjectImageFile] = useState(null);
  const [filter, setFilter] = useState("all");
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingUpload, setLoadingUpload] = useState(false);
  const [error, setError] = useState("");

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:5000/api/projects");
      const data = await res.json().catch(() => []);
      if (!res.ok) {
        throw {
          response: { data, status: res.status },
          message: data?.message || data?.error?.message || "Failed to load projects",
        };
      }
      setProjects(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching projects:", error);
      setError(getUserFriendlyErrorMessage(error, "Failed to load projects"));
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const filteredProjects = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return (Array.isArray(projects) ? projects : []).filter((project) => {
      const matchesFilter =
        filter === "all"
          ? true
          : filter === "my"
            ? project.ownerId === currentUserId
            : project.category === filter;

      const matchesSearch =
        !normalizedSearch ||
        project.title.toLowerCase().includes(normalizedSearch) ||
        project.description.toLowerCase().includes(normalizedSearch);

      return matchesFilter && matchesSearch;
    });
  }, [currentUserId, filter, projects, searchTerm]);

  const resetForm = () => {
    setProjectTitle("");
    setDescription("");
    setRepoLink("");
    setLinkedInLinks("");
    setProjectCategory("web");
    setProjectImageFile(null);
    setError("");
    setShowModal(false);
  };

  const handleViewDetails = (project) => {
    navigate(`/dashboard/projects/${project.id}`, {
      state: { project },
    });
  };

  const handleUploadProject = async () => {
    setError("");

    if (!projectTitle.trim() || !description.trim() || !repoLink.trim()) {
      setError("Please fill all required fields");
      return;
    }

    try {
      setLoadingUpload(true);
      let projectImageUrl = "";

      if (projectImageFile) {
        projectImageUrl = await uploadFile(
          projectImageFile,
          `projectImages/${currentUserId}/${Date.now()}-${projectImageFile.name}`
        );
      }

      const res = await fetch("http://localhost:5000/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: projectTitle.trim(),
          description: description.trim(),
          category: projectCategory,
          ownerId: currentUserId,
          repoLink: repoLink.trim(),
          linkedInLinks,
          image: projectImageUrl,
          imageUrl: projectImageUrl,
          members: buildMembers(linkedInLinks),
        }),
      });

      const newProject = await res.json();

      if (!res.ok) {
        throw {
          response: { data: newProject, status: res.status },
          message: newProject?.message || newProject?.error?.message || "Upload failed",
        };
      }

      setProjects((prev) => [newProject, ...prev]);
      await fetchProjects();
      resetForm();
    } catch (err) {
      console.error("Error uploading project:", err);
      setError(getUserFriendlyErrorMessage(err, "Something went wrong"));
    } finally {
      setLoadingUpload(false);
    }
  };

  return (
    <div className="senior-container">
      <main className="main-content">
        <div className="content-wrapper">
          <div className="fixed-header">
            <div className="top-bar">
              <input
                type="text"
                placeholder="Search projects..."
                className="search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              <div className="top-bar-right">
                <button className="view-btn" onClick={() => setShowModal(true)}>
                  + Upload Project
                </button>
              </div>
            </div>

            <h1>Projects</h1>

            <div className="filters">
              {["all", "web", "ai", "app", "blockchain", "my"].map((cat) => (
                <button
                  key={cat}
                  className={`filter ${filter === cat ? "active" : ""}`}
                  onClick={() => setFilter(cat)}
                >
                  {cat === "ai"
                    ? "AI / ML"
                    : cat === "my"
                      ? "My Projects"
                      : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="projects-scroll">
            <div className="projects-grid">
              {loading
                ? [1, 2, 3].map((item) => (
                    <div className="project-card" key={item} style={{ opacity: 0.7 }}>
                      <div
                        className="project-image"
                        style={{ background: "rgba(255,255,255,0.08)" }}
                      ></div>
                      <div
                        style={{
                          height: "18px",
                          width: "65%",
                          background: "rgba(255,255,255,0.12)",
                          borderRadius: "999px",
                          marginBottom: "12px",
                        }}
                      />
                      <div
                        style={{
                          height: "14px",
                          width: "85%",
                          background: "rgba(255,255,255,0.08)",
                          borderRadius: "999px",
                          marginBottom: "10px",
                        }}
                      />
                      <div
                        style={{
                          height: "14px",
                          width: "55%",
                          background: "rgba(255,255,255,0.08)",
                          borderRadius: "999px",
                        }}
                      />
                    </div>
                  ))
                : filteredProjects.map((project) => (
                    <div className="project-card" key={project.id}>
                      <div
                        className="project-image"
                        style={{
                          backgroundImage: `url(${project.imageUrl || project.image || project.projectImage || project.profileImage || projectImagePlaceholder})`,
                        }}
                      ></div>

                      <h3>{project.title}</h3>
                      <p>{project.description}</p>

                      <span className="category-badge">
                        {project.category.toUpperCase()}
                      </span>

                      <button
                        className="details-btn"
                        onClick={() => handleViewDetails(project)}
                      >
                        View Details
                      </button>
                    </div>
                  ))}
            </div>
          </div>
        </div>
      </main>

      {showModal && (
        <div className="modal-overlay">
          <div className="upload-modal">
            <h2>Upload Project</h2>
            <p className="modal-subtitle">
              Share your project details so juniors can explore and connect
              with you.
            </p>
            {error && <p className="error-text">{error}</p>}

            <label>Project Title</label>
            <input
              type="text"
              placeholder="e.g. AI Resume Analyzer"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
            />

            <label>Description</label>
            <textarea
              placeholder="Explain the tech stack and problem it solves"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <label>GitHub Repository</label>
            <input
              type="text"
              placeholder="https://github.com/username/repo"
              value={repoLink}
              onChange={(e) => setRepoLink(e.target.value)}
            />

            <label>Category</label>
            <select
              value={projectCategory}
              onChange={(e) => setProjectCategory(e.target.value)}
            >
              <option value="web">Web</option>
              <option value="ai">AI / ML</option>
              <option value="app">App</option>
              <option value="blockchain">Blockchain</option>
            </select>

            <label>Project Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setProjectImageFile(e.target.files?.[0] || null)}
            />

            <label>Team LinkedIn Links</label>
            <input
              type="text"
              placeholder="Paste LinkedIn profile URLs"
              value={linkedInLinks}
              onChange={(e) => setLinkedInLinks(e.target.value)}
            />

            <div className="modal-actions">
              <button
                className="view-btn"
                onClick={handleUploadProject}
                disabled={loadingUpload}
              >
                {loadingUpload ? "Uploading..." : "Upload Project"}
              </button>
              <button className="cancel-btn" onClick={resetForm}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
