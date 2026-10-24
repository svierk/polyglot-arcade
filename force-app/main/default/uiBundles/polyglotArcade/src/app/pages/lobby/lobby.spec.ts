import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ArcadeApi, type ArcadeGame } from '../../api/arcade-api.service';
import { LobbyComponent, arcadeFloorUrl } from './lobby';

const game = (overrides: Partial<ArcadeGame>): ArcadeGame => ({
  id: overrides.key ?? 'id',
  key: 'key',
  name: 'Game',
  tagline: '',
  framework: null,
  appUrl: null,
  hostSavesScore: false,
  accent: '#22d3ee',
  highScore: null,
  totalPlays: 0,
  ...overrides,
});

const CABINET_URL = 'https://org--c.scratch.my.salesforce.app/app/c__pixelCabinet';

const GAMES: ArcadeGame[] = [
  game({ key: 'four-in-a-row', name: 'Four in a Row', framework: 'Angular' }),
  game({ key: 'block-drop', name: 'Block Drop', framework: 'React', appUrl: CABINET_URL }),
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

async function renderLobby(): Promise<HTMLElement> {
  await TestBed.configureTestingModule({
    imports: [LobbyComponent],
    providers: [provideRouter([]), { provide: ArcadeApi, useValue: { games: async () => GAMES } }],
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
  });

  it('builds the Arcade Floor URL from the org URL', () => {
    expect(arcadeFloorUrl('https://org.my.salesforce.com/', 'Arcade_Snake')).toBe(
      'https://org.my.salesforce.com/lightning/app/c__arcadeFloor/n/Arcade_Snake',
    );
    expect(arcadeFloorUrl(undefined, 'Arcade_Snake')).toBeNull();
    expect(arcadeFloorUrl('https://org.my.salesforce.com', undefined)).toBeNull();
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
});
