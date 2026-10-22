import { describe, expect, it } from 'vitest';
import {
  COLS,
  ROWS,
  type BlockDropState,
  type Cell,
  cellsOf,
  createGame,
  emptyBoard,
  gravityMs,
  hardDrop,
  move,
  rotate,
  softDrop,
  tick,
  togglePause,
} from './engine';

// Always picks the first remaining bag slot, so pieces follow PIECE_TYPES order
// after the Fisher-Yates swaps; good enough for deterministic tests.
const fixedRng = () => 0;

function withActive(
  state: BlockDropState,
  active: BlockDropState['active']
): BlockDropState {
  return { ...state, active };
}

describe('Block Drop engine', () => {
  it('starts with an empty board, level 1 and a next piece', () => {
    const game = createGame(fixedRng);
    expect(game.board).toHaveLength(ROWS);
    expect(
      game.board.every(row => row.length === COLS && row.every(c => c === null))
    ).toBe(true);
    expect(game.level).toBe(1);
    expect(game.score).toBe(0);
    expect(game.status).toBe('playing');
    expect(game.next).toBeDefined();
  });

  it('deals every piece type once per bag of seven', () => {
    let game = createGame(Math.random);
    const seen: string[] = [game.active.type];
    for (let i = 0; i < 6; i++) {
      seen.push(game.next);
      game = hardDrop({ ...game, board: emptyBoard() });
    }
    expect(new Set(seen).size).toBe(7);
  });

  it('stops at the walls', () => {
    let game = createGame(fixedRng);
    for (let i = 0; i < 20; i++) game = move(game, -1);
    expect(Math.min(...cellsOf(game.active).map(([x]) => x))).toBe(0);
    for (let i = 0; i < 20; i++) game = move(game, 1);
    expect(Math.max(...cellsOf(game.active).map(([x]) => x))).toBe(COLS - 1);
  });

  it('kicks off the wall when rotating an I piece flush against it', () => {
    let game = withActive(createGame(fixedRng), {
      type: 'I',
      rotation: 1,
      x: -2,
      y: 5,
    });
    game = rotate(game);
    expect(cellsOf(game.active).every(([x]) => x >= 0 && x < COLS)).toBe(true);
    expect(game.active.rotation).toBe(2);
  });

  it('awards 2 points per row on hard drop and locks the piece', () => {
    const start = withActive(createGame(fixedRng), {
      type: 'O',
      rotation: 0,
      x: 4,
      y: 0,
    });
    const dropped = hardDrop(start);
    // O piece is two rows tall, so it falls ROWS - 2 rows.
    expect(dropped.score).toBe((ROWS - 2) * 2);
    expect(dropped.board[ROWS - 1][4]).toBe('O');
    expect(dropped.board[ROWS - 2][5]).toBe('O');
  });

  it('awards 1 point per soft-dropped row', () => {
    const start = withActive(createGame(fixedRng), {
      type: 'O',
      rotation: 0,
      x: 4,
      y: 0,
    });
    expect(softDrop(start).score).toBe(1);
    expect(softDrop(start).active.y).toBe(1);
  });

  it('clears full lines and scores them by level', () => {
    const board = emptyBoard();
    // Fill the bottom two rows except columns 4 and 5, where an O piece fits.
    for (const y of [ROWS - 1, ROWS - 2]) {
      board[y] = board[y].map((_, x): Cell =>
        x === 4 || x === 5 ? null : 'J'
      );
    }
    const start: BlockDropState = {
      ...createGame(fixedRng),
      board,
      level: 3,
      active: { type: 'O', rotation: 0, x: 4, y: ROWS - 2 },
    };
    const result = hardDrop(start);
    expect(result.lines).toBe(2);
    expect(result.score).toBe(300 * 3);
    expect(result.board.flat().every(c => c === null)).toBe(true);
  });

  it('levels up every ten lines', () => {
    const board = emptyBoard();
    board[ROWS - 1] = board[ROWS - 1].map((_, x): Cell =>
      x < 4 || x > 5 ? 'L' : null
    );
    const start: BlockDropState = {
      ...createGame(fixedRng),
      board,
      lines: 9,
      active: { type: 'O', rotation: 0, x: 4, y: ROWS - 3 },
    };
    expect(hardDrop(start).level).toBe(2);
  });

  it('applies gravity over time and speeds up with level', () => {
    const game = withActive(createGame(fixedRng), {
      type: 'T',
      rotation: 0,
      x: 3,
      y: 0,
    });
    expect(tick(game, gravityMs(1) - 1).active.y).toBe(0);
    expect(tick(game, gravityMs(1)).active.y).toBe(1);
    expect(gravityMs(10)).toBeLessThan(gravityMs(1));
  });

  it('ends the game when a new piece cannot spawn', () => {
    const board = emptyBoard();
    // Rows 0 and 1 are full apart from one gap so nothing clears.
    for (const y of [0, 1])
      board[y] = board[y].map((_, x): Cell => (x === 0 ? null : 'Z'));
    const start: BlockDropState = {
      ...createGame(fixedRng),
      board,
      active: { type: 'O', rotation: 0, x: 0, y: 10 },
    };
    expect(hardDrop(start).status).toBe('over');
  });

  it('ignores input while paused', () => {
    const paused = togglePause(createGame(fixedRng));
    expect(paused.status).toBe('paused');
    expect(move(paused, 1)).toBe(paused);
    expect(tick(paused, 10_000)).toBe(paused);
    expect(togglePause(paused).status).toBe('playing');
  });
});
