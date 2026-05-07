import { adminDb } from "../firebase/admin.js";

function getDeadlineDate(deadline) {
  if (!deadline) {
    return null;
  }

  if (typeof deadline?.toDate === "function") {
    return deadline.toDate();
  }

  if (typeof deadline?.seconds === "number") {
    return new Date(deadline.seconds * 1000);
  }

  if (typeof deadline?._seconds === "number") {
    return new Date(deadline._seconds * 1000);
  }

  const parsed = new Date(deadline);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildRegeneratedDeadline(oldDeadline, now = new Date()) {
  const delayMs = now.getTime() - oldDeadline.getTime();
  const extraDays = Math.ceil(delayMs / (1000 * 60 * 60 * 24));
  const newDeadline = new Date(now);

  newDeadline.setDate(newDeadline.getDate() + extraDays + 1);
  return newDeadline;
}

export async function getGroupTasksWithDeadlineRefresh(groupId) {
  const tasksRef = adminDb
    .collection("groups")
    .doc(groupId)
    .collection("tasks");

  const tasksSnap = await tasksRef.orderBy("createdAt", "asc").get();
  const now = new Date();
  const updates = [];
  const tasks = tasksSnap.docs.map((doc) => {
    const data = doc.data();
    const task = {
      id: doc.id,
      ...data,
      email: data.email || data.assignedTo || "",
      reminderSent: Boolean(data.reminderSent),
    };
    const deadline = getDeadlineDate(task.deadline);

    if (
      deadline &&
      deadline < now &&
      task.status !== "completed"
    ) {
      const newDeadline = buildRegeneratedDeadline(deadline, now);

      task.deadline = newDeadline.toISOString();
      task.deadlineUpdated = true;
      updates.push(
        doc.ref.update({
          deadline: newDeadline,
          updatedAt: now,
        })
      );
    }

    return task;
  });

  if (updates.length > 0) {
    await Promise.all(updates);
  }

  return tasks;
}

export async function updateTaskStatus({
  groupId,
  taskId,
  newStatus,
  requesterEmail
}) {
  const validStatuses = ["pending", "in-progress", "completed"];

  if (!validStatuses.includes(newStatus)) {
    throw new Error("INVALID_STATUS");
  }

  const taskRef = adminDb
    .collection("groups")
    .doc(groupId)
    .collection("tasks")
    .doc(taskId);

  const taskSnap = await taskRef.get();

  if (!taskSnap.exists) {
    throw new Error("TASK_NOT_FOUND");
  }

  const task = taskSnap.data();

  // 🔐 Only assigned user can update
  if (task.assignedTo !== requesterEmail) {
    throw new Error("NOT_TASK_OWNER");
  }

  await taskRef.update({
    status: newStatus,
    updatedAt: new Date()
  });

  return {
    success: true,
    taskId,
    status: newStatus
  };
}
