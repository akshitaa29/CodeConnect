import { sendLikeEmail } from "../backend/utils/email.js";
import { addLike, hasLike } from "../firebase/likes.js";
import { createMatchIfNotExists, hasReverseLike } from "../firebase/matches.js";
import { createNotification } from "../firebase/notifications.js";
import { getProfileByEmail } from "../firebase/profiles.js";
import { notifyAndEmailMatch } from "./matches.js";

function validateEmail(email) {
  if (!email || !email.endsWith("@banasthali.in")) {
    throw new Error("ONLY_BANASTHALI_EMAIL_ALLOWED");
  }
}

export async function likeUser(from, to) {
  validateEmail(from);
  validateEmail(to);

  if (from === to) {
    throw new Error("CANNOT_LIKE_SELF");
  }

  const [fromProfile, toProfile] = await Promise.all([
    getProfileByEmail(from),
    getProfileByEmail(to),
  ]);

  if (!fromProfile || !toProfile) {
    throw new Error("PROFILE_NOT_FOUND");
  }

  const alreadyLiked = await hasLike(from, to);
  if (alreadyLiked) {
    const matched = await hasReverseLike(from, to);
    return { liked: true, alreadyLiked: true, matched };
  }

  const likeResult = await addLike(from, to);
  if (!likeResult.created) {
    const matched = await hasReverseLike(from, to);
    return { liked: true, alreadyLiked: true, matched };
  }

  const senderName = fromProfile.name || fromProfile.email || "Someone";
  const senderSummary = fromProfile.profile || fromProfile.about || fromProfile.bio || "";

  try {
    await Promise.all([
      createNotification({
        type: "like",
        senderEmail: from,
        receiverEmail: to,
        message: `${senderName} liked your profile`,
      }),
      sendLikeEmail({
        toEmail: to,
        likerName: senderName,
        likerSummary: senderSummary,
      }),
    ]);
  } catch (error) {
    console.error("LIKE_SIDE_EFFECTS_FAILED", error);
  }

  const mutualLike = await hasReverseLike(from, to);
  if (!mutualLike) {
    return { liked: true, alreadyLiked: false, matched: false };
  }

  const createdMatch = await createMatchIfNotExists(from, to);
  if (createdMatch) {
    try {
      await notifyAndEmailMatch(fromProfile, toProfile);
    } catch (error) {
      console.error("MATCH_SIDE_EFFECTS_FAILED", error);
    }
  }

  return {
    liked: true,
    alreadyLiked: false,
    matched: true,
    matchCreated: createdMatch,
  };
}
