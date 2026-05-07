import admin, { adminDb } from "../firebase/admin.js";
import { getGroupById } from "../firebase/groups.js";

async function ensureUsersMatched(senderId, receiverId) {
  const matchSnapshot = await adminDb
    .collection("matches")
    .where("users", "array-contains", senderId)
    .get();

  const isMatched = matchSnapshot.docs.some((doc) => {
    const users = doc.data().users;
    return Array.isArray(users) && users.includes(receiverId);
  });

  if (!isMatched) {
    throw new Error("Users are not matched");
  }
}

function normalizeMessage(doc) {
  const data = doc.data();
  const createdAt =
    typeof data.createdAt?.toDate === "function"
      ? data.createdAt.toDate().toISOString()
      : data.createdAt || null;

  return {
    id: doc.id,
    senderId: data.senderId,
    receiverId: data.receiverId,
    text: data.text,
    createdAt,
    deletedFor: Array.isArray(data.deletedFor) ? data.deletedFor : [],
    from: data.senderId,
    to: data.receiverId,
  };
}

export async function sendMessage(senderId, receiverId, text) {
  if (!senderId || !receiverId || !text?.trim()) {
    throw new Error("INVALID_MESSAGE_PAYLOAD");
  }

  await ensureUsersMatched(senderId, receiverId);

  const messageData = {
    senderId,
    receiverId,
    text: text.trim(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    deletedFor: [],
  };

  const messageRef = await adminDb.collection("messages").add(messageData);
  const savedDoc = await messageRef.get();
  const savedMessage = normalizeMessage(savedDoc);

  console.log("Message saved:", {
    id: savedMessage.id,
    senderId: savedMessage.senderId,
    receiverId: savedMessage.receiverId,
  });

  return savedMessage;
}

export async function getConversationMessages(user1, user2, currentUserId = user1) {
  if (!user1 || !user2) {
    throw new Error("INVALID_MESSAGE_QUERY");
  }

  await ensureUsersMatched(user1, user2);

  const snapshot = await adminDb
    .collection("messages")
    .where("senderId", "in", [user1, user2])
    .get();

  return snapshot.docs
    .filter((doc) => {
      const data = doc.data();
      const deletedFor = Array.isArray(data.deletedFor) ? data.deletedFor : [];

      return (
        ((data.senderId === user1 && data.receiverId === user2) ||
          (data.senderId === user2 && data.receiverId === user1)) &&
        (!currentUserId || !deletedFor.includes(currentUserId))
      );
    })
    .map(normalizeMessage)
    .sort((a, b) => {
      const left = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const right = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return left - right;
    });
}

export async function getMessages(email1, email2, requester) {
  const user1 = email1 || requester;
  const user2 = email2;

  if (user1 && user2) {
    return getConversationMessages(user1, user2, requester || user1);
  }

  if (!requester) {
    throw new Error("INVALID_MESSAGE_QUERY");
  }

  const sentSnapshot = await adminDb
    .collection("messages")
    .where("senderId", "==", requester)
    .get();
  const receivedSnapshot = await adminDb
    .collection("messages")
    .where("receiverId", "==", requester)
    .get();

  return [...sentSnapshot.docs, ...receivedSnapshot.docs]
    .map(normalizeMessage)
    .filter((message) => !message.deletedFor.includes(requester))
    .sort((a, b) => {
      const left = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const right = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return left - right;
    });
}

export async function removeMessage(
  email1,
  email2,
  messageId,
  requester = email1
) {
  if (!messageId) {
    throw new Error("INVALID_MESSAGE_ID");
  }

  await ensureUsersMatched(email1, email2);

  const messageRef = adminDb.collection("messages").doc(messageId);
  const snapshot = await messageRef.get();

  if (!snapshot.exists) {
    throw new Error("MESSAGE_NOT_FOUND");
  }

  const data = snapshot.data();
  const belongsToConversation =
    (data.senderId === email1 && data.receiverId === email2) ||
    (data.senderId === email2 && data.receiverId === email1);

  if (!belongsToConversation) {
    throw new Error("MESSAGE_NOT_FOUND");
  }

  if (requester && data.senderId !== requester) {
    throw new Error("NOT_MESSAGE_OWNER");
  }

  await messageRef.delete();
  return true;
}

export async function deleteMessage(messageId, userId) {
  if (!messageId) {
    throw new Error("INVALID_MESSAGE_ID");
  }

  if (!userId) {
    throw new Error("UNAUTHORIZED");
  }

  const messageRef = adminDb.collection("messages").doc(messageId);
  const snapshot = await messageRef.get();

  if (!snapshot.exists) {
    throw new Error("Message not found");
  }

  const message = snapshot.data();

  if (message.senderId === userId) {
    await messageRef.delete();
    return { success: true, type: "everyone" };
  }

  if (message.receiverId === userId) {
    const deletedFor = Array.isArray(message.deletedFor)
      ? [...message.deletedFor]
      : [];

    if (!deletedFor.includes(userId)) {
      deletedFor.push(userId);
    }

    await messageRef.update({ deletedFor });
    return { success: true, type: "me" };
  }

  throw new Error("Unauthorized");
}

export async function deleteChat(email1, email2) {
  if (!email1 || !email2) {
    throw new Error("INVALID_MESSAGE_QUERY");
  }

  await ensureUsersMatched(email1, email2);

  const messages = await getConversationMessages(email1, email2, null);
  await Promise.all(
    messages.map((message) =>
      adminDb.collection("messages").doc(message.id).delete()
    )
  );

  return { success: true };
}

export async function deleteGroupChat(groupId, requesterEmail) {
  if (!groupId) {
    throw new Error("INVALID_GROUP_ID");
  }

  if (!requesterEmail) {
    throw new Error("UNAUTHORIZED");
  }

  const group = await getGroupById(groupId);
  if (!group) {
    throw new Error("GROUP_NOT_FOUND");
  }

  if (!Array.isArray(group.members) || !group.members.includes(requesterEmail)) {
    throw new Error("NOT_A_GROUP_MEMBER");
  }

  const snapshot = await adminDb
    .collection("groupChats")
    .doc(groupId)
    .collection("messages")
    .get();

  await Promise.all(snapshot.docs.map((doc) => doc.ref.delete()));

  return { success: true };
}

export async function updateTyping(email1, email2, typer, isTyping) {
  await ensureUsersMatched(email1, email2);

  return { email1, email2, typer, isTyping };
}
