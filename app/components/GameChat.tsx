"use client";

import "../lobbies/lobbies.css";
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
    <div
      className="lobby-chat-section"
      style={{ flex: 1, display: "flex", flexDirection: "column", margin: 0 }}
    >
      <h3 className="g-section-title">Chat</h3>

      <div
        className="lobby-chat-messages"
        style={{ flex: 1, overflowY: "auto", maxHeight: "calc(100vh - 200px)", minHeight: 80 }}
      >
        {messages.length === 0 ? (
          <p className="lobby-chat-empty">No messages yet...</p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                padding: "5px 0",
                fontFamily: "'Crimson Text', serif",
                fontSize: 14,
                color: "var(--text)",
                borderBottom: "1px solid rgba(58, 47, 34, .2)",
              }}
            >
              <span
                style={{
                  fontWeight: 700,
                  color: msg.userId === userId ? "var(--gold)" : "var(--text)",
                }}
              >
                {msg.userId === userId ? "You" : msg.username}:
              </span>{" "}
              {msg.text}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="lobby-chat-input-row" style={{ marginTop: 12 }}>
        <input
          className="g-input lobby-chat-input"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending}
        />
        <button
          className="btn-outline"
          onClick={handleSend}
          disabled={sending || !input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}