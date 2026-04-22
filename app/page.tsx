"use client";

import "./landing.css";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function Home() {
  const router = useRouter();

  return (
    <div className="landing">
      {/* Floating particles */}
      <div className="landing-particles">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className={`particle particle-${i}`} />
        ))}
      </div>

      {/* Main content */}
      <div className="landing-center">
        {/* Logo */}
        <div className="landing-logo-wrap">
          <Image
            src="/quoridor.png"
            alt="Quoridor Chaos Arena"
            width={500}
            height={333}
            className="landing-logo"
            priority
          />
        </div>


        {/* Mini game board showcase */}
        <div className="landing-board-showcase">
          <div className="board-3d-wrap">
            <div className="mini-board">
              {Array.from({ length: 25 }).map((_, i) => {
                const hasPawn =
                  i === 2 ? "pawn-gold" :
                    i === 22 ? "pawn-crimson" :
                      i === 10 ? "pawn-emerald" :
                        i === 14 ? "pawn-purple" : null;
                return (
                  <div key={i} className="mini-cell">
                    {hasPawn && <div className={`mini-pawn ${hasPawn}`} />}
                  </div>
                );
              })}
              {/* Walls */}
              <div className="mini-wall wall-h" style={{ top: "38%", left: "20%", width: "36%" }} />
              <div className="mini-wall wall-v" style={{ top: "18%", left: "38%", height: "36%" }} />
              <div className="mini-wall wall-h" style={{ top: "78%", left: "44%", width: "36%" }} />
              <div className="mini-wall wall-v" style={{ top: "56%", left: "78%", height: "30%" }} />
            </div>
          </div>
        </div>

        {/* Feature pills */}
        <div className="landing-features">
          <span className="feature-pill">2–4 Players</span>
          <span className="feature-pill">Classic &amp; Chaos Modes</span>
          <span className="feature-pill">Real-time Multiplayer</span>
        </div>

        {/* Buttons */}
        <div className="landing-buttons">
          <button className="btn-gold landing-btn" onClick={() => router.push("/login")}>
            Login
          </button>
          <button className="btn-outline landing-btn" onClick={() => router.push("/register")}>
            Create Account
          </button>
          <button className="btn-outline landing-btn" onClick={() => router.push("/instructions")}>
            → How to play
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <span className="footer-group">Group 27</span>
          <span className="footer-divider">—</span>
          <span className="footer-names">Maxim · Flint · Timon · Jonas · Eldar</span>
          <span className="footer-divider">—</span>
          <span className="footer-uni">UZH SoPra FS26</span>
        </div>
      </footer>
    </div>
  );
}