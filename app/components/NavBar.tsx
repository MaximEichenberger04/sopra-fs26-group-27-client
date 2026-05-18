"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import { User } from "@/types/user";
import { Avatar } from "antd";
import { UserOutlined } from "@ant-design/icons";
import Image from "next/image";
import { getCosmeticById } from "@/types/cosmetics";

const NavBar: React.FC = () => {
    const router = useRouter();
    const apiService = useApi();
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const { value: token, clear: clearToken } = useLocalStorage<string>("token", "");
    const { value: userId } = useLocalStorage<string>("userId", "");

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchCurrentUser = useCallback(async () => {
        if (!token || !userId) return;
        try {
            const user = await apiService.get<User>(`/users/${userId}`);
            setCurrentUser(user);
        } catch {
            // silently fail
        }
    }, [apiService, token, userId]);

    useEffect(() => {
        fetchCurrentUser();
    }, [fetchCurrentUser]);

    // Re-fetch when cosmetics change (equip/remove from shop or profile)
    useEffect(() => {
        const handler = () => fetchCurrentUser();
        window.addEventListener("cosmetic-changed", handler);
        return () => window.removeEventListener("cosmetic-changed", handler);
    }, [fetchCurrentUser]);

    // ── Global game-start redirect ──────────────────────────────────────────
    // When a player is part of a lobby but navigates away (e.g. profile, browse),
    // the lobby page is no longer mounted and its polling stops.
    // We keep the activeLobbyId in sessionStorage and poll from here so the
    // player still gets redirected as soon as the host starts the game.
    useEffect(() => {
        let destroyed = false;

        const checkLobby = async () => {
            const activeLobbyId = sessionStorage.getItem("activeLobbyId");
            if (!activeLobbyId) return;

            // Don't run this redirect watcher on the lobby page itself (it has its own)
            if (window.location.pathname.includes(`/lobby/${activeLobbyId}`)) return;
            // Don't redirect if already on a game page
            if (window.location.pathname.startsWith("/games/")) return;

            try {
                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_PROD_API_URL || "http://localhost:8080"}/lobbies/${activeLobbyId}`,
                    {
                        headers: (() => {
                            const raw = localStorage.getItem("token");
                            let token: string | null = null;
                            try { token = raw ? JSON.parse(raw) : null; } catch { token = raw; }
                            return {
                                "Content-Type": "application/json",
                                ...(token ? { Authorization: token } : {}),
                            };
                        })(),
                    }
                );
                if (!res.ok) {
                    // Lobby gone (deleted/closed) — clear it
                    sessionStorage.removeItem("activeLobbyId");
                    return;
                }
                const data = await res.json();
                if (data.lobbyStatus === "INGAME" && data.gameId) {
                    sessionStorage.removeItem("activeLobbyId");
                    if (!destroyed) router.push(`/games/${data.gameId}`);
                }
            } catch {
                // silently ignore network errors
            }
        };

        const interval = setInterval(checkLobby, 2000);
        return () => {
            destroyed = true;
            clearInterval(interval);
        };
    }, [router]);

    const borderItem = currentUser?.equippedBorder ? getCosmeticById(currentUser.equippedBorder) : null;

    async function handleLogout() {
        try {
            await apiService.put("/logout", {});
        } catch {
            // silently fail
        } finally {
            clearToken();
            router.push("/login");
        }
    }

    return (
        <nav className="nav-bar">
            <div className="nav-left" onClick={() => router.push("/users")} style={{ cursor: "pointer" }}>
                <Image src="/quoridor.png" alt="Quoridor" width={220} height={60} className="nav-logo-img" priority />
            </div>
            <div className="nav-right" ref={dropdownRef}>
                {currentUser && (
                    <>
                        <button
                            className="nav-user-btn"
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            type="button"
                        >
                            <div className={`avatar-ring-wrap avatar-ring-sm ${borderItem ? borderItem.cssClass : ""}`}>
                                <Avatar
                                    size={30}
                                    src={currentUser.avatarURL ?? undefined}
                                    icon={!currentUser.avatarURL && <UserOutlined />}
                                    className="nav-avatar"
                                />
                            </div>
                            <span className="nav-user-name">{currentUser.displayName}</span>
                            <span className="nav-caret">▾</span>
                        </button>
                        {dropdownOpen && (
                            <div className="nav-dropdown">
                                <button className="nav-dd-item" onClick={() => { setDropdownOpen(false); router.push(`/users/${userId}`); }}>
                                    Profile
                                </button>
                                <button className="nav-dd-item" onClick={() => { setDropdownOpen(false); router.push("/shop"); }}>
                                    Cosmetics Shop
                                </button>
                                <div className="nav-dd-divider" />
                                <button className="nav-dd-item nav-dd-logout" onClick={handleLogout}>
                                    Logout
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </nav>
    );
};

export default NavBar;