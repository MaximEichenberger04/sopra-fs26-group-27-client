"use client";

import "../lobbies/lobbies.css";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import NavBar from "@/components/NavBar";

const LobbyCreationPage: React.FC = () => {
  const router = useRouter();
  const apiService = useApi();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [gameMode, setGameMode] = useState("");
  const [maxPlayers, setMaxPlayers] = useState("");
  const [map, setMap] = useState("mystic-grove");

  const { value: token } = useLocalStorage<string>("token", "");
  const { value: userId } = useLocalStorage<string>("userId", "");

  useEffect(() => {
    if (!token) router.push("/login");
  }, [token, router]);

  const handleSubmit = async () => {
    if (!name || !gameMode || !maxPlayers) {
      alert("Please fill in all required fields.");
      return;
    }
    if (!userId) {
      alert("You must be logged in.");
      return;
    }

    setLoading(true);
    try {
      const newLobby = await apiService.post<{ id: string }>("/lobbies", {
        name,
        gameMode,
        maxPlayers: parseInt(maxPlayers, 10),
        hostId: Number(userId),
        mapTheme: map,
      });
      router.push(`/lobby/${newLobby.id}`);
    } catch (error) {
      if (error instanceof Error) alert(`Failed to create lobby:\n${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lobby-create-wrap">
      <NavBar />
      <div className="lobby-create-center">
        <div className="g-card lobby-create-card">
          <h2 className="lobby-create-title">Create Lobby</h2>
          <div className="g-field">
            <label className="g-label"><span className="required">*</span> Lobby Name</label>
            <input className="g-input" placeholder="Enter lobby name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="g-field">
            <label className="g-label"><span className="required">*</span> Game Mode</label>
            <select className="g-select" value={gameMode} onChange={(e) => setGameMode(e.target.value)}>
              <option value="" disabled>Select game mode</option>
              <option value="CLASSIC">Classic</option>
              <option value="CHAOS">Chaos</option>
            </select>
          </div>
          <div className="g-field">
            <label className="g-label"><span className="required">*</span> Player Count</label>
            <select className="g-select" value={maxPlayers} onChange={(e) => setMaxPlayers(e.target.value)}>
              <option value="" disabled>Select player count</option>
              <option value="2">2</option>
              <option value="4">4</option>
            </select>
          </div>
          <div className="g-field">
            <label className="g-label"><span className="required">*</span> Map</label>
            <select className="g-select" value={map} onChange={(e) => setMap(e.target.value)}>
              <option value="mystic-grove">Mystic Grove</option>
              <option value="obsidian-keep">Obsidian Keep</option>
              <option value="celestial-sanctum">Celestial Sanctum</option>
            </select>
          </div>
          <div className="lobby-form-actions">
            <button className="btn-gold" onClick={handleSubmit} disabled={loading}>
              {loading ? "Creating..." : "Create"}
            </button>
            <button className="btn-outline" onClick={() => router.push("/lobbies")}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LobbyCreationPage;