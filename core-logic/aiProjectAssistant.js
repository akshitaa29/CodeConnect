import { adminDb } from "../firebase/admin.js";
import { runGeminiPrompt } from "./geminiClient.js";

export async function projectAssistant({
  groupId,
  userMessage,
  requesterEmail
}) {
  // 1️⃣ Fetch group
  const groupRef = adminDb.collection("groups").doc(groupId);
  const groupSnap = await groupRef.get();

  if (!groupSnap.exists) {
    throw new Error("GROUP_NOT_FOUND");
  }

  const group = groupSnap.data();

  // Optional: restrict chatbot to admin only
  if (group.createdBy !== requesterEmail) {
    throw new Error("ONLY_ADMIN_CAN_MODIFY_PROJECT");
  }

  // 2️⃣ Fetch tasks
  const tasksSnap = await groupRef.collection("tasks").get();

  const completedTasks = [];
  const editableTasks = [];

  tasksSnap.forEach(doc => {
    const task = { id: doc.id, ...doc.data() };
    if (task.status === "completed") {
      completedTasks.push(task);
    } else {
      editableTasks.push(task);
    }
  });

  // 3️⃣ Build AI prompt (THIS IS THE MAGIC)
  const prompt = `
You are an AI project manager.

IMPORTANT RULES:
- Completed tasks MUST NOT be changed or removed.
- You may modify, add, or remove only pending or in-progress tasks.
- Return updated tasks as a numbered list.

Completed Tasks (DO NOT TOUCH):
${completedTasks.map(t => `- ${t.title}`).join("\n") || "None"}

Editable Tasks:
${editableTasks.map(t => `- ${t.title}`).join("\n") || "None"}

User Request:
${userMessage}

Return ONLY the updated task list.
`;

  const generatedText = await runGeminiPrompt(prompt);

  return {
    aiReply: generatedText,
    completedTasks,
    editableTasks
  };
}
