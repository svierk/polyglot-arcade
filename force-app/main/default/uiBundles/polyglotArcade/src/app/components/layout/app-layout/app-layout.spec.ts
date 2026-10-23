import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AppLayoutComponent } from './app-layout';

@Component({ template: '' })
class EmptyPage {}

async function renderAt(url: string): Promise<HTMLElement> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        {
          path: '',
          component: AppLayoutComponent,
          children: [
            { path: '', component: EmptyPage },
            { path: 'leaderboard', component: EmptyPage },
          ],
        },
      ]),
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  return harness.routeNativeElement!;
}

const backLink = (root: HTMLElement) =>
  [...root.querySelectorAll('a')].find((a) => a.textContent?.includes('← Lobby'));

describe('AppLayoutComponent', () => {
  it('names the surface in the marquee bar', async () => {
    const root = await renderAt('/');
    expect(root.querySelector('.arcade-tech-badge')?.textContent).toBe(
      'Angular · Polyglot Arcade hub',
    );
  });

  it('hides the way back on the lobby itself', async () => {
    const root = await renderAt('/');
    expect(backLink(root)).toBeUndefined();
  });

  it('leads back to the lobby from other pages', async () => {
    const root = await renderAt('/leaderboard');
    expect(backLink(root)?.getAttribute('href')).toBe('/');
  });
});
