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
import './machine.css';

const CELL = 20;
/** Monochrome LCD: segments are lit, half lit (the ghost piece) or off. */
const LCD = '#c2c7a1';
const INK = '#1f2417';
const GHOST_INK = 'rgba(31, 36, 23, 0.32)';
const UNLIT_INK = 'rgba(31, 36, 23, 0.07)';

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

/** Buttons of the handheld, so the game plays without a keyboard. */
const DPAD: Array<{
  label: string;
  name: string;
  action: Action;
  className: string;
}> = [
  { label: '▲', name: 'Hard drop', action: hardDrop, className: 'bd-up' },
  {
    label: '◀',
    name: 'Move left',
    action: s => move(s, -1),
    className: 'bd-left',
  },
  {
    label: '▶',
    name: 'Move right',
    action: s => move(s, 1),
    className: 'bd-right',
  },
  { label: '▼', name: 'Soft drop', action: softDrop, className: 'bd-down' },
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

/** One LCD segment: a square frame around a filled square. */
function drawCell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ink: string,
  size = CELL
) {
  const px = x * size;
  const py = y * size;
  const g = size / 10;
  ctx.strokeStyle = ink;
  ctx.lineWidth = g;
  ctx.strokeRect(px + g, py + g, size - 2 * g, size - 2 * g);
  ctx.fillStyle = ink;
  ctx.fillRect(px + 3 * g, py + 3 * g, size - 6 * g, size - 6 * g);
}

function drawBoard(ctx: CanvasRenderingContext2D, state: BlockDropState) {
  ctx.fillStyle = LCD;
  ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL);

  state.board.forEach((row, y) =>
    row.forEach((cell, x) => drawCell(ctx, x, y, cell ? INK : UNLIT_INK))
  );

  if (state.status !== 'over') {
    for (const [x, y] of cellsOf(ghostOf(state))) {
      if (y >= 0) drawCell(ctx, x, y, GHOST_INK);
    }
    for (const [x, y] of cellsOf(state.active)) {
      if (y >= 0) drawCell(ctx, x, y, INK);
    }
  }
}

function drawPreview(ctx: CanvasRenderingContext2D, type: PieceType | null) {
  const size = 14;
  ctx.fillStyle = LCD;
  ctx.fillRect(0, 0, 4 * size, 4 * size);
  for (let y = 0; y < 4; y++)
    for (let x = 0; x < 4; x++) drawCell(ctx, x, y, UNLIT_INK, size);
  if (!type) return;
  const shape = previewShape(type).filter(row => row.some(Boolean));
  const offsetX = Math.floor((4 - shape[0].length) / 2);
  const offsetY = Math.floor((4 - shape.length) / 2);
  shape.forEach((row, y) =>
    row.forEach((filled, x) => {
      if (filled) drawCell(ctx, x + offsetX, y + offsetY, INK, size);
    })
  );
}

/** LCD digits: the value over the faint segments of every digit. */
function Segments({
  label,
  value,
  digits,
  hud,
}: {
  label: string;
  value: number;
  digits: number;
  hud?: string;
}) {
  return (
    <p className="bd-seg">
      <span className="bd-seg-label">{label}</span>
      <strong data-hud={hud}>
        <span className="bd-seg-off" aria-hidden="true">
          {'8'.repeat(digits)}
        </span>
        <span className="bd-seg-on">{value}</span>
      </strong>
    </p>
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

export default function BlockDrop({
  onGameOver,
  result,
  highScore,
}: GameProps) {
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
    if (previewRef.current) setupCanvas(previewRef.current, 56, 56);
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

  // One button starts a round and pauses it, as on a handheld.
  const startOrPause = () =>
    hud.status === 'ready' ? start() : press(togglePause);

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="bd-handheld arcade-focus"
      aria-label="Block Drop game board. Arrow keys move and rotate, space drops."
    >
      <div className="bd-bezel">
        <p className="bd-bezel-label" aria-hidden="true">
          <span className="bd-led" /> 10 × 20 LCD
        </p>
        <div className="bd-lcd">
          <div className="bd-well">
            <canvas
              ref={boardRef}
              className="bd-canvas"
              style={{ aspectRatio: `${COLS} / ${ROWS}` }}
            />
            {hud.status === 'ready' && (
              <div className="bd-overlay">
                <p className="bd-overlay-title">Block Drop</p>
                <button type="button" className="bd-lcd-button" onClick={start}>
                  Press start
                </button>
              </div>
            )}
            {hud.status === 'paused' && (
              <div className="bd-overlay">
                <p className="bd-overlay-title">Paused</p>
                <button
                  type="button"
                  className="bd-lcd-button"
                  onClick={() => press(togglePause)}
                >
                  Resume
                </button>
              </div>
            )}
            {hud.status === 'over' && (
              <div className="bd-overlay">
                <p className="bd-overlay-title">Game over</p>
                {result}
              </div>
            )}
          </div>
          <div className="bd-panel">
            <Segments label="Score" value={hud.score} digits={6} hud="score" />
            {highScore !== undefined && (
              <Segments
                label="Hi-score"
                value={Math.max(highScore, hud.score)}
                digits={6}
              />
            )}
            <div className="bd-next">
              <span className="bd-seg-label">Next</span>
              <canvas ref={previewRef} style={{ width: 56, height: 56 }} />
            </div>
            <Segments label="Level" value={hud.level} digits={2} />
            <Segments label="Lines" value={hud.lines} digits={3} />
            <p className="bd-flags" aria-hidden="true">
              <span className={hud.status === 'paused' ? 'bd-on' : ''}>
                Pause
              </span>
              <span className={hud.status === 'over' ? 'bd-on' : ''}>
                Game over
              </span>
            </p>
          </div>
        </div>
      </div>

      <p className="bd-brand" aria-hidden="true">
        Block Drop
      </p>

      <div className="bd-controls" role="group" aria-label="Controls">
        <div className="bd-dpad">
          {DPAD.map(key => (
            <button
              key={key.name}
              type="button"
              className={`bd-dpad-key ${key.className}`}
              onClick={() => press(key.action)}
              aria-label={key.name}
            >
              {key.label}
            </button>
          ))}
        </div>
        <span className="bd-key bd-rotate">
          <button
            type="button"
            onClick={() => press(s => rotate(s, 1))}
            aria-label="Rotate"
          />
          <span aria-hidden="true">Rotate</span>
        </span>
      </div>

      <div className="bd-small-keys">
        <span className="bd-key">
          <button
            type="button"
            onClick={startOrPause}
            disabled={hud.status === 'over'}
            aria-label="Start or pause"
          />
          <span aria-hidden="true">Start / Pause</span>
        </span>
      </div>

      <p className="bd-help">
        ← → move · ↑ rotate · ↓ soft drop · space hard drop · P pause
      </p>
    </div>
  );
}
