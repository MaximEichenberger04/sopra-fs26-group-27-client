export interface Lobby {
  id: number | null;
  name: string | null;
  inviteCode: string | null;
  hostId: number | null;
  playerCount: number | null;
  currentPlayers: number | null;
  gameMode: string | null;
  gameStatus: string | null;
}
