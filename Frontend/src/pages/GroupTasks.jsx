import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import "../styles/GroupTasks.css";
import {
  getUserFriendlyErrorMessage,
  updateGroupTaskStatus,
  sendGroupTaskReminder,
} from "../utils/api";

const STATUS_FLOW = {
  pending: "in-progress",
  "in-progress": "completed",
  completed: "pending",
};

function getDeadlineMs(deadline) {
  if (!deadline) return null;
  if (typeof deadline?.toDate === "function") {
    return deadline.toDate().getTime();
  }
  if (typeof deadline?.seconds === "number") {
    return deadline.seconds * 1000;
  }
  if (typeof deadline?._seconds === "number") {
    return deadline._seconds * 1000;
  }

  const parsed = new Date(deadline).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

function getTimeLeft(deadline, now) {
  const deadlineMs = getDeadlineMs(deadline);
  if (!deadlineMs) return "No deadline";

  const diff = deadlineMs - now;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} days left`;
  if (hours > 0) return `${hours} hours left`;
  return "Deadline passed";
}

function getDeadlineClass(deadline) {
  if (!deadline) return "";

  const deadlineMs = getDeadlineMs(deadline);
  if (!deadlineMs) return "";

  const diff = (deadlineMs - Date.now()) / (1000 * 60 * 60 * 24);

  if (diff < 0) return "overdue";
  if (diff <= 2) return "urgent";

  return "normal";
}

export default function GroupTasks() {
  const {
    group,
    tasks,
    setTasks,
    currentUserEmail,
    isAdmin,
    memberByEmail,
    refreshTasks,
  } = useOutletContext();

  const [busyTaskId, setBusyTaskId] = useState("");
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTasks = async () => {
      try {
        setLoading(true);
        await refreshTasks();
      } catch {}
      finally {
        setLoading(false);
      }
    };

    loadTasks();
  }, [group.id]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 60 * 1000);

    return () => clearInterval(timer);
  }, []);

  // ✅ Toggle Status
  const toggleStatus = async (task) => {
    try {
      setBusyTaskId(task.id);
      setError("");

      const nextStatus = STATUS_FLOW[task.status] || "pending";

      await updateGroupTaskStatus({
        groupId: group.id,
        taskId: task.id,
        status: nextStatus,
      });

      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...t, status: nextStatus } : t
        )
      );
    } catch (err) {
      setError(getUserFriendlyErrorMessage(err, "Failed to update task"));
    } finally {
      setBusyTaskId("");
    }
  };

  // ✅ Send Reminder
  const sendReminder = async (taskId) => {
    try {
      setBusyTaskId(taskId);
      setError("");

      await sendGroupTaskReminder(group.id, taskId);
    } catch (err) {
      setError(getUserFriendlyErrorMessage(err, "Failed to send reminder"));
    } finally {
      setBusyTaskId("");
    }
  };

  const completedCount = tasks.filter(
    (t) => t.status === "completed"
  ).length;

  const totalTasks = tasks.length;

  const progressPercent = totalTasks
    ? Math.round((completedCount / totalTasks) * 100)
    : 0;

  return (
    <div className="group-tasks-container">
     

      {/* 🚀 PROJECT PROGRESS */}
      <div className="project-progress-card">
        <div className="progress-header">
          <h3>🚀 Project Progress</h3>
          <span>
            {completedCount} / {totalTasks} tasks completed
          </span>
        </div>

        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
          <div
            className="progress-marker"
            style={{ left: `${progressPercent}%` }}
          />
        </div>

        <div className="progress-percent">
          {progressPercent}%
        </div>
      </div>

      {error && <p>{error}</p>}

      {/* 💡 FLASH CARDS */}
      <div className="flashcards-grid">
        {loading ? [1, 2, 3].map((item) => (
          <div key={item} className="task-card blue" style={{ opacity: 0.7 }}>
            <div className="task-content">
              <div style={{ height: "18px", width: "70%", background: "rgba(255,255,255,0.12)", borderRadius: "999px", marginBottom: "12px" }} />
              <div style={{ height: "14px", width: "55%", background: "rgba(255,255,255,0.08)", borderRadius: "999px", marginBottom: "10px" }} />
              <div style={{ height: "14px", width: "45%", background: "rgba(255,255,255,0.08)", borderRadius: "999px", marginBottom: "10px" }} />
            </div>
          </div>
        )) : tasks.map((task, index) => {
          const colorClass =
            index % 4 === 0 ? "blue" :
            index % 4 === 1 ? "purple" :
            index % 4 === 2 ? "green" : "orange";

          const assignee = memberByEmail[task.assignedTo];
          const canUpdate = task.assignedTo === currentUserEmail;

          return (
            <div key={task.id} className={`task-card ${colorClass}`}>

              <div className="task-content">

  <div className="task-title">
    📌 {task.title}
  </div>

  <div className="task-user">
    👤 {assignee?.name || task.assignedTo}
  </div>

  <div className={`task-deadline ${getDeadlineClass(task.deadline)}`}>
    ⏳ {getTimeLeft(task.deadline, now)}
  </div>

  <div className={`task-status ${task.status}`}>
    {task.status}
  </div>

  {!canUpdate && (
    <div className="task-locked">
      🔒 Only {assignee?.name || task.assignedTo} can update
    </div>
  )}

</div>

{/* ✅ BUTTONS FIXED */}
<div className="task-actions">

  {canUpdate && (
    <button
      className="task-update-btn"
      onClick={() => toggleStatus(task)}
      disabled={busyTaskId === task.id}
    >
      {busyTaskId === task.id ? "Updating..." : "Update Status"}
    </button>
  )}

  {isAdmin && (
    <button
      className="task-reminder-btn"
      onClick={() => sendReminder(task.id)}
      disabled={busyTaskId === task.id}
    >
      {busyTaskId === task.id ? "Sending..." : "Send Reminder"}
    </button>
  )}

</div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
