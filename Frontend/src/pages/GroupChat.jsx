import { useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import "../styles/GroupChat.css";
import {
  getGroupMessages,
  sendGroupMessage as postGroupMessage,
} from "../utils/api";

function formatTime(createdAt) {
  if (!createdAt) return "";

  return new Date(createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function GroupChat() {
  const { group, currentUserEmail, memberByEmail } = useOutletContext();

  const messagesEndRef = useRef(null);

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [openMsgMenu, setOpenMsgMenu] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const res = await getGroupMessages(group.id);
      setMessages(res.messages || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, [group.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!message.trim()) return;

    await postGroupMessage({
      groupId: group.id,
      text: message.trim(),
    });

    setMessage("");
    loadMessages();
  };

  // ✅ DELETE MESSAGE (FRONTEND)
  const deleteMessage = (id) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
    setOpenMsgMenu(null);
  };

  const handleDeleteChat = () => {
    setMessages([]);
    setOpenMsgMenu(null);
  };

  useEffect(() => {
    const onDeleteChat = (event) => {
      if (event.detail?.groupId === group.id) {
        handleDeleteChat();
      }
    };

    window.addEventListener("group-chat:clear", onDeleteChat);
    return () => window.removeEventListener("group-chat:clear", onDeleteChat);
  }, [group.id]);

  return (
    <div className="group-chat-layout">

      {/* ✅ HEADER
      <div className="group-chat-header">
        <h3>{group.name}</h3>
      </div> */}

      {/* ✅ MESSAGES */}
      <div className="group-chat-messages">
        {loading ? [1, 2, 3].map((item) => (
          <div
            key={item}
            className={`group-bubble ${item % 2 === 0 ? "me" : "them"}`}
            style={{ opacity: 0.7 }}
          >
            <div
              style={{
                height: "14px",
                width: item === 2 ? "45%" : "70%",
                background: "rgba(255,255,255,0.12)",
                borderRadius: "999px",
              }}
            />
          </div>
        )) : messages.map((entry) => {
          const isMe = entry.sender === currentUserEmail;
          const sender = memberByEmail[entry.sender];

          return (
            <div
              key={entry.id}
              className={`group-bubble ${isMe ? "me" : "them"}`}
            >
              {!isMe && (
                <strong className="sender-name">
                  {sender?.name || entry.sender}
                </strong>
              )}

              <div>{entry.text}</div>

              <div className="bubble1-footer">
                
              </div>

              {/* ✅ DELETE MENU */}
              {isMe && (
                <div className={`msg-menu1 ${openMsgMenu === entry.id ? "active" : ""}`}>
                  <span
                    className="msg-arrow1"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMsgMenu(openMsgMenu === entry.id ? null : entry.id);
                    }}
                  >
                    ▾
                  </span>

                  <div className="msg-dropdown1">
                    <div onClick={() => deleteMessage(entry.id)}>
                      Delete
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* ✅ INPUT */}
      <div className="group-chat-input">
        <input
          type="text"
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />

        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}
