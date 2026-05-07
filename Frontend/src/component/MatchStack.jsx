import { useState } from "react";
import MatchCard from "./MatchCard";

const usersData = [
  {
    id: 1,
    name: "Akshita Chourasia",
    batch: "2022-2026",
    branch: "Computer Science",
    skills: ["HTML", "CSS", "React"],
    profilePhoto:
      "https://images.unsplash.com/photo-1607746882042-944635dfe10e"
  },
  {
    id: 2,
    name: "Rohan Sharma",
    batch: "2021-2025",
    branch: "IT",
    skills: ["Java", "Spring"],
    profilePhoto:
      "https://images.unsplash.com/photo-1527980965255-d3b416303d12"
  }
];

export default function MatchStack() {
  const [users, setUsers] = useState(usersData);

  const handleSwipe = (direction, userId) => {
    console.log(direction === "right" ? "LIKED" : "PASSED", userId);

    setUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  return (
    <div className="match-stack">
      {users
        .slice(0, 3)
        .reverse()
        .map((user, index) => (
          <MatchCard
            key={user.id}
            user={user}
            index={index}
            onSwipe={handleSwipe}
          />
        ))}
    </div>
  );
}
