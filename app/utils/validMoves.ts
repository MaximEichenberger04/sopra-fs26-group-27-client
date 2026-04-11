import { CellValue, MATRIX_SIZE } from "@/types/game";

export function getValidMoves(
  matrix: CellValue[][] | undefined | null,
  playerValue: CellValue
): Array<[number, number]> {
  if (!matrix || matrix.length === 0) return [];

  // find current pawn position
  let pr = -1, pc = -1;
  for (let r = 0; r < matrix.length; r++)
    for (let c = 0; c < (matrix[r]?.length ?? 0); c++)
      if (matrix[r][c] === playerValue) { pr = r; pc = c; }

  if (pr === -1) return [];

  const size = MATRIX_SIZE;
  const moves: Array<[number, number]> = [];

  const directions: Array<[number, number]> = [
    [-2, 0], // up
    [ 2, 0], // down
    [ 0,-2], // left
    [ 0, 2], // right
  ];

  for (const [dr, dc] of directions) {
    const wallR = pr + dr / 2;
    const wallC = pc + dc / 2;
    const targetR = pr + dr;
    const targetC = pc + dc;

    if (targetR < 0 || targetR >= size) continue;
    if (targetC < 0 || targetC >= size) continue;

    // wall between current and target blocks the move
    if (matrix[wallR]?.[wallC] === 3) continue;

    // target must be empty
    if (matrix[targetR]?.[targetC] !== 0) continue;

    moves.push([targetR, targetC]);
  }

  return moves;
}