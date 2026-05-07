import { adminDb } from "./admin.js";
import admin from "firebase-admin";

const COLLECTION = "groupProjects";

export async function createOrUpdateProject(groupId, data) {
  await adminDb.collection(COLLECTION).doc(groupId).set(
    {
      ...data,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

export async function getProjectByGroupId(groupId) {
  const doc = await adminDb.collection(COLLECTION).doc(groupId).get();
  if (!doc.exists) return null;
  return doc.data();
}
