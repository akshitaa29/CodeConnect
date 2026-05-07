import express from "express";
import {
  handleSignup,
  handleLogin,
  handleLogout,
} from "../core-logic/auth.js";

const router = express.Router();

function getAuthErrorResponse(err) {
  const code = err?.code || err?.message;

  switch (code) {
    case "ONLY_BANASTHALI_EMAIL_ALLOWED":
      return {
        status: 400,
        message: "Only @banasthali.in emails are allowed",
        code,
      };
    case "PROFILE_NOT_FOUND":
      return {
        status: 404,
        message: "Profile not found",
        code,
      };
    case "auth/user-not-found":
      return {
        status: 404,
        message: "User not found",
        code,
      };
    case "auth/invalid-email":
      return {
        status: 400,
        message: "Invalid email address",
        code,
      };
    case "auth/email-already-exists":
      return {
        status: 400,
        message: "An account with this email already exists",
        code,
      };
    case "INVALID_PASSWORD":
      return {
        status: 400,
        message: "Password must meet all required conditions.",
        code,
      };
    case "auth/weak-password":
      return {
        status: 400,
        message: "Password is too weak. Use a stronger password.",
        code,
      };
    default:
      return {
        status: 500,
        message: "Internal server error",
        code: code || "INTERNAL_SERVER_ERROR",
      };
  }
}

/**
 * SIGNUP
 */
router.post("/signup", async (req, res) => {
  try {
    const user = await handleSignup(req.body);
    res.json({ success: true, user });
  } catch (err) {
    const { status, message, code } = getAuthErrorResponse(err);
    res.status(status).json({ success: false, message, code });
  }
});

/**
 * LOGIN
 */
router.post("/login", async (req, res) => {
  try {
    const profile = await handleLogin(req.body);
    res.json({ success: true, profile });
  } catch (err) {
    const { status, message, code } = getAuthErrorResponse(err);
    res.status(status).json({ success: false, message, code });
  }
});

/**
 * LOGOUT
 */
router.post("/logout", async (req, res) => {
  try {
    const { email } = req.body;
    await handleLogout(email);
    res.json({ success: true });
  } catch (err) {
    const { status, message, code } = getAuthErrorResponse(err);
    res.status(status).json({ success: false, message, code });
  }
});

export default router;
