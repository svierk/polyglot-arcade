import { useEffect, useState } from 'react';
import { Outlet } from 'react-router';
import { fetchCurrentPlayer } from '@/api/arcadeApi';
import { LOGOUT_URL, arcadeFloorUrl, hubLobbyUrl } from './hub';

/**
 * Chrome for the standalone cabinet launched from the hub. The cabinet is a
 * machine, not a second hub: its header is the marquee bar every standalone
 * surface shares, with the way back to the hub lobby, the way out to
 * Salesforce, the player and a badge naming the surface.
 */
export default function CabinetLayout() {
  const hubUrl = hubLobbyUrl();
  const floorUrl = arcadeFloorUrl();
  const player = useCurrentPlayer(floorUrl !== null);

  return (
    <div className="arcade-shell min-h-screen">
      <header className="arcade-marquee">
        <nav
          className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-4"
          aria-label="Arcade"
        >
          {hubUrl && (
            <a href={hubUrl} className="arcade-nav-link">
              ← Lobby
            </a>
          )}
          <span className="arcade-logo">Pixel Cabinet</span>
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
          {player && (
            <span className="arcade-player">
              <strong>{player}</strong>
              <a href={LOGOUT_URL} className="arcade-nav-link">
                Log out
              </a>
            </span>
          )}
          <span className="arcade-tech-badge">
            React · Pixel Cabinet UI bundle
          </span>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
      <footer className="arcade-hint px-4 pb-6 text-center">
        React UI bundle · Salesforce Multi-Framework · part of Polyglot Arcade
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
