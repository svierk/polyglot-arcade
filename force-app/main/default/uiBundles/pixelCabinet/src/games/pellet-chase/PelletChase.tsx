/**
 * Pellet Chase view: canvas rendering, game loop and input. All rules live in
 * ./engine; this component only feeds it time and key presses.
 */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import {
  COLS,
  ROWS,
  type Direction,
  type Ghost,
  type GhostColor,
  type Mover,
  type PelletChaseState,
  createGame,
  positionOf,
  steer,
  tick,
  tileAt,
  togglePause,
} from './engine';
import type { GameProps } from '@/games/types';

const CELL = 20;
const WIDTH = COLS * CELL;
const HEIGHT = ROWS * CELL;
const PLAYER_COLOR = '#facc15';
const GHOST_COLORS: Record<GhostColor, string> = {
  red: '#f87171',
  pink: '#f9a8d4',
  cyan: '#22d3ee',
  orange: '#fb923c',
};
const FRIGHTENED_COLOR = '#3b82f6';
/** Frightened ghosts flash during the last part of the fright. */
const FLASH_MS = 2000;
const ANGLES: Record<Direction, number> = {
  right: 0,
  down: Math.PI / 2,
  left: Math.PI,
  up: -Math.PI / 2,
};

type Action = (state: PelletChaseState) => PelletChaseState;

const KEY_ACTIONS: Record<string, Action> = {
  ArrowUp: s => steer(s, 'up'),
  w: s => steer(s, 'up'),
  ArrowDown: s => steer(s, 'down'),
  s: s => steer(s, 'down'),
  ArrowLeft: s => steer(s, 'left'),
  a: s => steer(s, 'left'),
  ArrowRight: s => steer(s, 'right'),
  d: s => steer(s, 'right'),
  p: togglePause,
  Escape: togglePause,
};

const TOUCH_PAD: Array<{
  label: string;
  name: string;
  action: Action;
  className: string;
}> = [
  {
    label: '↑',
    name: 'Up',
    action: s => steer(s, 'up'),
    className: 'col-start-2',
  },
  {
    label: '←',
    name: 'Left',
    action: s => steer(s, 'left'),
    className: 'col-start-1',
  },
  { label: '↓', name: 'Down', action: s => steer(s, 'down'), className: '' },
  { label: '→', name: 'Right', action: s => steer(s, 'right'), className: '' },
];

interface Hud {
  score: number;
  level: number;
  lives: number;
  status: PelletChaseState['status'] | 'ready';
}

const READY_HUD: Hud = { score: 0, level: 1, lives: 3, status: 'ready' };

/**
 * Calls `draw` with pixel coordinates of a mover's center, twice while it is
 * halfway through the tunnel so it leaves one edge and enters the other.
 */
function atMover(mover: Mover, draw: (cx: number, cy: number) => void) {
  const { x, y } = positionOf(mover);
  const cy = (y + 0.5) * CELL;
  draw((x + 0.5) * CELL, cy);
  if (x < 0.5) draw((x + COLS + 0.5) * CELL, cy);
  if (x > COLS - 1.5) draw((x - COLS + 0.5) * CELL, cy);
}

function drawMaze(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#0b0b1a';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.strokeStyle = '#6366f1';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const tile = tileAt(x, y);
      const px = x * CELL;
      const py = y * CELL;
      if (tile === 'door') {
        ctx.fillStyle = '#f472b6';
        ctx.fillRect(px, py + CELL / 2 - 2, CELL, 4);
        continue;
      }
      if (tile !== 'wall') continue;
      ctx.fillStyle = '#16133d';
      ctx.fillRect(px, py, CELL, CELL);
      // Neon edge on every side that faces the corridors, joined at the corners.
      const isWall = (dx: number, dy: number) =>
        tileAt(x + dx, y + dy) === 'wall';
      const inset = 3;
      const left = isWall(-1, 0) ? px : px + inset;
      const right = isWall(1, 0) ? px + CELL : px + CELL - inset;
      const top = isWall(0, -1) ? py : py + inset;
      const bottom = isWall(0, 1) ? py + CELL : py + CELL - inset;
      ctx.beginPath();
      if (!isWall(0, -1)) {
        ctx.moveTo(left, top);
        ctx.lineTo(right, top);
      }
      if (!isWall(0, 1)) {
        ctx.moveTo(left, bottom);
        ctx.lineTo(right, bottom);
      }
      if (!isWall(-1, 0)) {
        ctx.moveTo(left, top);
        ctx.lineTo(left, bottom);
      }
      if (!isWall(1, 0)) {
        ctx.moveTo(right, top);
        ctx.lineTo(right, bottom);
      }
      // Inner corners: walls on both sides, a corridor diagonally.
      for (const [dx, dy] of [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ]) {
        if (!isWall(dx, 0) || !isWall(0, dy) || isWall(dx, dy)) continue;
        const cx = dx < 0 ? px + inset : px + CELL - inset;
        const cy = dy < 0 ? py + inset : py + CELL - inset;
        ctx.moveTo(cx, dy < 0 ? py : py + CELL);
        ctx.lineTo(cx, cy);
        ctx.lineTo(dx < 0 ? px : px + CELL, cy);
      }
      ctx.stroke();
    }
  }
}

function drawPellets(ctx: CanvasRenderingContext2D, state: PelletChaseState) {
  const blinkOn = Math.floor(state.playMs / 250) % 2 === 0;
  state.pellets.forEach((row, y) =>
    row.forEach((pellet, x) => {
      const cx = (x + 0.5) * CELL;
      const cy = (y + 0.5) * CELL;
      if (pellet === 'dot') {
        ctx.fillStyle = '#fde68a';
        ctx.fillRect(cx - 2, cy - 2, 4, 4);
      } else if (pellet === 'power' && (blinkOn || state.readyMs > 0)) {
        ctx.fillStyle = '#fde68a';
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    })
  );
}

function drawPlayer(ctx: CanvasRenderingContext2D, state: PelletChaseState) {
  const { player } = state;
  // The mouth closes at tile centers and opens between them.
  const mouth = 0.04 + 0.2 * Math.abs(Math.sin(player.progress * Math.PI));
  const angle = ANGLES[player.dir];
  atMover(player, (cx, cy) => {
    ctx.fillStyle = PLAYER_COLOR;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(
      cx,
      cy,
      CELL * 0.45,
      angle + mouth * Math.PI,
      angle - mouth * Math.PI + Math.PI * 2
    );
    ctx.closePath();
    ctx.fill();
  });
}

function ghostBodyColor(ghost: Ghost, state: PelletChaseState): string {
  if (!ghost.frightened) return GHOST_COLORS[ghost.color];
  const flashing =
    state.frightMs < FLASH_MS && Math.floor(state.frightMs / 200) % 2 === 0;
  return flashing ? '#e2e8f0' : FRIGHTENED_COLOR;
}

function drawGhost(
  ctx: CanvasRenderingContext2D,
  ghost: Ghost,
  state: PelletChaseState
) {
  const r = CELL * 0.45;
  const look = {
    x: ghost.dir === 'left' ? -1 : ghost.dir === 'right' ? 1 : 0,
    y: ghost.dir === 'up' ? -1 : ghost.dir === 'down' ? 1 : 0,
  };
  atMover(ghost, (cx, cy) => {
    if (ghost.mode !== 'eaten') {
      ctx.fillStyle = ghostBodyColor(ghost, state);
      ctx.beginPath();
      ctx.arc(cx, cy - r * 0.15, r, Math.PI, 0);
      // Three feet along the hem.
      const bottom = cy + r;
      const feet = 3;
      const footWidth = (2 * r) / feet;
      ctx.lineTo(cx + r, bottom);
      for (let i = feet; i > 0; i--) {
        const fx = cx - r + i * footWidth;
        ctx.lineTo(fx - footWidth / 2, bottom - r * 0.3);
        ctx.lineTo(fx - footWidth, bottom);
      }
      ctx.closePath();
      ctx.fill();
    }
    if (ghost.frightened) {
      ctx.fillStyle = '#fde68a';
      ctx.fillRect(cx - r * 0.45, cy - r * 0.35, 3, 3);
      ctx.fillRect(cx + r * 0.45 - 3, cy - r * 0.35, 3, 3);
      return;
    }
    for (const side of [-1, 1]) {
      const ex = cx + side * r * 0.4;
      const ey = cy - r * 0.25;
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(ex, ey, r * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1e3a8a';
      ctx.beginPath();
      ctx.arc(
        ex + look.x * r * 0.13,
        ey + look.y * r * 0.13,
        r * 0.15,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  });
}

function drawGame(ctx: CanvasRenderingContext2D, state: PelletChaseState) {
  drawMaze(ctx);
  drawPellets(ctx, state);
  drawPlayer(ctx, state);
  for (const ghost of state.ghosts) drawGhost(ctx, ghost, state);
  if (state.readyMs > 0 && state.status === 'playing') {
    ctx.fillStyle = PLAYER_COLOR;
    ctx.font = `bold 14px ui-monospace, Menlo, Consolas, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('READY!', WIDTH / 2, 11.5 * CELL);
  }
}

/** Sizes a canvas for crisp pixels on high-DPI screens. */
function setupCanvas(canvas: HTMLCanvasElement, width: number, height: number) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

export default function PelletChase({ onGameOver }: GameProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<PelletChaseState | null>(null);
  const [hud, setHud] = useState<Hud>(READY_HUD);

  const render = useCallback(() => {
    const state = stateRef.current;
    const canvas = boardRef.current;
    if (!state || !canvas) return;
    drawGame(canvas.getContext('2d')!, state);
    setHud(prev =>
      prev.score === state.score &&
      prev.level === state.level &&
      prev.lives === state.lives &&
      prev.status === state.status
        ? prev
        : {
            score: state.score,
            level: state.level,
            lives: state.lives,
            status: state.status,
          }
    );
  }, []);

  const apply = useCallback(
    (action: Action) => {
      const current = stateRef.current;
      if (!current) return;
      const next = action(current);
      if (next === current) return;
      stateRef.current = next;
      render();
      if (current.status !== 'over' && next.status === 'over') {
        onGameOver({
          score: next.score,
          level: next.level,
          durationSeconds: Math.round(next.playMs / 1000),
          stats: { pellets: next.pelletsEaten, ghostsEaten: next.ghostsEaten },
        });
      }
    },
    [onGameOver, render]
  );

  const start = () => {
    stateRef.current = createGame();
    render();
    rootRef.current?.focus();
  };

  useEffect(() => {
    const canvas = boardRef.current;
    if (!canvas) return;
    // Attract screen: the full maze with everyone in their start positions.
    drawGame(setupCanvas(canvas, WIDTH, HEIGHT), {
      ...createGame(),
      readyMs: 0,
    });
  }, []);

  // Game loop: runs only while playing so a paused or finished game costs nothing.
  useEffect(() => {
    if (hud.status !== 'playing') return;
    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      apply(state => tick(state, now - last));
      last = now;
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [hud.status, apply]);

  // Browsers throttle hidden tabs and frames; pause instead of letting the ghosts run.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && stateRef.current?.status === 'playing')
        apply(togglePause);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [apply]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const action =
      KEY_ACTIONS[event.key] ?? KEY_ACTIONS[event.key.toLowerCase()];
    if (!action) return;
    // Keep arrows from scrolling the host page.
    event.preventDefault();
    apply(action);
  };

  // Buttons steal focus; hand it back so the keyboard keeps working.
  const press = (action: Action) => {
    apply(action);
    rootRef.current?.focus();
  };

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="arcade-focus flex flex-col items-center gap-4 outline-none sm:flex-row sm:items-start sm:justify-center"
      aria-label="Pellet Chase game board. Arrow keys or WASD steer, P pauses."
    >
      <div className="relative">
        <canvas
          ref={boardRef}
          className="arcade-screen block"
          style={{
            width: WIDTH,
            maxWidth: '100%',
            aspectRatio: `${COLS} / ${ROWS}`,
          }}
        />
        {hud.status === 'ready' && (
          <div className="arcade-overlay">
            <p className="arcade-title text-lg">Pellet Chase</p>
            <button type="button" className="arcade-button" onClick={start}>
              Press start
            </button>
          </div>
        )}
        {hud.status === 'paused' && (
          <div className="arcade-overlay">
            <p className="arcade-title text-lg">Paused</p>
            <button
              type="button"
              className="arcade-button"
              onClick={() => press(togglePause)}
            >
              Resume
            </button>
          </div>
        )}
        {hud.status === 'over' && (
          <div className="arcade-overlay">
            <p className="arcade-title text-lg">Game over</p>
          </div>
        )}
      </div>

      <aside className="flex w-full max-w-60 flex-row flex-wrap justify-between gap-3 sm:w-36 sm:flex-col">
        <div className="arcade-stat">
          <span>Score</span>
          <strong>{hud.score.toLocaleString()}</strong>
        </div>
        <div className="arcade-stat">
          <span>Level</span>
          <strong>{hud.level}</strong>
        </div>
        <div className="arcade-stat">
          <span>Lives</span>
          <strong style={{ color: PLAYER_COLOR }} aria-label={`${hud.lives}`}>
            {'●'.repeat(hud.lives) || '-'}
          </strong>
        </div>
        <p className="arcade-hint hidden sm:block">
          ← ↑ → ↓ / WASD steer · P pause
        </p>
      </aside>

      <div
        className="grid w-full max-w-48 grid-cols-3 gap-2 sm:hidden"
        aria-label="Touch controls"
      >
        {TOUCH_PAD.map(pad => (
          <button
            key={pad.name}
            type="button"
            className={`arcade-pad ${pad.className}`}
            onClick={() => press(pad.action)}
            aria-label={pad.name}
          >
            {pad.label}
          </button>
        ))}
        <button
          type="button"
          className="arcade-pad col-span-3"
          onClick={() => press(togglePause)}
          aria-label="Pause"
        >
          ❚❚
        </button>
      </div>
    </div>
  );
}
