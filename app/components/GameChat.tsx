"use client";

import "@/styles/gameBoard.css";
import { useEffect, useState, useRef, useCallback } from "react";
import { useApi } from "@/hooks/useApi";
import { ChatMessageGetDTO } from "@/types/game";

interface Props {
  gameId: string;
  userId: number;
  username: string;
  token: string;
  refreshTrigger: number;
}

export default function GameChat({ gameId, userId, username, token, refreshTrigger }: Props) {
  const api = useApi(token);
  const [messages, setMessages] = useState<ChatMessageGetDTO[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Fetch chat history
  const fetchChat = useCallback(async () => {
    try {
      const msgs = await api.get<ChatMessageGetDTO[]>(`/games/${gameId}/chat`);
      setMessages(msgs);
    } catch {
      // chat is non-critical, swallow errors silently
    }
  }, [api, gameId]);

  // Re-fetch on mount and whenever the parent increments refreshTrigger
  useEffect(() => {
    fetchChat();
  }, [fetchChat, refreshTrigger]);

  // Auto-scroll to the latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send a message
  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    setSending(true);
    try {
      // POST body must include userId, username, and text
      await api.post(`/games/${gameId}/chat`, { userId, username, text });
      setInput("");
      await fetchChat(); // fetch immediately; the WS event will trigger another refresh shortly
    } catch {
      // non-critical
    } finally {
        // Re-enable send button whether request succeeded or failed
        setSending(false);
    }
  };

  // handles the Enter key in the chat input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="vertical-beam" style={{ flex: 1, width: "100%", minHeight: 0 }}>

      <div className="beam-section">
        <h4>CHAT</h4>
      </div>

      <div style={{ flex: 1, overflowY: "auto", minHeight: 80, marginBottom: 12 }}>
        {messages.length === 0 ? (
          <p style={{ color: "var(--q-text-muted)", fontSize: 12, margin: 0 }}>No messages yet...</p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                padding: "5px 0",
                fontSize: 13,
                color: "var(--q-text)",
                borderBottom: "1px solid var(--q-beam-border)",
              }}
            >
              <span style={{
                fontWeight: 700,
                color: msg.userId === userId ? "var(--q-title)" : "var(--q-text)",
              }}>
                {msg.userId === userId ? "You" : msg.username}:
              </span>{" "}
              {msg.text}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="horizontal-beam" style={{ padding: 0 }}>
        <input
          className="chat-input"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending}
        />
        <button
          className="chat-btn send-btn"
          onClick={handleSend}
          disabled={sending || !input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}