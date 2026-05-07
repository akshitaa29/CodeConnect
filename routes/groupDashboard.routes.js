import express from "express";
import {
  uploadGroupProject,
  getGroupProject,
} from "../core-logic/groupDashboard.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import {
  generateAndDistributeTasks,
  getAiChatHistory,
  saveAiChatMessage,
} from "../core-logic/aiTasks.js";
import {
  getGroupTasksWithDeadlineRefresh,
  updateTaskStatus,
} from "../core-logic/taskStatus.js";
import { adminDb } from "../firebase/admin.js";
import { generateReminderMessage } from "../core-logic/aiReminderMessages.js";
import { sendEmail } from "../core-logic/sendEmail.js";
import { sendErrorResponse } from "../utils/httpErrorResponse.js";

const router = express.Router();

async function getVerifiedGroup(groupId, email) {
  const groupSnap = await adminDb.collection("groups").doc(groupId).get();

  if (!groupSnap.exists) {
    throw new Error("GROUP_NOT_FOUND");
  }

  const group = {
    id: groupSnap.id,
    ...groupSnap.data(),
  };

  if (!group.members?.includes(email)) {
    throw new Error("NOT_GROUP_MEMBER");
  }

  return group;
}

router.post("/project", authMiddleware, async (req, res) => {
  try {
    const email = req.user.email;
    const { groupId, title, description, startDate, endDate } = req.body;

    const result = await uploadGroupProject(
      groupId,
      email,
      title,
      description,
      startDate,
      endDate
    );

    res.json({ success: true, ...result });
  } catch (err) {
    sendErrorResponse(res, err, 400, "Failed to save project");
  }
});

router.get("/project", authMiddleware, async (req, res) => {
  try {
    const email = req.user.email;
    const { groupId } = req.query;

    const project = await getGroupProject(groupId, email);
    res.json({ success: true, project });
  } catch (err) {
    sendErrorResponse(res, err, 400, "Failed to load project");
  }
});

router.get("/tasks", authMiddleware, async (req, res) => {
  try {
    const { groupId } = req.query;

    if (!groupId) {
      return sendErrorResponse(
        res,
        { message: "MISSING_FIELDS" },
        400,
        "groupId is required"
      );
    }

    const tasks = await getGroupTasksWithDeadlineRefresh(groupId);
    res.json({ success: true, tasks });
  } catch (err) {
    sendErrorResponse(res, err, 400, "Failed to load tasks");
  }
});

router.post("/ai-breakdown", authMiddleware, async (req, res) => {
  try {
    const { groupId, projectDescription, startDate, endDate } = req.body;

    if (!groupId || !projectDescription) {
      return sendErrorResponse(
        res,
        { message: "PROJECT_DESCRIPTION_REQUIRED" },
        400,
        "Project description is required"
      );
    }

    await getVerifiedGroup(groupId, req.user.email);
    const project = await getGroupProject(groupId, req.user.email);
    const resolvedStartDate = project?.startDate || startDate || "";
    const resolvedEndDate = project?.endDate || endDate || "";
    const projectTitle = project?.title || "";

    await saveAiChatMessage(groupId, "user", projectDescription.trim());

    const result = await generateAndDistributeTasks({
      groupId,
      projectDescription,
      projectTitle,
      startDate: resolvedStartDate,
      endDate: resolvedEndDate,
      createdBy: req.user.email,
    });

    await saveAiChatMessage(groupId, "assistant", result.chatMessage);

    res.json({
      success: true,
      roadmap: result.roadmap,
      tasks: result.tasks,
      chatMessage: result.chatMessage,
    });
  } catch (err) {
    console.error("AI Task Distribution Error:", err);
    sendErrorResponse(res, err, 500, "Failed to generate AI task breakdown");
  }
});

router.post("/update-task-status", authMiddleware, async (req, res) => {
  try {
    const { groupId, taskId, status } = req.body;

    if (!groupId || !taskId || !status) {
      return sendErrorResponse(
        res,
        { message: "MISSING_FIELDS" },
        400,
        "groupId, taskId and status are required"
      );
    }

    const result = await updateTaskStatus({
      groupId,
      taskId,
      newStatus: status,
      requesterEmail: req.user.email,
    });

    res.json(result);
  } catch (err) {
    console.error("Task Status Error:", err.message);
    sendErrorResponse(res, err, 403, "Failed to update task status");
  }
});

router.get("/ai-chat-history", authMiddleware, async (req, res) => {
  try {
    const { groupId } = req.query;

    if (!groupId) {
      return sendErrorResponse(
        res,
        { message: "MISSING_FIELDS" },
        400,
        "groupId is required"
      );
    }

    await getVerifiedGroup(groupId, req.user.email);
    const messages = await getAiChatHistory(groupId);

    res.json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error("AI Chat History Error:", error);
    sendErrorResponse(res, error, 500, "Failed to load AI chat history");
  }
});

router.post("/ai-chat", authMiddleware, async (req, res) => {
  try {
    const { groupId, message } = req.body;

    if (!groupId || !message?.trim()) {
      return sendErrorResponse(
        res,
        { message: "MISSING_FIELDS" },
        400,
        "groupId and message are required"
      );
    }

    await getVerifiedGroup(groupId, req.user.email);

    const project = await getGroupProject(groupId, req.user.email);
    const projectDescription = project?.description || project?.title || message.trim();
    const projectTitle = project?.title || "";
    const startDate = project?.startDate || "";
    const endDate = project?.endDate || "";

    await saveAiChatMessage(groupId, "user", message.trim());

    const result = await generateAndDistributeTasks({
      groupId,
      projectDescription,
      projectTitle,
      startDate,
      endDate,
      createdBy: req.user.email,
    });

    await saveAiChatMessage(groupId, "assistant", result.chatMessage);

    res.json({
      success: true,
      roadmap: result.roadmap,
      tasks: result.tasks,
      chatMessage: result.chatMessage,
    });
  } catch (error) {
    console.error("AI Chat Error:", error);
    sendErrorResponse(res, error, 500, "AI chat failed");
  }
});

router.post("/tasks/:taskId/reminder", authMiddleware, async (req, res) => {
  try {
    const { groupId, type = "6h" } = req.body;
    const { taskId } = req.params;

    if (!groupId || !taskId) {
      return sendErrorResponse(
        res,
        { message: "MISSING_FIELDS" },
        400,
        "groupId and taskId are required"
      );
    }

    const taskRef = adminDb
      .collection("groups")
      .doc(groupId)
      .collection("tasks")
      .doc(taskId);

    const taskSnap = await taskRef.get();
    if (!taskSnap.exists) {
      return sendErrorResponse(res, { message: "TASK_NOT_FOUND" }, 404, "Task not found");
    }

    const task = taskSnap.data();
    const reminder = generateReminderMessage({
      type,
      taskTitle: task.title,
    });

    await sendEmail(task.assignedTo, reminder.title, reminder.message);

    res.json({
      success: true,
      reminder,
    });
  } catch (err) {
    sendErrorResponse(res, err, 400, "Failed to send reminder");
  }
});

export default router;
