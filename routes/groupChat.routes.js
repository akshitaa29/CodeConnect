import express from "express";
import {
  sendGroupMessage,
  getGroupMessages,
} from "../core-logic/groupChat.js";
import { deleteGroupChat } from "../core-logic/messaging.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { sendErrorResponse } from "../utils/httpErrorResponse.js";

const router = express.Router();

router.post("/send", authMiddleware, async (req, res) => {
  try {
    const senderEmail = req.user.email;
    const { groupId, text } = req.body;

    const result = await sendGroupMessage(groupId, senderEmail, text);
    res.json({ success: true, ...result });
  } catch (err) {
    sendErrorResponse(res, err, 400, "Failed to send group message");
  }
});

router.get("/messages", authMiddleware, async (req, res) => {
  try {
    const requesterEmail = req.user.email;
    const { groupId } = req.query;

    const messages = await getGroupMessages(groupId, requesterEmail);
    res.json({ success: true, messages });
  } catch (err) {
    sendErrorResponse(res, err, 400, "Failed to load group messages");
  }
});

router.delete("/delete-chat/:groupId", authMiddleware, async (req, res) => {
  try {
    const { groupId } = req.params;
    const requesterEmail = req.user.email;
    const result = await deleteGroupChat(groupId, requesterEmail);

    res.json(result);
  } catch (err) {
    console.error("Delete group chat error:", err);
    sendErrorResponse(res, err, 500, "Failed to delete group chat");
  }
});

export default router;
