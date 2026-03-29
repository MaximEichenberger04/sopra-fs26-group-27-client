export interface Lobby {
  id: number | null;
  name: string | null;
  inviteCode: string | null;
  hostId: number | null;
  maxPlayers: number | null;
  currentPlayers: number | null;
  gameMode: string | null;
  lobbyStatus: string | null;
  playerIds: number[] | null;
}
