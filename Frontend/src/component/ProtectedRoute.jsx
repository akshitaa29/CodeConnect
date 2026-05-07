import { Navigate } from "react-router-dom";
import { auth } from "../firebase";
import { getStoredUser } from "../utils/api";

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("idToken") || localStorage.getItem("token");
  const user = auth.currentUser || getStoredUser();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
