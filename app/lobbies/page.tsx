"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import { Lobby } from "@/types/lobby";
import { Button, Card, Input, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";

const LobbyBrowserPage: React.FC = () => {
  const router = useRouter();
  const apiService = useApi();
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchLobbies = async () => {
    try {
      const response = await apiService.get<Lobby[]>("/lobbies");
      setLobbies(response);
    } catch (error) {
      if (error instanceof Error) {
        alert('Failed to load lobbies:\n${error.message}');
      }
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
      if (error instanceof Error) {
        alert(`Failed to join lobby:\n${error.message}`);
      }
    }
  };

  const joinLobbyById = async (lobbyId: number) => {
    try {
      const joinedLobby = await apiService.post<Lobby>(`/lobbies/${lobbyId}/join`, {});
      router.push(`/lobby/${joinedLobby.id}`);
    } catch (error) {
      if (error instanceof Error) {
        alert(`Failed to join lobby:\n${error.message}`);
      }
    }
  };

  const columns: ColumnsType<Lobby> = [
    { title: "Name", dataIndex: "name", key: "name" },
    { title: "Mode", dataIndex: "gameMode", key: "gameMode" },
    { title: "Players", key: "players", render: (_, record) => `${record.currentPlayers}/${record.maxPlayers}` },
    { title: "Theme", dataIndex: "theme", key: "theme" },
    { title: "Status", key: "status", render: (_, record) => <Tag>{record.lobbyStatus}</Tag> },
    {
      title: "Action",
      key: "action",
      render: (_, record) => (
        <Space>
        <Button onClick={() => router.push(`/lobby/${record.id}`)}>Open</Button>
        <Button type="primary" onClick={() => {if (record.id !== null){ joinLobbyById(record.id)}}}>
            Join</Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="card-container">
      <Card title="Lobby Browser" className="dashboard-container">
        <Space style={{ marginBottom: 16 }}>
          <Button type="primary" onClick={() => router.push("/lobby")}>Create Lobby</Button>
          <Input
            placeholder="Invite code"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            style={{ width: 180 }}
          />
          <Button onClick={joinByCode} disabled={!inviteCode}>Join via Code</Button>
        </Space>
        <Table rowKey="id" loading={loading} columns={columns} dataSource={lobbies} />
      </Card>
    </div>
  );
};

export default LobbyBrowserPage;
