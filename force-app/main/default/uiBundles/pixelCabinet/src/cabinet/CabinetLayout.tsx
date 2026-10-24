import { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router';
import { fetchCurrentPlayer } from '@/api/arcadeApi';
import { LOGOUT_URL, arcadeFloorUrl, hubLobbyUrl } from './hub';
import SurfaceXray from './SurfaceXray';

/**
 * Chrome for the standalone cabinet launched from the hub. The cabinet is a
 * machine, not a second hub: its header is the marquee bar every standalone
 * surface shares, with the way back to the hub lobby and a badge naming the
 * surface; the badge opens the Tech X-ray of the cabinet. The footer leads
 * out to Salesforce and names the player.
 */
export default function CabinetLayout() {
  const hubUrl = hubLobbyUrl();
  const floorUrl = arcadeFloorUrl();
  const player = useCurrentPlayer(floorUrl !== null);
  const badgeRef = useRef<HTMLButtonElement>(null);
  const [explainOpen, setExplainOpen] = useState(false);

  // Closing hands focus back to the badge that opened the X-ray.
  const closeExplanation = useCallback(() => {
    setExplainOpen(false);
    badgeRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!explainOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeExplanation();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [explainOpen, closeExplanation]);

  return (
    <div className="arcade-shell min-h-screen">
      <header className="arcade-marquee">
        <nav
          className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-4"
          aria-label="Arcade"
        >
          {hubUrl && (
            <a href={hubUrl} className="arcade-nav-link">
              ← Lobby
            </a>
          )}
          <span className="arcade-logo">Pixel Cabinet</span>
          <button
            ref={badgeRef}
            type="button"
            className="arcade-tech-badge"
            aria-controls="surface-xray"
            aria-expanded={explainOpen}
            title="How this surface is built"
            onClick={() => setExplainOpen(open => !open)}
          >
            React · Pixel Cabinet UI bundle{' '}
            <span aria-hidden="true">{explainOpen ? '▴' : '▾'}</span>
          </button>
        </nav>
        {explainOpen && <SurfaceXray onClose={closeExplanation} />}
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
      <footer className="arcade-hint px-4 pb-6 text-center">
        React UI bundle · Salesforce Multi-Framework · part of Polyglot Arcade
        {(floorUrl || player) && (
          <div className="arcade-footer-row">
            {floorUrl && (
              <a
                href={floorUrl}
                target="_top"
                className="arcade-nav-link arcade-nav-floor"
                title="Open the Arcade Floor app in Salesforce"
              >
                Salesforce ↗
              </a>
            )}
            {player && <span className="arcade-player">{player}</span>}
            {player && (
              <a href={LOGOUT_URL} className="arcade-nav-link">
                Log out
              </a>
            )}
          </div>
        )}
      </footer>
    </div>
  );
}

/** The logged-in user's name; null until loaded and outside an org. */
function useCurrentPlayer(inOrg: boolean): string | null {
  const [player, setPlayer] = useState<string | null>(null);
  useEffect(() => {
    if (!inOrg) return;
    let cancelled = false;
    fetchCurrentPlayer()
      .then(name => {
        if (!cancelled) setPlayer(name);
      })
      // Without a name the bar simply shows no player.
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [inOrg]);
  return player;
}
