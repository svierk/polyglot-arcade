import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { GameResult, SaveState } from '../../games/types';

/**
 * What screen readers hear when a round ends: the result screen itself is
 * rendered inside the machine, which they do not browse while playing.
 */
export function announceRound(result: GameResult, save: SaveState | null): string {
  const status =
    save?.state === 'saving'
      ? 'Saving to Salesforce…'
      : save?.state === 'saved'
        ? save.isHighScore
          ? 'New high score!'
          : 'Score saved to the leaderboard.'
        : save?.state === 'failed'
          ? `Could not save score: ${save.message}`
          : '';
  return `Game over. ${result.score} points. ${result.summary} ${status}`.trim();
}

/**
 * The end of a round: score, whether it reached Salesforce and the way to the
 * next round. The machine shows it on its own screen, in its own look.
 */
@Component({
  selector: 'app-round-result',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './round-result.html',
})
export class RoundResultComponent {
  readonly result = input.required<GameResult>();
  readonly save = input<SaveState | null>(null);
  readonly playAgain = output();
}
