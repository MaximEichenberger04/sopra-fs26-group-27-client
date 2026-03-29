"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Lobby } from "@/types/lobby";
import { User } from "@/types/user";
import { useApi } from "@/hooks/useApi";
import { Button, Card, Col, Row, Select, Tag } from "antd";

const LobbyPage: React.FC = () => {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const apiService = useApi();
  const lobbyId = params.id;

  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [playerNames, setPlayerNames] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);

  // Settings form state (host only)
  const [settingsGameMode, setSettingsGameMode] = useState("");
  const [settingsMaxPlayers, setSettingsMaxPlayers] = useState("");

  // Get current user id from localStorage
  const raw = localStorage.getItem("id");
  const currentUserId = raw ? JSON.parse(raw) : null;

  // Fetch usernames for player IDs we haven't loaded yet
  const fetchMissingUsernames = useCallback(async (ids: number[]) => {
    const missing = ids.filter((id) => !(id in playerNames));
    if (missing.length === 0) return;

    const results = await Promise.allSettled(
      missing.map((id) => apiService.get<User>(`/users/${id}`))
    );

    setPlayerNames((prev) => {
      const next = { ...prev };
      results.forEach((result, i) => {
        if (result.status === "fulfilled") {
          next[missing[i]] = result.value.username ?? `User ${missing[i]}`;
        } else {
          next[missing[i]] = `User ${missing[i]}`;
        }
      });
      return next;
    });
  }, [playerNames, apiService]);

  const fetchLobby = useCallback(async () => {
    try {
      const response = await apiService.get<Lobby>(`/lobbies/${lobbyId}`);

      // Redirect all players when game starts (US#7)
      if (response.lobbyStatus === "INGAME") {
        router.push(`/game/${lobbyId}`);
        return;
      }

      setLobby(response);

      // Seed settings only on first load
      setSettingsGameMode((prev) => prev || response.gameMode || "CLASSIC");
      setSettingsMaxPlayers((prev) => prev || String(response.maxPlayers ?? "2"));

      if (response.playerIds && response.playerIds.length > 0) {
        await fetchMissingUsernames(response.playerIds);
      }
    } catch (error) {
      if (error instanceof Error) {
        alert(`Failed to load lobby:\n${error.message}`);
      }
    }
  }, [lobbyId, router, fetchMissingUsernames, apiService]);

  useEffect(() => {
    fetchLobby();
    const interval = globalThis.setInterval(fetchLobby, 2000);
    return () => globalThis.clearInterval(interval);
  }, [lobbyId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiService.put(`/lobbies/${lobbyId}`, {
        gameMode: settingsGameMode,
        maxPlayers: parseInt(settingsMaxPlayers, 10),
      });
      await fetchLobby();
    } catch (error) {
      if (error instanceof Error) {
        alert(`Failed to update lobby:\n${error.message}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleLeave = async () => {
    try {
      await apiService.post(`/lobbies/${lobbyId}/leave`, {});
      router.push("/lobbies");
    } catch (error) {
      if (error instanceof Error) {
        alert(`Failed to leave lobby:\n${error.message}`);
      }
    }
  };

  const handleStart = async () => {
    setStarting(true);
    try {
      await apiService.post(`/lobbies/${lobbyId}/start`, {});
      router.push(`/game/${lobbyId}`);
    } catch (error) {
      if (error instanceof Error) {
        alert(`Failed to start lobby:\n${error.message}`);
      }
      setStarting(false);
    }
  };

  if (!lobby) return null;

  const isHost = currentUserId !== null && Number(currentUserId) === lobby.hostId;
  const isFull = lobby.currentPlayers === lobby.maxPlayers;
  const canStart = isHost && isFull;

  return (
    <div className="card-container">
      <Card title={lobby.name} className="dashboard-container">
        <Row gutter={16}>

          {/* Players list */}
          <Col span={12}>
            <Card title="Players">
              {(lobby.playerIds ?? []).map((id) => (
                <p key={id}>
                  {playerNames[id] ?? "Loading..."}
                  {id === lobby.hostId ? " 👑" : ""}
                </p>
              ))}
            </Card>
          </Col>

          {/* Lobby info */}
          <Col span={12}>
            <Card title="Lobby Info">
              <p><strong>Game Mode:</strong> {lobby.gameMode}</p>
              <p><strong>Players:</strong> {lobby.currentPlayers} / {lobby.maxPlayers}</p>
              <p>
                <strong>Status:</strong>{" "}
                <Tag color={lobby.lobbyStatus === "WAITING" ? "green" : "blue"}>
                  {lobby.lobbyStatus}
                </Tag>
              </p>
              <p><strong>Invite Code:</strong> {lobby.inviteCode}</p>
            </Card>
          </Col>
        </Row>

        {/* Settings — host only */}
        {isHost && (
          <Card title="Settings" style={{ marginTop: 16 }}>
            <p><strong>Game Mode</strong></p>
            <Select
              value={settingsGameMode}
              onChange={setSettingsGameMode}
              style={{ width: 200, marginBottom: 12 }}
            >
              <Select.Option value="CLASSIC">Classic</Select.Option>
              <Select.Option value="CHAOS">Chaos</Select.Option>
            </Select>

            <p><strong>Player Count</strong></p>
            <Select
              value={settingsMaxPlayers}
              onChange={setSettingsMaxPlayers}
              style={{ width: 200, marginBottom: 12 }}
            >
              <Select.Option value="2">2</Select.Option>
              <Select.Option value="4">4</Select.Option>
            </Select>

            <br />
            <Button onClick={handleSave} loading={saving} style={{ marginRight: 8 }}>
              Save Settings
            </Button>

            <Button
              type="primary"
              onClick={handleStart}
              loading={starting}
              disabled={!canStart}
            >
              {canStart ? "Start Game" : `Waiting for players (${lobby.currentPlayers}/${lobby.maxPlayers})`}
            </Button>
          </Card>
        )}

        {!isHost && lobby.lobbyStatus === "FULL" && (
          <p style={{ marginTop: 16 }}>Lobby is full. Waiting for host to start...</p>
        )}

        <Button onClick={handleLeave} style={{ marginTop: 16 }}>
          Leave Lobby
        </Button>
      </Card>
    </div>
  );
};

export default LobbyPage;