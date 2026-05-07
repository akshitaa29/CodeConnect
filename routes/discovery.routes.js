import express from "express";
import { getDiscoveryUsers } from "../core-logic/discovery.js";
import { requireAuth } from "../middleware/auth.js";
import { sendErrorResponse } from "../utils/httpErrorResponse.js";

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
  try {
    const email = req.user?.email;
    if (!email) {
      return sendErrorResponse(res, { message: "UNAUTHORIZED" }, 401, "Unauthorized");
    }

    const { batch, limit, cursor } = req.query;
    const result = await getDiscoveryUsers(email, { batch, limit, cursor });

    res.json({
      success: true,
      users: result.users,
      nextCursor: result.nextCursor || null,
    });
  } catch (err) {
    const message = err?.message || "Request failed";
    const isFailedPrecondition =
      err?.code === 9 ||
      err?.code === "FAILED_PRECONDITION" ||
      message.includes("FAILED_PRECONDITION");

    if (isFailedPrecondition) {
      return sendErrorResponse(
        res,
        { message: "FAILED_PRECONDITION" },
        400,
        "Missing Firestore index. Create composite index for batch + email."
      );
    }

    sendErrorResponse(res, err, 400, "Failed to load discovery users");
  }
});

export default router;
