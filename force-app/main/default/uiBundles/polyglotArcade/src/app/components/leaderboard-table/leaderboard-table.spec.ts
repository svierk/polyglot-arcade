import { TestBed } from '@angular/core/testing';
import { ArcadeApi, type LeaderboardEntry } from '../../api/arcade-api.service';
import { LeaderboardTableComponent } from './leaderboard-table';

const ENTRIES: LeaderboardEntry[] = Array.from({ length: 12 }, (_, i) => ({
  id: `s${i}`,
  player: `Player ${i + 1}`,
  score: 1200 - i * 100,
  source: 'Polyglot Arcade',
  playedAt: null,
}));

async function render(pageSize: number | null) {
  await TestBed.configureTestingModule({
    imports: [LeaderboardTableComponent],
    providers: [{ provide: ArcadeApi, useValue: { leaderboard: async () => ENTRIES } }],
  }).compileComponents();
  const fixture = TestBed.createComponent(LeaderboardTableComponent);
  fixture.componentRef.setInput('gameKey', 'four-in-a-row');
  fixture.componentRef.setInput('pageSize', pageSize);
  await fixture.whenStable();
  const root = fixture.nativeElement as HTMLElement;
  const ranks = () => [...root.querySelectorAll('.hiscores-rank')].map((el) => el.textContent);
  const button = (label: string) =>
    [...root.querySelectorAll('button')].find((b) => b.textContent?.includes(label))!;
  return { fixture, root, ranks, button };
}

describe('LeaderboardTableComponent', () => {
  it('shows every row without a page size', async () => {
    const { ranks, root } = await render(null);
    expect(ranks()).toHaveLength(12);
    expect(root.querySelector('.hiscores-pages')).toBeNull();
  });

  it('splits long lists into pages and keeps counting the ranks', async () => {
    const { fixture, ranks, button, root } = await render(10);
    expect(ranks()).toHaveLength(10);
    expect(root.querySelector('.hiscores-pages')?.textContent).toContain('1–10 of 12');
    expect(button('Prev').disabled).toBe(true);

    button('Next').click();
    await fixture.whenStable();
    expect(ranks()).toEqual(['11.', '12.']);
    expect(button('Next').disabled).toBe(true);
  });
});
