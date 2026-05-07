import admin, { adminDb } from "./admin.js";

const likesRef = adminDb.collection("likes");

function getLikeDocumentId(from, to) {
  return `${encodeURIComponent(from)}__${encodeURIComponent(to)}`;
}

function isAlreadyExistsError(error) {
  return (
    error?.code === 6 ||
    error?.code === "already-exists" ||
    error?.code === "ALREADY_EXISTS" ||
    error?.message?.includes("Already exists")
  );
}

export async function addLike(from, to) {
  const docRef = likesRef.doc(getLikeDocumentId(from, to));

  const [docSnapshot, legacySnapshot] = await Promise.all([
    docRef.get(),
    likesRef.where("from", "==", from).where("to", "==", to).limit(1).get(),
  ]);

  if (docSnapshot.exists || !legacySnapshot.empty) {
    return { created: false, id: docRef.id };
  }

  try {
    await docRef.create({
      from,
      to,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { created: true, id: docRef.id };
  } catch (error) {
    if (isAlreadyExistsError(error)) {
      return { created: false, id: docRef.id };
    }

    throw error;
  }
}

export async function removeLike(from, to) {
  const snapshot = await likesRef.where("from", "==", from).where("to", "==", to).get();
  const batch = adminDb.batch();

  snapshot.forEach((doc) => {
    batch.delete(doc.ref);
  });

  batch.delete(likesRef.doc(getLikeDocumentId(from, to)));
  await batch.commit();
}

export async function hasLike(from, to) {
  const docSnapshot = await likesRef.doc(getLikeDocumentId(from, to)).get();
  if (docSnapshot.exists) {
    return true;
  }

  const snapshot = await likesRef.where("from", "==", from).where("to", "==", to).limit(1).get();
  return !snapshot.empty;
}

export async function getLikedEmails(from) {
  const snapshot = await likesRef.where("from", "==", from).get();
  return [...new Set(snapshot.docs.map((doc) => doc.data().to).filter(Boolean))];
}
