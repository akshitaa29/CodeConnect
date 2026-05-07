import express from "express";
import { checkAndCreateMatch, getMatches } from "../core-logic/matches.js";
import { requireAuth } from "../middleware/auth.js";
import { sendErrorResponse } from "../utils/httpErrorResponse.js";

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const email = req.user?.email;
    if (!email) {
      return sendErrorResponse(res, { message: "UNAUTHORIZED" }, 401, "Unauthorized");
    }

    const matches = await getMatches(email);
    return res.status(200).json({ success: true, matches });
  } catch (err) {
    return sendErrorResponse(res, err, 500, "Failed to load matches");
  }
});

router.post("/check", async (req, res) => {
  try {
    const { from, to } = req.body;

    const result = await checkAndCreateMatch(from, to);
    res.json({ success: true, ...result });
  } catch (err) {
    sendErrorResponse(res, err, 400, "Failed to check match");
  }
});

export default router;
