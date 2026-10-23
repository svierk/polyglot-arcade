import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';

/**
 * Arcade chrome around every hub page. The header is the marquee bar every
 * standalone surface shares: the way back to the lobby and a badge naming the
 * surface. The hub is the lobby, so the back link hides on the lobby itself.
 */
@Component({
  selector: 'app-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app-layout.html',
})
export class AppLayoutComponent {
  private readonly router = inject(Router);

  protected readonly onLobby = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      startWith(null),
      map(() => this.router.url.split(/[?#]/)[0] === '/'),
    ),
    { requireSync: true },
  );
}
