/**
 * Block Drop engine — framework-free game rules.
 *
 * Every operation is a pure function `state -> state`, so the React view only
 * renders and forwards input, and the rules are unit-testable without a DOM.
 * Randomness is injected (`rng`) to make piece order deterministic in tests.
 */

export const COLS = 10;
export const ROWS = 20;

export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';
export type Cell = PieceType | null;
export type Board = Cell[][];
export type Rng = () => number;

export interface ActivePiece {
  type: PieceType;
  /** Rotation index 0..3, clockwise. */
  rotation: number;
  /** Board coordinates of the shape matrix's top-left corner. */
  x: number;
  y: number;
}

export type Status = 'playing' | 'paused' | 'over';

export interface BlockDropState {
  board: Board;
  active: ActivePiece;
  next: PieceType;
  bag: PieceType[];
  score: number;
  lines: number;
  level: number;
  status: Status;
  /** Milliseconds accumulated towards the next gravity step. */
  gravityAcc: number;
  rng: Rng;
}

export const PIECE_TYPES: readonly PieceType[] = [
  'I',
  'O',
  'T',
  'S',
  'Z',
  'J',
  'L',
];

const SHAPES: Record<PieceType, number[][]> = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
};

/** Points per cleared-line count, multiplied by the current level. */
const LINE_SCORES = [0, 100, 300, 500, 800];
const LINES_PER_LEVEL = 10;
/** Horizontal nudges tried when a rotation collides (a simple wall kick). */
const KICKS = [0, -1, 1, -2, 2];

function rotateClockwise(matrix: number[][]): number[][] {
  const n = matrix.length;
  return matrix.map((row, y) => row.map((_, x) => matrix[n - 1 - x][y]));
}

const ROTATIONS: Record<PieceType, number[][][]> = Object.fromEntries(
  PIECE_TYPES.map(type => {
    const states = [SHAPES[type]];
    for (let i = 1; i < 4; i++) states.push(rotateClockwise(states[i - 1]));
    return [type, states];
  })
) as Record<PieceType, number[][][]>;

export function emptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(null));
}

/** Absolute board cells covered by a piece. */
export function cellsOf(piece: ActivePiece): Array<[number, number]> {
  const cells: Array<[number, number]> = [];
  ROTATIONS[piece.type][piece.rotation].forEach((row, dy) =>
    row.forEach((filled, dx) => {
      if (filled) cells.push([piece.x + dx, piece.y + dy]);
    })
  );
  return cells;
}

export function collides(board: Board, piece: ActivePiece): boolean {
  return cellsOf(piece).some(
    ([x, y]) =>
      x < 0 || x >= COLS || y >= ROWS || (y >= 0 && board[y][x] !== null)
  );
}

/** Milliseconds between gravity steps for a level. */
export function gravityMs(level: number): number {
  return Math.max(70, Math.round(800 * Math.pow(0.85, level - 1)));
}

function shuffledBag(rng: Rng): PieceType[] {
  const bag = [...PIECE_TYPES];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

/** 7-bag randomizer: every piece appears once per seven draws. */
function draw(
  bag: PieceType[],
  rng: Rng
): { piece: PieceType; bag: PieceType[] } {
  const source = bag.length > 0 ? bag : shuffledBag(rng);
  return { piece: source[0], bag: source.slice(1) };
}

function spawn(type: PieceType): ActivePiece {
  const width = ROTATIONS[type][0].length;
  return {
    type,
    rotation: 0,
    x: Math.floor((COLS - width) / 2),
    y: type === 'I' ? -1 : 0,
  };
}

export function createGame(rng: Rng = Math.random): BlockDropState {
  const first = draw([], rng);
  const second = draw(first.bag, rng);
  return {
    board: emptyBoard(),
    active: spawn(first.piece),
    next: second.piece,
    bag: second.bag,
    score: 0,
    lines: 0,
    level: 1,
    status: 'playing',
    gravityAcc: 0,
    rng,
  };
}

function tryPlace(state: BlockDropState, piece: ActivePiece): BlockDropState {
  return collides(state.board, piece) ? state : { ...state, active: piece };
}

export function move(state: BlockDropState, dx: number): BlockDropState {
  if (state.status !== 'playing') return state;
  return tryPlace(state, { ...state.active, x: state.active.x + dx });
}

export function rotate(
  state: BlockDropState,
  direction: 1 | -1 = 1
): BlockDropState {
  if (state.status !== 'playing' || state.active.type === 'O') return state;
  const rotation = (state.active.rotation + direction + 4) % 4;
  for (const kick of KICKS) {
    const candidate = { ...state.active, rotation, x: state.active.x + kick };
    if (!collides(state.board, candidate))
      return { ...state, active: candidate };
  }
  return state;
}

/** Writes the active piece into the board, clears lines and spawns the next piece. */
function lockPiece(state: BlockDropState): BlockDropState {
  const board = state.board.map(row => [...row]);
  let toppedOut = false;
  for (const [x, y] of cellsOf(state.active)) {
    if (y < 0) toppedOut = true;
    else board[y][x] = state.active.type;
  }

  const remaining = board.filter(row => row.some(cell => cell === null));
  const cleared = ROWS - remaining.length;
  const clearedBoard = [
    ...Array.from({ length: cleared }, () => Array<Cell>(COLS).fill(null)),
    ...remaining,
  ];

  const lines = state.lines + cleared;
  const score = state.score + LINE_SCORES[cleared] * state.level;
  const level = 1 + Math.floor(lines / LINES_PER_LEVEL);

  const nextDraw = draw(state.bag, state.rng);
  const active = spawn(state.next);
  const over = toppedOut || collides(clearedBoard, active);

  return {
    ...state,
    board: clearedBoard,
    active,
    next: nextDraw.piece,
    bag: nextDraw.bag,
    score,
    lines,
    level,
    gravityAcc: 0,
    status: over ? 'over' : state.status,
  };
}

/** One row down; locks the piece when it cannot fall further. */
function step(state: BlockDropState): BlockDropState {
  const lowered = { ...state.active, y: state.active.y + 1 };
  return collides(state.board, lowered)
    ? lockPiece(state)
    : { ...state, active: lowered };
}

export function softDrop(state: BlockDropState): BlockDropState {
  if (state.status !== 'playing') return state;
  const lowered = { ...state.active, y: state.active.y + 1 };
  if (collides(state.board, lowered)) return lockPiece(state);
  return { ...state, active: lowered, score: state.score + 1, gravityAcc: 0 };
}

export function hardDrop(state: BlockDropState): BlockDropState {
  if (state.status !== 'playing') return state;
  const landed = ghostOf(state);
  const distance = landed.y - state.active.y;
  return lockPiece({
    ...state,
    active: landed,
    score: state.score + distance * 2,
  });
}

/** Where the active piece would land on a hard drop. */
export function ghostOf(state: BlockDropState): ActivePiece {
  let ghost = state.active;
  while (!collides(state.board, { ...ghost, y: ghost.y + 1 })) {
    ghost = { ...ghost, y: ghost.y + 1 };
  }
  return ghost;
}

/** Advances gravity by `dtMs` of wall-clock time. */
export function tick(state: BlockDropState, dtMs: number): BlockDropState {
  if (state.status !== 'playing') return state;
  let next = { ...state, gravityAcc: state.gravityAcc + dtMs };
  const interval = gravityMs(next.level);
  while (next.status === 'playing' && next.gravityAcc >= interval) {
    next = { ...step(next), gravityAcc: next.gravityAcc - interval };
  }
  return next;
}

export function togglePause(state: BlockDropState): BlockDropState {
  if (state.status === 'over') return state;
  return {
    ...state,
    status: state.status === 'playing' ? 'paused' : 'playing',
  };
}

/** Shape matrix of a piece in spawn orientation, for the "next" preview. */
export function previewShape(type: PieceType): number[][] {
  return ROTATIONS[type][0];
}
