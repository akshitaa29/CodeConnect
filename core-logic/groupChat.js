import { getGroupById } from "../firebase/groups.js";
import {
  createGroupChatIfNotExists,
  saveGroupMessage,
  fetchGroupMessages,
} from "../firebase/groupChat.js";

/**
 * Ensure user is group member
 */
async function ensureGroupMember(groupId, email) {
  const group = await getGroupById(groupId);
  if (!group) {
    throw new Error("GROUP_NOT_FOUND");
  }

  if (!group.members.includes(email)) {
    throw new Error("NOT_A_GROUP_MEMBER");
  }

  return group;
}

/**
 * SEND GROUP MESSAGE
 */
export async function sendGroupMessage(groupId, senderEmail, text) {
  if (!groupId || !text) {
    throw new Error("MISSING_REQUIRED_FIELDS");
  }

  const group = await ensureGroupMember(groupId, senderEmail);

  // Ensure chat exists
  await createGroupChatIfNotExists(groupId, group.members);

  await saveGroupMessage(groupId, senderEmail, text);

  return { sent: true };
}

/**
 * GET GROUP MESSAGES
 */
export async function getGroupMessages(groupId, requesterEmail) {
  await ensureGroupMember(groupId, requesterEmail);

  return await fetchGroupMessages(groupId);
}
