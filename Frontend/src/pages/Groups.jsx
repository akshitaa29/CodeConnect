import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import GroupCard from "../component/GroupCard";
import CreateGroupModal from "../component/CreateGroupModal";
import "../styles/Groups.css";
import {
  createGroup,
  getEligibleGroupMembers,
  getUserFriendlyErrorMessage,
  getMyGroups,
} from "../utils/api";

export default function Groups() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [groupType, setGroupType] = useState("inhouse");
  const [eligibleUsers, setEligibleUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState("");

  const normalizedGroups = useMemo(
    () =>
      groups.map((group) => ({
        ...group,
        members: group.memberProfiles || group.members || [],
        lastActivity: group.groupType || "Recently updated",
      })),
    [groups]
  );

  useEffect(() => {
    const loadGroups = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await getMyGroups();
        setGroups(res.groups || []);
      } catch (err) {
        setError(getUserFriendlyErrorMessage(err, "Failed to load groups"));
      } finally {
        setLoading(false);
      }
    };

    loadGroups();
  }, []);

  useEffect(() => {
    if (!showCreate) {
      return;
    }

    const loadEligibleMembers = async () => {
      try {
        setLoadingUsers(true);
        const res = await getEligibleGroupMembers(groupType);
        setEligibleUsers(res.users || []);
      } catch (err) {
        setError(getUserFriendlyErrorMessage(err, "Failed to load eligible members"));
      } finally {
        setLoadingUsers(false);
      }
    };

    loadEligibleMembers();
  }, [groupType, showCreate]);

  const handleCreate = async (groupData) => {
    try {
      const res = await createGroup({
        name: groupData.name,
        description: groupData.description,
        groupType: groupData.groupType,
        memberEmails: groupData.members,
      });

      setGroups((prev) => [res.group, ...prev]);
      setShowCreate(false);
    } catch (err) {
      setError(getUserFriendlyErrorMessage(err, "Failed to create group"));
    }
  };

  return (
    <div className="groups-page">
      <div className="groups-header">
        <h2>Groups</h2>
        <button
          className="create-group-btn"
          onClick={() => setShowCreate(true)}
        >
          + Create Group
        </button>
      </div>

      {error && <p>{error}</p>}

      {loading ? (
        <div className="no-groups">
          <p>Loading groups...</p>
        </div>
      ) : normalizedGroups.length === 0 ? (
        <div className="no-groups">
          <p>No groups created yet</p>
          <button
            className="create-group-btn"
            onClick={() => setShowCreate(true)}
          >
            Create your first group
          </button>
        </div>
      ) : (
        <div className="groups-grid">
          {normalizedGroups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              onClick={() => navigate(`/dashboard/groups/${group.id}/workspace`)}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateGroupModal
          users={eligibleUsers}
          loadingUsers={loadingUsers}
          groupType={groupType}
          onGroupTypeChange={setGroupType}
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}
