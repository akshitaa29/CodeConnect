import { getNotificationsForUser, getUnreadCountForUser, markNotificationsRead } from "../firebase/notifications.js";

function formatTime(timestamp) {
  if (!timestamp) return "";
  const date = typeof timestamp.toDate === "function" ? timestamp.toDate() : new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatMessage(type, senderEmail) {
  if (type === "match") {
    return `You matched with ${senderEmail}`;
  }
  if (type === "like") {
    return `${senderEmail} liked your profile`;
  }
  return "You have a new notification";
}

function normalizeNotification(notification) {
  const senderEmail = notification.senderEmail || notification.from || "";
  const timestamp = notification.timestamp || notification.createdAt || null;

  return {
    id: notification.id,
    type: notification.type || "info",
    message: notification.message || formatMessage(notification.type, senderEmail),
    time: formatTime(timestamp),
    read: !!notification.read,
    from: senderEmail,
    senderEmail,
    senderId: notification.senderId || "",
    receiverId: notification.receiverId || notification.to || "",
  };
}

export async function listNotifications(userId, options = {}) {
  if (!userId) {
    throw new Error("USER_ID_REQUIRED");
  }

  const limit = options.limit ? Number(options.limit) : 50;
  const notifications = await getNotificationsForUser(userId, limit);
  return notifications.map(normalizeNotification);
}

export async function getUserNotifications(userId) {
  if (!userId) {
    throw new Error("USER_ID_REQUIRED");
  }

  try {
    const notifications = await getNotificationsForUser(userId);
    return notifications.map(normalizeNotification);
  } catch (error) {
    console.error("Notification fetch error:", error);
    return [];
  }
}

export async function getUnreadCount(userId) {
  if (!userId) {
    throw new Error("USER_ID_REQUIRED");
  }

  return getUnreadCountForUser(userId);
}

export async function markRead(userId, options = {}) {
  if (!userId) {
    throw new Error("USER_ID_REQUIRED");
  }

  const ids = Array.isArray(options.ids) ? options.ids : null;
  await markNotificationsRead(userId, ids);
}
