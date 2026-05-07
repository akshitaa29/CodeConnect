import dotenv from "dotenv";
import path from "path";
import http from "http";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";

dotenv.config();
dotenv.config({
  path: path.resolve(process.cwd(), ".env"),
  override: true,
});

import "./firebase/admin.js";
import authRoutes from "./routes/auth.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import userRoutes from "./routes/user.routes.js";
import discoveryRoutes from "./routes/discovery.routes.js";
import likesRoutes from "./routes/likes.routes.js";
import matchesRoutes from "./routes/matches.routes.js";
import messagingRoutes from "./routes/messaging.routes.js";
import notificationsRoutes from "./routes/notifications.routes.js";
import groupsRoutes from "./routes/groups.routes.js";
import groupChatRoutes from "./routes/groupChat.routes.js";
import groupDashboardRoutes from "./routes/groupDashboard.routes.js";
import projectsRoutes from "./routes/projects.routes.js";
import { sendMessage } from "./core-logic/messaging.js";
import { startTaskReminderService } from "./core-logic/taskReminders.js";
import AppError from "./utils/AppError.js";

const app = express();
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
});
const connectedUsers = new Map();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests, try again later",
});

startTaskReminderService();

app.use(helmet());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use("/api", limiter);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log("Request received:", req.path);
  next();
});

app.get("/", (req, res) => {
  res.send("CodeConnect Backend is running");
});

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/user", userRoutes);
app.use("/api/discovery", discoveryRoutes);
app.use("/api/likes", likesRoutes);
app.use("/api/matches", matchesRoutes);
app.use("/api/messages", messagingRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/groups", groupsRoutes);
app.use("/api/group-chat", groupChatRoutes);
app.use("/api/group-dashboard", groupDashboardRoutes);
app.use("/api/projects", projectsRoutes);

app.locals.io = io;
app.locals.connectedUsers = connectedUsers;

io.on("connection", (socket) => {
  console.log("Request received:", "socket:connection");

  socket.on("register", (userId) => {
    if (!userId) {
      socket.emit("message_error", { error: "Missing userId" });
      return;
    }

    connectedUsers.set(userId, socket.id);
    socket.data.userId = userId;
  });

  socket.on("send_message", async (payload) => {
    try {
      const senderId = payload?.senderId;
      const receiverId = payload?.receiverId;
      const text = payload?.text || payload?.message;

      if (!senderId || !receiverId || !text?.trim()) {
        socket.emit("message_error", { error: "INVALID_MESSAGE_PAYLOAD" });
        return;
      }

      const savedMessage = await sendMessage(senderId, receiverId, text);
      const messagePayload = {
        id: savedMessage.id,
        senderId: savedMessage.senderId,
        receiverId: savedMessage.receiverId,
        text: savedMessage.text,
        message: savedMessage.text,
        createdAt: savedMessage.createdAt || new Date().toISOString(),
        from: savedMessage.senderId,
        to: savedMessage.receiverId,
      };

      const receiverSocketId = connectedUsers.get(receiverId);
      const senderSocketId = connectedUsers.get(senderId);

      if (receiverSocketId) {
        io.to(receiverSocketId).emit("receive_message", messagePayload);
      }

      if (senderSocketId) {
        io.to(senderSocketId).emit("receive_message", messagePayload);
      }
    } catch (error) {
      socket.emit("message_error", {
        error: "Failed to send message",
      });
    }
  });

  socket.on("disconnect", () => {
    const { userId } = socket.data || {};

    if (userId && connectedUsers.get(userId) === socket.id) {
      connectedUsers.delete(userId);
    }
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    code: "ROUTE_NOT_FOUND",
    error: {
      code: "ROUTE_NOT_FOUND",
      message: "Route not found",
    },
  });
});

app.use((err, req, res, next) => {
  const isOperational = err instanceof AppError;
  const statusCode = isOperational ? err.statusCode : 500;
  const code = isOperational ? err.code : "INTERNAL_SERVER_ERROR";
  const message = isOperational ? err.message : "Something went wrong";

  console.error("Request error:", {
    path: req.path,
    code,
    message: err.message,
  });

  res.status(statusCode).json({
    success: false,
    message,
    code,
    error: {
      code,
      message,
    },
  });
});

server.listen(PORT, () => {
  console.log(`CodeConnect server running on port ${PORT}`);
});
