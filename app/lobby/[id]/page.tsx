"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lobby } from "@/types/lobby";
import { Button, Card, Col, Row, Tag } from "antd";

const LobbyPage: React.FC = () => {
  const router = useRouter();

  // MOCK DATA —> replace with real fetch once backend is ready
  const [lobby, setLobby] = useState<Lobby | null>({
    id: 1,
    name: "Mock Lobby",
    inviteCode: "ABC123",
    hostId: 42,
    playerCount: 2,
    currentPlayers: 1,
    gameMode: "CLASSIC",
    gameStatus: "WAITING",
  });

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
              <p><strong>Players:</strong> {lobby.currentPlayers} / {lobby.playerCount}</p>
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