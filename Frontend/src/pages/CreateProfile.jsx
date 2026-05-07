import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/CCLogo.png";
import { uploadFile } from "../utils/uploadFile";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";

import "../styles/loginHero.css";
import "../styles/CreateProfile.css";

const VALID_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_RULES = {
  minLength: 8,
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  number: /\d/,
  special: /[^A-Za-z0-9\s]/,
};

const BATCH_OPTIONS = [
  "2025",
  "2026",
  "2027",
  "2028",
  "2029"
];

const BRANCH_OPTIONS = [
  "CSE",
  "IT",
  "ECE",
  "EEE",
  "ME",
  "CE",
  "Biotech",
  "AI/ML"
];

function parseSkills(value) {
  return value
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean);
}

function validatePassword(value) {
  const password = typeof value === "string" ? value.trim() : "";

  if (!password) {
    return "Password is required.";
  }

  if (password.length < PASSWORD_RULES.minLength) {
    return "Password must be at least 8 characters long.";
  }

  if (!PASSWORD_RULES.uppercase.test(password)) {
    return "Include at least one uppercase letter.";
  }

  if (!PASSWORD_RULES.lowercase.test(password)) {
    return "Include at least one lowercase letter.";
  }

  if (
    !PASSWORD_RULES.number.test(password) ||
    !PASSWORD_RULES.special.test(password)
  ) {
    return "Include at least one number and special character.";
  }

  return "";
}

function getCreateProfileErrorMessage(error) {
  const backendMessage =
    error?.response?.data?.message ||
    error?.data?.message ||
    error?.error?.message ||
    "";

  if (backendMessage) {
    return backendMessage;
  }

  switch (error?.code) {
    case "auth/weak-password":
      return "Password is too weak. Use a stronger password.";
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/network-request-failed":
      return "Network error. Check your connection.";
    default:
      return "Something went wrong";
  }
}

export default function CreateProfile() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [batch, setBatch] = useState("");
  const [branch, setBranch] = useState("");
  const [skills, setSkills] = useState("");
  const [profile, setProfile] = useState("");
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [resume, setResume] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (!success) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setSuccess(false);
      navigate("/login");
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [navigate, success]);

  const clearError = () => {
    if (error) {
      setError("");
    }
  };

  const handleCreateProfile = async (e) => {
    e.preventDefault();

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    const trimmedBatch = batch.trim();
    const trimmedBranch = branch.trim();
    const trimmedProfile = profile.trim();
    const parsedSkills = parseSkills(skills);

    if (
      !trimmedName ||
      !trimmedEmail ||
      !trimmedPassword ||
      !trimmedBatch ||
      !trimmedBranch ||
      parsedSkills.length === 0
    ) {
      setError("Please fill all required fields");
      return;
    }

    if (!VALID_EMAIL_REGEX.test(trimmedEmail)) {
      setError("Enter a valid email");
      return;
    }

    if (!trimmedEmail.endsWith("@banasthali.in")) {
      setError("Use your @banasthali.in email");
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    try {
      setLoading(true);
      setError("");

      let profilePhotoURL = "";
      let resumeURL = "";

      if (profilePhoto) {
        profilePhotoURL = await uploadFile(
          profilePhoto,
          `profiles/${trimmedEmail}/profile.jpg`
        );
      }

      if (resume) {
        resumeURL = await uploadFile(
          resume,
          `profiles/${trimmedEmail}/resume.pdf`
        );
      }

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        trimmedEmail,
        password
      );
      const user = userCredential.user;
      const idToken = await user.getIdToken();
      localStorage.setItem("idToken", idToken);
      localStorage.setItem("token", idToken);
      localStorage.setItem("email", user.email || trimmedEmail);

      const payload = {
        name: trimmedName,
        email: trimmedEmail,
        batch: trimmedBatch,
        branch: trimmedBranch,
        skills: parsedSkills,
        profile: trimmedProfile,
        photoURL: profilePhotoURL,
        profilePhoto: profilePhotoURL,
        resume: resumeURL.trim(),
      };

      const res = await fetch("http://localhost:5000/api/profile/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const apiError = new Error(
          data?.message || data?.error?.message || "Unable to create profile"
        );
        apiError.response = { data };
        throw apiError;
      }

      setSuccess(true);
    } catch (err) {
      console.error("Profile creation error:", err);
      setError(getCreateProfileErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="split-container">
      {success && (
        <div className="toast-success">
          <div className="toast-strip"></div>
          <span className="toast-text">Profile created successfully!</span>
        </div>
      )}

      <div className="left-panel">
        <div className="left-content">
          <div className="brand1">
            <img src={logo} alt="CodeConnect Logo" />
            <h1>CodeConnect</h1>
          </div>
          <p>Connect. Build. Grow with Developers.</p>
        </div>
      </div>

      <div className="right-panel">
        <form className="profile-card" onSubmit={handleCreateProfile}>
          <h2>Create Your Profile</h2>

          {error && (
            <div className="error-box" role="alert">
              <strong>Unable to create profile</strong>
              <span>{error}</span>
            </div>
          )}

          <div className="profile-form-scroll-area">
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => {
                clearError();
                setName(e.target.value);
              }}
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => {
                clearError();
                setEmail(e.target.value);
              }}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => {
                clearError();
                setPassword(e.target.value);
              }}
            />
           <select
  value={batch}
  onChange={(e) => {
    clearError();
    setBatch(e.target.value);
  }}
>
  <option value="">Select Batch</option>
  {BATCH_OPTIONS.map((b) => (
    <option key={b} value={b}>
      {b}
    </option>
  ))}
</select>
           <select
  value={branch}
  onChange={(e) => {
    clearError();
    setBranch(e.target.value);
  }}
>
  <option value="">Select Branch</option>
  {BRANCH_OPTIONS.map((b) => (
    <option key={b} value={b}>
      {b}
    </option>
  ))}
</select>
            <textarea
              placeholder="Profile Bio (optional)"
              value={profile}
              onChange={(e) => {
                clearError();
                setProfile(e.target.value);
              }}
            />
            <p className="helper-text">You can skip bio & resume for now</p>
            <input
              type="text"
              placeholder="Skills (comma separated)"
              value={skills}
              onChange={(e) => {
                clearError();
                setSkills(e.target.value);
              }}
            />
            <label>Profile Photo</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                clearError();
                setProfilePhoto(e.target.files[0] || null);
              }}
            />

            <label>Resume (PDF) (optional)</label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => {
                clearError();
                setResume(e.target.files[0] || null);
              }}
            />

            <button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Profile"}
            </button>

            <p className="new-user">
              Already have an account?{" "}
              <span onClick={() => navigate("/login")}>Login</span>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
