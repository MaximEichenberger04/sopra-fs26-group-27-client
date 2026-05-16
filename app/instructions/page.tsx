"use client";

import "../lobbies/lobbies.css";
import "./instructions.css";
import React from "react";
import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";

const InstructionsPage: React.FC = () => {
  const router = useRouter();

  return (
    <div className="instr-page">
      <NavBar />
      <div className="instr-content">

        <div className="instr-header-row">
          <h1 className="instr-title">Game Instructions</h1>
          <button className="btn-outline" onClick={() => router.back()}>← Back</button>
        </div>

        {/* Intro */}
        <div className="g-card instr-card">
          <h3 className="g-section-title">Welcome</h3>
          <p className="instr-body">
            This page explains how the game <em>Quoridor</em> works. Quoridor is a 2 or 4 player board game.
          </p>
        </div>

        {/* How it works */}
        <div className="g-card instr-card">
          <h3 className="g-section-title">How the Game Works</h3>
          <p className="instr-body">
            The goal of the classic Quoridor game is to reach the other side of the board. A player can reach the
            other side by moving their pawn each round. Since your opponent obviously also wants to win,
            it is important to make use of Walls — they are used to block paths, create mazes, and trap your
            enemy in unfortunate positions. Every round you can either move your pawn <em>or</em> place a wall.
          </p>
          <p className="instr-body" style={{ marginTop: 14 }}>
            The <strong>main components</strong> of the game include:
          </p>
          <div className="instr-components-row">
            <ul className="instr-list instr-list-narrow">
              <li>A 9×9 board + gaps to place walls</li>
              <li>2 or 4 pawns, depending on lobby settings</li>
              <li>Maps, skins and effects</li>
              <li>Player profiles and a XP / level system</li>
              <li>Global leaderboard and match statistics</li>
            </ul>
            <div className="instr-board-wrap">
              <svg className="instr-board-svg" viewBox="0 0 298 298" xmlns="http://www.w3.org/2000/svg">
                {/* Board background */}
                <rect x="0" y="0" width="298" height="298" rx="6" fill="#1c1714" stroke="#3a2f22" strokeWidth="1.5"/>
                {/* Cells + pawns */}
                {Array.from({ length: 9 }).map((_, row) =>
                  Array.from({ length: 9 }).map((_, col) => {
                    const x = 5 + col * 32;
                    const y = 5 + row * 32;
                    const isTopPawn = row === 0 && col === 4;
                    const isBottomPawn = row === 8 && col === 4;
                    return (
                      <g key={`${row}-${col}`}>
                        <rect
                          x={x} y={y} width={28} height={28} rx="3"
                          fill={isTopPawn || isBottomPawn ? "rgba(200,168,50,.12)" : "rgba(200,168,50,.045)"}
                          stroke="rgba(200,168,50,.18)" strokeWidth="0.8"
                        />
                        {isTopPawn && (
                          <circle cx={x + 14} cy={y + 14} r="9" fill="#c8a832" opacity="0.9"/>
                        )}
                        {isBottomPawn && (
                          <circle cx={x + 14} cy={y + 14} r="9" fill="#6a5820" stroke="#c8a832" strokeWidth="1.5" opacity="0.9"/>
                        )}
                      </g>
                    );
                  })
                )}
                {/* Sample walls */}
                <rect x={5 + 3*32} y={5 + 4*32 - 3} width={60} height={5} rx="2" fill="#c8a832" opacity="0.75"/>
                <rect x={5 + 6*32 - 3} y={5 + 1*32} width={5} height={60} rx="2" fill="#c8a832" opacity="0.75"/>
                <rect x={5 + 1*32} y={5 + 6*32 - 3} width={60} height={5} rx="2" fill="#c8a832" opacity="0.6"/>
              </svg>
              <p className="instr-board-label">9×9 Quoridor Board</p>
            </div>
          </div>
          <p className="instr-body" style={{ marginTop: 14 }}>
            To ensure both players always have a winning path, a BFS algorithm validates every move in the backend.
            Each player must always have at least one route to the other side — completely trapping a player is not allowed.
          </p>
        </div>

        {/* Chaos mode */}
        <div className="g-card instr-card">
          <h3 className="g-section-title">⚡ Chaos Mode</h3>
          <p className="instr-body">
            To bring more creativity into the game, we introduced <strong>Chaos Mode</strong>. In this mode,
            chosen when creating a lobby, each player can use ability cards drawn after every 3 full rounds from
            a randomised deck. Abilities can trap opponents, destroy walls, or shift the strategic landscape entirely.
          </p>
          <p className="instr-body" style={{ marginTop: 14 }}>
            The <strong>abilities</strong> currently include:
          </p>
          <ul className="instr-list">
            <li><strong>Poison</strong> — creates a 2×2 field which cannot be entered for several rounds</li>
            <li><strong>Earthquake</strong> — creates a 3×3 field that randomly destroys and shifts walls</li>
            <li><strong>Fireball</strong> — destroys all walls in a 2×2 area</li>
            <li><strong>Freeze</strong> — freezes the enemy player for several rounds</li>
            <li><strong>+2 Walls</strong> — grants the player 2 extra walls</li>
            <li><strong>2 Moves</strong> — allows the player to make 2 moves after playing the card</li>
          </ul>
        </div>

        {/* Credits */}
        <div className="g-card instr-card">
          <h3 className="g-section-title">Credits</h3>
          <p className="instr-body">
            This is a project for the module <em>Software Engineering Lab</em> HS26,
            created by Group 27 at the University of Zurich:
          </p>
          <ul className="instr-list instr-credits">
            <li><strong>Maxim Eichenberger</strong> <span>Software Systems</span></li>
            <li><strong>Flint Menzi</strong> <span>Business Informatics</span></li>
            <li><strong>Timon Weidmann</strong> <span>Software Systems</span></li>
            <li><strong>Eldar Kryeziu</strong> <span>Business Informatics</span></li>
            <li><strong>Jonas Metzger</strong> <span>Business Informatics</span></li>
          </ul>
        </div>

      </div>
    </div>
  );
};

export default InstructionsPage;