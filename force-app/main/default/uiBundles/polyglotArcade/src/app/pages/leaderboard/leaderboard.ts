import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ArcadeApi, type ArcadeGame } from '../../api/arcade-api.service';
import { LeaderboardTableComponent } from '../../components/leaderboard-table/leaderboard-table';

/** Hall of fame across all games, whatever framework they are built with. */
@Component({
  selector: 'app-leaderboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LeaderboardTableComponent],
  templateUrl: './leaderboard.html',
})
export class LeaderboardComponent {
  private readonly api = inject(ArcadeApi);

  protected readonly games = signal<ArcadeGame[]>([]);
  protected readonly selected = signal<ArcadeGame | null>(null);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.api
      .games()
      .then((games) => {
        this.games.set(games);
        this.selected.set(games[0] ?? null);
      })
      .catch((err: Error) => this.error.set(err.message));
  }

  /** Arrow keys, Home and End move between the game tabs, as in any tab list. */
  protected onTabKeydown(event: KeyboardEvent): void {
    const games = this.games();
    const current = games.findIndex((game) => game.id === this.selected()?.id);
    const next =
      event.key === 'ArrowRight'
        ? (current + 1) % games.length
        : event.key === 'ArrowLeft'
          ? (current - 1 + games.length) % games.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? games.length - 1
              : null;
    if (next === null || !games.length) return;
    event.preventDefault();
    this.selected.set(games[next]);
    document.getElementById(`tab-${games[next].key}`)?.focus();
  }
}
