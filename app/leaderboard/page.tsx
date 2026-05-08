"use client";

import "./leaderboard.css";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import NavBar from "@/components/NavBar";
import { LeaderboardUser } from "@/types/user";

const Leaderboard: React.FC = () => {
  const router = useRouter();
  const apiService = useApi();

  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { value: token } = useLocalStorage<string>("token", "");

  const fetchLeaderboard = async () => {
    try {
      const leaderboardUsers = await apiService.get<LeaderboardUser[]>("/users/leaderboard");
      setUsers(leaderboardUsers);
      setError(null);
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      }
    }
  };

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }

    fetchLeaderboard();

    const interval = setInterval(fetchLeaderboard, 5000);
    return () => clearInterval(interval);
  }, [apiService, token, router]);

  return (
    <div className="leaderboard-page">
      <NavBar />

      <div className="leaderboard-content">
        <div className="g-card leaderboard-card">
          <div className="leaderboard-header">
            <h1>Leaderboard</h1>
            <p>Global ranking by score</p>
          </div>

          {error && <p className="leaderboard-error">{error}</p>}

          <div className="leaderboard-table">
            <div className="leaderboard-row leaderboard-row-head">
              <span>Rank</span>
              <span>Player</span>
              <span>Score</span>
              <span>Level</span>
            </div>

            {users.map((user, index) => (
              <div className="leaderboard-row" key={user.id ?? index}>
                <span className="leaderboard-rank">#{index + 1}</span>

                <button
                  className="leaderboard-player"
                  onClick={() => router.push(`/users/${user.id}`)}
                >
                  {user.displayName || user.username || "Unknown Player"}
                </button>

                <span>{user.score ?? 0}</span>
                <span>{user.level ?? 0}</span>
              </div>
            ))}
          </div>

          <button className="auth-btn-secondary leaderboard-back" onClick={() => router.push("/users")}>
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;