import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { ArcadeApi } from '../../../api/arcade-api.service';
import { LOGOUT_URL, arcadeFloorHomeUrl } from '../../../arcade-floor';
import { TechXray } from '../../../tech-xray.service';
import { PATTERNS_URL, xrayOf } from '../../../xray';

/**
 * Arcade chrome around every hub page. The header is the marquee bar every
 * standalone surface shares: the way back to the lobby and a badge naming the
 * surface. The hub is the lobby, so the back link hides on the lobby itself,
 * where the Tech X-ray switch takes its place. The badge opens the X-ray of
 * the surface itself. The footer leads out to Salesforce and names the player.
 */
@Component({
  selector: 'app-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app-layout.html',
  host: { '(document:keydown.escape)': 'closeExplanation()' },
})
export class AppLayoutComponent {
  private readonly router = inject(Router);
  private readonly badge = viewChild.required<ElementRef<HTMLButtonElement>>('badge');

  protected readonly xray = inject(TechXray);
  /** The hub is the Angular UI bundle of pattern 1. */
  protected readonly surface = xrayOf({
    framework: 'Angular',
    embedPath: null,
    hostSavesScore: false,
  });
  protected readonly patternsUrl = PATTERNS_URL;
  protected readonly explainOpen = signal(false);

  /** The Arcade Floor Lightning app; null without org context. */
  protected readonly floorUrl = arcadeFloorHomeUrl(globalThis.SFDC_ENV?.orgUrl);
  protected readonly logoutUrl = LOGOUT_URL;
  /** The logged-in user's name; stays null outside an org. */
  protected readonly player = signal<string | null>(null);

  protected readonly onLobby = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      startWith(null),
      map(() => this.router.url.split(/[?#]/)[0] === '/'),
    ),
    { requireSync: true },
  );

  constructor() {
    if (!this.floorUrl) return;
    inject(ArcadeApi)
      .currentPlayer()
      .then((name) => this.player.set(name))
      // Without a name the bar simply shows no player.
      .catch(() => undefined);
  }

  /** Closes the surface X-ray and hands focus back to the badge that opened it. */
  protected closeExplanation(): void {
    if (!this.explainOpen()) return;
    this.explainOpen.set(false);
    this.badge().nativeElement.focus();
  }
}
