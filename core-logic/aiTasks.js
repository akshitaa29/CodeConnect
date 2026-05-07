import admin from "firebase-admin";
import { adminDb } from "../firebase/admin.js";
import { getProfilesByEmails } from "../firebase/profiles.js";
import { runGeminiPrompt } from "./geminiClient.js";

function extractJsonPayload(generatedText) {
  const trimmed = `${generatedText || ""}`.trim();
  const fencedMatch = trimmed.match(/```json\s*([\s\S]*?)\s*```/i);
  const candidate = fencedMatch ? fencedMatch[1].trim() : trimmed;
  const startIndex = candidate.indexOf("{");
  const endIndex = candidate.lastIndexOf("}");

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error("AI returned invalid task JSON");
  }

  return candidate.slice(startIndex, endIndex + 1);
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function defaultDeadline() {
  const date = new Date();
  date.setDate(date.getDate() + 3);
  return toIsoDate(date);
}

function normalizeDeadline(deadline) {
  const parsed = new Date(deadline);

  if (Number.isNaN(parsed.getTime())) {
    return defaultDeadline();
  }

  return toIsoDate(parsed);
}

function hasValidProjectDuration(startDate, endDate) {
  if (!startDate || !endDate) {
    return false;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return false;
  }

  if (start >= end) {
    throw new Error("Invalid project duration");
  }

  return true;
}

function normalizeStatus(status) {
  const value = `${status || ""}`.trim().toLowerCase();
  return value || "pending";
}

function buildMemberDirectory(memberEmails, profiles) {
  const profileMap = new Map(profiles.map((profile) => [profile.email, profile]));

  return memberEmails.map((email) => {
    const profile = profileMap.get(email);
    return {
      id: email,
      email,
      name: profile?.name || email,
    };
  });
}

function resolveAssignee(assignedTo, members, fallbackIndex) {
  const normalizedAssignedTo = `${assignedTo || ""}`.trim().toLowerCase();

  if (normalizedAssignedTo) {
    const directMatch = members.find((member) => {
      const email = member.email.toLowerCase();
      const name = member.name.toLowerCase();
      return (
        email === normalizedAssignedTo ||
        name === normalizedAssignedTo ||
        email.includes(normalizedAssignedTo) ||
        name.includes(normalizedAssignedTo)
      );
    });

    if (directMatch) {
      return directMatch;
    }
  }

  return members[fallbackIndex % members.length];
}

function parseProjectManagerResponse(generatedText, members) {
  const text = extractJsonPayload(generatedText).trim();
  let parsed;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Invalid AI response format");
  }

  const overview = `${parsed?.overview || ""}`.trim();

  const tasks = Array.isArray(parsed?.tasks)
    ? parsed.tasks
        .map((task, index) => {
          const title = `${task?.title || ""}`.trim();
          const description = `${task?.description || ""}`.trim();

          if (!title || !description) {
            return null;
          }

          const assignee = resolveAssignee(task?.assignedTo, members, index);

          return {
            title,
            description,
            assignedTo: assignee.id,
            assignedToName: assignee.name,
            deadline: normalizeDeadline(task?.deadline),
            dependencies: Array.isArray(task?.dependencies)
              ? task.dependencies
                  .map((dependency) => `${dependency || ""}`.trim())
                  .filter(Boolean)
              : [],
            status: normalizeStatus(task?.status),
          };
        })
        .filter(Boolean)
    : [];

  if (tasks.length === 0) {
    throw new Error("AI returned no tasks");
  }

  const chatMessage =
    overview ||
    `Generated a roadmap and ${tasks.length} tasks.`;

  return {
    overview,
    roadmap: overview
      ? [{ phase: "Overview", description: overview }]
      : [],
    tasks,
    chatMessage,
  };
}

function buildProjectManagerPrompt({
  projectDescription,
  startDate = "",
  endDate = "",
  members,
  projectTitle = "",
}) {
  const memberList = members.map((member) => member.name || member.email).join(", ");

  return `
You are a senior project manager.

Project: ${projectTitle || "Untitled Project"}
Description: ${projectDescription}
Team Members: ${memberList}
Project Start Date: ${startDate || "Not set"}
Project End Date: ${endDate || "Not set"}

Generate a COMPLETE roadmap.

STRICT FORMAT:

1. First give OVERVIEW of project (2-3 lines)

2. Then generate tasks:

For EACH task include:

* Task Title
* Description (what exactly to do)
* Assigned Member (choose from team)
* Deadline (based on project timeline)
* Dependencies (if any)

3. Ensure:

* Tasks are in logical order
* Cover frontend + backend
* No vague tasks
* Each task is actionable

Return ONLY valid JSON in this format:
{
  "overview": "...",
  "tasks": [
    {
      "title": "",
      "description": "",
      "assignedTo": "",
      "deadline": "",
      "dependencies": []
    }
  ]
}
`;
}

async function replaceGroupTasks(groupRef, tasks, createdBy) {
  const tasksRef = groupRef.collection("tasks");
  const existingTasks = await tasksRef.get();
  const batch = adminDb.batch();

  existingTasks.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  const savedTasks = tasks.map((task) => {
    const docRef = tasksRef.doc();
    const taskData = {
      title: task.title,
      description: task.description,
      assignedTo: task.assignedTo,
      assignedToName: task.assignedToName,
      email: task.assignedTo,
      deadline: task.deadline,
      dependencies: Array.isArray(task.dependencies) ? task.dependencies : [],
      status: task.status,
      reminderSent: false,
      createdBy,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    batch.set(docRef, taskData);

    return {
      id: docRef.id,
      ...taskData,
    };
  });

  await batch.commit();

  return savedTasks;
}

export async function saveAiChatMessage(groupId, role, message) {
  const aiChatRef = adminDb.collection("groups").doc(groupId).collection("aiChat");

  await aiChatRef.add({
    role,
    message,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

export async function getAiChatHistory(groupId) {
  const snapshot = await adminDb
    .collection("groups")
    .doc(groupId)
    .collection("aiChat")
    .orderBy("createdAt", "asc")
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : null;

    return {
      id: doc.id,
      role: data.role,
      message: data.message,
      createdAt: createdAt ? createdAt.toISOString() : null,
    };
  });
}

export async function generateAndDistributeTasks({
  groupId,
  projectDescription,
  projectTitle = "",
  startDate = "",
  endDate = "",
  createdBy,
}) {
  const groupRef = adminDb.collection("groups").doc(groupId);
  const groupSnap = await groupRef.get();

  if (!groupSnap.exists) {
    throw new Error("GROUP_NOT_FOUND");
  }

  const group = groupSnap.data();
  const memberEmails = Array.isArray(group.members) ? group.members : [];

  if (memberEmails.length === 0) {
    throw new Error("NO_GROUP_MEMBERS");
  }

  if (!projectDescription?.trim()) {
    throw new Error("PROJECT_DESCRIPTION_REQUIRED");
  }

  const useProjectTimeline = hasValidProjectDuration(startDate, endDate);

  const profiles = await getProfilesByEmails(memberEmails);
  const members = buildMemberDirectory(memberEmails, profiles);

  const prompt = buildProjectManagerPrompt({
    projectTitle: projectTitle.trim(),
    projectDescription: projectDescription.trim(),
    startDate,
    endDate,
    members,
  });
  const generatedText = await runGeminiPrompt(prompt);
  const parsed = parseProjectManagerResponse(generatedText, members);

  if (useProjectTimeline) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalTime = end.getTime() - start.getTime();

    parsed.tasks = parsed.tasks.map((task, index) => {
      const progress = (index + 1) / parsed.tasks.length;
      const deadline = new Date(start.getTime() + progress * totalTime);

      return {
        ...task,
        deadline: toIsoDate(deadline),
      };
    });
  }

  await groupRef.set(
    {
      roadmapOverview: parsed.overview || "",
      roadmapUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  const savedTasks = await replaceGroupTasks(groupRef, parsed.tasks, createdBy);

  return {
    overview: parsed.overview,
    roadmap: parsed.roadmap,
    tasks: savedTasks,
    chatMessage: parsed.chatMessage,
    aiReply: generatedText,
  };
}
