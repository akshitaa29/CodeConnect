import { adminDb } from "../firebase/admin.js";

export async function applyAiTaskChanges({
  groupId,
  aiTaskList,
  members,
  requesterEmail
}) {
  const groupRef = adminDb.collection("groups").doc(groupId);
  const tasksRef = groupRef.collection("tasks");

  // Parse AI response
  const newTasks = aiTaskList
    .split("\n")
    .map(t => t.replace(/^\d+[\).\s]*/, "").trim())
    .filter(Boolean);

  const batch = adminDb.batch();

  // Remove all non-completed tasks
  const oldTasksSnap = await tasksRef.get();
  let index = 0;

  oldTasksSnap.forEach(doc => {
    if (doc.data().status !== "completed") {
      batch.delete(doc.ref);
    }
  });

  // Add new tasks with AI assignment
  newTasks.forEach(task => {
    const docRef = tasksRef.doc();
    batch.set(docRef, {
      title: task,
      description: task,
      status: "pending",
      assignedTo: members[index % members.length],
      createdBy: requesterEmail,
      createdAt: new Date()
    });
    index++;
  });

  await batch.commit();
}
