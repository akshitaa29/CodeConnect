import express from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import {
  getUnreadCount,
  getUserNotifications,
  markRead,
} from "../core-logic/notifications.js";
import { clearAllNotifications, markNotificationAsRead } from "../firebase/notifications.js";
import { sendErrorResponse } from "../utils/httpErrorResponse.js";

const router = express.Router();

router.get("/unread-count", authMiddleware, async (req, res) => {
  try {
    const count = await getUnreadCount(req.user.uid);
    res.json({
      success: true,
      count,
    });
  } catch (error) {
    console.error("Notification count error:", error);
    sendErrorResponse(res, error, 500, "Failed to load notification count");
  }
});

router.post("/mark-read", authMiddleware, async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    await markRead(req.user.uid, { ids });
    res.json({ success: true });
  } catch (err) {
    sendErrorResponse(res, err, 500, "Failed to update notifications");
  }
});

router.get("/:userId", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    if (userId !== req.user.uid) {
      return sendErrorResponse(res, { message: "UNAUTHORIZED" }, 403, "Unauthorized");
    }
    const notifications = await getUserNotifications(userId);

    res.json(notifications || []);
  } catch (err) {
    console.error("Notifications route error:", err);
    sendErrorResponse(res, err, 500, "Failed to load notifications");
  }
});

router.get("/", authMiddleware, async (req, res) => {
  try {
    const notifications = await getUserNotifications(req.user.uid);
    res.json({ success: true, notifications });
  } catch (err) {
    sendErrorResponse(res, err, 500, "Failed to load notifications");
  }
});

router.patch("/:id/read", authMiddleware, async (req, res) => {
  try {
    await markNotificationAsRead(req.user.uid, req.params.id);
    res.json({ success: true });
  } catch (err) {
    sendErrorResponse(res, err, 500, "Failed to update notification");
  }
});

router.delete("/clear", authMiddleware, async (req, res) => {
  try {
    await clearAllNotifications(req.user.email);
    res.json({ success: true });
  } catch (err) {
    sendErrorResponse(res, err, 500, "Failed to clear notifications");
  }
});

export default router;
