"use client";

import "../lobbies/lobbies.css";
import React from "react";
import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";

const InstructionsPage: React.FC = () => {
  const router = useRouter();

  return (
    <div className="lobby-page-wrap">
      <NavBar />

      <div
        className="lobby-content"
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        {/* Header */}
        <div className="lobby-header-row" style={{ alignItems: "center" }}>
          <h2 className="lobby-page-title">Game Instructions</h2>
          <div className="lobby-header-actions">
            <button className="btn-outline" onClick={() => router.back()}>
              ← Back
            </button>
          </div>
        </div>

        {/* Intro */}
        <div className="g-card" style={{ padding: "24px" }}>
          <h3 style={{ marginTop: 0 }}>Welcome</h3>
          <p style={{ marginBottom: 0, lineHeight: 1.6 }}>
            This page explains how the game <i>Quoridor</i> works. Quoridor is a 2 or 4 Player Board Game.
          </p>
        </div>

        {/* Main game instructions */}
        <div className="g-card" style={{ padding: "24px" }}>
          <h3 style={{ marginTop: 0 }}>How the Game Works</h3>
          <p style={{ lineHeight: 1.6 }}>
            The goal of the classic Quoridor game is to reach the other side of the board. A player can reach the
            other side by moving his pawn in each round. Since the opponent player obviously also wants to win,
            it is important to make use of Walls. They are used to block the path, create mazes and trap your
            enemy in unfortunate positions. Every round you can either make a move, or place a wall.
          </p>
          <br />
          <p style={{ lineHeight: 1.6 }}>
            The <b>main components</b> of our game include:
          </p>

          <ul style={{ lineHeight: 1.8, paddingLeft: "20px" }}>
            <li>A 9x9 (adjustable) board</li>
            <li>2 or 4 pawns, depending on lobby settings</li>
            <li>Maps, skins and effects</li>
            <li>Player profiles and a XP/level system</li>
            <li>Global leaderboard and match statistics</li>
          </ul>
          <br />
          <p style={{ marginBottom: 0, lineHeight: 1.6 }}>
            To make sure that both opponents can always win, we utilize a BFS algorithm in the backend that computes
            in every round, if a move is valid. Each player always needs at least one way to reach the other side. It is
            therefore not allowed to completely trap a player and our algorithm makes sure this is always true.
          </p>
        </div>

        {/* Chaos mode */}
        <div className="g-card" style={{ padding: "24px" }}>
          <h3 style={{ marginTop: 0 }}>Chaos Mode</h3>
          <p style={{ lineHeight: 1.6 }}>
            To bring more creativity into our game, we introduced the Chaos Game Mode. In this game mode, which can be
            chosen when creating a lobby, each player can utilize ability cards. Ability cards can be drawn after 3-full
            rounds from a deck which is randomized. Abilities can be used to trap opponents, destroy walls, or just 
            make strategic decisions. It is always very important to have a clear game plan, and think into the future
            and what your opponents could be planning!
          </p>
        <br />
          <p style={{ lineHeight: 1.6 }}>
            The <b>abilities</b> currently include:
          </p>

          <ul style={{ lineHeight: 1.8, paddingLeft: "20px" }}>
            <li>Poison: Creates a 2x2 field which cannot be entered for some rounds</li>
            <li>Earthquake: Creates a 3x3 field that randomly destroys and shifts walls</li>
            <li>Fireball: Destroys all walls in a 2x2 field</li>
            <li>Freeze: Freezes the enemy player for some rounds</li>
            <li>+2 Walls: Gives the player 2 extra walls</li>
            <li>2 Moves: Lets the player make 2 moves after playing the card</li>
          </ul>
        </div>

        {/* Credits */}
        <div className="g-card" style={{ padding: "24px", marginBottom: "24px" }}>
          <h3 style={{ marginTop: 0 }}>Credits</h3>
          <p style={{ lineHeight: 1.6 }}>
            This is a project for the module "Software Engineering Lab" in HS26 and has been 
            created by a team of students (Group 27) at the University of Zurich, including:
          </p>

          <ul style={{ lineHeight: 1.8, paddingLeft: "20px" }}>
          <li><b>Maxim Eichenberger</b> | Software Systems</li>
          <li><b>Flint Menzi</b> | Business Informatics</li>
          <li><b>Timon Weidmann</b> | Software Systems</li>
          <li><b>Eldar Kryeziu</b> | Business Informatics</li>
          <li><b>Jonas Metzger</b> | Business Informatics</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default InstructionsPage;