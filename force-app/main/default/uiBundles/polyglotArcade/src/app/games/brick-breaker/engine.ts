/**
 * Brick Breaker engine — framework-free rules and physics.
 *
 * Every operation is a pure function `state -> state` on a fixed logical
 * field, so the Angular view only renders and feeds in time and input. The ball
 * moves in small sub-steps, which keeps it from tunnelling through bricks or the
 * paddle at high speed. Randomness (the launch angle) is injected for tests.
 */

export const FIELD = { width: 480, height: 360 } as const;
export const PADDLE = { width: 72, height: 10, y: 334, speed: 0.5 } as const;
export const BALL_RADIUS = 5;
export const START_LIVES = 3;

const BRICK_COLS = 10;
const BRICK_MARGIN = 16;
const BRICK_GAP = 4;
export const BRICK_HEIGHT = 14;
const BRICK_TOP = 44;
export const BRICK_WIDTH =
  (FIELD.width - 2 * BRICK_MARGIN - (BRICK_COLS - 1) * BRICK_GAP) / BRICK_COLS;

/** Points per row from the top; rows further up are worth more. */
const ROW_POINTS = [60, 50, 40, 30, 20, 10];
export const ROW_COLORS = ['#f43f5e', '#fb923c', '#facc15', '#a3e635', '#22d3ee', '#a78bfa'];
const LEVEL_BONUS = 250;
/** Largest bounce angle off the paddle edge, measured from vertical. */
const MAX_BOUNCE = (60 * Math.PI) / 180;
/** Ball travel per physics sub-step, in field units. */
const SUB_STEP = 3;

export type Status = 'playing' | 'paused' | 'over';
export type Rng = () => number;

export interface Brick {
  x: number;
  y: number;
  row: number;
  /** Hits left; tough bricks start at 2. */
  hits: number;
}

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Resting on the paddle, waiting for a launch. */
  stuck: boolean;
}

export interface BrickBreakerState {
  paddleX: number;
  ball: Ball;
  bricks: Brick[];
  score: number;
  lives: number;
  level: number;
  status: Status;
  rng: Rng;
}

/** -1 left, 1 right; `targetX` (pointer) wins over keys when set. */
export interface PaddleInput {
  direction: -1 | 0 | 1;
  targetX: number | null;
}

/** Ball speed in field units per millisecond; 8 % faster each level. */
export function ballSpeed(level: number): number {
  return Math.min(0.55, 0.24 * Math.pow(1.08, level - 1));
}

/**
 * Brick layout of a level. Rows grow from 4 to 6, the top rows turn into
 * two-hit bricks, and from level 4 on every other brick of the bottom row is
 * missing so the ball can sneak behind the wall.
 */
export function layout(level: number): Brick[] {
  const rows = Math.min(6, 3 + level);
  const toughRows = Math.min(rows - 1, level - 1);
  const bricks: Brick[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < BRICK_COLS; col++) {
      if (level >= 4 && row === rows - 1 && col % 2 === 1) continue;
      bricks.push({
        x: BRICK_MARGIN + col * (BRICK_WIDTH + BRICK_GAP),
        y: BRICK_TOP + row * (BRICK_HEIGHT + BRICK_GAP),
        row,
        hits: row < toughRows ? 2 : 1,
      });
    }
  }
  return bricks;
}

function restingBall(paddleX: number): Ball {
  return {
    x: paddleX + PADDLE.width / 2,
    y: PADDLE.y - BALL_RADIUS - 1,
    vx: 0,
    vy: 0,
    stuck: true,
  };
}

export function createGame(rng: Rng = Math.random): BrickBreakerState {
  const paddleX = (FIELD.width - PADDLE.width) / 2;
  return {
    paddleX,
    ball: restingBall(paddleX),
    bricks: layout(1),
    score: 0,
    lives: START_LIVES,
    level: 1,
    status: 'playing',
    rng,
  };
}

/** Releases a resting ball upwards at a random angle of up to ±30°. */
export function launch(state: BrickBreakerState): BrickBreakerState {
  if (state.status !== 'playing' || !state.ball.stuck) return state;
  const angle = (state.rng() - 0.5) * (Math.PI / 3);
  const speed = ballSpeed(state.level);
  return {
    ...state,
    ball: {
      ...state.ball,
      vx: speed * Math.sin(angle),
      vy: -speed * Math.cos(angle),
      stuck: false,
    },
  };
}

export function togglePause(state: BrickBreakerState): BrickBreakerState {
  if (state.status === 'over') return state;
  return { ...state, status: state.status === 'playing' ? 'paused' : 'playing' };
}

function clampPaddle(x: number): number {
  return Math.max(0, Math.min(FIELD.width - PADDLE.width, x));
}

function movePaddle(paddleX: number, input: PaddleInput, dtMs: number): number {
  if (input.targetX !== null) return clampPaddle(input.targetX - PADDLE.width / 2);
  return clampPaddle(paddleX + input.direction * PADDLE.speed * dtMs);
}

/** Bounces the ball off the paddle; the hit position sets the new angle. */
function bounceOffPaddle(ball: Ball, paddleX: number): boolean {
  const withinX = ball.x >= paddleX - BALL_RADIUS && ball.x <= paddleX + PADDLE.width + BALL_RADIUS;
  const touching =
    ball.vy > 0 &&
    ball.y + BALL_RADIUS >= PADDLE.y &&
    ball.y - BALL_RADIUS <= PADDLE.y + PADDLE.height;
  if (!withinX || !touching) return false;
  const offset = (ball.x - (paddleX + PADDLE.width / 2)) / (PADDLE.width / 2);
  const angle = Math.max(-1, Math.min(1, offset)) * MAX_BOUNCE;
  const speed = Math.hypot(ball.vx, ball.vy);
  ball.vx = speed * Math.sin(angle);
  ball.vy = -speed * Math.cos(angle);
  ball.y = PADDLE.y - BALL_RADIUS;
  return true;
}

/** Index of the first brick the ball overlaps, after bouncing off it. */
function bounceOffBricks(ball: Ball, bricks: Brick[]): number {
  for (let i = 0; i < bricks.length; i++) {
    const brick = bricks[i];
    const nearestX = Math.max(brick.x, Math.min(ball.x, brick.x + BRICK_WIDTH));
    const nearestY = Math.max(brick.y, Math.min(ball.y, brick.y + BRICK_HEIGHT));
    const dx = ball.x - nearestX;
    const dy = ball.y - nearestY;
    if (dx * dx + dy * dy > BALL_RADIUS * BALL_RADIUS) continue;

    // Reflect on the axis with the smaller overlap: that is the side we hit.
    const overlapX = BALL_RADIUS + BRICK_WIDTH / 2 - Math.abs(ball.x - (brick.x + BRICK_WIDTH / 2));
    const overlapY =
      BALL_RADIUS + BRICK_HEIGHT / 2 - Math.abs(ball.y - (brick.y + BRICK_HEIGHT / 2));
    if (overlapX < overlapY) {
      ball.vx = -ball.vx;
      ball.x += Math.sign(ball.x - (brick.x + BRICK_WIDTH / 2)) * overlapX;
    } else {
      ball.vy = -ball.vy;
      ball.y += Math.sign(ball.y - (brick.y + BRICK_HEIGHT / 2)) * overlapY;
    }
    return i;
  }
  return -1;
}

/** Advances the game by `dtMs` of wall-clock time. */
export function step(
  state: BrickBreakerState,
  dtMs: number,
  input: PaddleInput,
): BrickBreakerState {
  if (state.status !== 'playing') return state;
  const paddleX = movePaddle(state.paddleX, input, dtMs);
  if (state.ball.stuck) return { ...state, paddleX, ball: restingBall(paddleX) };

  const ball = { ...state.ball };
  let bricks = state.bricks;
  let score = state.score;
  const subSteps = Math.max(1, Math.ceil((Math.hypot(ball.vx, ball.vy) * dtMs) / SUB_STEP));
  const dt = dtMs / subSteps;

  for (let s = 0; s < subSteps; s++) {
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    if (ball.x - BALL_RADIUS < 0 || ball.x + BALL_RADIUS > FIELD.width) {
      ball.vx = -ball.vx;
      ball.x = Math.max(BALL_RADIUS, Math.min(FIELD.width - BALL_RADIUS, ball.x));
    }
    if (ball.y - BALL_RADIUS < 0) {
      ball.vy = Math.abs(ball.vy);
      ball.y = BALL_RADIUS;
    }
    bounceOffPaddle(ball, paddleX);

    const hit = bounceOffBricks(ball, bricks);
    if (hit >= 0) {
      const brick = bricks[hit];
      bricks = bricks.slice();
      if (brick.hits > 1) {
        bricks[hit] = { ...brick, hits: brick.hits - 1 };
      } else {
        bricks.splice(hit, 1);
        score += ROW_POINTS[brick.row] * state.level;
      }
    }

    if (bricks.length === 0) {
      // Level cleared: bonus, a fresh wall and a faster ball on the paddle.
      const level = state.level + 1;
      return {
        ...state,
        paddleX,
        ball: restingBall(paddleX),
        bricks: layout(level),
        score: score + LEVEL_BONUS * state.level,
        level,
      };
    }

    if (ball.y - BALL_RADIUS > FIELD.height) {
      const lives = state.lives - 1;
      return {
        ...state,
        paddleX,
        ball: restingBall(paddleX),
        bricks,
        score,
        lives,
        status: lives === 0 ? 'over' : 'playing',
      };
    }
  }

  return { ...state, paddleX, ball, bricks, score };
}
