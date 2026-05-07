import { adminDb } from "./admin.js";

const tasksRef = adminDb.collection("tasks");

export async function getAllActiveTasks() {
  const snapshot = await tasksRef.get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function updateTaskReminderFlag(taskId, flag) {
  await tasksRef.doc(taskId).update({
    [`remindersSent.${flag}`]: true
  });
}