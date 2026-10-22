import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ArcadeApi, type ArcadeGame } from '../../api/arcade-api.service';
import { LeaderboardTableComponent } from '../../components/leaderboard-table/leaderboard-table';

/** Hall of fame across all games, React and Angular alike. */
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
}
