"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Lobby } from "@/types/lobby";
import { useApi } from "@/hooks/useApi";
import { Button, Card, Col, Form, Input, InputNumber, Row, Select, Tag, Typography } from "antd";

const LobbyPage: React.FC = () => {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const apiService = useApi();
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const lobbyId = params.id;

  const fetchLobby = async () => {
    try {
      const response = await apiService.get<Lobby>(`/lobbies/${lobbyId}`);
      setLobby(response);
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
      alert("Lobby marked as STARTED. The game creation step still needs to be implemented on the backend.");
    } catch (error) {
      if (error instanceof Error) {
        alert(`Failed to start lobby:\n${error.message}`);
      }
    } finally {
      setStarting(false);
    }
  };

  if (!lobby) return null;

  return (
    <div className="card-container">
      <Card title={lobby.name} className="dashboard-container">
        <Row gutter={16}>
          <Col span={12}>
            <Card title="Players">
              <p>host name ({lobby.hostId})</p>
              <p>name (user id)</p>
            </Card>
          </Col>
          <Col span={12}>
            <Card title="Lobby Info">
              <p><strong>Game Mode:</strong> {lobby.gameMode}</p>
              <p><strong>Players:</strong> {lobby.currentPlayers} / {lobby.maxPlayers}</p>
              <p>
                <strong>Status:</strong>{" "}
                <Tag color={lobby.gameStatus === "WAITING" ? "green" : "blue"}>
                  {lobby.gameStatus}
                </Tag>
              </p>
              <p><strong>Invite Code:</strong> {lobby.inviteCode}</p>
            </Card>
          </Col>
        </Row>
        <Button onClick={() => router.push("/lobbies")} style={{ marginTop: 16 }}>
          Leave Lobby
        </Button>
      </Card>
    </div>
  );
};

export default LobbyPage;