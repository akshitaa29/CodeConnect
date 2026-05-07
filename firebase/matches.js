import admin, { adminDb } from "./admin.js";

const likesRef = adminDb.collection("likes");
const matchesRef = adminDb.collection("matches");

function getMatchDocumentId(email1, email2) {
  return [email1, email2]
    .sort()
    .map((email) => encodeURIComponent(email))
    .join("__");
}

function isAlreadyExistsError(error) {
  return (
    error?.code === 6 ||
    error?.code === "already-exists" ||
    error?.code === "ALREADY_EXISTS" ||
    error?.message?.includes("Already exists")
  );
}

export async function hasReverseLike(fromEmail, toEmail) {
  const snapshot = await likesRef
    .where("from", "==", toEmail)
    .where("to", "==", fromEmail)
    .limit(1)
    .get();

  return !snapshot.empty;
}

export async function createMatchIfNotExists(email1, email2) {
  const users = [email1, email2].sort();
  const docRef = matchesRef.doc(getMatchDocumentId(email1, email2));

  const [docSnapshot, legacySnapshot] = await Promise.all([
    docRef.get(),
    matchesRef.where("users", "array-contains", email1).limit(20).get(),
  ]);

  const hasLegacyMatch = legacySnapshot.docs.some((doc) => {
    const data = doc.data();
    const existingUsers = Array.isArray(data.users) ? [...data.users].sort() : [];
    return existingUsers.length === 2 && existingUsers[0] === users[0] && existingUsers[1] === users[1];
  });

  if (docSnapshot.exists || hasLegacyMatch) {
    return false;
  }

  try {
    await docRef.create({
      users,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return true;
  } catch (error) {
    if (isAlreadyExistsError(error)) {
      return false;
    }

    throw error;
  }
}

export async function getMatchEmailsForUser(email) {
  const snapshot = await matchesRef.where("users", "array-contains", email).get();
  const emails = new Set();

  snapshot.forEach((doc) => {
    const data = doc.data();
    const users = Array.isArray(data.users) ? data.users : [];
    const other = users.find((userEmail) => userEmail !== email);
    if (other) {
      emails.add(other);
    }
  });

  return [...emails];
}

export const getMatchedUsers = getMatchEmailsForUser;
