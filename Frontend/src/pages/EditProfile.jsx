import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/EditProfile.css";
import {
  getUserFriendlyErrorMessage,
  getUserProfile,
  updateProfilePhoto,
  updateUserProfile,
} from "../utils/api";
import { uploadProfilePhoto } from "../utils/uploadProfilePhoto";

/* ---------- Utility: URL validation ---------- */
const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};


const normalizeUrl = (url) => {
  if (!url) return "";
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return "https://" + url;
  }
  return url;
};

export default function EditProfile() {
  const navigate = useNavigate();
  

  /* ---------- Form State ---------- */
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    role: "",
    bio: "",
    skills: "",
    batch: "",
    branch: "",
    photoURL: "",
    github: "",
    linkedin: ""
  });

  /* ---------- Error State ---------- */
  const [errors, setErrors] = useState({
    github: "",
    linkedin: ""
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [formError, setFormError] = useState("");

  /* ---------- Load existing user ---------- */
  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      setLoading(true);
      setFormError("");
      try {
        const profile = await getUserProfile();
        if (!isMounted) return;
        setFormData({
          email: profile.email || "",
          name: profile.name || "",
          role: profile.role || profile.title || "",
          bio: profile.bio || profile.about || profile.profile || "",
          skills: profile.skills?.join(", ") || "",
          batch: profile.batch || "",
          branch: profile.branch || "",
          photoURL: profile.photoURL || profile.profilePhoto || "",
          github: profile.links?.github || "",
          linkedin: profile.links?.linkedin || ""
        });
      } catch (err) {
        if (!isMounted) return;
        setFormError(getUserFriendlyErrorMessage(err, "Failed to load profile"));
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFormError("");
    setUploadingPhoto(true);

    try {
      const email = formData.email || JSON.parse(localStorage.getItem("user") || "{}").email;
      if (!email) {
        throw new Error("USER_EMAIL_MISSING");
      }

      const downloadURL = await uploadProfilePhoto(file, email);
      const updatedUser = await updateProfilePhoto(downloadURL);

      localStorage.setItem("user", JSON.stringify(updatedUser));
      window.dispatchEvent(new Event("userUpdated"));

      setFormData((prev) => ({
        ...prev,
        photoURL: downloadURL,
      }));
    } catch (err) {
      setFormError(getUserFriendlyErrorMessage(err, "Failed to update profile photo"));
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  };

  /* ---------- Input change ---------- */
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  /* ---------- Save profile ---------- */
 const handleSave = async () => {
  let newErrors = { github: "", linkedin: "" };

  const githubUrl = normalizeUrl(formData.github);
  const linkedinUrl = normalizeUrl(formData.linkedin);

  if (githubUrl && !isValidUrl(githubUrl)) {
    newErrors.github = "Please enter a valid GitHub URL";
  }

  if (linkedinUrl && !isValidUrl(linkedinUrl)) {
    newErrors.linkedin = "Please enter a valid LinkedIn URL";
  }

  if (newErrors.github || newErrors.linkedin) {
    setErrors(newErrors);
    return;
  }

  setSaving(true);
  setFormError("");

  try {
    const payload = {
      name: formData.name,
      role: formData.role,
      bio: formData.bio,
      skills: formData.skills
        ? formData.skills.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      batch: formData.batch,
      branch: formData.branch,
      links: {
        github: normalizeUrl(formData.github),
        linkedin: normalizeUrl(formData.linkedin)
      }
    };

    const updatedUser = await updateUserProfile(payload);
    localStorage.setItem("user", JSON.stringify(updatedUser));
    window.dispatchEvent(new Event("userUpdated"));
    navigate("/dashboard/profile");
  } catch (err) {
    setFormError(getUserFriendlyErrorMessage(err, "Failed to update profile"));
  } finally {
    setSaving(false);
  }
};

  /* ---------- JSX ---------- */
  return (
    <div className="edit-profile-page">
      <h2>Edit Profile</h2>

      <div className="edit-card">
        {loading && <p style={{ color: "#c7c7c7" }}>Loading profile...</p>}
        {formError && <p className="error-text">{formError}</p>}

        {/* Profile Photo */}
        <div className="photo-section">
          <img
            src={formData.photoURL || "/default-avatar.png"}
            alt="Profile"
            onError={(e) => {
              e.currentTarget.src = "/default-avatar.png";
            }}
          />
          <input type="file" accept="image/*" onChange={handlePhotoChange} />
          {uploadingPhoto && <p style={{ color: "#c7c7c7" }}>Uploading photo...</p>}
        </div>

        {/* Basic Info */}
        <input
          name="name"
          placeholder="Full Name"
          value={formData.name}
          onChange={handleChange}
        />

        <input
          name="role"
          placeholder="Role"
          value={formData.role}
          onChange={handleChange}
        />

        <textarea
          name="bio"
          placeholder="Bio"
          value={formData.bio}
          onChange={handleChange}
        />

        <input
          name="skills"
          placeholder="Skills (comma separated)"
          value={formData.skills}
          onChange={handleChange}
        />

        {/* Academic Info */}
        <div className="row">
          <input
            name="batch"
            placeholder="Batch"
            value={formData.batch}
            onChange={handleChange}
          />
          <input
            name="branch"
            placeholder="Branch"
            value={formData.branch}
            onChange={handleChange}
          />
        </div>

        {/* Links */}
        <input
          name="github"
          placeholder="GitHub profile link"
          value={formData.github}
          onChange={handleChange}
        />
        {errors.github && <p className="error-text">{errors.github}</p>}

        <input
          name="linkedin"
          placeholder="LinkedIn profile link"
          value={formData.linkedin}
          onChange={handleChange}
        />
        {errors.linkedin && <p className="error-text">{errors.linkedin}</p>}

        <button onClick={handleSave} disabled={saving || loading}>
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
