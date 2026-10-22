import {
  BALL_RADIUS,
  BRICK_HEIGHT,
  BRICK_WIDTH,
  FIELD,
  PADDLE,
  START_LIVES,
  type BrickBreakerState,
  type PaddleInput,
  ballSpeed,
  createGame,
  launch,
  layout,
  step,
  togglePause,
} from './engine';

const STILL: PaddleInput = { direction: 0, targetX: null };
const straightUp = () => 0.5;

/** A launched ball at an explicit position and velocity. */
function withBall(
  state: BrickBreakerState,
  ball: Partial<BrickBreakerState['ball']>,
): BrickBreakerState {
  return { ...state, ball: { ...state.ball, vx: 0, vy: 0, stuck: false, ...ball } };
}

describe('Brick Breaker engine', () => {
  it('starts with the ball resting on a centred paddle', () => {
    const game = createGame(straightUp);
    expect(game.lives).toBe(START_LIVES);
    expect(game.level).toBe(1);
    expect(game.ball.stuck).toBe(true);
    expect(game.paddleX + PADDLE.width / 2).toBe(FIELD.width / 2);
    expect(game.ball.x).toBe(FIELD.width / 2);
  });

  it('builds tougher and denser walls on later levels', () => {
    expect(layout(1).length).toBe(40);
    expect(layout(1).every((b) => b.hits === 1)).toBe(true);
    expect(layout(2).filter((b) => b.hits === 2).length).toBe(10);
    expect(layout(3).length).toBe(60);
    expect(layout(4).length).toBeLessThan(60);
  });

  it('carries the resting ball along with the paddle', () => {
    const moved = step(createGame(straightUp), 100, { direction: 1, targetX: null });
    expect(moved.paddleX).toBeGreaterThan(createGame().paddleX);
    expect(moved.ball.x).toBe(moved.paddleX + PADDLE.width / 2);
  });

  it('follows the pointer and keeps the paddle inside the field', () => {
    const game = createGame(straightUp);
    expect(step(game, 16, { direction: 0, targetX: 100 }).paddleX).toBe(100 - PADDLE.width / 2);
    expect(step(game, 16, { direction: 0, targetX: 9999 }).paddleX).toBe(
      FIELD.width - PADDLE.width,
    );
    expect(step(game, 5000, { direction: -1, targetX: null }).paddleX).toBe(0);
  });

  it('launches the ball straight up at the level speed', () => {
    const launched = launch(createGame(straightUp));
    expect(launched.ball.stuck).toBe(false);
    expect(launched.ball.vx).toBeCloseTo(0);
    expect(launched.ball.vy).toBeCloseTo(-ballSpeed(1));
    expect(launch(launched)).toBe(launched);
  });

  it('bounces off the side and top walls', () => {
    // One brick far from the action; an empty wall would count as a cleared level.
    const game = { ...createGame(), bricks: layout(1).slice(0, 1) };
    const side = step(withBall(game, { x: FIELD.width - 6, y: 200, vx: 0.3 }), 20, STILL);
    expect(side.ball.vx).toBeLessThan(0);
    const top = step(withBall(game, { x: 100, y: 6, vy: -0.3 }), 20, STILL);
    expect(top.ball.vy).toBeGreaterThan(0);
  });

  it('angles the bounce by where the ball hits the paddle', () => {
    const game = createGame();
    const above = PADDLE.y - BALL_RADIUS - 1;
    const centre = step(
      withBall(game, { x: game.paddleX + PADDLE.width / 2, y: above, vy: 0.3 }),
      10,
      STILL,
    );
    expect(centre.ball.vy).toBeLessThan(0);
    expect(Math.abs(centre.ball.vx)).toBeLessThan(0.01);
    const edge = step(
      withBall(game, { x: game.paddleX + PADDLE.width - 2, y: above, vy: 0.3 }),
      10,
      STILL,
    );
    expect(edge.ball.vx).toBeGreaterThan(0.15);
    expect(edge.ball.vy).toBeLessThan(0);
  });

  it('breaks a brick, scores its row and bounces back', () => {
    const game = createGame();
    const target = game.bricks[game.bricks.length - 1];
    const below = target.y + BRICK_HEIGHT + BALL_RADIUS + 1;
    const hit = step(
      withBall(game, { x: target.x + BRICK_WIDTH / 2, y: below, vy: -0.3 }),
      20,
      STILL,
    );
    expect(hit.bricks.length).toBe(game.bricks.length - 1);
    expect(hit.score).toBe(30);
    expect(hit.ball.vy).toBeGreaterThan(0);
  });

  it('needs two hits for tough bricks', () => {
    const game = { ...createGame(), level: 2, bricks: layout(2).slice(0, 1) };
    const brick = game.bricks[0];
    expect(brick.hits).toBe(2);
    const once = step(
      withBall(game, {
        x: brick.x + BRICK_WIDTH / 2,
        y: brick.y + BRICK_HEIGHT + BALL_RADIUS + 1,
        vy: -0.3,
      }),
      20,
      STILL,
    );
    expect(once.bricks).toHaveLength(1);
    expect(once.bricks[0].hits).toBe(1);
    expect(once.score).toBe(0);
  });

  it('starts the next level with a bonus once the wall is cleared', () => {
    const game = { ...createGame(), bricks: layout(1).slice(-1) };
    const brick = game.bricks[0];
    const cleared = step(
      withBall(game, {
        x: brick.x + BRICK_WIDTH / 2,
        y: brick.y + BRICK_HEIGHT + BALL_RADIUS + 1,
        vy: -0.3,
      }),
      20,
      STILL,
    );
    expect(cleared.level).toBe(2);
    expect(cleared.bricks).toEqual(layout(2));
    expect(cleared.ball.stuck).toBe(true);
    // The last brick of level 1 sits in the fourth row (30 points).
    expect(cleared.score).toBe(30 + 250);
    expect(ballSpeed(2)).toBeGreaterThan(ballSpeed(1));
  });

  it('loses a life when the ball drops and ends the game on the last one', () => {
    const game = createGame();
    const falling = withBall(game, { x: 10, y: FIELD.height + BALL_RADIUS - 1, vy: 0.3 });
    const missed = step(falling, 20, STILL);
    expect(missed.lives).toBe(START_LIVES - 1);
    expect(missed.ball.stuck).toBe(true);
    expect(missed.status).toBe('playing');
    expect(step({ ...falling, lives: 1 }, 20, STILL).status).toBe('over');
  });

  it('does not tunnel through bricks at high speed', () => {
    const game = { ...createGame(), bricks: layout(1).slice(-1) };
    const brick = game.bricks[0];
    // 0.6 units/ms for 100 ms would jump 60 units past a 14-unit brick in one go.
    const fast = withBall(game, { x: brick.x + BRICK_WIDTH / 2, y: brick.y + 50, vy: -0.6 });
    expect(step(fast, 100, STILL).level).toBe(2);
  });

  it('ignores time and launches while paused', () => {
    const paused = togglePause(launch(createGame(straightUp)));
    expect(step(paused, 1000, STILL)).toBe(paused);
    expect(togglePause(paused).status).toBe('playing');
  });
});
