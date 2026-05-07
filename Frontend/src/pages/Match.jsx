import { useEffect, useState } from "react";
import MatchCard from "../component/MatchCard";
import "../styles/Match.css";
import { getDiscoveryUsers, getMyProfile, likeUser } from "../utils/api";

export default function Matches() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [swipeDir, setSwipeDir] = useState(null);
  const [animating, setAnimating] = useState(false);

  const [selectedBatch, setSelectedBatch] = useState("all"); // "all" | "my-batch"
  const [profile, setProfile] = useState(null);
  const [showFilter, setShowFilter] = useState(false);

  const positionMap = ["prev", "active", "next"];

  //--------------------------------------------------
  // LOAD PROFILE
  //--------------------------------------------------
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await getMyProfile();
        if (res?.success) {
          setProfile(res.profile);
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      }
    };

    loadProfile();
  }, []);

  //--------------------------------------------------
  // FETCH USERS (FILTERED)
  //--------------------------------------------------
  useEffect(() => {
    const fetchDiscovery = async () => {
      try {
        setLoading(true);

        let params = {};

        if (selectedBatch === "my-batch") {
          if (!profile?.batch || profile.batch.trim() === "") {
            console.warn("Invalid batch");
            return;
          }

          params.batch = String(profile.batch);
        }

        const data = await getDiscoveryUsers(params);

        setUsers(data.users || []);
        setActiveIndex(0);
      } catch (err) {
        console.error("Failed to load users:", err);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    if (!profile) return;

    fetchDiscovery();
  }, [selectedBatch, profile]);

  //--------------------------------------------------
  // SEARCH FILTER
  //--------------------------------------------------
  useEffect(() => {
    const lower = search.toLowerCase();

    const filtered = users.filter((user) => {
      const name = user.name?.toLowerCase() || "";
      const skills = user.skills?.join(" ").toLowerCase() || "";

      return name.includes(lower) || skills.includes(lower);
    });

    setFilteredUsers(filtered);
    setActiveIndex(0);
  }, [search, users]);

  //--------------------------------------------------
  // SWIPE HANDLER
  //--------------------------------------------------
  const handleAction = (direction) => {
    if (animating) return;

    setSwipeDir(direction);
    setAnimating(true);

    setTimeout(() => {
      setActiveIndex((prev) => prev + 1);
      setAnimating(false);
      setSwipeDir(null);
    }, 150);
  };

  useEffect(() => {
  const handleClickOutside = (e) => {
    if (!e.target.closest(".filter-container")) {
      setShowFilter(false);
    }
  };

  document.addEventListener("click", handleClickOutside);
  return () => document.removeEventListener("click", handleClickOutside);
}, []);

  //--------------------------------------------------
  // LIKE
  //--------------------------------------------------
  const handleLike = async (user) => {
    if (!user?.email) {
      handleAction("right");
      return;
    }

    try {
      await likeUser(user.email);
    } catch (err) {
      console.error("Like failed:", err);
    } finally {
      handleAction("right");
    }
  };

  //--------------------------------------------------
  // VISIBLE CARDS
  //--------------------------------------------------
  const visibleCards = [
    filteredUsers[activeIndex - 1],
    filteredUsers[activeIndex],
    filteredUsers[activeIndex + 1],
  ];

  //--------------------------------------------------
  // UI
  //--------------------------------------------------
  return (
   <div className={`matches-page ${showFilter ? "dropdown-open" : ""}`}>
      <div className="matches-header">
        <h2>Matches</h2>

        <div className="matches-actions">
          {/* SEARCH */}
          <input
            type="text"
            placeholder="Search by name or skill..."
            className="match-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {/* 🔥 FILTER BUTTON + DROPDOWN */}
          <div className="filter-container">
            <button
              className="filter-btn"
              onClick={() => setShowFilter((prev) => !prev)}
            >
              Filter ▼
            </button>

            {showFilter && (
              <div className="filter-dropdown">
                {/* ALL */}
                <div
                  className={`filter-option ${
                    selectedBatch === "all" ? "active" : ""
                  }`}
                  onClick={() => {
                    setSelectedBatch("all");
                    setShowFilter(false);
                  }}
                >
                  <span className="dot" />
                  All
                </div>

                {/* MY BATCH */}
                <div
                  className={`filter-option ${
                    selectedBatch === "my-batch" ? "active" : ""
                  }`}
                  onClick={() => {
                    setSelectedBatch("my-batch");
                    setShowFilter(false);
                  }}
                >
                  <span className="dot" />
                  My Batch ({profile?.batch})
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CAROUSEL */}
      <div className="carousel-wrapper">
        {loading ? (
          <div className="match-card active" style={{ pointerEvents: "none" }}>
            <div
              className="avatar-wrapper"
              style={{ background: "rgba(255,255,255,0.08)" }}
            />
          </div>
        ) : (
          visibleCards.map((user, pos) =>
            user ? (
              <MatchCard
                key={user.email || user.id || `${pos}-${activeIndex}`}
                user={user}
                position={positionMap[pos]}
                animating={animating}
                swipeDir={swipeDir}
                onLike={() => handleLike(user)}
                onDislike={() => handleAction("left")}
              />
            ) : null
          )
        )}
      </div>
    </div>
  );
}