import admin, { adminAuth, adminDb } from "./admin.js";

const notificationsRef = adminDb.collection("notifications");

export async function getUidForEmail(email) {
  if (!email) {
    return "";
  }

  try {
    const user = await adminAuth.getUserByEmail(email);
    return user.uid || "";
  } catch {
    return "";
  }
}

function userNotificationsRef(userId) {
  return notificationsRef.doc(userId).collection("userNotifications");
}

export async function createNotification({
  type,
  senderEmail = "",
  receiverEmail = "",
  senderId = "",
  receiverId = "",
  message = "",
}) {
  const [resolvedSenderId, resolvedReceiverId] = await Promise.all([
    senderId ? Promise.resolve(senderId) : getUidForEmail(senderEmail),
    receiverId ? Promise.resolve(receiverId) : getUidForEmail(receiverEmail),
  ]);

  if (!resolvedReceiverId) {
    throw new Error("RECEIVER_NOT_FOUND");
  }

  const docRef = userNotificationsRef(resolvedReceiverId).doc();
  await docRef.set({
    type,
    senderId: resolvedSenderId || "",
    senderEmail: senderEmail || "",
    receiverId: resolvedReceiverId,
    message,
    read: false,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { id: docRef.id, receiverId: resolvedReceiverId };
}

export async function getNotificationsForUser(userId, limit = 50) {
  const snapshot = await userNotificationsRef(userId)
    .orderBy("timestamp", "desc")
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function getUserNotifications(userId, limit = 50) {
  return getNotificationsForUser(userId, limit);
}

export async function getUnreadCountForUser(userId) {
  const snapshot = await userNotificationsRef(userId).where("read", "==", false).get();
  return snapshot.size;
}

export async function markNotificationsRead(userId, ids = null) {
  const batch = adminDb.batch();
  const collectionRef = userNotificationsRef(userId);

  if (Array.isArray(ids) && ids.length > 0) {
    const docs = await Promise.all(ids.map((id) => collectionRef.doc(id).get()));

    docs.forEach((doc) => {
      if (!doc.exists) return;
      const data = doc.data();
      if (data.read) return;
      batch.update(doc.ref, { read: true });
    });
  } else {
    const snapshot = await collectionRef.where("read", "==", false).get();
    snapshot.forEach((doc) => {
      batch.update(doc.ref, { read: true });
    });
  }

  await batch.commit();
}

export async function markNotificationAsRead(userId, id) {
  await userNotificationsRef(userId).doc(id).update({
    read: true,
  });
}

export async function clearAllNotifications(email) {
  const userId = await getUidForEmail(email);
  if (!userId) {
    return;
  }

  const snapshot = await userNotificationsRef(userId).get();
  const batch = adminDb.batch();

  snapshot.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
}
