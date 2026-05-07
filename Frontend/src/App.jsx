import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";
import { onAuthStateChanged } from "firebase/auth";

import PublicHome from "./pages/PublicHome";
import LoginHero from "./pages/LoginHero";
import CreateProfile from "./pages/CreateProfile";
import DashboardLayout from "./pages/DashboardLayout";
import Profile from "./pages/Profile";
import EditProfile from "./pages/EditProfile";
import Match from "./pages/Match";
import UserProfileView from "./pages/UserProfileView";
import ChatBox from "./pages/ChatBox";
import Notifications from "./pages/Notifications";
import Groups from "./pages/Groups";
import GroupWorkspace from "./pages/GroupWorkSpace";
import GroupChat from "./pages/GroupChat";
import GroupAI from "./pages/GroupAI";
import GroupTasks from "./pages/GroupTasks";
import GroupLayout from "./pages/GroupLayout";
import SeniorPage from "./pages/SeniorPage";
import ViewDetails from "./pages/ViewDetails";
import ProtectedRoute from "./component/ProtectedRoute";
import { auth } from "./firebase";

export default function App() {
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const existingUser =
          JSON.parse(localStorage.getItem("user") || "null") || {};
        localStorage.setItem(
          "user",
          JSON.stringify({
            ...existingUser,
            uid: user.uid,
            email: user.email || existingUser.email || "",
          })
        );
      } else {
        localStorage.removeItem("user");
      }

      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  if (!authReady) {
    return (
      <div className="global-bg">
        <Toaster position="top-right" />
      </div>
    );
  }

  return (
    <div className="global-bg">
      <Toaster position="top-right" />
      <BrowserRouter>
        <Routes>

          {/* 🌍 FRONTEND DEMO ROUTES ONLY */}
          <Route path="/" element={<PublicHome />} />
          <Route path="/login" element={<LoginHero />} />
          <Route path="/create-profile" element={<CreateProfile />} />
          {/* DASHBOARD */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
          <Route index element={<Profile />} />
          <Route path="profile" element={<Profile />} />
          <Route path="/dashboard/notifications" element={<Notifications />} />
          <Route path="user/:id" element={<UserProfileView />} />
          <Route path="edit-profile" element={<EditProfile />} />
          <Route path="match" element={<Match />} />
          <Route path="projects" element={<SeniorPage />} />
          <Route path="projects/:id" element={<ViewDetails />} />
          <Route path="messages" element={<ChatBox />} />
          <Route path="messages/:email" element={<ChatBox />} />
          <Route path="groups" element={<Groups />} />
          <Route path="groups/:groupId" element={<GroupLayout />}>
          <Route index element={<GroupWorkspace />} />
          <Route path="workspace" element={<GroupWorkspace />} />
          <Route path="chat" element={<GroupChat />} />
          <Route path="ai" element={<GroupAI />} />
          <Route path="tasks" element={<GroupTasks />} />
          </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
}
