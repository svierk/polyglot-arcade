import { useEffect, useState } from 'react';
import { fetchLeaderboard, type LeaderboardEntry } from '@/api/arcadeApi';

const MEDALS = ['🥇', '🥈', '🥉'];

interface LeaderboardProps {
  gameKey: string;
  /** Bump to refetch, e.g. after a score was saved. */
  refreshKey?: number;
}

export default function Leaderboard({
  gameKey,
  refreshKey = 0,
}: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchLeaderboard(gameKey)
      .then(rows => {
        if (!cancelled) {
          setEntries(rows);
          setError(null);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [gameKey, refreshKey]);

  return (
    <section className="arcade-panel w-full max-w-sm" aria-label="Leaderboard">
      <h2 className="arcade-title mb-3 text-sm">High scores</h2>
      {error && <p className="text-sm text-rose-300">{error}</p>}
      {!error && entries === null && <p className="arcade-hint">Loading…</p>}
      {entries?.length === 0 && (
        <p className="arcade-hint">No scores yet. Be the first!</p>
      )}
      {entries && entries.length > 0 && (
        <ol className="space-y-2">
          {entries.map((entry, i) => (
            <li key={entry.id} className="flex items-center gap-3 text-sm">
              <span className="w-6 text-center">
                {MEDALS[i] ?? `${i + 1}.`}
              </span>
              <span className="flex-1 truncate">{entry.player}</span>
              <span className="font-mono font-bold text-cyan-300">
                {entry.score.toLocaleString()}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
