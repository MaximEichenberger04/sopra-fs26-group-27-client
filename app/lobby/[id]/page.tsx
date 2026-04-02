"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Lobby } from "@/types/lobby";
import { useApi } from "@/hooks/useApi";
import { Button, Card, Col, Form, Input, InputNumber, Row, Select, Tag, Typography } from "antd";
import { useSearchParams } from "next/navigation";
import "@/styles/maps/forest.css"; // base design
import "@/styles/maps/castle.css";  

const LobbyPage: React.FC = () => {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams(); // check what game design was chosen
  const map = searchParams.get("map") ?? "forest";
  const apiService = useApi();
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const lobbyId = params.id;

  const [users, setUsers] = useState<User[]>([]);
  const fetchUsers = async (playerIds: string[]) => { // fetch all users in the lobby
    try {
      const userPromises = playerIds.map(id => apiService.get<User>(`/users/${id}`));
      const fetchedUsers = await Promise.all(userPromises);
      setUsers(fetchedUsers);
    } catch (error) {
      if (error instanceof Error) alert(`Failed to load users:\n${error.message}`);
    }
  };

  const fetchLobby = async () => {
    try {
      const response = await apiService.get<Lobby>(`/lobbies/${lobbyId}`);
      setLobby(response);
      if (response.playerIds) {
        await fetchUsers(response.playerIds); // fetch all players
      }
    } catch (error) {
      if (error instanceof Error) {
        alert(`Failed to load lobby:\n${error.message}`);
      }
    }
  };

  useEffect(() => {
    fetchLobby();
    const interval = globalThis.setInterval(fetchLobby, 2000);
    return () => globalThis.clearInterval(interval);
  }, [lobbyId]);

  const handleSave = async (values: Partial<Lobby>) => {
    setSaving(true);
    try {
      const updated = await apiService.put<Lobby>(`/lobbies/${lobbyId}`, values);
      setLobby(updated);
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
      await fetchLobby();
      alert("Lobby marked as STARTED. Now it should redirect to game/{lobbyId}");
    } catch (error) {
      if (error instanceof Error) {
        alert(`Failed to start lobby:\n${error.message}`);
      }
    } finally {
      setStarting(false);
    }
  };

  if (!lobby) return null;
  const currentUserId = localStorage.getItem("userId");
  const isHost = String(currentUserId) === String(lobby.hostId);
  const canStart = isHost && lobby.currentPlayers === lobby.maxPlayers && lobby.lobbyStatus === "WAITING";

  return (
    <div className="card-container">
      <Card title={lobby.name} className="dashboard-container">
        <Row gutter={16}>
          <Col span={12}>
            <Card title="Players">
              {users.map(user => (
                <p key={user.id}>
                  <strong>@{user.username}</strong> [{user.id}]
                  {String(user.id) === String(lobby.hostId) && <span style={{ marginLeft: 8 }}>👑</span>}
                </p>
              ))}
            </Card>
          </Col>
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
        {isHost && (
        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col span={24}>
            <Card title="Edit Lobby (Host Only)">
              <Form layout="vertical" onFinish={handleSave}>
                <Form.Item label="Lobby Name" name="name">
                  <Input placeholder={lobby.name} />
                </Form.Item>
                <Form.Item label="Game Mode" name="gameMode">
                  <Select placeholder={lobby.gameMode}>
                    <Select.Option value="CLASSIC">Classic</Select.Option>
                    <Select.Option value="CHAOS">Chaos</Select.Option>
                  </Select>
                </Form.Item>
                <Form.Item label="Player Count" name="maxPlayers">
                  <Select placeholder={String(lobby.maxPlayers)}>
                    <Select.Option value={2}>2</Select.Option>
                    <Select.Option value={4}>4</Select.Option>
                  </Select>
                </Form.Item>
                <Button type="default" htmlType="submit" loading={saving}>
                  Save Changes
                </Button>
              </Form>
            </Card>
          </Col>
        </Row> )}
        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col span={24}>
            <Card title="Map">
              <div className={`map-preview map-${map}`} style={{ textAlign: "center" }}>
                {/* Replace src with your actual image paths later */}
                <img
                  src={map === "forest" ? "/maps/forest.png" : "/maps/castle.png"}
                  alt={map}
                  style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 8 }}
                />
                <p style={{ marginTop: 8, fontWeight: "bold", textTransform: "capitalize" }}>
                  {map === "forest" ? "🌲 Forest" : "🏰 Castle"}
                </p>
              </div>
            </Card>
          </Col>
        </Row>
        <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
          <Button onClick={() => router.push("/lobbies")}>
            ← Back to Browser
          </Button>
          <Button danger onClick={handleLeave}>
            Leave Lobby
          </Button>
          {canStart && (
            <Button type="primary" loading={starting} onClick={handleStart}>
              Start Game
            </Button>
          )}
          {isHost && !canStart && lobby.currentPlayers < lobby.maxPlayers && (
            <Button type="primary" disabled>
              Waiting for players ({lobby.currentPlayers}/{lobby.maxPlayers})
            </Button>
          )}
      </div>
      </Card>
    </div>
  );
};

export default LobbyPage;