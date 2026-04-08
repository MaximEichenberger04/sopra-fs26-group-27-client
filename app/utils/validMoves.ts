export type CellValue = string | number;

export function getValidMoves(
  matrix: CellValue[][],
  playerValue: CellValue  // "a", 1, whatever your player symbol is
): Array<[number, number]> {
  // find current pawn position in matrix
  let pr = -1, pc = -1;
  for (let r = 0; r < matrix.length; r++)
    for (let c = 0; c < matrix[r].length; c++)
      if (matrix[r][c] === playerValue) { pr = r; pc = c; }

  if (pr === -1) return [];

  const moves: Array<[number, number]> = [];

  // [rowOffset, colOffset] in matrix coords — step of 2 = one board cell
  const directions: Array<[number, number]> = [
    [-2, 0], // up
    [ 2, 0], // down
    [ 0,-2], // left
    [ 0, 2], // right
  ];

  for (const [dr, dc] of directions) {
    const wallR = pr + dr / 2; // matrix slot between current and target
    const wallC = pc + dc / 2;
    const targetR = pr + dr;
    const targetC = pc + dc;

    // bounds check
    if (targetR < 0 || targetR >= matrix.length) continue;
    if (targetC < 0 || targetC >= matrix[0].length) continue;

    // check no wall between current cell and target
    if (matrix[wallR][wallC] === 3) continue; // adjust 3 to your wall symbol

    // check target cell is empty
    if (matrix[targetR][targetC] !== 0) continue; // adjust 0 to your empty symbol

    moves.push([targetR, targetC]);
  }

  return moves;
}