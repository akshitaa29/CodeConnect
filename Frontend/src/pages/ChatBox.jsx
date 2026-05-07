import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/ChatBox.css";
import { apiFetch, getMatches, getUserFriendlyErrorMessage } from "../utils/api";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function ChatBox() {
  const { email: matchEmailParam } = useParams();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const [authReady, setAuthReady] = useState(false);
  const [users, setUsers] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [hoveredMessage, setHoveredMessage] = useState(null);
  const [showMenu, setShowMenu] = useState(false);

  const currentEmail =
    auth.currentUser?.email || localStorage.getItem("email") || "";
  const matchEmail = matchEmailParam || "";

  console.log("Chat with:", matchEmail);

  const formatTime = (createdAt) => {
    if (!createdAt) return "";
    let date = null;

    if (createdAt instanceof Date) {
      date = createdAt;
    } else if (typeof createdAt === "string") {
      date = new Date(createdAt);
    } else if (typeof createdAt === "object") {
      if (typeof createdAt.seconds === "number") {
        date = new Date(createdAt.seconds * 1000);
      } else if (typeof createdAt._seconds === "number") {
        date = new Date(createdAt._seconds * 1000);
      }
    }

    if (!date || Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getMessageKey = (message, index) => {
    if (message.id) return message.id;
    const createdAt = message.createdAt;
    let createdAtKey = null;
    if (typeof createdAt === "string" || typeof createdAt === "number") {
      createdAtKey = createdAt;
    } else if (createdAt instanceof Date) {
      createdAtKey = createdAt.getTime();
    } else if (createdAt && typeof createdAt.seconds === "number") {
      createdAtKey = createdAt.seconds;
    } else if (createdAt && typeof createdAt._seconds === "number") {
      createdAtKey = createdAt._seconds;
    }
    if (createdAtKey !== null && createdAtKey !== undefined) {
      return `${createdAtKey}`;
    }
    return `${message.from || "unknown"}-no-time-${index}`;
  };

  const normalizeMessage = (message) => {
    const from = message.from || message.sender || "";
    const to = message.to || (from === currentEmail ? matchEmail : currentEmail);
    return {
      id: message.id,
      from,
      to,
      text: message.text || "",
      createdAt: message.createdAt || null,
    };
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, () => {
      setAuthReady(true);
    });

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadMatches = async () => {
      try {
        const res = await getMatches();
        if (!isMounted) return;
        const matchList = (res?.matches || []).map((match) => ({
          ...match,
          online: false,
        }));
        setUsers(matchList);

        if (matchEmailParam) {
          const selected = matchList.find(
            (match) => match.email === matchEmailParam
          );
          if (selected) {
            setActiveUser(selected);
            return;
          }
        }

        const fallback = matchList[0] || null;
        setActiveUser((prev) => (prev ? prev : fallback));
        if (!matchEmailParam && fallback?.email) {
          navigate(`/dashboard/messages/${fallback.email}`);
        }
      } catch (err) {
        console.error(
          "Failed to load matches:",
          getUserFriendlyErrorMessage(err, "Failed to load matches")
        );
      }
    };

    if (authReady) {
      loadMatches();
    }

    return () => {
      isMounted = false;
    };
  }, [authReady, matchEmailParam, navigate]);

  const loadMessages = useCallback(async () => {
    if (!authReady || !matchEmail || !currentEmail) return;
    try {
      setLoading(true);
      const params = new URLSearchParams({
        email1: currentEmail,
        email2: matchEmail,
        requester: currentEmail,
      });
      const res = await apiFetch(`/api/messages/messages?${params.toString()}`);
      if (res.success) {
        const normalized = (res.messages || []).map(normalizeMessage);
        setMessages(normalized);
      }
    } catch (err) {
      console.error(
        "Failed to load messages:",
        getUserFriendlyErrorMessage(err, "Failed to load messages")
      );
    } finally {
      setLoading(false);
    }
  }, [authReady, currentEmail, matchEmail]);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      if (!isMounted) return;
      await loadMessages();
    };

    run();

    return () => {
      isMounted = false;
    };
  }, [loadMessages]);

  useEffect(() => {
    return () => {
      if (!authReady || !currentEmail || !matchEmail) return;
      apiFetch("/api/messages/typing", {
        method: "POST",
        body: JSON.stringify({
          email1: currentEmail,
          email2: matchEmail,
          typer: currentEmail,
          isTyping: false,
        }),
      }).catch(() => {});
    };
  }, [authReady, currentEmail, matchEmail]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeUser]);

  const handleSend = async () => {
    if (!newMessage.trim() || !matchEmail || !currentEmail || !authReady) return;

    try {
      const text = newMessage.trim();
      const res = await apiFetch("/api/messages/send", {
        method: "POST",
        body: JSON.stringify({
          from: currentEmail,
          to: matchEmail,
          text,
        }),
      });

      if (res.success) {
        setMessages((prev) => [
          ...prev,
          {
            id: res.chatId ? `${res.chatId}-${Date.now()}` : undefined,
            from: currentEmail,
            to: matchEmail,
            text,
            createdAt: new Date().toISOString(),
          },
        ]);
        setNewMessage("");
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = null;
        }
        await apiFetch("/api/messages/typing", {
          method: "POST",
          body: JSON.stringify({
            email1: currentEmail,
            email2: matchEmail,
            typer: currentEmail,
            isTyping: false,
          }),
        });
        await loadMessages();
      }
    } catch (err) {
      console.error(
        "Failed to send message:",
        getUserFriendlyErrorMessage(err, "Failed to send message")
      );
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!messageId || !currentEmail) return;

    try {
      const res = await apiFetch(`/api/messages/${messageId}`, {
        method: "DELETE",
        body: JSON.stringify({ userId: currentEmail }),
      });

      if (res.success) {
        setMessages((prev) => prev.filter((message) => message.id !== messageId));
      }
    } catch (err) {
      console.error(
        "Failed to delete message:",
        getUserFriendlyErrorMessage(err, "Failed to delete message")
      );
    }
  };

  const handleDeleteChat = async () => {
    if (!currentEmail || !matchEmail) return;

    try {
      const res = await apiFetch("/api/messages/chat", {
        method: "DELETE",
        body: JSON.stringify({
          user1: currentEmail,
          user2: matchEmail,
        }),
      });

      if (res.success) {
        setMessages([]);
        setShowMenu(false);
      }
    } catch (err) {
      console.error(
        "Failed to delete chat:",
        getUserFriendlyErrorMessage(err, "Failed to delete chat")
      );
    }
  };

  return (
    <div className="chat-wrapper">
    <div className="chat-container">
      {/* LEFT SIDEBAR */}
      <aside className="chat-sidebar">
        <h3>Matches</h3>
        {users.map((u) => (
          <div
            key={u.email || u.id || u.name}
            className={`chat-user ${activeUser?.email === u.email ? "active" : ""}`}
            onClick={() => {
              setActiveUser(u);
              if (u.email) {
                navigate(`/dashboard/messages/${u.email}`);
              }
            }}
          >
            <div className={`status ${u.online ? "online" : "offline"}`} />
            <span>{u.name}</span>
          </div>
        ))}
      </aside>

      {/* CHAT AREA */}
      <section className="chat-main">
        <header className="chat-header">
          <h3>{activeUser?.name || " "}</h3>
          
          <div className="menu-wrapper">
  <div
    className="three-dots"
    onClick={(e) => {
      e.stopPropagation();
      setShowMenu((prev) => !prev);
    }}
  >
    ⋮
  </div>

  {showMenu && (
    <div className="dropdown-menu">
      <div onClick={handleDeleteChat}>
        Delete Chat
      </div>
    </div>
  )}
</div>
        </header>

        <div className="chat-messages">
          {messages.map((m, i) => {
            const isMe = m.from === currentEmail;
            return (
            <div
              key={getMessageKey(m, i)}
              className={`bubble ${isMe ? "me" : "them"}`}
              onMouseEnter={() => setHoveredMessage(m.id)}
              onMouseLeave={() => setHoveredMessage(null)}
            >
              <div>
                {m.text}
                {hoveredMessage === m.id && (
                  <span
                    style={{
                      marginLeft: "8px",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                    onClick={() => handleDeleteMessage(m.id)}
                  >
                    🗑
                  </span>
                )}
              </div>
              <span className="message-time">{formatTime(m.createdAt)}</span>
            </div>
          )})}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input">
          <input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => {
              const nextValue = e.target.value;
              setNewMessage(nextValue);
              if (!currentEmail || !matchEmail) return;

              apiFetch("/api/messages/typing", {
                method: "POST",
                body: JSON.stringify({
                  email1: currentEmail,
                  email2: matchEmail,
                  typer: currentEmail,
                  isTyping: true,
                }),
              }).catch(() => {});

              if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
              }
              typingTimeoutRef.current = setTimeout(() => {
                apiFetch("/api/messages/typing", {
                  method: "POST",
                  body: JSON.stringify({
                    email1: currentEmail,
                    email2: matchEmail,
                    typer: currentEmail,
                    isTyping: false,
                  }),
                }).catch(() => {});
                typingTimeoutRef.current = null;
              }, 1200);
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <button onClick={handleSend} disabled={loading || !matchEmail}>
            Send
          </button>
        </div>
      </section>
    </div>
  </div>
  );
}
