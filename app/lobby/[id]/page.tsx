"use client";

import "../../lobbies/lobbies.css";
import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Lobby } from "@/types/lobby";
import { User } from "@/types/user";
import { useApi } from "@/hooks/useApi";
import NavBar from "@/components/NavBar";

const LobbyPage: React.FC = () => {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const apiService = useApi();
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const lobbyId = params.id;

  // Edit fields
  const [editName, setEditName] = useState("");
  const [editGameMode, setEditGameMode] = useState("");
  const [editMaxPlayers, setEditMaxPlayers] = useState("");

  const fetchUsers = async (playerIds: number[]) => {
    try {
      const fetched = await Promise.all(playerIds.map((id) => apiService.get<User>(`/users/${id}`)));
      setUsers(fetched);
    } catch { }
  };

  const fetchLobby = async () => {
    try {
      const response = await apiService.get<Lobby>(`/lobbies/${lobbyId}`);

      // Redirect all players when game starts (US#7)
      if (response.lobbyStatus === "INGAME") {
        router.push(`/game/${lobbyId}`);
        return;
      }

      setLobby(response);
      if (response.playerIds) await fetchUsers(response.playerIds);
    } catch (error) {
      if (error instanceof Error) alert(`Failed to load lobby:\n${error.message}`);
    }
  }, [lobbyId, router, fetchMissingUsernames, apiService]);

  useEffect(() => {
    fetchLobby();
    const interval = globalThis.setInterval(fetchLobby, 2000);
    return () => globalThis.clearInterval(interval);
  }, [lobbyId]);

  const handleSave = async () => {
    setSaving(true);
    const payload: Record<string, string | number> = {};
    if (editName.trim()) payload.name = editName.trim();
    if (editGameMode) payload.gameMode = editGameMode;
    if (editMaxPlayers) payload.maxPlayers = parseInt(editMaxPlayers, 10);
    try { await apiService.put(`/lobbies/${lobbyId}`, payload); await fetchLobby(); } catch (error) {
      if (error instanceof Error) alert(`Failed to update:\n${error.message}`);
    } finally { setSaving(false); }
  };

  const handleLeave = async () => {
    try { await apiService.post(`/lobbies/${lobbyId}/leave`, {}); router.push("/lobbies"); } catch (error) {
      if (error instanceof Error) alert(`Failed to leave:\n${error.message}`);
    }
  };

  const handleStart = async () => {
    setStarting(true);
    try { await apiService.post(`/lobbies/${lobbyId}/start`, {}); await fetchLobby(); } catch (error) {
      if (error instanceof Error) alert(`Failed to start:\n${error.message}`);
    } finally { setStarting(false); }
  };

  if (!lobby) return null;

  const raw = localStorage.getItem("userId");
  let currentUserId: string | null = null;
  try { currentUserId = JSON.parse(raw ?? ""); } catch { currentUserId = raw; }
  const isHost = String(currentUserId) === String(lobby.hostId);
  const canStart = isHost && lobby.currentPlayers === lobby.maxPlayers && lobby.lobbyStatus === "WAITING";
  const emptySlots = Math.max(0, (lobby.maxPlayers ?? 0) - users.length);

  const isHost = currentUserId !== null && Number(currentUserId) === lobby.hostId;
  const isFull = lobby.currentPlayers === lobby.maxPlayers;
  const canStart = isHost && isFull;

  return (
    <div className="lobby-room-wrap">
      <NavBar />
      <div className="lobby-room-content">
        {/* Header */}
        <div className="lobby-room-header">
          <h2 className="lobby-room-title">{lobby.name}</h2>
          <button className="btn-danger" onClick={handleLeave}>Leave Lobby</button>
        </div>

        {/* Two-column grid */}
        <div className="lobby-room-grid">
          {/* Left: Settings / Info */}
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

          {/* Right: Players */}
          <div className="lobby-room-section">
            <h3 className="g-section-title">Players ({lobby.currentPlayers}/{lobby.maxPlayers})</h3>
            {users.map((user) => (
              <div key={user.id} className="lobby-player-row">
                <span>@{user.username}</span>
                {String(user.id) === String(lobby.hostId) && (
                  <span className="lobby-host-badge">Host</span>
                )}
              </div>
            ))}
            {Array.from({ length: emptySlots }).map((_, i) => (
              <p key={`empty-${i}`} className="lobby-slot-empty">
                Slot {users.length + i + 1} — Awaiting challenger...
              </p>
            ))}

            {/* Start button */}
            {canStart && (
              <button className="btn-gold" style={{ width: "100%", marginTop: 16 }} onClick={handleStart} disabled={starting}>
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

        {/* Host Edit */}
        {isHost && (
          <div className="g-card lobby-edit-section">
            <h3 className="g-section-title">Edit Lobby (Host Only)</h3>
            <div className="g-field">
              <label className="g-label">Lobby Name</label>
              <input className="g-input" placeholder={lobby.name ?? ""} value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="g-field">
              <label className="g-label">Game Mode</label>
              <select className="g-select" value={editGameMode} onChange={(e) => setEditGameMode(e.target.value)}>
                <option value="">{lobby.gameMode}</option>
                <option value="CLASSIC">Classic</option>
                <option value="CHAOS">Chaos</option>
              </select>
            </div>
            <div className="g-field">
              <label className="g-label">Player Count</label>
              <select className="g-select" value={editMaxPlayers} onChange={(e) => setEditMaxPlayers(e.target.value)}>
                <option value="">{lobby.maxPlayers}</option>
                <option value="2">2</option>
                <option value="4">4</option>
              </select>
            </div>
            <button className="btn-outline" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}

        {/* Chat placeholder */}
        <div className="lobby-chat-section">
          <h3 className="g-section-title">Chat</h3>
          <div className="lobby-chat-messages">
            <p className="lobby-chat-empty">Chat coming soon...</p>
          </div>
          <div className="lobby-chat-input-row">
            <input className="g-input lobby-chat-input" placeholder="Type a message..." disabled />
            <button className="btn-outline" disabled>Send</button>
          </div>
        </div>

        {/* Bottom actions */}
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