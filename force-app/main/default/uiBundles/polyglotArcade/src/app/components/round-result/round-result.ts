import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { GameResult, SaveState } from '../../games/types';

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
