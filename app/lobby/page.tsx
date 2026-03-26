// lobby creation / management
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import { Lobby } from "@/types/lobby";
import { Button, Card, Form, Input, Select } from "antd";

const LobbyCreationPage: React.FC = () => {
  const router = useRouter();
  const apiService = useApi();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: {
    name: string;
    gameMode: string;
    maxPlayers: number;
    startAbilities: number;
    theme: string;
    map: string;
  }) => {
    setLoading(true);
    try {
      // POST /lobby — backend creates lobby and returns it
      const newLobby = await apiService.post<{ id: string }>("/lobby", {
        name: values.name,
        gameMode: values.gameMode,
        maxPlayers: values.maxPlayers,
        startAbilities: values.startAbilities,
        theme: values.theme,
        map: values.map
      });
      // Navigate into the newly created lobby
      router.push(`/lobby/${newLobby.id}`);
    } catch (error) {
      if (error instanceof Error) {
        alert(`Error creating lobby:\n${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-container">
      <Card title="Create Lobby" className="dashboard-container">
        <Form layout="vertical" onFinish={handleSubmit}> {/* Form is sent to server via handleSubmit */}
          <Form.Item label="Lobby Name" name="name" rules={[{ required: true }]}>
            <Input placeholder="Enter lobby name" />
          </Form.Item>
          <Form.Item label="Game Mode" name="gameMode" rules={[{ required: true }]}>
            <Select placeholder="Select game mode">
              <Select.Option value="CLASSIC">Classic</Select.Option>
              <Select.Option value="CHAOS">Chaos</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="Player Count" name="playerCount" rules={[{ required: true }]}>
            <Select placeholder="Select player count">
              <Select.Option value="2">2</Select.Option>
              <Select.Option value="4">4</Select.Option>
            </Select>
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            Create
          </Button>
          <Button onClick={() => router.push("/")} style={{ marginLeft: 8 }}>
            Cancel
          </Button>
        </Form>
      </Card>
    </div>
  );
};

export default LobbyCreationPage;