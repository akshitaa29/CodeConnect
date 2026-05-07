import express from "express";
import {
  sendMessage,
  getMessages,
  getConversationMessages,
  deleteMessage,
  removeMessage,
  deleteChat,
  updateTyping,
} from "../core-logic/messaging.js";
import { requireAuth } from "../middleware/auth.js";
import { sendErrorResponse } from "../utils/httpErrorResponse.js";

const router = express.Router();

function emitMessageToParticipants(req, savedMessage) {
  const io = req.app.locals.io;
  const connectedUsers = req.app.locals.connectedUsers;

  if (!io || !connectedUsers || !savedMessage) {
    return;
  }

  const payload = {
    id: savedMessage.id,
    senderId: savedMessage.senderId,
    receiverId: savedMessage.receiverId,
    text: savedMessage.text,
    message: savedMessage.text,
    createdAt: savedMessage.createdAt || new Date().toISOString(),
    from: savedMessage.senderId,
    to: savedMessage.receiverId,
  };

  const receiverSocketId = connectedUsers.get(savedMessage.receiverId);
  const senderSocketId = connectedUsers.get(savedMessage.senderId);

  if (receiverSocketId) {
    io.to(receiverSocketId).emit("receive_message", payload);
  }

  if (senderSocketId) {
    io.to(senderSocketId).emit("receive_message", payload);
  }
}

function emitMessageDeleted(req, messageId) {
  const io = req.app.locals.io;

  if (!io || !messageId) {
    return;
  }

  io.emit("message_deleted", { messageId });
}

function emitChatDeleted(req, user1, user2) {
  const io = req.app.locals.io;

  if (!io || !user1 || !user2) {
    return;
  }

  io.emit("chat_deleted", { user1, user2 });
}

async function handleSend(req, res) {
  try {
    const senderId = req.body.senderId || req.body.from || req.user?.email;
    const receiverId = req.body.receiverId || req.body.to;
    const text = req.body.text || req.body.message;
    const savedMessage = await sendMessage(senderId, receiverId, text);

    emitMessageToParticipants(req, savedMessage);
    res.json({ success: true, message: savedMessage });
  } catch (err) {
    sendErrorResponse(res, err, 400, "Failed to send message");
  }
}

router.post("/", requireAuth, handleSend);
router.post("/send", requireAuth, handleSend);

router.get("/messages", requireAuth, async (req, res) => {
  try {
    const { email1, email2 } = req.query;
    const requester = req.query.requester || req.user?.email;
    const messages = await getMessages(email1, email2, requester);

    res.json({ success: true, messages });
  } catch (err) {
    sendErrorResponse(res, err, 400, "Failed to load messages");
  }
});

router.get("/:user1/:user2", requireAuth, async (req, res) => {
  try {
    const { user1, user2 } = req.params;
    const messages = await getConversationMessages(user1, user2);

    res.json(messages);
  } catch (err) {
    sendErrorResponse(res, err, 400, "Failed to load conversation");
  }
});

router.delete("/chat", requireAuth, async (req, res) => {
  try {
    const user1 = req.body.user1 || req.body.email1;
    const user2 = req.body.user2 || req.body.email2;
    const result = await deleteChat(user1, user2);

    emitChatDeleted(req, user1, user2);
    res.json(result);
  } catch (err) {
    console.error(err);
    sendErrorResponse(res, err, 500, "Failed to delete chat");
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.body.userId || req.user?.email;
    const result = await deleteMessage(id, userId);

    if (result.type === "everyone") {
      emitMessageDeleted(req, id);
    }

    res.json(result);
  } catch (err) {
    console.error(err);
    sendErrorResponse(res, err, 500, "Failed to delete message");
  }
});

router.post("/delete-message", requireAuth, async (req, res) => {
  try {
    const { email1, email2, messageId } = req.body;
    await removeMessage(email1, email2, messageId, req.user?.email);

    emitMessageDeleted(req, messageId);
    res.json({ success: true });
  } catch (err) {
    sendErrorResponse(res, err, 400, "Failed to delete message");
  }
});

router.post("/delete-chat", requireAuth, async (req, res) => {
  try {
    const { email1, email2 } = req.body;
    await deleteChat(email1, email2);

    emitChatDeleted(req, email1, email2);
    res.json({ success: true });
  } catch (err) {
    sendErrorResponse(res, err, 400, "Failed to delete chat");
  }
});

router.post("/typing", requireAuth, async (req, res) => {
  try {
    const { email1, email2, typer, isTyping } = req.body;
    const payload = await updateTyping(email1, email2, typer, isTyping);
    const io = req.app.locals.io;
    const connectedUsers = req.app.locals.connectedUsers;

    if (io && connectedUsers) {
      const email1SocketId = connectedUsers.get(email1);
      const email2SocketId = connectedUsers.get(email2);

      if (email1SocketId) {
        io.to(email1SocketId).emit("typing", { from: typer, isTyping });
      }

      if (email2SocketId) {
        io.to(email2SocketId).emit("typing", { from: typer, isTyping });
      }
    }

    res.json({ success: true, payload });
  } catch (err) {
    sendErrorResponse(res, err, 400, "Failed to update typing status");
  }
});

export default router;
