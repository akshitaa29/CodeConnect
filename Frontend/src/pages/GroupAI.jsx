import { useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import "../styles/GroupAI.css";
import {
  apiFetch,
  getUserFriendlyErrorMessage,
  requestAiTaskBreakdown,
  sendGroupAiPrompt,
} from "../utils/api";

function getTimeLabel(value = new Date()) {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function GroupAI() {
  const { group, setTasks, isAdmin, refreshGroup } = useOutletContext();
  const messagesEndRef = useRef(null);

  const [message, setMessage] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    let active = true;

    const loadChatHistory = async () => {
      try {
        const res = await apiFetch(
          `/api/group-dashboard/ai-chat-history?groupId=${group.id}`,
          { method: "GET" }
        );

        if (!active) {
          return;
        }

        setMessages(
          (res.messages || []).map((entry) => ({
            type:
              entry.role === "assistant" ? "ai" :
              entry.role === "user" ? "user" : "system",
            text: entry.message,
            time: entry.createdAt ? getTimeLabel(entry.createdAt) : "",
          }))
        );
      } catch (err) {
        if (!active) {
          return;
        }

        setMessages([
          {
            type: "system",
            text: getUserFriendlyErrorMessage(err, "Failed to load AI chat history"),
            time: getTimeLabel(),
          },
        ]);
      }
    };

    if (group?.id) {
      loadChatHistory();
    }

    return () => {
      active = false;
    };
  }, [group?.id]);

  const pushMessage = (nextMessage) => {
    setMessages((prev) => [...prev, nextMessage]);
  };

  const handleUploadProject = async () => {
    if (!projectDesc.trim() || busy) {
      return;
    }

    try {
      setBusy(true);
      pushMessage({
        type: "user",
        text: projectDesc.trim(),
        time: getTimeLabel(),
      });

      const res = await requestAiTaskBreakdown({
        groupId: group.id,
        projectDescription: projectDesc.trim(),
      });

      setTasks(res.tasks || []);
      await refreshGroup();
      pushMessage({
        type: "ai",
        text: res.chatMessage || `Generated ${res.tasks?.length || 0} tasks and assigned them to the group.`,
        time: getTimeLabel(),
      });
      setProjectDesc("");
    } catch (err) {
      pushMessage({
        type: "system",
        text: getUserFriendlyErrorMessage(err, "Failed to generate tasks"),
        time: getTimeLabel(),
      });
    } finally {
      setBusy(false);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || busy) {
      return;
    }

    const userMessage = message.trim();

    pushMessage({
      type: "user",
      text: userMessage,
      time: getTimeLabel(),
    });
    setMessage("");

    try {
      setBusy(true);
      const res = await sendGroupAiPrompt({
        groupId: group.id,
        message: userMessage,
      });

      if (res.tasks) {
        setTasks(res.tasks);
      }
      await refreshGroup();

      pushMessage({
        type: "ai",
        text: res.chatMessage || "AI updated the task plan.",
        time: getTimeLabel(),
      });
    } catch (err) {
      pushMessage({
        type: "system",
        text: getUserFriendlyErrorMessage(err, "Failed to contact AI assistant"),
        time: getTimeLabel(),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="group-ai-container">
     

      {isAdmin && (
        <div className="ai-upload-panel">
          <textarea
            placeholder="Paste the project description to generate tasks..."
            value={projectDesc}
            onChange={(event) => setProjectDesc(event.target.value)}
          />
          <button onClick={handleUploadProject} disabled={busy}>
            {busy ? "Working..." : "Generate Tasks"}
          </button>
        </div>
      )}

      <div className="group-ai-messages">
        {messages.length === 0 && (
          <div className="ai-bubble system">
            <div>Use AI to generate tasks or request changes to the current task plan.</div>
          </div>
        )}

        {messages.map((entry, index) => (
          <div key={`${entry.type}-${index}`} className={`ai-bubble ${entry.type}`}>
            <div>{entry.text}</div>
            {entry.time && <span className="message-time">{entry.time}</span>}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="group-ai-input">
        <input
          type="text"
          placeholder="Ask AI to revise, add, or reorganize tasks..."
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && sendMessage()}
        />
        <button onClick={sendMessage} disabled={busy}>
          {busy ? "Working..." : "Send"}
        </button>
      </div>
    </div>
  );
}
