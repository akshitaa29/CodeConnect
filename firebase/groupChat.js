import { adminDb } from "./admin.js";
import admin from "firebase-admin";

const GROUP_CHATS = "groupChats";

/**
 * Create group chat if not exists
 */
export async function createGroupChatIfNotExists(groupId, members) {
  const ref = adminDb.collection(GROUP_CHATS).doc(groupId);
  const doc = await ref.get();

  if (!doc.exists) {
    await ref.set({
      members,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}

/**
 * Save group message
 */
export async function saveGroupMessage(groupId, sender, text) {
  await adminDb
    .collection(GROUP_CHATS)
    .doc(groupId)
    .collection("messages")
    .add({
      sender,
      text,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}

/**
 * Fetch group messages
 */
export async function fetchGroupMessages(groupId) {
  const snap = await adminDb
    .collection(GROUP_CHATS)
    .doc(groupId)
    .collection("messages")
    .orderBy("createdAt", "asc")
    .get();

  return snap.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
}
