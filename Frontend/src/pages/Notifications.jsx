import { useEffect, useState } from "react";
import "./../styles/Notifications.css";
import { apiFetch, getStoredUser } from "../utils/api";
import { auth } from "../firebase";

function NotificationSkeleton() {
  return (
    <div style={{ display: "grid", gap: "12px" }}>
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          style={{
            background: "rgba(255,255,255,0.08)",
            borderRadius: "12px",
            padding: "16px",
          }}
        >
          <div
            style={{
              height: "14px",
              width: item === 2 ? "55%" : item === 3 ? "65%" : "75%",
              background: "rgba(255,255,255,0.12)",
              borderRadius: "999px",
              marginBottom: "10px",
            }}
          />
          <div
            style={{
              height: "12px",
              width: "35%",
              background: "rgba(255,255,255,0.08)",
              borderRadius: "999px",
            }}
          />
        </div>
      ))}
    </div>
  );
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = getStoredUser();
  const userId = auth.currentUser?.uid || user?.uid || "";

  useEffect(() => {
    async function loadNotifications() {
      if (!userId) {
        setNotifications([]);
        setLoading(false);
        return;
      }

      try {
        const data = await apiFetch(`/api/notifications/${encodeURIComponent(userId)}`, {
          method: "GET",
        });
        console.log("Notifications API response:", data);

        setNotifications(Array.isArray(data) ? data : []);

        const unreadIds = (Array.isArray(data) ? data : [])
          .filter((n) => !n.read && n.id)
          .map((n) => n.id);

        if (unreadIds.length > 0) {
          await apiFetch("/api/notifications/mark-read", {
            method: "POST",
            body: JSON.stringify({ ids: unreadIds }),
          });

          setNotifications((prev) =>
            prev.map((n) =>
              unreadIds.includes(n.id) ? { ...n, read: true } : n
            )
          );
        }
      } catch (err) {
        console.error("Failed to load notifications", err);
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    }

    loadNotifications();
  }, [userId]);

  return (
    <div className="notifications-page">
      <h2>Notifications</h2>

      <div className="notifications-list">
        {loading ? <NotificationSkeleton /> : notifications.map((n) => (
          <div key={n.id} className={`notification-item ${n.type}`}>
            <p>{n.message}</p>
            <span>{n.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
