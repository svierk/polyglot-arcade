import { Outlet } from 'react-router';
import { hubLobbyUrl } from './hub';

/**
 * Chrome for the standalone cabinet launched from the hub. The cabinet is a
 * machine, not a second hub: its header is the marquee bar every standalone
 * surface shares, with the way back to the hub lobby and a badge naming the
 * surface.
 */
export default function CabinetLayout() {
  const hubUrl = hubLobbyUrl();
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
