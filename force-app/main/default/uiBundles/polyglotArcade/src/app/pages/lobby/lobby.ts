/**
 * Lobby: the game catalogue straight from Arcade_Game__c, and the arcade's only
 * lobby. Hub games open in this app; games of other bundles launch via the App
 * URL stored on their record. Externally hosted games have no Salesforce
 * session to save scores with, so they are played embedded on their own page
 * in the Arcade Floor Lightning app.
 */
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArcadeApi, type ArcadeGame } from '../../api/arcade-api.service';
import { findHubGame } from '../../games/registry';

/** Lightning tab of each game that is played embedded on the Arcade Floor. */
const ARCADE_FLOOR_TABS: Readonly<Record<string, string>> = { snake: 'Arcade_Snake' };

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
  private readonly orgUrl = globalThis.SFDC_ENV?.orgUrl;

  constructor() {
    this.api
      .games()
      .then((games) => this.games.set(games))
      .catch((err: Error) => this.error.set(err.message));
  }

  protected isHubGame(game: ArcadeGame): boolean {
    return findHubGame(game.key) !== undefined;
  }

  /** Null when the hub runs without org context or the game has no page. */
  protected arcadeFloorUrl(game: ArcadeGame): string | null {
    return arcadeFloorUrl(this.orgUrl, ARCADE_FLOOR_TABS[game.key]);
  }

  protected externalUrl(game: ArcadeGame): string | null {
    return game.appUrl ? `${game.appUrl.replace(/\/+$/, '')}/play/${game.key}` : null;
  }
}

/**
 * Opens the tab inside the Arcade Floor app. A plain /lightning/n/<tab> URL
 * would open it as a temporary tab in whatever app the player used last.
 */
export function arcadeFloorUrl(
  orgUrl: string | null | undefined,
  tab: string | undefined,
): string | null {
  return orgUrl && tab
    ? `${orgUrl.replace(/\/+$/, '')}/lightning/app/c__arcadeFloor/n/${tab}`
    : null;
}
