import express from "express";
import { likeUser } from "../core-logic/likes.js";
import { requireAuth } from "../middleware/auth.js";
import { sendErrorResponse } from "../utils/httpErrorResponse.js";

const router = express.Router();

router.post("/like", async (req, res) => {
  try {
    const { from, to } = req.body;

    if (!from || !to) {
      return sendErrorResponse(
        res,
        { message: "FROM_AND_TO_REQUIRED" },
        400,
        "Both users are required"
      );
    }

    const result = await likeUser(from, to);
    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    sendErrorResponse(res, err, 400, "Failed to like user");
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const from = req.user?.email;
    const { targetEmail } = req.body;

    if (!from) {
      return sendErrorResponse(res, { message: "UNAUTHORIZED" }, 401, "Unauthorized");
    }
    if (!targetEmail) {
      return sendErrorResponse(
        res,
        { message: "TARGET_EMAIL_REQUIRED" },
        400,
        "Target email is required"
      );
    }

    const result = await likeUser(from, targetEmail);
    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    sendErrorResponse(res, err, 400, "Failed to like user");
  }
});

export default router;
