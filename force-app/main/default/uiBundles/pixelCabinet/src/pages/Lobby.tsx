import { Link } from 'react-router';
import { CABINET_GAMES } from '@/games/registry';

export default function Lobby() {
  return (
    <section>
      <h1 className="arcade-title mb-2 text-2xl">Insert coin</h1>
      <p className="arcade-hint mb-8">
        The real-time games of Polyglot Arcade, built in React. Every round
        lands on the Salesforce leaderboard.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {CABINET_GAMES.map(game => (
          <Link
            key={game.key}
            to={`/play/${game.key}`}
            className="arcade-card"
            style={{ '--accent': game.accent } as React.CSSProperties}
          >
            <span className="arcade-title text-lg">{game.name}</span>
            <span className="arcade-hint">{game.tagline}</span>
            <span className="arcade-badge">
              {game.component ? 'Play' : 'Coming soon'}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
