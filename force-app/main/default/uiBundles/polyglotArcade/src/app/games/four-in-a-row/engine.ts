/**
 * Four in a Row engine — framework-free rules and CPU opponent.
 *
 * Boards are immutable row-major grids (row 0 is the top). The CPU uses
 * minimax with alpha-beta pruning; difficulty only changes search depth and
 * how often it plays a random move, so the rules stay identical for all levels.
 */

export const ROWS = 6;
export const COLS = 7;

export type Disc = 0 | 1 | 2;
export type Player = 1 | 2;
export type Board = Disc[][];
export type Difficulty = 'easy' | 'normal' | 'hard';
export type Rng = () => number;

export const HUMAN: Player = 1;
export const CPU: Player = 2;

export interface Win {
  player: Player;
  cells: Array<[row: number, col: number]>;
}

interface DifficultyProfile {
  depth: number;
  /** Chance of ignoring the search and playing any legal column. */
  blunderRate: number;
  scoreMultiplier: number;
  level: number;
}

export const DIFFICULTIES: Record<Difficulty, DifficultyProfile> = {
  easy: { depth: 2, blunderRate: 0.35, scoreMultiplier: 1, level: 1 },
  normal: { depth: 4, blunderRate: 0.05, scoreMultiplier: 2, level: 2 },
  hard: { depth: 6, blunderRate: 0, scoreMultiplier: 3, level: 3 },
};

/** Columns ordered centre-out: better moves first means more alpha-beta cut-offs. */
const SEARCH_ORDER = [3, 2, 4, 1, 5, 0, 6];
const DIRECTIONS: Array<[number, number]> = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];
const WIN_VALUE = 1_000_000;

export function emptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array<Disc>(COLS).fill(0));
}

export function validColumns(board: Board): number[] {
  return SEARCH_ORDER.filter((col) => board[0][col] === 0);
}

/** Lowest free row in a column, or -1 when the column is full. */
export function landingRow(board: Board, col: number): number {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[row][col] === 0) return row;
  }
  return -1;
}

export function drop(
  board: Board,
  col: number,
  player: Player,
): { board: Board; row: number } | null {
  const row = landingRow(board, col);
  if (row < 0) return null;
  const next = board.map((r) => [...r]);
  next[row][col] = player;
  return { board: next, row };
}

export function findWin(board: Board): Win | null {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const player = board[row][col];
      if (player === 0) continue;
      for (const [dr, dc] of DIRECTIONS) {
        const cells: Array<[number, number]> = [];
        for (let i = 0; i < 4; i++) {
          const r = row + dr * i;
          const c = col + dc * i;
          if (r < 0 || r >= ROWS || c < 0 || c >= COLS || board[r][c] !== player) break;
          cells.push([r, c]);
        }
        if (cells.length === 4) return { player, cells };
      }
    }
  }
  return null;
}

export function isFull(board: Board): boolean {
  return board[0].every((cell) => cell !== 0);
}

/** Heuristic for one 4-cell window, from the CPU's point of view. */
function scoreWindow(window: Disc[]): number {
  const cpu = window.filter((d) => d === CPU).length;
  const human = window.filter((d) => d === HUMAN).length;
  if (cpu > 0 && human > 0) return 0;
  if (cpu === 3) return 50;
  if (cpu === 2) return 10;
  if (human === 3) return -80;
  if (human === 2) return -10;
  return 0;
}

export function evaluate(board: Board): number {
  let score = 0;
  for (let row = 0; row < ROWS; row++) {
    if (board[row][3] === CPU) score += 6;
    if (board[row][3] === HUMAN) score -= 6;
  }
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      for (const [dr, dc] of DIRECTIONS) {
        const endR = row + dr * 3;
        const endC = col + dc * 3;
        if (endR >= ROWS || endC < 0 || endC >= COLS) continue;
        const window: Disc[] = [];
        for (let i = 0; i < 4; i++) window.push(board[row + dr * i][col + dc * i]);
        score += scoreWindow(window);
      }
    }
  }
  return score;
}

function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
): number {
  const win = findWin(board);
  // Prefer quicker wins and slower losses by weighting with remaining depth.
  if (win) return win.player === CPU ? WIN_VALUE + depth : -WIN_VALUE - depth;
  if (isFull(board)) return 0;
  if (depth === 0) return evaluate(board);

  const player: Player = maximizing ? CPU : HUMAN;
  let best = maximizing ? -Infinity : Infinity;
  for (const col of validColumns(board)) {
    const value = minimax(drop(board, col, player)!.board, depth - 1, alpha, beta, !maximizing);
    if (maximizing) {
      best = Math.max(best, value);
      alpha = Math.max(alpha, value);
    } else {
      best = Math.min(best, value);
      beta = Math.min(beta, value);
    }
    if (alpha >= beta) break;
  }
  return best;
}

export function cpuMove(board: Board, difficulty: Difficulty, rng: Rng = Math.random): number {
  const columns = validColumns(board);
  if (columns.length === 0) throw new Error('No legal move: the board is full.');
  const profile = DIFFICULTIES[difficulty];
  if (rng() < profile.blunderRate) {
    return columns[Math.floor(rng() * columns.length)];
  }

  let bestCol = columns[0];
  let bestValue = -Infinity;
  for (const col of columns) {
    const value = minimax(
      drop(board, col, CPU)!.board,
      profile.depth - 1,
      -Infinity,
      Infinity,
      false,
    );
    if (value > bestValue) {
      bestValue = value;
      bestCol = col;
    }
  }
  return bestCol;
}

export type Outcome = 'win' | 'loss' | 'draw';

/**
 * Points for a finished game. Faster wins and harder opponents score higher;
 * a draw is worth a consolation prize, a loss nothing.
 */
export function scoreFor(outcome: Outcome, humanMoves: number, difficulty: Difficulty): number {
  const { scoreMultiplier } = DIFFICULTIES[difficulty];
  if (outcome === 'win') return (1000 + Math.max(0, 21 - humanMoves) * 50) * scoreMultiplier;
  if (outcome === 'draw') return 250 * scoreMultiplier;
  return 0;
}
