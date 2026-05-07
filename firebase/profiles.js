import { adminDb } from "./admin.js";

const profilesRef = adminDb.collection("profiles");

/**
 * Get profile by email
 */
export async function getProfileByEmail(email) {
  const doc = await profilesRef.doc(email).get();
  return doc.exists ? doc.data() : null;
}

/**
 * Create profile
 */
export async function createProfile(profileData) {
  await profilesRef.doc(profileData.email).set(profileData);
}
/**
 * Update profile by email
 */
export async function updateProfileByEmail(email, updates) {
  await profilesRef.doc(email).update(updates);
}

/**
 * Get multiple profiles by email list
 */
export async function getProfilesByEmails(emails = []) {
  if (!Array.isArray(emails) || emails.length === 0) {
    return [];
  }

  const profiles = await Promise.all(
    [...new Set(emails)].map(async (email) => {
      const doc = await profilesRef.doc(email).get();
      return doc.exists ? doc.data() : null;
    })
  );

  return profiles.filter(Boolean);
}
