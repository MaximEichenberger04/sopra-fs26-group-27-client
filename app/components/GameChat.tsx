"use client";

import "@/styles/gameBoard.css";
import { useEffect, useState, useRef, useCallback, type KeyboardEvent } from "react";
import { useApi } from "@/hooks/useApi";
import { ChatMessageGetDTO } from "@/types/game";
import { GifSearchResultDTO } from "@/types/gif";

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
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [gifQuery, setGifQuery] = useState("");
  const [gifResults, setGifResults] = useState<GifSearchResultDTO[]>([]);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const gifInputRef = useRef<HTMLInputElement>(null);

  const fetchChat = useCallback(async () => {
    try {
      const msgs = await api.get<ChatMessageGetDTO[]>(`/games/${gameId}/chat`);
      setMessages(msgs);
    } catch {
      // non-critical
    }
  }, [api, gameId]);

  useEffect(() => {
    fetchChat();
  }, [fetchChat, refreshTrigger]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (gifPickerOpen) gifInputRef.current?.focus();
  }, [gifPickerOpen]);

  const handleSearchGifs = async () => {
    if (!gifQuery.trim()) return;
    try {
      const results = await api.get<GifSearchResultDTO[]>(
        `/gifs/search?q=${encodeURIComponent(gifQuery.trim())}&per_page=50`
      );
      setGifResults(results);
    } catch {
      // non-critical
    }
  };

  useEffect(() => {
    if (!gifQuery.trim()) { setGifResults([]); return; }
    const timer = setTimeout(handleSearchGifs, 400);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gifQuery]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    setSending(true);
    try {
      await api.post(`/games/${gameId}/chat`, { userId, username, text });
      setInput("");
      await fetchChat();
    } catch {
      // non-critical
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSendGif = async (gifUrl: string) => {
    setSending(true);
    try {
      await api.post(`/games/${gameId}/chat`, { userId, username, gifUrl });
      setGifPickerOpen(false);
      setGifQuery("");
      setGifResults([]);
      await fetchChat();
    } catch {
      // non-critical
    } finally {
      setSending(false);
    }
  };

  const toggleGifPicker = () => {
    setGifPickerOpen((o) => !o);
    setGifResults([]);
    setGifQuery("");
  };

  return (
    <div className="vertical-beam" style={{ flex: 1, width: "100%", minHeight: 0, overflow: "hidden" }}>

      <div className="beam-section">
        <h4>CHAT</h4>
      </div>

      <div
        ref={messagesContainerRef}
        style={{ flex: 1, overflowY: "auto", minHeight: 0, marginBottom: 12 }}
      >
        {messages.length === 0 ? (
          <p style={{ color: "var(--q-text-muted)", fontSize: 14, margin: 0 }}>No messages yet...</p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                padding: "5px 0",
                fontSize: 15,
                color: "var(--q-text)",
                borderBottom: "1px solid var(--q-beam-border)",
              }}
            >
              <span style={{
                fontWeight: 700,
                color: msg.userId === userId ? "var(--q-title)" : "var(--q-text)",
              }}>
                {msg.userId === userId ? "You" : msg.username}
                {msg.spectator && (
                  <span style={{ color: "#d96b6b" }}> (Spectator)</span>
                )}
                :
              </span>{" "}
              {msg.gifUrl ? (
                <img
                  src={msg.gifUrl}
                  alt="gif"
                  style={{ maxWidth: "100%", borderRadius: 4, display: "block", marginTop: 4 }}
                  onLoad={() => {
                    const el = messagesContainerRef.current;
                    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
                  }}
                />
              ) : (
                msg.text
              )}
            </div>
          ))
        )}
      </div>

      {gifPickerOpen && (
        <div style={{
          flex: "0 1 50%",
          minHeight: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          borderTop: "1px solid var(--q-beam-border)",
          paddingTop: 8,
        }}>
          <div style={{ display: "flex", gap: 4 }}>
            <input
              ref={gifInputRef}
              className="chat-input"
              placeholder="Search GIFs..."
              value={gifQuery}
              onChange={(e) => setGifQuery(e.target.value)}
            />
          </div>
          <div style={{
            flex: 1,
            overflowY: "auto",
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 4,
            alignContent: "start",
          }}>
            {gifResults.map((g) => (
              <img
                key={g.id}
                src={g.previewUrl}
                alt="gif"
                style={{ width: "100%", aspectRatio: "1", objectFit: "cover", cursor: "pointer", borderRadius: 4 }}
                onClick={() => handleSendGif(g.gifUrl)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="horizontal-beam" style={{ padding: 0 }}>
        <input
          className="chat-input"
          placeholder="Type a message..."
          value={input}
          ref={inputRef}
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
        <button
          className="chat-btn send-btn"
          onClick={toggleGifPicker}
          disabled={sending}
          style={{ flexShrink: 0 }}
        >
          {gifPickerOpen ? "✕" : "GIF"}
        </button>
      </div>
    </div>
  );
}
