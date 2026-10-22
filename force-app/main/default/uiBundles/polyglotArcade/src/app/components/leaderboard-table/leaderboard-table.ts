import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ArcadeApi, type LeaderboardEntry } from '../../api/arcade-api.service';

const MEDALS = ['🥇', '🥈', '🥉'];

/** Top scores of one game; refetches when the game or `refreshKey` changes. */
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
        })
        .catch((err: Error) => {
          if (!cancelled) this.error.set(err.message);
        });
    });
  }

  protected rank(index: number): string {
    return MEDALS[index] ?? `${index + 1}.`;
  }
}
