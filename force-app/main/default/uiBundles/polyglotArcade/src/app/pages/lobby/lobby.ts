/**
 * Lobby: the game catalogue straight from Arcade_Game__c, and the arcade's only
 * lobby. Hub games open in this app; games of other bundles launch via the App
 * URL stored on their record. Externally hosted games have no Salesforce
 * session to save scores with, so they are played embedded on their own page
 * in the Arcade Floor Lightning app.
 *
 * Every card says where its game lives, in the color of that surface, and its
 * launch button carries that color: the bar of the page it opens glows in it.
 * With the Tech X-ray switched on, the card shows how its game is built.
 */
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArcadeApi, type ArcadeGame, type ShowcaseAccount } from '../../api/arcade-api.service';
import { arcadeFloorRecordUrl, arcadeFloorUrl } from '../../arcade-floor';
import { TeaserMarqueeComponent } from '../../components/teaser-marquee/teaser-marquee';
import { teaserMarquee, type PixelArt } from '../../games/marquees';
import { findHubGame } from '../../games/registry';
import { TechXray } from '../../tech-xray.service';
import { xrayOf, type Pattern } from '../../xray';

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

  protected readonly xray = inject(TechXray);
  protected readonly xrayOf = xrayOf;
  protected readonly surfaces = [HUB, CABINET, FLOOR];
  protected readonly games = signal<ArcadeGame[] | null>(null);
  protected readonly error = signal<string | null>(null);
  /** Where cabinet games are framed on a record page; null until found. */
  protected readonly showcase = signal<ShowcaseAccount | null>(null);
  private readonly orgUrl = globalThis.SFDC_ENV?.orgUrl;

  constructor() {
    this.api
      .games()
      .then((games) => this.games.set(games))
      .catch((err: Error) => this.error.set(err.message));
    this.api.showcaseAccount().then((account) => this.showcase.set(account));
  }

  protected isHubGame(game: ArcadeGame): boolean {
    return findHubGame(game.key) !== undefined;
  }

  /** Hub games play here, externally hosted ones on the Arcade Floor, the rest in the cabinet. */
  protected whereLives(game: ArcadeGame): Surface {
    if (this.isHubGame(game)) return HUB;
    return game.hostSavesScore ? FLOOR : CABINET;
  }

  /** A pattern in the color of the surface it is seen on. */
  protected patternColor(pattern: Pattern): string {
    return pattern.no === 1 ? HUB.color : pattern.no === 2 ? CABINET.color : FLOOR.color;
  }

  protected teaser(game: ArcadeGame): PixelArt | undefined {
    return teaserMarquee(game.key);
  }

  /** Null when the hub runs without org context or the game has no page. */
  protected arcadeFloorUrl(game: ArcadeGame): string | null {
    return arcadeFloorUrl(this.orgUrl, ARCADE_FLOOR_TABS[game.key]);
  }

  /**
   * The showcase Account's page on the Arcade Floor for a game Lightning can
   * frame (pattern 3); null without org context, Account or embed path.
   */
  protected accountPageUrl(game: ArcadeGame): string | null {
    if (!game.embedPath || game.hostSavesScore) return null;
    return arcadeFloorRecordUrl(this.orgUrl, 'Account', this.showcase()?.id);
  }

  protected externalUrl(game: ArcadeGame): string | null {
    return game.appUrl ? `${game.appUrl.replace(/\/+$/, '')}/play/${game.key}` : null;
  }
}
