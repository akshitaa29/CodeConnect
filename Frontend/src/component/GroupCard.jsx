import "../styles/GroupCard.css";

export default function GroupCard({ group, onClick }) {
  const members = Array.isArray(group.members) ? group.members : [];

  return (
    <div className="group-card" onClick={onClick}>

      <h3 className="group-name">{group.name}</h3>

      <p className="group-members">{members.length} members</p>

      <div className="group-avatars">
        {members.slice(0, 3).map((member, index) => {
          const label =
            typeof member === "string"
              ? member
              : member.name || member.email || "";

          return <span key={index}>{label.charAt(0).toUpperCase()}</span>;
        })}
      </div>

      <p className="group-activity">Last activity - {group.lastActivity}</p>
    </div>
  );
}
