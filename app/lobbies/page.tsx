"use client";

import "./lobbies.css";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import { Lobby } from "@/types/lobby";
import NavBar from "@/components/NavBar";
import useLocalStorage from "@/hooks/useLocalStorage";

const LobbyBrowserPage: React.FC = () => {
  const router = useRouter();
  const apiService = useApi();
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(true);
  const { value: token } = useLocalStorage<string>("token", "");

  useEffect(() => {
    if (!token) router.push("/login");
  }, [token, router]);

  const fetchLobbies = async () => {
    try {
      const response = await apiService.get<Lobby[]>("/lobbies");
      setLobbies(response);
    } catch (error) {
      if (error instanceof Error) alert(`Failed to load lobbies:\n${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLobbies();
    const interval = globalThis.setInterval(fetchLobbies, 5000);
    return () => globalThis.clearInterval(interval);
  }, []);

  const joinByCode = async () => {
    try {
      const lobby = await apiService.post<Lobby>(`/lobbies/join/${inviteCode}`, {});
      router.push(`/lobby/${lobby.id}`);
    } catch (error) {
      if (error instanceof Error) alert(`Failed to join lobby:\n${error.message}`);
    }
  };

  const joinLobbyById = async (lobbyId: number) => {
    try {
      const joined = await apiService.post<Lobby>(`/lobbies/${lobbyId}/join`, {});
      router.push(`/lobby/${joined.id}`);
    } catch (error) {
      if (error instanceof Error) alert(`Failed to join lobby:\n${error.message}`);
    }
  };

  return (
    <div className="lobby-page-wrap">
      <NavBar />
      <div className="lobby-content">
        {/* Header row */}
        <div className="lobby-header-row">
          <h2 className="lobby-page-title">Browse Lobbies</h2>
          <div className="lobby-header-actions">
            <input
              className="g-input lobby-code-input"
              placeholder="Invite code..."
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            />
            <button className="btn-gold" onClick={() => router.push("/lobby")}>
              + Create Lobby
            </button>
          </div>
        </div>

        {/* Lobby list */}
        <div className="lobby-list">
          {loading ? (
            <p className="lobby-empty">Loading...</p>
          ) : lobbies.length === 0 ? (
            <p className="lobby-empty">No lobbies available. Create one!</p>
          ) : (
            lobbies.map((lobby) => (
              <div key={lobby.id} className="g-card lobby-row-card">
                <div className="lobby-row-info">
                  <span className="lobby-row-name">{lobby.name}</span>
                  <span className="lobby-row-meta">
                    {lobby.currentPlayers}/{lobby.maxPlayers} players
                  </span>
                </div>
                <div className="lobby-row-right">
                  <span className="lobby-mode-tag">{lobby.gameMode}</span>
                  <span className={`lobby-status-tag ${lobby.lobbyStatus === "WAITING" ? "status-waiting" : "status-other"}`}>
                    {lobby.lobbyStatus}
                  </span>
                  <button className="btn-gold lobby-join-btn" onClick={() => { if (lobby.id !== null) joinLobbyById(lobby.id); }}>
                    Join
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {inviteCode && (
          <button className="btn-outline" style={{ marginTop: 16 }} onClick={joinByCode}>
            Join via Code: {inviteCode}
          </button>
        )}

        <button className="btn-outline" style={{ marginTop: 16 }} onClick={() => router.push("/users")}>
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default LobbyBrowserPage;