import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ArcadeApi } from '../../../api/arcade-api.service';
import { AppLayoutComponent } from './app-layout';

@Component({ template: '' })
class EmptyPage {}

async function renderAt(url: string): Promise<HTMLElement> {
  TestBed.configureTestingModule({
    providers: [
      { provide: ArcadeApi, useValue: { currentPlayer: async () => 'Player One' } },
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
  afterEach(() => {
    delete (globalThis as { SFDC_ENV?: unknown }).SFDC_ENV;
  });

  it('names the surface in the marquee bar', async () => {
    const root = await renderAt('/');
    expect(root.querySelector('.arcade-tech-badge')?.textContent).toContain(
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

  it('leads out to Salesforce inside an org', async () => {
    (globalThis as { SFDC_ENV?: unknown }).SFDC_ENV = {
      orgUrl: 'https://org.lightning.force.com',
    };
    const root = await renderAt('/');
    const links = [...root.querySelectorAll('a')];
    const salesforce = links.find((a) => a.textContent?.includes('Salesforce'));
    expect(salesforce?.getAttribute('href')).toBe(
      'https://org.lightning.force.com/lightning/app/c__arcadeFloor',
    );
    expect(salesforce?.getAttribute('target')).toBe('_top');
  });

  it('has no way out to Salesforce outside an org', async () => {
    const root = await renderAt('/');
    expect(root.querySelector('.arcade-nav-floor')).toBeNull();
  });

  it('switches the Tech X-ray on the lobby and remembers it', async () => {
    const root = await renderAt('/');
    const toggle = [...root.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Tech X-ray'),
    )!;
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    toggle.click();
    TestBed.tick();
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(localStorage.getItem('polyglot-arcade.tech-xray')).toBe('on');
    localStorage.clear();
  });

  it('explains the surface behind the badge', async () => {
    const root = await renderAt('/leaderboard');
    const badge = root.querySelector<HTMLButtonElement>('.arcade-tech-badge')!;
    expect(root.querySelector('#surface-xray')).toBeNull();
    badge.click();
    TestBed.tick();
    expect(badge.getAttribute('aria-expanded')).toBe('true');
    expect(root.querySelector('#surface-xray')?.textContent).toContain('Native Angular UI bundle');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    TestBed.tick();
    expect(root.querySelector('#surface-xray')).toBeNull();
    expect(document.activeElement).toBe(badge);
  });
});
