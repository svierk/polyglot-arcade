import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ArcadeApi, type ArcadeGame } from '../../api/arcade-api.service';
import { LobbyComponent, breakRoomUrl } from './lobby';

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

  it('builds the Break Room URL from the org URL', () => {
    expect(breakRoomUrl('https://org.my.salesforce.com/')).toBe(
      'https://org.my.salesforce.com/lightning/n/Arcade_Break_Room',
    );
    expect(breakRoomUrl(undefined)).toBeNull();
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
    expect(snake?.textContent).toContain('Play in Arcade Break Room');
    expect(snake?.getAttribute('href')).toBe(
      'https://org.my.salesforce.com/lightning/n/Arcade_Break_Room',
    );
    expect(snake?.getAttribute('target')).toBe('_top');
  });

  it('points to the Break Room tab when the org URL is unknown', async () => {
    const root = await renderLobby();
    const snake = card(root, 'Snake');
    expect(snake.querySelector('a')).toBeNull();
    expect(snake.textContent).toContain('open the Arcade Break Room tab');
  });
});
