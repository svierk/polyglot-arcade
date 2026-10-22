import {
  COLS,
  CPU,
  HUMAN,
  ROWS,
  type Board,
  cpuMove,
  drop,
  emptyBoard,
  findWin,
  isFull,
  landingRow,
  scoreFor,
  validColumns,
} from './engine';

const never = () => 0.99;

/** Builds a board from bottom-up column stacks, e.g. { 3: [1, 2] }. */
function stacks(columns: Record<number, Array<1 | 2>>): Board {
  let board = emptyBoard();
  for (const [col, discs] of Object.entries(columns)) {
    for (const disc of discs) board = drop(board, Number(col), disc)!.board;
  }
  return board;
}

describe('Four in a Row engine', () => {
  it('drops discs to the lowest free row', () => {
    const first = drop(emptyBoard(), 2, HUMAN)!;
    expect(first.row).toBe(ROWS - 1);
    const second = drop(first.board, 2, CPU)!;
    expect(second.row).toBe(ROWS - 2);
    expect(second.board[ROWS - 1][2]).toBe(HUMAN);
  });

  it('rejects drops into a full column', () => {
    const full = stacks({ 0: [1, 2, 1, 2, 1, 2] });
    expect(landingRow(full, 0)).toBe(-1);
    expect(drop(full, 0, HUMAN)).toBeNull();
    expect(validColumns(full)).not.toContain(0);
  });

  it('detects horizontal, vertical and diagonal wins', () => {
    expect(findWin(stacks({ 0: [1], 1: [1], 2: [1], 3: [1] }))?.player).toBe(HUMAN);
    expect(findWin(stacks({ 4: [2, 2, 2, 2] }))?.player).toBe(CPU);
    const diagonal = stacks({ 0: [1], 1: [2, 1], 2: [2, 2, 1], 3: [2, 2, 2, 1] });
    const win = findWin(diagonal);
    expect(win?.player).toBe(HUMAN);
    expect(win?.cells).toHaveLength(4);
  });

  it('reports no winner on an open board', () => {
    expect(findWin(stacks({ 0: [1, 1, 1], 6: [2, 2, 2] }))).toBeNull();
  });

  it('knows when the board is full', () => {
    expect(isFull(emptyBoard())).toBe(false);
    const board: Board = Array.from({ length: ROWS }, (_, r) =>
      Array.from({ length: COLS }, (_, c) => (((r >> 1) + c) % 2 === 0 ? 1 : 2)),
    );
    expect(isFull(board)).toBe(true);
  });

  it('takes an immediate win', () => {
    const board = stacks({ 5: [2, 2, 2], 0: [1, 1], 1: [1] });
    expect(cpuMove(board, 'normal', never)).toBe(5);
  });

  it('blocks an immediate threat', () => {
    const board = stacks({ 0: [1], 1: [1], 2: [1], 6: [2, 2] });
    expect(cpuMove(board, 'normal', never)).toBe(3);
  });

  it('scores faster wins and harder opponents higher', () => {
    expect(scoreFor('win', 4, 'hard')).toBeGreaterThan(scoreFor('win', 4, 'easy'));
    expect(scoreFor('win', 4, 'normal')).toBeGreaterThan(scoreFor('win', 15, 'normal'));
    expect(scoreFor('draw', 21, 'normal')).toBe(500);
    expect(scoreFor('loss', 10, 'hard')).toBe(0);
  });
});
