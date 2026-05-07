import { adminDb } from "./admin.js";
import admin from "firebase-admin";

const GROUPS = "groups";

/**
 * Create group
 */
export async function createGroupInDB({
  name,
  description,
  groupType,
  createdBy,
  members = [],
}) {
  const normalizedMembers = [...new Set([createdBy, ...members])];

  const ref = await adminDb.collection(GROUPS).add({
    name,
    description,
    groupType, // inhouse | hackathon
    admin: createdBy,
    createdBy,
    members: normalizedMembers,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    id: ref.id,
    name,
    description,
    groupType,
    admin: createdBy,
    createdBy,
    members: normalizedMembers,
  };
}

/**
 * Get group by ID
 */
export async function getGroupById(groupId) {
  const doc = await adminDb.collection(GROUPS).doc(groupId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

/**
 * Update members array
 */
export async function updateGroupMembers(groupId, members) {
  await adminDb.collection(GROUPS).doc(groupId).update({ members });
}

/**
 * Get groups joined by user
 */
export async function getGroupsByEmail(email) {
  const snap = await adminDb
    .collection(GROUPS)
    .where("members", "array-contains", email)
    .get();

  return snap.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
}
