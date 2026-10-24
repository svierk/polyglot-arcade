import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { ArcadeApi, type LeaderboardEntry } from '../../api/arcade-api.service';

const MEDALS = ['🥇', '🥈', '🥉'];

/** Where a round was played, in the color of that surface. */
const SOURCE_COLORS: Readonly<Record<string, string>> = {
  'Polyglot Arcade': 'var(--surface-hub)',
  'Pixel Cabinet': 'var(--surface-cabinet)',
  Embedded: 'var(--surface-floor)',
};

/**
 * Top scores of one game; refetches when the game or `refreshKey` changes.
 * Next to a machine, the machine's styles dress it in the game's look.
 */
@Component({
  selector: 'app-leaderboard-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe],
  templateUrl: './leaderboard-table.html',
})
export class LeaderboardTableComponent {
  private readonly api = inject(ArcadeApi);

  readonly gameKey = input.required<string>();
  readonly refreshKey = input(0);
  readonly limit = input(10);
  readonly showDetails = input(false);
  /** The rows once loaded, e.g. for the best score in a machine's HUD. */
  readonly loaded = output<LeaderboardEntry[]>();

  protected readonly entries = signal<LeaderboardEntry[] | null>(null);
  protected readonly error = signal<string | null>(null);

  constructor() {
    effect((onCleanup) => {
      const gameKey = this.gameKey();
      const limit = this.limit();
      this.refreshKey();
      let cancelled = false;
      onCleanup(() => (cancelled = true));
      this.api
        .leaderboard(gameKey, limit)
        .then((rows) => {
          if (cancelled) return;
          this.entries.set(rows);
          this.error.set(null);
          this.loaded.emit(rows);
        })
        .catch((err: Error) => {
          if (!cancelled) this.error.set(err.message);
        });
    });
  }

  protected sourceColor(source: string | null): string | null {
    return (source && SOURCE_COLORS[source]) ?? null;
  }

  protected rank(index: number): string {
    return MEDALS[index] ?? `${index + 1}.`;
  }
}
