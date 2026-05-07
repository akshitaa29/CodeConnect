import { signOut } from "firebase/auth";
import { auth } from "../firebase";

const REQUEST_TIMEOUT_MS = 15000;

function extractErrorCode(error) {
  if (error?.response?.data?.code || error?.data?.code || error?.error?.code || error?.code) {
    return (
      error?.response?.data?.code ||
      error?.data?.code ||
      error?.error?.code ||
      error?.code ||
      ""
    );
  }

  const rawMessage =
    error?.response?.data?.message ||
    error?.data?.message ||
    error?.error?.message ||
    error?.message ||
    "";
  const firebaseCodeMatch = rawMessage.match(/\((auth\/[^)]+)\)/);
  if (firebaseCodeMatch?.[1]) {
    return firebaseCodeMatch[1];
  }

  if (/^[A-Z0-9_]+$/.test(rawMessage)) {
    return rawMessage;
  }

  return "";
}

function mapErrorCodeToMessage(code, fallbackMessage) {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
    case "auth/wrong-password":
      return "Incorrect email or password.";
    case "auth/user-not-found":
      return "No account found with this email.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/too-many-requests":
      return "Too many attempts. Try again later.";
    case "auth/network-request-failed":
      return "Network error. Check your connection.";
    case "AbortError":
      return "Request timed out. Please try again.";
    case "Unauthorized":
    case "UNAUTHORIZED":
      return "Your session has expired. Please log in again.";
    case "NO_FILE_PROVIDED":
      return "Please choose a file first.";
    case "INVALID_FILE_TYPE":
      return "Please upload a valid file type.";
    case "FILE_TOO_LARGE":
      return "File is too large. Please choose a smaller file.";
    case "PROFILE_NOT_FOUND":
      return "Profile not found.";
    case "GROUP_NOT_FOUND":
      return "Group not found.";
    case "TASK_NOT_FOUND":
      return "Task not found.";
    case "NOT_GROUP_MEMBER":
    case "NOT_A_GROUP_MEMBER":
      return "You are not a member of this group.";
    default:
      return fallbackMessage;
  }
}

export function getUserFriendlyErrorMessage(error, fallbackMessage = "Something went wrong") {
  const responseMessage =
    error?.response?.data?.message ||
    error?.data?.message ||
    error?.error?.message ||
    "";
  const responseCode = extractErrorCode(error);

  if (typeof responseMessage === "string" && responseMessage.trim()) {
    return responseMessage;
  }

  if (typeof error?.message === "string" && !error.message.startsWith("Firebase: Error")) {
    return mapErrorCodeToMessage(responseCode, error.message);
  }

  return mapErrorCodeToMessage(responseCode, fallbackMessage);
}

function createApiError(data, status, fallbackMessage = "API error") {
  const message =
    data?.message ||
    data?.error?.message ||
    (typeof data?.error === "string" ? data.error : "") ||
    fallbackMessage;
  const code =
    data?.code ||
    data?.error?.code ||
    (typeof data?.error === "string" ? data.error : "") ||
    "";
  const error = new Error(getUserFriendlyErrorMessage({ data, code, message }, fallbackMessage));
  error.response = { data, status };
  error.data = data;
  error.code = code || error.code;
  error.status = status;
  return error;
}

export async function apiFetch(url, options = {}) {
  const token = localStorage.getItem("idToken") || localStorage.getItem("token");
  if (!token) {
    const error = new Error("User not authenticated");
    error.code = "UNAUTHORIZED";
    throw error;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`http://localhost:5000${url}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
      signal: options.signal || controller.signal,
    });

    const data = await res.json().catch(() => ({}));

    if (res.status === 401) {
      try {
        await signOut(auth);
      } catch {}

      localStorage.clear();
      window.location.href = "/login";
      throw createApiError(data, res.status, "Your session has expired. Please log in again.");
    }

    if (!res.ok) {
      throw createApiError(data, res.status);
    }

    return data;
  } catch (error) {
    if (error?.response) {
      throw error;
    }

    if (error?.name === "AbortError") {
      const timeoutError = new Error("Request timed out. Please try again.");
      timeoutError.code = "AbortError";
      throw timeoutError;
    }

    if (error instanceof TypeError) {
      const networkError = new Error("Network error. Check your connection.");
      networkError.code = "auth/network-request-failed";
      throw networkError;
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function withQuery(path, params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, value);
    }
  });

  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
}

export function getStoredUser() {
  const rawUser = localStorage.getItem("user");

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser);
  } catch {
    return null;
  }
}

export async function getUserProfile() {
  return apiFetch("/api/user/profile", { method: "GET" });
}

export async function getMyProfile() {
  return apiFetch("/api/profile/me", { method: "GET" });
}

export async function updateUserProfile(payload) {
  return apiFetch("/api/user/profile", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function updateProfilePhoto(photoURL) {
  return apiFetch("/api/user/profile-photo", {
    method: "PUT",
    body: JSON.stringify({ photoURL }),
  });
}

export async function getMatches() {
  return apiFetch("/api/matches", { method: "GET" });
}

export async function likeUser(targetEmail) {
  return apiFetch("/api/likes", {
    method: "POST",
    body: JSON.stringify({ targetEmail }),
  });
}

export async function getDiscoveryUsers(options = {}) {
  const params = new URLSearchParams();

  if (options.batch) {
    params.set("batch", options.batch);
  }

  if (options.limit) {
    params.set("limit", options.limit);
  }

  if (options.cursor) {
    params.set("cursor", options.cursor);
  }

  const query = params.toString();
  const path = query ? `/api/discovery?${query}` : "/api/discovery";

  return apiFetch(path, { method: "GET" });
}

export async function getMyGroups() {
  return apiFetch("/api/groups/my", { method: "GET" });
}

export async function getGroup(groupId) {
  return apiFetch(`/api/groups/${groupId}`, { method: "GET" });
}

export async function getEligibleGroupMembers(groupType) {
  return apiFetch(withQuery("/api/groups/eligible-members", { groupType }), {
    method: "GET",
  });
}

export async function createGroup(payload) {
  return apiFetch("/api/groups/create", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function addGroupMember(payload) {
  return apiFetch("/api/groups/add-member", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function removeGroupMember(payload) {
  return apiFetch("/api/groups/remove-member", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function exitGroup(groupId) {
  return apiFetch("/api/groups/exit", {
    method: "POST",
    body: JSON.stringify({ groupId }),
  });
}

export async function getGroupMessages(groupId) {
  return apiFetch(withQuery("/api/group-chat/messages", { groupId }), {
    method: "GET",
  });
}

export async function sendGroupMessage(payload) {
  return apiFetch("/api/group-chat/send", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteGroupChat(groupId) {
  return apiFetch(`/api/group-chat/delete-chat/${groupId}`, {
    method: "DELETE",
  });
}

export async function getGroupProject(groupId) {
  return apiFetch(withQuery("/api/group-dashboard/project", { groupId }), {
    method: "GET",
  });
}

export async function saveGroupProject(payload) {
  return apiFetch("/api/group-dashboard/project", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getGroupTasks(groupId) {
  return apiFetch(withQuery("/api/group-dashboard/tasks", { groupId }), {
    method: "GET",
  });
}

export async function updateGroupTaskStatus(payload) {
  return apiFetch("/api/group-dashboard/update-task-status", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function sendGroupTaskReminder(groupId, taskId, type = "6h") {
  return apiFetch(`/api/group-dashboard/tasks/${taskId}/reminder`, {
    method: "POST",
    body: JSON.stringify({ groupId, type }),
  });
}

export async function requestAiTaskBreakdown(payload) {
  return apiFetch("/api/group-dashboard/ai-breakdown", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function sendGroupAiPrompt(payload) {
  return apiFetch("/api/group-dashboard/ai-chat", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
