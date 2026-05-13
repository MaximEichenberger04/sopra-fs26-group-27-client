"use client";

import "../../lobbies/lobbies.css";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Lobby } from "@/types/lobby";
import { User } from "@/types/user";
import { useApi } from "@/hooks/useApi";
import NavBar from "@/components/NavBar";
import { Avatar } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { getCosmeticById } from "@/types/cosmetics";
import Image from "next/image";

// Map metadata: theme key → display name + image path
const MAP_INFO: Record<string, { label: string; image: string }> = {
  "mystic-grove": { label: "Mystic Grove", image: "/maps/forest.png" },
  "obsidian-keep": { label: "Obsidian Keep", image: "/maps/castle.png" },
  "celestial-sanctum": { label: "Celestial Sanctum", image: "/maps/sanctum.png" },
};

const LobbyPage: React.FC = () => {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const apiService = useApi();

  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const lobbyId = params.id;

  const [editName, setEditName] = useState("");
  const [editGameMode, setEditGameMode] = useState("");
  const [editMaxPlayers, setEditMaxPlayers] = useState("");
  const [editMapTheme, setEditMapTheme] = useState("mystic-grove");

  // Track whether we've done the first load — only sync edit state on first fetch,
  // not on every 2-second poll (which was causing the dropdown reset bug).
  const initializedRef = useRef(false);

  const fetchUsers = useCallback(async (playerIds: number[]) => {
    try {
      const fetched = await Promise.all(
        playerIds.map((id) => apiService.get<User>(`/users/${id}`))
      );
      setUsers(fetched);
    } catch {
      // ignore for now
    }
  }, [apiService]);

  const fetchLobby = useCallback(async () => {
    try {
      const response = await apiService.get<Lobby>(`/lobbies/${lobbyId}`);

      if (response.lobbyStatus === "INGAME") {
        router.push(`/games/${response.gameId}`);
        return;
      }

      setLobby(response);

      // Only sync edit dropdowns on the FIRST load so in-progress edits aren't stomped by polling
      if (!initializedRef.current) {
        initializedRef.current = true;
        if (response.mapTheme) setEditMapTheme(response.mapTheme);
        if (response.gameMode) setEditGameMode(response.gameMode);
        if (response.maxPlayers) setEditMaxPlayers(String(response.maxPlayers));
        if (response.name) setEditName(response.name);
      }

      if (response.playerIds) {
        await fetchUsers(response.playerIds);
      }
    } catch (error) {
      if (error instanceof Error) {
        alert(`Failed to load lobby:\n${error.message}`);
      }
    }
  }, [lobbyId, router, fetchUsers, apiService]);

  useEffect(() => {
    fetchLobby();
    const interval = globalThis.setInterval(fetchLobby, 2000);

    let ws: WebSocket;
    let reconnectTimeout: ReturnType<typeof setTimeout>;
    let destroyed = false;

    function connect() {
      const wsDomain = (process.env.NEXT_PUBLIC_PROD_API_URL || "http://localhost:8080")
        .replace(/^https/, "wss")
        .replace(/^http/, "ws");

      ws = new WebSocket(`${wsDomain}/game-refresh-websocket`);

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as { type: string; gameId: string };
          if (msg.type === "GAME_STARTED") fetchLobby();
        } catch { /* ignore */ }
      };

      ws.onclose = () => {
        if (!destroyed) reconnectTimeout = setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      destroyed = true;
      clearTimeout(reconnectTimeout);
      ws?.close();
      globalThis.clearInterval(interval);
    };
  }, [fetchLobby]);

  // Store active lobby in sessionStorage so the global watcher (NavBar) can redirect
  // even when the player has navigated away from this page.
  useEffect(() => {
    sessionStorage.setItem("activeLobbyId", lobbyId);
    return () => {
      // Leave it set; the game page clears it on arrival
    };
  }, [lobbyId]);

  const handleLeave = async () => {
    try {
      await apiService.post(`/lobbies/${lobbyId}/leave`, {});
      sessionStorage.removeItem("activeLobbyId");
      router.push("/lobbies");
    } catch (error) {
      if (error instanceof Error) {
        alert(`Failed to leave:\n${error.message}`);
      }
    }
  };

  const handleStart = async () => {
    setStarting(true);
    try {
      const game = await apiService.post<{ id: string }>(`/lobbies/${lobbyId}/start`, {});
      sessionStorage.removeItem("activeLobbyId");
      router.push(`/games/${game.id}`);
    } catch (error) {
      if (error instanceof Error) {
        alert(`Failed to start:\n${error.message}`);
      }
    } finally {
      setStarting(false);
    }
  };

  const handleSave = async () => {
    if (!lobby) return;

    setSaving(true);
    try {
      await apiService.put(`/lobbies/${lobbyId}`, {
        name: editName || lobby.name,
        gameMode: editGameMode || lobby.gameMode,
        maxPlayers: editMaxPlayers ? Number(editMaxPlayers) : lobby.maxPlayers,
        mapTheme: editMapTheme,
      });

      // Refresh lobby display WITHOUT resetting edit fields
      const response = await apiService.get<Lobby>(`/lobbies/${lobbyId}`);
      setLobby(response);
      if (response.playerIds) await fetchUsers(response.playerIds);
    } catch (error) {
      if (error instanceof Error) {
        alert(`Failed to save:\n${error.message}`);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!lobby) return null;

  const raw = localStorage.getItem("userId");
  let currentUserId: string | null = null;
  try {
    currentUserId = JSON.parse(raw ?? "");
  } catch {
    currentUserId = raw;
  }

  const isHost = currentUserId !== null && Number(currentUserId) === lobby.hostId;
  const isFull = lobby.currentPlayers === lobby.maxPlayers;
  const canStart = isHost && isFull && lobby.lobbyStatus === "WAITING";
  const emptySlots = Math.max(0, (lobby.maxPlayers ?? 0) - users.length);

  // Host sees a live preview (their current dropdown selection).
  // Guest sees the saved lobby value.
  const activeMapTheme = isHost ? editMapTheme : (lobby.mapTheme ?? "mystic-grove");
  const activeMap = MAP_INFO[activeMapTheme] ?? MAP_INFO["mystic-grove"];

  return (
    <div className="lobby-room-wrap">
      <NavBar />
      <div className="lobby-room-content">
        <div className="lobby-room-header">
          <h2 className="lobby-room-title">{lobby.name}</h2>
          <button className="btn-danger" onClick={handleLeave}>Leave Lobby</button>
        </div>

        <div className="lobby-room-grid">
          <div className="lobby-room-section">
            <h3 className="g-section-title">{isHost ? "Lobby Settings (Host)" : "Lobby Info"}</h3>
            <div className="lobby-info-row">
              <span className="lobby-info-label">Game Mode</span>
              <span className="lobby-info-value">{lobby.gameMode}</span>
            </div>
            <div className="lobby-info-row">
              <span className="lobby-info-label">Max Players</span>
              <span className="lobby-info-value">{lobby.maxPlayers}</span>
            </div>
            <div className="lobby-info-row">
              <span className="lobby-info-label">Map</span>
              <span className="lobby-info-value">{MAP_INFO[lobby.mapTheme ?? "mystic-grove"]?.label ?? lobby.mapTheme}</span>
            </div>
            <div className="lobby-info-row">
              <span className="lobby-info-label">Status</span>
              <span className={`lobby-status-tag ${lobby.lobbyStatus === "WAITING" ? "status-waiting" : "status-other"}`}>
                {lobby.lobbyStatus}
              </span>
            </div>
            <div className="lobby-info-row" style={{ borderBottom: "none" }}>
              <span className="lobby-info-label">Invite Code</span>
              <span className="lobby-invite-code">{lobby.inviteCode}</span>
            </div>
          </div>

          <div className="lobby-room-section">
            <h3 className="g-section-title">Players ({lobby.currentPlayers}/{lobby.maxPlayers})</h3>
            {users.map((user) => {
              const borderItem = user.equippedBorder ? getCosmeticById(user.equippedBorder) : null;
              return (
                <div key={user.id} className="lobby-player-row">
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className={`avatar-ring-wrap avatar-ring-sm ${borderItem ? borderItem.cssClass : ""}`}>
                      <Avatar
                        size={28}
                        src={user.avatarURL ?? undefined}
                        icon={!user.avatarURL && <UserOutlined />}
                        style={{ background: "#2a1f12", border: "1px solid rgba(200,168,50,.3)" }}
                      />
                    </div>
                    <span>@{user.username}</span>
                    {String(user.id) === String(lobby.hostId) && (
                      <span className="lobby-host-badge">Host</span>
                    )}
                  </div>
                </div>
              );
            })}

            {Array.from({ length: emptySlots }).map((_, i) => (
              <p key={`empty-${i}`} className="lobby-slot-empty">
                Slot {users.length + i + 1} — Awaiting challenger...
              </p>
            ))}

            {canStart && (
              <button
                className="btn-gold"
                style={{ width: "100%", marginTop: 16 }}
                onClick={handleStart}
                disabled={starting}
              >
                {starting ? "Starting..." : "Start Game"}
              </button>
            )}

            {isHost && !canStart && (lobby.currentPlayers ?? 0) < (lobby.maxPlayers ?? 0) && (
              <button className="btn-outline" style={{ width: "100%", marginTop: 16 }} disabled>
                Waiting for players ({lobby.currentPlayers}/{lobby.maxPlayers})
              </button>
            )}
          </div>
        </div>

        {/* ── Host: compact edit panel with live map preview on the right ── */}
        {isHost && (
          <div className="g-card lobby-edit-section">
            <h3 className="g-section-title">
              Edit Lobby <span style={{ fontWeight: 400, opacity: 0.55, fontSize: 12 }}>(Host Only)</span>
            </h3>
            <div className="lobby-edit-inner">
              {/* Left: controls */}
              <div className="lobby-edit-controls">
                <div className="g-field">
                  <label className="g-label">Lobby Name</label>
                  <input
                    className="g-input"
                    placeholder={lobby.name ?? ""}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
                <div className="g-field">
                  <label className="g-label">Game Mode</label>
                  <select className="g-select" value={editGameMode} onChange={(e) => setEditGameMode(e.target.value)}>
                    <option value="CLASSIC">Classic</option>
                    <option value="CHAOS">Chaos</option>
                  </select>
                </div>
                <div className="g-field">
                  <label className="g-label">Map</label>
                  <select className="g-select" value={editMapTheme} onChange={(e) => setEditMapTheme(e.target.value)}>
                    <option value="mystic-grove">Mystic Grove</option>
                    <option value="obsidian-keep">Obsidian Keep</option>
                    <option value="celestial-sanctum">Celestial Sanctum</option>
                  </select>
                </div>
                <div className="g-field">
                  <label className="g-label">Player Count</label>
                  <select className="g-select" value={editMaxPlayers} onChange={(e) => setEditMaxPlayers(e.target.value)}>
                    <option value="2">2</option>
                    <option value="4">4</option>
                  </select>
                </div>
                <button className="btn-outline" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>

              {/* Right: live map preview */}
              <div className="lobby-map-preview">
                <p className="lobby-map-preview-name">{activeMap.label}</p>
                <div className="lobby-map-preview-img-wrap">
                  <Image
                    src={activeMap.image}
                    alt={activeMap.label}
                    fill
                    style={{ objectFit: "cover", borderRadius: 8 }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Non-host: map preview card ── */}
        {!isHost && (
          <div className="lobby-map-viewer">
            <p className="lobby-map-viewer-name">{activeMap.label}</p>
            <div className="lobby-map-viewer-img-wrap">
              <Image
                src={activeMap.image}
                alt={activeMap.label}
                fill
                style={{ objectFit: "cover", borderRadius: 10 }}
              />
            </div>
          </div>
        )}

        <div className="lobby-bottom-actions">
          <button className="btn-outline" onClick={() => router.push("/lobbies")}>
            ← Back to Browser
          </button>
        </div>
      </div>
    </div>
  );
};

export default LobbyPage;
