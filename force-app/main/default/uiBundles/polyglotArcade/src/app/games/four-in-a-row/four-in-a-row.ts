/**
 * Four in a Row machine: a tabletop toy. Board rendering, turn flow and input;
 * rules and the CPU opponent live in ./engine. The result screen is projected
 * into the game box when a round ends.
 */
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  ViewEncapsulation,
  computed,
  output,
  signal,
} from '@angular/core';
import type { GameResult } from '../types';
import {
  COLS,
  CPU,
  DIFFICULTIES,
  HUMAN,
  ROWS,
  type Board,
  type Difficulty,
  type Outcome,
  type Player,
  cpuMove,
  drop,
  emptyBoard,
  findWin,
  isFull,
  scoreFor,
} from './engine';

type Phase = 'setup' | 'human' | 'cpu' | 'over';

/** Pause before the CPU answers, so its move reads as a reply. */
const CPU_DELAY_MS = 450;

@Component({
  selector: 'app-four-in-a-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './four-in-a-row.html',
  styleUrl: './four-in-a-row.css',
  // The machine styles the projected result screen too; every rule is scoped
  // to app-four-in-a-row or .machine-four-in-a-row.
  encapsulation: ViewEncapsulation.None,
  host: {
    '(keydown)': 'onKeydown($event)',
    tabindex: '0',
    class: 'arcade-focus',
    role: 'group',
    'aria-label': 'Four in a Row. ← → pick a column, Enter drops, keys 1 to 7 drop directly.',
  },
})
export class FourInARowComponent implements OnDestroy {
  readonly gameOver = output<GameResult>();

  protected readonly columns = Array.from({ length: COLS }, (_, i) => i);
  protected readonly rows = Array.from({ length: ROWS }, (_, i) => i);
  protected readonly difficulties: Difficulty[] = ['easy', 'normal', 'hard'];

  protected readonly difficulty = signal<Difficulty>('normal');
  protected readonly board = signal<Board>(emptyBoard());
  protected readonly phase = signal<Phase>('setup');
  protected readonly cursor = signal(3);
  protected readonly lastDrop = signal<string | null>(null);
  protected readonly outcome = signal<Outcome | null>(null);
  /** The CPU's last column, counted from 1, for screen readers. */
  protected readonly cpuColumn = signal<number | null>(null);
  private readonly winningCells = signal<Set<string>>(new Set());

  protected readonly status = computed(() => {
    switch (this.phase()) {
      case 'setup':
        return 'Choose your opponent';
      case 'human':
        return 'Your move';
      case 'cpu':
        return 'CPU is thinking…';
      case 'over':
        return this.outcome() === 'win'
          ? 'You win!'
          : this.outcome() === 'loss'
            ? 'CPU wins'
            : 'Draw';
    }
  });

  private humanMoves = 0;
  private startedAt = 0;
  private cpuTimer?: ReturnType<typeof setTimeout>;

  ngOnDestroy(): void {
    clearTimeout(this.cpuTimer);
  }

  protected start(difficulty: Difficulty): void {
    this.difficulty.set(difficulty);
    this.board.set(emptyBoard());
    this.outcome.set(null);
    this.winningCells.set(new Set());
    this.lastDrop.set(null);
    this.cpuColumn.set(null);
    this.humanMoves = 0;
    this.startedAt = Date.now();
    this.phase.set('human');
  }

  protected play(col: number): void {
    if (this.phase() !== 'human') return;
    if (!this.place(col, HUMAN)) return;
    this.humanMoves++;
    if (this.settle()) return;
    this.phase.set('cpu');
    this.cpuTimer = setTimeout(() => {
      const col = cpuMove(this.board(), this.difficulty());
      this.place(col, CPU);
      this.cpuColumn.set(col + 1);
      if (!this.settle()) this.phase.set('human');
    }, CPU_DELAY_MS);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (this.phase() !== 'human') return;
    const digit = Number(event.key);
    if (digit >= 1 && digit <= COLS) {
      this.cursor.set(digit - 1);
      this.play(digit - 1);
    } else if (event.key === 'ArrowLeft') {
      this.cursor.update((c) => (c + COLS - 1) % COLS);
    } else if (event.key === 'ArrowRight') {
      this.cursor.update((c) => (c + 1) % COLS);
    } else if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
      this.play(this.cursor());
    } else {
      return;
    }
    event.preventDefault();
  }

  protected disc(row: number, col: number): string {
    const value = this.board()[row][col];
    return value === HUMAN ? 'disc-human' : value === CPU ? 'disc-cpu' : '';
  }

  /** A column as screen readers hear it: its discs from the bottom up. */
  protected columnLabel(col: number): string {
    const discs = this.rows
      .map((row) => this.board()[row][col])
      .filter((value) => value !== 0)
      .reverse()
      .map((value) => (value === HUMAN ? 'yours' : 'CPU'));
    const free = ROWS - discs.length;
    const contents = discs.length ? `${discs.join(', ')} from the bottom` : 'empty';
    return `Drop disc in column ${col + 1}: ${contents}, ${free} free`;
  }

  protected isColumnFull(col: number): boolean {
    return this.board()[0][col] !== 0;
  }

  protected isWinning(row: number, col: number): boolean {
    return this.winningCells().has(`${row}:${col}`);
  }

  private place(col: number, player: Player): boolean {
    const result = drop(this.board(), col, player);
    if (!result) return false;
    this.board.set(result.board);
    this.lastDrop.set(`${result.row}:${col}`);
    return true;
  }

  /** Ends the game on a win or full board; returns true when it did. */
  private settle(): boolean {
    const win = findWin(this.board());
    const outcome: Outcome | null = win
      ? win.player === HUMAN
        ? 'win'
        : 'loss'
      : isFull(this.board())
        ? 'draw'
        : null;
    if (!outcome) return false;

    this.winningCells.set(new Set(win?.cells.map(([r, c]) => `${r}:${c}`)));
    this.outcome.set(outcome);
    this.phase.set('over');
    const difficulty = this.difficulty();
    this.gameOver.emit({
      score: scoreFor(outcome, this.humanMoves, difficulty),
      level: DIFFICULTIES[difficulty].level,
      durationSeconds: Math.round((Date.now() - this.startedAt) / 1000),
      summary:
        outcome === 'win'
          ? `You beat the ${difficulty} CPU in ${this.humanMoves} moves.`
          : outcome === 'draw'
            ? `Draw against the ${difficulty} CPU.`
            : `The ${difficulty} CPU won this time.`,
    });
    return true;
  }
}
