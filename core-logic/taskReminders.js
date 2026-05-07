import { adminDb } from "../firebase/admin.js";
import { sendEmail } from "./sendEmail.js";

let reminderTimer = null;

function getDeadlineMs(deadline) {
  if (!deadline) {
    return null;
  }

  if (typeof deadline.toMillis === "function") {
    return deadline.toMillis();
  }

  const parsed = new Date(deadline).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

async function checkTaskReminders() {
  try {
    const snapshot = await adminDb.collectionGroup("tasks").get();
    const now = new Date();
    const nowMs = now.getTime();

    for (const doc of snapshot.docs) {
      const task = doc.data();
      const deadlineMs = getDeadlineMs(task.deadline);

      if (!deadlineMs || task.reminderSent) {
        if (!deadlineMs) {
          continue;
        }
      }

      const deadline = new Date(deadlineMs);

      if (deadline < now) {
        console.log("Deadline passed for:", task.title);

        const duration = Number(task.originalDuration) || 24;
        const newDeadline = new Date();
        newDeadline.setHours(newDeadline.getHours() + duration);

        await doc.ref.update({
          deadline: newDeadline,
          reminderSent: false,
        });

        console.log("Deadline regenerated:", task.title);
        continue;
      }

      if (task.reminderSent) {
        continue;
      }

      const hoursLeft = (deadlineMs - nowMs) / (1000 * 60 * 60);

      if (hoursLeft <= 6) {
        const recipient = task.email || task.assignedTo;

        await sendEmail(
          recipient,
          "Task Deadline Reminder",
          `Your task "${task.title}" is due soon!`
        );

        await doc.ref.update({
          reminderSent: true,
        });

        console.log("Reminder sent for:", task.title);
      }
    }
  } catch (error) {
    console.error("Task reminder check failed:", error.message);
  }
}

export function startTaskReminderService() {
  if (reminderTimer) {
    return reminderTimer;
  }

  console.log("Task reminder service initialized");
  checkTaskReminders().catch(() => {});
  reminderTimer = setInterval(checkTaskReminders, 5 * 60 * 1000);

  return reminderTimer;
}
