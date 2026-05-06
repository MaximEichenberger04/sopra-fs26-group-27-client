export type CellValue = 0 | 1 | 2 | 3;
export const BOARD_CELLS = 9;
export const MATRIX_SIZE = BOARD_CELLS * 2 - 1; // 17

// What the backend actually returns
export interface PawnDTO {
  id: number;
  userId: number;
  row: number;
  col: number;
}

export interface WallDTO {
  id: number;
  userId: number;
  row: number;
  col: number;
  orientation: "HORIZONTAL" | "VERTICAL";
}

export interface GameDTO {
  id: number;
  lobbyId: number;
  gameStatus: "WAITING_FOR_USER" | "RUNNING" | "ENDED";
  sizeBoard: number;
  creatorId: number;
  currentTurnUserId: number;
  wallsPerPlayer: number;
  winnerId: number | null;
  playerIds: number[];
  pawns: PawnDTO[];
  walls: WallDTO[];
  remainingWalls: Record<string, number>;
  mapTheme: string | null;
}

// What the board component works with (derived)
export interface GameState {
  remainingWalls: Record<string, number>;
  wallsPerPlayer: number;
  matrix: CellValue[][];
  currentTurnUserId: number;
  player1Id: number;
  player2Id: number;
  winnerId: number | null;
  gameStatus: GameDTO["gameStatus"];
  mapTheme: string | null;
}

export interface ChatMessageGetDTO {
  id: number;
  gameId: number;
  userId: number;
  username: string;
  text: string | null;
  gifUrl: string | null;
  timestamp: number; // Unix milliseconds
}