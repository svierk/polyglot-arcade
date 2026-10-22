/**
 * Brick Breaker view: canvas rendering, game loop and input. Rules and physics
 * live in ./engine; this component only feeds it time, keys and the pointer.
 *
 * The hub is zoneless, so the requestAnimationFrame loop triggers no change
 * detection by itself; only the HUD signals below re-render the template.
 */
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { GameResult } from '../types';
import {
  BALL_RADIUS,
  BRICK_HEIGHT,
  BRICK_WIDTH,
  FIELD,
  PADDLE,
  ROW_COLORS,
  type BrickBreakerState,
  type PaddleInput,
  createGame,
  launch,
  step,
  togglePause,
} from './engine';

type Phase = 'ready' | BrickBreakerState['status'];

/** Longest frame fed to the physics; a stalled tab must not teleport the ball. */
const MAX_FRAME_MS = 50;

const LEFT_KEYS = new Set(['ArrowLeft', 'a', 'A']);
const RIGHT_KEYS = new Set(['ArrowRight', 'd', 'D']);

@Component({
  selector: 'app-brick-breaker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './brick-breaker.html',
  styleUrl: './brick-breaker.css',
  host: {
    '(keydown)': 'onKeydown($event)',
    '(keyup)': 'onKeyup($event)',
    '(document:visibilitychange)': 'onVisibilityChange()',
    tabindex: '0',
    class: 'arcade-focus',
    'aria-label':
      'Brick Breaker. Arrow keys or the pointer move the paddle, space launches the ball.',
  },
})
export class BrickBreakerComponent implements OnDestroy {
  readonly gameOver = output<GameResult>();

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly hostElement = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly field = FIELD;
  protected readonly phase = signal<Phase>('ready');
  protected readonly score = signal(0);
  protected readonly lives = signal(this.startLives());
  protected readonly level = signal(1);

  private state: BrickBreakerState = createGame();
  private readonly input: PaddleInput = { direction: 0, targetX: null };
  private readonly keysDown = new Set<string>();
  private frame = 0;
  private lastTime = 0;
  private startedAt = 0;
  private ctx?: CanvasRenderingContext2D;

  constructor() {
    afterNextRender(() => {
      this.ctx = this.setupCanvas(this.canvas().nativeElement);
      this.draw();
    });
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.frame);
  }

  protected start(): void {
    this.state = createGame();
    this.startedAt = performance.now();
    this.sync();
    this.focusBoard();
    this.loop();
  }

  protected resume(): void {
    this.apply(togglePause);
    this.focusBoard();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (this.phase() === 'ready' || this.phase() === 'over') return;
    if (LEFT_KEYS.has(event.key) || RIGHT_KEYS.has(event.key)) {
      this.keysDown.add(event.key);
      this.input.targetX = null; // keys take over from the pointer
    } else if (event.key === ' ' || event.key === 'ArrowUp') {
      this.apply(launch);
    } else if (event.key === 'p' || event.key === 'P' || event.key === 'Escape') {
      this.apply(togglePause);
    } else {
      return;
    }
    // Keep arrows and space from scrolling the page.
    event.preventDefault();
    this.updateDirection();
  }

  protected onKeyup(event: KeyboardEvent): void {
    this.keysDown.delete(event.key);
    this.updateDirection();
  }

  protected onPointerMove(event: PointerEvent): void {
    const rect = this.canvas().nativeElement.getBoundingClientRect();
    this.input.targetX = ((event.clientX - rect.left) / rect.width) * FIELD.width;
  }

  protected onPointerDown(event: PointerEvent): void {
    this.onPointerMove(event);
    this.apply(launch);
  }

  /** Browsers throttle hidden tabs and frames; pause instead of losing a life. */
  protected onVisibilityChange(): void {
    if (document.hidden && this.state.status === 'playing' && this.phase() !== 'ready') {
      this.apply(togglePause);
    }
  }

  private updateDirection(): void {
    const left = [...this.keysDown].some((k) => LEFT_KEYS.has(k));
    const right = [...this.keysDown].some((k) => RIGHT_KEYS.has(k));
    this.input.direction = left === right ? 0 : left ? -1 : 1;
  }

  private apply(action: (state: BrickBreakerState) => BrickBreakerState): void {
    if (this.phase() === 'ready') return;
    const next = action(this.state);
    if (next === this.state) return;
    const resumed = this.state.status === 'paused' && next.status === 'playing';
    this.state = next;
    this.sync();
    this.draw();
    if (resumed) this.loop();
  }

  private loop(): void {
    cancelAnimationFrame(this.frame);
    this.lastTime = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(MAX_FRAME_MS, now - this.lastTime);
      this.lastTime = now;
      this.state = step(this.state, dt, this.input);
      this.sync();
      this.draw();
      if (this.state.status === 'playing') {
        this.frame = requestAnimationFrame(tick);
      } else if (this.state.status === 'over') {
        this.finish();
      }
    };
    this.frame = requestAnimationFrame(tick);
  }

  private finish(): void {
    const { score, level } = this.state;
    this.gameOver.emit({
      score,
      level,
      durationSeconds: Math.round((performance.now() - this.startedAt) / 1000),
      summary:
        level > 1
          ? `You cleared ${level - 1} ${level === 2 ? 'wall' : 'walls'} and reached level ${level}.`
          : 'The wall survived this time. Try again!',
    });
  }

  /** Copies HUD values into signals; signals skip updates that do not change. */
  private sync(): void {
    this.phase.set(this.state.status);
    this.score.set(this.state.score);
    this.lives.set(this.state.lives);
    this.level.set(this.state.level);
  }

  private focusBoard(): void {
    this.hostElement.nativeElement.focus();
  }

  private startLives(): number {
    return createGame().lives;
  }

  /** Sizes the canvas for crisp pixels on high-DPI screens. */
  private setupCanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = FIELD.width * dpr;
    canvas.height = FIELD.height * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }

  private draw(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const { bricks, paddleX, ball } = this.state;

    ctx.fillStyle = '#0b0b1a';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);

    for (const brick of bricks) {
      ctx.fillStyle = ROW_COLORS[brick.row];
      ctx.fillRect(brick.x, brick.y, BRICK_WIDTH, BRICK_HEIGHT);
      // Bevel for the 8-bit look; tough bricks get a bright inner frame.
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(brick.x, brick.y, BRICK_WIDTH, 3);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(brick.x, brick.y + BRICK_HEIGHT - 3, BRICK_WIDTH, 3);
      if (brick.hits > 1) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(brick.x + 2, brick.y + 2, BRICK_WIDTH - 4, BRICK_HEIGHT - 4);
      }
    }

    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(paddleX, PADDLE.y, PADDLE.width, PADDLE.height);
    ctx.fillStyle = '#a3e635';
    ctx.fillRect(paddleX, PADDLE.y, PADDLE.width, 3);

    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }
}
