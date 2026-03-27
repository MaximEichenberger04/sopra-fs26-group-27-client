export interface Lobby {
  id: number | null;
  name: string | null;
  inviteCode: string | null;
  hostId: number | null;
  maxPlayers: number | null;
  currentPlayers: number | null;
  gameMode: string | null;
  gameStatus: string | null;
  playerIds: number[] | null;
}
