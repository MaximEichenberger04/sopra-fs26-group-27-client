export type CellValue = 0 | 1 | 2 | 3 | 4 | 9;
export const WALL_VALUE: CellValue = 9;
export const BOARD_CELLS = 9;
export const MATRIX_SIZE = BOARD_CELLS * 2 - 1; // 17

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

export type AbilityType =
  | "FIREBALL"
  | "EARTHQUAKE"
  | "FREEZE"
  | "POISON"
  | "PLUS_TWO_WALLS"
  | "TWO_MOVES";

export interface PoisonZoneDTO {
  topLeftRow: number;
  topLeftCol: number;
  roundsRemaining: number;
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
  // Chaos mode
  chaosMode: boolean;
  myInventory: AbilityType[] | null;
  canDrawCard: boolean;
  turnCounter: number;
  frozenPlayerIds: number[] | null;
  poisonZones: PoisonZoneDTO[] | null;
}

export interface GameState {
  remainingWalls: Record<string, number>;
  wallsPerPlayer: number;
  matrix: CellValue[][];
  currentTurnUserId: number;
  playerIds: number[];
  winnerId: number | null;
  gameStatus: GameDTO["gameStatus"];
  mapTheme: string | null;
  // Chaos mode
  chaosMode: boolean;
  myInventory: AbilityType[];
  canDrawCard: boolean;
  turnCounter: number;
  poisonZones: PoisonZoneDTO[];
  frozenPlayerIds: number[];
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