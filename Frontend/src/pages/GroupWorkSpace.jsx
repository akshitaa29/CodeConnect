import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import "../styles/GroupWorkSpace.css";
import {
  addGroupMember,
  getEligibleGroupMembers,
  getUserFriendlyErrorMessage,
  saveGroupProject,
} from "../utils/api";

const normalizeEligibleUsers = (users) => {
  if (!Array.isArray(users)) {
    return [];
  }

  return users.map((user, index) => ({
    id: user?.id || user?._id || user?.email || `eligible-user-${index}`,
    name: user?.name || user?.displayName || "",
    email: user?.email || "",
    batch: user?.batch || user?.profile?.batch || "",
    profilePhoto: user?.profilePhoto || "",
  }));
};

export default function GroupWorkspace() {
  const {
    group,
    project,
    setProject,
    refreshGroup,
    refreshProject,
    currentUserEmail,
    showAddMembers,
    setShowAddMembers,
  } = useOutletContext();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [eligibleUsers, setEligibleUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);

  useEffect(() => {
    setTitle(project?.title || "");
    setDescription(project?.description || "");
    setStartDate(project?.startDate || "");
    setEndDate(project?.endDate || "");
  }, [project]);

  useEffect(() => {
    if (!showAddMembers || !group?.groupType) {
      if (!showAddMembers) {
        setSearch("");
        setEligibleUsers([]);
      }
      return;
    }

    let ignore = false;

    const loadEligibleUsers = async () => {
      try {
        setLoadingUsers(true);
        setFeedback("");
        const res = await getEligibleGroupMembers(group.groupType);

        if (!ignore) {
          setEligibleUsers(normalizeEligibleUsers(res?.users));
        }
      } catch (err) {
        if (!ignore) {
          setEligibleUsers([]);
          setFeedback(
            getUserFriendlyErrorMessage(err, "Failed to load eligible members")
          );
        }
      } finally {
        if (!ignore) {
          setLoadingUsers(false);
        }
      }
    };

    loadEligibleUsers();

    return () => {
      ignore = true;
    };
  }, [group?.groupType, showAddMembers]);

  const isAdmin =
    group?.admin === currentUserEmail ||
    group?.createdBy === currentUserEmail;

  useEffect(() => {
    let users = [...eligibleUsers];

    users = users.filter((user) => Boolean(user?.email));

    users = users.filter((user) => user?.email !== currentUserEmail);

    users = users.filter(
      (user) => !group?.members?.includes(user?.email)
    );

    if (group?.groupType === "inhouse") {
      users = users.filter((user) => {
        if (!user?.batch || !group?.batch) {
          return true;
        }

        return (
          String(user.batch).trim() === String(group.batch).trim()
        );
      });
    }

    if (search.trim()) {
      users = users.filter((user) => {
        const name = user?.name || "";
        const email = user?.email || "";

        const query = search.toLowerCase();

        return (
          name.toLowerCase().includes(query) ||
          email.toLowerCase().includes(query)
        );
      });
    }

    setFilteredUsers(users);
  }, [eligibleUsers, group, search, currentUserEmail]);

  const handleSave = async () => {
    if (!title.trim() || !description.trim()) {
      return;
    }

    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
      setFeedback("Invalid project duration");
      return;
    }

    try {
      setSaving(true);
      setFeedback("");

      await saveGroupProject({
        groupId: group.id,
        title: title.trim(),
        description: description.trim(),
        startDate,
        endDate,
      });

      const latestProject = await refreshProject();
      setProject(latestProject);

      setFeedback("Project updated");
    } catch (err) {
      setFeedback(getUserFriendlyErrorMessage(err, "Failed to update project"));
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = async (user) => {
    if (!user?.email) {
      return;
    }

    try {
      setAddingMember(true);
      setFeedback("");

      await addGroupMember({
        groupId: group.id,
        memberEmail: user.email,
      });

      await refreshGroup();
      setFilteredUsers((prev) =>
        prev.filter((candidate) => candidate?.email !== user.email)
      );
      setFeedback(`${user.name || user.email} added`);
    } catch (err) {
      console.error("ADD MEMBER ERROR:", err);
      setFeedback(getUserFriendlyErrorMessage(err, "Failed to add member"));
    } finally {
      setAddingMember(false);
    }
  };

  return (
    <div className="group-workspace">
      <div className="workspace-project-card">
        <div className="workspace-project-header">
          <div>
            <h3>{project?.title || "Project workspace"}</h3>
            <p>{group?.description}</p>
          </div>
          <span className="workspace-badge">{group?.groupType}</span>
        </div>

        {isAdmin ? (
          <div className="workspace-form">
            <input
              type="text"
              placeholder="Project title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <textarea
              placeholder="Project description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />

            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />

            <button onClick={handleSave} disabled={saving}>
              {saving
                ? "Saving..."
                : project
                  ? "Update Project"
                  : "Save Project"}
            </button>
          </div>
        ) : (
          <div className="workspace-project-body">
            <p>
              {project?.description ||
                "The admin has not uploaded a project brief yet."}
            </p>
          </div>
        )}

        {feedback && <p className="workspace-feedback">{feedback}</p>}
      </div>

      {showAddMembers && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Add Members</h3>
             <button
  className="close-btn"
  onClick={() => setShowAddMembers(false)}
>
  ✕
</button>
            </div>
<div className="search-wrapper">
  <span className="search-icon">🔍</span>

  <input
    type="text"
    placeholder="Search users..."
    value={search}
    onChange={(e) => setSearch(e.target.value)}
  />
</div>

            <div className="members-list">
              {filteredUsers.length === 0 ? (
                <p className="empty-text">No eligible users available</p>
              ) : (
                filteredUsers.map((user) => {
                  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    user?.name || "User"
                  )}`;

                  return (
                    <div key={user?.email || user?.id} className="member-card">
                      {/* LEFT SIDE */}
                      <div className="member-info">
                        <img
                          src={
                            user?.photoURL ||
                            user?.photo ||
                            user?.profilePic ||
                            user?.avatar ||
                            fallbackAvatar
                          }
                          alt={user?.name || "User"}
                          className="member-avatar"
                          onError={(event) => {
                            event.currentTarget.src = fallbackAvatar;
                          }}
                        />

                        <div>
                          <p className="member-name">{user?.name}</p>
                          <span className="member-batch">{user?.batch}</span>
                        </div>
                      </div>

                      {/* RIGHT SIDE */}
                      <button
                        className="add-btn"
                        onClick={() => handleAddMember(user)}
                      >
                        Add
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
