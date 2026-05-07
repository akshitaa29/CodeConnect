import { adminDb } from "../firebase/admin.js";
import { getLikedEmails } from "../firebase/likes.js";
import { getMatchEmailsForUser } from "../firebase/matches.js";
import { getProfileByEmail } from "../firebase/profiles.js";

const profilesRef = adminDb.collection("profiles");
const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 50;
const MAX_QUERY_BATCH = 50;
const MAX_SCAN_PAGES = 5;

function normalizeProfile(profile) {
  return {
    email: profile.email || "",
    name: profile.name || "",
    photoURL: profile.photoURL || profile.profilePhoto || "",
    branch: profile.branch || "",
    batch: profile.batch || "",
    skills: profile.skills || [],
    profile: profile.profile || profile.about || profile.bio || "",
  };
}

function parseLimit(value, fallback = DEFAULT_LIMIT) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, MAX_LIMIT);
}

function normalizeBatchFilter(value) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized || null;
}

async function fetchProfilesPage({ batch, limit, cursor }) {
  let query = profilesRef;

  if (batch) {
    query = query.where("batch", "==", batch);
  }

  query = query.orderBy("email").limit(limit);

  if (cursor) {
    query = query.startAfter(cursor);
  }

  const snapshot = await query.get();
  const docs = snapshot.docs;
  const profiles = docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
  const nextCursor = docs.length > 0 ? docs[docs.length - 1].get("email") : null;

  return { profiles, nextCursor };
}

function filterExcluded(profiles, excludedEmails, seenEmails) {
  return profiles.filter((profile) => {
    const email = profile.email || "";
    if (!email || excludedEmails.has(email) || seenEmails.has(email)) {
      return false;
    }

    seenEmails.add(email);
    return true;
  });
}

export async function getDiscoveryUsers(userEmail, options = {}) {
  if (!userEmail) {
    throw new Error("EMAIL_REQUIRED");
  }

  const limit = parseLimit(options.limit, DEFAULT_LIMIT);
  const cursor = options.cursor || null;
  const batch = normalizeBatchFilter(options.batch);

  const [currentUser, matchedEmails, likedEmails] = await Promise.all([
    getProfileByEmail(userEmail),
    getMatchEmailsForUser(userEmail),
    getLikedEmails(userEmail),
  ]);

  if (!currentUser) {
    throw new Error("PROFILE_NOT_FOUND");
  }

  const excludedEmails = new Set([userEmail, ...likedEmails, ...matchedEmails]);
  const seenEmails = new Set();
  const users = [];
  let nextCursor = cursor;
  let pagesScanned = 0;

  while (users.length < limit && pagesScanned < MAX_SCAN_PAGES) {
    const remaining = limit - users.length;
    const pageLimit = Math.min(
      MAX_QUERY_BATCH,
      Math.max(DEFAULT_LIMIT, remaining * 2, remaining)
    );

    const page = await fetchProfilesPage({
      batch,
      limit: pageLimit,
      cursor: nextCursor,
    });

    if (page.profiles.length === 0) {
      nextCursor = null;
      break;
    }

    users.push(...filterExcluded(page.profiles, excludedEmails, seenEmails));
    nextCursor = page.nextCursor;
    pagesScanned += 1;

    if (page.profiles.length < pageLimit) {
      break;
    }
  }

  return {
    users: users.slice(0, limit).map(normalizeProfile),
    nextCursor,
  };
}
