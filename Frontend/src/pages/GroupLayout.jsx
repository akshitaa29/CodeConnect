import { useCallback, useEffect, useState } from "react";
import {
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import "../styles/ChatBox.css";
import "../styles/GroupLayout.css";
import {
  apiFetch,
  deleteGroupChat,
  getGroup,
  getGroupProject,
  getGroupTasks,
  getUserFriendlyErrorMessage,
  getStoredUser,
} from "../utils/api";

export default function GroupLayout() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const storedUser = getStoredUser();
  const currentUserEmail =
    storedUser?.email || localStorage.getItem("email") || "";

  const [group, setGroup] = useState(null);
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddMembers, setShowAddMembers] = useState(false);

  const refreshGroup = useCallback(async () => {
    const res = await getGroup(groupId);
    setGroup(res.group || null);
    return res.group || null;
  }, [groupId]);

  const refreshProject = useCallback(async () => {
    try {
      const res = await getGroupProject(groupId);
      setProject(res.project || null);
      return res.project || null;
    } catch {
      setProject(null);
      return null;
    }
  }, [groupId]);

  const refreshTasks = useCallback(async () => {
    try {
      const res = await getGroupTasks(groupId);
      setTasks(res.tasks || []);
      return res.tasks || [];
    } catch {
      setTasks([]);
      return [];
    }
  }, [groupId]);

  useEffect(() => {
    const closeMenu = () => setMenuOpen(false);
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, []);

  useEffect(() => {
    const loadGroupData = async () => {
      try {
        setLoading(true);
        setError("");
        await Promise.all([refreshGroup(), refreshProject(), refreshTasks()]);
      } catch (err) {
        setError(getUserFriendlyErrorMessage(err, "Failed to load group"));
      } finally {
        setLoading(false);
      }
    };

    loadGroupData();
  }, [refreshGroup, refreshProject, refreshTasks]);

  const isActive = (path) =>
    location.pathname === `/dashboard/groups/${groupId}` ||
    location.pathname.includes(path);

  const isAdmin = (group?.admin || group?.createdBy) === currentUserEmail;
  const memberProfiles = group?.memberProfiles || [];
  const memberByEmail = memberProfiles.reduce((acc, member) => {
    acc[member.email] = member;
    return acc;
  }, {});

  const handleDeleteChat = async (event) => {
    event.stopPropagation();

    try {
      await deleteGroupChat(groupId);
      window.dispatchEvent(
        new CustomEvent("group-chat:clear", { detail: { groupId } })
      );
    } catch (err) {
      console.error("Delete group chat failed:", err);
    } finally {
      setMenuOpen(false);
    }
  };

  const handleExitGroup = async (event) => {
    event.stopPropagation();

    try {
      await apiFetch("/api/groups/exit", {
        method: "POST",
        body: JSON.stringify({
          groupId,
          userId: currentUserEmail,
        }),
      });
      navigate("/dashboard/groups");
    } catch (err) {
      console.error("Exit group failed:", err);
    } finally {
      setMenuOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="chat-wrapper">
        <div className="chat-container">
          <section className="chat-main">
            <div className="chat-messages">
              <p>Loading group...</p>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="chat-wrapper">
        <div className="chat-container">
          <section className="chat-main">
            <div className="chat-messages">
              <p>{error || "Group not found"}</p>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-wrapper">
      <div className="chat-container">
        <aside className="chat-sidebar">
          <div className="members-header">
            <button
              className="back-icon-btn"
              onClick={() => navigate("/dashboard/groups")}
            >
              <span className="back-arrow">&lt;</span>
            </button>

            <h3>Members</h3>
          </div>

          {memberProfiles.map((member) => (
            <div key={member.email} className="chat-user">
              <div className="status online" />
              <span>{member.name || member.email}</span>
            </div>
          ))}
        </aside>

        <section className="chat-main">
          <header className="chat-header">
            <div className="group-header-row">
              <h3>{group.name}</h3>

              <div className="group-right">
                <div className="group-tabs">
                  <span
                    className={`group-tab ${
                      isActive("/workspace") ? "active" : ""
                    }`}
                    onClick={() =>
                      navigate(`/dashboard/groups/${groupId}/workspace`)
                    }
                  >
                    Workspace
                  </span>

                  <span
                    className={`group-tab ${
                      isActive("/chat") ? "active" : ""
                    }`}
                    onClick={() =>
                      navigate(`/dashboard/groups/${groupId}/chat`)
                    }
                  >
                    Chat
                  </span>

                  <span
                    className={`group-tab ${
                      isActive("/tasks") ? "active" : ""
                    }`}
                    onClick={() =>
                      navigate(`/dashboard/groups/${groupId}/tasks`)
                    }
                  >
                    Tasks
                  </span>

                  <span
                    className={`group-tab ${
                      isActive("/ai") ? "active" : ""
                    }`}
                    onClick={() =>
                      navigate(`/dashboard/groups/${groupId}/ai`)
                    }
                  >
                    AI Assistant
                  </span>
                </div>

                <div className="menu-wrapper">
                  <div
                    className="three-dots1"
                    onClick={(event) => {
                      event.stopPropagation();
                      setMenuOpen(!menuOpen);
                    }}
                  >
                    ...
                  </div>

                  {menuOpen && (
                    <div className="dropdown-menu1">
                      <div onClick={handleDeleteChat}>Delete Chat</div>
                      <div onClick={handleExitGroup}>Exit Group</div>
                      {isAdmin && (
                        <div
                          onClick={() => {
                            setShowAddMembers(true);
                            setMenuOpen(false);
                          }}
                        >
                          Add Members
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>

          <Outlet
            context={{
              group,
              project,
              setProject,
              tasks,
              setTasks,
              refreshGroup,
              refreshProject,
              refreshTasks,
              currentUserEmail,
              isAdmin,
              memberByEmail,
              showAddMembers,
              setShowAddMembers,
            }}
          />
        </section>
      </div>
    </div>
  );
}
