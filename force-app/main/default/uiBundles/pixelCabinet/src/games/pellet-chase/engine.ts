/**
 * Pellet Chase engine — framework-free game rules.
 *
 * Every operation is a pure function `state -> state`, so the React view only
 * renders and forwards input, and the rules are unit-testable without a DOM.
 * Randomness is injected (`rng`): frightened ghosts pick their turns with it,
 * everything else is deterministic.
 */

export type Direction = 'up' | 'down' | 'left' | 'right';
export type Rng = () => number;
export type Status = 'playing' | 'paused' | 'over';
export type Tile = 'wall' | 'door' | 'path';
export type Pellet = 'dot' | 'power';
export type Pellets = Array<Array<Pellet | null>>;
export type GhostColor = 'red' | 'pink' | 'cyan' | 'orange';
/** house: waiting inside; leaving: heading for the exit; eaten: eyes heading home. */
export type GhostMode = 'house' | 'leaving' | 'roaming' | 'eaten';
export type Phase = 'scatter' | 'chase';

export interface Point {
  x: number;
  y: number;
}

/**
 * Position on the tile grid: the tile it last stood on, its heading and how
 * far (0..1) it got towards the next tile in that direction.
 */
export interface Mover extends Point {
  dir: Direction;
  progress: number;
}

export interface Player extends Mover {
  /** Buffered turn, taken at the next tile where it is possible. */
  next: Direction | null;
}

export interface Ghost extends Mover {
  color: GhostColor;
  mode: GhostMode;
  frightened: boolean;
}

export interface PelletChaseState {
  pellets: Pellets;
  pelletsLeft: number;
  player: Player;
  ghosts: Ghost[];
  score: number;
  level: number;
  lives: number;
  status: Status;
  /** Freeze before play (re)starts: new game, lost life, next level. */
  readyMs: number;
  /** Time since the current round started; releases ghosts from the house. */
  roundMs: number;
  /** Position in the scatter/chase schedule; it pauses while ghosts are frightened. */
  phaseIndex: number;
  phaseMs: number;
  frightMs: number;
  /** Ghosts eaten in the current power phase, for the 200/400/800/1600 combo. */
  combo: number;
  pelletsEaten: number;
  ghostsEaten: number;
  /** Play time without pauses. */
  playMs: number;
  rng: Rng;
}

/**
 * '#' wall, '-' ghost house door, '.' pellet, 'o' power pellet, ' ' empty path.
 * Row 9 is open at both ends: the wrap-around tunnel.
 */
const MAZE = [
  '###################',
  '#o.......#.......o#',
  '#.##.###.#.###.##.#',
  '#.................#',
  '#.##.#.#####.#.##.#',
  '#....#...#...#....#',
  '####.### # ###.####',
  '####.#       #.####',
  '####.# ##-## #.####',
  '    .  #   #  .    ',
  '####.# ##### #.####',
  '####.#       #.####',
  '####.# ##### #.####',
  '#........#........#',
  '#.##.###.#.###.##.#',
  '#o.#..... .....#.o#',
  '##.#.#.#####.#.#.##',
  '#....#...#...#....#',
  '#.######.#.######.#',
  '#.................#',
  '###################',
];

export const COLS = MAZE[0].length;
export const ROWS = MAZE.length;

export const PLAYER_START: Point = { x: 9, y: 15 };
/** Inside the house; eaten ghosts return here before leaving again. */
export const HOUSE_CENTER: Point = { x: 9, y: 9 };
/** The tile right above the door, where leaving ghosts start to roam. */
export const HOUSE_EXIT: Point = { x: 9, y: 7 };

export const READY_MS = 1500;
/** Tiles per second. */
export const PLAYER_SPEED = 8;
const FRIGHTENED_SPEED = 4.5;
const LEAVING_SPEED = 4;
const EATEN_SPEED = 14;

const DOT_POINTS = 10;
const POWER_POINTS = 50;
const GHOST_POINTS = [200, 400, 800, 1600];
const START_LIVES = 3;
/** Distance in tiles at which the player and a ghost touch. */
const CATCH_DISTANCE = 0.5;
/** Simulation step, small enough that nothing passes through anything. */
const STEP_MS = 16;
/** Longest frame simulated at once, so a stalled tab does not jump ahead. */
const MAX_FRAME_MS = 250;
const EPSILON = 1e-9;

/** Scatter and chase alternate; the last chase lasts until the round ends. */
const PHASES: readonly number[] = [
  7000,
  20000,
  7000,
  20000,
  5000,
  20000,
  5000,
  Infinity,
];

/** Turn order when distances tie. */
const DIRECTIONS: readonly Direction[] = ['up', 'left', 'down', 'right'];

const DELTAS: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export const OPPOSITE: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

/** Each ghost retreats to its own corner (outside the maze) while scattering. */
export const SCATTER_TARGETS: Record<GhostColor, Point> = {
  red: { x: COLS - 3, y: -2 },
  pink: { x: 2, y: -2 },
  cyan: { x: COLS - 1, y: ROWS },
  orange: { x: 0, y: ROWS },
};

const ghostStart = (
  color: GhostColor,
  at: Point,
  dir: Direction,
  mode: GhostMode
): Ghost => ({ color, ...at, dir, progress: 0, mode, frightened: false });

const GHOST_STARTS: readonly Ghost[] = [
  ghostStart('red', HOUSE_EXIT, 'left', 'roaming'),
  ghostStart('pink', HOUSE_CENTER, 'up', 'house'),
  ghostStart('cyan', { x: 8, y: 9 }, 'right', 'house'),
  ghostStart('orange', { x: 10, y: 9 }, 'left', 'house'),
];

/** When each ghost leaves the house, counted from the start of a round. */
const RELEASE_MS: Record<GhostColor, number> = {
  red: 0,
  pink: 0,
  cyan: 4000,
  orange: 8000,
};

export function wrapX(x: number): number {
  return ((x % COLS) + COLS) % COLS;
}

export function tileAt(x: number, y: number): Tile {
  if (y < 0 || y >= ROWS) return 'wall';
  const ch = MAZE[y][wrapX(x)];
  return ch === '#' ? 'wall' : ch === '-' ? 'door' : 'path';
}

function neighbor(point: Point, dir: Direction): Point {
  return {
    x: wrapX(point.x + DELTAS[dir].x),
    y: point.y + DELTAS[dir].y,
  };
}

/** Exact position in tile units; x may run past the edges in the tunnel. */
export function positionOf(mover: Mover): Point {
  return {
    x: mover.x + DELTAS[mover.dir].x * mover.progress,
    y: mover.y + DELTAS[mover.dir].y * mover.progress,
  };
}

/** Turns around on the spot, also between two tiles. */
function reverse<T extends Mover>(mover: T): T {
  if (mover.progress === 0) return { ...mover, dir: OPPOSITE[mover.dir] };
  return {
    ...mover,
    ...neighbor(mover, mover.dir),
    dir: OPPOSITE[mover.dir],
    progress: 1 - mover.progress,
  };
}

export function freshPellets(): Pellets {
  return MAZE.map(row =>
    [...row].map(ch => (ch === '.' ? 'dot' : ch === 'o' ? 'power' : null))
  );
}

function countPellets(pellets: Pellets): number {
  return pellets.flat().filter(Boolean).length;
}

/** Ghosts in the scatter/chase rhythm get faster with every level. */
export function ghostSpeed(level: number): number {
  return Math.min(8.5, 7 + 0.5 * (level - 1));
}

/** Power pellets frighten the ghosts for a shorter time with every level. */
export function frightMs(level: number): number {
  return Math.max(1000, 6000 - 1000 * (level - 1));
}

export function phaseOf(state: PelletChaseState): Phase {
  return state.phaseIndex % 2 === 0 ? 'scatter' : 'chase';
}

/** Everyone back to the start; pellets, score and lives stay. */
function startRound(state: PelletChaseState): PelletChaseState {
  return {
    ...state,
    player: { ...PLAYER_START, dir: 'left', progress: 0, next: null },
    ghosts: GHOST_STARTS.map(ghost => ({ ...ghost })),
    readyMs: READY_MS,
    roundMs: 0,
    phaseIndex: 0,
    phaseMs: 0,
    frightMs: 0,
    combo: 0,
  };
}

export function createGame(rng: Rng = Math.random): PelletChaseState {
  const pellets = freshPellets();
  return startRound({
    pellets,
    pelletsLeft: countPellets(pellets),
    player: { ...PLAYER_START, dir: 'left', progress: 0, next: null },
    ghosts: [],
    score: 0,
    level: 1,
    lives: START_LIVES,
    status: 'playing',
    readyMs: READY_MS,
    roundMs: 0,
    phaseIndex: 0,
    phaseMs: 0,
    frightMs: 0,
    combo: 0,
    pelletsEaten: 0,
    ghostsEaten: 0,
    playMs: 0,
    rng,
  });
}

/**
 * Steers the player. Reversing happens at once; any other turn is buffered
 * and taken at the next tile where it is possible.
 */
export function steer(
  state: PelletChaseState,
  dir: Direction
): PelletChaseState {
  if (state.status !== 'playing') return state;
  const player = state.player;
  if (dir === OPPOSITE[player.dir] && player.progress > 0) {
    return { ...state, player: { ...reverse(player), next: null } };
  }
  return { ...state, player: { ...player, next: dir } };
}

export function togglePause(state: PelletChaseState): PelletChaseState {
  if (state.status === 'over') return state;
  return {
    ...state,
    status: state.status === 'playing' ? 'paused' : 'playing',
  };
}

/** The tile the player is mostly on, which the ghosts aim at. */
function playerTile(player: Player): Point {
  return player.progress >= 0.5
    ? neighbor(player, player.dir)
    : { x: player.x, y: player.y };
}

/** Where a ghost is heading right now. Frightened ghosts ignore it and wander. */
export function ghostTarget(state: PelletChaseState, ghost: Ghost): Point {
  if (ghost.mode === 'eaten') return HOUSE_CENTER;
  if (ghost.mode !== 'roaming') return HOUSE_EXIT;
  if (phaseOf(state) === 'scatter') return SCATTER_TARGETS[ghost.color];

  const player = playerTile(state.player);
  const facing = DELTAS[state.player.dir];
  const ahead = (tiles: number): Point => ({
    x: player.x + facing.x * tiles,
    y: player.y + facing.y * tiles,
  });
  switch (ghost.color) {
    // The chaser goes straight for the player.
    case 'red':
      return player;
    // The ambusher cuts the player off four tiles ahead.
    case 'pink':
      return ahead(4);
    // The flanker mirrors the chaser around a point two tiles ahead of the
    // player, so the two close in from opposite sides.
    case 'cyan': {
      const pivot = ahead(2);
      const red = state.ghosts.find(g => g.color === 'red') ?? ghost;
      return { x: 2 * pivot.x - red.x, y: 2 * pivot.y - red.y };
    }
    // The shy one chases from afar but backs off to its corner up close.
    case 'orange': {
      const dx = player.x - ghost.x;
      const dy = player.y - ghost.y;
      return dx * dx + dy * dy > 64 ? player : SCATTER_TARGETS.orange;
    }
  }
}

function ghostCanEnter(ghost: Ghost, dir: Direction): boolean {
  const { x, y } = neighbor(ghost, dir);
  const tile = tileAt(x, y);
  if (tile === 'door')
    return ghost.mode === 'leaving' || ghost.mode === 'eaten';
  return tile === 'path';
}

/**
 * Ghosts never turn around on their own: at each tile they take the open
 * direction closest to their target, or a random one while frightened.
 */
function chooseDirection(state: PelletChaseState, ghost: Ghost): Direction {
  const options = DIRECTIONS.filter(
    dir => dir !== OPPOSITE[ghost.dir] && ghostCanEnter(ghost, dir)
  );
  if (options.length === 0) return OPPOSITE[ghost.dir];
  if (ghost.frightened && ghost.mode === 'roaming') {
    return options[Math.floor(state.rng() * options.length)];
  }
  const target = ghostTarget(state, ghost);
  let best = options[0];
  let bestDistance = Infinity;
  for (const dir of options) {
    const { x, y } = neighbor(ghost, dir);
    const distance = (x - target.x) ** 2 + (y - target.y) ** 2;
    if (distance < bestDistance) {
      best = dir;
      bestDistance = distance;
    }
  }
  return best;
}

function speedOf(ghost: Ghost, level: number): number {
  if (ghost.mode === 'eaten') return EATEN_SPEED;
  if (ghost.mode === 'leaving') return LEAVING_SPEED;
  if (ghost.frightened) return FRIGHTENED_SPEED;
  return ghostSpeed(level);
}

/** Mode changes when a ghost reaches the house or its exit. */
function arrive(ghost: Ghost): Ghost {
  const at = (point: Point) => ghost.x === point.x && ghost.y === point.y;
  if (ghost.mode === 'eaten' && at(HOUSE_CENTER)) {
    return { ...ghost, mode: 'leaving', dir: 'up' };
  }
  if (ghost.mode === 'leaving' && at(HOUSE_EXIT)) {
    return { ...ghost, mode: 'roaming' };
  }
  return ghost;
}

function moveGhost(state: PelletChaseState, ghost: Ghost, dtMs: number): Ghost {
  if (ghost.mode === 'house') return ghost;
  let g = ghost;
  let left = (speedOf(ghost, state.level) * dtMs) / 1000;
  while (left > 0) {
    if (g.progress === 0) g = { ...g, dir: chooseDirection(state, g) };
    const step = Math.min(left, 1 - g.progress);
    left -= step;
    g =
      g.progress + step >= 1 - EPSILON
        ? arrive({ ...g, ...neighbor(g, g.dir), progress: 0 })
        : { ...g, progress: g.progress + step };
  }
  return g;
}

function playerCanEnter(player: Player, dir: Direction): boolean {
  const { x, y } = neighbor(player, dir);
  return tileAt(x, y) === 'path';
}

/** Moves the player along; reports whether it reached a new tile. */
function movePlayer(
  player: Player,
  dtMs: number
): { player: Player; arrived: boolean } {
  let p = player;
  let left = (PLAYER_SPEED * dtMs) / 1000;
  let arrived = false;
  while (left > 0) {
    if (p.progress === 0) {
      if (p.next && playerCanEnter(p, p.next)) {
        p = { ...p, dir: p.next, next: null };
      }
      if (!playerCanEnter(p, p.dir)) break;
    }
    const step = Math.min(left, 1 - p.progress);
    left -= step;
    if (p.progress + step >= 1 - EPSILON) {
      p = { ...p, ...neighbor(p, p.dir), progress: 0 };
      arrived = true;
    } else {
      p = { ...p, progress: p.progress + step };
    }
  }
  return { player: p, arrived };
}

function eatPellet(state: PelletChaseState): PelletChaseState {
  const { x, y } = state.player;
  const pellet = state.pellets[y][x];
  if (!pellet) return state;

  const pellets = state.pellets.map((row, rowY) =>
    rowY === y ? row.map((cell, cellX) => (cellX === x ? null : cell)) : row
  );
  const eaten: PelletChaseState = {
    ...state,
    pellets,
    pelletsLeft: state.pelletsLeft - 1,
    pelletsEaten: state.pelletsEaten + 1,
    score: state.score + (pellet === 'power' ? POWER_POINTS : DOT_POINTS),
  };

  if (eaten.pelletsLeft === 0) {
    const fresh = freshPellets();
    return startRound({
      ...eaten,
      level: state.level + 1,
      pellets: fresh,
      pelletsLeft: countPellets(fresh),
    });
  }
  if (pellet === 'dot') return eaten;

  // Power pellet: roaming ghosts turn around and become edible.
  return {
    ...eaten,
    frightMs: frightMs(state.level),
    combo: 0,
    ghosts: eaten.ghosts.map(ghost =>
      ghost.mode === 'roaming'
        ? { ...(ghost.frightened ? ghost : reverse(ghost)), frightened: true }
        : ghost
    ),
  };
}

function touches(a: Point, b: Point): boolean {
  const dx = Math.abs(a.x - b.x) % COLS;
  return Math.min(dx, COLS - dx) + Math.abs(a.y - b.y) < CATCH_DISTANCE;
}

/** Frightened ghosts get eaten, any other ghost costs a life. */
function resolveCollisions(state: PelletChaseState): PelletChaseState {
  const at = positionOf(state.player);
  let next = state;
  for (const ghost of state.ghosts) {
    if (ghost.mode === 'house' || ghost.mode === 'eaten') continue;
    if (!touches(at, positionOf(ghost))) continue;
    if (!ghost.frightened) {
      const lives = next.lives - 1;
      return lives === 0
        ? { ...next, lives, status: 'over' }
        : startRound({ ...next, lives });
    }
    next = {
      ...next,
      score:
        next.score +
        GHOST_POINTS[Math.min(next.combo, GHOST_POINTS.length - 1)],
      combo: next.combo + 1,
      ghostsEaten: next.ghostsEaten + 1,
      ghosts: next.ghosts.map(g =>
        g === ghost ? { ...g, mode: 'eaten', frightened: false } : g
      ),
    };
  }
  return next;
}

/** Fright countdown, scatter/chase schedule and releases from the house. */
function advanceTimers(
  state: PelletChaseState,
  dtMs: number
): PelletChaseState {
  const roundMs = state.roundMs + dtMs;
  let { phaseIndex, phaseMs, frightMs: fright, ghosts } = state;

  if (fright > 0) {
    fright = Math.max(0, fright - dtMs);
    if (fright === 0) ghosts = ghosts.map(g => ({ ...g, frightened: false }));
  } else {
    phaseMs += dtMs;
    if (phaseMs >= PHASES[phaseIndex]) {
      phaseMs -= PHASES[phaseIndex];
      phaseIndex += 1;
      // Every phase change turns the roaming ghosts around.
      ghosts = ghosts.map(g => (g.mode === 'roaming' ? reverse(g) : g));
    }
  }

  ghosts = ghosts.map(g =>
    g.mode === 'house' && roundMs >= RELEASE_MS[g.color]
      ? { ...g, mode: 'leaving' }
      : g
  );
  return { ...state, roundMs, phaseIndex, phaseMs, frightMs: fright, ghosts };
}

function step(state: PelletChaseState, dtMs: number): PelletChaseState {
  const playMs = state.playMs + dtMs;
  if (state.readyMs > 0) {
    return { ...state, playMs, readyMs: Math.max(0, state.readyMs - dtMs) };
  }

  let next = advanceTimers({ ...state, playMs }, dtMs);
  const moved = movePlayer(next.player, dtMs);
  next = { ...next, player: moved.player };
  if (moved.arrived) {
    const level = next.level;
    next = eatPellet(next);
    if (next.level !== level) return next;
  }

  next = resolveCollisions(next);
  if (next.status !== 'playing' || next.readyMs > 0) return next;
  const current = next;
  next = {
    ...next,
    ghosts: next.ghosts.map(g => moveGhost(current, g, dtMs)),
  };
  return resolveCollisions(next);
}

/** Advances the game by `dtMs` of wall-clock time. */
export function tick(state: PelletChaseState, dtMs: number): PelletChaseState {
  if (state.status !== 'playing') return state;
  let next = state;
  let left = Math.min(dtMs, MAX_FRAME_MS);
  while (left > 0 && next.status === 'playing') {
    const dt = Math.min(left, STEP_MS);
    next = step(next, dt);
    left -= dt;
  }
  return next;
}
