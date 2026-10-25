import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ArcadeApi, type ArcadeGame } from '../../api/arcade-api.service';
import { arcadeFloorRecordUrl, arcadeFloorUrl } from '../../arcade-floor';
import { TechXray } from '../../tech-xray.service';
import { LobbyComponent } from './lobby';

const game = (overrides: Partial<ArcadeGame>): ArcadeGame => ({
  id: overrides.key ?? 'id',
  key: 'key',
  name: 'Game',
  tagline: '',
  framework: null,
  appUrl: null,
  embedPath: null,
  hostSavesScore: false,
  accent: '#22d3ee',
  highScore: null,
  totalPlays: 0,
  ...overrides,
});

const CABINET_URL = 'https://org--c.scratch.my.salesforce.app/app/c__pixelCabinet';

const GAMES: ArcadeGame[] = [
  game({ key: 'four-in-a-row', name: 'Four in a Row', framework: 'Angular' }),
  game({
    key: 'block-drop',
    name: 'Block Drop',
    framework: 'React',
    appUrl: CABINET_URL,
    embedPath: '/embed',
  }),
  game({ key: 'pellet-chase', name: 'Pellet Chase', framework: 'React' }),
  game({
    key: 'snake',
    name: 'Snake',
    framework: 'LWC OSS',
    appUrl: 'https://lwc-oss-snake-game.vercel.app',
    hostSavesScore: true,
  }),
  game({ key: 'new-game', name: 'New Game', framework: 'Angular' }),
];

const SHOWCASE = { id: '001SHOWCASE', name: 'Pixel Pioneers Inc.' };

async function renderLobby(showcase: typeof SHOWCASE | null = SHOWCASE): Promise<HTMLElement> {
  await TestBed.configureTestingModule({
    imports: [LobbyComponent],
    providers: [
      provideRouter([]),
      {
        provide: ArcadeApi,
        useValue: { games: async () => GAMES, showcaseAccount: async () => showcase },
      },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(LobbyComponent);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

const card = (root: HTMLElement, name: string) =>
  [...root.querySelectorAll('article')].find((el) => el.querySelector('h2')?.textContent === name)!;

describe('LobbyComponent', () => {
  afterEach(() => {
    delete (globalThis as { SFDC_ENV?: unknown }).SFDC_ENV;
    localStorage.clear();
  });

  it('builds the Arcade Floor URL from the org URL', () => {
    expect(arcadeFloorUrl('https://org.my.salesforce.com/', 'Arcade_Snake')).toBe(
      'https://org.my.salesforce.com/lightning/app/c__arcadeFloor/n/Arcade_Snake',
    );
    expect(arcadeFloorUrl(undefined, 'Arcade_Snake')).toBeNull();
    expect(arcadeFloorUrl('https://org.my.salesforce.com', undefined)).toBeNull();
  });

  it('builds a record URL inside the Arcade Floor app', () => {
    expect(arcadeFloorRecordUrl('https://org.my.salesforce.com/', 'Account', '001X')).toBe(
      'https://org.my.salesforce.com/lightning/app/c__arcadeFloor/r/Account/001X/view',
    );
    expect(arcadeFloorRecordUrl('https://org.my.salesforce.com', 'Account', null)).toBeNull();
    expect(arcadeFloorRecordUrl(undefined, 'Account', '001X')).toBeNull();
  });

  it('offers the showcase Account page for games Lightning can frame', async () => {
    globalThis.SFDC_ENV = { orgUrl: 'https://org.my.salesforce.com' };
    const root = await renderLobby();

    const account = card(root, 'Block Drop').querySelector<HTMLAnchorElement>('a.lobby-account');
    expect(account?.textContent).toContain('Pixel Pioneers Inc. Account page');
    expect(account?.getAttribute('href')).toBe(
      'https://org.my.salesforce.com/lightning/app/c__arcadeFloor/r/Account/001SHOWCASE/view',
    );
    expect(account?.getAttribute('target')).toBe('_top');
    // Only cabinet games with an embed path are framed on a record page.
    expect(card(root, 'Four in a Row').querySelector('a.lobby-account')).toBeNull();
    expect(card(root, 'Snake').querySelector('a.lobby-account')).toBeNull();
  });

  it('shows no Account link without the showcase Account', async () => {
    globalThis.SFDC_ENV = { orgUrl: 'https://org.my.salesforce.com' };
    const root = await renderLobby(null);
    expect(root.querySelector('a.lobby-account')).toBeNull();
  });

  it('links each game to where it is played', async () => {
    globalThis.SFDC_ENV = { orgUrl: 'https://org.my.salesforce.com' };
    const root = await renderLobby();

    expect(card(root, 'Four in a Row').querySelector('a')?.getAttribute('href')).toBe(
      '/play/four-in-a-row',
    );
    expect(card(root, 'Block Drop').querySelector('a')?.getAttribute('href')).toBe(
      `${CABINET_URL}/play/block-drop`,
    );
    expect(card(root, 'Pellet Chase').querySelector('a')).toBeNull();

    const snake = card(root, 'Snake').querySelector('a');
    expect(snake?.textContent).toContain('Play on the Arcade Floor');
    expect(snake?.getAttribute('href')).toBe(
      'https://org.my.salesforce.com/lightning/app/c__arcadeFloor/n/Arcade_Snake',
    );
    expect(snake?.getAttribute('target')).toBe('_top');
  });

  it('points to the Arcade Floor app when the org URL is unknown', async () => {
    const root = await renderLobby();
    const snake = card(root, 'Snake');
    expect(snake.querySelector('a')).toBeNull();
    expect(snake.textContent).toContain('open its tab in the Arcade Floor app');
  });

  it('says where each game lives, in the color of that surface', async () => {
    const root = await renderLobby();
    const where = (name: string) => card(root, name).querySelector<HTMLElement>('.lobby-where')!;
    expect(where('Four in a Row').textContent).toContain('Polyglot Arcade hub');
    expect(where('Block Drop').textContent).toContain('Pixel Cabinet');
    expect(where('Snake').textContent).toContain('Arcade Floor');
    expect(where('Block Drop').style.getPropertyValue('--where')).toBe('var(--surface-cabinet)');
    expect(
      card(root, 'Block Drop').querySelector<HTMLElement>('a')!.style.getPropertyValue('--button'),
    ).toBe('var(--surface-cabinet)');
  });

  it('shows a teaser marquee for known games and the plain card otherwise', async () => {
    const root = await renderLobby();
    expect(card(root, 'Pellet Chase').querySelector('app-teaser-marquee svg rect')).not.toBeNull();
    expect(card(root, 'New Game').querySelector('app-teaser-marquee')).toBeNull();
  });

  it('shows how each game is built once the Tech X-ray is on', async () => {
    const root = await renderLobby();
    expect(root.querySelector('.lobby-xray')).toBeNull();

    TestBed.inject(TechXray).toggle();
    TestBed.tick();
    const xray = (name: string) => card(root, name).querySelector('.lobby-xray')!;
    expect(xray('Four in a Row').textContent).toContain('Pattern 1 Native Angular UI bundle');
    expect(xray('Block Drop').textContent).toContain('Pattern 2 Native React UI bundle');
    expect(xray('Block Drop').textContent).toContain('Pattern 3 Internally hosted microfrontend');
    expect(xray('Snake').textContent).toContain('Pattern 4 Externally hosted microfrontend');
    expect(xray('Snake').textContent).toContain('Host LWC');
    // The blueprint takes the place of the marquee.
    expect(card(root, 'Pellet Chase').querySelector('app-teaser-marquee')).toBeNull();
  });
});
