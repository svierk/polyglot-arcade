/**
 * Block Drop view: canvas rendering, game loop and input. All rules live in
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
  type BlockDropState,
  type PieceType,
  cellsOf,
  createGame,
  ghostOf,
  hardDrop,
  move,
  previewShape,
  rotate,
  softDrop,
  tick,
  togglePause,
} from './engine';
import type { GameProps } from '@/games/types';

const CELL = 24;
const COLORS: Record<PieceType, string> = {
  I: '#22d3ee',
  O: '#facc15',
  T: '#c084fc',
  S: '#4ade80',
  Z: '#f87171',
  J: '#60a5fa',
  L: '#fb923c',
};

type Action = (state: BlockDropState) => BlockDropState;

const KEY_ACTIONS: Record<string, Action> = {
  ArrowLeft: s => move(s, -1),
  a: s => move(s, -1),
  ArrowRight: s => move(s, 1),
  d: s => move(s, 1),
  ArrowUp: s => rotate(s, 1),
  w: s => rotate(s, 1),
  x: s => rotate(s, 1),
  z: s => rotate(s, -1),
  q: s => rotate(s, -1),
  ArrowDown: softDrop,
  s: softDrop,
  ' ': hardDrop,
  p: togglePause,
  Escape: togglePause,
};

const TOUCH_PAD: Array<{ label: string; name: string; action: Action }> = [
  { label: '←', name: 'Move left', action: s => move(s, -1) },
  { label: '⟳', name: 'Rotate', action: s => rotate(s, 1) },
  { label: '→', name: 'Move right', action: s => move(s, 1) },
  { label: '↓', name: 'Soft drop', action: softDrop },
  { label: '⤓', name: 'Hard drop', action: hardDrop },
];

interface Hud {
  score: number;
  lines: number;
  level: number;
  status: BlockDropState['status'] | 'ready';
  next: PieceType | null;
}

const READY_HUD: Hud = {
  score: 0,
  lines: 0,
  level: 1,
  status: 'ready',
  next: null,
};

function drawBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  size = CELL
) {
  const px = x * size;
  const py = y * size;
  ctx.fillStyle = color;
  ctx.fillRect(px + 1, py + 1, size - 2, size - 2);
  // Bevel: light top-left, dark bottom-right for the 8-bit look.
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(px + 1, py + 1, size - 2, 3);
  ctx.fillRect(px + 1, py + 1, 3, size - 2);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(px + 1, py + size - 4, size - 2, 3);
  ctx.fillRect(px + size - 4, py + 1, 3, size - 2);
}

function drawBoard(ctx: CanvasRenderingContext2D, state: BlockDropState) {
  ctx.fillStyle = '#0b0b1a';
  ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL);

  ctx.strokeStyle = 'rgba(148,163,184,0.08)';
  ctx.lineWidth = 1;
  for (let x = 1; x < COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(x * CELL + 0.5, 0);
    ctx.lineTo(x * CELL + 0.5, ROWS * CELL);
    ctx.stroke();
  }
  for (let y = 1; y < ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * CELL + 0.5);
    ctx.lineTo(COLS * CELL, y * CELL + 0.5);
    ctx.stroke();
  }

  state.board.forEach((row, y) =>
    row.forEach((cell, x) => {
      if (cell) drawBlock(ctx, x, y, COLORS[cell]);
    })
  );

  if (state.status !== 'over') {
    ctx.strokeStyle = COLORS[state.active.type];
    ctx.globalAlpha = 0.45;
    for (const [x, y] of cellsOf(ghostOf(state))) {
      if (y >= 0)
        ctx.strokeRect(x * CELL + 2.5, y * CELL + 2.5, CELL - 5, CELL - 5);
    }
    ctx.globalAlpha = 1;
    for (const [x, y] of cellsOf(state.active)) {
      if (y >= 0) drawBlock(ctx, x, y, COLORS[state.active.type]);
    }
  }
}

function drawPreview(ctx: CanvasRenderingContext2D, type: PieceType | null) {
  const size = 16;
  ctx.clearRect(0, 0, 4 * size, 4 * size);
  if (!type) return;
  const shape = previewShape(type).filter(row => row.some(Boolean));
  const offsetX = (4 - shape[0].length) / 2;
  const offsetY = (4 - shape.length) / 2;
  shape.forEach((row, y) =>
    row.forEach((filled, x) => {
      if (filled) drawBlock(ctx, x + offsetX, y + offsetY, COLORS[type], size);
    })
  );
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

export default function BlockDrop({ onGameOver }: GameProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<BlockDropState | null>(null);
  const startedAtRef = useRef(0);
  const [hud, setHud] = useState<Hud>(READY_HUD);

  const render = useCallback(() => {
    const state = stateRef.current;
    const canvas = boardRef.current;
    if (!state || !canvas) return;
    drawBoard(canvas.getContext('2d')!, state);
    setHud(prev =>
      prev.score === state.score &&
      prev.lines === state.lines &&
      prev.level === state.level &&
      prev.status === state.status &&
      prev.next === state.next
        ? prev
        : {
            score: state.score,
            lines: state.lines,
            level: state.level,
            status: state.status,
            next: state.next,
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
          durationSeconds: Math.round(
            (performance.now() - startedAtRef.current) / 1000
          ),
          stats: { lines: next.lines },
        });
      }
    },
    [onGameOver, render]
  );

  const start = () => {
    stateRef.current = createGame();
    startedAtRef.current = performance.now();
    render();
    rootRef.current?.focus();
  };

  useEffect(() => {
    if (boardRef.current)
      setupCanvas(boardRef.current, COLS * CELL, ROWS * CELL);
    if (previewRef.current) setupCanvas(previewRef.current, 64, 64);
    // Attract screen: an empty well. A finished state hides the active piece.
    const ctx = boardRef.current?.getContext('2d');
    if (ctx) drawBoard(ctx, { ...createGame(), status: 'over' });
  }, []);

  useEffect(() => {
    if (previewRef.current)
      drawPreview(previewRef.current.getContext('2d')!, hud.next);
  }, [hud.next]);

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

  // Browsers throttle hidden tabs and frames; pause instead of letting pieces pile up.
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
    // Keep arrows and space from scrolling the host page.
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
      aria-label="Block Drop game board. Arrow keys move and rotate, space drops."
    >
      <div className="relative">
        <canvas
          ref={boardRef}
          className="arcade-screen block"
          style={{
            width: COLS * CELL,
            maxWidth: '100%',
            aspectRatio: `${COLS} / ${ROWS}`,
          }}
        />
        {hud.status === 'ready' && (
          <div className="arcade-overlay">
            <p className="arcade-title text-lg">Block Drop</p>
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
          <span>Lines</span>
          <strong>{hud.lines}</strong>
        </div>
        <div className="arcade-stat">
          <span>Next</span>
          <canvas ref={previewRef} style={{ width: 64, height: 64 }} />
        </div>
        <p className="arcade-hint hidden sm:block">
          ← → move · ↑ rotate · ↓ soft drop · space hard drop · P pause
        </p>
      </aside>

      <div
        className="grid w-full max-w-60 grid-cols-5 gap-2 sm:hidden"
        aria-label="Touch controls"
      >
        {TOUCH_PAD.map(pad => (
          <button
            key={pad.name}
            type="button"
            className="arcade-pad"
            onClick={() => press(pad.action)}
            aria-label={pad.name}
          >
            {pad.label}
          </button>
        ))}
      </div>
    </div>
  );
}
