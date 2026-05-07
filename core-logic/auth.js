import { adminAuth, adminDb } from "../firebase/admin.js";
import AppError from "../utils/AppError.js";

const PASSWORD_RULES = {
  minLength: 8,
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  number: /\d/,
  special: /[^A-Za-z0-9\s]/,
};

function validateBanasthaliEmail(email) {
  if (!email || !email.endsWith("@banasthali.in")) {
    throw new Error("ONLY_BANASTHALI_EMAIL_ALLOWED");
  }
}

export function validateSignupPassword(password) {
  const normalizedPassword =
    typeof password === "string" ? password.trim() : "";

  if (
    normalizedPassword.length < PASSWORD_RULES.minLength ||
    !PASSWORD_RULES.uppercase.test(normalizedPassword) ||
    !PASSWORD_RULES.lowercase.test(normalizedPassword) ||
    !PASSWORD_RULES.number.test(normalizedPassword) ||
    !PASSWORD_RULES.special.test(normalizedPassword)
  ) {
    throw new AppError(
      "Password must meet all required conditions.",
      400,
      "INVALID_PASSWORD"
    );
  }
}

/**
 * SIGNUP + CREATE PROFILE
 */
export async function handleSignup({ email, password, name, role }) {
  validateBanasthaliEmail(email);
  validateSignupPassword(password);

  // Create Firebase Auth user (UID ignored later)
  await adminAuth.createUser({ email, password });

  // Create profile (EMAIL as document ID)
  await adminDb.collection("profiles").doc(email).set({
    email,
    name,
    role,
    skills: [],
    createdAt: new Date(),
  });

  return { email, name, role };
}

/**
 * LOGIN (email existence check only)
 */
export async function handleLogin({ email }) {
  validateBanasthaliEmail(email);

  // Check user exists in Firebase Auth
  await adminAuth.getUserByEmail(email);

  // Fetch profile
  const doc = await adminDb.collection("profiles").doc(email).get();
  if (!doc.exists) throw new Error("PROFILE_NOT_FOUND");

  return doc.data();
}

/**
 * LOGOUT
 */
export async function handleLogout(email) {
  const user = await adminAuth.getUserByEmail(email);
  await adminAuth.revokeRefreshTokens(user.uid);
  return true;
}
