import express from "express";
import {
  handleCreateGroup,
  getEligibleGroupMembers,
  handleAddMember,
  handleRemoveMember,
  handleGetMyGroups,
  handleGetGroupDetails,
  exitGroup,
} from "../core-logic/groups.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { sendErrorResponse } from "../utils/httpErrorResponse.js";

const router = express.Router();

/**
 * CREATE GROUP
 */
router.post("/create", authMiddleware, async (req, res) => {
  try {
    const email = req.user.email;
    const { name, description, groupType, memberEmails = [] } = req.body;

    const group = await handleCreateGroup(
      email,
      name,
      description,
      groupType,
      memberEmails
    );

    res.json({ success: true, group });
  } catch (err) {
    sendErrorResponse(res, err, 400, "Failed to create group");
  }
});

/**
 * GET ELIGIBLE MEMBERS
 */
router.get("/eligible-members", authMiddleware, async (req, res) => {
  try {
    const { groupType } = req.query;
    const users = await getEligibleGroupMembers(req.user.email, groupType);
    res.json({ success: true, users });
  } catch (err) {
    sendErrorResponse(res, err, 400, "Failed to load eligible members");
  }
});

/**
 * ADD MEMBER
 */
router.post("/add-member", authMiddleware, async (req, res) => {
  try {
    const adminEmail = req.user.email;
    const { groupId, memberEmail } = req.body;

    const result = await handleAddMember(adminEmail, groupId, memberEmail);
    res.json({ success: true, ...result });
  } catch (err) {
    sendErrorResponse(res, err, 400, "Failed to add member");
  }
});

/**
 * REMOVE MEMBER
 */
router.post("/remove-member", authMiddleware, async (req, res) => {
  try {
    const adminEmail = req.user.email;
    const { groupId, memberEmail } = req.body;

    const result = await handleRemoveMember(adminEmail, groupId, memberEmail);
    res.json({ success: true, ...result });
  } catch (err) {
    sendErrorResponse(res, err, 400, "Failed to remove member");
  }
});

/**
 * GET MY GROUPS
 */
router.get("/my", authMiddleware, async (req, res) => {
  try {
    const groups = await handleGetMyGroups(req.user.email);
    res.json({ success: true, groups });
  } catch (err) {
    sendErrorResponse(res, err, 400, "Failed to load groups");
  }
});

/**
 * EXIT GROUP
 */
router.post("/exit", authMiddleware, async (req, res) => {
  try {
    const { groupId, userId: bodyUserId } = req.body;
    const userId = bodyUserId || req.user.email;

    if (!groupId || !userId) {
      return sendErrorResponse(
        res,
        { message: "MISSING_FIELDS" },
        400,
        "Missing required fields"
      );
    }

    const result = await exitGroup(groupId, userId);
    res.json(result);
  } catch (err) {
    console.error("Exit group error:", err);
    sendErrorResponse(res, err, 500, "Failed to exit group");
  }
});

/**
 * GET SINGLE GROUP
 */
router.get("/:groupId", authMiddleware, async (req, res) => {
  try {
    const group = await handleGetGroupDetails(req.params.groupId, req.user.email);
    res.json({ success: true, group });
  } catch (err) {
    sendErrorResponse(res, err, 400, "Failed to load group");
  }
});

export default router;
