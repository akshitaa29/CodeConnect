import { useState } from "react";
import "../styles/CreateGroupModal.css";

export default function CreateGroupModal({
  users,
  loadingUsers,
  onClose,
  groupType,
  onGroupTypeChange,
  onCreate,
}) {
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);

  const filteredUsers = users.filter((user) =>
    `${user.name || ""} ${user.email || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const toggleUser = (user) => {
    const userId = user.email || user.id;

    setSelected((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreate = () => {
    if (!groupName.trim() || !groupDescription.trim() || selected.length === 0) {
      return;
    }

    onCreate({
      name: groupName.trim(),
      description: groupDescription.trim(),
      groupType,
      members: selected,
    });
  };

  return (
    <div className="group-modal-overlay">
      <div className="group-modal">
        <div className="modal-header">
          <h3>Create Group</h3>
          <span onClick={onClose}>x</span>
        </div>

        <input
          className="group-name-input"
          placeholder="Group name"
          value={groupName}
          onChange={(event) => setGroupName(event.target.value)}
        />

        <textarea
          className="group-name-input"
          placeholder="Group description"
          value={groupDescription}
          onChange={(event) => setGroupDescription(event.target.value)}
        />

        <div className="group-filters">
          <button
            className={groupType === "inhouse" ? "active" : ""}
            onClick={() => onGroupTypeChange("inhouse")}
          >
            Inhouse
          </button>
          <button
            className={groupType === "hackathon" ? "active" : ""}
            onClick={() => onGroupTypeChange("hackathon")}
          >
            Hackathon
          </button>
        </div>

        <input
          className="group-search"
          placeholder="Search people"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        {loadingUsers && <p>Loading eligible members...</p>}

        {filteredUsers.map((user) => {
          const userId = user.email || user.id;
          const isSelected = selected.includes(userId);

          return (
            <div
              key={userId}
              className={`user-row ${isSelected ? "selected" : ""}`}
              onClick={() => toggleUser(user)}
            >
              <img
                src={
                  user.profilePhoto ||
                  "data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA="
                }
              />

              <div className="user-info">
                <p>{user.name || user.email}</p>
                <span>{user.batch || user.email}</span>
              </div>

              {isSelected && <div className="tick"></div>}
            </div>
          );
        })}

        <button
          className="create-btn"
          disabled={!groupName.trim() || !groupDescription.trim() || selected.length === 0}
          onClick={handleCreate}
        >
          Create Group
        </button>
      </div>
    </div>
  );
}
