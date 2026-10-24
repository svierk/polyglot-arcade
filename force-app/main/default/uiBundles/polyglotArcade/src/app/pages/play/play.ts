/**
 * Hosts a hub game: renders its machine, saves each finished round as an
 * Arcade_Score__c and hands the result screen to the machine, next to the
 * game's leaderboard. A live region announces how the round ended.
 */
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArcadeApi } from '../../api/arcade-api.service';
import { LeaderboardTableComponent } from '../../components/leaderboard-table/leaderboard-table';
import { RoundResultComponent, announceRound } from '../../components/round-result/round-result';
import { BrickBreakerComponent } from '../../games/brick-breaker/brick-breaker';
import { FourInARowComponent } from '../../games/four-in-a-row/four-in-a-row';
import { findHubGame } from '../../games/registry';
import type { GameResult, SaveState } from '../../games/types';

@Component({
  selector: 'app-play',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    BrickBreakerComponent,
    FourInARowComponent,
    LeaderboardTableComponent,
    RoundResultComponent,
  ],
  templateUrl: './play.html',
})
export class PlayComponent {
  private readonly api = inject(ArcadeApi);

  /** Bound from the `:gameKey` route parameter. */
  readonly gameKey = input.required<string>();

  protected readonly game = computed(() => findHubGame(this.gameKey()));
  /** Changing the round re-creates the game component for a fresh start. */
  protected readonly round = signal(0);
  protected readonly result = signal<GameResult | null>(null);
  protected readonly save = signal<SaveState | null>(null);
  protected readonly savedCount = signal(0);
  /** For the live region: how the round ended and whether it was saved. */
  protected readonly announcement = computed(() => {
    const result = this.result();
    return result ? announceRound(result, this.save()) : '';
  });
  /** Best score on the leaderboard, for the machine's HUD. */
  protected readonly highScore = signal<number | undefined>(undefined);

  protected async onGameOver(result: GameResult): Promise<void> {
    this.result.set(result);
    this.save.set({ state: 'saving' });
    try {
      const { isHighScore } = await this.api.saveScore({
        gameKey: this.gameKey(),
        score: result.score,
        level: result.level,
        durationSeconds: result.durationSeconds,
      });
      this.save.set({ state: 'saved', isHighScore });
      this.savedCount.update((n) => n + 1);
    } catch (err) {
      this.save.set({ state: 'failed', message: (err as Error).message });
    }
  }

  protected playAgain(): void {
    this.result.set(null);
    this.save.set(null);
    this.round.update((n) => n + 1);
  }
}
