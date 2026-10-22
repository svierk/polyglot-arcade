/**
 * Lobby: the game catalogue straight from Arcade_Game__c. Hub games open in this
 * app; games of other bundles launch via the App URL stored on their record.
 */
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArcadeApi, type ArcadeGame } from '../../api/arcade-api.service';
import { findHubGame } from '../../games/registry';

@Component({
  selector: 'app-lobby',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './lobby.html',
})
export class LobbyComponent {
  private readonly api = inject(ArcadeApi);

  protected readonly games = signal<ArcadeGame[] | null>(null);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.api
      .games()
      .then((games) => this.games.set(games))
      .catch((err: Error) => this.error.set(err.message));
  }

  protected isHubGame(game: ArcadeGame): boolean {
    return findHubGame(game.key) !== undefined;
  }

  protected externalUrl(game: ArcadeGame): string | null {
    return game.appUrl ? `${game.appUrl.replace(/\/+$/, '')}/play/${game.key}` : null;
  }
}
