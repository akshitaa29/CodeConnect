import { adminDb } from "./admin.js";

const chatsRef = adminDb.collection("chats");

/**
 * Create chat if not exists
 */
export async function createChatIfNotExists(email1, email2) {
  const chatId = [email1, email2].sort().join("_");
  const chatDoc = chatsRef.doc(chatId);

  const snapshot = await chatDoc.get();
  if (!snapshot.exists) {
    await chatDoc.set({
      users: [email1, email2],
      createdAt: new Date(),
      deletedFor: {},
      typing: {},
    });
  }

  return chatId;
}

/**
 * Save message
 */
export async function saveMessage(chatId, senderEmail, text) {
  await chatsRef.doc(chatId).collection("messages").add({
    sender: senderEmail,
    text,
    createdAt: new Date(),
  });
}

/**
 * Fetch messages
 */
export async function fetchMessages(chatId) {
  const snapshot = await chatsRef
    .doc(chatId)
    .collection("messages")
    .orderBy("createdAt", "asc")
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
}

/**
 * Delete single message
 */
export async function deleteMessage(chatId, messageId) {
  await chatsRef
    .doc(chatId)
    .collection("messages")
    .doc(messageId)
    .delete();
}

/**
 * Soft delete chat for a user
 */
export async function softDeleteChat(chatId, email) {
  await chatsRef.doc(chatId).set(
    {
      deletedFor: {
        [email]: true,
      },
    },
    { merge: true }
  );
}

/**
 * Typing indicator
 */
export async function setTypingStatus(chatId, email, isTyping) {
  await chatsRef.doc(chatId).set(
    {
      typing: {
        [email]: isTyping,
      },
    },
    { merge: true }
  );
}
