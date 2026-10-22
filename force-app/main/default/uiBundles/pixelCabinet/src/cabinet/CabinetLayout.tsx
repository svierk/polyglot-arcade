import { NavLink, Outlet } from 'react-router';
import { CABINET_GAMES } from '@/games/registry';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `arcade-nav-link ${isActive ? 'arcade-nav-link-active' : ''}`;

/** Chrome for the standalone app launched from the App Launcher. */
export default function CabinetLayout() {
  return (
    <div className="arcade-shell min-h-screen">
      <header className="border-b border-white/10">
        <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-4">
          <NavLink to="/" className="arcade-logo mr-auto">
            Pixel Cabinet
          </NavLink>
          <NavLink to="/" end className={linkClass}>
            Lobby
          </NavLink>
          {CABINET_GAMES.map(game => (
            <NavLink
              key={game.key}
              to={`/play/${game.key}`}
              className={linkClass}
            >
              {game.name}
            </NavLink>
          ))}
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
