import {
  getProfileByEmail as fetchProfileByEmail,
  createProfile,
  updateProfileByEmail,
} from "../firebase/profiles.js";
import { adminDb } from "../firebase/admin.js";
import AppError from "../utils/AppError.js";

const VALID_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeSkills(skills) {
  if (!Array.isArray(skills)) {
    return [];
  }

  return skills
    .map((skill) => (typeof skill === "string" ? skill.trim() : ""))
    .filter(Boolean);
}

function normalizeProfilePayload(data = {}) {
  const photoURL = normalizeString(data.photoURL);
  const profilePhoto = normalizeString(data.profilePhoto);

  return {
    ...data,
    name: normalizeString(data.name),
    email: normalizeString(data.email).toLowerCase(),
    batch: normalizeString(data.batch),
    branch: normalizeString(data.branch),
    profile: normalizeString(data.profile),
    resume: normalizeString(data.resume),
    photoURL: photoURL || profilePhoto,
    profilePhoto: profilePhoto || photoURL,
    skills: normalizeSkills(data.skills),
  };
}

function normalizeProfileUpdatePayload(data = {}) {
  const normalized = {};

  for (const [key, value] of Object.entries(data)) {
    if (key === "skills") {
      normalized.skills = normalizeSkills(value);
      continue;
    }

    if (key === "photoURL" || key === "profilePhoto") {
      normalized[key] = normalizeString(value);
      continue;
    }

    if (typeof value === "string") {
      normalized[key] = value.trim();
      continue;
    }

    normalized[key] = value;
  }

  const photoURL = normalizeString(normalized.photoURL);
  const profilePhoto = normalizeString(normalized.profilePhoto);

  if (
    Object.prototype.hasOwnProperty.call(normalized, "photoURL") ||
    Object.prototype.hasOwnProperty.call(normalized, "profilePhoto")
  ) {
    normalized.photoURL = photoURL || profilePhoto;
    normalized.profilePhoto = profilePhoto || photoURL;
  }

  return normalized;
}

export async function getProfileByEmail(email) {
  try {
    return await fetchProfileByEmail(email);
  } catch (error) {
    throw new AppError("Database operation failed", 500, "DB_ERROR");
  }
}

function validateProfileInput(data) {
  const { name, email, batch, branch, skills } = data;

  if (!name || !email || !batch || !branch || skills.length === 0) {
    throw new AppError(
      "Please fill all required profile fields",
      400,
      "MISSING_REQUIRED_PROFILE_FIELDS"
    );
  }

  if (!VALID_EMAIL_REGEX.test(email)) {
    throw new AppError("Enter a valid email", 400, "INVALID_EMAIL_FORMAT");
  }

  if (!email.endsWith("@banasthali.in")) {
    throw new AppError(
      "Use your @banasthali.in email",
      403,
      "ONLY_BANASTHALI_EMAIL_ALLOWED"
    );
  }
}

export async function handleCreateProfile(data) {
  const normalizedData = normalizeProfilePayload(data);

  validateProfileInput(normalizedData);

  const existing = await getProfileByEmail(normalizedData.email);
  if (existing) {
    throw new AppError(
      "Profile already exists",
      409,
      "PROFILE_ALREADY_EXISTS"
    );
  }

  const profileData = {
    email: normalizedData.email,
    name: normalizedData.name,
    batch: normalizedData.batch,
    branch: normalizedData.branch,
    skills: normalizedData.skills,
    profile: normalizedData.profile || "",
    resume: normalizedData.resume || "",
    photoURL: normalizedData.photoURL || "",
    profilePhoto: normalizedData.profilePhoto || "",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  try {
    await createProfile(profileData);
  } catch (error) {
    throw new AppError("Database operation failed", 500, "DB_ERROR");
  }

  return profileData;
}

function validateProfileUpdate(data) {
  const allowedFields = [
    "name",
    "batch",
    "branch",
    "skills",
    "profile",
    "resume",
    "photoURL",
    "profilePhoto",
  ];

  for (const key of Object.keys(data)) {
    if (!allowedFields.includes(key)) {
      throw new AppError(
        `Invalid field update: ${key}`,
        400,
        "INVALID_FIELD_UPDATE"
      );
    }
  }

  if (
    Object.prototype.hasOwnProperty.call(data, "skills") &&
    data.skills.length === 0
  ) {
    throw new AppError(
      "Skills must be a non-empty array",
      400,
      "INVALID_SKILLS_FORMAT"
    );
  }

  for (const key of ["name", "batch", "branch", "profile", "resume"]) {
    if (
      Object.prototype.hasOwnProperty.call(data, key) &&
      typeof data[key] !== "string"
    ) {
      throw new AppError(
        `Invalid field update: ${key}`,
        400,
        "INVALID_FIELD_UPDATE"
      );
    }
  }
}

export async function handleUpdateProfile(email, updates) {
  const normalizedEmail = normalizeString(email).toLowerCase();
  if (!normalizedEmail) {
    throw new AppError("User ID is required", 400, "USER_ID_REQUIRED");
  }

  const existing = await getProfileByEmail(normalizedEmail);
  if (!existing) {
    throw new AppError("Profile not found", 404, "PROFILE_NOT_FOUND");
  }

  const normalizedUpdates = normalizeProfileUpdatePayload(updates);
  delete normalizedUpdates.email;

  validateProfileUpdate(normalizedUpdates);

  const updateData = {
    ...normalizedUpdates,
    updatedAt: new Date(),
  };

  try {
    await updateProfileByEmail(normalizedEmail, updateData);
  } catch (error) {
    throw new AppError("Database operation failed", 500, "DB_ERROR");
  }

  return {
    ...existing,
    ...updateData,
  };
}

export async function getUserStats(userId) {
  if (!userId) {
    throw new AppError("User ID is required", 400, "USER_ID_REQUIRED");
  }

  try {
    const [matchSnapshot, projectSnapshot] = await Promise.all([
      adminDb.collection("matches").where("users", "array-contains", userId).get(),
      adminDb.collection("projects").where("ownerId", "==", userId).get(),
    ]);

    return {
      matches: matchSnapshot.size,
      projects: projectSnapshot.size,
    };
  } catch (error) {
    throw new AppError("Database operation failed", 500, "DB_ERROR");
  }
}
