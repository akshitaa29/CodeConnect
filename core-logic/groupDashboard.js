import { getGroupById } from "../firebase/groups.js";
import {
  createOrUpdateProject,
  getProjectByGroupId,
} from "../firebase/groupProjects.js";

function ensureAdmin(group, email) {
  if ((group.admin || group.createdBy) !== email) {
    throw new Error("ONLY_ADMIN_ALLOWED");
  }
}

function ensureMember(group, email) {
  if (!group.members.includes(email)) {
    throw new Error("NOT_GROUP_MEMBER");
  }
}

/**
 * Upload / Update project
 */
export async function uploadGroupProject(
  groupId,
  email,
  title,
  description,
  startDate = "",
  endDate = ""
) {
  if (!groupId || !title || !description) {
    throw new Error("MISSING_FIELDS");
  }

  if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
    throw new Error("Invalid project duration");
  }

  const group = await getGroupById(groupId);
  if (!group) throw new Error("GROUP_NOT_FOUND");

  ensureAdmin(group, email);

  await createOrUpdateProject(groupId, {
    title,
    description,
    startDate,
    endDate,
    createdBy: email,
    createdAt: new Date(),
  });

  return { uploaded: true };
}

/**
 * Get project
 */
export async function getGroupProject(groupId, email) {
  const group = await getGroupById(groupId);
  if (!group) throw new Error("GROUP_NOT_FOUND");

  ensureMember(group, email);

  const project = await getProjectByGroupId(groupId);
  return project;
}
