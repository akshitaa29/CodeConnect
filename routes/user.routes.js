import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { getProfileByEmail, updateProfileByEmail } from "../firebase/profiles.js";
import { sendErrorResponse } from "../utils/httpErrorResponse.js";

const router = express.Router();

router.get("/profile", requireAuth, async (req, res) => {
  try {
    const email = req.user?.email;
    if (!email) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const profile = await getProfileByEmail(email);
    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }

    const photoURL = profile.photoURL || profile.profilePhoto || "";
    const role = profile.role || profile.title || "";
    const bio = profile.bio || profile.about || profile.profile || "";

    return res.json({
      ...profile,
      role,
      bio,
      photoURL,
      profilePhoto: profile.profilePhoto || photoURL,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.put("/profile-photo", requireAuth, async (req, res) => {
  try {
    const email = req.user?.email;
    if (!email) {
      return sendErrorResponse(res, { message: "UNAUTHORIZED" }, 401, "Unauthorized");
    }

    const { photoURL } = req.body;
    if (!photoURL) {
      return sendErrorResponse(res, { message: "PHOTO_URL_REQUIRED" }, 400, "Profile photo is required");
    }

    const existing = await getProfileByEmail(email);
    if (!existing) {
      return sendErrorResponse(res, { message: "PROFILE_NOT_FOUND" }, 404, "Profile not found");
    }

    const updatedAt = new Date();
    await updateProfileByEmail(email, {
      photoURL,
      profilePhoto: photoURL,
      updatedAt,
    });

    return res.json({
      ...existing,
      photoURL,
      profilePhoto: photoURL,
      updatedAt,
    });
  } catch (err) {
    return sendErrorResponse(res, err, 500, "Failed to update profile photo");
  }
});

router.put("/profile", requireAuth, async (req, res) => {
  try {
    const email = req.user?.email;
    if (!email) {
      return sendErrorResponse(res, { message: "UNAUTHORIZED" }, 401, "Unauthorized");
    }

    const { name, role, bio, skills, batch, branch, links } = req.body || {};
    const updates = {};

    if (name !== undefined) updates.name = name;
    if (role !== undefined) updates.role = role;
    if (bio !== undefined) updates.bio = bio;
    if (batch !== undefined) updates.batch = batch;
    if (branch !== undefined) updates.branch = branch;
    if (links !== undefined) {
      if (typeof links !== "object" || Array.isArray(links)) {
        return sendErrorResponse(res, { message: "INVALID_LINKS_FORMAT" }, 400, "Invalid links format");
      }
      updates.links = links;
    }

    if (skills !== undefined) {
      if (!Array.isArray(skills)) {
        return sendErrorResponse(res, { message: "INVALID_SKILLS_FORMAT" }, 400, "Invalid skills format");
      }
      updates.skills = skills;
    }

    if (Object.keys(updates).length === 0) {
      return sendErrorResponse(res, { message: "NO_FIELDS_TO_UPDATE" }, 400, "No fields to update");
    }

    const existing = await getProfileByEmail(email);
    if (!existing) {
      return sendErrorResponse(res, { message: "PROFILE_NOT_FOUND" }, 404, "Profile not found");
    }

    const updatedAt = new Date();
    await updateProfileByEmail(email, {
      ...updates,
      updatedAt,
    });

    const photoURL = existing.photoURL || existing.profilePhoto || "";

    return res.status(200).json({
      ...existing,
      ...updates,
      role: updates.role ?? existing.role ?? existing.title ?? "",
      bio: updates.bio ?? existing.bio ?? existing.about ?? existing.profile ?? "",
      photoURL: updates.photoURL || photoURL,
      profilePhoto: existing.profilePhoto || photoURL,
      updatedAt,
    });
  } catch (err) {
    return sendErrorResponse(res, err, 500, "Failed to update profile");
  }
});

export default router;
