//loginhero.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/CCLogo.png";
import "../styles/loginHero.css";
import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from "firebase/auth";
import toast from "react-hot-toast";
import { auth } from "../firebase";

export default function LoginHero() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem("resetEmailSent")) {
      toast.success("You can now reset your password from your email");
      localStorage.removeItem("resetEmailSent");
    }
  }, []);

  const getErrorMessage = (error, fallbackMessage) => {
    const responseMessage =
      error?.response?.data?.message || error?.data?.message || "";
    const errorCode =
      error?.response?.data?.code || error?.data?.code || error?.code || "";

    if (typeof responseMessage === "string" && responseMessage.trim()) {
      return responseMessage;
    }

    switch (errorCode) {
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
      default:
        return fallbackMessage;
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("Please enter your email first");
      return;
    }

    try {
      setResetLoading(true);
      await sendPasswordResetEmail(auth, email);
      localStorage.setItem("resetEmailSent", "true");
      toast.success("Password reset link sent to your email");
    } catch (error) {
      console.error("Reset Error:", error);
      if (error.code === "auth/user-not-found") {
        toast.error("No account found with this email");
      } else if (error.code === "auth/invalid-email") {
        toast.error("Invalid email address");
      } else {
        toast.error("Something went wrong. Try again.");
      }
    } finally {
      setResetLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }

    if (!email.endsWith("@banasthali.in")) {
      setError("Only @banasthali.in emails are allowed");
      return;
    }

    try {
      setLoading(true);

      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      const idToken = await user.getIdToken();

      localStorage.setItem("idToken", idToken);
      localStorage.setItem("token", idToken);
      localStorage.setItem("email", user.email || email);

      const profileRes = await fetch("http://localhost:5000/api/user/profile", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      let profileData = null;

      try {
        profileData = await profileRes.json();
      } catch {
        profileData = null;
      }

      if (!profileRes.ok) {
        const apiError = new Error(
          profileData?.message || "Unable to load your profile"
        );
        apiError.response = { data: profileData };
        throw apiError;
      }

      localStorage.setItem("user", JSON.stringify(profileData));

      setSuccess(true);

      setTimeout(() => {
        setSuccess(false);
        navigate("/");
      }, 2000);
    } catch (err) {
      setError(getErrorMessage(err, "Login failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="split-container">
      {success && (
        <div className="toast-success">
          <div className="toast-strip"></div>
          <span className="toast-text">Logged in successfully!</span>
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
        <form className="login-card" onSubmit={handleLogin}>
          <h2>Login to CodeConnect</h2>

          <p className={`email-warning ${error ? "show" : ""}`}>
            {error || " "}
          </p>
          {success && <p className="success-text">{success}</p>}

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <div className="password-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <span className="eye" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                    d="M2 12s4-7 10-7 10 7 10 7"
                  />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                    d="M3 3l18 18M10.73 5.08A9.99 9.99 0 0112 5c5.52 0 10 4.48 10 7M10.33 14.67A4.98 4.98 0 0112 15c2.76 0 5-2.24 5-5 0-.59-.11-1.15-.3-1.67"
                  />
                </svg>
              )}
            </span>
          </div>
          <p
  className={`forgot-password-text ${resetLoading ? "disabled" : ""}`}
  onClick={!resetLoading ? handleForgotPassword : null}
>
  {resetLoading ? "Sending..." : "Forgot Password?"}
</p>

          <button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>

          

          <p className="new-user">
            New here?{" "}
            <span onClick={() => navigate("/create-profile")}>
              Create Profile
            </span>
          </p>
        </form>
      </div>
    </div>
  );
}
