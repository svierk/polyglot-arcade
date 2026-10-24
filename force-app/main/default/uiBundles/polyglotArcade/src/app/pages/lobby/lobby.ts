/**
 * Lobby: the game catalogue straight from Arcade_Game__c, and the arcade's only
 * lobby. Hub games open in this app; games of other bundles launch via the App
 * URL stored on their record. Externally hosted games have no Salesforce
 * session to save scores with, so they are played embedded on their own page
 * in the Arcade Floor Lightning app.
 *
 * Every card says where its game lives, in the color of that surface, and its
 * launch button carries that color: the bar of the page it opens glows in it.
 */
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArcadeApi, type ArcadeGame } from '../../api/arcade-api.service';
import { arcadeFloorUrl } from '../../arcade-floor';
import { TeaserMarqueeComponent } from '../../components/teaser-marquee/teaser-marquee';
import { teaserMarquee, type PixelArt } from '../../games/marquees';
import { findHubGame } from '../../games/registry';

/** Lightning tab of each game that is played embedded on the Arcade Floor. */
const ARCADE_FLOOR_TABS: Readonly<Record<string, string>> = { snake: 'Arcade_Snake' };

interface Surface {
  label: string;
  tech: string;
  /** CSS color of the surface, from the shared arcade tokens. */
  color: string;
}

const HUB: Surface = {
  label: 'Polyglot Arcade hub',
  tech: 'Angular UI bundle',
  color: 'var(--surface-hub)',
};
const CABINET: Surface = {
  label: 'Pixel Cabinet',
  tech: 'React UI bundle',
  color: 'var(--surface-cabinet)',
};
const FLOOR: Surface = {
  label: 'Arcade Floor',
  tech: 'Lightning app',
  color: 'var(--surface-floor)',
};

@Component({
  selector: 'app-lobby',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TeaserMarqueeComponent],
  templateUrl: './lobby.html',
  styleUrl: './lobby.css',
})
export class LobbyComponent {
  private readonly api = inject(ArcadeApi);

  protected readonly surfaces = [HUB, CABINET, FLOOR];
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

  /** Hub games play here, externally hosted ones on the Arcade Floor, the rest in the cabinet. */
  protected whereLives(game: ArcadeGame): Surface {
    if (this.isHubGame(game)) return HUB;
    return game.hostSavesScore ? FLOOR : CABINET;
  }

  protected teaser(game: ArcadeGame): PixelArt | undefined {
    return teaserMarquee(game.key);
  }

  /** Null when the hub runs without org context or the game has no page. */
  protected arcadeFloorUrl(game: ArcadeGame): string | null {
    return arcadeFloorUrl(this.orgUrl, ARCADE_FLOOR_TABS[game.key]);
  }

  protected externalUrl(game: ArcadeGame): string | null {
    return game.appUrl ? `${game.appUrl.replace(/\/+$/, '')}/play/${game.key}` : null;
  }
}
