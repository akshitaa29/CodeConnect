import AppError from "./AppError.js";

const ERROR_MAP = {
  UNAUTHORIZED: { status: 401, message: "Unauthorized" },
  Unauthorized: { status: 401, message: "Unauthorized" },
  INVALID_TOKEN: { status: 401, message: "Invalid token" },
  EMAIL_REQUIRED: { status: 400, message: "Email is required" },
  TARGET_EMAIL_REQUIRED: { status: 400, message: "Target email is required" },
  FROM_AND_TO_REQUIRED: { status: 400, message: "Both users are required" },
  MISSING_FIELDS: { status: 400, message: "Missing required fields" },
  MISSING_PARAMS: { status: 400, message: "Missing required fields" },
  MISSING_REQUIRED_FIELDS: { status: 400, message: "Missing required fields" },
  MISSING_REQUIRED_PROFILE_FIELDS: {
    status: 400,
    message: "Please fill all required profile fields",
  },
  INVALID_EMAIL_FORMAT: { status: 400, message: "Enter a valid email" },
  ONLY_BANASTHALI_EMAIL_ALLOWED: {
    status: 400,
    message: "Only @banasthali.in emails are allowed",
  },
  INVALID_GROUP_TYPE: { status: 400, message: "Invalid group type" },
  INVALID_STATUS: { status: 400, message: "Invalid status" },
  INVALID_MESSAGE_ID: { status: 400, message: "Invalid message" },
  INVALID_MESSAGE_QUERY: { status: 400, message: "Invalid message request" },
  INVALID_MESSAGE_PAYLOAD: { status: 400, message: "Invalid message payload" },
  INVALID_GROUP_ID: { status: 400, message: "Invalid group" },
  FAILED_PRECONDITION: {
    status: 400,
    message: "Missing Firestore index. Create composite index for batch + email.",
  },
  INVALID_LINKS_FORMAT: { status: 400, message: "Invalid links format" },
  INVALID_SKILLS_FORMAT: { status: 400, message: "Invalid skills format" },
  NO_FIELDS_TO_UPDATE: { status: 400, message: "No fields to update" },
  PROJECT_DESCRIPTION_REQUIRED: {
    status: 400,
    message: "Project description is required",
  },
  PHOTO_URL_REQUIRED: { status: 400, message: "Profile photo is required" },
  USER_ID_REQUIRED: { status: 400, message: "User ID is required" },
  CANNOT_LIKE_SELF: { status: 400, message: "You cannot like your own profile" },
  PROFILE_NOT_FOUND: { status: 404, message: "Profile not found" },
  GROUP_NOT_FOUND: { status: 404, message: "Group not found" },
  TASK_NOT_FOUND: { status: 404, message: "Task not found" },
  MESSAGE_NOT_FOUND: { status: 404, message: "Message not found" },
  RECEIVER_NOT_FOUND: { status: 404, message: "Receiver not found" },
  NOT_GROUP_MEMBER: { status: 403, message: "You are not a member of this group" },
  NOT_A_GROUP_MEMBER: { status: 403, message: "You are not a member of this group" },
  ONLY_ADMIN_ALLOWED: { status: 403, message: "Only the group admin can do that" },
  ONLY_ADMIN_CAN_ADD: { status: 403, message: "Only the group admin can add members" },
  ONLY_ADMIN_CAN_REMOVE: { status: 403, message: "Only the group admin can remove members" },
  ONLY_ADMIN_CAN_MODIFY_PROJECT: {
    status: 403,
    message: "Only the group admin can update the project",
  },
  NOT_MESSAGE_OWNER: { status: 403, message: "You can only modify your own messages" },
  ALREADY_MEMBER: { status: 409, message: "User is already a member of this group" },
  PROFILE_ALREADY_EXISTS: { status: 409, message: "Profile already exists" },
  DB_ERROR: { status: 500, message: "Database operation failed" },
  INTERNAL_SERVER_ERROR: { status: 500, message: "Internal server error" },
};

function normalizeCode(err) {
  return err?.code || err?.message || "INTERNAL_SERVER_ERROR";
}

function getMappedError(err, fallbackStatus = 500, fallbackMessage = "Something went wrong") {
  if (err instanceof AppError) {
    return {
      status: err.statusCode,
      code: err.code,
      message: err.message,
    };
  }

  const code = normalizeCode(err);
  const mapped = ERROR_MAP[code];

  if (mapped) {
    return {
      status: mapped.status,
      code,
      message: mapped.message,
    };
  }

  return {
    status: fallbackStatus,
    code,
    message: fallbackMessage,
  };
}

export function sendErrorResponse(
  res,
  err,
  fallbackStatus = 500,
  fallbackMessage = "Something went wrong"
) {
  const { status, code, message } = getMappedError(
    err,
    fallbackStatus,
    fallbackMessage
  );

  return res.status(status).json({
    success: false,
    message,
    code,
  });
}
