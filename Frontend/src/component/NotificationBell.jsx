import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./../styles/NotificationBell.css";

export default function NotificationBell({ count = 0 }) {
  const navigate = useNavigate();

  return (
    <div className="notification-bell" onClick={() => navigate("/dashboard/notifications")}>
      <Bell size={22} />
      {count > 0 && <span className="notification-dot">{count}</span>}
    </div>
  );
}
