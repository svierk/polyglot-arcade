import { describe, expect, it } from 'vitest';
import {
  COLS,
  HOUSE_CENTER,
  HOUSE_EXIT,
  PLAYER_START,
  READY_MS,
  ROWS,
  SCATTER_TARGETS,
  type Direction,
  type Ghost,
  type GhostColor,
  type Pellet,
  type Pellets,
  type PelletChaseState,
  type Player,
  createGame,
  freshPellets,
  frightMs,
  ghostSpeed,
  ghostTarget,
  phaseOf,
  positionOf,
  steer,
  tick,
  tileAt,
  togglePause,
  wrapX,
} from './engine';

const fixedRng = () => 0;

/** Small seeded PRNG (mulberry32), so two games can share a random sequence. */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Ticks in display-sized frames, like the game loop does. */
function run(state: PelletChaseState, ms: number): PelletChaseState {
  let next = state;
  for (let left = ms; left > 0; left -= 16)
    next = tick(next, Math.min(16, left));
  return next;
}

/** A game past its "ready" freeze. */
function started(overrides: Partial<PelletChaseState> = {}): PelletChaseState {
  return { ...createGame(fixedRng), readyMs: 0, ...overrides };
}

function player(x: number, y: number, dir: Direction, progress = 0): Player {
  return { x, y, dir, progress, next: null };
}

function ghost(
  color: GhostColor,
  x: number,
  y: number,
  overrides: Partial<Ghost> = {}
): Ghost {
  return {
    color,
    x,
    y,
    dir: 'left',
    progress: 0,
    mode: 'roaming',
    frightened: false,
    ...overrides,
  };
}

/** A maze holding only the given pellets. */
function onlyPellets(
  cells: Array<[number, number, Pellet]>
): Pick<PelletChaseState, 'pellets' | 'pelletsLeft'> {
  const pellets: Pellets = freshPellets().map(row => row.map(() => null));
  for (const [x, y, pellet] of cells) pellets[y][x] = pellet;
  return { pellets, pelletsLeft: cells.length };
}

const DIRS: Direction[] = ['up', 'down', 'left', 'right'];
const step = (x: number, y: number, dir: Direction) => ({
  x: wrapX(x + (dir === 'left' ? -1 : dir === 'right' ? 1 : 0)),
  y: y + (dir === 'up' ? -1 : dir === 'down' ? 1 : 0),
});

describe('Pellet Chase engine', () => {
  describe('maze', () => {
    it('is closed except for the tunnel, without dead ends', () => {
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          if (tileAt(x, y) !== 'path') continue;
          const open = DIRS.filter(dir => {
            const n = step(x, y, dir);
            return tileAt(n.x, n.y) === 'path';
          });
          // The house interior is only reachable through the door.
          const inHouse = y === HOUSE_CENTER.y && Math.abs(x - 9) <= 1;
          if (!inHouse) expect(open.length, `${x},${y}`).toBeGreaterThan(1);
        }
      }
      expect(tileAt(-1, 9)).toBe('path');
      expect(tileAt(COLS, 9)).toBe('path');
      expect(tileAt(0, 1)).toBe('wall');
    });

    it('lets the player reach every pellet, four of them power pellets', () => {
      const pellets = freshPellets();
      const seen = new Set([`${PLAYER_START.x},${PLAYER_START.y}`]);
      const queue = [PLAYER_START];
      while (queue.length > 0) {
        const { x, y } = queue.shift()!;
        for (const dir of DIRS) {
          const n = step(x, y, dir);
          const key = `${n.x},${n.y}`;
          if (tileAt(n.x, n.y) === 'path' && !seen.has(key)) {
            seen.add(key);
            queue.push(n);
          }
        }
      }
      pellets.forEach((row, y) =>
        row.forEach((pellet, x) => {
          if (pellet) expect(seen.has(`${x},${y}`), `${x},${y}`).toBe(true);
        })
      );
      expect(pellets.flat().filter(p => p === 'power')).toHaveLength(4);
    });
  });

  it('starts at level 1 with three lives, a full maze and a ready freeze', () => {
    const game = createGame(fixedRng);
    expect(game.level).toBe(1);
    expect(game.lives).toBe(3);
    expect(game.score).toBe(0);
    expect(game.status).toBe('playing');
    expect(game.readyMs).toBe(READY_MS);
    expect(game.pelletsLeft).toBe(freshPellets().flat().filter(Boolean).length);
    expect(game.player).toMatchObject(PLAYER_START);
    expect(game.ghosts.map(g => g.color)).toEqual([
      'red',
      'pink',
      'cyan',
      'orange',
    ]);
  });

  it('holds everyone still while getting ready', () => {
    const game = createGame(fixedRng);
    const waited = run(game, READY_MS - 100);
    expect(waited.player).toEqual(game.player);
    expect(waited.ghosts).toEqual(game.ghosts);
    expect(waited.playMs).toBe(READY_MS - 100);
  });

  describe('movement', () => {
    it('moves the player at a steady speed and stops at walls', () => {
      const game = started({ ghosts: [] });
      expect(positionOf(run(game, 500).player).x).toBeCloseTo(5);
      const stopped = run(game, 2000).player;
      expect(stopped).toMatchObject({ x: 4, y: 15, progress: 0 });
    });

    it('buffers a turn until the next tile where it is possible', () => {
      // Above the start is a wall; the first opening upwards is one tile left.
      const game = steer(started({ ghosts: [] }), 'up');
      expect(game.player.next).toBe('up');
      const turned = run(game, 250).player;
      expect(turned.dir).toBe('up');
      expect(turned.next).toBeNull();
      expect(positionOf(turned).x).toBeCloseTo(8);
      expect(positionOf(turned).y).toBeCloseTo(14);
    });

    it('reverses at once, even between two tiles', () => {
      const moving = run(started({ ghosts: [] }), 100);
      const before = positionOf(moving.player);
      const reversed = steer(moving, 'right');
      expect(reversed.player.dir).toBe('right');
      expect(positionOf(reversed.player).x).toBeCloseTo(before.x);
      expect(positionOf(run(reversed, 100).player).x).toBeCloseTo(9);
    });

    it('wraps around through the tunnel', () => {
      const game = started({ ghosts: [], player: player(2, 9, 'left') });
      // Four tiles: 1, 0, then out the left edge and in at the right one.
      expect(run(game, 500).player).toMatchObject({ x: COLS - 2, y: 9 });
    });
  });

  describe('scoring', () => {
    it('scores 10 per pellet', () => {
      const ate = run(started({ ghosts: [] }), 125);
      expect(ate.score).toBe(10);
      expect(ate.pelletsEaten).toBe(1);
      expect(ate.pellets[15][8]).toBeNull();
    });

    it('scores 50 for a power pellet that frightens and turns the ghosts', () => {
      const game = started({
        player: player(2, 1, 'left', 0.99),
        combo: 3,
      });
      const ate = tick(game, 16);
      expect(ate.score).toBe(50);
      expect(ate.frightMs).toBe(frightMs(1));
      expect(ate.combo).toBe(0);
      const red = ate.ghosts.find(g => g.color === 'red')!;
      expect(red.frightened).toBe(true);
      expect(red.dir).toBe('right');
      // Ghosts still in the house stay dangerous.
      expect(ate.ghosts.find(g => g.color === 'cyan')!.frightened).toBe(false);
    });

    it('doubles the points for each ghost eaten in one power phase', () => {
      const frightened = { frightened: true };
      const game = started({
        player: player(4, 13, 'left'),
        frightMs: 5000,
        ghosts: (['red', 'pink', 'cyan', 'orange'] as const).map(color =>
          ghost(color, 4, 13, frightened)
        ),
      });
      const ate = tick(game, 16);
      expect(ate.score).toBe(200 + 400 + 800 + 1600);
      expect(ate.ghostsEaten).toBe(4);
      expect(ate.ghosts.every(g => g.mode === 'eaten' && !g.frightened)).toBe(
        true
      );
      expect(ate.lives).toBe(3);
    });
  });

  describe('fright', () => {
    it('ends after its time and stops the scatter/chase clock meanwhile', () => {
      const game = started({
        frightMs: 1000,
        phaseMs: 500,
        ghosts: [ghost('red', 9, 7, { frightened: true })],
      });
      const during = run(game, 500);
      expect(during.phaseMs).toBe(500);
      expect(during.ghosts[0].frightened).toBe(true);
      const after = run(during, 600);
      expect(after.frightMs).toBe(0);
      expect(after.ghosts[0].frightened).toBe(false);
      expect(after.phaseMs).toBeGreaterThan(500);
    });

    it('gets shorter while the ghosts get faster with every level', () => {
      expect(frightMs(2)).toBeLessThan(frightMs(1));
      expect(frightMs(20)).toBeGreaterThan(0);
      expect(ghostSpeed(2)).toBeGreaterThan(ghostSpeed(1));
      expect(ghostSpeed(20)).toBe(ghostSpeed(10));
    });
  });

  describe('ghosts', () => {
    const chase = (state: Partial<PelletChaseState>) =>
      started({ phaseIndex: 1, ...state });

    it('aim at their own targets while chasing', () => {
      const red = ghost('red', 9, 7);
      const game = chase({
        player: player(5, 13, 'right'),
        ghosts: [red],
      });
      expect(phaseOf(game)).toBe('chase');
      expect(ghostTarget(game, red)).toEqual({ x: 5, y: 13 });
      expect(ghostTarget(game, ghost('pink', 1, 1))).toEqual({ x: 9, y: 13 });
      // Two tiles ahead is (7, 13); the red ghost's vector to it, doubled.
      expect(ghostTarget(game, ghost('cyan', 1, 1))).toEqual({ x: 5, y: 19 });
      expect(ghostTarget(game, ghost('orange', 15, 3))).toEqual({
        x: 5,
        y: 13,
      });
      expect(ghostTarget(game, ghost('orange', 6, 13))).toEqual(
        SCATTER_TARGETS.orange
      );
    });

    it('head for their corners while scattering, and home when eaten', () => {
      const game = started();
      expect(phaseOf(game)).toBe('scatter');
      for (const color of ['red', 'pink', 'cyan', 'orange'] as const) {
        expect(ghostTarget(game, ghost(color, 1, 1))).toEqual(
          SCATTER_TARGETS[color]
        );
      }
      expect(ghostTarget(game, ghost('red', 1, 1, { mode: 'eaten' }))).toEqual(
        HOUSE_CENTER
      );
      expect(
        ghostTarget(game, ghost('red', 9, 9, { mode: 'leaving' }))
      ).toEqual(HOUSE_EXIT);
    });

    it('take the open direction closest to the target at a junction', () => {
      const game = chase({
        player: player(8, 13, 'left'),
        ghosts: [ghost('red', 4, 13, { dir: 'up' })],
      });
      expect(tick(game, 16).ghosts[0].dir).toBe('right');
    });

    it('turn around when scatter switches to chase', () => {
      const game = started({
        phaseMs: 7000 - 10,
        ghosts: [ghost('red', 8, 7, { progress: 0.5 })],
      });
      const switched = tick(game, 16);
      expect(phaseOf(switched)).toBe('chase');
      expect(switched.ghosts[0].dir).toBe('right');
    });

    it('wander the same way given the same rng while frightened', () => {
      const frightened = (seed: number) =>
        run(
          {
            ...createGame(seeded(seed)),
            readyMs: 0,
            frightMs: 60_000,
            player: player(4, 15, 'left'),
            ghosts: [
              ghost('red', 9, 7, { frightened: true }),
              ghost('pink', 1, 19, { frightened: true }),
            ],
          },
          3000
        ).ghosts;
      expect(frightened(42)).toEqual(frightened(42));
      expect(frightened(42)).not.toEqual(frightened(7));
    });

    it('leave the house one after another', () => {
      const game = started();
      expect(tick(game, 16).ghosts.map(g => g.mode)).toEqual([
        'roaming',
        'leaving',
        'house',
        'house',
      ]);
      expect(tick({ ...game, roundMs: 3990 }, 16).ghosts[2].mode).toBe(
        'leaving'
      );
      expect(tick({ ...game, roundMs: 7990 }, 16).ghosts[3].mode).toBe(
        'leaving'
      );
    });

    it('return to the house when eaten and come out again', () => {
      const game = started({
        ghosts: [ghost('red', 6, 7, { dir: 'right', mode: 'eaten' })],
      });
      const home = run(game, 400).ghosts[0];
      expect(home.mode).toBe('leaving');
      expect(run(game, 1500).ghosts[0].mode).toBe('roaming');
    });
  });

  describe('lives and levels', () => {
    it('costs a life when a ghost catches the player and restarts the round', () => {
      const game = started({
        player: player(4, 13, 'left'),
        ghosts: [ghost('red', 4, 13)],
        pelletsLeft: 100,
      });
      const caught = tick(game, 16);
      expect(caught.lives).toBe(2);
      expect(caught.status).toBe('playing');
      expect(caught.readyMs).toBe(READY_MS);
      expect(caught.player).toMatchObject(PLAYER_START);
      expect(caught.ghosts).toHaveLength(4);
      expect(caught.pelletsLeft).toBe(100);
    });

    it('ends the game after the last life', () => {
      const game = started({
        lives: 1,
        player: player(4, 13, 'left'),
        ghosts: [ghost('red', 4, 13)],
      });
      const over = tick(game, 16);
      expect(over.status).toBe('over');
      expect(over.lives).toBe(0);
      expect(tick(over, 16)).toBe(over);
      expect(steer(over, 'up')).toBe(over);
      expect(togglePause(over)).toBe(over);
    });

    it('starts the next level with a full maze when the last pellet is eaten', () => {
      const game = started({ ghosts: [], ...onlyPellets([[8, 15, 'dot']]) });
      const cleared = run(game, 200);
      expect(cleared.level).toBe(2);
      expect(cleared.score).toBe(10);
      expect(cleared.pelletsLeft).toBe(createGame().pelletsLeft);
      expect(cleared.readyMs).toBeGreaterThan(0);
      expect(cleared.player).toMatchObject(PLAYER_START);
    });
  });

  it('pauses without counting the paused time as play time', () => {
    const game = run(started({ ghosts: [] }), 1000);
    expect(game.playMs).toBe(1000);
    const paused = togglePause(game);
    expect(paused.status).toBe('paused');
    expect(tick(paused, 500)).toBe(paused);
    expect(steer(paused, 'up')).toBe(paused);
    const resumed = run(togglePause(paused), 100);
    expect(resumed.status).toBe('playing');
    expect(resumed.playMs).toBe(1100);
  });
});
