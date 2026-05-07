import { createMatchIfNotExists, getMatchEmailsForUser, hasReverseLike } from "../firebase/matches.js";
import { createNotification } from "../firebase/notifications.js";
import { getProfileByEmail } from "../firebase/profiles.js";
import { sendMatchEmail } from "../backend/utils/email.js";

function normalizeMatchProfile(profile) {
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

export async function notifyAndEmailMatch(fromProfile, toProfile) {
  const fromName = fromProfile?.name || fromProfile?.email || "Someone";
  const toName = toProfile?.name || toProfile?.email || "Someone";

  await Promise.all([
    createNotification({
      type: "match",
      senderEmail: fromProfile?.email,
      receiverEmail: toProfile?.email,
      message: `${fromName} matched with you`,
    }),
    createNotification({
      type: "match",
      senderEmail: toProfile?.email,
      receiverEmail: fromProfile?.email,
      message: `${toName} matched with you`,
    }),
    sendMatchEmail({
      firstUser: fromProfile,
      secondUser: toProfile,
    }),
  ]);
}

export async function checkAndCreateMatch(fromEmail, toEmail) {
  const isMutual = await hasReverseLike(fromEmail, toEmail);
  if (!isMutual) {
    return { matched: false };
  }

  const created = await createMatchIfNotExists(fromEmail, toEmail);

  if (created) {
    const [fromProfile, toProfile] = await Promise.all([
      getProfileByEmail(fromEmail),
      getProfileByEmail(toEmail),
    ]);

    if (fromProfile && toProfile) {
      try {
        await notifyAndEmailMatch(fromProfile, toProfile);
      } catch (error) {
        console.error("MATCH_SIDE_EFFECTS_FAILED", error);
      }
    }
  }

  return {
    matched: true,
    newlyCreated: created,
  };
}

export async function getMatches(email) {
  if (!email) {
    throw new Error("EMAIL_REQUIRED");
  }

  const matchedEmails = await getMatchEmailsForUser(email);
  const profiles = await Promise.all(
    matchedEmails.map((matchedEmail) => getProfileByEmail(matchedEmail))
  );

  return profiles.filter(Boolean).map(normalizeMatchProfile);
}
