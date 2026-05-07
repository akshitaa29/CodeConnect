import express from "express";
import {
  handleCreateProfile,
  handleUpdateProfile,
  getProfileByEmail,
  getUserStats,
} from "../core-logic/profile.js";
import { requireAuth } from "../middleware/auth.js";
import AppError from "../utils/AppError.js";

const router = express.Router();

router.get("/stats/:userId", requireAuth, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const stats = await getUserStats(userId);
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

router.post("/create", requireAuth, async (req, res, next) => {
  try {
    const tokenEmail = req.user?.email;
    const requestEmail =
      typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";

    if (!tokenEmail) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    if (requestEmail && requestEmail !== tokenEmail.trim().toLowerCase()) {
      throw new AppError("Email does not match token", 400, "EMAIL_MISMATCH");
    }

    const profile = await handleCreateProfile({
      ...req.body,
      email: tokenEmail,
    });

    res.json({
      success: true,
      profile,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const email = req.user?.email;

    if (!email) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const profile = await getProfileByEmail(email);

    if (!profile) {
      throw new AppError("Profile not found", 404, "PROFILE_NOT_FOUND");
    }

    res.json({
      success: true,
      profile,
    });
  } catch (error) {
    next(error);
  }
});

router.put("/update", async (req, res, next) => {
  try {
    const { email, ...updates } = req.body;

    if (!email) {
      throw new AppError("User ID is required", 400, "USER_ID_REQUIRED");
    }

    const profile = await handleUpdateProfile(email, updates);

    res.json({
      success: true,
      profile,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
