import { adminDb } from "./admin.js";

const profilesRef = adminDb.collection("profiles");

export async function fetchAllProfiles() {
  const snapshot = await profilesRef.get();
  return snapshot.docs.map(doc => doc.data());
}
