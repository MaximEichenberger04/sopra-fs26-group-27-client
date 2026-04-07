export type CellValue = 0 | 1 | 2 | 3;
// 0 = empty  |  1 = player 1  |  2 = player 2  |  3 = wall / pillar

export interface GameState {
  matrix: CellValue[][];
  // extend later: currentTurn, players, status, etc.
}

export const BOARD_CELLS = 9;
export const MATRIX_SIZE = BOARD_CELLS * 2 - 1; // 17