export interface Lobby {
  id: number | null;
  name: string | null;
  inviteCode: string | null;
  hostId: number | null;
  maxPlayers: number | null;
  currentPlayers: number | null;
  gameMode: string | null;
  gameStatus: string | null;
  theme: string | null;
  map: string | null;
  startAblities: number | null;
  playerIds: number[] | null;

}
